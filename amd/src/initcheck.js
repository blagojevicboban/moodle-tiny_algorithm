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
 * Variables that may be read before they get a value, found without running the algorithm (as the warning of a C
 * compiler, or the definite assignment of Java). Only simple variables (not arrays or records) are checked. A
 * variable has a value after an assignment to it, an Input or Read into it, as a parameter or as the variable of a
 * For loop; after an If only when both branches give it one; the body of a While or For loop may not run at all, the
 * body of a Do loop runs at least once. A branch that ends with Return, Break or Continue does not count.
 *
 * @module tiny_algorithm/initcheck
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {parseExpr} from './expr';

const BASIC = ['Integer', 'Real', 'String', 'Boolean'];

/** Fields of each kind of block that are read before it runs (the condition of a Do loop is read after its body). */
const READS = {
    assign: ['expr'], output: ['expr'], 'if': ['cond'], 'while': ['cond'], 'for': ['start', 'end', 'step'],
    call: ['expr'], 'return': ['expr'], write: ['expr'], forward: ['distance'], turn: ['angle'], declare: ['size', 'size2'],
};

/**
 * Names of the variables an expression reads (also inside indexes and calls).
 *
 * @param {string} text expression
 * @returns {string[]} lower case names
 */
const readsOf = (text) => {
    if (text === undefined || text === null || String(text).trim() === '') {
        return [];
    }
    let tree;
    try {
        tree = parseExpr(String(text));
    } catch (e) {
        return [];
    }
    const names = [];
    const visit = (n) => {
        if (Array.isArray(n)) {
            n.forEach(visit);
        } else if (n && typeof n === 'object') {
            if (n.k === 'var' && typeof n.name === 'string') {
                names.push(n.name.toLowerCase());
            }
            Object.values(n).forEach(visit);
        }
    };
    visit(tree);
    return names;
};

/**
 * The variable an assignment target, Input or Read gives a value to (a simple variable only).
 *
 * @param {string} text target
 * @returns {?string} lower case name
 */
const targetOf = (text) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(String(text || ''));
    return m ? m[1].toLowerCase() : null;
};

/**
 * The variables of one function that may be read before they get a value.
 *
 * @param {Object} fn function of the algorithm
 * @returns {string[]} names as declared, in the order they are first found
 */
export const unsetReads = (fn) => {
    const simple = new Map();
    const found = new Map();
    const read = (names, have) => names.forEach((n) => {
        if (simple.has(n) && !have.has(n) && !found.has(n)) {
            found.set(n, simple.get(n));
        }
    });
    /**
     * The variables with a value after both branches (null for a branch that always jumps away).
     *
     * @param {?Set} a after one branch
     * @param {?Set} c after the other
     * @returns {?Set}
     */
    const both = (a, c) => {
        if (a === null) {
            return c;
        }
        return c === null ? a : new Set([...a].filter((n) => c.has(n)));
    };
    let run = null;
    /**
     * One block: the variables with a value after it (set is changed), or null when it jumps away.
     *
     * @param {Object} b block
     * @param {Set} set variables with a value before it
     * @returns {?Set}
     */
    const step = (b, set) => {
        const name = targetOf(b.type === 'for' ? b.variable : b.target);
        switch (b.type) {
            case 'declare':
                if (!String(b.size || '').trim() && BASIC.includes(b.varType)) {
                    String(b.name).split(',').map((x) => x.trim()).filter(Boolean).forEach((n) => {
                        simple.set(n.toLowerCase(), n);
                        set.delete(n.toLowerCase());
                    });
                }
                return set;
            case 'assign':
            case 'input':
            case 'read':
                return name ? set.add(name) : set;
            case 'if':
                return both(run(b.then, set), run(b.else, set));
            case 'while':
                run(b.body, set);
                return set;
            case 'for':
                if (name) {
                    set.add(name);
                }
                run(b.body, set);
                return set;
            case 'dowhile': {
                // The body runs once at least; its condition is read after it.
                const after = run(b.body, set) || set;
                read(readsOf(b.cond), after);
                return after;
            }
            case 'return':
            case 'break':
            case 'continue':
                return null;
            default:
                return set;
        }
    };
    // Runs a list with the variables that have a value; returns those after it, or null when the list always jumps away.
    run = (list, have) => {
        let set = new Set(have);
        for (const b of (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object')) {
            const before = b.type === 'assign' && targetOf(b.target) === null ? readsOf(b.target) : [];
            read([...(READS[b.type] || []).flatMap((k) => readsOf(b[k])), ...before], set);
            set = step(b, set);
            if (set === null) {
                return null;
            }
        }
        return set;
    };
    run(fn && fn.body, new Set((fn && fn.params || []).map((p) => String(p.name).toLowerCase())));
    return [...found.values()];
};
