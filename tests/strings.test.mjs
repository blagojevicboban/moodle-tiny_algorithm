import test from 'node:test';
import assert from 'node:assert/strict';
import {STR, t} from '../amd/src/strings.js';

test('Serbian Latin, Serbian Cyrillic and English tables have the same keys', () => {
    assert.deepEqual(Object.keys(STR.sr_cr).sort(), Object.keys(STR.en).sort());
    assert.deepEqual(Object.keys(STR.sr).sort(), Object.keys(STR.en).sort());
});

test('t() picks the table from the language code', () => {
    assert.equal(t('run', 'en'), 'Run');
    assert.equal(t('run', 'sr'), 'Pokreni');
    assert.equal(t('run', 'sr_lt'), 'Pokreni');
    assert.equal(t('run', 'sr_cr'), 'Покрени');
    assert.equal(t('nosuchkey', 'sr_cr'), 'nosuchkey');
});

test('technical terms stay in Latin script in the Cyrillic table', () => {
    assert.match(STR.sr_cr.import, /\.fprg/);
    assert.match(STR.sr_cr.params, /Integer.*Real/);
});
