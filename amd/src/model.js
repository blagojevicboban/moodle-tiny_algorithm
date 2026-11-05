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
 * Algorithm model: program -> functions -> statement trees.
 *
 * Statement types: declare, assign, input, output, if, while, dowhile, for, call, return, comment.
 *
 * @module tiny_algorithm/model
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {renameCalls} from './expr';

let counter = 0;
export const newId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`;

export const VAR_TYPES = ['Integer', 'Real', 'String', 'Boolean'];

export const BLOCK_TYPES = ['declare', 'assign', 'input', 'output', 'if', 'while', 'for', 'dowhile', 'call', 'return', 'break',
    'continue', 'comment'];

/** Longest comment of a block. */
export const MAX_NOTE = 500;

const defaults = {
    declare: () => ({name: 'x', varType: 'Integer', size: '', size2: ''}),
    assign: () => ({target: 'x', expr: '0'}),
    input: () => ({target: 'x'}),
    output: () => ({expr: '"Hello"', newline: true}),
    'if': () => ({cond: 'x > 0', then: [], 'else': []}),
    'while': () => ({cond: 'x < 10', body: []}),
    dowhile: () => ({cond: 'x < 10', body: []}),
    'for': () => ({variable: 'i', start: '1', end: '10', step: '1', body: []}),
    call: () => ({expr: 'f()'}),
    'return': () => ({expr: ''}),
    'break': () => ({}),
    'continue': () => ({}),
    comment: () => ({text: 'Comment'}),
};

export const createBlock = (type, props = {}) => {
    if (!defaults[type]) {
        throw new Error(`Unknown block type ${type}`);
    }
    return {id: newId(), type, ...defaults[type](), ...props};
};

export const createProgram = (name = 'Program') => ({
    version: 1,
    name,
    functions: [{name: 'Main', params: [], returnType: null, body: []}],
});

/**
 * Child statement lists of a block as [propName, list] pairs.
 *
 * @param {Object} block block
 */
export const childLists = (block) => {
    switch (block.type) {
        case 'if': return [['then', block.then], ['else', block.else]];
        case 'while':
        case 'dowhile':
        case 'for': return [['body', block.body]];
        default: return [];
    }
};

export const walk = (list, fn) => {
    for (const b of list) {
        fn(b, list);
        for (const [, l] of childLists(b)) {
            walk(l, fn);
        }
    }
};

/**
 * Find a block by id; returns {block, list, index} or null.
 *
 * @param {Object} program program model
 * @param {string} id block id
 */
export const findBlock = (program, id) => {
    let found = null;
    const visit = (b, list) => {
        if (b.id === id) {
            found = {block: b, list, index: list.indexOf(b)};
        }
    };
    for (const f of program.functions) {
        walk(f.body, visit);
    }
    return found;
};

export const cloneProgram = (program) => JSON.parse(JSON.stringify(program));

/**
 * Copy of a block and the blocks inside it, with new ids. Only the fields a block of its type has are kept, so the
 * copy can also be made from data pasted from outside.
 *
 * @param {*} raw block (or anything)
 * @returns {Object|null} the copy, null when raw is not a block
 */
export const copyBlock = (raw) => {
    if (!raw || typeof raw !== 'object' || !Object.hasOwn(defaults, raw.type)) {
        return null;
    }
    const block = createBlock(raw.type);
    for (const key of Object.keys(block)) {
        if (key === 'id' || key === 'type') {
            continue;
        }
        if (Array.isArray(block[key])) {
            block[key] = Array.isArray(raw[key]) ? raw[key].map(copyBlock).filter(Boolean) : [];
        } else if (typeof raw[key] === typeof block[key]) {
            block[key] = raw[key];
        }
    }
    // Any block may have a comment (a note shown as a tooltip).
    if (typeof raw.note === 'string' && raw.note.trim()) {
        block.note = raw.note.slice(0, MAX_NOTE);
    }
    return block;
};

// Marker of the blocks the editor puts in the clipboard.
const CLIPBOARD_KEY = 'tinyAlgorithmBlocks';

/**
 * Clipboard text of blocks.
 *
 * @param {Object[]} blocks
 * @returns {string}
 */
export const blocksToText = (blocks) => JSON.stringify({[CLIPBOARD_KEY]: blocks});

/**
 * Blocks from clipboard text (copies with new ids), or null when the text holds no blocks of the editor.
 *
 * @param {string} text
 * @returns {Object[]|null}
 */
export const blocksFromText = (text) => {
    try {
        const data = JSON.parse(text);
        const blocks = data && Array.isArray(data[CLIPBOARD_KEY]) ? data[CLIPBOARD_KEY].map(copyBlock).filter(Boolean) : [];
        return blocks.length ? blocks : null;
    } catch (e) {
        return null;
    }
};

/**
 * Can the block be moved to the place (a list and an index in it, as a "+" slot has)? Not into itself, and not to where it is.
 *
 * @param {Object} program program model
 * @param {string} id block id
 * @param {Object[]} list target list
 * @param {number} index target index
 * @returns {boolean}
 */
export const canMoveBlock = (program, id, list, index) => {
    const f = findBlock(program, id);
    if (!f || (f.list === list && (index === f.index || index === f.index + 1))) {
        return false;
    }
    let inside = false;
    walk([f.block], (b) => childLists(b).forEach(([, l]) => {
        inside = inside || l === list;
    }));
    return !inside;
};

/**
 * Move a block to a place (see canMoveBlock).
 *
 * @param {Object} program program model
 * @param {string} id block id
 * @param {Object[]} list target list
 * @param {number} index target index, counted before the block is taken out
 * @returns {boolean} false when it cannot be moved there
 */
export const moveBlock = (program, id, list, index) => {
    if (!canMoveBlock(program, id, list, index)) {
        return false;
    }
    const f = findBlock(program, id);
    f.list.splice(f.index, 1);
    list.splice(f.list === list && f.index < index ? index - 1 : index, 0, f.block);
    return true;
};

// Fields of each block type that hold an expression (and so may call a function).
const EXPR_FIELDS = {
    assign: ['target', 'expr'],
    input: ['target'],
    output: ['expr'],
    'if': ['cond'],
    'while': ['cond'],
    dowhile: ['cond'],
    'for': ['start', 'end', 'step'],
    call: ['expr'],
    'return': ['expr'],
};

/**
 * Rename a function and every call of it in the program. The calls stay as they are when a name is not a valid name or
 * another function has the old or the new name.
 *
 * @param {Object} program program model
 * @param {Object} fn function of the program
 * @param {string} name new name
 */
export const renameFunction = (program, fn, name) => {
    const from = String(fn.name);
    fn.name = name;
    const valid = (n) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n);
    const taken = (n) => program.functions.some((f) => f !== fn && String(f.name).toLowerCase() === n.toLowerCase());
    if (!valid(name) || !valid(from) || taken(from) || taken(name)) {
        return;
    }
    for (const f of program.functions) {
        walk(f.body, (b) => (EXPR_FIELDS[b.type] || []).forEach((key) => {
            if (typeof b[key] === 'string') {
                b[key] = renameCalls(b[key], from, name);
            }
        }));
    }
};

/**
 * Serialize for storage in an HTML attribute (UTF-8 safe base64).
 *
 * @param {Object} program program model
 */
export const serialize = (program) => {
    const json = JSON.stringify(program);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return btoa(bin);
};

/**
 * Decode any value written by serialize().
 *
 * @param {string} text base64 of UTF-8 JSON
 * @returns {*} decoded value
 */
export const decodeData = (text) => {
    const bin = atob(text);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
};

export const deserialize = (text) => {
    const program = decodeData(text);
    if (!program || !Array.isArray(program.functions)) {
        throw new Error('Invalid algorithm data');
    }
    return program;
};
