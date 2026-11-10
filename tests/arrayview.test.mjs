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
 * Tests of the array panel: the arrays and the elements read and written that the interpreter sends with every step
 * (track), the index variables of each array, and the sorting and search templates.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {execute, runSync, ARRAY_VIEW_ITEMS} from '../amd/src/interpreter.js';
import {indexNames, usesArrays} from '../amd/src/arrayview.js';
import {TEMPLATES} from '../amd/src/templates.js';

/**
 * All events of a run (inputs answered from a list).
 *
 * @param {Object} program
 * @param {Object} opts options of execute
 * @param {string[]} inputs
 * @returns {Array}
 */
const events = (program, opts = {}, inputs = []) => {
    const out = [];
    const gen = execute(program, opts);
    let res = gen.next();
    while (!res.done) {
        out.push(res.value);
        res = gen.next(res.value.event === 'input' ? inputs.shift() : undefined);
    }
    return out;
};

test('with track every step has the arrays of the call and what the block before it read and wrote', () => {
    const p = createProgram();
    const swap = B('assign', {target: 'a[1]', expr: 'a[0] + a[2]'});
    const after = B('output', {expr: '1'});
    p.functions[0].body = [B('declare', {name: 'a', varType: 'Integer', size: '3'}), B('assign', {target: 'a[0]', expr: '4'}),
        swap, after, B('declare', {name: 'm', varType: 'Integer', size: '2', size2: '2'}),
        B('assign', {target: 'm[1, 0]', expr: 'a[1]'})];
    const steps = events(p, {track: true}).filter((e) => e.event === 'step' || e.event === 'done');
    const at = steps.find((e) => e.id === after.id);
    assert.deepEqual(at.arrays, [{name: 'a', type: 'Integer', dims: 1, length: 3, value: [4, 4, 0]}]);
    assert.deepEqual(at.access, [{name: 'a', i: 0, kind: 'r'}, {name: 'a', i: 2, kind: 'r'}, {name: 'a', i: 1, kind: 'w'}]);
    const done = steps.at(-1);
    assert.equal(done.event, 'done');
    assert.deepEqual(done.access, [{name: 'a', i: 1, kind: 'r'}, {name: 'm', i: 1, j: 0, kind: 'w'}]);
    assert.deepEqual(done.arrays[1].value, [[0, 0], [4, 0]]);
    // Without track the events are as before (grading, the PHP parity).
    const plain = events(p).find((e) => e.event === 'step');
    assert.equal(plain.arrays, undefined);
    assert.equal(plain.access, undefined);
});

test('the panel gets at most ARRAY_VIEW_ITEMS elements of a big array, with its whole length', () => {
    const p = createProgram();
    const end = B('output', {expr: '1'});
    p.functions[0].body = [B('declare', {name: 'big', varType: 'Real', size: '1000'}), end];
    const ev = events(p, {track: true}).find((e) => e.id === end.id);
    assert.equal(ev.arrays[0].length, 1000);
    assert.equal(ev.arrays[0].value.length, ARRAY_VIEW_ITEMS);
});

test('index variables of each array, and which programs have arrays', () => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'a', varType: 'Integer', size: '5'}),
        B('if', {cond: 'a[j] > a[j + 1] && b[2] < 3', then: [B('assign', {target: 'm[i, k - 1]', expr: 'a[low]'})],
            'else': [B('output', {expr: 'a[(i + 1) * 2]'})]})];
    const names = indexNames(p);
    assert.deepEqual(names.get('a'), ['j', 'low']);
    assert.deepEqual(names.get('b'), []);
    assert.deepEqual(names.get('m'), ['i', 'k']);
    assert.equal(usesArrays(p), true);
    const q = createProgram();
    q.functions[0].body = [B('declare', {name: 'n'})];
    assert.equal(usesArrays(q), false);
    q.functions.push({name: 'Sum', params: [{name: 'v', type: 'Integer', array: true}], returnType: 'Integer', body: []});
    assert.equal(usesArrays(q), true);
});

test('the sorting templates sort, the binary search finds', () => {
    const build = (id) => TEMPLATES.find((t) => t.id === id).build();
    for (const id of ['bubble_sort', 'selection_sort']) {
        for (const seed of [1, 7, 2026]) {
            const out = runSync(build(id), [], {seed}).trim().split(' ').map(Number);
            assert.equal(out.length, 8, id);
            assert.deepEqual(out, [...out].sort((x, y) => x - y), `${id} with seed ${seed}`);
        }
    }
    assert.match(runSync(build('binary_search'), ['27']), /Found at index 9/);
    assert.match(runSync(build('binary_search'), ['28']), /Not found/);
    assert.match(runSync(build('binary_search'), ['0']), /Found at index 0/);
    assert.match(runSync(build('binary_search'), ['45']), /Found at index 15/);
});
