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
import {generate} from '../amd/src/codegen.js';

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
    assert.match(generate('pascal', strings()), /r := r \+ s\[i \+ 1\];/);
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
    const tryRun = (cmd, args) => {
        try {
            execFileSync(cmd, args, {timeout: 120000, stdio: 'ignore'});
            return true;
        } catch {
            return false;
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
        for (const [program, input] of [[sample(), ''], [strings(), ''], [rich(), richInput]]) {
            const out = runGenerated(lang, program, input);
            if (out === null) {
                t.skip(`no ${lang} compiler`);
                return;
            }
            assert.equal(out.replace(/\r\n/g, '\n'), runSync(program, input.split('\n').filter(Boolean)));
        }
    });
}
