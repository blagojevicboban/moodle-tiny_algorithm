import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {runSync} from '../amd/src/interpreter.js';

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
