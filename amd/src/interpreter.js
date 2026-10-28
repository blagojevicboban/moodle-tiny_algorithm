/**
 * Generator based interpreter. Yields events so a UI can step / animate it.
 *
 * Events: {event:'step', id}, {event:'output', text}, {event:'input', name, type}
 * (the consumer passes the entered string back through next()), {event:'done'}.
 *
 * @module tiny_algorithm/interpreter
 */
import {parseExpr} from './expr';

const RETURN = Symbol('return');

const BUILTINS = {
    abs: Math.abs, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    log: Math.log, exp: Math.exp, floor: Math.floor, ceiling: Math.ceil, round: Math.round,
    'int': Math.trunc, sign: Math.sign,
    random: (n) => Math.floor(Math.random() * n),
    len: (s) => (Array.isArray(s) ? s.length : String(s).length),
    // Flowgorithm Char(s, i): character at index i (0-based). Char(n) with one argument is kept for older diagrams.
    'char': (s, i) => {
        if (i === undefined) {
            return String.fromCharCode(s);
        }
        const text = String(s);
        const k = Number(i);
        if (!Number.isInteger(k) || k < 0 || k >= text.length) {
            throw new Error(`Char: index ${i} is outside the string "${text}"`);
        }
        return text[k];
    },
    tochar: (n) => String.fromCharCode(n),
    tocode: (s) => {
        if (String(s) === '') {
            throw new Error('ToCode: empty string');
        }
        return String(s).charCodeAt(0);
    },
    toint: (v) => Math.trunc(Number(v)),
    toreal: Number,
    tostring: String,
    isnumeric: (s) => s !== '' && !isNaN(Number(s)),
    pi: () => Math.PI,
};

const badNumber = (value) => typeof value === 'boolean' || (typeof value === 'string' && isNaN(Number(value)));

const coerce = (type, value, name) => {
    switch (type) {
        case 'Integer':
            if (badNumber(value)) {
                throw new Error(`Cannot assign '${value}' to Integer ${name}`);
            }
            return Math.trunc(Number(value));
        case 'Real':
            if (badNumber(value)) {
                throw new Error(`Cannot assign '${value}' to Real ${name}`);
            }
            return Number(value);
        case 'Boolean':
            if (typeof value !== 'boolean') {
                throw new Error(`Cannot assign '${value}' to Boolean ${name}`);
            }
            return value;
        default:
            return String(value);
    }
};

const defaultValue = (type) => ({Integer: 0, Real: 0, String: '', Boolean: false}[type]);

const fmt = (v) => (typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e10) / 1e10) : String(v));

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
    name: v.name, type: v.type, value: Array.isArray(v.value) ? v.value.slice() : v.value,
}));

const hasText = (s) => s !== undefined && s !== null && String(s).trim() !== '';

/**
 * Run a program as a generator of events (step, output, input request, end).
 *
 * @param {Object} program program model
 * @param {Object} options options
 * @param {number} [options.maxSteps] step limit
 */
export function* execute(program, {maxSteps = 1000000} = {}) {
    const cache = new Map();
    const ast = (s) => {
        if (!cache.has(s)) {
            cache.set(s, parseExpr(s));
        }
        return cache.get(s);
    };
    const funcs = new Map(program.functions.map((f) => [f.name.toLowerCase(), f]));
    let steps = 0;
    let lastEnv = {};

    const lookup = (env, name) => {
        const v = env[name.toLowerCase()];
        if (!v) {
            throw new Error(`Variable '${name}' is not declared`);
        }
        return v;
    };

    const arrayIndex = function* (n, env) {
        const v = lookup(env, n.name);
        if (!Array.isArray(v.value)) {
            throw new Error(`'${n.name}' is not an array`);
        }
        const i = yield* evalNode(n.index, env);
        if (i < 0 || i >= v.value.length) {
            throw new Error(`Index ${i} out of range for '${n.name}'`);
        }
        return [v, i];
    };

    const divide = (op, l, r) => {
        if (r === 0) {
            throw new Error('Division by zero');
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
            default: throw new Error(`Bad operator ${op}`);
        }
    };

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
                return lookup(env, n.name).value;
            case 'idx': {
                const [v, i] = yield* arrayIndex(n, env);
                return v.value[i];
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
            case 'call': {
                const args = [];
                for (const a of n.args) {
                    args.push(yield* evalNode(a, env));
                }
                const lname = n.name.toLowerCase();
                if (funcs.has(lname)) {
                    return yield* callFunction(funcs.get(lname), args);
                }
                if (BUILTINS[lname]) {
                    return BUILTINS[lname](...args);
                }
                throw new Error(`Unknown function '${n.name}'`);
            }
            default:
                throw new Error('Bad expression');
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
            const [v, i] = yield* arrayIndex(t, env);
            v.value[i] = coerce(v.type, value, t.name);
        } else {
            throw new Error('Invalid assignment target');
        }
    }

    const tick = (id, env) => {
        if (++steps > maxSteps) {
            throw new Error('Step limit exceeded (possible infinite loop)');
        }
        return {event: 'step', id, vars: snapshot(env)};
    };

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
        let val = text;
        if (decl.type === 'Boolean') {
            val = String(text).trim().toLowerCase() === 'true';
        } else if (decl.type !== 'String') {
            val = Number(text);
            if (String(text).trim() === '' || isNaN(val)) {
                throw new Error(`'${text}' is not a valid ${decl.type}`);
            }
        }
        yield* assign(b.target, val, env);
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
            throw new Error('For loop step cannot be 0');
        }
        if (!env[b.variable.toLowerCase()]) {
            env[b.variable.toLowerCase()] = {type: 'Integer', value: 0, name: b.variable};
        }
        for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
            env[b.variable.toLowerCase()].value = i;
            const r = yield* runList(b.body, env);
            if (r) {
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
                const size = hasText(b.size) ? yield* evalStr(b.size, env) : null;
                for (const nm of declaredNames(b)) {
                    env[nm.toLowerCase()] = {
                        name: nm,
                        type: b.varType,
                        value: size === null ? defaultValue(b.varType) : Array.from({length: size}, () => defaultValue(b.varType)),
                    };
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
                yield {event: 'output', text: fmt(v) + (b.newline === false ? '' : '\n')};
                break;
            }
            case 'if':
                return yield* runList((yield* evalStr(b.cond, env)) ? b.then : b.else, env);
            case 'while':
                while (yield* evalStr(b.cond, env)) {
                    const r = yield* runList(b.body, env);
                    if (r) {
                        return r;
                    }
                    yield tick(b.id, env);
                }
                break;
            case 'dowhile': {
                let again = true;
                while (again) {
                    const r = yield* runList(b.body, env);
                    if (r) {
                        return r;
                    }
                    yield tick(b.id, env);
                    again = yield* evalStr(b.cond, env);
                }
                break;
            }
            case 'for':
                return yield* runFor(b, env);
            case 'call':
                yield* evalStr(b.expr, env);
                break;
            case 'return':
                return [RETURN, hasText(b.expr) ? yield* evalStr(b.expr, env) : undefined];
            default:
                break;
        }
        return null;
    }

    /**
     * Call a user function.
     *
     * @param {Object} fn function model
     * @param {Array} args argument values
     */
    function* callFunction(fn, args) {
        if (args.length !== fn.params.length) {
            throw new Error(`Function '${fn.name}' expects ${fn.params.length} argument(s)`);
        }
        const env = {};
        fn.params.forEach((p, i) => {
            env[p.name.toLowerCase()] = {name: p.name, type: p.type, value: p.array ? args[i] : coerce(p.type, args[i], p.name)};
        });
        const r = yield* runList(fn.body, env);
        lastEnv = env; // The last function to finish is the main one.
        return r ? r[1] : undefined;
    }

    const main = funcs.get('main') || program.functions[0];
    yield* callFunction(main, []);
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
