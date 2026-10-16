import test from 'node:test';
import assert from 'node:assert/strict';
import {importFprg, exportFprg} from '../amd/src/flowgorithm.js';
import {runSync} from '../amd/src/interpreter.js';
import {renderFunction} from '../amd/src/render.js';

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
    assert.ok((r.svg.match(/class="alg-node"/g) || []).length >= 9);
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
