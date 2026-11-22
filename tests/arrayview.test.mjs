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
import {countsText, findSwap, heat, indexNames, isRecord, rangeAt, rangeMarkers, swapIn, usesArrays}
    from '../amd/src/arrayview.js';
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
    for (const id of ['bubble_sort', 'selection_sort', 'insertion_sort', 'quick_sort', 'merge_sort', 'counting_sort']) {
        for (const seed of [1, 7, 2026]) {
            const out = runSync(build(id), [], {seed}).trim().split(' ').map(Number);
            assert.equal(out.length, {quick_sort: 10, merge_sort: 10, counting_sort: 12}[id] || 8, id);
            assert.deepEqual(out, [...out].sort((x, y) => x - y), `${id} with seed ${seed}`);
        }
    }
    assert.match(runSync(build('binary_search'), ['27']), /Found at index 9/);
    assert.match(runSync(build('binary_search'), ['28']), /Not found/);
    assert.match(runSync(build('binary_search'), ['0']), /Found at index 0/);
    assert.deepEqual(rangeMarkers(build('binary_search')), [{array: null, low: 'low', high: 'high'}]);
    assert.match(runSync(build('binary_search'), ['45']), /Found at index 15/);
});

test('the counters: comparisons, element reads and writes, and swaps (equal values are no swap)', () => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'a', varType: 'Integer', size: '3'}), B('declare', {name: 't', varType: 'Integer'}),
        B('assign', {target: 'a[0]', expr: '5'}), B('assign', {target: 'a[1]', expr: '2'}),
        B('if', {cond: 'a[0] > a[1]', then: [B('assign', {target: 't', expr: 'a[0]'}), B('assign', {target: 'a[0]', expr: 'a[1]'}),
            B('assign', {target: 'a[1]', expr: 't'})], 'else': []}),
        B('assign', {target: 'a[2]', expr: 'a[1]'}), B('assign', {target: 'a[1]', expr: 'a[2]'})];
    let counts = null;
    for (const ev of execute(p, {track: true})) {
        counts = ev.counts || counts;
    }
    assert.deepEqual(counts, {compares: 1, reads: 6, writes: 6, swaps: 1});
    assert.equal(countsText(counts), 'Comparisons: 1 · Swaps: 1 · Element reads: 6 · Element writes: 6');
});

test('records go to the panel as fields and values; a matrix is shaded from the smallest to the largest', () => {
    const p = Object.assign(createProgram(), {records: [{name: 'P', fields: [{name: 'x', type: 'Integer'},
        {name: 'n', type: 'String'}]}]});
    p.functions[0].body = [B('declare', {name: 'ps', varType: 'P', size: '2'}), B('assign', {target: 'ps[1].x', expr: '4'})];
    let arrays = null;
    for (const ev of execute(p, {track: true})) {
        arrays = ev.arrays || arrays;
    }
    assert.deepEqual(arrays[0].value[1], {fields: ['x', 'n'], values: [4, '']});
    assert.ok(isRecord(arrays[0].value[1]) && !isRecord(4) && !isRecord(null));
    assert.deepEqual([0, 2, 5, 9, 10].map((x) => heat(x, 0, 10)), [0, 1, 2, 4, 4]);
    assert.equal(heat(3, 3, 3), 0);
});

test('rangeMarkers reads @range from the comments of blocks and from Comment blocks', () => {
    const program = {functions: [{name: 'Main', body: [
        {type: 'comment', text: 'Binary search\n@range Low High'},
        {type: 'while', cond: 'low <= high', note: 'The part still searched. @range low high', body: [
            {type: 'assign', target: 'mid', expr: '(low + high) / 2', note: '@range b lo hi'},
        ]},
    ]}, {name: 'F', body: [{type: 'if', cond: 'x', then: [], else: [{type: 'output', expr: '1', note: '@RANGE i j'}]}]}]};
    assert.deepEqual(rangeMarkers(program), [
        {array: null, low: 'low', high: 'high'},
        {array: 'b', low: 'lo', high: 'hi'},
        {array: null, low: 'i', high: 'j'},
    ]);
    assert.deepEqual(rangeMarkers({functions: [{body: [{type: 'output', expr: '1', note: 'no marker @range low'}]}]}), []);
    assert.deepEqual(rangeMarkers(null), []);
});

test('rangeAt gives the elements between the two variables at a step', () => {
    const ints = (vars) => new Map(Object.entries(vars).map(([name, value]) => [name, {name, value}]));
    const range = {array: null, low: 'low', high: 'high'};
    assert.deepEqual(rangeAt(range, ints({low: 2, high: 5}), 10), {from: 2, to: 5});
    assert.deepEqual(rangeAt(range, ints({low: 4, high: 4}), 10), {from: 4, to: 4});
    // Kept inside the array (high = n before the first step of some searches).
    assert.deepEqual(rangeAt(range, ints({low: -1, high: 10}), 10), {from: 0, to: 9});
    // Empty when low passed high (the search ended), or a variable has no integer value yet.
    assert.equal(rangeAt(range, ints({low: 6, high: 5}), 10), null);
    assert.equal(rangeAt(range, ints({low: 1}), 10), null);
});

test('findSwap finds the two elements that exchanged their values', () => {
    assert.deepEqual(findSwap([5, 1, 4, 2], [1, 5, 4, 2]), [0, 1]);
    assert.deepEqual(findSwap([5, 1, 4, 2], [2, 1, 4, 5]), [0, 3]);
    assert.deepEqual(findSwap(['b', 'a'], ['a', 'b']), [0, 1]);
    // Not a swap: one write, other values, more changes, equal values, another length.
    assert.equal(findSwap([5, 1, 4], [5, 5, 4]), null);
    assert.equal(findSwap([5, 1, 4], [1, 6, 4]), null);
    assert.equal(findSwap([3, 2, 1], [1, 3, 2]), null);
    assert.equal(findSwap([2, 2, 1], [2, 2, 1]), null);
    assert.equal(findSwap([1, 2], [1, 2, 3]), null);
    assert.equal(findSwap(undefined, [1, 2]), null);
});

test('swapIn finds a swap written over several steps (t = a[i]; a[i] = a[j]; a[j] = t)', () => {
    const start = [4, 3, 9];
    const afterFirstWrite = [3, 3, 9];
    const afterSecondWrite = [3, 4, 9];
    assert.deepEqual(swapIn([start, start, afterFirstWrite], afterSecondWrite), [0, 1]);
    // The newest step alone shows one write only.
    assert.equal(swapIn([afterFirstWrite], afterSecondWrite), null);
    assert.equal(swapIn([], afterSecondWrite), null);
});

test('in the steps of bubble sort swapIn finds every swap the interpreter counts', () => {
    const program = TEMPLATES.find((t) => t.id === 'bubble_sort').build();
    let history = [];
    let swaps = 0;
    let found = 0;
    let counted = 0;
    for (const ev of events(program, {track: true, seed: 7})) {
        const a = (ev.arrays || []).find((x) => x.name === 'a');
        if (!a || !ev.counts) {
            continue;
        }
        if (ev.counts.swaps > swaps) {
            const pair = swapIn(history, a.value);
            assert.ok(pair, `swap ${ev.counts.swaps} found`);
            assert.equal(pair[1] - pair[0], 1, 'bubble sort swaps neighbours');
            found++;
        }
        swaps = ev.counts.swaps;
        counted = swaps;
        history = [...history, a.value.slice()].slice(-4);
    }
    assert.ok(counted > 0);
    assert.equal(found, counted);
});
