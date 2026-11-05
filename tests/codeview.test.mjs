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
 * Tests of the code panel helpers that do not need a browser: a click on a line finds its block, the arrow keys go
 * from block to block.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B, findBlock} from '../amd/src/model.js';
import {generateLines, languages} from '../amd/src/codegen.js';
import {nextBlock} from '../amd/src/codeview.js';

const program = () => {
    const p = createProgram();
    const out = B('output', {expr: 'i'});
    const loop = B('for', {variable: 'i', start: '1', end: '3', step: '1', body: [out]});
    const after = B('output', {expr: '"end"'});
    p.functions[0].body = [B('declare', {name: 'i'}), loop, after];
    return {p, out, loop, after};
};

/** A code panel stand-in: only querySelectorAll of the lines is used. */
const panel = (owners) => ({
    querySelectorAll: () => owners.map((o) => ({dataset: o ? {block: o} : {}})),
});

test('every block of the code lines is a block of the program, in every language', () => {
    const {p} = program();
    for (const lang of languages) {
        const {owners} = generateLines(lang, p);
        for (const id of owners.filter(Boolean)) {
            assert.ok(findBlock(p, id), `${lang}: ${id}`);
        }
    }
});

test('the arrow keys go from block to block through the code lines', () => {
    const {p, out, loop, after} = program();
    const pre = panel(generateLines('pascal', p).owners);
    const decl = p.functions[0].body[0].id;
    assert.equal(nextBlock(pre, null, 1), decl);
    assert.equal(nextBlock(pre, decl, 1), loop.id);
    assert.equal(nextBlock(pre, loop.id, 1), out.id);
    assert.equal(nextBlock(pre, out.id, 1), loop.id); // The end of the loop.
    assert.equal(nextBlock(pre, out.id, -1), loop.id);
    assert.equal(nextBlock(pre, null, -1), after.id);
    assert.equal(nextBlock(pre, after.id, 1), null);
});

test('the code panel starts with the language chosen for the diagram, else Python', async() => {
    const {defaultLanguage} = await import('../amd/src/codegen.js');
    assert.equal(defaultLanguage({codeLang: 'c', functions: []}), 'c');
    assert.equal(defaultLanguage({codeLang: 'cobol', functions: []}), 'python');
    assert.equal(defaultLanguage(null), 'python');
});
