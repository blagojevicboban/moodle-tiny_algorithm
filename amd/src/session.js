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
 * One run of an algorithm in the editor or the viewer: pacing (Run, Step, breakpoints), input that is asked again
 * when it does not fit the type, the steps for the trace table, the status and what a screen reader hears.
 *
 * @module tiny_algorithm/session
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {execute, parseInputValue} from './interpreter';
import {findBlock} from './model';
import {labelOf} from './layout';
import {errorText, t} from './strings';

/** Most steps the trace table keeps. */
export const MAX_TRACE = 2000;

/**
 * Text of a block for the trace table and the screen reader.
 *
 * @param {Object} program algorithm
 * @param {string} id block id
 * @returns {string}
 */
export const blockLabel = (program, id) => {
    const found = findBlock(program, id);
    return found ? labelOf(found.block) : '';
};

/**
 * What deserves a warning before the algorithm runs: functions that may end without returning their value, and
 * blocks after a Break, Continue or Return that never run.
 *
 * @param {Object} program algorithm
 * @returns {string[]} messages
 */
export const checkProgram = (program) => {
    const jumps = ['break', 'continue', 'return'];
    let unreachable = 0;
    const visit = (list) => {
        let jumped = false;
        (list || []).forEach((b) => {
            if (jumped) {
                unreachable++;
            }
            jumped = jumped || jumps.includes(b.type);
            ['then', 'else', 'body'].forEach((k) => visit(b[k]));
        });
    };
    // A list always returns when one of its blocks does: a Return, or an If whose two branches both always return.
    const returns = (b) => b.type === 'return' || (b.type === 'if' && always(b.then) && always(b.else));
    const always = (list) => (list || []).some(returns);
    // Names declared by more than one Declare block (or a parameter and a Declare) of a function.
    const twice = (f) => {
        const seen = new Map((f.params || []).map((p) => [String(p.name).toLowerCase(), 1]));
        const names = [];
        const count = (list) => (list || []).forEach((b) => {
            if (b.type === 'declare') {
                String(b.name).split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
                    const key = name.toLowerCase();
                    seen.set(key, (seen.get(key) || 0) + 1);
                    if (seen.get(key) === 2) {
                        names.push(name);
                    }
                });
            }
            ['then', 'else', 'body'].forEach((k) => count(b[k]));
        });
        count(f.body);
        return names;
    };
    const messages = [];
    program.functions.forEach((f, i) => {
        visit(f.body);
        if (i > 0 && f.returnType && !always(f.body)) {
            messages.push(t('noreturn', {name: f.name}));
        }
        const names = twice(f);
        if (names.length) {
            messages.push(t('redeclared', {name: f.name, names: names.join(', ')}));
        }
    });
    if (unreachable) {
        messages.push(t('unreachable', {count: String(unreachable)}));
    }
    return messages;
};

/**
 * Wait before the next step: until Step (or Continue) is pressed, or the time of the speed slider has passed.
 *
 * @param {Object} run the run
 * @param {number} delay milliseconds when running
 * @returns {Promise}
 */
const waitNext = (run, delay) => new Promise((resolve) => {
    run.wake = resolve;
    if (!run.stepMode) {
        run.timer = setTimeout(resolve, delay);
    }
}).then(() => {
    clearTimeout(run.timer);
    run.wake = null;
    return null;
});

/**
 * Ask for an input value until it fits the type of the variable (or the run is stopped).
 *
 * @param {Object} ui the widget
 * @param {Object} run the run
 * @param {Object} ev input event of the interpreter
 * @returns {Promise<?string>}
 */
const askValue = async(ui, run, ev) => {
    let hint = '';
    for (;;) {
        const value = await ui.ask(ev, hint);
        if (run.stopped || value === null) {
            return null;
        }
        try {
            parseInputValue(value, ev.type);
            return value;
        } catch (e) {
            hint = t(`inputhint${String(ev.type).toLowerCase()}`);
        }
    }
};

/**
 * Run an algorithm in a widget.
 *
 * The widget (ui) gives: program, breakpoints (a Set of block ids), delay(), highlight(id), branch(ev),
 * watch(vars, stack), output(text), info(text), error(text, id), ask(ev, hint) (a Promise of the text, null when
 * stopped), status(state, step) and announce(text).
 *
 * @param {Object} ui the widget
 * @param {Object} run {stepMode, stopped, wake, timer}; Step and Stop of the widget change it
 * @returns {Promise<Array>} the steps for the trace table
 */
export const runSession = async(ui, run) => {
    const program = ui.program;
    const trace = [];
    const state = {steps: 0, lastId: null};
    const row = () => trace[trace.length - 1];
    const onStep = async(ev) => {
        state.steps++;
        state.lastId = ev.id;
        const found = findBlock(program, ev.id);
        const label = found ? labelOf(found.block) : '';
        ui.highlight(ev.id);
        ui.watch(ev.vars, ev.stack);
        if (trace.length < MAX_TRACE) {
            trace.push({step: state.steps, id: ev.id, kind: found ? found.block.type : '', label, vars: ev.vars, output: ''});
        } else {
            run.traceCut = true;
        }
        if (!run.stepMode && ui.breakpoints.has(ev.id)) {
            run.stepMode = true;
            ui.info(t('breakpointhit', {block: label}));
        }
        ui.status(run.stepMode ? 'paused' : 'running', state.steps);
        if (run.stepMode) {
            ui.announce(t('stepannounce', {step: state.steps, block: label}));
        }
        await waitNext(run, ui.delay());
    };
    const onBranch = (ev) => {
        ui.branch(ev);
        if (row() && row().id === ev.id && !['break', 'continue', 'return'].includes(row().kind)) {
            row().branch = ev.taken ? 'T' : 'F';
        }
    };
    const onOutput = (ev) => {
        ui.output(ev.text);
        if (row()) {
            row().output += ev.text;
        }
    };
    ui.status('running', 0);
    checkProgram(program).forEach((message) => ui.info(`⚠ ${message}`));
    try {
        const gen = execute(program);
        let res = gen.next();
        while (!res.done && !run.stopped) {
            const ev = res.value;
            let value;
            if (ev.event === 'step') {
                await onStep(ev);
            } else if (ev.event === 'branch') {
                onBranch(ev);
            } else if (ev.event === 'done') {
                ui.watch(ev.vars, []);
                trace.after = ev.vars;
            } else if (ev.event === 'output') {
                onOutput(ev);
            } else if (ev.event === 'turtle') {
                if (ui.turtle) {
                    ui.turtle(ev);
                }
            } else if (ev.event === 'file') {
                if (ui.file) {
                    ui.file(ev);
                }
            } else if (ev.event === 'input') {
                value = await askValue(ui, run, ev);
                if (row()) {
                    row().input = value;
                }
            }
            if (!run.stopped) {
                res = gen.next(value);
            }
        }
        const end = run.stopped ? 'stopped' : 'finished';
        ui.status(run.stopped ? 'stopped' : 'done', state.steps);
        if (!run.clear) {
            ui.info(t(end));
        }
        ui.announce(t(end));
    } catch (err) {
        ui.status('error', state.steps);
        ui.error(errorText(err), state.lastId);
        ui.announce(`${t('error')}: ${errorText(err)}`);
    }
    return trace;
};
