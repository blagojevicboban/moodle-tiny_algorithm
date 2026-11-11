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
 * The class view of an exercise (filter_algorithm 2.15): the teacher sees the copies the students are changing, as
 * small diagrams with the result of the tests, refreshed every few seconds, and shows one of them large (on the
 * projector), with the names hidden when wanted.
 *
 * @module tiny_algorithm/classview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el, openDialog} from './dialog';
import {renderProgram} from './render';
import {runTests} from './tests';
import {AlgorithmRunner} from './runner';
import {t} from './strings';

/** Seconds between two refreshes while the class view is open. */
export const REFRESH_SECONDS = 10;

/**
 * A copy as the server keeps it (JSON), or null when it is not an algorithm.
 *
 * @param {string} text
 * @returns {?Object}
 */
export const parseCopy = (text) => {
    try {
        const program = JSON.parse(text);
        return program && Array.isArray(program.functions) ? program : null;
    } catch (e) {
        return null;
    }
};

/**
 * Passed tests of a copy, worked out once for each version of it.
 *
 * @param {Map} cache program text => result
 * @param {string} text the copy (JSON)
 * @param {Object} program the copy
 * @param {Array} tests the tests of the exercise
 * @returns {?{passed: number, total: number}}
 */
export const testSummary = (cache, text, program, tests) => {
    if (!tests || !tests.length) {
        return null;
    }
    if (!cache.has(text)) {
        let passed = 0;
        try {
            passed = runTests(program, tests).filter((r) => r.pass).length;
        } catch (e) {
            passed = 0;
        }
        cache.set(text, {passed, total: tests.length});
    }
    return cache.get(text);
};

/**
 * The time of a copy as the class view shows it (hours and minutes, or the date when it is older than a day).
 *
 * @param {number} seconds Unix time
 * @param {number} [now] Unix time now
 * @returns {string}
 */
export const timeText = (seconds, now = Date.now() / 1000) => {
    const d = new Date(seconds * 1000);
    const two = (n) => String(n).padStart(2, '0');
    return now - seconds < 86400 ? `${two(d.getHours())}:${two(d.getMinutes())}` : `${d.getDate()}.${d.getMonth() + 1}.`;
};

/**
 * Open the class view.
 *
 * @param {HTMLElement} host widget root
 * @param {Object} opts
 * @param {Function} opts.load returns a Promise of the copies: [{userid, fullname, program (JSON), timemodified}]
 * @param {Array} [opts.tests] the tests of the exercise
 * @param {string|null} [opts.lang] UI language code
 * @param {Object} [opts.codeConfig] code languages for the large view
 */
export const openClassView = (host, {load, tests = [], lang = null, codeConfig = {}}) => {
    const cache = new Map();
    let hidden = false;
    try {
        hidden = window.localStorage.getItem('tiny_algorithm_classnames') === 'hidden';
    } catch (e) {
        hidden = false;
    }
    const grid = el('div', {'class': 'tiny_algorithm-class-grid'});
    const status = el('span', {'class': 'tiny_algorithm-class-status', role: 'status'});
    const names = el('input', {type: 'checkbox', id: 'tiny_algorithm-class-names', checked: hidden, onchange: () => {
        hidden = names.checked;
        try {
            window.localStorage.setItem('tiny_algorithm_classnames', hidden ? 'hidden' : 'shown');
        } catch (e) {
            // The choice then only lasts while the view is open.
        }
        draw();
    }});
    let copies = [];
    const showLarge = (copy, label) => {
        const program = parseCopy(copy.program);
        const box = el('div', {'class': 'tiny_algorithm-class-large'});
        openDialog(host, label, box);
        new AlgorithmRunner(box, program, {lang, codeConfig});
    };
    const draw = () => {
        if (!copies.length) {
            grid.replaceChildren(el('p', {'class': 'tiny_algorithm-class-empty'}, t('classempty')));
            return;
        }
        grid.replaceChildren(...copies.map((copy, i) => {
            const program = parseCopy(copy.program);
            const label = hidden ? t('classstudent', {n: String(i + 1)}) : copy.fullname;
            const summary = program ? testSummary(cache, copy.program, program, tests) : null;
            const picture = el('div', {'class': 'tiny_algorithm-class-picture', 'aria-hidden': 'true'});
            picture.innerHTML = program ? renderProgram(program) : '';
            const badge = summary ? el('span', {'class': 'tiny_algorithm-class-tests ' +
                (summary.passed === summary.total ? 'tiny_algorithm-class-pass' : 'tiny_algorithm-class-fail')},
            t('classtests', {passed: String(summary.passed), total: String(summary.total)})) : '';
            return el('button', {type: 'button', 'class': 'tiny_algorithm-class-card', disabled: !program,
                'aria-label': `${label}, ${timeText(copy.timemodified)}`, onclick: () => showLarge(copy, label)},
            el('span', {'class': 'tiny_algorithm-class-head'}, el('strong', {}, label),
                el('span', {'class': 'tiny_algorithm-class-time'}, timeText(copy.timemodified))), badge, picture);
        }));
    };
    let timer = null;
    let dialog = null;
    const refresh = async() => {
        try {
            copies = await load();
            status.textContent = t('classcount', {count: String(copies.length)});
        } catch (e) {
            status.textContent = t('classerror');
        }
        if (dialog && dialog.root.isConnected) {
            draw();
            timer = setTimeout(refresh, REFRESH_SECONDS * 1000);
        }
    };
    const body = el('div', {'class': 'tiny_algorithm-class'},
        el('div', {'class': 'tiny_algorithm-class-bar'}, status,
            el('label', {'for': 'tiny_algorithm-class-names', 'class': 'tiny_algorithm-class-hide'}, names, ' ', t('classhide')),
            el('span', {'class': 'tiny_algorithm-class-note'}, t('classnote', {seconds: String(REFRESH_SECONDS)}))),
        grid);
    dialog = openDialog(host, t('classtitle'), body);
    dialog.root.classList.add('tiny_algorithm-class-dialog');
    grid.append(el('p', {'class': 'tiny_algorithm-class-empty'}, t('classloading')));
    // Closing the view ends the refreshing.
    const observer = new MutationObserver(() => {
        if (!dialog.root.isConnected) {
            clearTimeout(timer);
            observer.disconnect();
        }
    });
    observer.observe(host, {childList: true});
    refresh();
};
