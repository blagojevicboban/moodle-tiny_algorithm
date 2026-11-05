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
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {runSync} from '../amd/src/interpreter.js';
import {generate, languages} from '../amd/src/codegen.js';

const sample = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 'n'}), B('declare', {name: 's'}),
        B('assign', {target: 'n', expr: '5'}), B('assign', {target: 's', expr: '0'}),
        B('for', {variable: 'i', start: '1', end: 'n', step: '1', body: [
            B('if', {cond: 'i mod 2 = 0', then: [B('assign', {target: 's', expr: 's + i'})], else: []}),
        ]}),
        B('output', {expr: '"Sum = " & s'}),
    ];
    return p;
};

test('generators produce code for all languages', () => {
    for (const lang of ['python', 'c', 'cpp', 'java', 'csharp', 'javascript', 'pascal']) {
        const code = generate(lang, sample());
        assert.ok(code.length > 50, lang);
    }
    assert.match(generate('c', sample()), /printf\("%s%d\\n", "Sum = ", s\);/);
    assert.match(generate('java', sample()), /System\.out\.println\("Sum = " \+ s\);/);
});

// Reverse a string and print character codes (Flowgorithm Char, ToChar, ToCode).
const strings = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 's, r', varType: 'String'}),
        B('assign', {target: 's', expr: '"Ana voli Milovana"'}),
        B('for', {variable: 'i', start: 'len(s) - 1', end: '0', step: '-1', body: [
            B('assign', {target: 'r', expr: 'r & Char(s, i)'}),
        ]}),
        B('output', {expr: 'r & " " & ToCode(s) & " " & ToChar(ToCode(Char(s, 1)) - 32) & Char(s, len(s) - 1)'}),
    ];
    return p;
};

test('string functions in every language', () => {
    assert.match(generate('python', strings()), /r = r \+ s\[i\]/);
    assert.match(generate('python', strings()), /ord\(s\)/);
    assert.match(generate('c', strings()), /static char \*char_str\(int c\)/);
    assert.match(generate('c', strings()), /char_str\(s\[i\]\)/);
    assert.doesNotMatch(generate('c', sample()), /char_str/);
    assert.match(generate('java', strings()), /String\.valueOf\(s\.charAt\(i\)\)/);
    assert.match(generate('java', strings()), /\(int\) s\.charAt\(0\)/);
    assert.match(generate('csharp', strings()), /s\[i\]\.ToString\(\)/);
    assert.match(generate('csharp', strings()), /\(\(char\) \(/);
});

test('C copies strings instead of assigning arrays', () => {
    const code = generate('c', strings());
    assert.match(code, /strcpy\(s, "Ana voli Milovana"\);/);
    assert.match(code, /snprintf\(tmp, sizeof tmp, "%s%s", r, char_str\(s\[i\]\)\);\n\s+strcpy\(r, tmp\);/);
    assert.doesNotMatch(code, /\bs = "/);
});

test('python output matches interpreter', (t) => {
    let py;
    try {
        execFileSync('python', ['--version'], {timeout: 5000});
        py = 'python';
    } catch {
        t.skip('python not available');
        return;
    }
    const dir = mkdtempSync(join(tmpdir(), 'alg-'));
    const file = join(dir, 'a.py');
    writeFileSync(file, generate('python', sample()));
    const out = execFileSync(py, ['-I', file], {timeout: 10000}).toString().replace(/\r\n/g, '\n');
    assert.equal(out, runSync(sample()));
});

test('C# generator output has the expected shape', () => {
    const code = generate('csharp', sample());
    assert.match(code, /^using System;/);
    assert.match(code, /static void Main\(\) \{/);
    assert.match(code, /Console\.WriteLine\("Sum = " \+ s\);/);
});

// Matrices as parameters: filled and read by functions, passed on from one function to another, Real and String too.
const matrixParam = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 'n', varType: 'Integer'}),
        B('input', {target: 'n'}),
        B('declare', {name: 'a', varType: 'Integer', size: 'n', size2: 'n + 1'}),
        B('declare', {name: 'r', varType: 'Real', size: '2', size2: '2'}),
        B('declare', {name: 't', varType: 'String', size: '2', size2: '2'}),
        B('call', {expr: 'Fill(a, n, n + 1)'}),
        B('output', {expr: 'Total(a, n, n + 1)'}),
        B('output', {expr: 'Outer(a, n, n + 1)'}),
        B('call', {expr: 'Mark(r, t)'}),
        B('output', {expr: 'r[0, 1] & " " & t[1, 0] & t[0, 1]'}),
    ];
    const fn = (name, params, returnType, body) => ({name, params, returnType, body});
    const m = (name, type = 'Integer') => ({name, type, array: true, matrix: true});
    const v = (name) => ({name, type: 'Integer', array: false});
    p.functions.push(fn('Fill', [m('m'), v('rows'), v('cols')], null, [
        B('declare', {name: 'i, j', varType: 'Integer'}),
        B('for', {variable: 'i', start: '0', end: 'rows - 1', step: '1', body: [
            B('for', {variable: 'j', start: '0', end: 'cols - 1', step: '1', body: [
                B('assign', {target: 'm[i, j]', expr: 'i * 10 + j'})]})]}),
    ]));
    p.functions.push(fn('Total', [m('m'), v('rows'), v('cols')], 'Integer', [
        B('declare', {name: 'i, j, s', varType: 'Integer'}),
        B('assign', {target: 's', expr: '0'}),
        B('for', {variable: 'i', start: '0', end: 'rows - 1', step: '1', body: [
            B('for', {variable: 'j', start: '0', end: 'cols - 1', step: '1', body: [
                B('assign', {target: 's', expr: 's + m[i][j]'})]})]}),
        B('return', {expr: 's'}),
    ]));
    p.functions.push(fn('Outer', [m('m'), v('rows'), v('cols')], 'Integer', [B('return', {expr: 'Total(m, rows, cols) * 2'})]));
    p.functions.push(fn('Mark', [m('x', 'Real'), m('y', 'String')], null, [
        B('assign', {target: 'x[0, 1]', expr: '2.5'}),
        B('assign', {target: 'y[1, 0]', expr: '"a"'}),
        B('assign', {target: 'y[0, 1]', expr: '"b"'}),
    ]));
    return p;
};

test('C# output compiles and matches interpreter', {timeout: 240000}, (t) => {
    let major;
    try {
        major = /^(\d+)\./.exec(execFileSync('dotnet', ['--version'], {timeout: 30000}).toString().trim())[1];
    } catch {
        t.skip('dotnet not available');
        return;
    }
    const dir = mkdtempSync(join(tmpdir(), 'alg-cs-'));
    writeFileSync(join(dir, 'app.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType>' +
        `<TargetFramework>net${major}.0</TargetFramework></PropertyGroup></Project>`);
    writeFileSync(join(dir, 'Program.cs'), generate('csharp', sample()));
    const out = execFileSync('dotnet', ['run', '--project', dir], {timeout: 200000}).toString().replace(/\r\n/g, '\n');
    assert.equal(out, runSync(sample()));
    for (const [program, input] of [[matrix(), matrixInput], [matrixParam(), '3\n']]) {
        writeFileSync(join(dir, 'Program.cs'), generate('csharp', program));
        const mout = execFileSync('dotnet', ['run', '--project', dir], {timeout: 200000, input}).toString()
            .replace(/\r\n/g, '\n');
        assert.equal(mout, runSync(program, input.split('\n').filter(Boolean)));
    }
});

test('python and C matrices match the interpreter', {timeout: 240000}, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'alg-mx-'));
    // gcc, else the C compiler of the ziglang Python package; a program that does not compile fails the test.
    const compilers = [['gcc'], ['python', '-m', 'ziglang', 'cc']];
    let cc = null;
    for (const [k, [program, input]] of [[matrix(), matrixInput], [matrixParam(), '3\n']].entries()) {
        // A new executable each time: Windows may still hold the previous one.
        const exe = join(dir, process.platform === 'win32' ? `c${k}.exe` : `c${k}`);
        const expected = runSync(program, input.split('\n').filter(Boolean));
        try {
            writeFileSync(join(dir, 'a.py'), generate('python', program));
            assert.equal(execFileSync('python', ['-I', join(dir, 'a.py')], {timeout: 10000, input}).toString()
                .replace(/\r\n/g, '\n'), expected);
        } catch (e) {
            if (e.code === 'ENOENT') {
                t.skip('python not available');
                return;
            }
            throw e;
        }
        writeFileSync(join(dir, 'c.c'), generate('c', program));
        for (const [cmd, ...pre] of cc ? [cc] : compilers) {
            try {
                execFileSync(cmd, [...pre, join(dir, 'c.c'), '-o', exe, '-lm'], {timeout: 120000, stdio: 'pipe'});
                cc = [cmd, ...pre];
                break;
            } catch (e) {
                const text = `${e.stdout || ''}${e.stderr || ''}`;
                if (e.code !== 'ENOENT' && !/No module named/.test(text)) {
                    throw new Error(`${cmd} failed:\n${text}`);
                }
            }
        }
        if (!cc) {
            t.skip('no C compiler (gcc or python -m ziglang cc)');
            return;
        }
        assert.equal(execFileSync(exe, [], {timeout: 10000, input}).toString().replace(/\r\n/g, '\n'), expected);
    }
});

// Names written with other capital letters than in the declaration (the interpreter does not mind).
const mixedCase = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 'Suma', varType: 'Real'}),
        B('declare', {name: 'I', varType: 'Integer'}),
        B('assign', {target: 'suma', expr: '0.5'}),
        B('for', {variable: 'i', start: '1', end: '3', step: '1', body: [B('assign', {target: 'SUMA', expr: 'suma + Dvaput(i)'})]}),
        B('output', {expr: 'suma'}),
    ];
    p.functions.push({name: 'Dvaput', params: [{name: 'X', type: 'Integer', array: false}], returnType: 'Integer',
        body: [B('return', {expr: 'x * 2'})]});
    return p;
};

test('every name is written as declared, in every language', () => {
    for (const lang of ['python', 'c', 'cpp', 'java', 'csharp', 'javascript', 'pascal']) {
        const code = generate(lang, mixedCase());
        assert.doesNotMatch(code, /\bsuma\b|\bSUMA\b/, `${lang}: Suma`);
        assert.doesNotMatch(code, /\bdvaput\(/, `${lang}: Dvaput`);
        assert.doesNotMatch(code, /\bx \* 2/, `${lang}: X`);
        assert.doesNotMatch(code, /\bi\b/, `${lang}: I`);
    }
    // The type of Suma is known also where it is written suma.
    assert.match(generate('c', mixedCase()), /printf\("%g\\n", Suma\)/);
});

test('Java output matches the interpreter', {timeout: 240000}, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'alg-java-'));
    for (const [program, input] of [[sample(), ''], [strings(), ''], [rich(), richInput], [matrix(), matrixInput], [mixedCase(), ''],
        [matrixParam(), '3\n']]) {
        writeFileSync(join(dir, 'Main.java'), generate('java', program));
        try {
            execFileSync('javac', ['-d', dir, join(dir, 'Main.java')], {timeout: 120000, stdio: 'ignore'});
        } catch (e) {
            if (e.code === 'ENOENT') {
                t.skip('javac not available');
                return;
            }
            throw e;
        }
        const out = execFileSync('java', ['-cp', dir, 'Main'], {timeout: 30000, input}).toString().replace(/\r\n/g, '\n');
        assert.equal(out, runSync(program, input.split('\n').filter(Boolean)));
    }
});

// Functions, an array parameter, input, do-while, a negative step, Real, power and logic.
const rich = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 'n, i, k', varType: 'Integer'}),
        B('declare', {name: 'a', varType: 'Integer', size: '5'}),
        B('declare', {name: 'avg', varType: 'Real'}),
        B('declare', {name: 'ok', varType: 'Boolean'}),
        B('declare', {name: 'name', varType: 'String'}),
        B('output', {expr: '"Name?"'}),
        B('input', {target: 'name'}),
        B('input', {target: 'n'}),
        B('for', {variable: 'i', start: '0', end: '4', step: '1', body: [B('assign', {target: 'a[i]', expr: '(i + 1) * n - 2'})]}),
        B('assign', {target: 'avg', expr: 'Total(a, 5) / 5'}),
        B('assign', {target: 'ok', expr: 'avg > 3 and not (n = 2 or n < 0)'}),
        B('output', {expr: '"Hi " & name & ", avg = " & avg & ", ok = " & ok'}),
        B('output', {expr: '2 ^ 10 - n mod 3'}),
        B('assign', {target: 'k', expr: '10'}),
        B('dowhile', {cond: 'k > 7', body: [B('output', {expr: 'k', newline: false}), B('output', {expr: '" "', newline: false}),
            B('assign', {target: 'k', expr: 'k - 1'})]}),
        B('output', {expr: '""'}),
        B('for', {variable: 'i', start: '10', end: '1', step: '-3', body: [B('output', {expr: 'i'})]}),
        B('while', {cond: 'k > 0', body: [B('assign', {target: 'k', expr: 'k - 4'})]}),
        B('if', {cond: 'k = -1', then: [B('output', {expr: '"minus one"'})], else: [B('output', {expr: '"other " & k'})]}),
        B('output', {expr: 'len(name) & " " & ToCode(name) & " " & Char(name, 0)'}),
    ];
    p.functions.push({name: 'Total', params: [{name: 'x', type: 'Integer', array: true}, {name: 'm', type: 'Integer', array: false}],
        returnType: 'Integer', body: [
            B('declare', {name: 's', varType: 'Integer'}),
            B('assign', {target: 's', expr: '0'}),
            B('for', {variable: 'j', start: '0', end: 'm - 1', step: '1', body: [B('assign', {target: 's', expr: 's + x[j]'})]}),
            B('return', {expr: 's'}),
        ]});
    return p;
};
const richInput = 'Ana\n3\n';

// Matrices: both index forms, nested loops, Real and String matrices, input into an element.
const matrix = () => {
    const p = createProgram();
    p.functions[0].body = [
        B('declare', {name: 'i, j, n', varType: 'Integer'}),
        B('input', {target: 'n'}),
        B('declare', {name: 'a', varType: 'Integer', size: 'n', size2: 'n + 1'}),
        B('declare', {name: 'r', varType: 'Real', size: '2', size2: '2'}),
        B('declare', {name: 'w', varType: 'String', size: '2', size2: '3'}),
        B('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
            B('for', {variable: 'j', start: '0', end: 'n', step: '1', body: [B('assign', {target: 'a[i, j]', expr: 'i * 10 + j'})]}),
        ]}),
        B('assign', {target: 'a[1][2]', expr: 'a[1, 2] + 100'}),
        B('input', {target: 'a[0, 0]'}),
        B('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [
            B('for', {variable: 'j', start: '0', end: 'n', step: '1', body: [
                B('output', {expr: 'a[i][j]', newline: false}), B('output', {expr: '" "', newline: false})]}),
            B('output', {expr: '""'}),
        ]}),
        B('assign', {target: 'r[0, 1]', expr: '1.5'}),
        B('output', {expr: 'r[0, 1] + r[1, 1] * 2'}),
        B('assign', {target: 'w[1, 2]', expr: '"x"'}),
        B('output', {expr: 'w[1, 2] & "!" & w[0, 0] & "?"'}),
    ];
    return p;
};
const matrixInput = '3\n7\n';

test('generated code keeps the parentheses the expression needs', () => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'a, b'}), B('assign', {target: 'a', expr: '(a + b) * 2 - (a - b)'}),
        B('if', {cond: 'a > 1 and not (b = 2 or a < 0)', then: [], else: []})];
    assert.match(generate('python', p), /a = \(a \+ b\) \* 2 - \(a - b\)/);
    assert.match(generate('python', p), /if a > 1 and not \(b == 2 or a < 0\):/);
    assert.match(generate('c', p), /if \(a > 1 && !\(b == 2 \|\| a < 0\)\)/);
    assert.match(generate('pascal', p), /if \(a > 1\) and not \(\(b = 2\) or \(a < 0\)\) then/);
});

test('C++, JavaScript and Pascal generators have the expected shape', () => {
    const cpp = generate('cpp', rich());
    assert.match(cpp, /using namespace std;/);
    assert.match(cpp, /vector<int> a\(5\);/);
    assert.match(cpp, /int Total\(vector<int>& x, int m\);/);
    assert.match(cpp, /getline\(cin >> ws, name\);/);
    assert.match(cpp, /cout << "Hi " << name << /);
    assert.doesNotMatch(cpp, /str\(T value\)/);
    assert.match(generate('cpp', strings()), /r = r \+ string\(1, s\[i\]\);/);
    const js = generate('javascript', rich());
    assert.match(js, /readFileSync\(0, 'utf8'\)/);
    assert.match(js, /let a = new Array\(5\)\.fill\(0\);/);
    assert.match(js, /ok = avg > 3 && !\(n === 2 \|\| n < 0\);/);
    assert.match(js, /\nmain\(\);\n$/);
    const pas = generate('pascal', rich());
    assert.match(pas, /^program Main;/);
    assert.match(pas, /function Total\(var x: array of Integer; m: Integer\): Integer;/);
    assert.match(pas, /SetLength\(a, 5\);/);
    assert.match(pas, /repeat[\s\S]+until not \(k > 7\);/);
    assert.match(pas, /i := i - 3;/);
    assert.match(pas, /Ord\(name\[1\]\)/);
    assert.match(generate('pascal', strings()), /r := r \+ Copy\(s, i \+ 1, 1\);/);
});

/**
 * Compile (when needed) and run generated code and return its output, or null when no compiler is available.
 *
 * @param {string} lang language
 * @param {Object} program algorithm
 * @param {string} input standard input
 * @returns {string|null}
 */
const runGenerated = (lang, program, input) => {
    const dir = mkdtempSync(join(tmpdir(), `alg-${lang}-`));
    const opts = {timeout: 120000, input, stdio: ['pipe', 'pipe', 'ignore']};
    // False only when the compiler is not installed; a program that does not compile fails the test.
    const tryRun = (cmd, args) => {
        try {
            execFileSync(cmd, args, {timeout: 120000, stdio: 'pipe'});
            return true;
        } catch (e) {
            const text = `${e.stdout || ''}${e.stderr || ''}`;
            if (e.code === 'ENOENT' || /No module named/.test(text)) {
                return false;
            }
            throw new Error(`${cmd} ${args.join(' ')} failed:
${text}`);
        }
    };
    const exe = join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
    if (lang === 'javascript') {
        writeFileSync(join(dir, 'main.js'), generate(lang, program));
        return execFileSync(process.execPath, [join(dir, 'main.js')], opts).toString();
    }
    if (lang === 'cpp') {
        const src = join(dir, 'main.cpp');
        writeFileSync(src, generate(lang, program));
        if (!tryRun('g++', ['-std=c++17', src, '-o', exe]) &&
                !tryRun('python', ['-m', 'ziglang', 'c++', '-std=c++17', src, '-o', exe])) {
            return null;
        }
        return execFileSync(exe, [], opts).toString();
    }
    const src = join(dir, 'main.pas');
    writeFileSync(src, generate(lang, program));
    if (!tryRun('fpc', ['-v0', `-o${exe}`, src])) {
        return null;
    }
    return execFileSync(exe, [], opts).toString();
};

for (const lang of ['javascript', 'cpp', 'pascal']) {
    test(`${lang} output matches the interpreter`, {timeout: 240000}, (t) => {
        for (const [program, input] of [[sample(), ''], [strings(), ''], [rich(), richInput], [matrix(), matrixInput],
            [mixedCase(), ''], [matrixParam(), '3\n']]) {
            const out = runGenerated(lang, program, input);
            if (out === null) {
                t.skip(`no ${lang} compiler`);
                return;
            }
            assert.equal(out.replace(/\r\n/g, '\n'), runSync(program, input.split('\n').filter(Boolean)));
        }
    });
}

test('every line of the code knows the block it comes from', async() => {
    const {generateLines} = await import('../amd/src/codegen.js');
    const p = createProgram();
    const out = B('output', {expr: 'i'});
    const loop = B('for', {variable: 'i', start: '1', end: '3', step: '1', body: [out]});
    const cond = B('if', {cond: 'i > 0', then: [B('output', {expr: '"pos"'})], else: []});
    p.functions[0].body = [B('declare', {name: 'i'}), loop, cond];
    for (const lang of languages) {
        const {text, owners} = generateLines(lang, p);
        const lines = text.replace(/\n$/, '').split('\n');
        assert.equal(owners.length, lines.length, lang);
        assert.equal(text, generate(lang, p), lang);
        const of = (id) => lines.filter((l, i) => owners[i] === id).join('\n');
        assert.match(of(loop.id), /for|while/i, lang);
        assert.match(of(out.id), /\bi\b/, lang);
        assert.doesNotMatch(of(out.id), /\bfor\b/i, lang);
        assert.match(of(cond.id), /if/i, lang);
        assert.doesNotMatch(of(cond.id), /pos/, lang);
    }
});

// 2.4: names that are words of the languages, Break and Continue in every loop, Pi, Flowgorithm functions, the
// length of an array, a function of the algorithm named like a built-in one, and text input with spaces.
const extras = () => {
    const p = createProgram();
    const names = ['class', 'int', 'def', 'var', 'begin', 'end', 'in', 'input', 'tmp', 'Result', 'print', 'lines', 'rnd'];
    const nonl = (expr) => B('output', {expr, newline: false});
    p.functions[0].body = [
        B('declare', {name: names.join(', ')}),
        B('declare', {name: 's', varType: 'String'}),
        B('declare', {name: 'a', varType: 'Integer', size: '4'}),
        B('declare', {name: 'i'}),
        B('input', {target: 'int'}),
        B('input', {target: 's'}),
        ...names.filter((n) => n !== 'int').map((n, k) => B('assign', {target: n, expr: String(k + 2)})),
        B('output', {expr: names.join(' + ')}),
        B('output', {expr: 's & "!"'}),
        B('for', {variable: 'i', start: '1', end: '10', step: '1', body: [
            B('if', {cond: 'i mod 3 = 0', then: [B('continue')], 'else': []}),
            B('if', {cond: 'i > 7', then: [B('break')], 'else': []}),
            nonl('i & " "')]}),
        B('output', {expr: '""'}),
        B('assign', {target: 'tmp', expr: '0'}),
        B('while', {cond: 'tmp < 10', body: [B('assign', {target: 'tmp', expr: 'tmp + 1'}),
            B('if', {cond: 'tmp = 2', then: [B('continue')], 'else': []}),
            B('if', {cond: 'tmp = 5', then: [B('break')], 'else': []}), nonl('tmp')]}),
        B('output', {expr: '""'}),
        B('assign', {target: 'tmp', expr: '0'}),
        B('dowhile', {cond: 'tmp < 6', body: [B('assign', {target: 'tmp', expr: 'tmp + 1'}),
            B('if', {cond: 'tmp mod 2 = 0', then: [B('continue')], 'else': []}), nonl('tmp')]}),
        B('output', {expr: '""'}),
        B('for', {variable: 'i', start: '10', end: '1', step: '-3', body: [
            B('if', {cond: 'i = 7', then: [B('continue')], 'else': []}), nonl('i')]}),
        B('output', {expr: '""'}),
        B('output', {expr: 'Len(a) & " " & Size("abc") & " " & Sgn(-5) & " " & (ToInteger("12") + 1) & " " & ToInteger(3.9)'}),
        B('output', {expr: 'ToFixed(pi, 4) & " " & ToFixed(Arctan(1) * 4, 3) & " " & ToFixed(Log10(1000), 1) & " " & ' +
            'ToFixed(1.23456, 3)'}),
        B('output', {expr: 'Sqrt(4)'}),
    ];
    p.functions.push({name: 'Sqrt', params: [{name: 'x', type: 'Integer', array: false}], returnType: 'Integer',
        body: [B('return', {expr: 'x * 10'})]});
    return p;
};
const extrasInput = '7\nAna Marija\n';

/**
 * Compile (when needed) and run generated code in any language; null when its compiler or runtime is not installed.
 *
 * @param {string} lang language
 * @param {Object} program algorithm
 * @param {string} input standard input
 * @returns {string|null}
 */
const runAny = (lang, program, input) => {
    const dir = mkdtempSync(join(tmpdir(), `alg-${lang}-`));
    const opts = {timeout: 120000, input, stdio: ['pipe', 'pipe', 'pipe']};
    const exe = join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
    const code = generate(lang, program);
    // False only when the tool is not installed; a program that does not compile fails the test.
    const tryRun = (cmd, args, more = {}) => {
        try {
            execFileSync(cmd, args, {timeout: 240000, stdio: 'pipe', ...more});
            return true;
        } catch (e) {
            const text = `${e.stdout || ''}${e.stderr || ''}`;
            if (e.code === 'ENOENT' || /No module named/.test(text)) {
                return false;
            }
            throw new Error(`${cmd} ${args.join(' ')} failed:\n${text}\n${code}`);
        }
    };
    const run = (cmd, args = [], more = {}) => execFileSync(cmd, args, {...opts, ...more}).toString();
    switch (lang) {
        case 'python':
            writeFileSync(join(dir, 'main.py'), code);
            return tryRun('python', ['--version']) ? run('python', ['-I', join(dir, 'main.py')]) : null;
        case 'javascript':
            writeFileSync(join(dir, 'main.js'), code);
            return run(process.execPath, [join(dir, 'main.js')]);
        case 'c':
            writeFileSync(join(dir, 'main.c'), code);
            if (!tryRun('gcc', [join(dir, 'main.c'), '-o', exe, '-lm']) &&
                    !tryRun('python', ['-m', 'ziglang', 'cc', join(dir, 'main.c'), '-o', exe, '-lm'])) {
                return null;
            }
            return run(exe);
        case 'cpp':
            writeFileSync(join(dir, 'main.cpp'), code);
            if (!tryRun('g++', ['-std=c++17', join(dir, 'main.cpp'), '-o', exe]) &&
                    !tryRun('python', ['-m', 'ziglang', 'c++', '-std=c++17', join(dir, 'main.cpp'), '-o', exe])) {
                return null;
            }
            return run(exe);
        case 'java':
            writeFileSync(join(dir, 'Main.java'), code);
            return tryRun('javac', ['-d', dir, join(dir, 'Main.java')]) ? run('java', ['-cp', dir, 'Main']) : null;
        case 'csharp':
        case 'vb': {
            let major;
            try {
                major = /^(\d+)\./.exec(execFileSync('dotnet', ['--version'], {timeout: 30000}).toString().trim())[1];
            } catch {
                return null;
            }
            const vb = lang === 'vb';
            writeFileSync(join(dir, vb ? 'app.vbproj' : 'app.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>' +
                `<OutputType>Exe</OutputType><TargetFramework>net${major}.0</TargetFramework>` +
                (vb ? '<RootNamespace>App</RootNamespace><OptionStrict>Off</OptionStrict>' : '') +
                '</PropertyGroup></Project>');
            writeFileSync(join(dir, vb ? 'Program.vb' : 'Program.cs'), code);
            tryRun('dotnet', ['build', dir, '-o', join(dir, 'out'), '-nologo', '-v', 'q']);
            return run('dotnet', [join(dir, 'out', 'app.dll')]);
        }
        case 'pascal':
            writeFileSync(join(dir, 'main.pas'), code);
            return tryRun('fpc', ['-v0', `-o${exe}`, join(dir, 'main.pas')]) ? run(exe) : null;
        case 'go':
            writeFileSync(join(dir, 'main.go'), code);
            return tryRun('go', ['build', '-o', exe, join(dir, 'main.go')], {cwd: dir}) ? run(exe) : null;
        case 'rust':
            writeFileSync(join(dir, 'main.rs'), code);
            return tryRun('rustc', ['-O', '-o', exe, join(dir, 'main.rs')]) ? run(exe) : null;
        case 'kotlin': {
            const jar = join(dir, 'main.jar');
            writeFileSync(join(dir, 'main.kt'), code);
            const kotlinc = process.platform === 'win32' ? 'kotlinc.bat' : 'kotlinc';
            return tryRun(kotlinc, [join(dir, 'main.kt'), '-include-runtime', '-d', jar], {shell: process.platform === 'win32'}) ?
                run('java', ['-jar', jar]) : null;
        }
        default:
            return null;
    }
};

for (const lang of languages.filter((l) => l !== 'pseudo')) {
    test(`${lang}: reserved names, Break, Continue, Pi and the Flowgorithm functions match the interpreter`,
        {timeout: 600000}, (t) => {
            const out = runAny(lang, extras(), extrasInput);
            if (out === null) {
                t.skip(`no ${lang} compiler`);
                return;
            }
            assert.equal(out.replace(/\r\n/g, '\n'), runSync(extras(), extrasInput.split('\n').filter(Boolean)));
        });
}

for (const lang of ['vb', 'go', 'rust', 'kotlin']) {
    test(`${lang} output matches the interpreter`, {timeout: 900000}, (t) => {
        for (const [program, input] of [[sample(), ''], [strings(), ''], [rich(), richInput], [matrix(), matrixInput],
            [mixedCase(), ''], [matrixParam(), '3\n']]) {
            const out = runAny(lang, program, input);
            if (out === null) {
                t.skip(`no ${lang} compiler`);
                return;
            }
            assert.equal(out.replace(/\r\n/g, '\n'), runSync(program, input.split('\n').filter(Boolean)));
        }
    });
}
