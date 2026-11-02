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
 * Test cases for an algorithm: inputs given by the teacher, expected output computed from the teacher's solution,
 * and the panel that edits them (teacher) or runs them against the student's version (student).
 *
 * @module tiny_algorithm/tests
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {execute} from './interpreter';
import {decodeData, serialize} from './model';
import {errorText, fill, t as tr} from './strings';

/** Step limit for one test run, so that an endless loop fails the test instead of freezing the page. */
export const MAX_STEPS = 200000;

const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') {
            e.className = v;
        } else if (k.startsWith('on')) {
            e.addEventListener(k.slice(2), v);
        } else if (v !== undefined && v !== null && v !== false) {
            e.setAttribute(k, v === true ? '' : v);
        }
    }
    kids.flat().forEach((c) => e.append(c));
    return e;
};

/**
 * Normalise program output for comparison: Unix line ends, no trailing spaces, no trailing empty lines.
 *
 * @param {string} text output
 * @returns {string}
 */
export const normalize = (text) => String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
    .map((line) => line.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

/** A line with only two double quotes is an empty value (an empty line at the end would be dropped). */
const EMPTY_VALUE = '""';

/**
 * Lines of the inputs of a test as written, without the empty lines at the end.
 *
 * @param {string} text inputs
 * @returns {string[]}
 */
const inputLines = (text) => {
    const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
};

/**
 * Split the inputs of a test (one value per line) into a list; a line "" gives an empty value.
 *
 * @param {string} text inputs
 * @returns {string[]}
 */
export const parseInputs = (text) => inputLines(text).map((line) => (line === EMPTY_VALUE ? '' : line));

/**
 * The call a function test makes: Name(arguments), the arguments being the inputs of the test (one per line or
 * separated by commas).
 *
 * @param {Object} tc test {inputs, call}
 * @returns {string|null} null for a test of inputs and output
 */
export const callText = (tc) => (tc && /^[A-Za-z_][A-Za-z0-9_]*$/.test(tc.call || '') ?
    `${tc.call}(${inputLines(tc.inputs).join(', ')})` : null);

/**
 * Run a program with the given inputs, or call one of its functions.
 *
 * @param {Object} program algorithm model
 * @param {string} inputs one value per line
 * @param {string} [lang] UI language for the error messages
 * @param {string|null} [call] a call such as Sum(2, 3) instead of running the main function
 * @returns {{output: string, after: string, error: (string|null), call: boolean, result: (string|null)}} output
 *     written so far, the part of it written after the last input, the error that stopped the run, and for a call
 *     the value the function returned
 */
export const runProgram = (program, inputs, lang = null, call = null) => {
    const queue = parseInputs(call === null ? inputs : '');
    const pieces = [];
    let read = 0;
    let returned = null;
    const result = (error) => {
        const after = pieces.filter((p) => p.read >= read).map((p) => p.text).join('');
        return {output: pieces.map((p) => p.text).join(''), after, error, call: call !== null, result: returned};
    };
    try {
        const gen = execute(program, {maxSteps: MAX_STEPS, call});
        let res = gen.next();
        while (!res.done) {
            const ev = res.value;
            if (ev.event === 'output') {
                pieces.push({text: ev.text, read});
            } else if (ev.event === 'result') {
                returned = ev.text;
            }
            if (ev.event === 'input') {
                if (!queue.length) {
                    throw new Error(tr('noinput', lang));
                }
                read++;
                res = gen.next(queue.shift());
            } else {
                res = gen.next();
            }
        }
        return result(null);
    } catch (err) {
        return result(errorText(err));
    }
};

const NUMBER = /-?\d+(?:\.\d+)?/g;

/**
 * The part of the output that tests compare (for a function test, the value it returned).
 *
 * @param {{output: string, after: string}} run result of runProgram
 * @param {object} [check]
 * @param {boolean} [check.afterinput] only the output written after the last input
 * @param {boolean} [check.numbers] only the numbers in it, one per line
 * @returns {string}
 */
export const checkedOutput = (run, {afterinput = false, numbers = false} = {}) => {
    let text = afterinput ? run.after : run.output;
    if (run.call) {
        text = run.result ?? '';
    }
    return numbers ? (text.match(NUMBER) || []).join('\n') : text;
};

/**
 * Are two lines of output the same, with the comparison options of the question?
 *
 * @param {string} a expected line
 * @param {string} b actual line
 * @param {object} [check]
 * @param {boolean} [check.ignorecase] capital and small letters are the same
 * @param {boolean} [check.ignorespaces] any run of spaces is one space, and spaces at the ends do not count
 * @param {number} [check.tolerance] numbers may differ by this much
 * @returns {boolean}
 */
export const sameLine = (a, b, {ignorecase = false, ignorespaces = false, tolerance = 0} = {}) => {
    const prep = (line) => {
        let text = String(line ?? '');
        if (ignorespaces) {
            text = text.replace(/\s+/g, ' ').trim();
        }
        return ignorecase ? text.toLowerCase() : text;
    };
    const [x, y] = [prep(a), prep(b)];
    if (x === y) {
        return true;
    }
    if (!(Number(tolerance) > 0) || x.replace(NUMBER, '#') !== y.replace(NUMBER, '#')) {
        return false;
    }
    const nx = x.match(NUMBER) || [];
    const ny = y.match(NUMBER) || [];
    return nx.every((n, i) => Math.abs(Number(n) - Number(ny[i])) <= Number(tolerance) + 1e-9);
};

/**
 * Index of the first line where two outputs differ.
 *
 * @param {string} expected expected output
 * @param {string} actual actual output
 * @param {object} [check] comparison options, see sameLine
 * @returns {number} line index, or -1 when they are equal
 */
export const firstDiffLine = (expected, actual, check = {}) => {
    const a = normalize(expected).split('\n');
    const b = normalize(actual).split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined || b[i] === undefined || !sameLine(a[i], b[i], check)) {
            return i;
        }
    }
    return -1;
};

/**
 * Run every test against a program.
 *
 * @param {Object} program algorithm model
 * @param {Array} tests [{inputs, expected}]
 * @param {string} [lang] UI language for the error messages
 * @param {object} [check] what is compared, see checkedOutput
 * @returns {Array} [{pass, actual, error, diffLine}]
 */
export const runTests = (program, tests, lang = null, check = {}) => tests.map((tc) => {
    const run = runProgram(program, tc.inputs, lang, callText(tc));
    const actual = checkedOutput(run, check);
    const diffLine = firstDiffLine(tc.expected, actual, check);
    return {pass: !run.error && diffLine === -1, actual, error: run.error, diffLine};
});

/**
 * Fill in the expected output of every test by running the solution.
 *
 * @param {Object} solution the teacher's algorithm
 * @param {Array} tests [{inputs}]
 * @param {string} [lang] UI language for the error messages
 * @param {object} [check] what is compared, see checkedOutput
 * @returns {{tests: Array, errors: Array}} tests with expected output, and [{index, error}] for runs that failed
 */
export const computeExpected = (solution, tests, lang = null, check = {}) => {
    const errors = [];
    const result = tests.map((tc, index) => {
        const run = runProgram(solution, tc.inputs, lang, callText(tc));
        if (run.error) {
            errors.push({index, error: run.error});
        }
        return {...tc, inputs: String(tc.inputs ?? ''), expected: checkedOutput(run, check)};
    });
    return {tests: result, errors};
};

/**
 * Encode tests for the data-algorithm-tests attribute.
 *
 * @param {Array} tests [{inputs, expected}]
 * @returns {string}
 */
export const serializeTests = (tests) => serialize(tests.map((tc) => (tc.call ?
    {inputs: tc.inputs, expected: tc.expected, call: tc.call} : {inputs: tc.inputs, expected: tc.expected})));

/**
 * A test with only the fields a test has: inputs, expected, and when set hidden, weight and call.
 *
 * @param {Object} tc test from storage
 * @returns {Object}
 */
export const cleanTest = (tc) => {
    const out = {inputs: String(tc.inputs ?? ''), expected: String(tc.expected ?? '')};
    if (tc.hidden) {
        out.hidden = true;
    }
    if (tc.weight !== undefined && tc.weight !== null && tc.weight !== '' && Number(tc.weight) >= 0) {
        out.weight = Number(tc.weight);
    }
    if (typeof tc.call === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(tc.call)) {
        out.call = tc.call;
    }
    return out;
};

/**
 * Decode the data-algorithm-tests attribute; anything unreadable gives no tests.
 *
 * @param {string} text attribute value
 * @returns {Array} [{inputs, expected}]
 */
export const deserializeTests = (text) => {
    try {
        const data = text ? decodeData(text) : [];
        return Array.isArray(data) ? data.filter((tc) => tc && typeof tc === 'object')
            .map((tc) => cleanTest(tc)) : [];
    } catch (e) {
        return [];
    }
};

/**
 * Test list: the teacher enters the inputs and computes the expected outputs from the solution,
 * the student runs the tests against their version of the algorithm.
 */
export class TestsPanel {
    /**
     * @param {HTMLElement} host element that receives the panel
     * @param {object} opts
     * @param {Array} [opts.tests] [{inputs, expected}]
     * @param {string} [opts.mode] 'teacher' or 'student'
     * @param {string} [opts.lang] UI language code
     * @param {Function} [opts.getProgram] () => program the tests run against (student)
     * @param {Function} [opts.getSolution] () => solution the expected outputs come from (teacher)
     * @param {object} [opts.check] what is compared, see checkedOutput
     * @param {boolean} [opts.hiddenOption] the teacher can hide a test from students (question type)
     * @param {boolean} [opts.weightOption] the teacher can give a test a weight in the grade (question type)
     * @param {Function} [opts.onChange] (tests) => called when the teacher changes the tests
     */
    constructor(host, {tests = [], mode = 'student', lang = null, getProgram = null, getSolution = null, check = {},
            hiddenOption = false, weightOption = false, onChange = null} = {}) {
        this.tests = tests.map((tc) => ({...tc}));
        this.mode = mode;
        this.lang = lang;
        this.getProgram = getProgram;
        this.getSolution = getSolution;
        this.check = check;
        this.hiddenOption = hiddenOption;
        this.weightOption = weightOption;
        this.onChange = onChange;
        this.results = null;
        this.stale = false;
        this.root = el('div', {'class': `tiny_algorithm-tests tiny_algorithm-tests-${mode}`});
        host.append(this.root);
        this.render();
    }

    /** Tell the owner that the teacher changed the tests. */
    changed() {
        if (this.onChange) {
            this.onChange(this.tests);
        }
    }

    t(key, values = {}) {
        return fill(tr(key, this.lang), values);
    }

    /**
     * Tests with the expected outputs computed from the current solution.
     *
     * @returns {{tests: Array, errors: Array}}
     */
    getTests() {
        return computeExpected(this.getSolution(), this.tests, this.lang, this.check);
    }

    /** Recompute the expected outputs from the solution and show any run that failed. */
    refreshExpected() {
        const {tests, errors} = this.getTests();
        this.tests = tests;
        this.results = null;
        this.errors = errors;
        this.render();
        this.changed();
        return errors;
    }

    /** Run the tests against the student's program. */
    run() {
        this.results = runTests(this.getProgram(), this.tests, this.lang, this.check);
        this.stale = false;
        this.render();
    }

    /** The student changed the algorithm: the results shown are from the previous version. */
    markStale() {
        if (this.results && !this.stale) {
            this.stale = true;
            this.render();
        }
    }

    render() {
        const btn = (key, fn, cls = 'btn-secondary') => el('button', {type: 'button', 'class': `btn ${cls} btn-sm`, onclick: fn},
            this.t(key));
        const head = el('div', {'class': 'tiny_algorithm-tests-bar'}, el('strong', {}, this.t('tests')));
        if (this.mode === 'teacher') {
            head.append(btn('addtest', () => {
                this.tests.push({inputs: '', expected: ''});
                this.render();
                this.changed();
                const areas = this.root.querySelectorAll('textarea');
                areas[areas.length - 1].focus();
            }), btn('refreshexpected', () => this.refreshExpected()));
        } else {
            head.append(btn('runtests', () => this.run(), 'btn-primary'));
            if (this.results) {
                const passed = this.results.filter((r) => r.pass).length;
                let state = passed === this.results.length ? 'tiny_algorithm-pass' : 'tiny_algorithm-fail';
                if (this.stale) {
                    state = 'tiny_algorithm-stale';
                }
                head.append(el('span', {'class': `tiny_algorithm-tests-summary ${state}`, role: 'status'},
                    this.t('passed', {passed, total: this.results.length})));
                if (this.stale) {
                    head.append(el('span', {'class': 'tiny_algorithm-test-note'}, this.t('stale')));
                }
            }
        }
        const list = el('ol', {'class': 'tiny_algorithm-tests-list'});
        this.tests.forEach((tc, i) => list.append(this.mode === 'teacher' ? this.teacherRow(tc, i) : this.studentRow(tc, i)));
        this.root.replaceChildren(head);
        this.root.classList.toggle('tiny_algorithm-tests-stale', this.stale);
        if (!this.tests.length && this.mode === 'teacher') {
            this.root.append(el('p', {'class': 'tiny_algorithm-tests-empty'}, this.t('notests')));
        }
        this.root.append(list);
    }

    /** @returns {string[]} names of the functions of the solution a test can call (all but the main one) */
    functionNames() {
        const program = this.getSolution ? this.getSolution() : null;
        const fns = program && Array.isArray(program.functions) ? program.functions : [];
        const main = fns.find((f) => String(f.name).toLowerCase() === 'main') || fns[0];
        return fns.filter((f) => f !== main).map((f) => f.name);
    }

    teacherRow(tc, i) {
        const error = (this.errors || []).find((e) => e.index === i);
        const label = tc.call ? 'arguments' : 'inputs';
        const inputs = el('textarea', {'class': 'form-control form-control-sm', rows: 3,
            placeholder: this.t(tc.call ? 'argumentshint' : 'inputshint'),
            'aria-label': `${this.t('testcase', {n: i + 1})}: ${this.t(label)}`,
            oninput: () => {
                tc.inputs = inputs.value;
                this.changed();
            }});
        inputs.value = tc.inputs;
        // What the test runs: the whole algorithm with inputs, or one function with arguments.
        const names = this.functionNames();
        if (tc.call && !names.includes(tc.call)) {
            names.push(tc.call);
        }
        const kind = el('select', {'class': 'custom-select custom-select-sm form-select form-select-sm tiny_algorithm-test-kind',
            'aria-label': `${this.t('testcase', {n: i + 1})}: ${this.t('testtype')}`, onchange: () => {
                if (kind.value) {
                    tc.call = kind.value;
                } else {
                    delete tc.call;
                }
                this.render();
                this.changed();
            }}, el('option', {value: ''}, this.t('testio')),
        names.map((name) => el('option', {value: name, selected: name === tc.call}, this.t('testcall', {name}))));
        let weight = '';
        if (this.weightOption) {
            const box = el('input', {type: 'number', min: 0, step: 'any', 'class': 'form-control form-control-sm',
                value: tc.weight ?? 1, oninput: () => {
                    const w = Number(box.value);
                    if (box.value === '' || !(w >= 0) || w === 1) {
                        delete tc.weight;
                    } else {
                        tc.weight = w;
                    }
                    this.changed();
                }});
            weight = el('label', {'class': 'tiny_algorithm-test-weight'}, this.t('weight'), ' ', box);
        }
        let hidden = '';
        if (this.hiddenOption) {
            const box = el('input', {type: 'checkbox', 'class': 'form-check-input', onchange: () => {
                tc.hidden = box.checked;
                this.changed();
            }});
            box.checked = Boolean(tc.hidden);
            hidden = el('label', {'class': 'tiny_algorithm-test-hidden'}, box, ' ', this.t('hiddentest'));
        }
        return el('li', {'class': 'tiny_algorithm-test'},
            el('div', {'class': 'tiny_algorithm-test-head'}, el('span', {}, this.t('testcase', {n: i + 1})), kind, weight, hidden,
                el('button', {type: 'button', 'class': 'btn btn-link btn-sm', onclick: () => {
                    this.tests.splice(i, 1);
                    this.errors = null;
                    this.render();
                    this.changed();
                }}, tr('delete', this.lang))),
            el('div', {'class': 'tiny_algorithm-test-cols'},
                el('label', {}, el('span', {}, this.t(label)), inputs),
                el('div', {}, el('span', {}, this.t('expected')), el('pre', {'class': 'tiny_algorithm-test-out'}, tc.expected))),
            error ? el('div', {'class': 'tiny_algorithm-error'}, this.t('solutionfails', {n: i + 1, error: error.error})) : '');
    }

    studentRow(tc, i) {
        const r = this.results && this.results[i];
        const mark = r ? el('span', {'class': `tiny_algorithm-test-mark ${r.pass ? 'tiny_algorithm-pass' : 'tiny_algorithm-fail'}`,
            title: this.t(r.pass ? 'passmark' : 'failmark'), 'aria-label': this.t(r.pass ? 'passmark' : 'failmark')},
        r.pass ? '✓' : '✗') : '';
        const row = el('li', {'class': 'tiny_algorithm-test'},
            el('div', {'class': 'tiny_algorithm-test-head'}, mark, el('span', {}, this.t('testcase', {n: i + 1})),
                el('code', {'class': 'tiny_algorithm-test-inputs'},
                    callText(tc) || inputLines(tc.inputs).join(', ') || this.t('noinputs'))));
        if (r && !r.pass) {
            const lines = (text) => normalize(text).split('\n').map((line, n) =>
                el('span', {'class': n === r.diffLine ? 'tiny_algorithm-diff-line' : ''}, `${line}\n`));
            row.append(el('div', {'class': 'tiny_algorithm-test-cols'},
                el('div', {}, el('span', {}, this.t('expected')),
                    el('pre', {'class': 'tiny_algorithm-test-out'}, lines(tc.expected))),
                el('div', {}, el('span', {}, this.t('actual')), el('pre', {'class': 'tiny_algorithm-test-out'}, lines(r.actual)))));
            if (r.error) {
                row.append(el('div', {'class': 'tiny_algorithm-error'}, `${tr('error', this.lang)}: ${r.error}`));
            } else if (r.diffLine >= 0) {
                row.append(el('div', {'class': 'tiny_algorithm-test-note'}, this.t('difffirst', {n: r.diffLine + 1})));
            }
        }
        return row;
    }
}
