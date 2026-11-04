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
import {layoutFunction} from '../amd/src/layout.js';
import {renderFunction} from '../amd/src/render.js';
import {createProgram, createBlock} from '../amd/src/model.js';

const sample = () => {
    const p = createProgram();
    const out = (expr) => createBlock('output', {expr});
    p.functions[0].body = [
        createBlock('if', {cond: 'x > 0', then: [out('1')], else: []}),
        createBlock('while', {cond: 'x < 9', body: [out('2')]}),
        createBlock('for', {variable: 'i', start: '1', end: '3', step: '1', body: []}),
        createBlock('dowhile', {cond: 'x < 3', body: [out('3')]}),
    ];
    return p.functions[0];
};

const key = ([x, y]) => `${x},${y}`;

test('arrows end where a block or another line starts', () => {
    const {items} = layoutFunction(sample());
    const shapes = items.filter((it) => it.t === 'shape');
    const lines = items.filter((it) => it.t === 'line');
    const entries = new Set(shapes.map((s) => key([s.x + s.w / 2, s.y])));
    shapes.filter((s) => ['while', 'for'].includes(s.type)).forEach((s) => entries.add(key([s.x, s.y + s.h / 2])));
    const starts = new Set(lines.map((l) => key(l.pts[0])));
    const arrows = lines.filter((l) => l.arrow);
    assert.ok(arrows.length > 0);
    for (const l of arrows) {
        const end = key(l.pts.at(-1));
        assert.ok(entries.has(end) || starts.has(end), `arrow ending at ${end} points at nothing`);
    }
    // Every block but Start has an arrow into its top or, for Do...While, from its body.
    for (const s of shapes.filter((it) => it.type !== 'start')) {
        const top = key([s.x + s.w / 2, s.y]);
        assert.ok(arrows.some((l) => key(l.pts.at(-1)) === top), `no arrow into ${s.type}`);
    }
});

test('lines that run on into another line have no arrow', () => {
    const {items} = layoutFunction(sample());
    const lines = items.filter((it) => it.t === 'line');
    const loop = items.find((it) => it.type === 'while');
    // The empty else branch and the end of the While body continue into the merge and the loop-back lines.
    const plain = lines.filter((l) => !l.arrow && l.pts.length === 2 && l.pts[0][1] !== l.pts[1][1]);
    assert.ok(plain.length >= 2, 'expected plain list ends');
    assert.ok(lines.some((l) => l.arrow && key(l.pts.at(-1)) === key([loop.x, loop.y + loop.h / 2])), 'loop back arrow');
});

test('the SVG draws one arrowhead per arrow line', () => {
    const fn = sample();
    const arrows = layoutFunction(fn).items.filter((it) => it.t === 'line' && it.arrow && it.pts.length > 1);
    const {svg} = renderFunction(fn);
    const heads = svg.match(/<path class="tiny_algorithm-arrow" d="M[^"]*Z" fill=/g) || [];
    assert.equal(heads.length, arrows.length);
});

test('the lines leaving a decision carry its branch, T and F', () => {
    const fn = sample();
    const {items} = layoutFunction(fn);
    const keys = new Set(items.filter((it) => it.t === 'line' && it.branch).map((it) => it.branch));
    const [ifb, whileb, forb, dob] = fn.body;
    for (const key of [`${ifb.id}:T`, `${ifb.id}:F`, `${whileb.id}:T`, `${whileb.id}:F`, `${forb.id}:T`, `${forb.id}:F`,
        `${dob.id}:T`, `${dob.id}:F`]) {
        assert.ok(keys.has(key), key);
    }
    const {svg} = renderFunction(fn);
    assert.match(svg, new RegExp(`<g class="tiny_algorithm-edge" data-branch="${whileb.id}:F">`));
});

test('the interpreter reports which way every decision goes', async() => {
    const {execute} = await import('../amd/src/interpreter.js');
    const p = createProgram();
    const out = (expr) => createBlock('output', {expr});
    const ifb = createBlock('if', {cond: '1 > 2', then: [out('1')], else: [out('2')]});
    const forb = createBlock('for', {variable: 'i', start: '1', end: '2', step: '1', body: []});
    const dob = createBlock('dowhile', {cond: 'false', body: []});
    p.functions[0].body = [createBlock('declare', {name: 'i'}), ifb, forb, dob];
    const branches = [];
    const gen = execute(p);
    for (let res = gen.next(); !res.done; res = gen.next()) {
        if (res.value.event === 'branch') {
            branches.push(`${res.value.id === ifb.id ? 'if' : res.value.id === forb.id ? 'for' : 'do'}:${res.value.taken}`);
        }
    }
    assert.deepEqual(branches, ['if:false', 'for:true', 'for:true', 'for:false', 'do:false']);
});
