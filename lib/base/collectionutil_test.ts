import collectionutil = require('./collectionutil');
import testLib = require('../test');

testLib.addTest('add/fetch keys', assert => {
    var map = new collectionutil.BiDiMap<number, string>();
    map
        .add(1, 'one')
        .add(2, 'two')
        .add(3, 'three');

    assert.equal(map.get(1), 'one');
    assert.equal(map.get(3), 'three');
    assert.equal(map.get(4), null);

    assert.equal(map.get2('one'), 1);
    assert.equal(map.get2('three'), 3);
    assert.equal(map.get2('four'), null);
});

interface KeyValue {
    key: string;
    value: number;
}

testLib.addTest('convert list to map', assert => {
    var map = collectionutil.listToMap(
        [{ k: 1, v: 1 }, { k: 2, v: 2 }, { k: 3, v: 3 }],
        item => {
            return item.k;
        }
    );
    assert.equal(map.size, 3);
    assert.ok(map.has(1));
    assert.ok(map.has(2));
    assert.ok(map.has(3));
    assert.deepEqual(map.get(3), { k: 3, v: 3 });
});

type KeyValueMap = { [index: string]: number };

testLib.addTest('batched updates', assert => {
    var savedItems: KeyValueMap = {};

    var queue = new collectionutil.BatchedUpdateQueue<KeyValue>(
        (updates: KeyValue[]) => {
            updates.forEach(pair => {
                savedItems[pair.key] = pair.value;
            });
            return Promise.resolve<void>(null);
        }
    );

    var update1 = queue.push({ key: 'one', value: 1 });
    var update2 = queue.push({ key: 'one', value: 2 });
    var update3 = queue.push({ key: 'two', value: 3 });

    return Promise.all([update1, update2, update3]).then(() => {
        assert.deepEqual(savedItems, <KeyValueMap>{
            one: 2,
            two: 3,
        });
    });
});

const hexlifyCases = [
    ['abc', '616263'],
    ['$@!', '244021'],
    [String.fromCharCode(0), '00'],
    [String.fromCharCode(255), 'ff'],
];

testLib.addTest('hexlify produces expected hex string', assert => {
    hexlifyCases.forEach(([binStr, hexStr]) => {
        const actualHexStr = collectionutil.hexlify(
            collectionutil.bufferFromString(binStr)
        );
        assert.equal(actualHexStr, hexStr);
    });
});

testLib.addTest('unhexlify produces expected buffer', assert => {
    hexlifyCases.forEach(([binStr, hexStr]) => {
        const actualBinStr = collectionutil.stringFromBuffer(
            collectionutil.unhexlify(hexStr)
        );
        assert.equal(actualBinStr, binStr);
    });
});
