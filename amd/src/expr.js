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
import {AlgorithmError, errorText} from './strings';

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
                throw new AlgorithmError('unterminated');
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
            if (Object.hasOwn(WORD_OPS, lw)) {
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
                throw new AlgorithmError('badchar', {c});
            }
        }
    }
    return tokens;
};

/**
 * Parse an expression.
 *
 * @param {string} src expression text
 * @param {Object} [options]
 * @param {boolean} [options.literals] also accept array literals [1, 2] and [[1, 2], [3, 4]] (the call of a function test)
 * @returns {Object} AST
 */
export const parseExpr = (src, {literals = false} = {}) => {
    const toks = tokenize(String(src));
    let p = 0;
    const peek = () => toks[p];
    const isOp = (...ops) => peek() && peek().t === 'op' && ops.includes(peek().v);
    const expectOp = (op) => {
        if (!isOp(op)) {
            throw new AlgorithmError('expected', {op});
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
    // Expressions separated by commas up to a closing bracket: the arguments of a call or the items of an array.
    const list = (close) => {
        const items = [];
        if (!isOp(close)) {
            do {
                items.push(parseOr());
            } while (isOp(',') && p++);
        }
        expectOp(close);
        return items;
    };
    const primary = () => {
        const t = toks[p++];
        if (!t) {
            throw new AlgorithmError('unexpectedend');
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
                return {k: 'call', name: t.v, args: list(')')};
            }
            if (isOp('[')) {
                // An array element a[i], a matrix element a[i, j] or a[i][j].
                p++;
                const index = parseOr();
                let index2 = null;
                if (isOp(',')) {
                    p++;
                    index2 = parseOr();
                }
                expectOp(']');
                if (!index2 && isOp('[')) {
                    p++;
                    index2 = parseOr();
                    expectOp(']');
                }
                return index2 ? {k: 'idx', name: t.v, index, index2} : {k: 'idx', name: t.v, index};
            }
            return {k: 'var', name: t.v};
        }
        if (t.t === 'op' && t.v === '(') {
            const e = parseOr();
            expectOp(')');
            return e;
        }
        if (literals && t.t === 'op' && t.v === '[') {
            return {k: 'arr', items: list(']')};
        }
        throw new AlgorithmError('unexpected', {token: String(t.v)});
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
        throw new AlgorithmError('unexpected', {token: String(toks[p].v)});
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
        return errorText(e);
    }
};

/**
 * Rename the calls of a function in an expression. Names compare without case, like in the interpreter; text in quotes,
 * variables and other functions are left as they are.
 *
 * @param {string} src expression
 * @param {string} from old function name
 * @param {string} to new function name
 * @returns {string}
 */
export const renameCalls = (src, from, to) => {
    const text = String(src ?? '');
    const old = from.toLowerCase();
    let out = '';
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === '"') {
            let j = i + 1;
            while (j < text.length && text[j] !== '"') {
                j += text[j] === '\\' ? 2 : 1;
            }
            out += text.slice(i, j + 1);
            i = j + 1;
        } else if (/[A-Za-z_]/.test(c) && !/[A-Za-z0-9_.]/.test(text[i - 1] || '')) {
            let j = i;
            while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) {
                j++;
            }
            const word = text.slice(i, j);
            out += word.toLowerCase() === old && /^\s*\(/.test(text.slice(j)) ? to : word;
            i = j;
        } else {
            out += c;
            i++;
        }
    }
    return out;
};
