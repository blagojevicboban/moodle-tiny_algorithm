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
 * Tests of code to diagram: Python written by hand and the Python this plugin generates become algorithms that print
 * the same as the code (and as the algorithm the code came from).
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../amd/src/codegen.js';
import {importPython} from '../amd/src/codeimport.js';
import {runSync} from '../amd/src/interpreter.js';
import {TEMPLATES} from '../amd/src/templates.js';

const INPUTS = {swap: ['3', '9'], rectangle: ['2', '3.5'], max2: ['4', '7'], evenodd: ['7'], sum_n: ['10'], factorial: ['6'],
    gcd: ['48', '18'], linear_search: ['23'], bubble_sort: [], selection_sort: [], binary_search: ['27']};

/** Block types of an algorithm, in order (nested ones too). */
const types = (program) => {
    const out = [];
    const visit = (list) => list.forEach((b) => {
        out.push(b.type);
        ['then', 'else', 'body'].forEach((k) => visit(b[k] || []));
    });
    program.functions.forEach((f) => visit(f.body));
    return out;
};

test('every template: diagram, Python, diagram again prints the same, without warnings', () => {
    for (const t of TEMPLATES) {
        const p = t.build();
        const r = importPython(generate('python', p));
        assert.deepEqual(r.warnings, [], t.id);
        assert.equal(runSync(r.program, [...INPUTS[t.id]], {seed: 5}), runSync(p, [...INPUTS[t.id]], {seed: 5}), t.id);
    }
});

test('Python written by hand: input with a prompt, elif, +=, f-strings, lists, while, a function', () => {
    const code = `
import random

def is_prime(k):
    if k < 2:
        return False
    d = 2
    while d * d <= k:
        if k % d == 0:
            return False
        d += 1
    return True

n = int(input("How many? "))
total = 0
primes = [0] * n
count = 0
for i in range(2, 2 * n + 10):
    if is_prime(i) and count < n:
        primes[count] = i
        count += 1
        total = total + i
    elif i % 10 == 0:
        print("ten", i // 10, end="")
        print()
    else:
        pass
print(f"Sum of {count} primes: {total}")
print("Average", total / count)
print(2 ** 10, 17 // 5, 17 % 5, round(3.7))
name = "Ana"
print(name[1], len(name), name + "!")
`;
    const r = importPython(code);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.program.functions[0].name, 'Main');
    assert.equal(r.program.functions[1].name, 'is_prime');
    assert.equal(r.program.functions[1].returnType, 'Boolean');
    assert.deepEqual(r.program.functions[1].params, [{name: 'k', type: 'Integer'}]);
    const out = runSync(r.program, ['5']);
    assert.equal(out, 'How many? ten 1\nSum of 5 primes: 28\nAverage 5.6\n1024 3 2 4\nn 3 Ana!\n');
    const kinds = types(r.program);
    assert.ok(kinds.includes('input') && kinds.includes('for') && kinds.includes('while') && kinds.includes('return'));
});

test('a list literal, a matrix, a Do … While and a loop that counts down', () => {
    const code = `
def main():
    v = [5, 3, 8]
    m = [[0] * 3 for _ in range(2)]
    for i in range(2):
        for j in range(3):
            m[i][j] = v[j] * (i + 1)
    k = 0
    while True:
        k += 2
        if k >= 6: break
    for i in range(10, 0, -3):
        print(i, end=" ")
    print(m[1][2], k)

if __name__ == "__main__":
    main()
`;
    const r = importPython(code);
    assert.deepEqual(r.warnings, []);
    const decl = r.program.functions[0].body.filter((b) => b.type === 'declare');
    assert.ok(decl.some((b) => b.name === 'm' && b.size === '2' && b.size2 === '3'));
    assert.ok(types(r.program).includes('dowhile'));
    assert.equal(runSync(r.program, []), '10 7 4 1 16 6\n');
});

test('lines with no block become comments and are reported; nothing is lost', () => {
    const code = `x = 5
for c in "abc":
    print(c)
y = max(x, 3)
print(x)
`;
    const r = importPython(code);
    assert.deepEqual(r.warnings.map((w) => w.line), [2, 4]);
    const body = r.program.functions[0].body;
    assert.ok(body.some((b) => b.type === 'comment' && b.text === 'Python: for c in "abc":'));
    // The body of an unknown loop is still there.
    assert.ok(body.some((b) => b.type === 'output' && b.expr === 'c'));
    assert.ok(body.some((b) => b.type === 'comment' && b.text === 'Python: y = max(x, 3)'));
});

test('a recursive function returns a whole number; names such as constructor are ordinary names', () => {
    const r = importPython(`def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

constructor = fact(5)
print(constructor)
`);
    assert.equal(r.program.functions[1].returnType, 'Integer');
    assert.equal(runSync(r.program, []), '120\n');
});

test('the Python of the plugin runs: a whole-number division and a Boolean input (2.13 fixes)', async(t) => {
    const {execFileSync} = await import('node:child_process');
    const {mkdtempSync, writeFileSync} = await import('node:fs');
    const {tmpdir} = await import('node:os');
    const {join} = await import('node:path');
    const {createProgram, createBlock: B} = await import('../amd/src/model.js');
    try {
        execFileSync('python', ['--version'], {timeout: 5000});
    } catch {
        t.skip('python not available');
        return;
    }
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'ok', varType: 'Boolean'}), B('input', {target: 'ok'}),
        B('if', {cond: 'ok', then: [B('output', {expr: '"yes"'})], 'else': [B('output', {expr: '"no"'})]})];
    const search = TEMPLATES.find((x) => x.id === 'binary_search').build();
    const dir = mkdtempSync(join(tmpdir(), 'alg-'));
    for (const [program, input] of [[search, '27'], [search, '28'], [p, 'TRUE'], [p, 'false']]) {
        const code = generate('python', program);
        writeFileSync(join(dir, 'a.py'), code);
        const out = execFileSync('python', ['-I', join(dir, 'a.py')], {timeout: 10000, input: `${input}\n`}).toString()
            .replace(/\r\n/g, '\n');
        assert.equal(out, runSync(program, [input]));
    }
});
