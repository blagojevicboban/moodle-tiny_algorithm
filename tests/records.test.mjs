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
 * Tests of records (2.21): record types of the algorithm, fields p.x and a[i].x, records as values (a copy on assignment
 * and as an argument), arrays of records, input into fields, output of a record, and the errors.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {runSync, recordTypes} from '../amd/src/interpreter.js';
import {parseExpr} from '../amd/src/expr.js';
import {fieldsText, parseFields, renameRecordType, usesRecords} from '../amd/src/records.js';

const POINT = {name: 'Point', fields: [{name: 'x', type: 'Integer'}, {name: 'y', type: 'Real'}]};
const STUDENT = {name: 'Student', fields: [{name: 'name', type: 'String'}, {name: 'avg', type: 'Real'}]};

const prog = (records, ...body) => {
    const p = createProgram();
    p.records = records;
    p.functions[0].body = body;
    return p;
};
const out = (expr) => B('output', {expr, newline: true});
const errorOf = (p, inputs = []) => {
    try {
        runSync(p, inputs);
        return null;
    } catch (e) {
        return e.message;
    }
};

test('fields are parsed after a name, an element and a field; a number with a point stays a number', () => {
    assert.deepEqual(parseExpr('p.x'), {k: 'fld', e: {k: 'var', name: 'p'}, name: 'x'});
    assert.equal(parseExpr('a[i].avg * 2').l.k, 'fld');
    assert.deepEqual(parseExpr('.5 + 1.25').l, {k: 'num', v: 0.5, 'int': false});
    assert.throws(() => parseExpr('p.'), /field name/);
});

test('a record has default fields, fields are set and read, and it is written as Type(field = value)', () => {
    const p = prog([POINT], B('declare', {name: 'p', varType: 'Point'}), out('p'),
        B('assign', {target: 'p.x', expr: '3'}), B('assign', {target: 'p.y', expr: 'p.x / 2'}), out('p.x + p.y'),
        out('"p = " & p'));
    assert.equal(runSync(p), 'Point(x = 0, y = 0)\n4.5\np = Point(x = 3, y = 1.5)\n');
});

test('an assignment and an argument copy the record; a function can return one', () => {
    const p = prog([POINT], B('declare', {name: 'p, q', varType: 'Point'}), B('assign', {target: 'p.x', expr: '1'}),
        B('assign', {target: 'q', expr: 'p'}), B('assign', {target: 'q.x', expr: '2'}), B('call', {expr: 'Move(p)'}),
        out('p.x & " " & q.x'), B('assign', {target: 'q', expr: 'Origin()'}), out('q'));
    p.functions.push({name: 'Move', params: [{name: 'r', type: 'Point'}], returnType: null, body: [
        B('assign', {target: 'r.x', expr: '100'})]});
    p.functions.push({name: 'Origin', params: [], returnType: 'Point', body: [B('declare', {name: 'o', varType: 'Point'}),
        B('assign', {target: 'o.y', expr: '0.5'}), B('return', {expr: 'o'})]});
    assert.equal(runSync(p), '1 2\nPoint(x = 0, y = 0.5)\n');
});

test('an array of records: input into fields, sorting by a field, and arrays passed to a function', () => {
    const p = prog([STUDENT], B('declare', {name: 'n, i, j', varType: 'Integer'}), B('assign', {target: 'n', expr: '3'}),
        B('declare', {name: 's', varType: 'Student', size: 'n'}), B('declare', {name: 't', varType: 'Student'}),
        B('for', {variable: 'i', start: '0', end: 'n - 1', step: '1', body: [B('input', {target: 's[i].name'}),
            B('input', {target: 's[i].avg'})]}),
        B('for', {variable: 'i', start: '0', end: 'n - 2', step: '1', body: [
            B('for', {variable: 'j', start: '0', end: 'n - 2 - i', step: '1', body: [
                B('if', {cond: 's[j].avg < s[j + 1].avg', then: [B('assign', {target: 't', expr: 's[j]'}),
                    B('assign', {target: 's[j]', expr: 's[j + 1]'}), B('assign', {target: 's[j + 1]', expr: 't'})], 'else': []})]})]}),
        B('call', {expr: 'Show(s)'}));
    p.functions.push({name: 'Show', params: [{name: 'list', type: 'Student', array: true}], returnType: null, body: [
        B('declare', {name: 'k', varType: 'Integer'}),
        B('for', {variable: 'k', start: '0', end: 'Len(list) - 1', step: '1', body: [out('list[k].name & ": " & list[k].avg')]})]});
    assert.equal(runSync(p, ['Ana', '4.5', 'Milan', '4.9', 'Jovan', '3.75']), 'Milan: 4.9\nAna: 4.5\nJovan: 3.75\n');
});

test('the errors of records', () => {
    const decl = B('declare', {name: 'p', varType: 'Point'});
    assert.match(errorOf(prog([POINT], decl, out('p.z'))), /has no field 'z'/);
    assert.match(errorOf(prog([POINT], B('declare', {name: 'n', varType: 'Integer'}), out('n.x'))), /'n' is not a record/);
    assert.match(errorOf(prog([POINT], decl, B('declare', {name: 'n', varType: 'Integer'}), B('assign', {target: 'n', expr: 'p'}))),
        /cannot be stored in n/);
    assert.match(errorOf(prog([POINT], decl, B('assign', {target: 'p', expr: '5'}))), /needs a record of the type Point/);
    assert.match(errorOf(prog([POINT], decl, out('p == p'))), /cannot be compared/);
    assert.match(errorOf(prog([POINT], decl, B('input', {target: 'p'})), ['1']), /read its fields one by one/);
    assert.match(errorOf(prog([POINT], decl, B('assign', {target: 'p.x', expr: '"a"'}))), /Point\.x/);
    assert.match(errorOf(prog([], B('declare', {name: 'q', varType: 'Pointt'}))), /Unknown type 'Pointt'/);
    assert.match(errorOf(prog([POINT, {name: 'point', fields: [{name: 'a', type: 'Integer'}]}], out('1'))),
        /record type 'point' is not valid/);
    assert.throws(() => recordTypes({records: [{name: 'Integer', fields: [{name: 'a', type: 'Integer'}]}]}), /not valid/);
    assert.throws(() => recordTypes({records: [{name: 'R', fields: [{name: 'a', type: 'Point'}]}]}), /not valid/);
    assert.throws(() => recordTypes({records: [{name: 'R', fields: []}]}), /not valid/);
});

test('the fields of a record as text, and renaming a record type in the whole algorithm', () => {
    assert.deepEqual(parseFields('name: string, avg: Real;  n'), [{name: 'name', type: 'String'}, {name: 'avg', type: 'Real'},
        {name: 'n', type: 'Integer'}]);
    assert.equal(fieldsText(STUDENT.fields), 'name: String, avg: Real');
    const p = prog([POINT], B('declare', {name: 'p', varType: 'point'}));
    p.functions.push({name: 'F', params: [{name: 'a', type: 'Point', array: true}], returnType: 'Point', body: []});
    renameRecordType(p, 'Point', 'Spot');
    assert.equal(p.functions[0].body[0].varType, 'Spot');
    assert.deepEqual([p.functions[1].params[0].type, p.functions[1].returnType], ['Spot', 'Spot']);
    assert.equal(usesRecords(p), true);
    assert.equal(usesRecords(createProgram()), false);
});
