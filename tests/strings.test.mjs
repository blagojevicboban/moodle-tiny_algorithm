// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STR, fill, langKey, setStrings, t} from '../amd/src/strings.js';

const langStrings = (lang) => {
    const src = readFileSync(new URL(`../lang/${lang}/tiny_algorithm.php`, import.meta.url), 'utf8');
    return Object.fromEntries([...src.matchAll(/^\$string\['([^']+)'\] = '((?:[^'\\]|\\.)*)';$/gm)]
        .map((m) => [m[1], m[2].replace(/\\'/g, "'")]));
};

test('every widget string is in the English, Serbian Latin and Serbian Cyrillic language files', () => {
    for (const lang of ['en', 'sr_lt', 'sr_cr']) {
        const strings = langStrings(lang);
        for (const key of Object.keys(STR.en)) {
            assert.ok(strings[langKey(key)], `${lang}: ${langKey(key)}`);
        }
    }
});

test('the English language file matches the built-in fallback', () => {
    const strings = langStrings('en');
    for (const [key, text] of Object.entries(STR.en)) {
        assert.equal(strings[langKey(key)], text.replace(/\{(\w+)\}/g, '{$a->$1}'), key);
    }
});

test('technical terms stay in Latin script in the Cyrillic file', () => {
    const strings = langStrings('sr_cr');
    assert.match(strings.ui_import, /\.fprg/);
    assert.match(strings.ui_params, /Integer.*Real/);
});

test('t() uses loaded strings, falls back to English and fills placeholders', () => {
    assert.equal(t('run'), 'Run');
    assert.equal(t('nosuchkey'), 'nosuchkey');
    assert.equal(t('testcase', {n: 2}), 'Test 2');
    assert.equal(t('run', 'sr_cr'), 'Run');
    setStrings({run: 'Покрени', testcase: 'Тест {$a->n}'});
    assert.equal(t('run'), 'Покрени');
    assert.equal(t('testcase', {n: 3}), 'Тест 3');
    assert.equal(fill('{$a->passed} / {total}', {passed: 1, total: 2}), '1 / 2');
    setStrings({run: 'Run', testcase: 'Test {n}'});
});
