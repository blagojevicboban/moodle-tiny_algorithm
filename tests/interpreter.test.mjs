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
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {execute, runSync} from '../amd/src/interpreter.js';

const prog = (...body) => {
    const p = createProgram();
    p.functions[0].body = body;
    return p;
};

test('sum 1..n with while loop', () => {
    const p = prog(
        B('declare', {name: 'n'}), B('declare', {name: 's'}), B('declare', {name: 'i'}),
        B('input', {target: 'n'}),
        B('assign', {target: 's', expr: '0'}), B('assign', {target: 'i', expr: '1'}),
        B('while', {cond: 'i <= n', body: [
            B('assign', {target: 's', expr: 's + i'}),
            B('assign', {target: 'i', expr: 'i + 1'}),
        ]}),
        B('output', {expr: '"Sum = " & s'}),
    );
    assert.equal(runSync(p, [10]), 'Sum = 55\n');
});

test('for loop, if/else, mod', () => {
    const p = prog(
        B('for', {variable: 'i', start: '1', end: '4', step: '1', body: [
            B('if', {cond: 'i mod 2 = 0', then: [B('output', {expr: '"even"'})], else: [B('output', {expr: '"odd"'})]}),
        ]}),
    );
    assert.equal(runSync(p), 'odd\neven\nodd\neven\n');
});

test('arrays and do-while', () => {
    const p = prog(
        B('declare', {name: 'a', size: '3'}), B('declare', {name: 'k'}),
        B('assign', {target: 'k', expr: '0'}),
        B('dowhile', {cond: 'k < 3', body: [
            B('assign', {target: 'a[k]', expr: 'k * k'}),
            B('assign', {target: 'k', expr: 'k + 1'}),
        ]}),
        B('output', {expr: 'a[0] & "," & a[1] & "," & a[2]'}),
    );
    assert.equal(runSync(p), '0,1,4\n');
});

test('user function with recursion', () => {
    const p = createProgram();
    p.functions[0].body = [B('output', {expr: 'Fact(5)'})];
    p.functions.push({name: 'Fact', params: [{name: 'n', type: 'Integer'}], returnType: 'Integer', body: [
        B('if', {cond: 'n <= 1', then: [B('return', {expr: '1'})], else: [B('return', {expr: 'n * Fact(n - 1)'})]}),
    ]});
    assert.equal(runSync(p), '120\n');
});

test('infinite loop guard and undeclared variable', () => {
    assert.throws(() => runSync(prog(B('while', {cond: 'true', body: []})), [], {maxSteps: 1000}), /Step limit/);
    assert.throws(() => runSync(prog(B('output', {expr: 'zz'}))), /not declared/);
});

test('variable names are case insensitive and declare accepts a name list', () => {
    const p = prog(
        B('declare', {name: 'a, B, c', varType: 'Real'}),
        B('assign', {target: 'A', expr: '2'}), B('assign', {target: 'b', expr: '3'}),
        B('assign', {target: 'C', expr: 'a * B'}),
        B('output', {expr: 'c'}),
    );
    assert.equal(runSync(p), '6\n');
});

test('steps carry a snapshot of the variables and done carries the final ones', () => {
    const p = prog(B('declare', {name: 'n, s'}), B('assign', {target: 'n', expr: '5'}), B('assign', {target: 's', expr: 'n * 2'}));
    const events = [...execute(p)];
    const step = events.find((ev) => ev.event === 'step');
    assert.ok(Array.isArray(step.vars));
    const done = events.find((ev) => ev.event === 'done');
    assert.deepEqual(done.vars.map((x) => [x.name, x.value]), [['n', 5], ['s', 10]]);
});

test('watch snapshots copy arrays', () => {
    const p = prog(B('declare', {name: 'a', size: '2'}), B('assign', {target: 'a[0]', expr: '7'}), B('assign', {target: 'a[1]', expr: '9'}));
    const steps = [...execute(p)].filter((ev) => ev.event === 'step');
    const afterDeclare = steps[1].vars.find((x) => x.name === 'a').value;
    assert.deepEqual(afterDeclare, [0, 0]);
    assert.deepEqual([...execute(p)].find((ev) => ev.event === 'done').vars[0].value, [7, 9]);
});

test('Flowgorithm string functions Char, ToChar, ToCode', () => {
    const p = prog(
        B('declare', {name: 's', varType: 'String'}), B('declare', {name: 'r', varType: 'String'}),
        B('input', {target: 's'}),
        B('for', {variable: 'i', start: 'len(s) - 1', end: '0', step: '-1', body: [
            B('assign', {target: 'r', expr: 'r & Char(s, i)'}),
        ]}),
        B('output', {expr: 'r & " " & ToCode(s) & " " & ToChar(ToCode(s) + 1) & char(65)'}),
    );
    assert.equal(runSync(p, ['abc']), 'cba 97 bA\n');
    assert.throws(() => runSync(prog(B('output', {expr: 'Char("ab", 2)'}))), /Char: index 2/);
    assert.throws(() => runSync(prog(B('output', {expr: 'ToCode("")'}))), /ToCode/);
});
