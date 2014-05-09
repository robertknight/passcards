/// <reference path="../typings/DefinitelyTyped/node/node.d.ts" />
/// <reference path="../typings/DefinitelyTyped/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
/// <reference path="../typings/argparse.d.ts" />
var Q = require('q');
var argparse = require('argparse');
var mkdirp = require('mkdirp');
var fs = require('fs');
var Path = require('path');

var clipboard = require('./clipboard');
var consoleio = require('../lib/console');
var dropboxvfs = require('../lib/dropboxvfs');
var onepass = require('../lib/onepass');
var nodefs = require('../lib/nodefs');

var CLI = (function () {
    function CLI(io, agent, clipboardImpl) {
        this.configDir = process.env.HOME + "/.config/onepass-web";
        this.io = io || new consoleio.ConsoleIO();
        this.keyAgent = agent || new onepass.SimpleKeyAgent();
        this.clipboard = clipboardImpl || clipboard.createPlatformClipboard();
    }
    CLI.prototype.printf = function (format) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        consoleio.printf.apply(null, [this.io, format].concat(args));
    };

    CLI.patternMatch = function (pattern, item) {
        pattern = pattern.toLowerCase();
        var titleLower = item.title.toLowerCase();
        return titleLower.indexOf(pattern) != -1;
    };

    CLI.prototype.lookupItems = function (vault, pattern) {
        var _this = this;
        var result = Q.defer();
        vault.listItems().then(function (items) {
            var matches = [];
            items.forEach(function (item) {
                if (CLI.patternMatch(pattern, item)) {
                    matches.push(item);
                }
            });
            result.resolve(matches);
        }, function (err) {
            _this.printf('Looking up items failed');
        }).done();
        return result.promise;
    };

    CLI.createParser = function () {
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

        var subcommands = parser.addSubparsers({ dest: 'command' });

        var listCommand = subcommands.addParser('list');
        listCommand.addArgument(['-p', '--pattern'], {
            action: 'store',
            dest: 'pattern',
            nargs: 1,
            type: 'string'
        });

        var showJSONCommand = subcommands.addParser('show-json');
        showJSONCommand.addArgument(['pattern'], { action: 'store' });

        var showOverviewCommand = subcommands.addParser('show-overview');
        showOverviewCommand.addArgument(['pattern'], { action: 'store' });

        var showCommand = subcommands.addParser('show');
        showCommand.addArgument(['pattern'], { action: 'store' });

        subcommands.addParser('lock');

        var copyCommand = subcommands.addParser('copy');
        copyCommand.addArgument(['item'], { action: 'store' });
        copyCommand.addArgument(['field'], { action: 'store', nargs: '?', defaultValue: 'password' });

        return parser;
    };

    CLI.prototype.findExistingVaultInDropbox = function (storage, dropboxRoot) {
        var _this = this;
        var path = Q.defer();
        var settingsFilePath = Path.join(dropboxRoot, '.ws.agile.1Password.settings');
        var rootFile = storage.read(settingsFilePath);
        rootFile.then(function (content) {
            path.resolve(Path.join(dropboxRoot, content));
        }, function (err) {
            _this.printf('Unable to find keychain path in %s, using default path', settingsFilePath);
            path.resolve(Path.join(dropboxRoot, '1Password/1Password.agilekeychain'));
        });
        return path.promise;
    };

    CLI.prototype.unlockVault = function (vault) {
        var _this = this;
        return vault.isLocked().then(function (isLocked) {
            if (!isLocked) {
                return Q.resolve(null);
            }
            var password = _this.io.readPassword('Master password: ');
            return password.then(function (password) {
                return vault.unlock(password);
            });
        });
    };

    CLI.prototype.printOverview = function (item) {
        this.printf('%s (%s)', item.title, item.typeDescription());
        this.printf('\nInfo:');
        this.printf('  ID: %s', item.uuid);
        this.printf('  Updated: %s', item.updatedAt);

        if (item.openContents && item.openContents.tags) {
            this.printf('  Tags: %s', item.openContents.tags.join(', '));
        }
    };

    CLI.prototype.matchPattern = function (pattern, label) {
        return label.indexOf(pattern) != -1;
    };

    CLI.prototype.matchField = function (content, pattern) {
        var _this = this;
        var matches = [];
        content.urls.forEach(function (url) {
            if (_this.matchPattern(pattern, url.label)) {
                matches.push({ url: url });
            }
        });
        content.formFields.forEach(function (field) {
            if (_this.matchPattern(pattern, field.name) || _this.matchPattern(pattern, field.designation)) {
                matches.push({ formField: field });
            }
        });
        content.sections.forEach(function (section) {
            section.fields.forEach(function (field) {
                if (_this.matchPattern(pattern, field.title)) {
                    matches.push({ field: field });
                }
            });
        });
        return matches;
    };

    CLI.prototype.printDetails = function (content) {
        var _this = this;
        if (content.sections.length > 0) {
            this.printf('\nSections:');
            content.sections.forEach(function (section) {
                if (section.title) {
                    _this.printf('  %s', section.title);
                }
                section.fields.forEach(function (field) {
                    _this.printf('  %s: %s', field.title, field.valueString());
                });
            });
        }

        if (content.urls.length > 0) {
            this.printf('\nWebsites:');
            content.urls.forEach(function (url) {
                _this.printf('  %s: %s', url.label, url.url);
            });
        }

        if (content.formFields.length > 0) {
            this.printf('\nForm Fields:');
            content.formFields.forEach(function (field) {
                _this.printf('  %s (%s): %s', field.name, field.type, field.value);
            });
        }

        if (content.htmlAction) {
            this.printf('\nForm Destination: %s %s', content.htmlMethod.toUpperCase(), content.htmlAction);
        }
    };

    CLI.prototype.initVault = function (storageType, customVaultPath) {
        var _this = this;
        // connect to sync service and open vault
        var credFile = this.configDir + '/dropbox-credentials.json';
        var credentials = null;
        if (fs.existsSync(credFile)) {
            credentials = JSON.parse(fs.readFileSync(credFile).toString());
        }

        var storage;
        var dropboxRoot;

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

        var authenticated = Q.defer();
        if (credentials) {
            storage.setCredentials(credentials);
            authenticated.resolve(null);
        } else {
            var account = storage.login();
            account.then(function () {
                fs.writeFileSync(credFile, JSON.stringify(storage.credentials()));
                authenticated.resolve(null);
            }, function (err) {
                authenticated.reject(err);
            }).done();
        }

        var vault = Q.defer();

        authenticated.promise.then(function () {
            var vaultPath;
            if (customVaultPath) {
                vaultPath = Q.resolve(customVaultPath);
            } else {
                vaultPath = _this.findExistingVaultInDropbox(storage, dropboxRoot);
            }
            vaultPath.then(function (path) {
                vault.resolve(new onepass.Vault(storage, path, _this.keyAgent));
            }, function (err) {
                vault.reject(err);
            }).done();
        }, function (err) {
            vault.reject(err);
        }).done();

        return vault.promise;
    };

    /** Starts the command-line interface and returns
    * a promise for the exit code.
    */
    CLI.prototype.exec = function (argv) {
        var _this = this;
        var args = CLI.createParser().parseArgs(argv);
        mkdirp.sync(this.configDir);

        var currentVault;

        var vault = this.initVault(args.storage, args.vault ? args.vault[0] : null);
        var vaultReady = vault.then(function (vault) {
            currentVault = vault;
            return _this.unlockVault(vault);
        });

        var handlers = {};

        handlers['list'] = function (args, result) {
            currentVault.listItems().then(function (items) {
                items.sort(function (a, b) {
                    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                });
                items.forEach(function (item) {
                    if (!args.pattern || CLI.patternMatch(args.pattern[0], item)) {
                        _this.printf('%s (%s, %s)', item.title, item.typeDescription(), item.shortID());
                    }
                });
                result.resolve(0);
            }).done();
        };

        handlers['show-json'] = function (args, result) {
            _this.lookupItems(currentVault, args.pattern).then(function (items) {
                var itemContents = [];
                items.forEach(function (item) {
                    itemContents.push(item.getContent());
                });
                Q.all(itemContents).then(function (contents) {
                    contents.forEach(function (content) {
                        _this.printf('%s', consoleio.prettyJSON(content));
                    });
                    result.resolve(0);
                });
            }).done();
        };

        handlers['show-overview'] = function (args, result) {
            _this.lookupItems(currentVault, args.pattern).then(function (items) {
                items.forEach(function (item, index) {
                    if (index > 0) {
                        _this.printf('');
                    }
                    _this.printOverview(item);
                });
                result.resolve(0);
            }).done();
        };

        handlers['show'] = function (args, result) {
            _this.lookupItems(currentVault, args.pattern).then(function (items) {
                var itemContents = [];
                items.forEach(function (item) {
                    itemContents.push(item.getContent());
                });
                Q.all(itemContents).then(function (contents) {
                    items.forEach(function (item, index) {
                        if (index > 0) {
                            _this.printf('');
                        }

                        _this.printOverview(item);
                        _this.printDetails(contents[index]);
                    });
                    result.resolve(0);
                }).done();
            }).done();
        };

        handlers['lock'] = function (args, result) {
            currentVault.lock();
            result.resolve(0);
        };

        handlers['copy'] = function (args, result) {
            _this.lookupItems(currentVault, args.item).then(function (items) {
                if (items.length < 1) {
                    _this.printf('No items matching "%s"', args.item);
                    result.resolve(1);
                }
                var item = items[0];
                item.getContent().then(function (content) {
                    var matches = _this.matchField(content, args.field);
                    if (matches.length > 0) {
                        var label;
                        var match = matches[0];
                        var copied;
                        if (match.url) {
                            label = match.url.label;
                            copied = _this.clipboard.setData(match.url.url);
                        } else if (match.formField) {
                            label = match.formField.designation || match.formField.name;
                            copied = _this.clipboard.setData(match.formField.value);
                        } else if (match.field) {
                            label = match.field.title;
                            copied = _this.clipboard.setData(match.field.value);
                        }

                        copied.then(function () {
                            _this.printf('Copied "%s" from "%s" to clipboard', label, item.title);
                            result.resolve(0);
                        }, function (err) {
                            _this.printf('Unable to copy data: %s', err);
                            result.resolve(1);
                        }).done();
                    } else {
                        _this.printf('No fields matching "%s"', args.item);
                        result.resolve(1);
                    }
                }).done();
            }).done();
        };

        // process commands
        var exitStatus = Q.defer();
        vaultReady.then(function () {
            if (handlers[args.command]) {
                handlers[args.command](args, exitStatus);
            } else {
                _this.printf('Unknown command: %s', args.command);
                exitStatus.resolve(1);
            }
        }, function (err) {
            _this.printf('Unlocking failed: %s', err);
            exitStatus.resolve(2);
        }).done();

        return exitStatus.promise;
    };
    return CLI;
})();
exports.CLI = CLI;
//# sourceMappingURL=cli.js.map
