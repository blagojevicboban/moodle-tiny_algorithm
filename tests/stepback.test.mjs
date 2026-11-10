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
 * Tests of step back: a repeat of a run (the same seed, the same input values) reaches a step with the same state.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgram, createBlock as B} from '../amd/src/model.js';
import {runSession} from '../amd/src/session.js';
import {replayTo} from '../amd/src/timeline.js';

/**
 * A widget that records what it shows; paused steps go on at once unless pauseAt is the step.
 *
 * @param {Object} program algorithm
 * @param {string[]} answers input values
 * @param {Object} [extra] fields of the run (a repeat)
 * @returns {Object}
 */
const fake = (program, answers = [], extra = {}) => {
    const log = {out: '', asked: 0, given: [], watched: [], highlighted: [], status: []};
    const run = {stepMode: false, stopped: false, wake: null, timer: null, ...extra};
    const ui = {
        program, breakpoints: new Set(),
        delay: () => 0,
        highlight: (id) => log.highlighted.push(id),
        branch: () => null,
        watch: (vars) => log.watched.push(vars),
        output: (text) => {
            log.out += text;
        },
        info: () => null,
        error: () => null,
        ask: () => {
            log.asked++;
            return Promise.resolve(answers.shift());
        },
        given: (ev, value) => log.given.push(value),
        status: (state, step) => log.status.push([state, step]),
        announce: () => null,
    };
    // A repeat stays where it pauses (as a reader would see it); everything else goes on at once.
    const tick = setInterval(() => {
        if (run.wake && !(extra.hold && run.steps === run.until)) {
            run.wake();
        }
    }, 1);
    return {ui, log, run, done: () => clearInterval(tick)};
};

/** An algorithm that reads n, draws random numbers and adds them up. */
const program = () => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'n, s, i'}), B('input', {target: 'n'}),
        B('for', {variable: 'i', start: '1', end: 'n', step: '1', body: [
            B('assign', {target: 's', expr: 's + Random(1000)'}), B('output', {expr: 's'})]})];
    return p;
};

test('a repeat up to a step gives the same variables and output as the run had there', async() => {
    const first = fake(program(), ['4']);
    const trace = await runSession(first.ui, first.run);
    first.done();
    assert.equal(first.run.inputs.join(), '4');
    assert.ok(first.run.steps > 6);
    const target = first.run.steps - 2;
    const replay = replayTo(first.run, target);
    assert.equal(replay.until, target);
    assert.equal(replay.horizon, first.run.steps);
    const again = fake(program(), [], {...replay, hold: true});
    // Stop the repeat where it pauses (step back pauses at the chosen step).
    const ended = runSession(again.ui, again.run);
    await new Promise((resolve) => {
        const wait = setInterval(() => {
            if (again.run.steps === target && again.run.wake) {
                clearInterval(wait);
                resolve();
            }
        }, 1);
    });
    again.run.stopped = true;
    again.run.wake();
    await ended;
    again.done();
    assert.equal(again.log.asked, 0, 'the input is entered by the repeat');
    assert.deepEqual(again.log.given, ['4']);
    // Only the step it pauses at is drawn.
    assert.equal(again.log.highlighted.length, 1);
    assert.deepEqual(again.log.watched[0], trace[target - 1].vars);
    const outBefore = trace.slice(0, target - 1).map((r) => r.output).join('');
    assert.equal(again.log.out, outBefore);
    assert.equal(again.run.stepMode, true);
    assert.equal(again.run.horizon, first.run.steps);
});

test('a repeat past the end finishes like the run; without a seed every run chooses one', async() => {
    const first = fake(program(), ['3']);
    await runSession(first.ui, first.run);
    first.done();
    assert.ok(first.run.seed > 0);
    const again = fake(program(), [], replayTo(first.run, first.run.steps + 5));
    await runSession(again.ui, again.run);
    again.done();
    assert.equal(again.log.out, first.log.out);
    assert.deepEqual(again.log.status.at(-1), ['done', first.run.steps]);
});

test('a new input value after a step back makes the later steps unknown', async() => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'n'}), B('input', {target: 'n'}), B('output', {expr: 'n'})];
    const first = fake(p, ['7']);
    await runSession(first.ui, first.run);
    first.done();
    // Back to the Input block (step 2): the value is asked again.
    const again = fake(p, ['9'], replayTo(first.run, 2));
    await runSession(again.ui, again.run);
    again.done();
    assert.equal(again.log.asked, 1);
    assert.equal(again.log.out, '9\n');
    assert.deepEqual(again.run.inputs, ['9']);
    assert.equal(again.run.horizon, 3);
    assert.equal(replayTo(null, 2), null);
});

test('while a value is asked the run says so, and Step cannot answer it', async() => {
    const p = createProgram();
    p.functions[0].body = [B('declare', {name: 'n'}), B('input', {target: 'n'}), B('output', {expr: 'n'})];
    const {ui, run, done} = fake(p, []);
    const seen = [];
    ui.ask = () => {
        seen.push(run.asking);
        return Promise.resolve('5');
    };
    await runSession(ui, run);
    done();
    assert.deepEqual(seen, [true]);
    assert.equal(run.asking, false);
});
