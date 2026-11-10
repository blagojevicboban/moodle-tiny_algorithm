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
 * Tests of turtle graphics: the interpreter events, Flowgorithm files and the generated code.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {execute} from '../amd/src/interpreter.js';
import {importFprg, exportFprg} from '../amd/src/flowgorithm.js';
import {generate} from '../amd/src/codegen.js';
import {PEN_COLORS, usesTurtle} from '../amd/src/turtle.js';
import {renderProgram} from '../amd/src/render.js';
import {STR} from '../amd/src/strings.js';

const square = () => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'i'}), B('pen', {color: 'red'}),
        B('for', {variable: 'i', start: '1', end: '4', step: '1', body: [B('forward', {distance: '50'}),
            B('turn', {angle: '90', rotate: 'right'})]}),
        B('forward', {distance: '20', pen: 'up'}), B('home'), B('clear')];
    return p;
};

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('the turtle starts at the centre looking up, draws a square back to the start, moves with the pen up and goes home', () => {
    const events = [...execute(square())].filter((e) => e.event === 'turtle');
    const lines = events.filter((e) => e.line).map((e) => e.line);
    assert.equal(lines.length, 4);
    assert.ok(near(lines[0].x1, 0) && near(lines[0].y1, 0) && near(lines[0].x2, 0) && near(lines[0].y2, 50));
    assert.ok(near(lines[1].x2, 50) && near(lines[1].y2, 50), 'right turn: the second side goes to the right');
    assert.ok(near(lines[3].x2, 0) && near(lines[3].y2, 0), 'the square closes at the start');
    assert.ok(lines.every((l) => l.color === 'red'));
    const up = events[events.length - 3];
    assert.equal(up.line, null);
    assert.ok(near(up.y, 20));
    const [home, clear] = events.slice(-2);
    assert.deepEqual([home.x, home.y, home.heading, Boolean(home.clear)], [0, 0, 90, false]);
    assert.equal(clear.clear, true);
    assert.ok(usesTurtle(square()));
    assert.ok(!usesTurtle(createProgram()));
});

test('Flowgorithm turtle shapes are read and written with their attributes', () => {
    const fprg = `<?xml version="1.0"?>
<flowgorithm fileversion="4.2">
    <attributes><attribute name="name" value="turtle"/></attributes>
    <function name="Main" type="None" variable="">
        <parameters/>
        <body>
            <home/>
            <pen color="blue"/>
            <forward expression="100" pen="down"/>
            <forward expression="5" pen="up"/>
            <turn expression="45" rotate="left"/>
            <turn expression="" rotate="right"/>
            <clear/>
        </body>
    </function>
</flowgorithm>`;
    const {program, warnings} = importFprg(fprg);
    assert.deepEqual(warnings, []);
    const body = program.functions[0].body.map(({id, ...rest}) => rest);
    assert.deepEqual(body, [{type: 'home'}, {type: 'pen', color: 'blue'}, {type: 'forward', distance: '100', pen: 'down'},
        {type: 'forward', distance: '5', pen: 'up'}, {type: 'turn', angle: '45', rotate: 'left'},
        {type: 'turn', angle: '0', rotate: 'right'}, {type: 'clear'}]);
    const out = exportFprg(program);
    for (const tag of ['<home/>', '<pen color="blue"/>', '<forward expression="100" pen="down"/>',
        '<forward expression="5" pen="up"/>', '<turn expression="45" rotate="left"/>', '<clear/>']) {
        assert.ok(out.includes(tag), tag);
    }
    assert.ok(renderProgram(program).includes('Forward 5 (pen up)'));
});

test('Python draws with the turtle module; the other languages get a comment', () => {
    const py = generate('python', square());
    for (const line of ['import turtle', 'turtle.setheading(90)', 'turtle.pencolor("red")', 'turtle.forward(50)',
        'turtle.right(90)', 'turtle.penup()', 'turtle.home()', 'turtle.clear()', 'turtle.done()']) {
        assert.ok(py.includes(line), line);
    }
    assert.ok(!generate('python', createProgram()).includes('import turtle'));
    assert.ok(generate('c', square()).includes('// Turtle: Forward 50'));
    assert.ok(generate('vb', square()).includes("' Turtle: Turn right 90"));
    assert.ok(/FORWARD 20 \(PEN UP\)/.test(generate('pseudo', square())));
});

test('every turtle string has an English text, and every pen colour a name', () => {
    for (const key of ['b.forward', 'b.turn', 'b.pen', 'b.home', 'b.clear', 'turtle', 'turtlelimit',
        ...Object.keys(PEN_COLORS).map((c) => `c.${c}`)]) {
        assert.ok(STR.en[key], key);
    }
    assert.equal(Object.keys(PEN_COLORS).length, 10);
});
