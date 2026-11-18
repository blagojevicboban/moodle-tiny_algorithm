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
 * Tests of strict initialization: the interpreter stops at a read without a value, the editor rule for the flag, the
 * warning found without running, and the generated code without start values.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {applyStrict, createBlock as B, createProgram} from '../amd/src/model.js';
import {runSync} from '../amd/src/interpreter.js';
import {unsetReads} from '../amd/src/initcheck.js';
import {generate} from '../amd/src/codegen.js';

const prog = (...body) => {
    const p = createProgram();
    p.functions[0].body = body;
    return p;
};
const dek = (name, varType = 'Integer', size = '') => B('declare', {name, varType, size});
const out = (expr) => B('output', {expr, newline: true});

test('a read without a value stops a strict algorithm; without strict it is 0', () => {
    const p = prog(dek('s'), B('for', {variable: 'i', start: '1', end: '3', step: '1',
        body: [B('assign', {target: 's', expr: 's + i'})]}), out('s'));
    assert.equal(runSync(p, []), '6\n');
    p.strictInit = true;
    assert.throws(() => runSync(p, []), (e) => e.code === 'noinit' && /'s'/.test(e.message));
    p.functions[0].body.splice(1, 0, B('assign', {target: 's', expr: '0'}));
    assert.equal(runSync(p, []), '6\n');
});

test('elements and fields have no value until they get one', () => {
    const p = Object.assign(prog(dek('a', 'Integer', '2'), B('input', {target: 'a[1]'}), out('a[1]'), out('a[0]')),
        {strictInit: true});
    assert.throws(() => runSync(p, ['7']), (e) => e.code === 'noinitelement' && /a\[0\]/.test(e.message));
    const r = Object.assign(prog(B('declare', {name: 'p', varType: 'P', size: ''}), out('p.x')),
        {strictInit: true, records: [{name: 'P', fields: [{name: 'x', type: 'Integer'}]}]});
    assert.throws(() => runSync(r, []), (e) => e.code === 'noinitfield' && /P\.x/.test(e.message));
});

test('the editor rule: a quiz question decides, otherwise the site default for algorithms that do not say', () => {
    assert.equal(applyStrict({}, {strict: true}).strictInit, true);
    assert.equal(applyStrict({}, {strict: false}).strictInit, undefined);
    assert.equal(applyStrict({strictInit: true}, {strict: false}).strictInit, true);
    assert.equal(applyStrict({strictInit: true}, {strict: false, strictForce: true}).strictInit, undefined);
    assert.equal(applyStrict({}, {strict: true, strictForce: true}).strictInit, true);
});

test('the warning finds reads before a value, as a compiler would', () => {
    const fn = (...body) => ({name: 'Main', params: [{name: 'n', type: 'Integer'}], body});
    // n is a parameter; s gets a value only in one branch; t only in a loop that may not run.
    assert.deepEqual(unsetReads(fn(dek('s, t, u'), B('if', {cond: 'n > 0', then: [B('assign', {target: 's', expr: '1'})],
        'else': []}), B('while', {cond: 'n > 5', body: [B('assign', {target: 't', expr: 'n'})]}),
    B('assign', {target: 'u', expr: 's + t + n'}), out('u'))), ['s', 't']);
    // Both branches, a Do loop body, Input and a For variable give values.
    assert.deepEqual(unsetReads(fn(dek('a, b, c, d'), B('if', {cond: 'n > 0', then: [B('assign', {target: 'a', expr: '1'})],
        'else': [B('input', {target: 'a'})]}), B('dowhile', {cond: 'b < 3', body: [B('assign', {target: 'b', expr: 'n'})]}),
    B('input', {target: 'c'}), B('for', {variable: 'd', start: '1', end: 'a + b + c', step: '1', body: []}), out('d'))), []);
    // A branch that returns does not count; arrays are not checked.
    assert.deepEqual(unsetReads(fn(dek('x'), dek('arr', 'Integer', '3'), B('if', {cond: 'n > 0',
        then: [B('return', {expr: ''})], 'else': [B('assign', {target: 'x', expr: '2'})]}), out('x + arr[0]'))), []);
});

test('strict code declares variables without a start value in C, C++, Java and C#', () => {
    const p = prog(dek('n'), dek('t', 'String'), B('assign', {target: 'n', expr: '1'}), B('assign', {target: 't', expr: '"a"'}),
        out('n'));
    assert.match(generate('c', p), /int n = 0;/);
    p.strictInit = true;
    assert.match(generate('c', p), /int n;/);
    assert.match(generate('c', p), /char t\[256\];/);
    assert.match(generate('cpp', p), /int n;/);
    assert.match(generate('java', p), /int n;/);
    assert.match(generate('csharp', p), /int n;/);
});
