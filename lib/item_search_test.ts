import item_search = require('./item_search');
import item_store = require('./item_store');
import testLib = require('./test');

function itemWithTitleAndUrl(title: string, url: string): item_store.Item {
    var item = new item_store.Item();
    item.title = title;
    item.locations.push(url);
    return item;
}

function formField(
    name: string,
    type: item_store.FormFieldType,
    value: string
): item_store.WebFormField {
    let designation: string;
    if (type == item_store.FormFieldType.Password) {
        designation = 'password';
    } else if (type == item_store.FormFieldType.Email) {
        designation = 'username';
    }

    return {
        id: '',
        name,
        type,
        value,
        designation,
    };
}

testLib.addTest('match item', assert => {
    let item = itemWithTitleAndUrl('Google', 'google.com');

    let content = item_store.ContentUtil.empty();
    content.formFields.push(
        formField('login', item_store.FormFieldType.Email, 'jimsmith@gmail.com')
    );
    content.formFields.push(
        formField('password', item_store.FormFieldType.Password, 'mypass')
    );
    content.formFields.push(
        formField('remember_me', item_store.FormFieldType.Checkbox, 'Y')
    );
    item.setContent(content);

    assert.ok(item_search.matchItem(item, 'goog'));
    assert.ok(item_search.matchItem(item, 'GOOGLE'));
    assert.ok(item_search.matchItem(item, 'google.com'));

    assert.equal(item_search.matchField(content, 'user').length, 1);
    assert.equal(item_search.matchField(content, 'pass').length, 1);
});

testLib.addTest('match item - multiword query', assert => {
    var item = itemWithTitleAndUrl('ACME Ltd. - Google', 'mail.acme.com');
    assert.ok(item_search.matchItem(item, 'acme google'));
    assert.ok(item_search.matchItem(item, 'google acme'));
    assert.ok(!item_search.matchItem(item, 'acme google anotherword'));
});

testLib.addTest('match item - phrase query', assert => {
    var item = itemWithTitleAndUrl(
        'ACME Ltd. - Payroll',
        'payments.enterprisesoft.com/acme'
    );
    assert.ok(item_search.matchItem(item, '"ACME Ltd"'));
    assert.ok(!item_search.matchItem(item, '"ACME Payroll"'));
});

testLib.addTest('URL match score', assert => {
    var item = itemWithTitleAndUrl('LWN', 'http://lwn.net');

    // exact matches
    assert.equal(item_search.itemUrlScore(item, 'http://lwn.net'), 1);
    assert.equal(item_search.itemUrlScore(item, 'http://lwn.net/'), 1);

    // same-host matches
    assert.equal(item_search.itemUrlScore(item, 'lwn.net'), 0.8);
    assert.equal(item_search.itemUrlScore(item, 'https://lwn.net'), 0.8);
    assert.equal(item_search.itemUrlScore(item, 'lwn.net/sub/path'), 0.8);

    // top level domain matches
    assert.equal(item_search.itemUrlScore(item, 'subdomain.lwn.net'), 0.5);

    // unrelated domains
    assert.equal(item_search.itemUrlScore(item, 'google.com'), 0);

    // invalid URLs
    assert.equal(
        item_search.itemUrlScore(
            itemWithTitleAndUrl('Foo', ''),
            'about:newtab'
        ),
        0
    );
    assert.equal(
        item_search.itemUrlScore(itemWithTitleAndUrl('Foo', ''), ''),
        0
    );

    // no scheme in item URL
    assert.equal(
        item_search.itemUrlScore(
            itemWithTitleAndUrl('Google', 'google.com'),
            'google.com'
        ),
        1
    );
});

testLib.addTest('filter items by URL match', assert => {
    var googleItem = itemWithTitleAndUrl('Google', 'https://www.google.com');
    var gmailItem = itemWithTitleAndUrl('Google', 'https://mail.google.com');
    var bbcItem = itemWithTitleAndUrl('BBC', 'https://www.bbc.co.uk');

    var items = [bbcItem, gmailItem, googleItem];

    // check that only relevant sites are returned in the match list
    // and that the more specific host match is preferred to the less
    // specific one
    var gmailMatches = item_search.filterItemsByUrl(
        items,
        'mail.google.com/some/login/page'
    );
    assert.deepEqual(gmailMatches, [gmailItem, googleItem]);
});

testLib.addTest('item type patterns', assert => {
    var types = item_search.matchType('card');
    assert.deepEqual(types, [item_store.ItemTypes.CREDIT_CARD]);

    types = item_search.matchType('router');
    assert.deepEqual(types, [item_store.ItemTypes.ROUTER]);

    types = item_search.matchType('login');
    assert.deepEqual(types, [item_store.ItemTypes.LOGIN]);
});
