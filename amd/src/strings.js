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
 * UI strings of the editor widget. In Moodle they come from the language files (ui_* strings of tiny_algorithm, loaded by
 * tiny_algorithm/langstrings); the English table below is the fallback that keeps the widget and its tests working
 * without Moodle.
 *
 * @module tiny_algorithm/strings
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export const STR = {
    en: {
        reset: 'Reset', showcode: 'Show code', hidecode: 'Hide code', variables: 'Variables', showwatch: 'Show variables',
        hidewatch: 'Hide variables', watchempty: 'Run or step the algorithm to see the variables.', zoomin: 'Zoom in',
        zoomout: 'Zoom out', zoomreset: 'Reset zoom (100%)', fit: 'Fit', undo: 'Undo', redo: 'Redo', run: 'Run', step: 'Step',
        stop: 'Stop', addfn: '+ Function', delfn: '− Function',
        'import': 'Import .fprg', 'export': 'Export .fprg', copy: 'Copy', download: 'Download', speed: 'Speed',
        console: 'Console', code: 'Code', 'function': 'Function', name: 'Name', params: 'Parameters (a: Integer, b: Real)',
        returns: 'Return type', hint: 'Click a + to insert a block, click a block to edit it.',
        up: 'Up', down: 'Down', 'delete': 'Delete', imported: 'Flowgorithm file imported.', stopped: 'Stopped.',
        finished: 'Program finished.', error: 'Error',
        'f.name': 'Name', 'f.varType': 'Type', 'f.size': 'Array size (empty = single value)', 'f.target': 'Variable',
        'f.expr': 'Expression', 'f.newline': 'New line', 'f.cond': 'Condition', 'f.variable': 'Variable', 'f.start': 'From',
        'f.end': 'To', 'f.step': 'Step', 'f.text': 'Text',
        'b.declare': 'Declare', 'b.assign': 'Assign', 'b.input': 'Input', 'b.output': 'Output', 'b.if': 'If',
        'b.for': 'For', 'b.while': 'While', 'b.dowhile': 'Do … While', 'b.call': 'Call', 'b.return': 'Return',
        'b.comment': 'Comment',
        edit: 'Edit', done: 'Done editing', resetwork: 'Restore original',
        resetconfirm: 'Discard your changes and restore the original algorithm?', modified: 'Your version',
        fullscreen: 'Full screen', exitfullscreen: 'Exit full screen', showsolution: 'Show solution',
        hidesolution: 'Hide solution', solutionconfirm: "Show the teacher's solution?", solution: 'Solution', tests: 'Tests',
        runtests: 'Test', testcase: 'Test {n}', passed: '{passed} of {total} tests passed', inputs: 'Input',
        inputshint: 'One value per line, "" for an empty value',
        expected: 'Expected output', actual: 'Your output', noinputs: '(no input)',
        stale: 'You changed the algorithm since this run. Test again.',
        hiddentest: 'Hidden from students',
        addtest: '+ Test', refreshexpected: 'Compute expected outputs',
        notests: 'No tests yet. Enter the inputs; the expected outputs are computed from the solution.',
        noinput: 'The algorithm asks for more input than the test provides.', difffirst: 'First difference in line {n}.',
        insertblock: 'Insert block', passmark: 'Passed', failmark: 'Failed',
        solutionfails: 'The solution fails on test {n}: {error}',
    },
};

/** Strings loaded from Moodle (key without the ui_ prefix => text). */
let loaded = {};

/**
 * Language string identifier in lang/<lang>/tiny_algorithm.php for a widget key ('f.name' => 'ui_f_name').
 *
 * @param {string} key widget key
 * @returns {string}
 */
export const langKey = (key) => `ui_${key.replace(/\./g, '_')}`;

/**
 * Use these strings instead of the English fallback.
 *
 * @param {Object} strings widget key => text
 */
export const setStrings = (strings) => {
    loaded = {...loaded, ...strings};
};

/**
 * Fill {$a->name} (Moodle) and {name} placeholders.
 *
 * @param {string} text string with placeholders
 * @param {Object} values name => value
 * @returns {string}
 */
export const fill = (text, values = {}) => Object.entries(values).reduce(
    (s, [k, v]) => s.split(`{$a->${k}}`).join(v).split(`{${k}}`).join(v), text);

/**
 * Text of a widget string. The language is the one Moodle loaded for the user (the second argument is kept for older
 * callers and ignored).
 *
 * @param {string} key widget key
 * @param {string|Object} [values] placeholder values (a language code from older callers is ignored)
 * @returns {string}
 */
export const t = (key, values) => {
    const text = loaded[key] ?? STR.en[key] ?? key;
    return values && typeof values === 'object' ? fill(text, values) : text;
};
