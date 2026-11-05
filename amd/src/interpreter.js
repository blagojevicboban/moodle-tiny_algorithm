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
 * Generator based interpreter. Yields events so a UI can step / animate it.
 *
 * Events: {event:'step', id}, {event:'output', text}, {event:'input', name, type}
 * (the consumer passes the entered string back through next()), {event:'done'}.
 *
 * @module tiny_algorithm/interpreter
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {parseExpr} from './expr';
import {AlgorithmError} from './strings';

const RETURN = Symbol('return');
const BREAK = Symbol('break');
const CONTINUE = Symbol('continue');

/** Most elements an array or a matrix may have (the PHP interpreter of qtype_algorithm has the same limit). */
export const MAX_ARRAY_SIZE = 100000;

/** Most nested calls of user functions below the main one (deeper recursion stops with an error, in PHP too). */
export const MAX_CALL_DEPTH = 200;

/** Most characters the output may have (the PHP interpreter has the same limit). */
export const MAX_OUTPUT = 100000;

/** Seed of Random in tests and grading, so the same algorithm always gets the same numbers (as in PHP). */
export const RANDOM_SEED = 20261110;

const MODULUS = 2147483647;

/**
 * Random numbers from a seed (Park-Miller): every value stays below 2^53, so PHP computes exactly the same numbers.
 *
 * @param {number} seed
 * @returns {function(): number} the next number, at least 0 and less than 1
 */
const seededRandom = (seed) => {
    let s = Math.abs(Math.trunc(seed)) % MODULUS || 1;
    return () => {
        s = (s * 48271) % MODULUS;
        return s / MODULUS;
    };
};

/**
 * Flowgorithm ToFixed(x, n): the number as text with n decimals (rounded as Round does, the same in PHP).
 *
 * @param {*} x number
 * @param {*} n decimals (0 to 20)
 * @returns {string}
 */
const toFixed = (x, n) => {
    const k = Math.min(20, Math.max(0, Math.trunc(Number(n)) || 0));
    const p = Math.pow(10, k);
    const v = Math.round(Number(x) * p) / p;
    if (!Number.isFinite(v) || Math.abs(v) >= 1e21) {
        return String(v);
    }
    const text = v.toFixed(k);
    return text.startsWith('-') && Number(text) === 0 ? text.slice(1) : text;
};

const BUILTINS = {
    abs: Math.abs, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, log10: Math.log10,
    log: Math.log, exp: Math.exp, floor: Math.floor, ceiling: Math.ceil, round: Math.round,
    'int': Math.trunc, sign: Math.sign, sgn: Math.sign,
    len: (s) => (Array.isArray(s) ? s.length : String(s).length),
    size: (s) => (Array.isArray(s) ? s.length : String(s).length),
    tofixed: toFixed,
    // Flowgorithm Char(s, i): character at index i (0-based). Char(n) with one argument is kept for older diagrams.
    'char': (s, i) => {
        if (i === undefined) {
            return String.fromCharCode(s);
        }
        const text = String(s);
        const k = Number(i);
        if (!Number.isInteger(k) || k < 0 || k >= text.length) {
            throw new AlgorithmError('charindex', {index: String(i), text});
        }
        return text[k];
    },
    tochar: (n) => String.fromCharCode(n),
    tocode: (s) => {
        if (String(s) === '') {
            throw new AlgorithmError('tocodeempty');
        }
        return String(s).charCodeAt(0);
    },
    toint: (v) => Math.trunc(Number(v)),
    tointeger: (v) => Math.trunc(Number(v)),
    toreal: Number,
    tostring: String,
    isnumeric: (s) => s !== '' && !isNaN(Number(s)),
    pi: () => Math.PI,
};

const INTEGER_TEXT = /^[+-]?\d+$/;
const REAL_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * The value of a typed input line: only a whole number for Integer, a number for Real, true or false for Boolean.
 *
 * @param {string} text the line
 * @param {string} type type of the variable
 * @returns {*}
 */
export const parseInputValue = (text, type) => {
    const t = String(text).trim();
    if (type === 'String') {
        return String(text);
    }
    const ok = type === 'Boolean' ? /^(true|false)$/i.test(t) : (type === 'Integer' ? INTEGER_TEXT : REAL_TEXT).test(t);
    if (!ok) {
        throw new AlgorithmError('invalidinput', {text: String(text), type});
    }
    return type === 'Boolean' ? t.toLowerCase() === 'true' : Number(t);
};

const badNumber = (value) => typeof value === 'boolean' || (typeof value === 'string' && isNaN(Number(value)));

const coerce = (type, value, name) => {
    switch (type) {
        case 'Integer':
            if (badNumber(value)) {
                throw new AlgorithmError('assigninteger', {value: String(value), name});
            }
            return Math.trunc(Number(value));
        case 'Real':
            if (badNumber(value)) {
                throw new AlgorithmError('assignreal', {value: String(value), name});
            }
            return Number(value);
        case 'Boolean':
            if (typeof value !== 'boolean') {
                throw new AlgorithmError('assignboolean', {value: String(value), name});
            }
            return value;
        default:
            return String(value);
    }
};

const defaultValue = (type) => ({Integer: 0, Real: 0, String: '', Boolean: false}[type]);

const fmt = (v) => (typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e10) / 1e10) : String(v));

/**
 * A value as a function test shows it: arrays as [1, 2, 3], matrices as [[1, 2], [3, 4]].
 *
 * @param {*} v value
 * @returns {string}
 */
const show = (v) => (Array.isArray(v) ? `[${v.map(show).join(', ')}]` : fmt(v));

/**
 * Names declared by a declare block ("a, b, p" declares three variables).
 *
 * @param {Object} b declare block
 */
const declaredNames = (b) => String(b.name).split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Copy of the variables of a scope for the watch panel (arrays are copied so later steps cannot change them).
 *
 * @param {object} env variables of one function call
 * @returns {Array<{name: string, type: string, value: *}>}
 */
const snapshot = (env) => Object.values(env || {}).map((v) => ({
    name: v.name, type: v.type,
    value: Array.isArray(v.value) ? v.value.map((x) => (Array.isArray(x) ? x.slice() : x)) : v.value,
}));

const hasText = (s) => s !== undefined && s !== null && String(s).trim() !== '';

/**
 * Break and Continue may only be inside a loop of their own function; checked before the algorithm starts.
 *
 * @param {Object} program program model
 */
const checkLoops = (program) => {
    const visit = (list, inLoop) => {
        for (const b of Array.isArray(list) ? list : []) {
            if ((b.type === 'break' || b.type === 'continue') && !inLoop) {
                throw new AlgorithmError('notinloop', {block: b.type === 'break' ? 'Break' : 'Continue'});
            }
            const loop = inLoop || ['for', 'while', 'dowhile'].includes(b.type);
            ['then', 'else', 'body'].forEach((k) => visit(b[k], loop));
        }
    };
    program.functions.forEach((f) => visit(f.body, false));
};

/**
 * Run a program as a generator of events (step, output, input request, result of a call, end).
 *
 * @param {Object} program program model
 * @param {Object} options options
 * @param {number} [options.maxSteps] step limit
 * @param {string|null} [options.call] a call such as Sum(2, 3) to evaluate instead of running the main function
 * @param {number|null} [options.seed] seed of Random (tests and grading), null for really random numbers
 */
export function* execute(program, {maxSteps = 1000000, call = null, seed = null} = {}) {
    checkLoops(program);
    const cache = new Map();
    const ast = (s) => {
        if (!cache.has(s)) {
            cache.set(s, parseExpr(s));
        }
        return cache.get(s);
    };
    const funcs = new Map(program.functions.map((f) => [f.name.toLowerCase(), f]));
    let steps = 0;
    let depth = 0;
    let written = 0;
    let lastEnv = Object.create(null);
    let topArgs = [];
    // Arrays written in the call of a function test ([1, 2]); their elements get the type of the parameter.
    const literals = new WeakSet();
    const random = seed === null ? Math.random : seededRandom(seed);

    const lookup = (env, name) => {
        const v = Object.hasOwn(env, name.toLowerCase()) ? env[name.toLowerCase()] : null;
        if (!v) {
            throw new AlgorithmError('notdeclared', {name});
        }
        return v;
    };

    /**
     * Element of an array a[i] or a matrix a[i, j]: the variable, the list that holds the element and its index.
     *
     * @param {Object} n idx node
     * @param {Object} env environment
     */
    const arrayIndex = function* (n, env) {
        const v = lookup(env, n.name);
        if (!Array.isArray(v.value)) {
            throw new AlgorithmError('notarray', {name: n.name});
        }
        const dims = v.dims || 1;
        if ((n.index2 ? 2 : 1) !== dims) {
            throw new AlgorithmError('dimensions', {name: n.name, count: String(dims)});
        }
        const i = yield* evalNode(n.index, env);
        if (i < 0 || i >= v.value.length) {
            throw new AlgorithmError('indexrange', {index: String(i), name: n.name});
        }
        if (!n.index2) {
            return [v, v.value, i];
        }
        const j = yield* evalNode(n.index2, env);
        const row = v.value[i];
        if (!Array.isArray(row)) {
            throw new AlgorithmError('indexrange', {index: String(i), name: n.name}); // An index that is not a whole number.
        }
        if (j < 0 || j >= row.length) {
            throw new AlgorithmError('indexrange', {index: String(j), name: n.name});
        }
        return [v, row, j];
    };

    const divide = (op, l, r) => {
        if (r === 0) {
            throw new AlgorithmError('divzero');
        }
        return op === '/' ? l / r : l % r;
    };

    const binary = (op, l, r) => {
        switch (op) {
            case '+': return typeof l === 'string' || typeof r === 'string' ? fmt(l) + fmt(r) : l + r;
            case '&': return fmt(l) + fmt(r);
            case '-': return l - r;
            case '*': return l * r;
            case '/':
            case '%': return divide(op, l, r);
            case '^': return Math.pow(l, r);
            case '==': return l === r;
            case '!=': return l !== r;
            case '<': return l < r;
            case '<=': return l <= r;
            case '>': return l > r;
            case '>=': return l >= r;
            default: throw new AlgorithmError('badoperator', {op});
        }
    };

    /**
     * Value of a variable; Pi without a variable of that name is the number pi (as in Flowgorithm).
     *
     * @param {Object} env environment
     * @param {string} name variable name
     * @returns {*}
     */
    const readVar = (env, name) => (name.toLowerCase() === 'pi' && !Object.hasOwn(env, 'pi') ? Math.PI :
        lookup(env, name).value);

    /**
     * Values of a list of expressions (arguments of a call, items of an array).
     *
     * @param {Object[]} nodes AST nodes
     * @param {Object} env environment
     */
    function* evalList(nodes, env) {
        const values = [];
        for (const node of nodes) {
            values.push(yield* evalNode(node, env));
        }
        return values;
    }

    /**
     * Evaluate an expression node.
     *
     * @param {Object} n AST node
     * @param {Object} env environment
     */
    function* evalNode(n, env) {
        switch (n.k) {
            case 'num':
            case 'str':
            case 'bool':
                return n.v;
            case 'var':
                return readVar(env, n.name);
            case 'idx': {
                const [, list, i] = yield* arrayIndex(n, env);
                return list[i];
            }
            case 'un': {
                const e = yield* evalNode(n.e, env);
                if (n.op === '-') {
                    return -e;
                }
                return n.op === '!' ? !e : e;
            }
            case 'bin': {
                const l = yield* evalNode(n.l, env);
                if (n.op === '&&') {
                    return l ? Boolean(yield* evalNode(n.r, env)) : false;
                }
                if (n.op === '||') {
                    return l ? true : Boolean(yield* evalNode(n.r, env));
                }
                return binary(n.op, l, yield* evalNode(n.r, env));
            }
            case 'arr': {
                const items = yield* evalList(n.items, env);
                literals.add(items);
                return items;
            }
            case 'call': {
                const args = yield* evalList(n.args, env);
                const lname = n.name.toLowerCase();
                if (funcs.has(lname)) {
                    return yield* callFunction(funcs.get(lname), args);
                }
                if (lname === 'random') {
                    return Math.floor(random() * args[0]);
                }
                if (Object.hasOwn(BUILTINS, lname)) {
                    return BUILTINS[lname](...args);
                }
                throw new AlgorithmError('unknownfunction', {name: n.name});
            }
            default:
                throw new AlgorithmError('badexpression');
        }
    }
    const evalStr = (s, env) => evalNode(ast(s), env);

    /**
     * Store a value in a variable or array element.
     *
     * @param {string} targetStr assignment target
     * @param {*} value value to store
     * @param {Object} env environment
     */
    function* assign(targetStr, value, env) {
        const t = ast(targetStr);
        if (t.k === 'var') {
            const v = lookup(env, t.name);
            v.value = coerce(v.type, value, t.name);
        } else if (t.k === 'idx') {
            const [v, list, i] = yield* arrayIndex(t, env);
            list[i] = coerce(v.type, value, t.name);
        } else {
            throw new AlgorithmError('badtarget');
        }
    }

    const tick = (id, env) => {
        if (++steps > maxSteps) {
            throw new AlgorithmError('steplimit');
        }
        return {event: 'step', id, vars: snapshot(env)};
    };

    /**
     * Evaluate the condition of a decision and tell the host which way it goes (the editor marks that branch).
     *
     * @param {Object} b if, while or do-while block
     * @param {Object} env environment
     */
    function* condition(b, env) {
        const taken = Boolean(yield* evalStr(b.cond, env));
        yield {event: 'branch', id: b.id, taken};
        return taken;
    }

    /**
     * Run a list of blocks in order.
     *
     * @param {Object[]} list blocks
     * @param {Object} env environment
     */
    function* runList(list, env) {
        for (const b of list) {
            const r = yield* runBlock(b, env);
            if (r) {
                return r;
            }
        }
        return null;
    }

    /**
     * Run an input block (asks the host for a value).
     *
     * @param {Object} b input block
     * @param {Object} env environment
     */
    function* runInput(b, env) {
        const t = ast(b.target);
        const decl = lookup(env, t.name);
        const text = yield {event: 'input', name: b.target, type: decl.type};
        yield* assign(b.target, parseInputValue(text, decl.type), env);
    }

    /**
     * Run a for loop block.
     *
     * @param {Object} b for block
     * @param {Object} env environment
     */
    function* runFor(b, env) {
        const start = yield* evalStr(b.start, env);
        const end = yield* evalStr(b.end, env);
        const step = hasText(b.step) ? yield* evalStr(b.step, env) : 1;
        if (step === 0) {
            throw new AlgorithmError('forstepzero');
        }
        if (!Object.hasOwn(env, b.variable.toLowerCase())) {
            env[b.variable.toLowerCase()] = {type: 'Integer', value: 0, name: b.variable};
        }
        for (let i = start; ; i += step) {
            const taken = step > 0 ? i <= end : i >= end;
            yield {event: 'branch', id: b.id, taken};
            if (!taken) {
                break;
            }
            env[b.variable.toLowerCase()].value = i;
            const r = yield* runList(b.body, env);
            if (r && r[0] === BREAK) {
                break;
            }
            if (r && r[0] !== CONTINUE) {
                return r;
            }
            yield tick(b.id, env);
        }
        return null;
    }

    /**
     * Run a single block.
     *
     * @param {Object} b block
     * @param {Object} env environment
     */
    // eslint-disable-next-line complexity
    function* runBlock(b, env) {
        yield tick(b.id, env);
        switch (b.type) {
            case 'declare': {
                // A second size makes a matrix (rows, columns).
                const size = hasText(b.size) ? yield* evalStr(b.size, env) : null;
                const size2 = size !== null && hasText(b.size2) ? yield* evalStr(b.size2, env) : null;
                if (size !== null && Number(size) * (size2 === null ? 1 : Number(size2)) > MAX_ARRAY_SIZE) {
                    throw new AlgorithmError('arraysize', {size: size2 === null ? String(size) : `${size} x ${size2}`,
                        max: String(MAX_ARRAY_SIZE)});
                }
                const row = () => Array.from({length: size2}, () => defaultValue(b.varType));
                for (const nm of declaredNames(b)) {
                    let value = defaultValue(b.varType);
                    if (size !== null) {
                        value = Array.from({length: size}, () => (size2 === null ? defaultValue(b.varType) : row()));
                    }
                    let dims = size === null ? 0 : 1;
                    if (size2 !== null) {
                        dims = 2;
                    }
                    env[nm.toLowerCase()] = {name: nm, type: b.varType, value, dims};
                }
                break;
            }
            case 'assign':
                yield* assign(b.target, yield* evalStr(b.expr, env), env);
                break;
            case 'input':
                yield* runInput(b, env);
                break;
            case 'output': {
                const v = yield* evalStr(b.expr, env);
                const text = fmt(v) + (b.newline === false ? '' : '\n');
                written += text.length;
                if (written > MAX_OUTPUT) {
                    throw new AlgorithmError('outputlimit', {max: String(MAX_OUTPUT)});
                }
                yield {event: 'output', text};
                break;
            }
            case 'if':
                return yield* runList((yield* condition(b, env)) ? b.then : b.else, env);
            case 'while':
                while (yield* condition(b, env)) {
                    const r = yield* runList(b.body, env);
                    if (r && r[0] === BREAK) {
                        break;
                    }
                    if (r && r[0] !== CONTINUE) {
                        return r;
                    }
                    yield tick(b.id, env);
                }
                break;
            case 'dowhile': {
                let again = true;
                while (again) {
                    const r = yield* runList(b.body, env);
                    if (r && r[0] === BREAK) {
                        break;
                    }
                    if (r && r[0] !== CONTINUE) {
                        return r;
                    }
                    yield tick(b.id, env);
                    again = yield* condition(b, env);
                }
                break;
            }
            case 'for':
                return yield* runFor(b, env);
            case 'call':
                yield* evalStr(b.expr, env);
                break;
            case 'return': {
                const value = hasText(b.expr) ? yield* evalStr(b.expr, env) : undefined;
                yield {event: 'branch', id: b.id, taken: true};
                return [RETURN, value];
            }
            case 'break':
            case 'continue':
                // The editor marks the line of the jump.
                yield {event: 'branch', id: b.id, taken: true};
                return [b.type === 'break' ? BREAK : CONTINUE];
            default:
                break;
        }
        return null;
    }

    /**
     * Check the shape of an array written in a test call and give its elements the type of the parameter.
     *
     * @param {Object} p parameter
     * @param {Array} value the array
     */
    const fromLiteral = (p, value) => {
        const rows = p.matrix ? value : [value];
        const width = p.matrix && rows.length ? rows[0].length : 0;
        let count = 0;
        for (const row of rows) {
            if (!Array.isArray(row) || (p.matrix && row.length !== width) || row.some((x) => Array.isArray(x))) {
                throw new AlgorithmError('argshape', {name: p.name});
            }
            count += row.length;
        }
        if (count > MAX_ARRAY_SIZE) {
            throw new AlgorithmError('arraysize', {size: String(count), max: String(MAX_ARRAY_SIZE)});
        }
        rows.forEach((row) => row.forEach((x, i) => {
            row[i] = coerce(p.type, x, p.name);
        }));
    };

    /**
     * Call a user function.
     *
     * @param {Object} fn function model
     * @param {Array} args argument values
     */
    function* callFunction(fn, args) {
        if (args.length !== fn.params.length) {
            throw new AlgorithmError('argcount', {name: fn.name, count: String(fn.params.length)});
        }
        if (depth > MAX_CALL_DEPTH) {
            throw new AlgorithmError('calldepth', {max: String(MAX_CALL_DEPTH)});
        }
        const env = Object.create(null);
        if (depth === 0) {
            topArgs = args;
        }
        fn.params.forEach((p, i) => {
            if (!p.array) {
                if (Array.isArray(args[i])) {
                    throw new AlgorithmError('argshape', {name: p.name});
                }
                env[p.name.toLowerCase()] = {name: p.name, type: p.type, value: coerce(p.type, args[i], p.name)};
                return;
            }
            if (literals.has(args[i])) {
                fromLiteral(p, args[i]);
            }
            // An array or a matrix is passed by reference; its shape must match the parameter.
            const value = args[i];
            const dims = p.matrix ? 2 : 1;
            if (!Array.isArray(value)) {
                throw new AlgorithmError('notarray', {name: p.name});
            }
            if (value.length && Array.isArray(value[0]) !== (dims === 2)) {
                throw new AlgorithmError('dimensions', {name: p.name, count: String(dims)});
            }
            env[p.name.toLowerCase()] = {name: p.name, type: p.type, value, dims};
        });
        depth++;
        let r;
        try {
            r = yield* runList(fn.body, env);
        } catch (e) {
            // A very deep recursion can fill the browser's own stack before the limit; it is the same error.
            if (e instanceof RangeError) {
                throw new AlgorithmError('calldepth', {max: String(MAX_CALL_DEPTH)});
            }
            throw e;
        } finally {
            depth--;
        }
        lastEnv = env; // The last function to finish is the main one.
        return r ? r[1] : undefined;
    }

    if (call !== null) {
        // A function test: evaluate the call (its arguments are values) and report what the function returns, then
        // the arrays written in the call as the function left them (a function may change them, e.g. sort them).
        const node = parseExpr(call, {literals: true});
        const value = yield* evalNode(node, Object.create(null));
        let text = value === undefined || value === null ? '' : show(value);
        const fn = node.k === 'call' ? funcs.get(node.name.toLowerCase()) : null;
        if (fn) {
            fn.params.forEach((p, i) => {
                if (p.array && node.args[i] && node.args[i].k === 'arr') {
                    text += `${text === '' ? '' : '\n'}${p.name} = ${show(topArgs[i])}`;
                }
            });
        }
        yield {event: 'result', text};
    } else {
        const main = funcs.get('main') || program.functions[0];
        yield* callFunction(main, []);
    }
    yield {event: 'done', vars: snapshot(lastEnv)};
}

/**
 * Synchronous convenience runner for tests/headless use.
 *
 * @param {object} program
 * @param {Array} inputs values returned for input blocks
 * @param {object} opts
 * @returns {string} console output
 */
export const runSync = (program, inputs = [], opts = {}) => {
    const q = [...inputs];
    const gen = execute(program, opts);
    let out = '';
    let res = gen.next();
    while (!res.done) {
        const ev = res.value;
        if (ev.event === 'output') {
            out += ev.text;
        }
        if (ev.event === 'input') {
            if (!q.length) {
                throw new Error('Input requested but none provided');
            }
            res = gen.next(String(q.shift()));
        } else {
            res = gen.next();
        }
    }
    return out;
};
