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
 * Tests of the texts an AI hint sends: the error with its block, and a failed test with its input, the expected and
 * the actual output (long outputs shortened).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {errorProblem, testProblem} from '../amd/src/aibox.js';

test('an error names the block where the algorithm stopped', () => {
    const p = createProgram();
    const bad = B('assign', {target: 'x', expr: 'y + 1'});
    p.functions[0].body = [B('declare', {name: 'x', varType: 'Integer'}), bad];
    assert.equal(errorProblem(p, 'y is not declared', bad.id), 'y is not declared\nBlock: x = y + 1');
    assert.equal(errorProblem(p, 'Step limit', null), 'Step limit');
});

test('a failed test sends its input, the expected and the actual output', () => {
    const text = testProblem({inputs: '2\n3', expected: '5\n'}, {actual: '6\n', error: null});
    assert.equal(text, 'Input (one value per line):\n2\n3\nExpected output:\n5\n\nOutput of the algorithm:\n6\n');
    const call = testProblem({inputs: '', expected: '120'}, {actual: '', error: 'Fact is not declared'}, 'Fact(5)');
    assert.match(call, /^Call: Fact\(5\)\nExpected output:\n120\n/);
    assert.match(call, /It stopped with the error: Fact is not declared$/);
    const long = testProblem({inputs: '', expected: 'x'}, {actual: 'y'.repeat(5000), error: null});
    assert.ok(long.length < 1200);
    assert.match(long, /\(none\)/);
});
