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
 * Tests of the Analysis tab of the class view: shades of the blocks, percents and the CSV.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisCsv, heatLevel, percent} from '../amd/src/classanalysis.js';

test('a block is shaded by the share of wrong answers that miss it', () => {
    assert.equal(heatLevel(0), 0);
    assert.equal(heatLevel(0.09), 0);
    assert.equal(heatLevel(0.1), 1);
    assert.equal(heatLevel(0.45), 2);
    assert.equal(heatLevel(0.5), 3);
    assert.equal(heatLevel(1), 4);
});

test('a share is a whole percent', () => {
    assert.match(percent(0.256, 'en'), /^26\s?%$/);
    assert.match(percent(1, 'xx-invalid-'), /100/);
});

test('the CSV has a line for every wrong output and quotes what needs it', () => {
    const csv = analysisCsv({
        tests: [
            {n: 1, label: '3, 4', passed: 5, failed: 2, errors: 1, outputs: [{output: 'say "hi"', count: 1}]},
            {n: 2, label: 'f(1)', passed: 7, failed: 0, errors: 0, outputs: []},
        ],
        errors: [{message: 'Division by zero', count: 1}],
        structures: [{name: 'for', label: 'For loop', count: 2}],
    });
    const lines = csv.trim().split('\r\n');
    assert.equal(lines[0], 'Test,Inputs or call,Passed,Failed,Errors,Most frequent wrong outputs,Answers');
    assert.equal(lines[1], '1,"3, 4",5,2,1,"say ""hi""",1');
    assert.equal(lines[2], '2,f(1),7,0,0,,');
    assert.ok(lines.includes('Division by zero,1'));
    assert.ok(lines.includes('For loop,2'));
});
