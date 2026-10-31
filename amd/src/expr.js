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
 * Expression tokenizer/parser (Flowgorithm-like syntax) producing a small AST.
 *
 * Node kinds: num, str, bool, var, idx, call, bin, un.
 *
 * @module tiny_algorithm/expr
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const WORD_OPS = {and: '&&', or: '||', not: '!', mod: '%'};

const OP_ALIASES = {'=': '==', '<>': '!='};

// eslint-disable-next-line complexity
const tokenize = (src) => {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) {
            i++;
        } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
            let j = i;
            while (j < src.length && /[0-9.]/.test(src[j])) {
                j++;
            }
            tokens.push({t: 'num', v: parseFloat(src.slice(i, j)), 'int': !src.slice(i, j).includes('.')});
            i = j;
        } else if (c === '"') {
            let j = i + 1;
            let s = '';
            while (j < src.length && src[j] !== '"') {
                if (src[j] === '\\' && j + 1 < src.length) {
                    j++;
                    s += {n: '\n', t: '\t'}[src[j]] || src[j];
                } else {
                    s += src[j];
                }
                j++;
            }
            if (j >= src.length) {
                throw new Error('Unterminated string');
            }
            tokens.push({t: 'str', v: s});
            i = j + 1;
        } else if (/[A-Za-z_]/.test(c)) {
            let j = i;
            while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) {
                j++;
            }
            const w = src.slice(i, j);
            const lw = w.toLowerCase();
            if (WORD_OPS[lw]) {
                tokens.push({t: 'op', v: WORD_OPS[lw]});
            } else if (lw === 'true' || lw === 'false') {
                tokens.push({t: 'bool', v: lw === 'true'});
            } else {
                tokens.push({t: 'id', v: w});
            }
            i = j;
        } else {
            const two = src.slice(i, i + 2);
            if (['<=', '>=', '<>', '!=', '==', '&&', '||'].includes(two)) {
                tokens.push({t: 'op', v: two});
                i += 2;
            } else if ('+-*/^%<>=&!(),[]'.includes(c)) {
                tokens.push({t: 'op', v: c});
                i++;
            } else {
                throw new Error(`Unexpected character '${c}'`);
            }
        }
    }
    return tokens;
};

export const parseExpr = (src) => {
    const toks = tokenize(String(src));
    let p = 0;
    const peek = () => toks[p];
    const isOp = (...ops) => peek() && peek().t === 'op' && ops.includes(peek().v);
    const expectOp = (op) => {
        if (!isOp(op)) {
            throw new Error(`Expected '${op}'`);
        }
        p++;
    };
    const binLevel = (next, ops) => () => {
        let l = next();
        while (isOp(...ops)) {
            const op = toks[p++].v;
            l = {k: 'bin', op: OP_ALIASES[op] || op, l, r: next()};
        }
        return l;
    };

    let parseOr;
    const primary = () => {
        const t = toks[p++];
        if (!t) {
            throw new Error('Unexpected end of expression');
        }
        if (t.t === 'num') {
            return {k: 'num', v: t.v, 'int': t.int};
        }
        if (t.t === 'str') {
            return {k: 'str', v: t.v};
        }
        if (t.t === 'bool') {
            return {k: 'bool', v: t.v};
        }
        if (t.t === 'id') {
            if (isOp('(')) {
                p++;
                const args = [];
                if (!isOp(')')) {
                    do {
                        args.push(parseOr());
                    } while (isOp(',') && p++);
                }
                expectOp(')');
                return {k: 'call', name: t.v, args};
            }
            if (isOp('[')) {
                p++;
                const index = parseOr();
                expectOp(']');
                return {k: 'idx', name: t.v, index};
            }
            return {k: 'var', name: t.v};
        }
        if (t.t === 'op' && t.v === '(') {
            const e = parseOr();
            expectOp(')');
            return e;
        }
        throw new Error(`Unexpected '${t.v}'`);
    };
    const power = () => {
        const base = primary();
        if (isOp('^')) {
            p++;
            return {k: 'bin', op: '^', l: base, r: unary()};
        }
        return base;
    };
    const unary = () => {
        if (isOp('-', '+', '!')) {
            const op = toks[p++].v;
            return {k: 'un', op, e: unary()};
        }
        return power();
    };
    const mul = binLevel(unary, ['*', '/', '%']);
    const add = binLevel(mul, ['+', '-']);
    const cat = binLevel(add, ['&']);
    const cmp = binLevel(cat, ['==', '=', '!=', '<>', '<', '<=', '>', '>=']);
    const not = () => {
        if (isOp('!')) {
            p++;
            return {k: 'un', op: '!', e: not()};
        }
        return cmp();
    };
    const and = binLevel(not, ['&&']);
    parseOr = binLevel(and, ['||']);

    const ast = parseOr();
    if (p < toks.length) {
        throw new Error(`Unexpected '${toks[p].v}'`);
    }
    return ast;
};

/**
 * Validate expression text; returns null when valid or an error message.
 *
 * @param {string} src
 * @returns {string|null}
 */
export const checkExpr = (src) => {
    try {
        parseExpr(src);
        return null;
    } catch (e) {
        return e.message;
    }
};
