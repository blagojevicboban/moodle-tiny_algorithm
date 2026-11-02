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
        return `[${shown}${value.length > MAX_ITEMS ? `, … (${value.length})` : ''}]`;
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
        this.root.setAttribute('aria-live', 'polite');
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
     */
    update(vars) {
        if (!Array.isArray(vars)) {
            return;
        }
        if (!vars.length) {
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
                value.append(this.matrix(cells, this.previous.get(v.name)));
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
        this.root.replaceChildren(table);
    }

    /**
     * Table of a matrix; cells that changed since the previous step are highlighted.
     *
     * @param {string[][]} cells formatted values
     * @param {*} before formatted values of the previous step
     * @returns {HTMLTableElement}
     */
    matrix(cells, before) {
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
            if (r.length > MAX_CELLS) {
                const more = document.createElement('td');
                more.textContent = `… (${r.length})`;
                tr.append(more);
            }
            table.append(tr);
        });
        if (cells.length > MAX_CELLS) {
            const tr = document.createElement('tr');
            const more = document.createElement('td');
            more.colSpan = Math.min(cells[0].length, MAX_CELLS);
            more.textContent = `… (${cells.length})`;
            tr.append(more);
            table.append(tr);
        }
        return table;
    }
}
