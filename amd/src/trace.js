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
 * The trace table of the last run: one row per step with the block, the value of every variable and the output.
 *
 * @module tiny_algorithm/trace
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el, openDialog} from './dialog';
import {MAX_TRACE} from './session';
import {t} from './strings';

/**
 * A value as the table shows it (arrays shortened).
 *
 * @param {*} v value
 * @param {string} type type of the variable
 * @returns {string}
 */
const cell = (v, type) => {
    if (v === undefined) {
        return '';
    }
    if (Array.isArray(v)) {
        const items = v.slice(0, 6).map((x) => cell(x, type));
        return `[${items.join(', ')}${v.length > 6 ? ', …' : ''}]`;
    }
    if (typeof v === 'number' && !Number.isInteger(v)) {
        return String(Math.round(v * 1e10) / 1e10);
    }
    return type === 'String' ? `"${v}"` : String(v);
};

/**
 * The rows of the table as text: a header and one row per step, with the values after the step.
 *
 * @param {Array} trace steps of runSession
 * @returns {{head: string[], rows: Array<{id: string, cells: string[], changed: boolean[]}>}}
 */
export const traceRows = (trace) => {
    const names = [];
    [...trace, {vars: trace.after}].forEach((r) => (r.vars || []).forEach((v) => {
        if (!names.includes(v.name)) {
            names.push(v.name);
        }
    }));
    const head = ['#', t('traceblock'), ...names, t('traceoutput')];
    let before = new Map();
    const rows = trace.map((r, i) => {
        // The values when the next step starts are those after this one.
        const after = i < trace.length - 1 ? trace[i + 1].vars : trace.after || r.vars;
        const now = new Map((after || []).map((v) => [v.name, cell(v.value, v.type)]));
        const block = `${r.label}${r.branch ? ` → ${r.branch}` : ''}${r.input !== undefined ? ` ← ${r.input}` : ''}`;
        const values = names.map((n) => now.get(n) ?? '');
        const changed = names.map((n) => now.has(n) && before.has(n) && before.get(n) !== now.get(n));
        before = now;
        return {id: r.id, cells: [String(r.step), block, ...values, r.output.replace(/\n$/, '').replace(/\n/g, ' ⏎ ')],
            changed: [false, false, ...changed, false]};
    });
    return {head, rows};
};

/**
 * The table as CSV (comma separated, quoted).
 *
 * @param {Array} trace steps
 * @returns {string}
 */
export const traceCsv = (trace) => {
    const {head, rows} = traceRows(trace);
    const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    return [head, ...rows.map((r) => r.cells)].map((line) => line.map(q).join(',')).join('\n') + '\n';
};

/**
 * Open the trace table of the last run.
 *
 * @param {HTMLElement} host widget root
 * @param {Array} trace steps
 * @param {Object} options
 * @param {boolean} [options.cut] the run had more steps than the table keeps
 * @param {Function} [options.select] called with a block id when a row is chosen
 * @param {Function} [options.download] (name, text, type) saves a file
 */
export const openTrace = (host, trace, {cut = false, select = null, download = null} = {}) => {
    if (!trace.length) {
        openDialog(host, t('trace'), el('p', {}, t('traceempty')));
        return;
    }
    const {head, rows} = traceRows(trace);
    const table = el('table', {'class': 'tiny_algorithm-trace'},
        el('thead', {}, el('tr', {}, head.map((h) => el('th', {scope: 'col'}, h)))),
        el('tbody', {}, rows.map((r) => el('tr', {
            tabindex: '0', onclick: () => select && select(r.id),
            onkeydown: (e) => {
                if (e.key === 'Enter' && select) {
                    select(r.id);
                }
            },
        }, r.cells.map((c, i) => el(i === 0 ? 'th' : 'td', {'class': r.changed[i] ? 'tiny_algorithm-changed' : null,
            scope: i === 0 ? 'row' : null}, c))))));
    const text = [head, ...rows.map((r) => r.cells)].map((line) => line.join('\t')).join('\n');
    const copy = el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => null);
        }
    }}, t('copy'));
    const csv = download ? el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm',
        onclick: () => download('trace.csv', traceCsv(trace), 'text/csv')}, t('tracecsv')) : null;
    const note = el('p', {'class': 'tiny_algorithm-trace-note'},
        t(cut ? 'tracecut' : 'tracesteps', {count: String(trace.length), max: String(MAX_TRACE)}));
    openDialog(host, t('trace'), el('div', {}, el('div', {'class': 'tiny_algorithm-trace-wrap'}, table), note),
        [copy, csv].filter(Boolean));
};
