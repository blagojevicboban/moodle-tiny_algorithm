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
 * Tests of the class view: copies read from the server, their test results (worked out once per version) and times.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {parseCopy, testSummary, timeText} from '../amd/src/classview.js';

test('a copy is read from JSON; anything else is no algorithm', () => {
    const p = createProgram();
    assert.deepEqual(parseCopy(JSON.stringify(p)), p);
    assert.equal(parseCopy('{"functions": 3}'), null);
    assert.equal(parseCopy('not json'), null);
});

test('the tests of a copy run once for each version of it', () => {
    const good = createProgram();
    good.functions[0].body = [B('declare', {name: 'n'}), B('input', {target: 'n'}), B('output', {expr: 'n * 2'})];
    const bad = createProgram();
    bad.functions[0].body = [B('output', {expr: '0'})];
    const tests = [{inputs: '2', expected: '4'}, {inputs: '5', expected: '10'}];
    const cache = new Map();
    assert.deepEqual(testSummary(cache, 'g', good, tests), {passed: 2, total: 2});
    assert.deepEqual(testSummary(cache, 'b', bad, tests), {passed: 0, total: 2});
    // The same text is not run again (the cache answers, even for another program object).
    assert.deepEqual(testSummary(cache, 'g', bad, tests), {passed: 2, total: 2});
    assert.equal(testSummary(cache, 'x', good, []), null);
});

test('times: hours and minutes today, the date when older', () => {
    const now = new Date(2026, 10, 11, 14, 5).getTime() / 1000;
    assert.equal(timeText(now - 60, now), '14:04');
    assert.equal(timeText(now - 3 * 86400, now), '8.11.');
});
