/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

/// <reference path="../typings/argparse.d.ts" />

import Q = require('q');
import argparse = require('argparse');
import mkdirp = require('mkdirp')
import fs = require('fs');
import Path = require('path');

import clipboard = require('./clipboard');
import consoleio = require('../lib/console');
import dropboxvfs = require('../lib/dropboxvfs');
import onepass = require('../lib/onepass');
import nodefs = require('../lib/nodefs');
import vfs = require('../lib/vfs');

interface HandlerMap {
	[index: string] : (args: any, result : Q.Deferred<number>) => void;
}

interface FieldMatch {
	url? : onepass.ItemUrl;
	field? : onepass.ItemField;
	formField? : onepass.WebFormField;
}

export class CLI {
	private configDir : string;
	private io : consoleio.TermIO;
	private keyAgent : onepass.KeyAgent;
	private clipboard : clipboard.Clipboard;

	private printf(format: string, ...args: any[]) {
		consoleio.printf.apply(null, [this.io, format].concat(args));
	}

	private static patternMatch(pattern: string, item: onepass.Item) {
		pattern = pattern.toLowerCase();
		var titleLower = item.title.toLowerCase();
		return titleLower.indexOf(pattern) != -1;
	}

	private lookupItems(vault: onepass.Vault, pattern: string) : Q.Promise<onepass.Item[]> {
		var result = Q.defer<onepass.Item[]>();
		vault.listItems().then((items:onepass.Item[]) => {
			var matches : onepass.Item[] = [];
			items.forEach((item) => {
				if (CLI.patternMatch(pattern, item)) {
					matches.push(item);
				}
			});
			result.resolve(matches);
		}, (err:any) => {
			this.printf('Looking up items failed');
		}).done();
		return result.promise;
	}

	private static createParser() : argparse.ArgumentParser {
		var parser = new argparse.ArgumentParser({
			description: '1Password command-line client'
		});
		parser.addArgument(['-s', '--storage'], {
			action: 'store',
			nargs: 1,
			defaultValue: 'file',
			dest: 'storage'
		});
		parser.addArgument(['-v', '--vault'], {
			action: 'store',
			nargs: 1,
			dest: 'vault'
		});

		var subcommands = parser.addSubparsers({dest:'command'});

		var listCommand = subcommands.addParser('list');
		listCommand.addArgument(['-p', '--pattern'], {
			action:'store',
			dest: 'pattern',
			nargs: 1,
			type: 'string'
		})

		var showJSONCommand = subcommands.addParser('show-json');
		showJSONCommand.addArgument(['pattern'], {action:'store'});

		var showOverviewCommand = subcommands.addParser('show-overview');
		showOverviewCommand.addArgument(['pattern'], {action:'store'});

		var showCommand = subcommands.addParser('show');
		showCommand.addArgument(['pattern'], {action:'store'});

		subcommands.addParser('lock');

		var copyCommand = subcommands.addParser('copy');
		copyCommand.addArgument(['item'], {action:'store'});
		copyCommand.addArgument(['field'], {action:'store', nargs: '?', defaultValue:'password'});

		return parser;
	}

	private findExistingVaultInDropbox(storage: vfs.VFS, dropboxRoot: string) : Q.Promise<string> {
		var path = Q.defer<string>();
		var settingsFilePath = Path.join(dropboxRoot, '.ws.agile.1Password.settings');
		var rootFile = storage.read(settingsFilePath);
		rootFile.then((content) => {
			path.resolve(Path.join(dropboxRoot, content));
		}, (err) => {
			this.printf('Unable to find keychain path in %s, using default path', settingsFilePath);
			path.resolve(Path.join(dropboxRoot, '1Password/1Password.agilekeychain'));
		});
		return path.promise;
	}

	private unlockVault(vault: onepass.Vault) : Q.Promise<void> {
		return vault.isLocked().then((isLocked) => {
			if (!isLocked) {
				return Q.resolve<void>(null);
			}
			var password = this.io.readPassword('Master password: ');
			return password.then((password) => {
				return vault.unlock(password);
			});
		});
	}

	private printOverview(item: onepass.Item) {
		this.printf('%s (%s)', item.title, item.typeDescription());
		this.printf('\nInfo:');
		this.printf('  ID: %s', item.uuid);
		this.printf('  Updated: %s', item.updatedAt);

		if (item.openContents && item.openContents.tags) {
			this.printf('  Tags: %s', item.openContents.tags.join(', '));
		}
	}

	private matchPattern(pattern: string, label: string) : boolean {
		return label.indexOf(pattern) != -1;
	}

	private matchField(content: onepass.ItemContent, pattern: string) : FieldMatch[] {
		var matches : FieldMatch[] = [];
		content.urls.forEach((url) => {
			if (this.matchPattern(pattern, url.label)) {
				matches.push({url : url});
			}
		});
		content.formFields.forEach((field) => {
			if (this.matchPattern(pattern, field.name) || this.matchPattern(pattern, field.designation)) {
				matches.push({formField : field});
			}
		});
		content.sections.forEach((section) => {
			section.fields.forEach((field) => {
				if (this.matchPattern(pattern, field.title)) {
					matches.push({field : field});
				}
			});
		});
		return matches;
	}

	private printDetails(content: onepass.ItemContent) {
		if (content.sections.length > 0) {
			this.printf('\nSections:');
			content.sections.forEach((section) => {
				if (section.title) {
					this.printf('  %s', section.title);
				}
				section.fields.forEach((field) => {
					this.printf('  %s: %s', field.title, field.valueString());
				});
			});
		}

		if (content.urls.length > 0) {
			this.printf('\nWebsites:');
			content.urls.forEach((url) => {
				this.printf('  %s: %s', url.label, url.url);
			});
		}

		if (content.formFields.length > 0) {
			this.printf('\nForm Fields:');
			content.formFields.forEach((field) => {
				this.printf('  %s (%s): %s', field.name, field.type, field.value);
			});
		}

		if (content.htmlAction) {
			this.printf('\nForm Destination: %s %s', content.htmlMethod.toUpperCase(),
			  content.htmlAction);
		}
	}

	private initVault(storageType: string, customVaultPath: string) : Q.Promise<onepass.Vault> {
		// connect to sync service and open vault
		var credFile : string = this.configDir + '/dropbox-credentials.json';
		var credentials : Object = null;
		if (fs.existsSync(credFile)) {
			credentials = JSON.parse(fs.readFileSync(credFile).toString());
		}

		var storage : vfs.VFS;
		var dropboxRoot : string;

		if (storageType == 'file') {
			storage = new nodefs.FileVFS('/');
			dropboxRoot = process.env.HOME + '/Dropbox';
			if (customVaultPath) {
				customVaultPath = Path.resolve(customVaultPath);
			}
		} else if (storageType == 'dropbox') {
			storage = new dropboxvfs.DropboxVFS();
			dropboxRoot = '/';
		}

		var authenticated = Q.defer<void>();
		if (credentials) {
			storage.setCredentials(credentials);
			authenticated.resolve(null);
		} else {
			var account = storage.login();
			account.then(() => {
				fs.writeFileSync(credFile, JSON.stringify(storage.credentials()));
				authenticated.resolve(null);
			}, (err) => {
				authenticated.reject(err);
			}).done();
		}

		var vault = Q.defer<onepass.Vault>();

		authenticated.promise.then(() => {
			var vaultPath : Q.Promise<string>;
			if (customVaultPath) {
				vaultPath = Q.resolve(customVaultPath);
			} else {
				vaultPath = this.findExistingVaultInDropbox(storage, dropboxRoot);
			}
			vaultPath.then((path) => {
				vault.resolve(new onepass.Vault(storage, path, this.keyAgent));
			}, (err) => {
				vault.reject(err);
			}).done();
		}, (err) => {
			vault.reject(err);
		}).done();

		return vault.promise;
	}

	constructor(io? : consoleio.TermIO, agent? : onepass.KeyAgent, clipboardImpl?: clipboard.Clipboard) {
		this.configDir = process.env.HOME + "/.config/onepass-web";
		this.io = io || new consoleio.ConsoleIO();
		this.keyAgent = agent || new onepass.SimpleKeyAgent();
		this.clipboard = clipboardImpl || clipboard.createPlatformClipboard();
	}

	/** Starts the command-line interface and returns
	  * a promise for the exit code.
	  */
	exec(argv: string[]) : Q.Promise<number> {
		var args = CLI.createParser().parseArgs(argv);
		mkdirp.sync(this.configDir)

		var currentVault : onepass.Vault;

		var vault = this.initVault(args.storage, args.vault ? args.vault[0] : null);
		var vaultReady = vault.then((vault) => {
			currentVault = vault;
			return this.unlockVault(vault);
		});
		
		var handlers : HandlerMap = {};

		handlers['list'] = (args, result) => {
			currentVault.listItems().then((items : onepass.Item[]) => {
				items.sort((a:onepass.Item, b:onepass.Item) => {
					return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
				});
				items.forEach((item) => {
					if (!args.pattern || CLI.patternMatch(args.pattern[0], item)) {
						this.printf('%s (%s, %s)', item.title, item.typeDescription(), item.shortID());
					}
				});
				result.resolve(0);
			}).done();
		};

		handlers['show-json'] = (args, result) => {
			this.lookupItems(currentVault, args.pattern).then((items) => {
				var itemContents : Q.Promise<onepass.ItemContent>[] = [];
				items.forEach((item) => {
					itemContents.push(item.getContent());
				});
				Q.all(itemContents).then((contents) => {
					contents.forEach((content) => {
						this.printf('%s', consoleio.prettyJSON(content));
					});
					result.resolve(0);
				});
			}).done();
		};

		handlers['show-overview'] = (args, result) => {
			this.lookupItems(currentVault, args.pattern).then((items) => {
				items.forEach((item, index) => {
					if (index > 0) {
						this.printf('');
					}
					this.printOverview(item);
				});
				result.resolve(0);
			}).done();
		};

		handlers['show'] = (args, result) => {
			this.lookupItems(currentVault, args.pattern).then((items) => {
				var itemContents : Q.Promise<onepass.ItemContent>[] = [];
				items.forEach((item) => {
					itemContents.push(item.getContent());
				});
				Q.all(itemContents).then((contents) => {
					items.forEach((item, index) => {
						if (index > 0) {
							this.printf('');
						}
						
						this.printOverview(item);
						this.printDetails(contents[index]);
					});
					result.resolve(0);
				}).done();
			}).done();
		};

		handlers['lock'] = (args, result) => {
			currentVault.lock();
			result.resolve(0);
		};

		handlers['copy'] = (args, result) => {
			this.lookupItems(currentVault, args.item).then((items) => {
				if (items.length < 1) {
					this.printf('No items matching "%s"', args.item);
					result.resolve(1);
				}
				items[0].getContent().then((content) => {
					var matches = this.matchField(content, args.field);
					if (matches.length > 0) {
						var match = matches[0];
						if (match.url) {
							this.clipboard.setData(match.url.url);
						} else if (match.formField) {
							this.clipboard.setData(match.formField.value);
						} else if (match.field) {
							this.clipboard.setData(match.field.value);
						}
						result.resolve(0);
					} else {
						this.printf('No fields matching "%s"', args.item);
						result.resolve(1);
					}
				}).done();
			}).done();
		};

		// process commands
		var exitStatus = Q.defer<number>();
		vaultReady.then(() => {
			if (handlers[args.command]) {
				handlers[args.command](args, exitStatus);
			} else {
				this.printf('Unknown command: %s', args.command);
				exitStatus.resolve(1);
			}
		}, (err) => {
			this.printf('Unlocking failed: %s', err);
			exitStatus.resolve(2);
		})
		.done();

		return exitStatus.promise;
	}
}

