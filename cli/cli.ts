/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/DefinitelyTyped/underscore/underscore.d.ts" />

/// <reference path="../typings/argparse.d.ts" />

import Q = require('q');
import argparse = require('argparse');
import mkdirp = require('mkdirp')
import sprintf = require('sprintf');
import Path = require('path');
import underscore = require('underscore');

import asyncutil = require('../lib/base/asyncutil');
import cli_common = require('./cli_common');
import clipboard = require('./clipboard');
import collectionutil = require('../lib/base/collectionutil');
import consoleio = require('./console');
import crypto = require('../lib/onepass_crypto');
import edit_cmd = require('./edit_cmd');
import item_repair = require('../lib/item_repair');
import item_search = require('../lib/item_search');
import key_agent = require('../lib/key_agent');
import nodefs = require('../lib/vfs/node');
import onepass = require('../lib/onepass');
import vfs = require('../lib/vfs/vfs');

interface HandlerMap {
	[index: string] : (args: any) => Q.Promise<any>;
}

interface NewPass {
	pass: string;
	hint: string;
}

enum ShowItemFormat {
	ShowOverview,
	ShowJSON,
	ShowFull
}

// reasons for a command to fail
var NO_SUCH_ITEM_ERR = 'No items matched the pattern';
var NO_SUCH_FIELD_ERR = 'No fields matched the pattern';
var ACTION_CANCELED_ERR = 'Action canceled';

export class CLI {
	private configDir : string;
	private io : consoleio.TermIO;
	private keyAgent : key_agent.KeyAgent;
	private clipboard : clipboard.Clipboard;
	private editCommand : cli_common.CommandHandler;
	private passwordGenerator : () => string;

	constructor(io? : consoleio.TermIO, agent? : key_agent.KeyAgent, clipboardImpl?: clipboard.Clipboard) {
		this.configDir = process.env.HOME + "/.config/onepass-web";
		this.io = io || new consoleio.ConsoleIO();
		this.keyAgent = agent || new key_agent.SimpleKeyAgent();
		this.clipboard = clipboardImpl || clipboard.createPlatformClipboard();
		this.passwordGenerator = () => {
			return crypto.generatePassword(12);
		};
	}

	private printf(format: string, ...args: any[]) {
		consoleio.printf.apply(null, [this.io, format].concat(args));
	}

	private createParser() : argparse.ArgumentParser {
		var parser = new argparse.ArgumentParser({
			description: '1Password command-line client'
		});
		parser.addArgument(['-v', '--vault'], {
			action: 'store',
			nargs: 1,
			dest: 'vault',
			help: 'Specify the path of the vault to open'
		});

		var subcommands = parser.addSubparsers({dest:'command'});

		var listCommand = subcommands.addParser('list', {
			description: 'List items in the vault'
		});
		listCommand.addArgument(['-p', '--pattern'], {
			action:'store',
			dest: 'pattern',
			nargs: 1,
			type: 'string',
			help: 'List only items matching PATTERN'
		})

		var itemPatternArg = () => {
			return {
				action: 'store',
				help: 'Pattern specifying the items'
			};
		};

		var showCommand = subcommands.addParser('show', {
			description: 'Show the contents of an item'
		});
		showCommand.addArgument(['pattern'], itemPatternArg());
		showCommand.addArgument(['--format'], {
			action: 'store',
			nargs: 1,
			dest: 'format',
			help: 'Output format for item contents',
			defaultValue: ['full'],
			type: 'string',
			choices: ['overview', 'full', 'json']
		});

		subcommands.addParser('lock', {
			description: 'Lock the vault so that the master password will be required ' +
			'for any further commands'
		});

		var copyCommand = subcommands.addParser('copy', {
			description: 'Copy the value of a field from an item to the clipboard'
		});
		copyCommand.addArgument(['item'], itemPatternArg());
		copyCommand.addArgument(['field'], {
			action: 'store',
			nargs: '?',
			defaultValue: 'password',
			help: 'Pattern specifying the name of the field to copy (eg. "username"). ' +
			      'Defaults to copying the password'
		});

		var addCommand = subcommands.addParser('add', {
			description: 'Add a new item to the vault'
		});
		addCommand.addArgument(['type'], {
			action: 'store',
			help: 'Type of item to add. The only supported value is currently "login"'
		});
		addCommand.addArgument(['title'], {
			action: 'store',
			help: 'The title of the new item'
		});

		this.editCommand = new edit_cmd.EditCommand(this.io, subcommands, this.passwordGenerator);

		var trashCommand = subcommands.addParser('trash', {
			description: 'Move items in the vault to the trash'
		});
		trashCommand.addArgument(['item'], itemPatternArg());

		var restoreCommand = subcommands.addParser('restore', {
			description: 'Restore items in the vault that were previously trashed'
		});
		restoreCommand.addArgument(['item'], itemPatternArg());

		var setPassCommand = subcommands.addParser('set-password', {
			description: 'Change the master password for the vault'
		});
		setPassCommand.addArgument(['--iterations'], {
			action: 'store',
			dest: 'iterations',
			nargs: 1,
			type: 'string'
		});

		var removeCommand = subcommands.addParser('remove', {
			description: 'Remove items from the vault. This action is permanent and cannot be undone.'
		});
		removeCommand.addArgument(['pattern'], itemPatternArg());

		subcommands.addParser('gen-password', {
			description: 'Generate a new random password'
		});

		var newVaultCommand = subcommands.addParser('new-vault');
		newVaultCommand.addArgument(['path'], {action:'store'});
		newVaultCommand.addArgument(['--iterations'], {
			action: 'store',
			dest: 'iterations',
			nargs: 1,
			type: 'string'
		});

		subcommands.addParser('repair', {
			description: 'Check and repair items in a vault'
		});

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
		this.printf('  Location: %s', item.location);

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
					this.printf('    %s: %s', field.title, field.valueString());
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

	private initVault(customVaultPath: string) : Q.Promise<onepass.Vault> {
		var storage : vfs.VFS = new nodefs.FileVFS('/');
		var dropboxRoot : string;

		storage = new nodefs.FileVFS('/');
		dropboxRoot = process.env.HOME + '/Dropbox';
		if (customVaultPath) {
			customVaultPath = Path.resolve(customVaultPath);
		}

		var authenticated = Q.resolve<void>(null);
		var vault = Q.defer<onepass.Vault>();

		authenticated.then(() => {
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
		return consoleio.passwordFieldPrompt(this.io, this.passwordGenerator);
	}

	/** Returns the item from @p vault matching a given @p pattern.
	  * If there are multiple matching items the user is prompted to select one.
	  */
	private selectItem(vault: onepass.Vault, pattern: string) : Q.Promise<onepass.Item> {
		return item_search.lookupItems(vault, pattern).then((items) => {
			return this.select(items, 'items', 'Item', pattern, (item) => { return item.title; });
		});
	}

	// prompt the user for a selection from a list of items
	private select<T>(items: T[], plural: string, singular: string, pattern: string, captionFunc: (item: T) => string) : Q.Promise<T> {
		if (items.length < 1) {
			this.printf('No %s matching pattern "%s"', plural, pattern);
			return Q.reject(NO_SUCH_ITEM_ERR);
		}
		else if (items.length == 1) {
			return Q.resolve(items[0]);
		}

		this.printf('Multiple %s match "%s":\n', plural, pattern);
		items.forEach((item, index) => {
			this.printf('  [%d] %s', index+1, captionFunc(item));
		});
		this.printf('');
		return this.io.readLine(sprintf('Select %s: ', singular)).then((indexStr) => {
			var index = parseInt(indexStr) - 1 || 0;
			if (index < 0) {
				index = 0;
			} else if (index >= items.length) {
				index = items.length-1;
			}
			return items[index];
		});
	}

	private addLoginFields(content: onepass.ItemContent) : Q.Promise<onepass.ItemContent> {
		return this.io.readLine('Website: ').then((website) => {
			content.urls.push({
				label: 'website',
				url: website
			});
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
			return content;
		});
	}

	private addItemCommand(vault: onepass.Vault, type: string, title: string) : Q.Promise<void> {
		var types = item_search.matchType(type);
		return this.select(types, 'item types', 'item type', type, (typeCode) => {
			return onepass.ITEM_TYPES[<string>typeCode].name;
		}).then((type) => {
			var item = new onepass.Item(vault);
			item.title = title;
			item.typeName = type;

			var content = new onepass.ItemContent();

			var contentReady : Q.Promise<onepass.ItemContent>;
			if (type == onepass.ItemTypes.LOGIN) {
				contentReady = this.addLoginFields(content);
			} else {
				// add a default section with a blank title
				content.sections.push(new onepass.ItemSection());
				contentReady = Q.resolve(content);
			}
			
			return contentReady.then(() => {
				item.setContent(content);
				return item.save();
			}).then(() => {
				this.printf("Added new item '%s'", item.title);
				return Q.resolve<void>(null);
			});
		});
	}

	private trashItemCommand(vault: onepass.Vault, pattern: string, trash: boolean) : Q.Promise<void[]> {
		return item_search.lookupItems(vault, pattern).then((items) => {
			var trashOps : Q.Promise<void>[] = [];
			items.forEach((item) => {
				item.trashed = trash;
				trashOps.push(item.save());
			});

			return Q.all(trashOps);
		});
	}

	private readNewPassword() : Q.Promise<NewPass> {
		return this.io.readPassword('New password: ').then((pass) => {
			return this.io.readPassword('Re-enter new password: ').then((pass2) => {
				if (pass != pass2) {
					throw('Passwords do not match');
				}
				return this.io.readLine('Hint for new password: ').then((hint) => {
					return {pass: pass, hint: hint};
				});
			});
		});
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

	private removeCommand(vault: onepass.Vault, pattern: string) : Q.Promise<void> {
		var items : onepass.Item[];

		return item_search.lookupItems(vault, pattern).then((items_) => {
			items = items_;
			if (items.length == 0) {
				this.printf('No matching items');
				throw NO_SUCH_ITEM_ERR;
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
				return Q.all(removeOps).then(() => {
					this.printf(sprintf('%d items were removed', items.length));
				});
			} else {
				throw ACTION_CANCELED_ERR;
			}
		});
	}

	private genPasswordCommand() : Q.Promise<void> {
		this.printf(crypto.generatePassword(12));
		return Q.resolve<void>(null);
	}

	private listCommand(vault: onepass.Vault, pattern: string) : Q.Promise<void> {
		return vault.listItems().then((items) => {
			items.sort((a, b) => {
				return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
			});

			var matchCount = 0;
			items.forEach((item) => {
				if (!pattern || item_search.matchItem(item, pattern)) {
					++matchCount;
					this.printf('%s (%s, %s)', item.title, item.typeDescription(), item.shortID());
				}
			});
			this.printf('\n%d matching item(s) in vault', matchCount);
		});
	}

	private showItemCommand(vault: onepass.Vault, pattern: string, format: ShowItemFormat) : Q.Promise<void> {
		var item: onepass.Item;
		return this.selectItem(vault, pattern).then((_item) => {
			item = _item;
			return item.getContent();
		}).then((content) => {
			if (format == ShowItemFormat.ShowOverview ||
				format == ShowItemFormat.ShowFull) {
				this.printOverview(item);
			}
			if (format == ShowItemFormat.ShowFull) {
				this.printDetails(content);
			}
			if (format == ShowItemFormat.ShowJSON) {
				this.printf('%s', collectionutil.prettyJSON(content));
			}
		});
	}

	private copyItemCommand(vault: onepass.Vault, pattern: string, field: string) : Q.Promise<void> {
		return this.selectItem(vault, pattern).then((item) => {
			return item.getContent().then((content) => {
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

					return copied.then(() => {
						this.printf('Copied "%s" from "%s" to clipboard', label, item.title);
					});
				} else {
					this.printf('No fields matching "%s"', field);
					throw NO_SUCH_FIELD_ERR;
				}
			});
		});
	}

	private newVaultCommand(fs: vfs.VFS, path: string, iterations?: number) : Q.Promise<void> {
		return this.readNewPassword().then((newPass) => {
			return onepass.Vault.createVault(fs, path, newPass.pass, newPass.hint, iterations).then((vault) => {
				this.printf('New vault created in %s', vault.vaultPath());
			});
		});
	}

	private repairCommand(vault: onepass.Vault) : Q.Promise<void[]> {
		return vault.listItems().then((items) => {
			var sortedItems = underscore.sortBy(items, (item) => {
				return item.title.toLowerCase();
			});
			var repairTasks: Array<() => Q.Promise<void>> = [];
			this.printf('Checking %d items...', sortedItems.length);
			sortedItems.forEach((item) => {
				var repairTask = () => {
					return item_repair.repairItem(item, (err) => {
						this.printf('%s', err)
					}, () => {
						return this.io.readLine('Correct item? Y/N').then((result) => {
							return result.match(/y/i) != null;
						});
					});
				};
				repairTasks.push(repairTask);
			});
			return asyncutil.series(repairTasks);
		});
	}

	/** Starts the command-line interface and returns
	  * a promise for the exit code.
	  */
	exec(argv: string[]) : Q.Promise<number> {
		var args = this.createParser().parseArgs(argv);
		mkdirp.sync(this.configDir)

		var currentVault : onepass.Vault;
		var vaultReady : Q.Promise<void>;
		var requiresUnlockedVault = ['new-vault', 'gen-password'].indexOf(args.command) == -1;

		if (requiresUnlockedVault) {
			var vault = this.initVault(args.vault ? args.vault[0] : null);
			vaultReady = vault.then((vault) => {
				currentVault = vault;
				return this.unlockVault(vault);
			});
		} else {
			vaultReady = Q.resolve<void>(null);
		}
		
		var handlers : HandlerMap = {};

		handlers['list'] = (args) => {
			return this.listCommand(currentVault, args.pattern ? args.pattern[0] : null);
		};

		handlers['show'] = (args) => {
			var format: ShowItemFormat;
			switch (args.format[0]) {
			case 'full':
				format = ShowItemFormat.ShowFull;
				break;
			case 'overview':
				format = ShowItemFormat.ShowOverview;
				break;
			case 'json':
				format = ShowItemFormat.ShowJSON;
				break;
			default:
				return Q.reject('Unsupported output format: ' + args.format[0]);
			}
			return this.showItemCommand(currentVault, args.pattern, format);
		};

		handlers['lock'] = (args) => {
			return currentVault.lock();
		};

		handlers['copy'] = (args) => {
			return this.copyItemCommand(currentVault, args.item, args.field);
		};

		handlers['add'] = (args) => {
			return this.addItemCommand(currentVault, args.type, args.title);
		};

		handlers['edit'] = (args) => {
			return this.selectItem(currentVault, args.item).then((item) => {
				return this.editCommand.handle(args, item);
			});
		};

		handlers['trash'] = (args) => {
			return this.trashItemCommand(currentVault, args.item, true);
		};

		handlers['restore'] = (args) => {
			return this.trashItemCommand(currentVault, args.item, false);
		};

		handlers['set-password'] = (args) => {
			return this.setPasswordCommand(currentVault, args.iterations);
		};

		handlers['remove'] = (args) => {
			return this.removeCommand(currentVault, args.pattern);
		};

		handlers['gen-password'] = (args) => {
			return this.genPasswordCommand();
		};

		handlers['new-vault'] = (args) => {
			return this.newVaultCommand(new nodefs.FileVFS('/'), args.path, args.iterations);
		}

		handlers['repair'] = (args) => {
			return this.repairCommand(currentVault);
		};

		// process commands
		var exitStatus = Q.defer<number>();
		vaultReady.then(() => {
			var handler = handlers[args.command];
			if (handler) {
				handler(args).then((result) => {
					if (typeof result == 'number') {
						// if the handler returns an exit status, use that
						exitStatus.resolve(<number>result);
					} else {
						// otherwise assume success
						exitStatus.resolve(0);
					}
				}).fail((err) => {
					this.printf('%s', err);
					exitStatus.resolve(1);
				});
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

