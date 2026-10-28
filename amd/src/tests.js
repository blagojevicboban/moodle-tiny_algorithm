/**
 * Test cases for an algorithm: inputs given by the teacher, expected output computed from the teacher's solution,
 * and the panel that edits them (teacher) or runs them against the student's version (student).
 *
 * @module tiny_algorithm/tests
 */
import {execute} from './interpreter';
import {decodeData, serialize} from './model';
import {t as tr} from './strings';

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

const fill = (text, values) => Object.entries(values).reduce((s, [k, v]) => s.replace(`{${k}}`, v), text);

/**
 * Normalise program output for comparison: Unix line ends, no trailing spaces, no trailing empty lines.
 *
 * @param {string} text output
 * @returns {string}
 */
export const normalize = (text) => String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
    .map((line) => line.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

/**
 * Split the inputs of a test (one value per line) into a list.
 *
 * @param {string} text inputs
 * @returns {string[]}
 */
export const parseInputs = (text) => {
    const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
};

/**
 * Run a program with the given inputs.
 *
 * @param {Object} program algorithm model
 * @param {string} inputs one value per line
 * @param {string} [lang] UI language for the error messages
 * @returns {{output: string, error: (string|null)}} output written so far, and the error that stopped the run
 */
export const runProgram = (program, inputs, lang = null) => {
    const queue = parseInputs(inputs);
    let output = '';
    try {
        const gen = execute(program, {maxSteps: MAX_STEPS});
        let res = gen.next();
        while (!res.done) {
            const ev = res.value;
            if (ev.event === 'output') {
                output += ev.text;
            }
            if (ev.event === 'input') {
                if (!queue.length) {
                    throw new Error(tr('noinput', lang));
                }
                res = gen.next(queue.shift());
            } else {
                res = gen.next();
            }
        }
        return {output, error: null};
    } catch (err) {
        return {output, error: err.message};
    }
};

/**
 * Index of the first line where two outputs differ.
 *
 * @param {string} expected expected output
 * @param {string} actual actual output
 * @returns {number} line index, or -1 when they are equal
 */
export const firstDiffLine = (expected, actual) => {
    const a = normalize(expected).split('\n');
    const b = normalize(actual).split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
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
 * @returns {Array} [{pass, actual, error, diffLine}]
 */
export const runTests = (program, tests, lang = null) => tests.map((tc) => {
    const {output, error} = runProgram(program, tc.inputs, lang);
    const diffLine = firstDiffLine(tc.expected, output);
    return {pass: !error && diffLine === -1, actual: output, error, diffLine};
});

/**
 * Fill in the expected output of every test by running the solution.
 *
 * @param {Object} solution the teacher's algorithm
 * @param {Array} tests [{inputs}]
 * @param {string} [lang] UI language for the error messages
 * @returns {{tests: Array, errors: Array}} tests with expected output, and [{index, error}] for runs that failed
 */
export const computeExpected = (solution, tests, lang = null) => {
    const errors = [];
    const result = tests.map((tc, index) => {
        const {output, error} = runProgram(solution, tc.inputs, lang);
        if (error) {
            errors.push({index, error});
        }
        return {inputs: String(tc.inputs ?? ''), expected: output};
    });
    return {tests: result, errors};
};

/**
 * Encode tests for the data-algorithm-tests attribute.
 *
 * @param {Array} tests [{inputs, expected}]
 * @returns {string}
 */
export const serializeTests = (tests) => serialize(tests.map((tc) => ({inputs: tc.inputs, expected: tc.expected})));

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
            .map((tc) => ({inputs: String(tc.inputs ?? ''), expected: String(tc.expected ?? '')})) : [];
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
     */
    constructor(host, {tests = [], mode = 'student', lang = null, getProgram = null, getSolution = null} = {}) {
        this.tests = tests.map((tc) => ({...tc}));
        this.mode = mode;
        this.lang = lang;
        this.getProgram = getProgram;
        this.getSolution = getSolution;
        this.results = null;
        this.root = el('div', {'class': `alg-tests alg-tests-${mode}`});
        host.append(this.root);
        this.render();
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
        return computeExpected(this.getSolution(), this.tests, this.lang);
    }

    /** Recompute the expected outputs from the solution and show any run that failed. */
    refreshExpected() {
        const {tests, errors} = this.getTests();
        this.tests = tests;
        this.results = null;
        this.errors = errors;
        this.render();
        return errors;
    }

    /** Run the tests against the student's program. */
    run() {
        this.results = runTests(this.getProgram(), this.tests, this.lang);
        this.render();
    }

    render() {
        const btn = (key, fn, cls = 'btn-secondary') => el('button', {type: 'button', 'class': `btn ${cls} btn-sm`, onclick: fn},
            this.t(key));
        const head = el('div', {'class': 'alg-tests-bar'}, el('strong', {}, this.t('tests')));
        if (this.mode === 'teacher') {
            head.append(btn('addtest', () => {
                this.tests.push({inputs: '', expected: ''});
                this.render();
                const areas = this.root.querySelectorAll('textarea');
                areas[areas.length - 1].focus();
            }), btn('refreshexpected', () => this.refreshExpected()));
        } else {
            head.append(btn('runtests', () => this.run(), 'btn-primary'));
            if (this.results) {
                const passed = this.results.filter((r) => r.pass).length;
                head.append(el('span', {'class': `alg-tests-summary ${passed === this.results.length ? 'alg-pass' : 'alg-fail'}`,
                    role: 'status'}, this.t('passed', {passed, total: this.results.length})));
            }
        }
        const list = el('ol', {'class': 'alg-tests-list'});
        this.tests.forEach((tc, i) => list.append(this.mode === 'teacher' ? this.teacherRow(tc, i) : this.studentRow(tc, i)));
        this.root.replaceChildren(head);
        if (!this.tests.length && this.mode === 'teacher') {
            this.root.append(el('p', {'class': 'alg-tests-empty'}, this.t('notests')));
        }
        this.root.append(list);
    }

    teacherRow(tc, i) {
        const error = (this.errors || []).find((e) => e.index === i);
        const inputs = el('textarea', {'class': 'form-control form-control-sm', rows: 3, placeholder: this.t('inputshint'),
            'aria-label': `${this.t('testcase', {n: i + 1})}: ${this.t('inputs')}`,
            oninput: () => {
                tc.inputs = inputs.value;
            }});
        inputs.value = tc.inputs;
        return el('li', {'class': 'alg-test'},
            el('div', {'class': 'alg-test-head'}, el('span', {}, this.t('testcase', {n: i + 1})),
                el('button', {type: 'button', 'class': 'btn btn-link btn-sm', onclick: () => {
                    this.tests.splice(i, 1);
                    this.errors = null;
                    this.render();
                }}, tr('delete', this.lang))),
            el('div', {'class': 'alg-test-cols'},
                el('label', {}, el('span', {}, this.t('inputs')), inputs),
                el('div', {}, el('span', {}, this.t('expected')), el('pre', {'class': 'alg-test-out'}, tc.expected))),
            error ? el('div', {'class': 'alg-error'}, this.t('solutionfails', {n: i + 1, error: error.error})) : '');
    }

    studentRow(tc, i) {
        const r = this.results && this.results[i];
        const mark = r ? el('span', {'class': `alg-test-mark ${r.pass ? 'alg-pass' : 'alg-fail'}`,
            title: this.t(r.pass ? 'passmark' : 'failmark'), 'aria-label': this.t(r.pass ? 'passmark' : 'failmark')},
        r.pass ? '✓' : '✗') : '';
        const row = el('li', {'class': 'alg-test'},
            el('div', {'class': 'alg-test-head'}, mark, el('span', {}, this.t('testcase', {n: i + 1})),
                el('code', {'class': 'alg-test-inputs'}, parseInputs(tc.inputs).join(', ') || this.t('noinputs'))));
        if (r && !r.pass) {
            const lines = (text) => normalize(text).split('\n').map((line, n) =>
                el('span', {'class': n === r.diffLine ? 'alg-diff-line' : ''}, `${line}\n`));
            row.append(el('div', {'class': 'alg-test-cols'},
                el('div', {}, el('span', {}, this.t('expected')), el('pre', {'class': 'alg-test-out'}, lines(tc.expected))),
                el('div', {}, el('span', {}, this.t('actual')), el('pre', {'class': 'alg-test-out'}, lines(r.actual)))));
            if (r.error) {
                row.append(el('div', {'class': 'alg-error'}, `${tr('error', this.lang)}: ${r.error}`));
            } else if (r.diffLine >= 0) {
                row.append(el('div', {'class': 'alg-test-note'}, this.t('difffirst', {n: r.diffLine + 1})));
            }
        }
        return row;
    }
}
