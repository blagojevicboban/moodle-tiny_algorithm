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
import {renameCalls} from '../amd/src/expr.js';
import {
    blocksFromText, blocksToText, canMoveBlock, copyBlock, createBlock, createProgram, moveBlock, renameFunction,
} from '../amd/src/model.js';
import {runSync} from '../amd/src/interpreter.js';

test('renameCalls changes only calls of the function', () => {
    assert.equal(renameCalls('zbir(a, 2) + ZBIR (b) + zbirka(1) + zbir', 'Zbir', 'Suma'), 'Suma(a, 2) + Suma (b) + zbirka(1) + zbir');
    assert.equal(renameCalls('"zbir(1)" & zbir(1)', 'zbir', 'suma'), '"zbir(1)" & suma(1)');
    assert.equal(renameCalls('"a\\"zbir(" & zbir(1)', 'zbir', 'suma'), '"a\\"zbir(" & suma(1)');
    assert.equal(renameCalls('x.zbir(1) + 2zbir(1)', 'zbir', 'suma'), 'x.zbir(1) + 2zbir(1)');
    assert.equal(renameCalls('', 'zbir', 'suma'), '');
});

test('renameFunction renames the calls in every function and the program still runs', () => {
    const program = createProgram();
    program.functions.push({name: 'Dupl', params: [{name: 'n', type: 'Integer', array: false}], returnType: 'Integer',
        body: [createBlock('return', {expr: 'n * 2'})]});
    program.functions[0].body.push(
        createBlock('declare', {name: 'x', varType: 'Integer'}),
        createBlock('assign', {target: 'x', expr: 'dupl(3)'}),
        createBlock('if', {cond: 'Dupl(x) > 10', then: [createBlock('output', {expr: '"Dupl(" & DUPL(x)'})], 'else': []}),
        createBlock('call', {expr: 'Dupl(1)'}));
    renameFunction(program, program.functions[1], 'Twice');
    const main = program.functions[0].body;
    assert.equal(program.functions[1].name, 'Twice');
    assert.equal(main[1].expr, 'Twice(3)');
    assert.equal(main[2].cond, 'Twice(x) > 10');
    assert.equal(main[2].then[0].expr, '"Dupl(" & Twice(x)');
    assert.equal(main[3].expr, 'Twice(1)');
    assert.equal(runSync(program, []), 'Dupl(12\n');
});

test('renameFunction leaves the calls when the name is invalid or taken', () => {
    const program = createProgram();
    program.functions.push({name: 'A', params: [], returnType: null, body: []},
        {name: 'B', params: [], returnType: null, body: []});
    program.functions[0].body.push(createBlock('call', {expr: 'A()'}));
    renameFunction(program, program.functions[2], 'b c');
    renameFunction(program, program.functions[2], 'A');
    assert.equal(program.functions[0].body[0].expr, 'A()');
    renameFunction(program, program.functions[2], 'C');
    assert.equal(program.functions[0].body[0].expr, 'A()');
});

test('copyBlock gives new ids and keeps only the fields of the block type', () => {
    const loop = createBlock('while', {cond: 'i < 3', body: [createBlock('output', {expr: 'i'})]});
    const copy = copyBlock({...loop, onclick: 'x', cond: 5});
    assert.notEqual(copy.id, loop.id);
    assert.notEqual(copy.body[0].id, loop.body[0].id);
    assert.equal(copy.cond, 'x < 10', 'a value of the wrong type is replaced by the default');
    assert.equal(copy.body[0].expr, 'i');
    assert.equal(copy.onclick, undefined);
    assert.equal(copyBlock({type: 'script'}), null);
    assert.equal(copyBlock(null), null);
});

test('blocks survive the clipboard text, other text gives null', () => {
    const blocks = [createBlock('assign', {target: 's', expr: 's + 1'})];
    const back = blocksFromText(blocksToText(blocks));
    assert.equal(back.length, 1);
    assert.equal(back[0].expr, 's + 1');
    assert.notEqual(back[0].id, blocks[0].id);
    assert.equal(blocksFromText('hello'), null);
    assert.equal(blocksFromText('{"tinyAlgorithmBlocks": [{"type": "nope"}]}'), null);
});

test('moveBlock moves within a list, into a loop, and never into the block itself', () => {
    const program = createProgram();
    const body = program.functions[0].body;
    const a = createBlock('output', {expr: '1'});
    const b = createBlock('output', {expr: '2'});
    const loop = createBlock('while', {cond: 'x < 3', body: []});
    body.push(a, b, loop);
    assert.equal(canMoveBlock(program, a.id, body, 0), false, 'same place');
    assert.equal(canMoveBlock(program, a.id, body, 1), false, 'same place');
    assert.equal(moveBlock(program, a.id, body, 2), true);
    assert.deepEqual(body.map((x) => x.expr || x.cond), ['2', '1', 'x < 3']);
    assert.equal(moveBlock(program, b.id, loop.body, 0), true);
    assert.deepEqual(body.map((x) => x.expr || x.cond), ['1', 'x < 3']);
    assert.equal(loop.body[0], b);
    assert.equal(moveBlock(program, loop.id, loop.body, 0), false, 'not into itself');
    assert.equal(moveBlock(program, b.id, body, 0), true);
    assert.deepEqual(body.map((x) => x.expr || x.cond), ['2', '1', 'x < 3']);
    assert.equal(loop.body.length, 0);
});
