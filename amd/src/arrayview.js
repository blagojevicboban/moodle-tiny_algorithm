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
 * The array panel: the arrays and matrices of the running function drawn while the algorithm runs or steps. Numbers
 * are bars, other values boxes; the elements the last block read are yellow, those it wrote green, and the variables
 * used as an index of an array (i, j, low, high) point at their element. A comment "@range low high" marks the part of
 * an array between two index variables with a bracket under its elements.
 *
 * @module tiny_algorithm/arrayview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

/** Most elements drawn with their value (more elements are drawn as bars only). */
const LABELLED = 40;

/** Height of the tallest bar, in rem. */
const BAR_REM = 6;

/** Most arrays the panel draws. */
const MAX_ARRAYS = 6;

const hasText = (s) => s !== undefined && s !== null && String(s).trim() !== '';

/**
 * Does a program use arrays (a Declare with a size, or an array parameter)?
 *
 * @param {Object} program
 * @returns {boolean}
 */
export const usesArrays = (program) => {
    const visit = (list) => (list || []).some((b) => (b.type === 'declare' && hasText(b.size)) ||
        ['then', 'else', 'body'].some((k) => visit(b[k])));
    return Boolean(program && program.functions && program.functions.some((f) =>
        (f.params || []).some((p) => p.array) || visit(f.body)));
};

/**
 * The variables used as the index of each array, from the expressions of the blocks: a[i], a[j + 1] and a[i, j]
 * give i and j for a.
 *
 * @param {Object} program
 * @returns {Map<string, string[]>} array name (lower case) => index variable names (lower case)
 */
export const indexNames = (program) => {
    const found = new Map();
    const add = (array, name) => {
        const key = array.toLowerCase();
        if (!found.has(key)) {
            found.set(key, []);
        }
        if (name && !found.get(key).includes(name.toLowerCase())) {
            found.get(key).push(name.toLowerCase());
        }
    };
    const scan = (text) => {
        const re = /([A-Za-z_]\w*)\s*\[([^\]]*)\]/g;
        let m;
        while ((m = re.exec(String(text)))) {
            const array = m[1];
            m[2].split(',').forEach((part) => {
                const name = /^\s*([A-Za-z_]\w*)\s*(?:[+-]\s*\d+\s*)?$/.exec(part);
                add(array, name ? name[1] : null);
            });
        }
    };
    const visit = (list) => (list || []).forEach((b) => {
        Object.entries(b).forEach(([k, v]) => {
            if (typeof v === 'string' && !['id', 'type', 'text'].includes(k)) {
                scan(v);
            }
        });
        ['then', 'else', 'body'].forEach((k) => visit(b[k]));
    });
    ((program && program.functions) || []).forEach((f) => visit(f.body));
    return found;
};

/**
 * The ranges marked in the comments of the blocks: "@range low high" in the comment of a block (or in a Comment block)
 * marks the part of the arrays between the values of two index variables, as binary search and two pointers use it;
 * "@range a low high" marks it only in the array a.
 *
 * @param {Object} program
 * @returns {Array<{array: ?string, low: string, high: string}>} names in lower case, each range once
 */
export const rangeMarkers = (program) => {
    const found = [];
    const scan = (text) => {
        const re = /@range\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)(?:[ \t]+([A-Za-z_]\w*))?/gi;
        let m;
        while ((m = re.exec(String(text || '')))) {
            const names = m.slice(1).filter(Boolean).map((n) => n.toLowerCase());
            const range = names.length === 3 ? {array: names[0], low: names[1], high: names[2]}
                : {array: null, low: names[0], high: names[1]};
            if (!found.some((r) => r.array === range.array && r.low === range.low && r.high === range.high)) {
                found.push(range);
            }
        }
    };
    const visit = (list) => (list || []).forEach((b) => {
        scan(b.note);
        if (b.type === 'comment') {
            scan(b.text);
        }
        ['then', 'else', 'body'].forEach((k) => visit(b[k]));
    });
    ((program && program.functions) || []).forEach((f) => visit(f.body));
    return found;
};

/**
 * The elements of an array in a range at a step: from the value of the low variable to the value of the high one,
 * inside the array.
 *
 * @param {{low: string, high: string}} range
 * @param {Map<string, {value: number}>} ints integer variables of the step by lower-case name
 * @param {number} length elements of the array
 * @returns {?{from: number, to: number}} null when a variable has no integer value or the range is empty (low > high)
 */
export const rangeAt = (range, ints, length) => {
    const low = ints.get(range.low);
    const high = ints.get(range.high);
    if (!low || !high) {
        return null;
    }
    const from = Math.max(0, low.value);
    const to = Math.min(length - 1, high.value);
    return from <= to ? {from, to} : null;
};

const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text !== undefined) {
        e.textContent = text;
    }
    return e;
};

/**
 * Is an element a record (sent as {fields, values} by the interpreter)?
 *
 * @param {*} v
 * @returns {boolean}
 */
export const isRecord = (v) => Boolean(v && typeof v === 'object' && Array.isArray(v.fields) && Array.isArray(v.values));

/**
 * The shade of a number of a matrix between the smallest and the largest (0 to 4), for the heat map.
 *
 * @param {number} x
 * @param {number} lo smallest
 * @param {number} hi largest
 * @returns {number}
 */
export const heat = (x, lo, hi) => (hi > lo ? Math.min(4, Math.floor(((x - lo) / (hi - lo)) * 5)) : 0);

/**
 * The counters of a run as text (comparisons, swaps, reads and writes of elements).
 *
 * @param {{compares: number, swaps: number, reads: number, writes: number}} c
 * @param {string|null} lang
 * @returns {string}
 */
export const countsText = (c, lang = null) => t('arraycounts', {compares: String(c.compares), swaps: String(c.swaps),
    reads: String(c.reads), writes: String(c.writes)}, lang);

/**
 * A value as the panel shows it.
 *
 * @param {*} v
 * @returns {string}
 */
const show = (v) => {
    if (isRecord(v)) {
        return v.values.map(show).join(', ');
    }
    if (typeof v === 'number' && !Number.isInteger(v)) {
        return String(Math.round(v * 1000) / 1000);
    }
    return String(v);
};

export class ArrayView {
    /**
     * @param {Object} program the algorithm (for the index variables)
     * @param {string|null} lang UI language code
     */
    constructor(program, lang = null) {
        this.lang = lang;
        this.indexes = indexNames(program);
        this.ranges = rangeMarkers(program);
        this.root = el('div', 'tiny_algorithm-arrays');
        this.empty = el('p', 'tiny_algorithm-arrays-empty', t('arraysempty', null, lang));
        // Comparisons, swaps, reads and writes since the start of the run (the interpreter counts them).
        this.counts = el('p', 'tiny_algorithm-array-counts');
        this.counts.setAttribute('aria-live', 'off');
        this.reset();
    }

    /** No arrays yet (before a run). */
    reset() {
        this.boxes = new Map();
        this.counts.textContent = '';
        this.root.replaceChildren(this.empty);
    }

    /**
     * Draw the arrays of a step (or of the end) of the interpreter (execute with track).
     *
     * @param {{arrays: ?Array, access: ?Array, vars: ?Array}} ev
     */
    update(ev) {
        const arrays = (ev.arrays || []).slice(0, MAX_ARRAYS);
        if (ev.counts) {
            this.counts.textContent = countsText(ev.counts, this.lang);
        }
        if (!arrays.length) {
            // A function without arrays is running: the counters stay.
            this.boxes = new Map();
            this.root.replaceChildren(this.empty, ...(this.counts.textContent ? [this.counts] : []));
            return;
        }
        const ints = new Map((ev.vars || []).filter((v) => typeof v.value === 'number' && Number.isInteger(v.value))
            .map((v) => [v.name.toLowerCase(), v]));
        const seen = new Set();
        const parts = arrays.map((a) => {
            const key = `${a.name.toLowerCase()}/${a.dims}/${a.value.length}/${a.dims === 2 && a.value[0] ? a.value[0].length : 0}`;
            seen.add(key);
            let box = this.boxes.get(key);
            if (!box) {
                box = this.build(a);
                this.boxes.set(key, box);
            }
            const access = (ev.access || []).filter((x) => x.name.toLowerCase() === a.name.toLowerCase());
            const name = a.name.toLowerCase();
            const ranges = a.dims === 1 ? this.ranges.filter((r) => r.array === null || r.array === name) : [];
            // The variables of a range point at their element too (low and high are often not an index).
            const names = [...new Set([...(this.indexes.get(name) || []), ...ranges.flatMap((r) => [r.low, r.high])])];
            const pointers = names.map((n) => ints.get(n)).filter(Boolean);
            const range = ranges.map((r) => ({...r, ...rangeAt(r, ints, a.value.length)})).find((r) => r.from !== undefined);
            this.fill(box, a, access, pointers, range || null);
            return box.root;
        });
        [...this.boxes.keys()].filter((k) => !seen.has(k)).forEach((k) => this.boxes.delete(k));
        this.root.replaceChildren(...parts, ...(this.counts.textContent ? [this.counts] : []));
    }

    /**
     * The elements of one array (built once; later steps only change them, so the bars move smoothly).
     *
     * @param {Object} a array of the step
     * @returns {Object}
     */
    build(a) {
        const box = {root: el('div', 'tiny_algorithm-array'), cells: []};
        box.title = el('div', 'tiny_algorithm-array-title');
        box.note = el('div', 'tiny_algorithm-array-note');
        box.root.append(box.title);
        if (a.dims === 1 && a.value.length && a.value.every(isRecord)) {
            // An array of records: a table, a row for each element and a column for each field.
            box.table = el('table', 'tiny_algorithm-array-table');
            const head = el('tr');
            head.append(el('th', '', '#'), ...a.value[0].fields.map((f) => el('th', '', f)));
            box.table.append(el('thead'), el('tbody'));
            box.table.tHead.append(head);
            a.value.forEach((x, i) => {
                const row = el('tr');
                row.append(el('th', 'tiny_algorithm-array-index', String(i)), ...x.values.map(() => el('td')));
                box.table.tBodies[0].append(row);
                box.cells.push(row);
            });
            box.root.append(box.table);
            box.row = box.table;
        } else if (a.dims === 2) {
            box.grid = el('div', 'tiny_algorithm-array-grid');
            const cols = a.value[0] ? a.value[0].length : 0;
            box.grid.style.gridTemplateColumns = `repeat(${cols}, minmax(1.6rem, auto))`;
            a.value.forEach((row) => row.forEach(() => {
                const c = el('div', 'tiny_algorithm-array-box');
                box.grid.append(c);
                box.cells.push(c);
            }));
            box.root.append(box.grid);
        } else {
            box.row = el('div', 'tiny_algorithm-array-row');
            a.value.forEach((x, i) => {
                const cell = el('div', 'tiny_algorithm-array-cell');
                cell.value = el('span', 'tiny_algorithm-array-value');
                cell.bar = el('div', 'tiny_algorithm-array-bar');
                cell.index = el('span', 'tiny_algorithm-array-index', String(i));
                cell.pointer = el('span', 'tiny_algorithm-array-pointer');
                cell.append(cell.value, cell.bar, cell.index, cell.pointer);
                box.row.append(cell);
                box.cells.push(cell);
            });
            box.root.append(box.row);
        }
        box.root.append(box.note);
        // The drawing is for the eyes; a screen reader gets the values as text.
        (box.row || box.grid).setAttribute('aria-hidden', 'true');
        box.text = el('span', 'sr-only visually-hidden');
        box.root.append(box.text);
        return box;
    }

    /**
     * Show the values of a step, the elements read and written, and the index variables.
     *
     * @param {Object} box
     * @param {Object} a array of the step
     * @param {Array} access elements of this array the last block read or wrote
     * @param {Array} pointers integer variables used as its index
     * @param {?Object} [range] the part marked by "@range" ({low, high, from, to}), for a one-dimensional array
     */
    fill(box, a, access, pointers, range = null) {
        const mark = (cell, hit) => {
            cell.classList.toggle('tiny_algorithm-array-read', hit === 'r');
            cell.classList.toggle('tiny_algorithm-array-written', hit === 'w');
        };
        const hitAt = (i, j) => {
            const found = access.filter((x) => x.i === i && (j === undefined || x.j === j));
            if (found.some((x) => x.kind === 'w')) {
                return 'w';
            }
            return found.length ? 'r' : '';
        };
        const size = a.dims === 2 ? `${a.length} × ${a.value[0] ? a.value[0].length : 0}` : String(a.length);
        box.title.textContent = `${a.name}[${size}]`;
        box.note.textContent = a.length > a.value.length ? t('arraycut', {shown: String(a.value.length),
            length: String(a.length)}, this.lang) : '';
        box.note.hidden = !box.note.textContent;
        if (box.table) {
            a.value.forEach((x, i) => {
                const row = box.cells[i];
                (isRecord(x) ? x.values : []).forEach((v, k) => {
                    row.cells[k + 1].textContent = show(v);
                });
                mark(row, hitAt(i));
                const here = pointers.filter((p) => p.value === i).map((p) => p.name);
                row.cells[0].textContent = here.length ? `${i} ←${here.join(',')}` : String(i);
            });
            box.text.textContent = t('arrayvalues', {name: a.name, values: a.value.map((x) => `(${show(x)})`).join(', ')},
                this.lang);
            return;
        }
        if (a.dims === 2) {
            // A matrix of numbers is also a heat map: the larger a number, the darker its box.
            const flat = a.value.flat().filter((x) => typeof x === 'number' && Number.isFinite(x));
            const all = flat.length === a.value.flat().length && flat.length > 0;
            const lo = all ? Math.min(...flat) : 0;
            const hi = all ? Math.max(...flat) : 0;
            let k = 0;
            a.value.forEach((row, i) => row.forEach((x, j) => {
                const c = box.cells[k++];
                c.textContent = show(x);
                for (let h = 0; h < 5; h++) {
                    c.classList.toggle(`tiny_algorithm-heat${h}`, all && heat(x, lo, hi) === h);
                }
                mark(c, hitAt(i, j));
            }));
            box.text.textContent = t('arrayvalues', {name: a.name, values: a.value.map((r) => r.map(show).join(', '))
                .join('; ')}, this.lang);
            return;
        }
        const numbers = a.value.every((x) => typeof x === 'number' && Number.isFinite(x));
        box.root.classList.toggle('tiny_algorithm-array-bars', numbers);
        const lo = numbers ? Math.min(0, ...a.value) : 0;
        const hi = numbers ? Math.max(0, ...a.value) : 0;
        const span = hi - lo || 1;
        const labelled = a.value.length <= LABELLED;
        box.root.classList.toggle('tiny_algorithm-array-dense', !labelled);
        a.value.forEach((x, i) => {
            const cell = box.cells[i];
            cell.value.textContent = labelled || !numbers ? show(x) : '';
            if (numbers) {
                // The tallest bar is BAR_REM high; a negative value has a bar of its size in another colour.
                cell.bar.style.height = `${Math.max(0.15, (Math.abs(x) / span) * BAR_REM).toFixed(2)}rem`;
                cell.classList.toggle('tiny_algorithm-array-negative', x < 0);
            }
            mark(cell, hitAt(i));
            const here = pointers.filter((p) => p.value === i).map((p) => p.name);
            cell.pointer.textContent = here.length ? `↑${here.join(',')}` : '';
            cell.classList.toggle('tiny_algorithm-array-pointed', here.length > 0);
            const inside = Boolean(range) && i >= range.from && i <= range.to;
            cell.classList.toggle('tiny_algorithm-array-inrange', inside);
            cell.classList.toggle('tiny_algorithm-array-rangestart', inside && i === range.from);
            cell.classList.toggle('tiny_algorithm-array-rangeend', inside && i === range.to);
        });
        const values = t('arrayvalues', {name: a.name, values: a.value.map(show).join(', ')}, this.lang);
        box.text.textContent = range ? `${values}. ${t('arrayrange', {low: range.low, high: range.high,
            from: String(range.from), to: String(range.to)}, this.lang)}` : values;
    }
}
