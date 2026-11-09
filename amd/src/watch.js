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
 * Variable watch: a small table with the current value of every variable while an algorithm runs.
 * Values that changed since the previous step are highlighted.
 *
 * @module tiny_algorithm/watch
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t as tr} from './strings';

const MAX_ITEMS = 12;
// A matrix is shown as a small table of at most this many rows and columns.
const MAX_CELLS = 8;
// A deeper call stack shows its first two and its last calls.
const MAX_STACK = 8;

// Length of an array of a snapshot: the interpreter copies only the start of a long array (fullLength).
const sizeOf = (a) => (a.fullLength === undefined ? a.length : a.fullLength);

const isMatrix = (value) => Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);

/**
 * Format a variable value for display.
 *
 * @param {*} value the value (an array for array variables)
 * @param {string} type Integer, Real, String or Boolean
 * @returns {string}
 */
const formatValue = (value, type) => {
    if (Array.isArray(value)) {
        const shown = value.slice(0, MAX_ITEMS).map((v) => formatValue(v, type)).join(', ');
        return `[${shown}${sizeOf(value) > MAX_ITEMS ? `, … (${sizeOf(value)})` : ''}]`;
    }
    if (type === 'String') {
        return JSON.stringify(String(value));
    }
    return typeof value === 'number' && !Number.isInteger(value) ? String(Math.round(value * 1e10) / 1e10) : String(value);
};

export class Watch {
    /**
     * @param {string|null} lang UI language code
     */
    constructor(lang = null) {
        this.lang = lang;
        this.previous = new Map();
        this.root = document.createElement('div');
        this.root.className = 'tiny_algorithm-watch';
        this.clear();
    }

    /** Forget the previous values and show the hint. */
    clear() {
        this.previous = new Map();
        const hint = document.createElement('p');
        hint.className = 'tiny_algorithm-watch-empty';
        hint.textContent = tr('watchempty', this.lang);
        this.root.replaceChildren(hint);
    }

    /**
     * Show the given variables.
     *
     * @param {Array<{name: string, type: string, value: *}>} vars snapshot sent by the interpreter
     * @param {string[]} [stack] calls running now, the current one last
     */
    update(vars, stack = []) {
        if (!Array.isArray(vars)) {
            return;
        }
        if (!vars.length && !(stack && stack.length > 1)) {
            this.clear();
            return;
        }
        const table = document.createElement('table');
        const body = document.createElement('tbody');
        const next = new Map();
        for (const v of vars) {
            const row = document.createElement('tr');
            const name = document.createElement('th');
            name.scope = 'row';
            name.textContent = v.name;
            const value = document.createElement('td');
            if (isMatrix(v.value)) {
                const cells = v.value.map((r) => r.map((x) => formatValue(x, v.type)));
                next.set(v.name, cells);
                value.append(this.matrix(cells, this.previous.get(v.name), v.value));
            } else {
                const text = formatValue(v.value, v.type);
                next.set(v.name, text);
                value.textContent = text;
                if (this.previous.has(v.name) && this.previous.get(v.name) !== text) {
                    value.className = 'tiny_algorithm-changed';
                }
            }
            row.append(name, value);
            body.append(row);
        }
        table.append(body);
        this.previous = next;
        this.root.replaceChildren(...this.stackTrail(stack), table);
    }

    /**
     * The calls running now (Main › Fact(5) › Fact(4)), shown when a function was called; a deep stack keeps its start
     * and its end.
     *
     * @param {string[]} stack calls, the current one last
     * @returns {HTMLElement[]}
     */
    stackTrail(stack) {
        if (!Array.isArray(stack) || stack.length < 2) {
            return [];
        }
        const shown = stack.length > MAX_STACK ? [...stack.slice(0, 2), '…', ...stack.slice(-(MAX_STACK - 3))] : stack;
        const trail = document.createElement('div');
        trail.className = 'tiny_algorithm-stack';
        trail.setAttribute('aria-label', tr('callstack', this.lang));
        shown.forEach((call, i) => {
            if (i) {
                const sep = document.createElement('span');
                sep.className = 'tiny_algorithm-stack-sep';
                sep.textContent = '›';
                sep.setAttribute('aria-hidden', 'true');
                trail.append(sep);
            }
            const item = document.createElement(i === shown.length - 1 ? 'strong' : 'span');
            item.textContent = call;
            trail.append(item);
        });
        return [trail];
    }

    /**
     * Table of a matrix; cells that changed since the previous step are highlighted.
     *
     * @param {string[][]} cells formatted values
     * @param {*} before formatted values of the previous step
     * @param {Array} [source] the matrix of the snapshot (its rows may be shortened, see sizeOf)
     * @returns {HTMLTableElement}
     */
    matrix(cells, before, source = cells) {
        const table = document.createElement('table');
        table.className = 'tiny_algorithm-matrix';
        const old = Array.isArray(before) ? before : null;
        cells.slice(0, MAX_CELLS).forEach((r, i) => {
            const tr = document.createElement('tr');
            r.slice(0, MAX_CELLS).forEach((text, j) => {
                const td = document.createElement('td');
                td.textContent = text;
                if (old && old[i] && old[i][j] !== text) {
                    td.className = 'tiny_algorithm-changed';
                }
                tr.append(td);
            });
            const width = source[i] ? sizeOf(source[i]) : r.length;
            if (width > MAX_CELLS) {
                const more = document.createElement('td');
                more.textContent = `… (${width})`;
                tr.append(more);
            }
            table.append(tr);
        });
        if (sizeOf(source) > MAX_CELLS) {
            const tr = document.createElement('tr');
            const more = document.createElement('td');
            more.colSpan = Math.min(cells[0].length, MAX_CELLS);
            more.textContent = `… (${sizeOf(source)})`;
            tr.append(more);
            table.append(tr);
        }
        return table;
    }
}
