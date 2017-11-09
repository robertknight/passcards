import asyncutil = require('../base/asyncutil');
import client = require('./client');
import client_api = require('./client_api');
import site_info = require('./site_info');
import testLib = require('../test');
import { delay } from '../base/promise_util';

testLib.addTest('fetch google.com icons', assert => {
    var dataUrl = '/icondata/12345';
    var httpGetter = (url: string) => {
        var body;
        
        if (url === 'https://passcards-robknight.rhcloud.com/siteinfo/google.com?timeout=3000') {
            var iconInfo: client_api.LookupResponse = {
                domain: 'google.com',
                icons: [{
                    width: 128,
                    height: 128,
                    sourceUrl: 'https://google.com/someicon.png',
                    dataUrl,
                }],
                lastModified: 0,
                status: 'foo',
                submitted: 0,
            }
            body = JSON.stringify(iconInfo);
        } else if (url === 'https://passcards-robknight.rhcloud.com' + dataUrl) {
            body = '{ icon bitmap data }';
        } else {
            throw new Error('Unexpected URL ' + url);
        }

        return Promise.resolve({
            url,
            status: 200,
            body,
            headers: {},
        });
    };

    var passcardsClient = new client.PasscardsClient(undefined, httpGetter);

    var TEST_DOMAIN = 'http://google.com';
    var result: site_info.QueryResult;

    return asyncutil
        .until(() => {
            result = passcardsClient.lookup(TEST_DOMAIN);
            if (result.state == site_info.QueryState.Ready) {
                return Promise.resolve(true);
            } else {
                return delay(false, 50);
            }
        })
        .then(() => {
            assert.equal(result.info.url, 'http://google.com');
            assert.ok(result.info.icons.length > 0);

            result.info.icons.forEach(icon => {
                assert.ok(icon.width > 0);
                assert.ok(icon.height > 0);
                assert.ok(icon.data !== null);
                assert.ok(icon.url !== null);
            });
        });
});
