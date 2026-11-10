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
 * used as an index of an array (i, j, low, high) point at their element.
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
 * A value as the panel shows it.
 *
 * @param {*} v
 * @returns {string}
 */
const show = (v) => {
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
        this.root = el('div', 'tiny_algorithm-arrays');
        this.empty = el('p', 'tiny_algorithm-arrays-empty', t('arraysempty', null, lang));
        this.reset();
    }

    /** No arrays yet (before a run). */
    reset() {
        this.boxes = new Map();
        this.root.replaceChildren(this.empty);
    }

    /**
     * Draw the arrays of a step (or of the end) of the interpreter (execute with track).
     *
     * @param {{arrays: ?Array, access: ?Array, vars: ?Array}} ev
     */
    update(ev) {
        const arrays = (ev.arrays || []).slice(0, MAX_ARRAYS);
        if (!arrays.length) {
            this.reset();
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
            const pointers = (this.indexes.get(a.name.toLowerCase()) || []).map((n) => ints.get(n)).filter(Boolean);
            this.fill(box, a, access, pointers);
            return box.root;
        });
        [...this.boxes.keys()].filter((k) => !seen.has(k)).forEach((k) => this.boxes.delete(k));
        this.root.replaceChildren(...parts);
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
        if (a.dims === 2) {
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
     */
    fill(box, a, access, pointers) {
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
        if (a.dims === 2) {
            let k = 0;
            a.value.forEach((row, i) => row.forEach((x, j) => {
                const c = box.cells[k++];
                c.textContent = show(x);
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
        });
        box.text.textContent = t('arrayvalues', {name: a.name, values: a.value.map(show).join(', ')}, this.lang);
    }
}
