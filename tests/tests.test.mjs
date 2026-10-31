import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {
    normalize, parseInputs, runProgram, checkedOutput, runTests, computeExpected, firstDiffLine, serializeTests, deserializeTests,
} from '../amd/src/tests.js';

const prog = (...body) => {
    const p = createProgram();
    p.functions[0].body = body;
    return p;
};

const sum = (upper = 'i <= n') => prog(
    B('declare', {name: 'n'}), B('declare', {name: 's'}), B('declare', {name: 'i'}),
    B('input', {target: 'n'}),
    B('assign', {target: 's', expr: '0'}), B('assign', {target: 'i', expr: '1'}),
    B('while', {cond: upper, body: [
        B('assign', {target: 's', expr: 's + i'}),
        B('assign', {target: 'i', expr: 'i + 1'}),
    ]}),
    B('output', {expr: '"Sum = " & s'}),
);

test('normalize ignores line ends, trailing spaces and trailing empty lines', () => {
    assert.equal(normalize('a  \r\nb\t\r\n\r\n'), 'a\nb');
    assert.equal(normalize(null), '');
});

test('parseInputs takes one value per line', () => {
    assert.deepEqual(parseInputs('10\r\n5\n\n'), ['10', '5']);
    assert.deepEqual(parseInputs(''), []);
});

test('a line "" is an empty value', () => {
    assert.deepEqual(parseInputs('""'), ['']);
    assert.deepEqual(parseInputs('a\n""\nb'), ['a', '', 'b']);
    const len = prog(B('declare', {name: 's', varType: 'String'}), B('input', {target: 's'}), B('output', {expr: 'Len(s)'}));
    assert.deepEqual(runProgram(len, '""'), {output: '0\n', after: '0\n', error: null});
});

test('runProgram returns the output, or the error with the output written so far', () => {
    assert.deepEqual(runProgram(sum(), '10'), {output: 'Sum = 55\n', after: 'Sum = 55\n', error: null});
    const p = prog(B('output', {expr: '"start"'}), B('declare', {name: 'x'}), B('input', {target: 'x'}));
    const r = runProgram(p, '', 'en');
    assert.equal(r.output, 'start\n');
    assert.match(r.error, /more input/);
});

test('an endless loop fails instead of hanging', () => {
    const r = runProgram(prog(B('while', {cond: 'true', body: []})), '');
    assert.match(r.error, /Step limit/);
});

test('computeExpected fills the outputs from the solution', () => {
    const {tests, errors} = computeExpected(sum(), [{inputs: '10'}, {inputs: '3'}, {inputs: ''}], 'en');
    assert.deepEqual(tests.map((tc) => tc.expected), ['Sum = 55\n', 'Sum = 6\n', '']);
    assert.deepEqual(errors.map((e) => e.index), [2]);
});

test('runTests marks passing and failing tests and finds the first different line', () => {
    const {tests} = computeExpected(sum(), [{inputs: '10'}, {inputs: '0'}]);
    const wrong = sum('i < n');
    assert.deepEqual(runTests(sum(), tests).map((r) => r.pass), [true, true]);
    const r = runTests(wrong, tests);
    assert.deepEqual(r.map((x) => x.pass), [false, true]);
    assert.equal(r[0].actual, 'Sum = 45\n');
    assert.equal(r[0].diffLine, 0);
});

test('firstDiffLine', () => {
    assert.equal(firstDiffLine('a\nb\nc', 'a\nb\r\nc\n'), -1);
    assert.equal(firstDiffLine('a\nb', 'a\nx'), 1);
    assert.equal(firstDiffLine('a\nb', 'a'), 1);
});

test('tests survive the attribute round trip, broken data gives no tests', () => {
    const tests = [{inputs: 'č\n2', expected: 'Ђ\n', extra: 1}];
    assert.deepEqual(deserializeTests(serializeTests(tests)), [{inputs: 'č\n2', expected: 'Ђ\n'}]);
    assert.deepEqual(deserializeTests('not base64!'), []);
    assert.deepEqual(deserializeTests(''), []);
});

test('checkedOutput keeps the output after the last input, or only its numbers', () => {
    const p = prog(B('declare', {name: 'a, b'}), B('output', {expr: '"Unesi a"'}), B('input', {target: 'a'}),
        B('output', {expr: '"Unesi b"'}), B('input', {target: 'b'}),
        B('output', {expr: '"Zbir: " & a + b'}), B('output', {expr: '"Razlika je " & a - b & "."'}));
    const run = runProgram(p, '7\n10');
    assert.equal(run.after, 'Zbir: 17\nRazlika je -3.\n');
    assert.equal(checkedOutput(run), run.output);
    assert.equal(checkedOutput(run, {afterinput: true, numbers: true}), '17\n-3');
    assert.equal(checkedOutput(run, {numbers: true}), '17\n-3');
    const {tests} = computeExpected(p, [{inputs: '1\n2', hidden: true}], null, {afterinput: true, numbers: true});
    assert.deepEqual(tests, [{inputs: '1\n2', hidden: true, expected: '3\n-1'}]);
    assert.equal(runTests(p, tests, null, {afterinput: true, numbers: true})[0].pass, true);
});
