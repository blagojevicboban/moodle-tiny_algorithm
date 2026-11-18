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
 * Tests of the outline (the algorithm as a tree for screen readers) and of what is announced at the end of a run.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlock as B, createProgram} from '../amd/src/model.js';
import {outlineItems} from '../amd/src/outline.js';
import {OUTPUT_ANNOUNCED, outputAnnouncement} from '../amd/src/session.js';

test('the outline has the functions, the blocks, and the Then and Else parts of an If', () => {
    const p = createProgram();
    const w = B('while', {cond: 'i < 3', body: [B('assign', {target: 'i', expr: 'i + 1'})]});
    const branch = B('if', {cond: 'i > 2', then: [B('output', {expr: '"big"'})], 'else': []});
    p.functions[0].body = [B('declare', {name: 'i', varType: 'Integer'}), w, branch];
    p.functions.push({name: 'Twice', params: [{name: 'x', type: 'Integer'}], returnType: 'Integer',
        body: [B('return', {expr: 'x * 2'})]});
    const items = outlineItems(p);
    assert.deepEqual(items.map((f) => f.text), ['Function Main()', 'Function Twice(x)']);
    const main = items[0].children;
    assert.equal(main[1].text, 'While: i < 3');
    assert.equal(main[1].children[0].text, 'Assign: i = i + 1');
    assert.equal(main[1].children[0].id, w.body[0].id);
    assert.deepEqual(main[2].children.map((c) => [c.text, c.children.length]), [['Then (true)', 1], ['Else (false)', 0]]);
    assert.equal(items[1].children[0].fn, 1);
});

test('the end of a run is announced with the end of the output', () => {
    assert.equal(outputAnnouncement('Finished', ''), 'Finished');
    assert.equal(outputAnnouncement('Finished', 'Sum:\n  6\n'), 'Finished Output: Sum: 6');
    assert.ok(OUTPUT_ANNOUNCED >= 100);
});
