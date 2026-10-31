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
    for (const lang of ['python', 'c', 'java']) {
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
