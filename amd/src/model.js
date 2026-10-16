/**
 * Algorithm model: program -> functions -> statement trees.
 *
 * Statement types: declare, assign, input, output, if, while, dowhile, for, call, return, comment.
 *
 * @module tiny_algorithm/model
 */

let counter = 0;
export const newId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`;

export const VAR_TYPES = ['Integer', 'Real', 'String', 'Boolean'];

export const BLOCK_TYPES = ['declare', 'assign', 'input', 'output', 'if', 'while', 'for', 'dowhile', 'call', 'return', 'comment'];

const defaults = {
    declare: () => ({name: 'x', varType: 'Integer', size: ''}),
    assign: () => ({target: 'x', expr: '0'}),
    input: () => ({target: 'x'}),
    output: () => ({expr: '"Hello"', newline: true}),
    if: () => ({cond: 'x > 0', then: [], else: []}),
    while: () => ({cond: 'x < 10', body: []}),
    dowhile: () => ({cond: 'x < 10', body: []}),
    for: () => ({variable: 'i', start: '1', end: '10', step: '1', body: []}),
    call: () => ({expr: 'f()'}),
    return: () => ({expr: ''}),
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

/** Child statement lists of a block as [propName, list] pairs. */
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

/** Find a block by id; returns {block, list, index} or null. */
export const findBlock = (program, id) => {
    let found = null;
    for (const f of program.functions) {
        walk(f.body, (b, list) => {
            if (b.id === id) {
                found = {block: b, list, index: list.indexOf(b)};
            }
        });
    }
    return found;
};

export const cloneProgram = (program) => JSON.parse(JSON.stringify(program));

/** Serialize for storage in an HTML attribute (UTF-8 safe base64). */
export const serialize = (program) => {
    const json = JSON.stringify(program);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return btoa(bin);
};

export const deserialize = (text) => {
    const bin = atob(text);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const program = JSON.parse(new TextDecoder().decode(bytes));
    if (!program || !Array.isArray(program.functions)) {
        throw new Error('Invalid algorithm data');
    }
    return program;
};
