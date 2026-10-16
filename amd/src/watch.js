/**
 * Variable watch: a small table with the current value of every variable while an algorithm runs.
 * Values that changed since the previous step are highlighted.
 *
 * @module tiny_algorithm/watch
 */
import {t as tr} from './strings';

const MAX_ITEMS = 12;

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
        this.root.className = 'alg-watch';
        this.root.setAttribute('aria-live', 'polite');
        this.clear();
    }

    /** Forget the previous values and show the hint. */
    clear() {
        this.previous = new Map();
        const hint = document.createElement('p');
        hint.className = 'alg-watch-empty';
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
            const text = formatValue(v.value, v.type);
            next.set(v.name, text);
            const row = document.createElement('tr');
            const name = document.createElement('th');
            name.scope = 'row';
            name.textContent = v.name;
            const value = document.createElement('td');
            value.textContent = text;
            if (this.previous.has(v.name) && this.previous.get(v.name) !== text) {
                value.className = 'alg-changed';
            }
            row.append(name, value);
            body.append(row);
        }
        table.append(body);
        this.previous = next;
        this.root.replaceChildren(table);
    }
}
