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
 * Code to diagram: a flowchart made from Python code (the part of Python a school algorithm uses, and all the Python
 * this plugin generates). Functions (def), assignments, input(), print(), if / elif / else, while, for … in range(),
 * break, continue, return, lists made with [0] * n and matrices with [[0] * m for _ in range(n)]. The types of the
 * variables are found from the values given to them. A line that cannot be turned into a block becomes a Comment
 * with the line, and is reported, so nothing is lost.
 *
 * @module tiny_algorithm/codeimport
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {createBlock, createProgram} from './model';

/** Python functions and the functions of the algorithms they become. */
const FUNCS = Object.assign(Object.create(null), {
    'str': 'ToString', 'int': 'ToInteger', 'float': 'ToReal', 'len': 'Len', 'abs': 'Abs', 'round': 'Round', 'chr': 'ToChar',
    'ord': 'ToCode', 'math.sqrt': 'Sqrt', 'math.sin': 'Sin', 'math.cos': 'Cos', 'math.tan': 'Tan', 'math.asin': 'Arcsin',
    'math.acos': 'Arccos', 'math.atan': 'Arctan', 'math.floor': 'Floor', 'math.ceil': 'Ceiling', 'math.log': 'Log',
    'math.log10': 'Log10', 'math.exp': 'Exp', 'math.trunc': 'Int', 'math.fabs': 'Abs', 'sqrt': 'Sqrt',
});

/** Functions of the algorithms (a call of one keeps its name). */
const OWN = ['abs', 'sqrt', 'sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan', 'log10', 'log', 'exp', 'floor', 'ceiling',
    'round', 'int', 'sign', 'sgn', 'len', 'size', 'tofixed', 'char', 'tochar', 'tocode', 'toint', 'tointeger', 'toreal',
    'tostring', 'isnumeric', 'pi', 'random'];

/** Python functions that have no block or function in the algorithms. */
const PYTHON_ONLY = ['max', 'min', 'sum', 'sorted', 'reversed', 'list', 'dict', 'set', 'tuple', 'range', 'print', 'input',
    'open', 'map', 'filter', 'enumerate', 'zip', 'type', 'isinstance', 'format', 'divmod', 'pow', 'any', 'all', 'eval',
    'exec', 'iter', 'next', 'bool'];

/** Types of the results of the functions of the algorithms. */
const FUNC_TYPES = Object.assign(Object.create(null), {
    tostring: 'String', tochar: 'String', tointeger: 'Integer', toint: 'Integer', len: 'Integer', size: 'Integer',
    tocode: 'Integer', random: 'Integer', 'int': 'Integer', round: 'Integer', floor: 'Integer', ceiling: 'Integer',
    isnumeric: 'Boolean', tofixed: 'String', 'char': 'String', sign: 'Integer', sgn: 'Integer',
});

// ---- Tokens and expressions -------------------------------------------------------------------------------------------

/**
 * An error in a line that cannot be read; the line becomes a comment.
 */
class Unsupported extends Error {}

/**
 * The tokens of a Python expression (or of the start of a statement).
 *
 * @param {string} src
 * @returns {Array<{t: string, v: *}>}
 */
export const tokenize = (src) => {
    const toks = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) {
            i++;
        } else if (c === '#') {
            break;
        } else if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
            const m = /^\d*\.?\d*(?:[eE][+-]?\d+)?/.exec(src.slice(i));
            toks.push({t: 'num', v: m[0], real: /[.eE]/.test(m[0])});
            i += m[0].length;
        } else if (/[A-Za-z_]/.test(c)) {
            const m = /^[A-Za-z_]\w*/.exec(src.slice(i));
            const w = m[0];
            const q = src[i + w.length];
            if (/^[fFrRbBuU]{1,2}$/.test(w) && (q === '"' || q === "'")) {
                const s = readString(src, i + w.length);
                toks.push({t: /f/i.test(w) ? 'fstr' : 'str', v: s.text});
                i = s.end;
            } else {
                toks.push({t: 'name', v: w});
                i += w.length;
            }
        } else if (c === '"' || c === "'") {
            const s = readString(src, i);
            toks.push({t: 'str', v: s.text});
            i = s.end;
        } else {
            const three = src.slice(i, i + 3);
            const two = src.slice(i, i + 2);
            if (['**=', '//='].includes(three)) {
                toks.push({t: 'op', v: three});
                i += 3;
            } else if (['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%='].includes(two)) {
                toks.push({t: 'op', v: two});
                i += 2;
            } else if ('+-*/%<>=()[],:.'.includes(c)) {
                toks.push({t: 'op', v: c});
                i++;
            } else {
                throw new Unsupported(c);
            }
        }
    }
    return toks;
};

/**
 * A string literal from its opening quote (also triple quotes).
 *
 * @param {string} src
 * @param {number} at index of the quote
 * @returns {{text: string, end: number}}
 */
const readString = (src, at) => {
    const q = src[at];
    const triple = src.slice(at, at + 3) === q.repeat(3);
    let i = at + (triple ? 3 : 1);
    let text = '';
    while (i < src.length) {
        if (triple ? src.slice(i, i + 3) === q.repeat(3) : src[i] === q) {
            return {text, end: i + (triple ? 3 : 1)};
        }
        if (src[i] === '\\' && i + 1 < src.length) {
            i++;
            text += {n: '\n', t: '\t'}[src[i]] || src[i];
        } else {
            text += src[i];
        }
        i++;
    }
    throw new Unsupported('string');
};

const BIN_LEVELS = [['or'], ['and'], ['not'], ['==', '!=', '<', '<=', '>', '>='], ['+', '-'], ['*', '/', '//', '%']];

/**
 * Parse a Python expression into a tree.
 *
 * @param {Array} toks tokens
 * @returns {Object}
 */
export const parsePy = (toks) => {
    let p = 0;
    const peek = (k = 0) => toks[p + k];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const isWord = (v) => peek() && peek().t === 'name' && peek().v === v;
    const expect = (v) => {
        if (!isOp(v)) {
            throw new Unsupported(v);
        }
        p++;
    };
    const level = (k) => {
        if (k === BIN_LEVELS.length) {
            return unary();
        }
        const ops = BIN_LEVELS[k];
        if (ops[0] === 'not') {
            if (isWord('not')) {
                p++;
                return {k: 'un', op: 'not', e: level(k)};
            }
            return level(k + 1);
        }
        let l = level(k + 1);
        if (ops[0] === '==') {
            // A chain a < b < c is a < b and b < c.
            const parts = [];
            while (peek() && peek().t === 'op' && ops.includes(peek().v)) {
                const op = toks[p++].v;
                const r = level(k + 1);
                parts.push({k: 'bin', op, l: parts.length ? parts[parts.length - 1].r : l, r});
            }
            if (parts.length) {
                l = parts.reduce((a, b) => ({k: 'bin', op: 'and', l: a, r: b}));
            }
            return l;
        }
        for (;;) {
            const t = peek();
            const word = t && t.t === 'name' && ops.includes(t.v);
            if (!(word || (t && t.t === 'op' && ops.includes(t.v)))) {
                return l;
            }
            p++;
            l = {k: 'bin', op: t.v, l, r: level(k + 1)};
        }
    };
    const unary = () => {
        if (isOp('-') || isOp('+')) {
            const op = toks[p++].v;
            const e = unary();
            return op === '-' ? {k: 'un', op: '-', e} : e;
        }
        return power();
    };
    const power = () => {
        const base = postfix();
        if (isOp('**')) {
            p++;
            return {k: 'bin', op: '**', l: base, r: unary()};
        }
        return base;
    };
    const args = () => {
        const list = [];
        const named = {};
        expect('(');
        while (!isOp(')')) {
            if (peek() && peek().t === 'name' && peek(1) && peek(1).t === 'op' && peek(1).v === '=') {
                const key = toks[p].v;
                p += 2;
                named[key] = level(0);
            } else {
                list.push(level(0));
            }
            if (!isOp(')')) {
                expect(',');
            }
        }
        p++;
        return {list, named};
    };
    const postfix = () => {
        let e = atom();
        for (;;) {
            if (isOp('(')) {
                const a = args();
                e = {k: 'call', f: e, args: a.list, named: a.named};
            } else if (isOp('[')) {
                p++;
                const i = level(0);
                expect(']');
                e = {k: 'idx', e, i};
            } else if (isOp('.') && peek(1) && peek(1).t === 'name') {
                p++;
                e = {k: 'attr', e, name: toks[p++].v};
            } else {
                return e;
            }
        }
    };
    const atom = () => {
        const t = toks[p++];
        if (!t) {
            throw new Unsupported('end');
        }
        if (t.t === 'num') {
            return {k: 'num', v: t.v, real: t.real};
        }
        if (t.t === 'str') {
            return {k: 'str', v: t.v};
        }
        if (t.t === 'fstr') {
            return fstring(t.v);
        }
        if (t.t === 'name') {
            if (t.v === 'True' || t.v === 'False') {
                return {k: 'bool', v: t.v === 'True'};
            }
            if (['None', 'lambda', 'in', 'is', 'if', 'for', 'yield'].includes(t.v)) {
                throw new Unsupported(t.v);
            }
            return {k: 'name', v: t.v};
        }
        if (t.v === '(') {
            const e = level(0);
            if (isOp(',')) {
                throw new Unsupported('tuple');
            }
            expect(')');
            return e;
        }
        if (t.v === '[') {
            const items = [];
            while (!isOp(']')) {
                items.push(level(0));
                if (isWord('for')) {
                    // [expr for _ in range(n)]
                    p++;
                    const v = toks[p++];
                    if (!v || v.t !== 'name' || !isWord('in')) {
                        throw new Unsupported('comprehension');
                    }
                    p++;
                    const r = postfix();
                    expect(']');
                    return {k: 'comp', item: items[0], range: r};
                }
                if (!isOp(']')) {
                    expect(',');
                }
            }
            p++;
            return {k: 'list', items};
        }
        throw new Unsupported(String(t.v));
    };
    const tree = level(0);
    if (p < toks.length) {
        throw new Unsupported(String(toks[p].v));
    }
    return tree;
};

/**
 * An f-string as a joining of its texts and its expressions.
 *
 * @param {string} text
 * @returns {Object}
 */
const fstring = (text) => {
    const parts = [];
    let i = 0;
    let lit = '';
    while (i < text.length) {
        if (text[i] === '{' && text[i + 1] === '{') {
            lit += '{';
            i += 2;
        } else if (text[i] === '}' && text[i + 1] === '}') {
            lit += '}';
            i += 2;
        } else if (text[i] === '{') {
            const end = text.indexOf('}', i);
            if (end < 0) {
                throw new Unsupported('f-string');
            }
            if (lit) {
                parts.push({k: 'str', v: lit});
            }
            lit = '';
            // A format such as {x:.2f} keeps only the value.
            parts.push(parsePy(tokenize(text.slice(i + 1, end).split(/:(?![^[]*\])/)[0])));
            i = end + 1;
        } else {
            lit += text[i++];
        }
    }
    if (lit || !parts.length) {
        parts.push({k: 'str', v: lit});
    }
    return parts.reduce((a, b) => ({k: 'bin', op: '&', l: a, r: b}));
};

/**
 * Dotted name of a node (math.sqrt), or null.
 *
 * @param {Object} n Python tree
 * @returns {?string}
 */
const dotted = (n) => {
    if (n.k === 'name') {
        return n.v;
    }
    return n.k === 'attr' && dotted(n.e) ? `${dotted(n.e)}.${n.name}` : null;
};

// Precedence in the expressions of the algorithms (higher binds tighter).
const PREC = {or: 1, and: 2, not: 3, '==': 4, '!=': 4, '<': 4, '<=': 4, '>': 4, '>=': 4, '&': 5, '+': 6, '-': 6, '*': 7, '/': 7,
    '%': 7, neg: 8, '^': 9};

/**
 * Turns Python expressions into expressions of the algorithms, with the types of the variables.
 */
class Translator {
    /**
     * @param {Object} types variable name (lower case) => {type, dims}
     * @param {Object} fns function name (lower case) => return type
     */
    constructor(types, fns) {
        this.types = types;
        this.fns = fns;
    }

    /**
     * The type of a Python expression.
     *
     * @param {Object} n
     * @returns {string}
     */
    // eslint-disable-next-line complexity
    typeOf(n) {
        switch (n.k) {
            case 'num': return n.real ? 'Real' : 'Integer';
            case 'str': return 'String';
            case 'bool': return 'Boolean';
            case 'name': {
                const v = this.types[n.v.toLowerCase()];
                return v ? v.type : 'Integer';
            }
            case 'attr': return dotted(n) === 'math.pi' ? 'Real' : 'Integer';
            case 'idx': {
                const base = this.root(n);
                const v = base && this.types[base.toLowerCase()];
                if (v && v.dims) {
                    return v.type;
                }
                return (v && v.type === 'String') || (!base && this.typeOf(n.e) === 'String') ? 'String' : 'Integer';
            }
            case 'un': return n.op === 'not' ? 'Boolean' : this.typeOf(n.e);
            case 'call': return this.callType(n);
            case 'bin': {
                if (['or', 'and', '==', '!=', '<', '<=', '>', '>='].includes(n.op)) {
                    return 'Boolean';
                }
                if (n.op === '&') {
                    return 'String';
                }
                const l = this.typeOf(n.l);
                const r = this.typeOf(n.r);
                if (n.op === '+' && (l === 'String' || r === 'String')) {
                    return 'String';
                }
                if (n.op === '//') {
                    return 'Integer';
                }
                return n.op === '/' || l === 'Real' || r === 'Real' ? 'Real' : 'Integer';
            }
            default: return 'Integer';
        }
    }

    callType(n) {
        const name = dotted(n.f) || '';
        if (name === 'input') {
            return 'String';
        }
        if (name.startsWith('random.')) {
            return name === 'random.random' ? 'Real' : 'Integer';
        }
        if (Object.hasOwn(this.fns, name.toLowerCase())) {
            // A function of the code; one whose type is not known yet (a recursive call) returns a whole number.
            return this.fns[name.toLowerCase()] || 'Integer';
        }
        if (name === 'max' || name === 'min') {
            return n.args.some((a) => this.typeOf(a) === 'Real') ? 'Real' : 'Integer';
        }
        if (name === 'format') {
            return 'String';
        }
        const target = (FUNCS[name] || name).toLowerCase();
        return FUNC_TYPES[target] || (OWN.includes(target) ? 'Real' : 'Integer');
    }

    /**
     * The variable an index belongs to (m in m[i][j]).
     *
     * @param {Object} n Python tree
     * @returns {?string}
     */
    root(n) {
        let e = n;
        while (e.k === 'idx') {
            e = e.e;
        }
        return e.k === 'name' ? e.v : null;
    }

    /**
     * An expression of the algorithms.
     *
     * @param {Object} n Python tree
     * @param {number} [outer] precedence around it
     * @returns {string}
     */
    expr(n, outer = 0) {
        const wrap = (code, prec) => (prec < outer ? `(${code})` : code);
        switch (n.k) {
            case 'num': {
                if (/[eE]/.test(n.v)) {
                    // The expressions of the algorithms have no exponent: 1e-7 is 0.0000001.
                    return Number(n.v).toLocaleString('en-US', {useGrouping: false, maximumFractionDigits: 20});
                }
                return n.v.startsWith('.') ? `0${n.v}` : n.v;
            }
            case 'str': return `"${n.v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
            case 'bool': return n.v ? 'true' : 'false';
            case 'name': return n.v;
            case 'attr': {
                if (dotted(n) === 'math.pi') {
                    return 'Pi()';
                }
                throw new Unsupported(dotted(n) || 'attribute');
            }
            case 'idx': return this.index(n);
            case 'un':
                if (n.op === 'not') {
                    return wrap(`not ${this.expr(n.e, PREC.not)}`, PREC.not);
                }
                return wrap(`-${this.expr(n.e, PREC.neg + 1)}`, PREC.neg);
            case 'call': return this.call(n);
            case 'bin': return this.binary(n, outer);
            default: throw new Unsupported(n.k);
        }
    }

    index(n) {
        const base = this.root(n);
        const ids = [];
        let e = n;
        while (e.k === 'idx') {
            ids.unshift(e.i);
            e = e.e;
        }
        const v = base && this.types[base.toLowerCase()];
        if (ids.length === 1 && ((v && !v.dims && v.type === 'String') || (!base && this.typeOf(e) === 'String'))) {
            return `Char(${this.expr(e)}, ${this.expr(ids[0])})`;
        }
        if (!base || ids.length > 2) {
            throw new Unsupported('index');
        }
        return `${base}[${ids.map((i) => this.expr(i)).join(', ')}]`;
    }

    call(n) {
        const name = dotted(n.f);
        if (!name) {
            throw new Unsupported('call');
        }
        const a = n.args.map((x) => this.expr(x));
        if (name === 'random.randrange') {
            if (a.length === 1) {
                return `Random(${a[0]})`;
            }
            return `${a[0]} + Random(${a[1]} - ${this.expr(n.args[0], PREC['-'] + 1)})`;
        }
        if (name === 'random.randint') {
            return `${a[0]} + Random(${a[1]} - ${this.expr(n.args[0], PREC['-'] + 1)} + 1)`;
        }
        if (name === 'int' && n.args.length === 1 && this.typeOf(n.args[0]) === 'Real') {
            return `Int(${a[0]})`;
        }
        if (name === 'format' && n.args.length === 2) {
            return `ToFixed(${a[0]}, ${this.places(n.args[1])})`;
        }
        if (Object.hasOwn(this.fns, name.toLowerCase())) {
            return `${name}(${a.join(', ')})`;
        }
        if (FUNCS[name]) {
            return `${FUNCS[name]}(${a.join(', ')})`;
        }
        if (name.includes('.') || PYTHON_ONLY.includes(name)) {
            throw new Unsupported(name);
        }
        // A function of the algorithms (IsNumeric), or one that is not in the code: the call stays as it is.
        return `${name}(${a.join(', ')})`;
    }

    /**
     * The decimal places of a format: ".2f" or "." + str(n) + "f".
     *
     * @param {Object} spec
     * @returns {string}
     */
    places(spec) {
        if (spec.k === 'str' && /^\.\d+f$/.test(spec.v)) {
            return spec.v.slice(1, -1);
        }
        const parts = [];
        const flat = (x) => (x.k === 'bin' && x.op === '+' ? (flat(x.l), flat(x.r)) : parts.push(x));
        flat(spec);
        if (parts.length === 3 && parts[0].k === 'str' && parts[0].v === '.' && parts[2].k === 'str' && parts[2].v === 'f') {
            const p = parts[1];
            return this.expr(p.k === 'call' && dotted(p.f) === 'str' && p.args.length === 1 ? p.args[0] : p);
        }
        throw new Unsupported('format');
    }

    binary(n, outer) {
        const wrap = (code, prec) => (prec < outer ? `(${code})` : code);
        const lt = n.op === '+' || n.op === '&' ? this.typeOf(n.l) : null;
        const rt = n.op === '+' || n.op === '&' ? this.typeOf(n.r) : null;
        if (n.op === '&' || (n.op === '+' && (lt === 'String' || rt === 'String'))) {
            // Joined text: str(x) is not needed beside &.
            const part = (x) => {
                const f = x.k === 'call' && dotted(x.f) === 'str' && x.args.length === 1 ? x.args[0] : x;
                return this.expr(f, PREC['&'] + 1);
            };
            const left = n.l.k === 'bin' && (n.l.op === '&' || (n.l.op === '+' && this.typeOf(n.l) === 'String'))
                ? this.expr(n.l, PREC['&']) : part(n.l);
            return wrap(`${left} & ${part(n.r)}`, PREC['&']);
        }
        if (n.op === '**') {
            return wrap(`${this.expr(n.l, PREC['^'] + 1)} ^ ${this.expr(n.r, PREC['^'])}`, PREC['^']);
        }
        if (n.op === '//') {
            const code = `${this.expr(n.l, PREC['/'])} / ${this.expr(n.r, PREC['/'] + 1)}`;
            // Whole numbers: the division is cut to a whole number like in Python (for zero and positive values).
            return this.typeOf(n.l) === 'Real' || this.typeOf(n.r) === 'Real' ? `Floor(${code})` : `Int(${code})`;
        }
        const op = n.op;
        const prec = PREC[op];
        return wrap(`${this.expr(n.l, prec)} ${op} ${this.expr(n.r, prec + 1)}`, prec);
    }
}

// ---- Lines and statements ---------------------------------------------------------------------------------------------

/**
 * The logical lines of the code with their indentation (a line inside open brackets goes on to the next one).
 *
 * @param {string} code
 * @returns {Array<{indent: number, text: string, line: number}>}
 */
export const logicalLines = (code) => {
    const out = [];
    const raw = String(code).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    let open = null;
    let depth = 0;
    raw.forEach((text, k) => {
        const body = text.replace(/\s+$/, '');
        if (open) {
            open.text += ` ${body.trim()}`;
        } else {
            if (!body.trim()) {
                return;
            }
            open = {indent: body.length - body.trimStart().length, text: body.trim(), line: k + 1};
        }
        depth = bracketDepth(open.text);
        if (depth <= 0 && !open.text.endsWith('\\')) {
            out.push(open);
            open = null;
        } else if (open.text.endsWith('\\')) {
            open.text = open.text.slice(0, -1);
        }
    });
    if (open) {
        out.push(open);
    }
    return out;
};

/**
 * How many brackets are still open in a line (strings and the comment are skipped).
 *
 * @param {string} text
 * @returns {number}
 */
const bracketDepth = (text) => {
    let depth = 0;
    let q = null;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '\\') {
                i++;
            } else if (c === q) {
                q = null;
            }
        } else if (c === '"' || c === "'") {
            q = c;
        } else if (c === '#') {
            break;
        } else if ('([{'.includes(c)) {
            depth++;
        } else if (')]}'.includes(c)) {
            depth--;
        }
    }
    return depth;
};

/**
 * The lines as a tree by their indentation; a line ending in a colon owns the deeper lines after it, and a header
 * with its statement on the same line (if x: break) gets it as its only child.
 *
 * @param {Array} lines logicalLines
 * @returns {Array<{text: string, line: number, kids: Array}>}
 */
export const nest = (lines) => {
    const root = {kids: [], indent: -1};
    const stack = [root];
    lines.forEach((l) => {
        while (stack.length > 1 && l.indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
        const node = {text: l.text, line: l.line, indent: l.indent, kids: []};
        stack[stack.length - 1].kids.push(node);
        const head = headerSplit(l.text);
        if (head && head.rest) {
            node.text = `${head.head}:`;
            node.kids.push({text: head.rest, line: l.line, indent: l.indent + 1, kids: []});
        } else if (head) {
            stack.push(node);
        }
    });
    return root.kids;
};

/**
 * A compound statement header (if, elif, else, while, for, def) and what follows its colon.
 *
 * @param {string} text
 * @returns {?{head: string, rest: string}}
 */
const headerSplit = (text) => {
    if (!/^(if|elif|else|while|for|def)\b/.test(text)) {
        return null;
    }
    let depth = 0;
    let q = null;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '\\') {
                i++;
            } else if (c === q) {
                q = null;
            }
        } else if (c === '"' || c === "'") {
            q = c;
        } else if ('([{'.includes(c)) {
            depth++;
        } else if (')]}'.includes(c)) {
            depth--;
        } else if (c === ':' && depth === 0) {
            const rest = text.slice(i + 1).replace(/#.*$/, '').trim();
            return {head: text.slice(0, i).trim(), rest};
        }
    }
    return null;
};

/**
 * Turn Python code into an algorithm.
 *
 * @param {string} code
 * @param {Object} [opts]
 * @param {string} [opts.name] name of the algorithm
 * @returns {{program: Object, warnings: Array<{line: number, text: string}>, blocks: number}}
 */
export const importPython = (code, {name = 'Imported'} = {}) => {
    const tree = nest(logicalLines(code));
    const warnings = [];
    const defs = [];
    const top = [];
    tree.forEach((node) => {
        if (/^def\s/.test(node.text)) {
            defs.push(node);
        } else if (/^(import|from)\s/.test(node.text) || /^if\s+__name__\s*==/.test(node.text)) {
            // The start of the program: main() is called by the algorithm itself.
            if (/^if\s+__name__/.test(node.text)) {
                node.kids.filter((k) => !/^main\s*\(\s*\)$/.test(k.text)).forEach((k) => top.push(k));
            }
        } else {
            top.push(node);
        }
    });
    // The functions and their return types first (calls need them).
    const fns = Object.create(null);
    const heads = defs.map((d) => {
        const m = /^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[\w[\], ]+)?\s*:$/.exec(d.text);
        if (!m) {
            warnings.push({line: d.line, text: d.text});
            return null;
        }
        const params = m[2].split(',').map((s) => s.split(/[:=]/)[0].trim()).filter(Boolean);
        return {node: d, name: m[1], params};
    }).filter(Boolean);
    heads.forEach((h) => {
        fns[h.name.toLowerCase()] = '';
    });
    heads.forEach((h) => {
        fns[h.name.toLowerCase()] = returnType(h, fns);
    });
    heads.forEach((h) => {
        fns[h.name.toLowerCase()] = returnType(h, fns);
    });
    const program = createProgram(name);
    program.functions = [];
    const mainHead = heads.find((h) => h.name.toLowerCase() === 'main');
    const mainBody = mainHead ? [...mainHead.node.kids, ...top] : top;
    program.functions.push(makeFunction({name: 'Main', params: [], body: mainBody}, fns, warnings, true));
    heads.filter((h) => h !== mainHead).forEach((h) => {
        program.functions.push(makeFunction({name: h.name, params: h.params, body: h.node.kids}, fns, warnings, false));
    });
    let blocks = 0;
    const count = (list) => (list || []).forEach((b) => {
        blocks++;
        ['then', 'else', 'body'].forEach((k) => count(b[k]));
    });
    program.functions.forEach((f) => count(f.body));
    warnings.sort((a, b) => a.line - b.line);
    return {program, warnings, blocks};
};

/**
 * The type a function returns ('' for none), from its return statements.
 *
 * @param {Object} h head of the def
 * @param {Object} fns known return types
 * @returns {string}
 */
const returnType = (h, fns) => {
    const types = Object.create(null);
    h.params.forEach((p) => {
        types[p.toLowerCase()] = {type: 'Integer'};
    });
    const tr = new Translator(types, fns);
    let found = '';
    const visit = (nodes) => nodes.forEach((n) => {
        const m = /^return\s+(.+)$/.exec(n.text);
        if (m) {
            try {
                const t = tr.typeOf(parsePy(tokenize(m[1])));
                found = found === 'Real' || t === 'Real' ? 'Real' : t;
            } catch (e) {
                found = found || 'Integer';
            }
        }
        if (/^[A-Za-z_]\w*\s*=[^=]/.test(n.text)) {
            // Local variables: the type of a returned name.
            const a = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(n.text);
            try {
                types[a[1].toLowerCase()] = types[a[1].toLowerCase()] || {type: tr.typeOf(parsePy(tokenize(a[2])))};
            } catch (e) {
                // Not an expression this import reads.
            }
        }
        visit(n.kids);
    });
    visit(h.node.kids);
    return found;
};

/**
 * Make one function: its declarations (from the values given to its variables) and its blocks.
 *
 * @param {{name: string, params: string[], body: Array}} def
 * @param {Object} fns return types of the functions
 * @param {Array} warnings lines that became comments
 * @param {boolean} isMain
 * @returns {Object} function of the algorithm
 */
const makeFunction = (def, fns, warnings, isMain) => {
    const types = Object.create(null);
    const declared = new Set();
    const tr = new Translator(types, fns);
    // Arrays used as parameters: a[i] or m[i][j] in the body.
    const params = def.params.map((p) => {
        const uses = JSON.stringify(def.body.map(function flat(n) {
            return [n.text, ...n.kids.map(flat)];
        }));
        const re = new RegExp(`\\b${p}\\s*\\[[^\\]]*\\]\\s*(\\[)?`);
        const m = re.exec(uses);
        let dims = 0;
        if (m) {
            dims = m[1] ? 2 : 1;
        }
        types[p.toLowerCase()] = {type: 'Integer', dims};
        declared.add(p.toLowerCase());
        return {name: p, type: 'Integer', ...(m ? {array: true} : {}), ...(m && m[1] ? {matrix: true} : {})};
    });
    // The variables the generated code declares at the start (n = 0, s = "") give their types.
    const body = [...def.body];
    for (let i = 0; i < body.length;) {
        if (/^#/.test(body[i].text)) {
            i++;
            continue;
        }
        const m = /^([A-Za-z_]\w*)\s*=\s*(0|0\.0|""|''|False)$/.exec(body[i].text);
        if (!m || types[m[1].toLowerCase()]) {
            break;
        }
        types[m[1].toLowerCase()] = {type: {'0': 'Integer', '0.0': 'Real', 'False': 'Boolean'}[m[2]] || 'String', dims: 0,
            name: m[1], fixed: true};
        body.splice(i, 1);
    }
    // Types of the other variables from the values given to them (twice: a value can use a later variable).
    for (let pass = 0; pass < 2; pass++) {
        scanTypes(body, types, tr);
    }
    const ctx = {tr, types, declared, warnings, fns};
    const blocks = statements(body, ctx);
    // Declare blocks at the start, one per type, for the variables that are not arrays or parameters.
    const byType = Object.create(null);
    Object.keys(types).map((key) => [key, types[key]]).forEach(([key, v]) => {
        if (!v.dims && !declared.has(key)) {
            (byType[v.type] = byType[v.type] || []).push(v.name || key);
        }
    });
    const decls = ['Integer', 'Real', 'String', 'Boolean'].filter((t) => byType[t])
        .map((t) => createBlock('declare', {name: byType[t].join(', '), varType: t}));
    const lead = [];
    while (blocks.length && blocks[0].type === 'comment') {
        lead.push(blocks.shift());
    }
    return {
        name: def.name,
        params,
        returnType: isMain ? null : (fns[def.name.toLowerCase()] || null),
        body: [...lead, ...decls, ...blocks],
    };
};

/**
 * Find the types of the variables from the statements that give them values.
 *
 * @param {Array} nodes
 * @param {Object} types name => {type, dims, name}
 * @param {Translator} tr
 */
const scanTypes = (nodes, types, tr) => nodes.forEach((n) => {
    const set = (name, type, dims = 0) => {
        const key = name.toLowerCase();
        const old = types[key];
        if (!old) {
            types[key] = {type, dims, name};
        } else if (!old.fixed && !old.dims && !dims && old.type !== type) {
            // Integer and Real make Real; a text wins over a number.
            if (old.type === 'String' || type === 'String') {
                old.type = 'String';
            } else if (old.type === 'Real' || type === 'Real') {
                old.type = 'Real';
            }
        }
    };
    let m;
    if ((m = /^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\(/.exec(n.text))) {
        set(m[1], 'Integer');
    } else if ((m = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(n.text)) && !/^[A-Za-z_]\w*\s*==/.test(n.text)) {
        try {
            const value = parsePy(tokenize(m[2]));
            const shape = arrayShape(value, tr);
            if (shape) {
                set(m[1], shape.type, shape.dims);
            } else if (isInput(value)) {
                set(m[1], inputType(value));
            } else {
                set(m[1], tr.typeOf(value));
            }
        } catch (e) {
            // Not an expression this import reads: the line becomes a comment later.
        }
    } else if ((m = /^([A-Za-z_]\w*)\s*(\+|-|\*|\/\/|\/|%|\*\*)=\s*(.+)$/.exec(n.text))) {
        try {
            const value = parsePy(tokenize(m[3]));
            set(m[1], m[2] === '/' ? 'Real' : tr.typeOf(value));
        } catch (e) {
            // As above.
        }
    }
    scanTypes(n.kids, types, tr);
});

/**
 * The shape of a list made by the code: [0] * n, [[0] * m for _ in range(n)] or [1, 2, 3].
 *
 * @param {Object} v Python tree
 * @param {Translator} tr
 * @returns {?{type: string, dims: number, size: ?Object, size2: ?Object, items: ?Array}}
 */
const arrayShape = (v, tr) => {
    if (v.k === 'bin' && v.op === '*' && v.l.k === 'list' && v.l.items.length === 1) {
        return {type: tr.typeOf(v.l.items[0]), dims: 1, size: v.r, fill: v.l.items[0]};
    }
    if (v.k === 'comp' && v.range.k === 'call' && dotted(v.range.f) === 'range' && v.range.args.length === 1) {
        const inner = arrayShape(v.item, tr);
        if (inner && inner.dims === 1) {
            return {type: inner.type, dims: 2, size: v.range.args[0], size2: inner.size, fill: inner.fill};
        }
    }
    if (v.k === 'list' && v.items.length && v.items.every((x) => x.k !== 'list')) {
        const types = v.items.map((x) => tr.typeOf(x));
        const type = ['String', 'Real'].find((x) => types.includes(x)) || types[0];
        return {type, dims: 1, size: {k: 'num', v: String(v.items.length)}, items: v.items};
    }
    return null;
};

/**
 * Is a value read with input()? int(input()), float(input("n? ")), input(), input().strip().lower() == "true".
 *
 * @param {Object} v Python tree
 * @returns {boolean}
 */
const isInput = (v) => Boolean(inputCall(v));

/**
 * The input() call inside a value read with input(), or null.
 *
 * @param {Object} v Python tree
 * @returns {?Object}
 */
const inputCall = (v) => {
    if (v.k === 'call' && dotted(v.f) === 'input') {
        return v;
    }
    if (v.k === 'call' && ['int', 'float', 'str'].includes(dotted(v.f)) && v.args.length === 1) {
        return inputCall(v.args[0]);
    }
    if (v.k === 'call' && v.f.k === 'attr' && ['strip', 'lower', 'upper'].includes(v.f.name)) {
        return inputCall(v.f.e);
    }
    if (v.k === 'bin' && v.op === '==' && v.r.k === 'str' && v.r.v.toLowerCase() === 'true') {
        return inputCall(v.l);
    }
    return null;
};

/**
 * The type of a value read with input().
 *
 * @param {Object} v Python tree
 * @returns {string}
 */
const inputType = (v) => {
    if (v.k === 'bin') {
        return 'Boolean';
    }
    const f = dotted(v.f);
    return {'int': 'Integer', 'float': 'Real'}[f] || 'String';
};

/**
 * The blocks of a list of statements.
 *
 * @param {Array} nodes
 * @param {Object} ctx
 * @returns {Array}
 */
const statements = (nodes, ctx) => {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (/^if\s/.test(n.text) && n.text.endsWith(':')) {
            // An if, with the elif and else after it.
            const chain = [n];
            while (nodes[i + 1] && /^(elif\s.*|else\s*):$/.test(nodes[i + 1].text)) {
                chain.push(nodes[++i]);
            }
            out.push(...guard(n, ctx, () => [ifChain(chain, ctx)]));
            continue;
        }
        out.push(...guard(n, ctx, () => statement(n, ctx)));
    }
    return out;
};

/**
 * A statement, or a comment with its line when it cannot be turned into blocks.
 *
 * @param {Object} n
 * @param {Object} ctx
 * @param {Function} make
 * @returns {Array}
 */
const guard = (n, ctx, make) => {
    try {
        return make();
    } catch (e) {
        if (!(e instanceof Unsupported)) {
            throw e;
        }
        ctx.warnings.push({line: n.line, text: n.text});
        return [createBlock('comment', {text: `Python: ${n.text}`}), ...(n.kids.length ? statements(n.kids, ctx) : [])];
    }
};

const ifChain = (chain, ctx) => {
    const [first, ...rest] = chain;
    const cond = ctx.tr.expr(parsePy(tokenize(/^(?:if|elif)\s+(.+):$/.exec(first.text)[1])));
    const block = createBlock('if', {cond, then: statements(first.kids, ctx), 'else': []});
    if (rest.length) {
        block.else = /^else\s*:$/.test(rest[0].text) ? statements(rest[0].kids, ctx) : [ifChain(rest, ctx)];
    }
    return block;
};

/**
 * One statement (a header with its body, or a simple statement).
 *
 * @param {Object} n
 * @param {Object} ctx
 * @returns {Array}
 */
const statement = (n, ctx) => {
    const {tr} = ctx;
    const text = n.text;
    const parse = (s) => parsePy(tokenize(s));
    let m;
    if (/^#/.test(text)) {
        return [createBlock('comment', {text: text.replace(/^#+\s?/, '')})];
    }
    if (text === 'pass' || /^(global|nonlocal)\s/.test(text)) {
        return [];
    }
    if (/^(""".*"""|'''.*''')$/.test(text)) {
        return [createBlock('comment', {text: text.slice(3, -3).trim()})];
    }
    if (text === 'break' || text === 'continue') {
        return [createBlock(text)];
    }
    if ((m = /^return(?:\s+(.+))?$/.exec(text))) {
        return [createBlock('return', {expr: m[1] ? tr.expr(parse(m[1])) : ''})];
    }
    if ((m = /^while\s+(.+):$/.exec(text))) {
        return [whileLoop(m[1], n, ctx)];
    }
    if ((m = /^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*:$/.exec(text))) {
        return [forLoop(m[1], m[2], n, ctx)];
    }
    if (/^(if|elif|else|for|while|def|class|try|except|with)\b/.test(text)) {
        throw new Unsupported(text);
    }
    if ((m = /^print\s*\((.*)\)$/.exec(text))) {
        return [printBlock(parse(`print(${m[1]})`), ctx)];
    }
    if ((m = /^([A-Za-z_]\w*(?:\s*\[[^=]*\])*)\s*(\+|-|\*|\/\/|\/|%|\*\*)=\s*(.+)$/.exec(text))) {
        const target = assignTarget(m[1], ctx);
        const value = parse(`(${m[1]}) ${m[2]} (${m[3]})`);
        return [createBlock('assign', {target, expr: tr.expr(value)})];
    }
    if ((m = /^([A-Za-z_]\w*(?:\s*\[.*\])*)\s*=\s*(.+)$/.exec(text)) && !/^[^=]*==/.test(text.slice(0, text.indexOf('=') + 2))) {
        return assignment(m[1], parse(m[2]), ctx);
    }
    const value = parse(text);
    if (value.k === 'call') {
        return [createBlock('call', {expr: tr.expr(value)})];
    }
    throw new Unsupported(text);
};

/**
 * A while loop; while True whose last statement is if …: break is a Do … While.
 *
 * @param {string} cond
 * @param {Object} n
 * @param {Object} ctx
 * @returns {Object}
 */
const whileLoop = (cond, n, ctx) => {
    const last = n.kids[n.kids.length - 1];
    const stop = last && /^if\s+(.+):$/.exec(last.text);
    if (cond.trim() === 'True' && stop && last.kids.length === 1 && last.kids[0].text === 'break') {
        const body = statements(n.kids.slice(0, -1), ctx);
        let c = parsePy(tokenize(stop[1]));
        // The loop ends with if not (x): break, so it is Do … While x.
        c = c.k === 'un' && c.op === 'not' ? c.e : {k: 'un', op: 'not', e: c};
        return createBlock('dowhile', {cond: ctx.tr.expr(c), body});
    }
    return createBlock('while', {cond: ctx.tr.expr(parsePy(tokenize(cond))), body: statements(n.kids, ctx)});
};

/**
 * A loop for v in range(…): a For block from start to end (the end of range is not reached).
 *
 * @param {string} v variable
 * @param {string} argText the arguments of range
 * @param {Object} n
 * @param {Object} ctx
 * @returns {Object}
 */
const forLoop = (v, argText, n, ctx) => {
    const list = parsePy(tokenize(`[${argText}]`)).items;
    if (!list.length || list.length > 3) {
        throw new Unsupported('range');
    }
    const [a, b, s] = list.length === 1 ? [{k: 'num', v: '0'}, list[0], null] : list;
    const stepValue = s ? Number(ctx.tr.expr(s)) : 1;
    if (s && !Number.isFinite(stepValue)) {
        // The direction of a step that is not a number is not known.
        throw new Unsupported('range step');
    }
    const down = stepValue < 0;
    const endText = ctx.tr.expr(b);
    let end;
    if (/^-?\d+$/.test(endText)) {
        end = String(Number(endText) + (down ? 1 : -1));
    } else if (!down && / \+ 1$/.test(endText)) {
        end = endText.replace(/ \+ 1$/, '');
    } else if (down && / - 1$/.test(endText)) {
        end = endText.replace(/ - 1$/, '');
    } else {
        end = `${ctx.tr.expr(b, PREC['-'])} ${down ? '+' : '-'} 1`;
    }
    return createBlock('for', {variable: v, start: ctx.tr.expr(a), end, step: s ? ctx.tr.expr(s) : '1',
        body: statements(n.kids, ctx)});
};

/**
 * A print(…): an Output block (several values joined with a space, end="" keeps the line open).
 *
 * @param {Object} call
 * @param {Object} ctx
 * @returns {Object}
 */
const printBlock = (call, ctx) => {
    const {tr} = ctx;
    const sep = call.named.sep ? call.named.sep : {k: 'str', v: ' '};
    if (call.named.sep && sep.k !== 'str') {
        throw new Unsupported('sep');
    }
    const end = call.named.end;
    if (end && end.k !== 'str') {
        throw new Unsupported('end');
    }
    let value;
    if (!call.args.length) {
        value = {k: 'str', v: ''};
    } else {
        value = call.args.reduce((acc, x) => {
            if (!acc) {
                return x;
            }
            const withSep = sep.v === '' ? acc : {k: 'bin', op: '&', l: acc, r: sep};
            return {k: 'bin', op: '&', l: withSep, r: x};
        }, null);
    }
    // An empty end keeps the line open; another end (end=" ") is written after the values.
    if (end && end.v !== '' && end.v !== '\n') {
        value = {k: 'bin', op: '&', l: value, r: end};
    }
    return createBlock('output', {expr: tr.expr(value), newline: !end || end.v === '\n'});
};

/**
 * The target of an assignment: x, a[i] or m[i][j] (m[i, j] in the algorithm).
 *
 * @param {string} text
 * @param {Object} ctx
 * @returns {string}
 */
const assignTarget = (text, ctx) => {
    const t = parsePy(tokenize(text));
    if (t.k === 'name') {
        return t.v;
    }
    if (t.k === 'idx') {
        return ctx.tr.index(t);
    }
    throw new Unsupported(text);
};

/**
 * An assignment x = value: an Assign, an Input (with an Output for its prompt), or the Declare of a list.
 *
 * @param {string} targetText
 * @param {Object} value Python tree
 * @param {Object} ctx
 * @returns {Array}
 */
const assignment = (targetText, value, ctx) => {
    const {tr, types, declared} = ctx;
    const target = assignTarget(targetText, ctx);
    const plain = /^[A-Za-z_]\w*$/.test(target);
    const shape = plain ? arrayShape(value, tr) : null;
    // A Declare fills a new list with 0, 0.0, "" or false; another value has no block of its own.
    if (shape && shape.fill && !['0', '0.0', '""', 'false'].includes(tr.expr(shape.fill))) {
        throw new Unsupported('fill');
    }
    if (shape) {
        const key = target.toLowerCase();
        types[key] = {...types[key], type: shape.type, dims: shape.dims, name: target};
        declared.add(key);
        const out = [createBlock('declare', {name: target, varType: shape.type, size: tr.expr(shape.size),
            ...(shape.dims === 2 ? {size2: tr.expr(shape.size2)} : {})})];
        if (shape.items) {
            shape.items.forEach((x, i) => out.push(createBlock('assign', {target: `${target}[${i}]`, expr: tr.expr(x)})));
        }
        return out;
    }
    const input = inputCall(value);
    if (input) {
        const out = [];
        if (input.args.length) {
            out.push(createBlock('output', {expr: tr.expr(input.args[0]), newline: false}));
        }
        out.push(createBlock('input', {target}));
        return out;
    }
    if (value.k === 'list' || value.k === 'comp') {
        throw new Unsupported('list');
    }
    return [createBlock('assign', {target, expr: tr.expr(value)})];
};
