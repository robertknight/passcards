import assert = require('assert');
import Path = require('path');
import underscore = require('underscore');

import { atob, btoa } from './base/stringutil';
import agile_keychain_crypto = require('./agile_keychain_crypto');
import asyncutil = require('./base/asyncutil');
import agile_keychain_entries = require('./agile_keychain_entries');
import crypto = require('./base/crypto');
import collectionutil = require('./base/collectionutil');
import dateutil = require('./base/dateutil');
import event_stream = require('./base/event_stream');
import item_store = require('./item_store');
import key_agent = require('./key_agent');
import stringutil = require('./base/stringutil');
import vfs = require('./vfs/vfs');
import vfs_util = require('./vfs/util');
import { defer } from '../lib/base/promise_util';

type IndexEntry = [
    string, // uuid
    string, // typeName
    string, // title
    string, // primaryLocation
    number, // UNIX timestamp in milliseconds
    string, // folder UUID
    number, // unknown
    string // trashed ("Y" || "N")
];

var fieldKindMap = new collectionutil.BiDiMap<item_store.FieldType, string>()
    .add(item_store.FieldType.Text, 'string')
    .add(item_store.FieldType.Password, 'concealed')
    .add(item_store.FieldType.Address, 'address')
    .add(item_store.FieldType.Date, 'date')
    .add(item_store.FieldType.MonthYear, 'monthYear')
    .add(item_store.FieldType.URL, 'URL')
    .add(item_store.FieldType.CreditCardType, 'cctype')
    .add(item_store.FieldType.PhoneNumber, 'phone')
    .add(item_store.FieldType.Gender, 'gender')
    .add(item_store.FieldType.Email, 'email')
    .add(item_store.FieldType.Menu, 'menu');

// mapping between input element types
// and the single-char codes used to represent
// them in .1password files
var fieldTypeCodeMap = new collectionutil.BiDiMap<
    item_store.FormFieldType,
    string
>()
    .add(item_store.FormFieldType.Text, 'T')
    .add(item_store.FormFieldType.Password, 'P')
    .add(item_store.FormFieldType.Email, 'E')
    .add(item_store.FormFieldType.Checkbox, 'C')
    .add(item_store.FormFieldType.Input, 'I');

/** Default number of iterations to use in the PBKDF2 password
 * stretching function used to secure the master key.
 *
 * The default value was taken from a recent version of
 * the official 1Password v4 app for Mac (13/05/14)
 */
export var DEFAULT_VAULT_PASS_ITERATIONS = 80000;

// TODO: 'SL5' is the default and only used value for items
// in current versions of 1Password as far as I know but
// the Agile Keychain allows multiple security levels to be defined.
// This item data could perhaps be stored in a field for store-specific
// data within the item_store.Item?
var DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL = 'SL5';

/** Convert an item to JSON data for serialization in a .1password file.
 * @p encryptedData is the encrypted version of the item's content.
 */
export function toAgileKeychainItem(
    item: item_store.Item,
    encryptedData: string
): agile_keychain_entries.Item {
    var keychainItem: any = {};

    keychainItem.createdAt = dateutil.unixTimestampFromDate(item.createdAt);
    keychainItem.updatedAt = dateutil.unixTimestampFromDate(item.updatedAt);
    keychainItem.title = item.title;
    keychainItem.securityLevel = DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL;
    keychainItem.encrypted = btoa(encryptedData);
    keychainItem.typeName = item.typeName;
    keychainItem.uuid = item.uuid;
    keychainItem.location = item.primaryLocation();
    keychainItem.folderUuid = item.folderUuid;
    keychainItem.faveIndex = item.faveIndex;
    keychainItem.trashed = item.trashed;
    keychainItem.openContents = item.openContents;

    return keychainItem;
}

/** Parses an item_store.Item from JSON data in a .1password file.
 *
 * The item content is initially encrypted. The decrypted
 * contents can be retrieved using getContent()
 */
export function fromAgileKeychainItem(
    vault: Vault,
    data: agile_keychain_entries.Item
): item_store.Item {
    var item = new item_store.Item(vault);
    item.updatedAt = dateutil.dateFromUnixTimestamp(data.updatedAt);
    item.title = data.title;

    // These fields are not currently stored in
    // an item_store.Item directly. They could potentially be stored in
    // a Store-specific data field in the item?
    //
    //  - data.securityLevel
    //  - data.encrypted

    if (data.secureContents) {
        item.setContent(fromAgileKeychainContent(data.secureContents));
    }

    item.typeName = data.typeName;
    item.uuid = data.uuid;
    item.createdAt = dateutil.dateFromUnixTimestamp(data.createdAt);

    if (data.location) {
        item.locations.push(data.location);
    }

    item.folderUuid = data.folderUuid;
    item.faveIndex = data.faveIndex;
    item.trashed = data.trashed;
    item.openContents = data.openContents;
    return item;
}

export function toAgileKeychainField(
    field: item_store.ItemField
): agile_keychain_entries.ItemField {
    var keychainField = new agile_keychain_entries.ItemField();
    keychainField.k = fieldKindMap.get(field.kind);
    keychainField.n = field.name;
    keychainField.t = field.title;
    keychainField.v = field.value;
    return keychainField;
}

export function fromAgileKeychainField(
    fieldData: agile_keychain_entries.ItemField
): item_store.ItemField {
    return {
        kind: fieldKindMap.get2(fieldData.k),
        name: fieldData.n,
        title: fieldData.t,
        value: fieldData.v,
    };
}

/** Convert an item_store.ItemContent entry into a `contents` blob for storage in
 * a 1Password item.
 */
function toAgileKeychainContent(
    content: item_store.ItemContent
): agile_keychain_entries.ItemContent {
    var keychainContent = new agile_keychain_entries.ItemContent();
    if (content.sections) {
        keychainContent.sections = [];
        content.sections.forEach(section => {
            keychainContent.sections.push(toAgileKeychainSection(section));
        });
    }
    if (content.urls) {
        keychainContent.URLs = [];
        content.urls.forEach(url => {
            keychainContent.URLs.push(url);
        });
    }
    keychainContent.notesPlain = content.notes;
    if (content.formFields) {
        keychainContent.fields = [];
        content.formFields.forEach(field => {
            keychainContent.fields.push(toAgileKeychainFormField(field));
        });
    }
    keychainContent.htmlAction = content.htmlAction;
    keychainContent.htmlMethod = content.htmlMethod;
    keychainContent.htmlID = content.htmlId;
    return keychainContent;
}

/** Convert a decrypted JSON `contents` blob from a 1Password item
 * into an item_store.ItemContent instance.
 */
function fromAgileKeychainContent(
    data: agile_keychain_entries.ItemContent
): item_store.ItemContent {
    let content = item_store.ContentUtil.empty();
    if (data.sections) {
        data.sections.forEach(section => {
            content.sections.push(fromAgileKeychainSection(section));
        });
    }
    if (data.URLs) {
        data.URLs.forEach(url => {
            content.urls.push(url);
        });
    }
    if (data.notesPlain) {
        content.notes = data.notesPlain;
    }
    if (data.fields) {
        data.fields.forEach(field => {
            content.formFields.push(fromAgileKeychainFormField(field));
        });
    }
    if (data.htmlAction) {
        content.htmlAction = data.htmlAction;
    }
    if (data.htmlMethod) {
        content.htmlMethod = data.htmlMethod;
    }
    if (data.htmlID) {
        content.htmlId = data.htmlID;
    }

    return content;
}

function toAgileKeychainSection(
    section: item_store.ItemSection
): agile_keychain_entries.ItemSection {
    var keychainSection = new agile_keychain_entries.ItemSection();
    keychainSection.name = section.name;
    keychainSection.title = section.title;
    keychainSection.fields = [];
    section.fields.forEach(field => {
        keychainSection.fields.push(toAgileKeychainField(field));
    });
    return keychainSection;
}

/** Convert a section entry from the JSON contents blob for
 * an item into an item_store.ItemSection instance.
 */
function fromAgileKeychainSection(
    data: agile_keychain_entries.ItemSection
): item_store.ItemSection {
    return {
        name: data.name,
        title: data.title,
        fields: (data.fields || []).map(fieldData =>
            fromAgileKeychainField(fieldData)
        ),
    };
}

function toAgileKeychainFormField(
    field: item_store.WebFormField
): agile_keychain_entries.WebFormField {
    var keychainField = new agile_keychain_entries.WebFormField();
    keychainField.id = field.id;
    keychainField.name = field.name;
    keychainField.type = fieldTypeCodeMap.get(field.type);
    keychainField.designation = field.designation;
    keychainField.value = field.value;
    return keychainField;
}

function fromAgileKeychainFormField(
    keychainField: agile_keychain_entries.WebFormField
): item_store.WebFormField {
    return {
        id: keychainField.id,
        name: keychainField.name,
        type: fieldTypeCodeMap.get2(keychainField.type),
        designation: keychainField.designation,
        value: keychainField.value,
    };
}

export function convertKeys(
    keyList: agile_keychain_entries.EncryptionKeyEntry[]
): key_agent.Key[] {
    return keyList.map(keyEntry => {
        return {
            format: key_agent.KeyFormat.AgileKeychainKey,
            data: keyEntry.data,
            identifier: keyEntry.identifier,
            iterations: keyEntry.iterations,
            validation: keyEntry.validation,
        };
    });
}

/** Represents an Agile Keychain-format 1Password vault. */
export class Vault implements item_store.Store {
    /** File system which stores the vaults contents. */
    fs: vfs.VFS;

    /** Path to the vault within the file system. */
    path: string;

    private keyAgent: key_agent.KeyAgent;
    private keys: Promise<agile_keychain_entries.EncryptionKeyEntry[]>;

    // map of (item ID -> Item) for items that have been
    // modified and require the contents.js index file to be updated
    private pendingIndexUpdates: Map<string, item_store.Item>;

    // promise which is resolved when the current flush of
    // index updates completes
    private indexUpdated: Promise<{}>;
    private indexUpdatePending: boolean;

    onItemUpdated: event_stream.EventStream<item_store.Item>;

    /** Setup a vault which is stored at @p path in a filesystem.
     * @p fs is the filesystem interface through which the
     * files that make up the vault are accessed.
     */
    constructor(fs: vfs.VFS, path: string, agent?: key_agent.KeyAgent) {
        this.fs = fs;
        this.path = path;
        this.keyAgent =
            agent ||
            new key_agent.SimpleKeyAgent(agile_keychain_crypto.defaultCrypto);
        this.onItemUpdated = new event_stream.EventStream<item_store.Item>();

        this.pendingIndexUpdates = new Map<string, item_store.Item>();
        this.indexUpdated = Promise.resolve<{}>(null);
        this.indexUpdatePending = false;
    }

    private getKeys(): Promise<agile_keychain_entries.EncryptionKeyEntry[]> {
        if (!this.keys) {
            this.keys = this.loadKeys();
        }
        return this.keys;
    }

    private async loadKeys(): Promise<
        agile_keychain_entries.EncryptionKeyEntry[]
    > {
        const content = await this.fs.read(
            Path.join(this.dataFolderPath(), 'encryptionKeys.js')
        );
        var keyList: agile_keychain_entries.EncryptionKeyList = JSON.parse(
            content
        );
        if (!keyList.list) {
            throw new Error('Missing `list` entry in encryptionKeys.js file');
        }
        var vaultKeys: agile_keychain_entries.EncryptionKeyEntry[] = [];
        keyList.list.forEach(entry => {
            // Using 1Password v4, there are two entries in the
            // encryptionKeys.js file, 'SL5' and 'SL3'.
            // 'SL3' appears to be unused so speed up the unlock
            // process by skipping it
            if (entry.level != 'SL3') {
                vaultKeys.push(entry);
            }
        });
        return vaultKeys;
    }

    private writeKeys(
        keyList: agile_keychain_entries.EncryptionKeyList,
        passHint: string
    ): Promise<{}> {
        // FIXME - Improve handling of concurrent attempts to update encryptionKeys.js.
        // If the file in the VFS has been modified since the original read, the operation
        // should fail.

        var keyJSON = collectionutil.prettyJSON(keyList);
        var keysSaved = this.fs.write(
            Path.join(this.dataFolderPath(), 'encryptionKeys.js'),
            keyJSON
        );
        var hintSaved = this.fs.write(
            Path.join(this.dataFolderPath(), '.password.hint'),
            passHint
        );
        return Promise.all([keysSaved, hintSaved]);
    }

    listKeys(): Promise<key_agent.Key[]> {
        return this.getKeys().then(convertKeys);
    }

    saveKeys(keys: key_agent.Key[], hint: string): Promise<void> {
        throw new Error('onepass.Vault.saveKeys() is not implemented');
    }

    /** Unlock the vault using the given master password.
     * This must be called before item contents can be decrypted.
     */
    unlock(pwd: string): Promise<void> {
        return item_store.unlockStore(this, this.keyAgent, pwd);
    }

    /** Lock the vault. This discards decrypted master keys for the vault
     * created via a call to unlock()
     */
    lock(): Promise<void> {
        return this.keyAgent.forgetKeys();
    }

    /** Returns true if the vault was successfully unlocked using unlock().
     * Only once the vault is unlocked can item contents be retrieved using item_store.Item.getContents()
     */
    isLocked(): Promise<boolean> {
        var keyIDs = this.keyAgent.listKeys();
        var keyEntries = this.getKeys();

        return Promise.all([keyIDs, keyEntries]).then(result => {
            var [keyIDs, keyEntries] = result as [
                string[],
                agile_keychain_entries.EncryptionKeyEntry[]
            ];
            var locked = false;
            keyEntries.forEach(entry => {
                if (keyIDs.indexOf(entry.identifier) == -1) {
                    locked = true;
                }
            });
            return locked;
        });
    }

    /** Returns the path to the file containing the encrypted data
     * for an item.
     */
    itemPath(uuid: string): string {
        return Path.join(this.path, 'data/default/' + uuid + '.1password');
    }

    loadItem(uuid: string): Promise<item_store.ItemAndContent> {
        var contentInfo = this.fs.stat(this.itemPath(uuid));
        var contentData = this.fs.read(this.itemPath(uuid));
        var item: item_store.Item;
        return asyncutil
            .all2([contentInfo, contentData])
            .then((contentData: [vfs.FileInfo, string]) => {
                let contentInfo = contentData[0];
                let contentJSON = contentData[1];
                let encryptedItem = fromAgileKeychainItem(
                    this,
                    JSON.parse(contentJSON)
                );

                assert(contentInfo.revision);
                encryptedItem.revision = contentInfo.revision;

                item = encryptedItem;
                return encryptedItem.getContent();
            })
            .then(content => ({
                item: item,
                content: content,
            }));
    }

    saveItem(
        item: item_store.Item,
        source?: item_store.ChangeSource
    ): Promise<void> {
        if (source !== item_store.ChangeSource.Sync) {
            item.updateTimestamps();
        } else {
            assert(item.updatedAt);
        }

        // update the '<item ID>.1password' file
        let itemPath = this.itemPath(item.uuid);
        let itemSaved: Promise<void>;
        if (item.isTombstone()) {
            itemSaved = this.fs
                .rm(itemPath)
                .catch((err: Error | vfs.VfsError) => {
                    if (err instanceof vfs.VfsError) {
                        if (err.type === vfs.ErrorType.FileNotFound) {
                            return;
                        }
                    }
                    throw err;
                });
        } else {
            itemSaved = item
                .getContent()
                .then(content => {
                    item.updateOverviewFromContent(content);

                    var contentJSON = JSON.stringify(
                        toAgileKeychainContent(content)
                    );
                    return this.encryptItemData(
                        DEFAULT_AGILEKEYCHAIN_SECURITY_LEVEL,
                        contentJSON
                    );
                })
                .then(encryptedContent => {
                    var keychainJSON = JSON.stringify(
                        toAgileKeychainItem(item, encryptedContent)
                    );
                    return this.fs.write(itemPath, keychainJSON);
                })
                .then(fileInfo => {
                    // update the saved revision for the item
                    item.revision = fileInfo.revision;
                });
        }

        // update the contents.js index file. The index file is not used by
        // Passcards as a source for item metadata, since failures in VFS
        // operations can cause contents.js to get out of sync with the
        // corresponding .1password files. contents.js is maintained and updated
        // by Passcards for compatibility with the official 1Password clients.
        //
        // Updates are added to a queue which is then flushed so that an update for one
        // entry does not clobber an update for another. This also reduces the number
        // of VFS requests.
        //
        this.pendingIndexUpdates.set(item.uuid, item);
        var indexSaved = asyncutil.until(() => {
            // wait for the current index update to complete
            return this.indexUpdated.then(() => {
                if (this.pendingIndexUpdates.size == 0) {
                    // if there are no more updates to save,
                    // we're done
                    return true;
                } else {
                    // otherwise, schedule another flush of updates
                    // to the index, unless another save operation
                    // has already started one
                    if (!this.indexUpdatePending) {
                        this.saveContentsFile();
                    }
                    return false;
                }
            });
        });

        return <any>asyncutil.all2([itemSaved, indexSaved]).then(() => {
            this.onItemUpdated.publish(item);
        });
    }

    // save pending changes to the contents.js index file
    private saveContentsFile() {
        var overviewSaved = defer<{}>();
        var revision: string;

        this.indexUpdated = this.fs
            .stat(this.contentsFilePath())
            .then(stat => {
                revision = stat.revision;
                return this.fs.read(this.contentsFilePath());
            })
            .then(contentsJSON => {
                var updatedItems: item_store.Item[] = [];
                this.pendingIndexUpdates.forEach(item => {
                    updatedItems.push(item);
                });
                this.pendingIndexUpdates.clear();

                var contentEntries: IndexEntry[] = JSON.parse(contentsJSON);
                updatedItems.forEach(item => {
                    var entry = underscore.find(contentEntries, entry => {
                        return entry[0] == item.uuid;
                    });
                    if (!entry) {
                        entry = [
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                        ];
                        contentEntries.push(entry);
                    }
                    entry[0] = item.uuid;
                    entry[1] = <string>item.typeName;
                    entry[2] = item.title;
                    entry[3] = item.primaryLocation();
                    entry[4] = dateutil.unixTimestampFromDate(item.updatedAt);
                    entry[5] = item.folderUuid;
                    entry[6] = 0; // TODO - Find out what this is used for
                    entry[7] = item.trashed ? 'Y' : 'N';
                });

                var newContentsJSON = JSON.stringify(contentEntries);
                return asyncutil.resolveWith(
                    overviewSaved,
                    this.fs.write(this.contentsFilePath(), newContentsJSON, {
                        parentRevision: revision,
                    })
                );
            });

        this.indexUpdatePending = true;
        this.indexUpdated.then(() => {
            this.indexUpdatePending = false;
        });
    }

    private dataFolderPath(): string {
        return Path.join(this.path, 'data/default');
    }

    private contentsFilePath(): string {
        return Path.join(this.dataFolderPath(), 'contents.js');
    }

    private async listDeletedItems() {
        const contents = await vfs_util.readJSON<IndexEntry[]>(
            this.fs,
            this.contentsFilePath()
        );
        return contents
            .filter(entry => entry[1] === item_store.ItemTypes.TOMBSTONE)
            .map(entry => ({ uuid: entry[0], deleted: true }));
    }

    private async listCurrentItems() {
        const ID_REGEX = /^([0-9a-fA-F]+)\.1password$/;
        const entries = await this.fs.list(this.dataFolderPath());
        return entries
            .filter(entry => entry.name.match(ID_REGEX) != null)
            .map(entry => ({
                uuid: entry.name.match(ID_REGEX)[1],
                revision: entry.revision,
                deleted: false,
            }));
    }

    listItemStates(): Promise<item_store.ItemState[]> {
        return Promise.all([
            this.listDeletedItems(),
            this.listCurrentItems(),
        ]).then((items: [item_store.ItemState[], item_store.ItemState[]]) => {
            // if an item is listed as a tombstone in the contents.js file
            // but a .1password file also exists then the deletion takes precedence.
            //
            // This currently does not 'repair' the vault by removing the
            // .1password file.
            let deletedItems = new Set<string>();
            for (let item of items[0]) {
                deletedItems.add(item.uuid);
            }
            let allItems = items[0];
            for (let item of items[1]) {
                if (!deletedItems.has(item.uuid)) {
                    allItems.push(item);
                }
            }
            return allItems;
        });
    }

    /** Returns a list of overview data for all items in the vault,
     * and tombstone markers for deleted items.
     */
    async listItems(
        opts: item_store.ListItemsOptions = {}
    ): Promise<item_store.Item[]> {
        const itemStates = await this.listItemStates();
        let loadedItems: Promise<item_store.ItemAndContent>[] = [];
        for (let state of itemStates) {
            if (state.deleted) {
                if (opts.includeTombstones) {
                    let item = new item_store.Item(this, state.uuid);
                    item.typeName = item_store.ItemTypes.TOMBSTONE;
                    loadedItems.push(
                        Promise.resolve({
                            item: item,
                            content: null,
                        })
                    );
                }
            } else {
                loadedItems.push(this.loadItem(state.uuid));
            }
        }
        const items = await Promise.all(loadedItems);
        // Early versions of Passcards would update .1password
        // files when items were removed rather than deleting them.
        // When listing vault items, filter out any such tombstones
        return items.map(item => item.item).filter(item => {
            return !item.isTombstone() || opts.includeTombstones;
        });
    }

    // items may identify their encryption key via either the 'keyID' or
    // 'level' fields
    async decryptItemData(
        keyID: string,
        level: string,
        data: string
    ): Promise<string> {
        const keys = await this.getKeys();
        var result: Promise<string>;
        for (let key of keys) {
            if (key.identifier === keyID || key.level === level) {
                var cryptoParams = new key_agent.CryptoParams(
                    key_agent.CryptoAlgorithm.AES128_OpenSSLKey
                );
                result = this.keyAgent.decrypt(
                    key.identifier,
                    data,
                    cryptoParams
                );
                break;
            }
        }
        if (result) {
            return result;
        } else {
            throw new Error('No key ' + level + ' found');
        }
    }

    async encryptItemData(level: string, data: string): Promise<string> {
        const keys = await this.getKeys();
        var result: Promise<string>;
        keys.forEach(key => {
            if (key.level === level) {
                var cryptoParams = new key_agent.CryptoParams(
                    key_agent.CryptoAlgorithm.AES128_OpenSSLKey
                );
                result = this.keyAgent.encrypt(
                    key.identifier,
                    data,
                    cryptoParams
                );
                return;
            }
        });
        if (result) {
            return result;
        } else {
            throw new Error('No key ' + level + ' found');
        }
    }

    /** Change the master password for the vault.
     *
     * This decrypts the existing master key and re-encrypts it with @p newPass.
     *
     * @param oldPass The current password for the vault
     * @param newPass The new password for the vault
     * @param newPassHint The user-provided hint for the new password
     * @param iterations The number of iterations of the key derivation function
     *  to use when generating an encryption key from @p newPass. If not specified,
     *  use the same number of iterations as the existing key.
     */
    async changePassword(
        oldPass: string,
        newPass: string,
        newPassHint: string,
        iterations?: number
    ): Promise<{}> {
        const locked = await this.isLocked();
        if (locked) {
            throw new Error(
                'Vault must be unlocked before changing the password'
            );
        }
        const keys = await this.getKeys();
        let reencryptedKeys: Promise<
            agile_keychain_entries.EncryptionKeyEntry
        >[] = [];
        for (let key of keys) {
            reencryptedKeys.push(
                this.reencryptKey(key, oldPass, newPass, iterations)
            );
        }

        const newKeys = await Promise.all(reencryptedKeys);
        let keyList = <agile_keychain_entries.EncryptionKeyList>{
            list: newKeys,
        };
        for (let key of newKeys) {
            keyList[key.level] = key.identifier;
        }

        this.keys = null;
        return this.writeKeys(keyList, newPassHint);
    }

    private async reencryptKey(
        key: agile_keychain_entries.EncryptionKeyEntry,
        oldPass: string,
        newPass: string,
        iterations?: number
    ) {
        let oldSaltCipher = agile_keychain_crypto.extractSaltAndCipherText(
            atob(key.data)
        );
        let newSalt = crypto.randomBytes(8);
        let newKeyIterations = iterations || key.iterations;
        const derivedKey = await key_agent.keyFromPassword(
            oldPass,
            oldSaltCipher.salt,
            key.iterations
        );
        const oldKey = await key_agent.decryptKey(
            derivedKey,
            oldSaltCipher.cipherText,
            atob(key.validation)
        );
        const newDerivedKey = await key_agent.keyFromPassword(
            newPass,
            newSalt,
            newKeyIterations
        );
        const newKey = await key_agent.encryptKey(newDerivedKey, oldKey);
        let newKeyEntry = {
            data: btoa('Salted__' + newSalt + newKey.key),
            identifier: key.identifier,
            iterations: newKeyIterations,
            level: key.level,
            validation: btoa(newKey.validation),
        };
        return newKeyEntry;
    }

    /** Initialize a new empty vault in @p path with
     * a given master @p password.
     */
    static async createVault(
        fs: vfs.VFS,
        path: string,
        password: string,
        hint: string,
        passIterations: number = DEFAULT_VAULT_PASS_ITERATIONS,
        keyAgent?: key_agent.KeyAgent
    ): Promise<Vault> {
        if (!stringutil.endsWith(path, '.agilekeychain')) {
            path += '.agilekeychain';
        }

        let vault = new Vault(fs, path, keyAgent);

        // 1. Check for no existing vault at @p path
        // 2. Add empty contents.js, encryptionKeys.js, 1Password.keys files
        // 3. If this is a Dropbox folder and no file exists in the root
        //    specifying the vault path, add one
        // 4. Generate new random key and encrypt with master password

        await fs.mkpath(vault.dataFolderPath());

        const keyList = await agile_keychain_crypto.generateMasterKey(
            password,
            passIterations
        );
        let keysSaved = vault.writeKeys(keyList, hint);
        let contentsSaved = fs.write(vault.contentsFilePath(), '[]');

        await Promise.all([keysSaved, contentsSaved]);

        return vault;
    }

    passwordHint(): Promise<string> {
        return this.fs.read(Path.join(this.dataFolderPath(), '.password.hint'));
    }

    vaultPath(): string {
        return this.path;
    }

    async getRawDecryptedData(item: item_store.Item): Promise<string> {
        const content = await this.fs.read(this.itemPath(item.uuid));
        const keychainItem = <agile_keychain_entries.Item>JSON.parse(content);
        return this.decryptItemData(
            keychainItem.keyID,
            keychainItem.securityLevel,
            atob(keychainItem.encrypted)
        );
    }

    async getContent(item: item_store.Item): Promise<item_store.ItemContent> {
        const data = await this.getRawDecryptedData(item);
        const content = <agile_keychain_entries.ItemContent>JSON.parse(data);
        return fromAgileKeychainContent(content);
    }

    clear() {
        // not implemented for onepass.Vault since this is the user's
        // primary data source.
        return Promise.reject<void>(
            new Error('Primary vault does not support being cleared')
        );
    }
}
