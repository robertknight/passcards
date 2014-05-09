/// <reference path="../typings/DefinitelyTyped/jquery/jquery.d.ts" />
/// <reference path="../typings/DefinitelyTyped/q/Q.d.ts" />
var $ = require('jquery');
var Q = require('q');

var dropboxvfs = require('../lib/dropboxvfs');
var onepass = require('../lib/onepass');

var App = (function () {
    function App() {
        var _this = this;
        var fs = new dropboxvfs.DropboxVFS();
        var account = fs.login();
        var vault = Q.defer();
        this.vault = vault.promise;

        account.then(function () {
            vault.resolve(new onepass.Vault(fs, '/1Password/1Password.agilekeychain'));
            var content = '';
        }).done();

        this.vault.then(function (vault) {
            vault.listItems().then(function (items) {
                items.sort(function (a, b) {
                    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                });
                var content = '';
                var linkIDs = [];
                items.forEach(function (item) {
                    var linkID = 'item-' + item.uuid;
                    content = content + '<div><a href="#" id="' + linkID + '">' + item.title + '</a></div>';
                    linkIDs.push(linkID);
                });
                $('#item-list').html(content);
                items.forEach(function (item, index) {
                    $('#' + linkIDs[index]).click(function () {
                        _this.showDetails(item);
                    });
                });
            });
        }).done();

        $('#unlock-btn').click(function () {
            var pass = $('#master-pass').val();
            var lockStatus = $('#lock-status');
            lockStatus.text('Unlocking...');
            _this.vault.then(function (vault) {
                return vault.unlock(pass);
            }).then(function (unlocked) {
                lockStatus.text('Vault Unlocked');
            }).fail(function (err) {
                lockStatus.text('Unlocking failed: ' + err);
            });
        });
    }
    App.prototype.showDetails = function (item) {
        console.log('Fetching content for ' + item.title);
        item.getContent().then(function (content) {
            $('#item-details').html(JSON.stringify(content));
        }).fail(function (err) {
            $('#item-details').html('Failed to retrieve item details');
        }).done();
    };
    return App;
})();
exports.App = App;
//# sourceMappingURL=app.js.map
