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
 * Tests of the choice of the code language: the algorithm, the course, the site and the student.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {pickLanguage, rememberLanguage} from '../amd/src/codelang.js';

// A localStorage for the browser code.
const store = new Map();
globalThis.window = {localStorage: {getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v)}};

const site = {default: 'python', allowed: ['pseudo', 'python', 'csharp'], force: false, lock: false, scope: '7'};

test('order: the algorithm, then the student in this course, then the course or the site; only offered languages', () => {
    store.clear();
    assert.deepEqual(pickLanguage({}, site), {lang: 'python', allowed: site.allowed, locked: false});
    assert.equal(pickLanguage({codeLang: 'csharp'}, site).lang, 'csharp');
    // A language the site does not offer is skipped.
    assert.equal(pickLanguage({codeLang: 'java'}, site).lang, 'python');
    rememberLanguage('pseudo', site);
    assert.equal(store.get('tiny_algorithm_codelang_7'), 'pseudo');
    assert.equal(pickLanguage({}, site).lang, 'pseudo');
    assert.equal(pickLanguage({codeLang: 'csharp'}, site).lang, 'csharp', 'the algorithm comes before the student');
    // Another course does not see this choice.
    assert.equal(pickLanguage({}, {...site, scope: '8', default: 'csharp'}).lang, 'csharp');
    // No settings at all: every language, Python first.
    assert.equal(pickLanguage({}, {}).lang, 'python');
    assert.equal(pickLanguage({}, {}).allowed.length, 12);
});

test('a course can force its language and lock it; an algorithm can lock its own', () => {
    store.clear();
    const forced = {...site, default: 'csharp', force: true};
    assert.equal(pickLanguage({codeLang: 'python'}, forced).lang, 'csharp');
    assert.deepEqual(pickLanguage({codeLang: 'python'}, {...forced, lock: true}), {lang: 'csharp', allowed: ['csharp'], locked: true});
    assert.deepEqual(pickLanguage({codeLang: 'pseudo', codeLock: true}, site), {lang: 'pseudo', allowed: ['pseudo'], locked: true});
    // A lock without a language of the algorithm locks nothing; the course lock keeps the course or site language.
    assert.equal(pickLanguage({codeLock: true}, site).locked, false);
    assert.deepEqual(pickLanguage({}, {...site, lock: true}), {lang: 'python', allowed: ['python'], locked: true});
});

test('teachers get every offered language and start from their last choice, not from locks', () => {
    store.clear();
    const locked = {...site, default: 'csharp', force: true, lock: true};
    assert.deepEqual(pickLanguage({codeLang: 'pseudo', codeLock: true}, locked, true),
        {lang: 'pseudo', allowed: site.allowed, locked: false});
    rememberLanguage('csharp', site, true);
    assert.equal(store.get('tiny_algorithm_codelang'), 'csharp');
    assert.equal(pickLanguage({}, site, true).lang, 'csharp');
});
