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
 * Tests of a run in a widget (without a browser): breakpoints, input asked again, the trace, the call stack, errors.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {runSession} from '../amd/src/session.js';

/**
 * A widget that records what it is told and answers inputs from a list; paused steps go on at once.
 *
 * @param {Object} program algorithm
 * @param {string[]} answers input values
 * @param {Set} breakpoints block ids
 * @returns {{ui: Object, log: Object, run: Object}}
 */
const fake = (program, answers = [], breakpoints = new Set()) => {
    const log = {info: [], status: [], hints: [], stacks: [], error: null, announced: []};
    const run = {stepMode: false, stopped: false, wake: null, timer: null};
    const ui = {
        program, breakpoints,
        delay: () => 0,
        highlight: () => null,
        branch: () => null,
        watch: (vars, stack) => log.stacks.push(stack),
        output: () => null,
        info: (text) => log.info.push(text),
        error: (text, id) => {
            log.error = {text, id};
        },
        ask: (ev, hint) => {
            log.hints.push(hint);
            return Promise.resolve(answers.shift());
        },
        status: (state, step) => log.status.push([state, step]),
        announce: (text) => log.announced.push(text),
    };
    // A paused run goes on by itself, as if Step were pressed.
    const tick = setInterval(() => run.wake && run.wake(), 1);
    return {ui, log, run, done: () => clearInterval(tick)};
};

test('a breakpoint pauses the run, a wrong input is asked again, the trace has every step', async() => {
    const p = createProgram();
    const out = B('output', {expr: 'n * 2'});
    p.functions[0].body = [B('declare', {name: 'n'}), B('input', {target: 'n'}), out];
    const {ui, log, run, done} = fake(p, ['3.5', 'x', '4'], new Set([out.id]));
    const trace = await runSession(ui, run);
    done();
    assert.deepEqual(log.hints, ['', 'Enter a whole number, for example 4.', 'Enter a whole number, for example 4.']);
    assert.ok(log.info.some((i) => /breakpoint: Output n \* 2/.test(i)));
    assert.equal(run.stepMode, true);
    assert.deepEqual(log.status.at(-1), ['done', 3]);
    assert.deepEqual(trace.map((r) => r.label), ['Integer n', 'Input n', 'Output n * 2']);
    assert.equal(trace[1].input, '4');
    assert.equal(trace[2].output, '8\n');
    assert.ok(log.announced.some((a) => /^Step 3: Output/.test(a)));
});

test('the call stack is sent with every step and an error names the block that was running', async() => {
    const p = createProgram();
    const bad = B('return', {expr: 'n / 0'});
    p.functions[0].body = [B('output', {expr: 'F(2)'})];
    p.functions.push({name: 'F', params: [{name: 'n', type: 'Integer'}], returnType: 'Integer', body: [bad]});
    const {ui, log, run, done} = fake(p);
    await runSession(ui, run);
    done();
    assert.ok(log.stacks.some((s) => s && s.join(' ') === 'Main() F(2)'));
    assert.equal(log.error.id, bad.id);
    assert.match(log.error.text, /Division by zero/);
    assert.equal(log.status.at(-1)[0], 'error');
});
