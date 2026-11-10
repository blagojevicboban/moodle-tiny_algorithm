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
 * Tests of files: the interpreter, Flowgorithm files and the generated code.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {execute, runSync} from '../amd/src/interpreter.js';
import {importFprg, exportFprg} from '../amd/src/flowgorithm.js';
import {generate} from '../amd/src/codegen.js';
import {usesFiles} from '../amd/src/files.js';
import {STR} from '../amd/src/strings.js';

const doubler = () => {
    const p = createProgram();
    p.files = {'in.txt': '3\n4\n5\n'};
    p.functions[0].body = [B('declare', {name: 'x'}), B('declare', {name: 's'}),
        B('open', {file: '"in.txt"', mode: 'read'}), B('open', {file: '"out.txt"', mode: 'write'}),
        B('while', {cond: 'not EOF()', body: [B('read', {target: 'x'}), B('assign', {target: 's', expr: 's + x'}),
            B('write', {expr: 'x * 2'})]}),
        B('close', {mode: 'read'}), B('close', {mode: 'write'}), B('output', {expr: 's'})];
    return p;
};

test('an algorithm reads its files line by line until EOF and writes a new file', () => {
    assert.equal(runSync(doubler()), '12\n');
    const files = [...execute(doubler())].filter((e) => e.event === 'file');
    assert.deepEqual(files[0], {event: 'file', name: 'out.txt', text: ''});
    assert.deepEqual(files[files.length - 1], {event: 'file', name: 'out.txt', text: '6\n8\n10\n'});
    // Files given to the run replace those of the algorithm (the tests of a question use the files of the solution).
    assert.equal(runSync(doubler(), [], {files: {'in.txt': '1\n'}}), '1\n');
    assert.throws(() => runSync(doubler(), [], {files: {}}), (e) => e.code === 'filenotfound');
    assert.ok(usesFiles(doubler()));
    assert.ok(usesFiles(Object.assign(createProgram(), {files: {'a.txt': ''}})));
    assert.ok(!usesFiles(createProgram()));
});

test('Flowgorithm file shapes are read and written with their attributes', () => {
    const fprg = `<?xml version="1.0"?>
<flowgorithm fileversion="4.2">
    <attributes><attribute name="name" value="file"/></attributes>
    <function name="Main" type="None" variable="">
        <parameters/>
        <body>
            <open expression="f" mode="read"/>
            <read variable="f"/>
            <write expression="f"/>
            <close mode="read"/>
            <open expression="&quot;o.txt&quot;" mode="append"/>
            <close mode="write"/>
        </body>
    </function>
</flowgorithm>`;
    const {program, warnings} = importFprg(fprg);
    assert.deepEqual(warnings, []);
    assert.deepEqual(program.functions[0].body.map(({id, ...rest}) => rest), [{type: 'open', file: 'f', mode: 'read'},
        {type: 'read', target: 'f'}, {type: 'write', expr: 'f'}, {type: 'close', mode: 'read'},
        {type: 'open', file: '"o.txt"', mode: 'append'}, {type: 'close', mode: 'write'}]);
    const out = exportFprg(program);
    for (const tag of ['<open expression="f" mode="read"/>', '<read variable="f"/>', '<write expression="f"/>',
        '<close mode="read"/>', '<open expression="&quot;o.txt&quot;" mode="append"/>', '<close mode="write"/>']) {
        assert.ok(out.includes(tag), tag);
    }
});

test('Python reads and writes the files; the other languages get a comment; pseudo-code has the keywords', () => {
    const py = generate('python', doubler());
    for (const line of ['_files = {}', 'def _eof():', '_files["read"] = open("in.txt", "r", encoding="utf-8")',
        '_files["write"] = open("out.txt", "w", encoding="utf-8")', 'while not _eof():',
        'x = int(_files["read"].readline().rstrip("\\n"))', '_files["write"].write(str(x * 2) + "\\n")',
        '_files["read"].close()']) {
        assert.ok(py.includes(line), line);
    }
    assert.ok(generate('java', doubler()).includes('// File: Open "in.txt" (read)'));
    const pseudo = generate('pseudo', doubler());
    assert.ok(pseudo.includes('OPEN "in.txt" FOR READING') && pseudo.includes('CLOSE (FOR WRITING)'));
});

test('every file string has an English text', () => {
    for (const key of ['b.open', 'b.read', 'b.write', 'b.close', 'f.file', 'f.mode', 'o.read', 'o.write', 'o.append',
        'o.closeread', 'o.closewrite', 'files', 'filesnew', 'filesupload', 'fileswritten', 'e.filenotfound', 'e.fileend']) {
        assert.ok(STR.en[key], key);
    }
});
