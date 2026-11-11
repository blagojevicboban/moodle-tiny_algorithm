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
 * Tests of the complexity measuring: where n goes, the steps counted for each size and the growth that is named.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {classify, countSteps, measure, parseSizes, sizeTargets} from '../amd/src/complexity.js';
import {TEMPLATES} from '../amd/src/templates.js';

const build = (id) => TEMPLATES.find((t) => t.id === id).build();
const sizes = [10, 20, 50, 100, 200];

test('n is a variable set to a whole number (n first), or the first value read', () => {
    const p = build('bubble_sort');
    const targets = sizeTargets(p);
    assert.equal(targets[0].kind, 'var');
    assert.equal(targets[0].name, 'n');
    assert.equal(targets[0].value, '8');
    assert.deepEqual(sizeTargets(build('sum_n')).map((x) => x.kind), ['input']);
    // Binary search sets n and reads x: n first, then the input.
    assert.deepEqual(sizeTargets(build('binary_search')).map((x) => x.kind), ['var', 'input']);
    const q = createProgram();
    q.functions[0].body = [B('output', {expr: '1'})];
    assert.deepEqual(sizeTargets(q), []);
});

test('sizes typed by the reader', () => {
    assert.deepEqual(parseSizes('50, 10 ;20,20, x, 0, -3, 2.5'), [10, 20, 50]);
});

test('the steps of bubble sort grow like n², a sum like n, a constant algorithm not at all', async() => {
    const bubble = build('bubble_sort');
    const points = await measure(bubble, sizeTargets(bubble)[0], sizes);
    assert.equal(points.length, sizes.length);
    assert.ok(points.every((p, i) => i === 0 || p.steps > points[i - 1].steps));
    assert.equal(classify(points).key, 'on2');
    const sum = build('sum_n');
    assert.equal(classify(await measure(sum, sizeTargets(sum)[0], sizes)).key, 'on');
    const swap = build('swap');
    // Swap reads a and b: the size is only the value of a.
    assert.equal(classify(await measure(swap, sizeTargets(swap)[0], sizes)).key, 'o1');
});

test('binary search: n log n is not named for a straight line, log n is found when n is the value searched for', () => {
    const line = sizes.map((n) => ({n, steps: 3 * n + 40}));
    assert.equal(classify(line).key, 'on');
    const log = sizes.map((n) => ({n, steps: Math.round(7 * Math.log2(n) + 12)}));
    assert.equal(classify(log).key, 'ologn');
    const nlogn = sizes.map((n) => ({n, steps: Math.round(2 * n * Math.log2(n) + 5)}));
    assert.equal(classify(nlogn).key, 'onlogn');
    assert.equal(classify(sizes.slice(0, 2).map((n) => ({n, steps: n}))), null);
});

test('a size that makes too many steps ends the measuring with its error', async() => {
    const bubble = build('bubble_sort');
    const r = await countSteps(bubble, sizeTargets(bubble)[0], 2000);
    assert.equal(r.steps, null);
    assert.equal(r.error, 'steplimit');
    const points = await measure(bubble, sizeTargets(bubble)[0], [10, 2000, 3000]);
    assert.equal(points.length, 2);
});
