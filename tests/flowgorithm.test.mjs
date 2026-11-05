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
import {importFprg, exportFprg} from '../amd/src/flowgorithm.js';
import {runSync} from '../amd/src/interpreter.js';
import {renderFunction} from '../amd/src/render.js';
import {createBlock as B} from '../amd/src/model.js';

const FPRG = `<?xml version="1.0"?>
<flowgorithm fileversion="3.0">
  <attributes><attribute name="name" value="Sum &amp; test"/></attributes>
  <function name="Main" type="None" variable="">
    <parameters/>
    <body>
      <declare name="n" type="Integer" array="False" size=""/>
      <declare name="s" type="Integer" array="False" size=""/>
      <input variable="n"/>
      <assign variable="s" expression="0"/>
      <for variable="i" start="1" end="n" direction="inc" step="1">
        <if expression="i mod 2 = 0">
          <then><assign variable="s" expression="s + i"/></then>
          <else/>
        </if>
      </for>
      <output expression="&quot;Sum = &quot; &amp; s" newline="True"/>
    </body>
  </function>
</flowgorithm>`;

test('import .fprg and run it', () => {
    const {program, warnings} = importFprg(FPRG);
    assert.equal(program.name, 'Sum & test');
    assert.deepEqual(warnings, []);
    assert.equal(runSync(program, [10]), 'Sum = 30\n');
});

test('export then import round trip keeps behaviour', () => {
    const {program} = importFprg(FPRG);
    const again = importFprg(exportFprg(program)).program;
    assert.equal(runSync(again, [10]), 'Sum = 30\n');
});

test('unsupported elements produce warnings', () => {
    const {warnings} = importFprg(FPRG.replace('<input variable="n"/>', '<foo/><input variable="n"/>'));
    assert.equal(warnings.length, 1);
});

test('render produces svg with slots and node ids', () => {
    const {program} = importFprg(FPRG);
    const r = renderFunction(program.functions[0], {editable: true});
    assert.match(r.svg, /^<svg /);
    assert.ok(r.slots.length >= 7);
    assert.ok((r.svg.match(/class="tiny_algorithm-node"/g) || []).length >= 9);
});

test('renderProgram embeds model that can be extracted', async() => {
    const {renderProgram, extractModel} = await import('../amd/src/render.js');
    const {program} = importFprg(FPRG);
    const back = extractModel(renderProgram(program));
    assert.equal(back.name, 'Sum & test');
    assert.equal(runSync(back, [4]), 'Sum = 6\n');
});

test('loop bodies are direct children (real Flowgorithm format) and survive a round trip', () => {
    const {program} = importFprg(FPRG);
    const loop = program.functions[0].body.find((b) => b.type === 'for');
    assert.equal(loop.body.length, 1);
    const xml = exportFprg(program);
    assert.doesNotMatch(xml, /<for[^>]*>s*<body>/);
    assert.equal(importFprg(xml).program.functions[0].body.find((b) => b.type === 'for').body.length, 1);
});

test('long and multi-line comments are wrapped into several lines', async() => {
    const {wrapText, layoutFunction} = await import('../amd/src/layout.js');
    const lines = wrapText('Kreirati niz od n elemenata Fibonacijevog niza (korisnik unosi n)\r\n0,1,1,2,3,5,8,13,21,34,55');
    assert.ok(lines.length >= 3, `expected wrapping, got ${JSON.stringify(lines)}`);
    assert.ok(lines.every((ln) => ln.length <= 44), JSON.stringify(lines));
    const {createProgram, createBlock} = await import('../amd/src/model.js');
    const p = createProgram();
    p.functions[0].body = [createBlock('comment', {text: lines.join(' ') + ' ' + lines.join(' ')})];
    const node = layoutFunction(p.functions[0]).items.find((it) => it.type === 'comment');
    assert.ok(node.lines.length > 1);
    assert.ok(node.h > 40, 'tall comment box');
    assert.ok(node.w < 500, `comment box width ${node.w}`);
});

// A function as Flowgorithm itself saves it: the value is in the return variable, there is no Return block.
const FACT = `<?xml version="1.0"?>
<!DOCTYPE flowgorithm [ <!ENTITY x "y"> ]>
<flowgorithm fileversion="4.2">
    <attributes>
        <attribute name="name" value="Fakt&#x161;"/>
        <attribute name="authors" value="&#128512; Ana"/>
    </attributes>
    <function name="Main" type="None" variable="">
        <parameters/>
        <body>
            <!-- A comment of the file, not a block. -->
            <output expression="Fact(5)" newline="True"/>
        </body>
    </function>
    <function name="Fact" type="Integer" variable="r">
        <parameters>
            <parameter name="n" type="Integer" array="False"/>
        </parameters>
        <body>
            <declare name="r" type="Integer" array="False" size=""/>
            <assign variable="r" expression="1"/>
            <for variable="i" start="2" end="n" direction="inc" step="1">
                <assign variable="r" expression="r * i"/>
            </for>
        </body>
    </function>
</flowgorithm>`;

test('the return variable of a Flowgorithm function becomes a Return block and goes back on export', () => {
    const {program, warnings} = importFprg(FACT);
    assert.deepEqual(warnings, []);
    assert.equal(program.name, 'Faktš');
    assert.equal(runSync(program), '120\n');
    const fact = program.functions[1];
    assert.equal(fact.body[fact.body.length - 1].type, 'return');
    const text = exportFprg(program);
    assert.doesNotMatch(text, /<return/);
    assert.match(text, /<function name="Fact" type="Integer" variable="r">/);
    const again = importFprg(text).program;
    assert.equal(runSync(again), '120\n');
    assert.equal(again.functions[1].body.length, fact.body.length);
});

test('a function whose Return is not the last step is exported with a result variable and a warning', () => {
    const {program} = importFprg(FACT);
    const f = program.functions[1];
    f.body = [B('if', {cond: 'n <= 1', then: [B('return', {expr: '1'})], 'else': []}),
        B('return', {expr: 'n * Fact(n - 1)'})];
    const warnings = [];
    const text = exportFprg(program, warnings);
    assert.match(text, /<function name="Fact" type="Integer" variable="Result">/);
    assert.match(text, /<declare name="Result" type="Integer"/);
    assert.match(text, /<assign variable="Result" expression="n \* Fact\(n - 1\)"\/>/);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Fact/);
});

test('functions Flowgorithm names differently are renamed, missing ones and Break are reported', () => {
    const {program} = importFprg(FACT);
    program.functions[0].body = [B('output', {expr: 'ToInt(2.5) + Sign(-1) + Pi() + Floor(2.5) + Round(1)'}),
        B('while', {cond: 'true', body: [B('break')]})];
    const warnings = [];
    const text = exportFprg(program, warnings);
    assert.match(text, /expression="ToInteger\(2\.5\) \+ Sgn\(-1\) \+ Pi \+ Floor\(2\.5\) \+ Round\(1\)"/);
    assert.equal(warnings.length, 2);
    assert.ok(warnings.some((w) => /Break/.test(w)));
    assert.ok(warnings.some((w) => /Floor, Round/.test(w)));
});

test('the XML reader checks the document', () => {
    const broken = (text, re) => assert.throws(() => importFprg(text), re);
    broken('<flowgorithm><function name="Main"><body></function></flowgorithm>', /<function>/);
    broken('<flowgorithm><function name="Main"><body/>', /<function>/);
    broken('just text', /not a valid XML/);
    broken('<flowgorithm><x a="&#xD800;"/></flowgorithm>', /not a valid XML/);
    broken('<other/>', /not a Flowgorithm file/);
    broken('<flowgorithm><attributes/></flowgorithm>', /no functions/);
    broken(`${'<a>'.repeat(300)}${'</a>'.repeat(300)}`, /too large/);
    broken(`<flowgorithm>${'<comment text="x"/>'.repeat(20001)}</flowgorithm>`, /too large/);
    broken(`<flowgorithm><!--${'x'.repeat(3 * 1024 * 1024)}--></flowgorithm>`, /too large/);
    const cdata = importFprg(FACT.replace('<parameters/>', '<parameters/><![CDATA[ <if expression="x"> ]]>'));
    assert.equal(runSync(cdata.program), '120\n');
});
