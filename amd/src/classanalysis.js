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
 * The Analysis tab of the class view of a quiz question (qtype_algorithm 2.24): how many students pass each test and
 * with which wrong outputs they fail, the errors, the missing structures, the grades, and the blocks of the solution
 * that the wrong answers do not have, drawn darker on the solution.
 *
 * @module tiny_algorithm/classanalysis
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el} from './dialog';
import {renderProgram} from './render';
import {t} from './strings';

/** Shades of the blocks of the solution: a block missing in at least this share of the wrong answers. */
export const HEAT_LEVELS = [0.1, 0.3, 0.5, 0.7];

/** Most blocks listed under the solution. */
const TOP_BLOCKS = 5;

/**
 * The shade of a block of the solution (0 to 4).
 *
 * @param {number} missing share of the wrong answers without a block like it
 * @returns {number}
 */
export const heatLevel = (missing) => HEAT_LEVELS.filter((x) => missing >= x).length;

/**
 * A share as a percent in the language of the user.
 *
 * @param {number} share 0 to 1
 * @param {string|null} lang
 * @returns {string}
 */
export const percent = (share, lang) => {
    try {
        return new Intl.NumberFormat(lang || undefined, {style: 'percent', maximumFractionDigits: 0}).format(share);
    } catch (e) {
        return `${Math.round(share * 100)} %`;
    }
};

/**
 * A number with at most one decimal.
 *
 * @param {number} n
 * @returns {string}
 */
const num = (n) => String(Math.round(n * 10) / 10);

/**
 * One CSV field.
 *
 * @param {*} value
 * @returns {string}
 */
const field = (value) => {
    const s = String(value ?? '');
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The analysis as CSV: one line for each test and wrong output, then the errors and the missing structures.
 *
 * @param {Object} a the analysis (qtype_algorithm_get_class_analysis)
 * @returns {string}
 */
export const analysisCsv = (a) => {
    const rows = [[t('anatest'), t('anainputs'), t('anapassed'), t('anafailed'), t('anaerrors'), t('anawrong'), t('anacount')]];
    for (const tc of a.tests) {
        const base = [tc.n, tc.label, tc.passed, tc.failed, tc.errors];
        if (!tc.outputs.length) {
            rows.push([...base, '', '']);
        }
        tc.outputs.forEach((o) => rows.push([...base, o.output, o.count]));
    }
    rows.push([]);
    rows.push([t('anaerrors'), t('anacount')]);
    a.errors.forEach((e) => rows.push([e.message, e.count]));
    if (a.structures.length) {
        rows.push([]);
        rows.push([t('anastructures'), t('anacount')]);
        a.structures.forEach((s) => rows.push([s.label || s.name, s.count]));
    }
    return rows.map((r) => r.map(field).join(',')).join('\r\n') + '\r\n';
};

/**
 * Bars of the grades (ten groups of 10 %).
 *
 * @param {number[]} histogram
 * @returns {HTMLElement}
 */
const gradeBars = (histogram) => {
    const top = Math.max(1, ...histogram);
    const list = el('ul', {'class': 'tiny_algorithm-ana-hist'});
    histogram.forEach((count, k) => {
        const text = t('anagradebar', {from: String(k * 10), to: String(k === 9 ? 100 : k * 10 + 9), count: String(count)});
        const bar = el('span', {'class': 'tiny_algorithm-ana-histbar' + (k === 9 ? ' tiny_algorithm-ana-full' : '')});
        bar.style.height = `${Math.round(count / top * 100)}%`;
        list.append(el('li', {title: text}, el('span', {'class': 'sr-only visually-hidden'}, text),
            el('span', {'class': 'tiny_algorithm-ana-histcol', 'aria-hidden': 'true'}, bar),
            el('span', {'class': 'tiny_algorithm-ana-histlabel', 'aria-hidden': 'true'}, String(k * 10))));
    });
    return list;
};

/**
 * The table of the tests.
 *
 * @param {Object} a the analysis
 * @param {string|null} lang
 * @returns {HTMLElement}
 */
const testsTable = (a, lang) => {
    const head = el('tr', {}, ...['anatest', 'anainputs', 'anapassed', 'anawrong'].map((k) => el('th', {scope: 'col'}, t(k))));
    const rows = a.tests.map((tc) => {
        const total = tc.passed + tc.failed;
        const share = total ? tc.passed / total : 0;
        const meter = el('span', {'class': 'tiny_algorithm-ana-meter', 'aria-hidden': 'true'},
            el('span', {'class': 'tiny_algorithm-ana-meterfill'}));
        meter.firstChild.style.width = `${Math.round(share * 100)}%`;
        const wrong = el('ul', {'class': 'tiny_algorithm-ana-outputs'},
            ...tc.outputs.map((o) => el('li', {}, el('code', {}, o.output === '' ? t('anaemptyoutput') : o.output),
                ' ', el('span', {'class': 'tiny_algorithm-ana-times'}, t('anatimes', {count: String(o.count)})))),
            tc.errors ? el('li', {'class': 'tiny_algorithm-ana-err'}, t('anatesterrors', {count: String(tc.errors)})) : null);
        return el('tr', {},
            el('th', {scope: 'row'}, String(tc.n),
                tc.hidden ? el('span', {'class': 'tiny_algorithm-ana-hidden'}, t('anahidden')) : null),
            el('td', {}, el('code', {}, tc.label || '—')),
            el('td', {'class': 'tiny_algorithm-ana-pass'}, meter, ' ',
                `${percent(share, lang)} (${tc.passed}/${total})`),
            el('td', {}, tc.outputs.length || tc.errors ? wrong : '—'));
    });
    return el('table', {'class': 'tiny_algorithm-ana-table'}, el('thead', {}, head), el('tbody', {}, ...rows));
};

/**
 * The solution with its blocks shaded by how many wrong answers miss them, and the most missed ones as text.
 *
 * @param {Object} a the analysis
 * @param {Object} solution the solution
 * @param {string|null} lang
 * @returns {HTMLElement}
 */
const heatMap = (a, solution, lang) => {
    const picture = el('div', {'class': 'tiny_algorithm-ana-heat', 'aria-hidden': 'true'});
    picture.innerHTML = renderProgram(solution);
    const items = [];
    for (const b of a.blocks) {
        const g = picture.querySelector(`g[data-id="${CSS.escape(b.id)}"]`);
        if (!g) {
            continue;
        }
        const level = heatLevel(b.missing);
        g.classList.add(`tiny_algorithm-heat-${level}`);
        const text = t('anaheatitem', {block: g.textContent.trim(), percent: percent(b.missing, lang)});
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = text;
        g.prepend(title);
        if (level > 0) {
            items.push({missing: b.missing, text});
        }
    }
    items.sort((x, y) => y.missing - x.missing);
    return el('div', {},
        el('p', {'class': 'tiny_algorithm-ana-note'}, t('anaheatnote')),
        picture,
        items.length ? el('ol', {'class': 'tiny_algorithm-ana-missed'},
            ...items.slice(0, TOP_BLOCKS).map((x) => el('li', {}, x.text))) : el('p', {}, t('ananone')));
};

/**
 * Draw the analysis.
 *
 * @param {HTMLElement} box where it goes
 * @param {Object} a the analysis (qtype_algorithm_get_class_analysis)
 * @param {Object} opts
 * @param {string|null} [opts.lang] UI language code
 * @param {Function} [opts.download] (name, text, type) saves a file
 */
export const drawAnalysis = (box, a, {lang = null, download = null} = {}) => {
    if (!a || !a.count) {
        box.replaceChildren(el('p', {'class': 'tiny_algorithm-class-empty'}, t('anaempty')));
        return;
    }
    let solution = null;
    try {
        solution = JSON.parse(a.solution);
    } catch (e) {
        solution = null;
    }
    const section = (title, ...kids) => el('section', {'class': 'tiny_algorithm-ana-section'},
        el('h3', {'class': 'tiny_algorithm-ana-title'}, title), ...kids);
    const facts = [
        t('anasummary', {count: String(a.count), graded: String(a.graded), failing: String(a.failing)}),
        t('anablocks', {answers: num(a.medianblocks), solution: String(a.solutionblocks), steps: num(a.mediansteps)}),
        a.norun ? t('ananorun', {count: String(a.norun)}) : null,
        a.efficiency ? t('anaefficiency', {count: String(a.efficiency)}) : null,
        a.otherversions ? t('anaother', {count: String(a.otherversions)}) : null,
    ].filter(Boolean);
    const csv = download ? el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm',
        onclick: () => download('analysis.csv', analysisCsv(a), 'text/csv;charset=utf-8')}, t('anacsv')) : null;
    // Sections without data are null; replaceChildren() would show them as the text "null".
    box.replaceChildren(...[
        el('div', {'class': 'tiny_algorithm-ana-facts'}, el('ul', {}, ...facts.map((f) => el('li', {}, f))), csv),
        a.graded ? section(t('anagrades'), gradeBars(a.histogram)) : null,
        a.tests.length ? section(t('anatests'), el('div', {'class': 'tiny_algorithm-ana-scroll'}, testsTable(a, lang))) : null,
        a.errors.length ? section(t('anaerrors'), el('ol', {'class': 'tiny_algorithm-ana-errors'},
            ...a.errors.map((e) => el('li', {}, el('code', {}, e.message), ' ',
                el('span', {'class': 'tiny_algorithm-ana-times'}, t('anatimes', {count: String(e.count)})))))) : null,
        a.structures.length ? section(t('anastructures'), el('ul', {},
            ...a.structures.map((s) => el('li', {}, `${s.label || s.name}: `,
                el('span', {'class': 'tiny_algorithm-ana-times'}, t('anatimes', {count: String(s.count)})))))) : null,
        solution && a.blocks.length ? section(t('anaheat'), heatMap(a, solution, lang)) : null,
    ].filter(Boolean));
};
