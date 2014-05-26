/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />

/// <reference path="../typings/argparse.d.ts" />

import Q = require('q');
import argparse = require('argparse');
import mkdirp = require('mkdirp')
import fs = require('fs');
import sprintf = require('sprintf');
import Path = require('path');

import asyncutil = require('../lib/asyncutil');
import clipboard = require('./clipboard');
import collectionutil = require('../lib/collectionutil');
import consoleio = require('../lib/console');
import crypto = require('../lib/onepass_crypto');
import dropboxvfs = require('../lib/vfs/dropbox');
import item_search = require('../lib/item_search');
import onepass = require('../lib/onepass');
import nodefs = require('../lib/vfs/node');
import vfs = require('../lib/vfs/vfs');

interface HandlerMap {
	[index: string] : (args: any, result : Q.Deferred<number>) => void;
}

enum ShowItemFormat {
	ShowOverview,
	ShowJSON,
	ShowFull
}

export class CLI {
	private configDir : string;
	private io : consoleio.TermIO;
	private keyAgent : onepass.KeyAgent;
	private clipboard : clipboard.Clipboard;

	constructor(io? : consoleio.TermIO, agent? : onepass.KeyAgent, clipboardImpl?: clipboard.Clipboard) {
		this.configDir = process.env.HOME + "/.config/onepass-web";
		this.io = io || new consoleio.ConsoleIO();
		this.keyAgent = agent || new onepass.SimpleKeyAgent();
		this.clipboard = clipboardImpl || clipboard.createPlatformClipboard();
	}

	private printf(format: string, ...args: any[]) {
		consoleio.printf.apply(null, [this.io, format].concat(args));
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

		var addCommand = subcommands.addParser('add');
		addCommand.addArgument(['type'], {action:'store'});
		addCommand.addArgument(['title'], {action:'store'});

		var trashCommand = subcommands.addParser('trash');
		trashCommand.addArgument(['item'], {action:'store'});

		var restoreCommand = subcommands.addParser('restore');
		restoreCommand.addArgument(['item'], {action:'store'});

		var setPassCommand = subcommands.addParser('set-password');
		setPassCommand.addArgument(['--iterations'], {
			action: 'store',
			dest: 'iterations',
			nargs: 1,
			type: 'string'
		});

		var removeCommand = subcommands.addParser('remove');
		removeCommand.addArgument(['pattern'], {action:'store'});

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

		if (item.trashed) {
			this.printf('  In Trash: Yes');
		}

		if (item.openContents && item.openContents.tags) {
			this.printf('  Tags: %s', item.openContents.tags.join(', '));
		}
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

	private passwordFieldPrompt() : Q.Promise<string> {
		var password = Q.defer<string>();
		
		this.io.readPassword("Password (or '-' to generate a random password): ")
		.then((input) => {
			if (input == '-') {
				password.resolve(crypto.generatePassword(12));
			} else {
				this.io.readPassword("Re-enter password: ")
				.then((input2) => {
					if (input == input2) {
						password.resolve(input);
					} else {
						this.printf('Passwords do not match');
						asyncutil.resolveWith(password, this.passwordFieldPrompt());
					}
				})
				.done();
			}
		})
		.done();

		return password.promise;
	}

	private addItemCommand(vault: onepass.Vault, type: string, title: string) : Q.Promise<number> {
		var status = Q.defer<number>();

		if (type !== 'login') {
			this.printf('The only supported item type for the "add" command is currently "login"');
			status.resolve(1);
			return status.promise;
		}

		var item = new onepass.Item(vault);
		item.title = title;
		var content = new onepass.ItemContent();

		var contentReady = Q.defer<onepass.ItemContent>();

		this.io.readLine('Website: ').then((website) => {
			content.urls.push({
				label: 'website',
				url: website
			});
			item.location = website;
			return this.io.readLine('Username: ');
		})
		.then((username) => {
			content.formFields.push({
				id: '',
				name: 'username',
				designation: 'username',
				type: onepass.FormFieldType.Text,
				value: username
			});
			return this.passwordFieldPrompt();
		})
		.then((password) => {
			content.formFields.push({
				id: '',
				name: 'password',
				designation: 'password',
				type: onepass.FormFieldType.Password,
				value: password
			});
			contentReady.resolve(content);
		})
		.done();
		
		contentReady.promise.then(() => {
			item.setContent(content);
			return item.save();
		})
		.then(() => {
			this.printf("Added new login '%s'", item.title);
			status.resolve(0);
		})
		.fail((err) => {
			status.resolve(1);
		});

		return status.promise;
	}
	
	private trashItemCommand(vault: onepass.Vault, pattern: string, trash: boolean) : Q.Promise<number> {
		var result = Q.defer<number>();

		item_search.lookupItems(vault, pattern).then((items) => {
			var trashOps : Q.Promise<void>[] = [];
			items.forEach((item) => {
				item.trashed = trash;
				trashOps.push(item.save());
			});

			asyncutil.resolveWithValue(result, Q.all(trashOps), 0);
		}).done();

		return result.promise;
	}

	private setPasswordCommand(vault: onepass.Vault, iterations?: number) : Q.Promise<number> {
		var result = Q.defer<number>();
		var currentPass: string;
		var newPass: string;
		var newPass2: string;

		this.io.readPassword('Re-enter existing password: ').then((pass) => {
			currentPass = pass;
			return this.io.readPassword('New password: ');
		}).then((newPass_) => {
			newPass = newPass_;
			return this.io.readPassword('Re-enter new password: ');
		}).then((newPass2_) => {
			newPass2 = newPass2_;

			if (newPass != newPass2) {
				this.printf('Passwords do not match');
				result.resolve(1);
				return;
			}
			return this.io.readLine('Hint for new password: ');
		}).then((hint) => {
			return vault.changePassword(currentPass, newPass, hint, iterations);
		}).then(() => {
			this.printf('The master password for this vault has been changed.\n\n' +
'If you are using other 1Password apps, please note that they may still ' +
'require the previous password when they are next unlocked');
			result.resolve(0);
		}).fail((err) => {
			this.printf('Unable to update the vault password: %s', err);
		});

		return result.promise;
	}

	private removeCommand(vault: onepass.Vault, pattern: string) : Q.Promise<number> {
		var result = Q.defer<number>();
		var items : onepass.Item[];

		item_search.lookupItems(vault, pattern).then((items_) => {
			items = items_;
			if (items.length == 0) {
				this.printf('No matching items');
				result.resolve(1);
				return;
			}

			items.forEach((item) => {
				this.printOverview(item);
			});
			this.printf('');
			return this.io.readLine(sprintf('Do you really want to remove these %d item(s) permanently?', items.length));
		}).then((response) => {
			if (response.match(/[yY]/)) {
				var removeOps : Q.Promise<void>[] = [];
				items.forEach((item) => {
					removeOps.push(item.remove());
				});
				Q.all(removeOps).then(() => {
					this.printf(sprintf('%d items were removed', items.length));
					result.resolve(0);
				}).done();
			} else {
				result.resolve(1);
			}
		}).done();

		return result.promise;
	}

	private listCommand(vault: onepass.Vault, pattern: string) : Q.Promise<number> {
		var result = Q.defer<number>();
		vault.listItems().then((items) => {
			items.sort((a, b) => {
				return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
			});
			items.forEach((item) => {
				if (!pattern || item_search.matchItem(item, pattern)) {
					this.printf('%s (%s, %s)', item.title, item.typeDescription(), item.shortID());
				}
			});
			this.printf('\n%d matching item(s) in vault', items.length);
			result.resolve(0);
		}).done();
		return result.promise;
	}

	private showItemCommand(vault: onepass.Vault, pattern: string, format: ShowItemFormat) : Q.Promise<number> {
		var result = Q.defer<number>();
		item_search.lookupItems(vault, pattern).then((items) => {
			var itemContents : Q.Promise<onepass.ItemContent>[] = [];
			items.forEach((item) => {
				itemContents.push(item.getContent());
			});
			Q.all(itemContents).then((contents) => {
				items.forEach((item, index) => {
					if (index > 0) {
						this.printf('');
					}

					if (format == ShowItemFormat.ShowOverview ||
					    format == ShowItemFormat.ShowFull) {
						this.printOverview(item);
					}
					if (format == ShowItemFormat.ShowFull) {
						this.printDetails(contents[index]);
					}
					if (format == ShowItemFormat.ShowJSON) {
						this.printf('%s', collectionutil.prettyJSON(contents[index]));
					}
				});
				result.resolve(0);
			}).done();
		}).done();
		return result.promise;
	}

	private copyItemCommand(vault: onepass.Vault, pattern: string, field: string) : Q.Promise<number> {
		var result = Q.defer<number>();
		item_search.lookupItems(vault, pattern).then((items) => {
			if (items.length < 1) {
				this.printf('No items matching "%s"', pattern);
				result.resolve(1);
			}
			var item = items[0];
			item.getContent().then((content) => {
				var matches = item_search.matchField(content, field);
				if (matches.length > 0) {
					var label : string;
					var match = matches[0];
					var copied : Q.Promise<void>;
					if (match.url) {
						label = match.url.label;
						copied = this.clipboard.setData(match.url.url);
					} else if (match.formField) {
						label = match.formField.designation || match.formField.name;
						copied = this.clipboard.setData(match.formField.value);
					} else if (match.field) {
						label = match.field.title;
						copied = this.clipboard.setData(match.field.value);
					}

					copied.then(() => {
						this.printf('Copied "%s" from "%s" to clipboard', label, item.title);
						result.resolve(0);
					}, (err) => {
						this.printf('Unable to copy data: %s', err);
						result.resolve(1);
					}).done();

				} else {
					this.printf('No fields matching "%s"', field);
					result.resolve(1);
				}
			}).done();
		}).done();
		return result.promise;
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
			asyncutil.resolveWith(result, this.listCommand(currentVault, args.pattern ? args.pattern[0] : null));		
		};

		handlers['show-json'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.showItemCommand(currentVault, args.pattern, ShowItemFormat.ShowJSON));
		};

		handlers['show-overview'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.showItemCommand(currentVault, args.pattern, ShowItemFormat.ShowOverview));
		};

		handlers['show'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.showItemCommand(currentVault, args.pattern, ShowItemFormat.ShowFull));
		};

		handlers['lock'] = (args, result) => {
			asyncutil.resolveWithValue(result, currentVault.lock(), 0);
		};

		handlers['copy'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.copyItemCommand(currentVault, args.item, args.field));	
		};

		handlers['add'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.addItemCommand(currentVault, args.type, args.title));
		}

		handlers['trash'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.trashItemCommand(currentVault, args.item, true));
		}

		handlers['restore'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.trashItemCommand(currentVault, args.item, false));
		}

		handlers['set-password'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.setPasswordCommand(currentVault, args.iterations));
		}

		handlers['remove'] = (args, result) => {
			asyncutil.resolveWith(exitStatus, this.removeCommand(currentVault, args.pattern));
		}

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

