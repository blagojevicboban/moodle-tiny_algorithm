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
 * Code generation (Python, C, C++, Java, C#, JavaScript, Pascal) from the algorithm model.
 *
 * @module tiny_algorithm/codegen
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {parseExpr} from './expr';

const BUILTIN_TYPES = {
    abs: 'Real', sqrt: 'Real', sin: 'Real', cos: 'Real', tan: 'Real', log: 'Real', exp: 'Real', pi: 'Real',
    floor: 'Integer', ceiling: 'Integer', round: 'Integer', 'int': 'Integer', sign: 'Integer', random: 'Integer', len: 'Integer',
    toint: 'Integer', toreal: 'Real', tostring: 'String', 'char': 'String', isnumeric: 'Boolean',
    tochar: 'String', tocode: 'Integer',
};

// Wrap generated code in parentheses unless it is a plain name.
const atom = (code) => (/^[\w.]+$/.test(code) ? code : `(${code})`);

/**
 * Flowgorithm string functions: Char(s, i) (Char(n) for older diagrams), ToChar(n), ToCode(s).
 *
 * @param {String} l lower case function name
 * @param {Array} args generated argument code
 * @param {Object} f per-language templates: at(s, i), fromCode(n), code(s)
 * @returns {String|null} code, or null for other functions
 */
const charCall = (l, args, f) => {
    if (l === 'char') {
        return args.length > 1 ? f.at(atom(args[0]), args[1]) : f.fromCode(args[0]);
    }
    if (l === 'tochar') {
        return f.fromCode(args[0]);
    }
    return l === 'tocode' ? f.code(atom(args[0])) : null;
};

const CMP = ['==', '!=', '<', '<=', '>', '>='];

/**
 * Static type of an expression given a symbol table (name -> {type, array}) and function table.
 *
 * @param {Object} n AST node
 * @param {Object} syms symbol table (name -> {type, array})
 * @param {Object} fns function table
 */
// eslint-disable-next-line complexity
const typeOf = (n, syms, fns) => {
    switch (n.k) {
        case 'num': return n.int ? 'Integer' : 'Real';
        case 'str': return 'String';
        case 'bool': return 'Boolean';
        case 'var': return syms[n.name] ? syms[n.name].type : 'Integer';
        case 'idx': return syms[n.name] ? syms[n.name].type : 'Integer';
        case 'un': return n.op === '!' ? 'Boolean' : typeOf(n.e, syms, fns);
        case 'call': {
            const f = fns[n.name.toLowerCase()];
            return f ? f.returnType || 'Integer' : BUILTIN_TYPES[n.name.toLowerCase()] || 'Real';
        }
        case 'bin': {
            if (n.op === '&') {
                return 'String';
            }
            if (CMP.includes(n.op) || n.op === '&&' || n.op === '||') {
                return 'Boolean';
            }
            const l = typeOf(n.l, syms, fns);
            const r = typeOf(n.r, syms, fns);
            if (l === 'String' || r === 'String') {
                return 'String';
            }
            return l === 'Real' || r === 'Real' || n.op === '/' || n.op === '^' ? 'Real' : 'Integer';
        }
        default: return 'Integer';
    }
};

/**
 * Flatten string concatenation (& or string +) into parts.
 *
 * @param {Object} n AST node
 * @param {Object} syms symbol table
 * @param {Object} fns function table
 */
const concatParts = (n, syms, fns) => {
    if (n.k === 'bin' && (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String'))) {
        return [...concatParts(n.l, syms, fns), ...concatParts(n.r, syms, fns)];
    }
    return [n];
};

// Operator precedence (higher binds tighter); generated code gets parentheses wherever the tree needs them.
const PREC = {'||': 1, '&&': 2, '==': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3, '+': 4, '-': 4, '&': 4,
    '*': 5, '/': 5, '%': 5, '^': 6};
const precOf = (n) => {
    if (n.k === 'bin') {
        return PREC[n.op] ?? 4;
    }
    return n.k === 'un' ? 7 : 9;
};

// Functions whose code needs a helper in some languages (C++ str(), rand_below()).
let needs = {};

const LANGS = {
    python: {
        ext: 'py', label: 'Python',
        and: 'and', or: 'or', not: 'not ', pow: (l, r) => `${l} ** ${r}`, powInfix: true, div: (l, r) => `${l} / ${r}`,
        bool: (v) => (v ? 'True' : 'False'),
        concat: (parts) => parts.map((p) => (p.type === 'String' ? p.code : `str(${p.code})`)).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'math.sqrt', abs: 'abs', sin: 'math.sin', cos: 'math.cos', tan: 'math.tan', log: 'math.log',
                exp: 'math.exp', floor: 'math.floor', ceiling: 'math.ceil', round: 'round', 'int': 'int', len: 'len',
                random: 'random.randrange', toint: 'int', toreal: 'float', tostring: 'str', pi: 'math.pi'};
            const l = name.toLowerCase();
            const ch = charCall(l, args, {at: (t, i) => `${t}[${i}]`, fromCode: (n) => `chr(${n})`, code: (t) => `ord(${t})`});
            if (ch) {
                return ch;
            }
            if (l === 'pi') {
                return 'math.pi';
            }
            return `${m[l] || name}(${args.join(', ')})`;
        },
    },
    c: {
        ext: 'c', label: 'C',
        and: '&&', or: '||', not: '!', pow: (l, r) => `pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double)${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? '1' : '0'),
        eq: (l, r, op, t) => (t === 'String' ? `strcmp(${l}, ${r}) ${op} 0` : `${l} ${op} ${r}`),
        call: (name, args) => {
            const m = {sqrt: 'sqrt', abs: 'fabs', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', exp: 'exp', floor: 'floor',
                ceiling: 'ceil', round: 'round', 'int': '(int)', len: 'strlen', random: 'rand_below', toint: '(int)',
                toreal: '(double)'};
            const l = name.toLowerCase();
            const ch = charCall(l, args, {at: (t, i) => `char_str(${t}[${i}])`, fromCode: (n) => `char_str(${n})`,
                code: (t) => `(int) (unsigned char) ${t}[0]`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'M_PI' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
    cpp: {
        ext: 'cpp', label: 'C++',
        and: '&&', or: '||', not: '!', pow: (l, r) => `pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concat: (parts) => parts.map((p, i) => {
            if (p.type !== 'String') {
                needs.str = true;
                return `str(${p.code})`;
            }
            return i === 0 && p.node.k === 'str' ? `string(${p.code})` : p.code;
        }).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args, types) => {
            const m = {sqrt: 'sqrt', abs: 'abs', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', exp: 'exp', floor: 'floor',
                ceiling: 'ceil', round: 'round', 'int': '(int)', toint: 'stoi', toreal: 'stod'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `(int) ${atom(args[0])}.length()`;
            }
            if (l === 'random') {
                needs.random = true;
                return `rand_below(${args[0]})`;
            }
            if (l === 'tostring') {
                needs.str = true;
                return types[0] === 'String' ? args[0] : `str(${args[0]})`;
            }
            const ch = charCall(l, args, {at: (t, i) => `string(1, ${t}[${i}])`, fromCode: (n) => `string(1, (char) (${n}))`,
                code: (t) => `(int) (unsigned char) ${t}[0]`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'M_PI' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
    java: {
        ext: 'java', label: 'Java',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concatWrap: true,
        concat: (parts) => parts.map((p, i) => (p.type === 'String' || i > 0 ? p.code : `String.valueOf(${p.code})`)).join(' + '),
        eq: (l, r, op, t) => (t === 'String' ? `${op === '!=' ? '!' : ''}${atom(l)}.equals(${r})` : `${l} ${op} ${r}`),
        call: (name, args) => {
            const m = {sqrt: 'Math.sqrt', abs: 'Math.abs', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log',
                exp: 'Math.exp', floor: 'Math.floor', ceiling: 'Math.ceil', round: 'Math.round', 'int': '(int)',
                random: 'rnd.nextInt', toint: 'Integer.parseInt', toreal: 'Double.parseDouble', tostring: 'String.valueOf'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `${atom(args[0])}.length()`;
            }
            const ch = charCall(l, args, {at: (t, i) => `String.valueOf(${t}.charAt(${i}))`,
                fromCode: (n) => `String.valueOf((char) (${n}))`, code: (t) => `(int) ${t}.charAt(0)`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'Math.PI' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
    csharp: {
        ext: 'cs', label: 'C#',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.Pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concatWrap: true,
        concat: (parts) => parts.map((p, i) => (i === 0 && p.type !== 'String' ? `"" + ${p.code}` : p.code)).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'Math.Sqrt', abs: 'Math.Abs', sin: 'Math.Sin', cos: 'Math.Cos', tan: 'Math.Tan', log: 'Math.Log',
                exp: 'Math.Exp', floor: 'Math.Floor', ceiling: 'Math.Ceiling', round: 'Math.Round',
                'int': '(int)', sign: 'Math.Sign',
                random: 'rnd.Next', toint: 'Convert.ToInt32', toreal: 'Convert.ToDouble', tostring: 'Convert.ToString'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `${atom(args[0])}.Length`;
            }
            const ch = charCall(l, args, {at: (t, i) => `${t}[${i}].ToString()`,
                fromCode: (n) => `((char) (${n})).ToString()`, code: (t) => `(int) ${t}[0]`});
            if (ch) {
                return ch;
            }
            if (l === 'isnumeric') {
                return `double.TryParse(${args[0]}, out _)`;
            }
            return l === 'pi' ? 'Math.PI' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
    javascript: {
        ext: 'js', label: 'JavaScript',
        and: '&&', or: '||', not: '!', pow: (l, r) => `${l} ** ${r}`, powInfix: true, div: (l, r) => `${l} / ${r}`,
        bool: (v) => (v ? 'true' : 'false'),
        concatWrap: true,
        concat: (parts) => parts.map((p, i) => (p.type === 'String' || i > 0 ? p.code : `String(${p.code})`)).join(' + '),
        eq: (l, r, op) => `${l} ${op === '==' ? '===' : '!=='} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'Math.sqrt', abs: 'Math.abs', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log',
                exp: 'Math.exp', floor: 'Math.floor', ceiling: 'Math.ceil', round: 'Math.round', 'int': 'Math.trunc',
                sign: 'Math.sign', toint: 'parseInt', toreal: 'parseFloat', tostring: 'String'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `${atom(args[0])}.length`;
            }
            if (l === 'random') {
                return `Math.floor(Math.random() * ${atom(args[0])})`;
            }
            if (l === 'isnumeric') {
                return `!isNaN(parseFloat(${args[0]}))`;
            }
            const ch = charCall(l, args, {at: (t, i) => `${t}[${i}]`, fromCode: (n) => `String.fromCharCode(${n})`,
                code: (t) => `${t}.charCodeAt(0)`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'Math.PI' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
    pascal: {
        ext: 'pas', label: 'Pascal',
        and: 'and', or: 'or', not: 'not ', pow: (l, r) => `Power(${l}, ${r})`, div: (l, r) => `${l} / ${r}`,
        bool: (v) => (v ? 'True' : 'False'),
        str: (v) => (v === '' ? "''" : `'${v.replace(/'/g, "''")}'`),
        ops: {'%': 'mod', '==': '=', '!=': '<>'},
        // In Pascal "and"/"or" bind tighter than comparisons.
        logicCtx: 3.5,
        concat: (parts) => parts.map((p) => (p.type === 'String' ? p.code : pascalToStr(p.code, p.type))).join(' + '),
        eq: (l, r, op) => `${l} ${op === '==' ? '=' : '<>'} ${r}`,
        call: (name, args, types) => {
            const m = {sqrt: 'Sqrt', abs: 'Abs', sin: 'Sin', cos: 'Cos', tan: 'Tan', log: 'Ln', exp: 'Exp', floor: 'Floor',
                ceiling: 'Ceil', round: 'Round', 'int': 'Trunc', sign: 'Sign', random: 'Random', len: 'Length',
                toint: 'StrToInt', toreal: 'StrToFloat'};
            const l = name.toLowerCase();
            if (l === 'tostring') {
                return pascalToStr(args[0], types[0]);
            }
            if (l === 'isnumeric') {
                return `TryStrToFloat(${args[0]}, Dummy)`;
            }
            // Pascal strings start at 1.
            const at = (t, i) => (/^\d+$/.test(i) ? `${t}[${Number(i) + 1}]` : `${t}[${i} + 1]`);
            const ch = charCall(l, args, {at, fromCode: (n) => `Chr(${n})`, code: (t) => `Ord(${t}[1])`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'Pi' : `${m[l] || name}(${args.join(', ')})`;
        },
    },
};

/**
 * Pascal text of a value for output and string joins (FloatToStr prints 3.5, not 3.5000000000000000E+000).
 *
 * @param {string} code generated expression
 * @param {string} type Integer, Real, String or Boolean
 * @returns {string}
 */
const pascalToStr = (code, type) => ({Integer: `IntToStr(${code})`, Real: `FloatToStr(${code})`,
    Boolean: `BoolToStr(${code}, 'true', 'false')`}[type] || code);

const TYPE_NAMES = {
    c: {Integer: 'int', Real: 'double', String: 'char*', Boolean: 'int'},
    cpp: {Integer: 'int', Real: 'double', String: 'string', Boolean: 'bool'},
    java: {Integer: 'int', Real: 'double', String: 'String', Boolean: 'boolean'},
    csharp: {Integer: 'int', Real: 'double', String: 'string', Boolean: 'bool'},
    pascal: {Integer: 'Integer', Real: 'Real', String: 'string', Boolean: 'Boolean'},
};
const DEFAULTS = {
    python: {Integer: '0', Real: '0.0', String: '""', Boolean: 'False'},
    java: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    csharp: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    cpp: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    javascript: {Integer: '0', Real: '0', String: '""', Boolean: 'false'},
    pascal: {Integer: '0', Real: '0.0', String: "''", Boolean: 'False'},
};

/**
 * Every statement of a list and of the lists nested in it.
 *
 * @param {Array} list statements
 * @returns {Array}
 */
const allBlocks = (list) => list.flatMap((b) => [b, ...allBlocks([...(b.then || []), ...(b.else || []), ...(b.body || [])])]);

export const generate = (lang, program) => {
    const L = LANGS[lang];
    if (!L) {
        throw new Error(`Unsupported language ${lang}`);
    }
    needs = {};
    const pascal = lang === 'pascal';
    const semi = lang === 'python' ? '' : ';';
    const fns = Object.fromEntries(program.functions.map((f) => [f.name.toLowerCase(), f]));
    let syms = {};

    const expr = (src) => {
        // Code of a node; ctx is the precedence the surrounding code needs, so lower precedence gets parentheses.
        // eslint-disable-next-line complexity
        const walk = (n, ctx = 0) => {
            let code;
            switch (n.k) {
                case 'num': code = String(n.v); break;
                case 'str': code = L.str ? L.str(n.v) : JSON.stringify(n.v); break;
                case 'bool': code = L.bool(n.v); break;
                case 'var': code = n.name; break;
                case 'idx': code = `${n.name}[${walk(n.index)}]`; break;
                case 'un': code = n.op === '!' ? `${L.not}${walk(n.e, 8)}` : `${n.op}${walk(n.e, 8)}`; break;
                case 'call': code = L.call(n.name, n.args.map((a) => walk(a)), n.args.map((a) => typeOf(a, syms, fns))); break;
                case 'bin': code = walkBin(n); break;
                default: code = '';
            }
            return precOf(n) < ctx ? `(${code})` : code;
        };
        // eslint-disable-next-line complexity
        const walkBin = (n) => {
            const p = PREC[n.op] ?? 4;
            const t = typeOf(n.l, syms, fns);
            if (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String')) {
                const parts = concatParts(n, syms, fns).map((q) => ({code: walk(q, L.concatWrap ? 4.5 : 0),
                    type: typeOf(q, syms, fns), node: q}));
                return L.concat ? L.concat(parts) : parts.map((q) => q.code).join(' + ');
            }
            if (n.op === '&&' || n.op === '||') {
                const c = L.logicCtx ?? p;
                return `${walk(n.l, c)} ${n.op === '&&' ? L.and : L.or} ${walk(n.r, Math.max(c, p + 0.5))}`;
            }
            if (n.op === '^') {
                return L.powInfix ? L.pow(walk(n.l, 8), walk(n.r, 6)) : L.pow(walk(n.l), walk(n.r));
            }
            if (n.op === '/') {
                const rt = typeOf(n.r, syms, fns);
                return L.div(walk(n.l, 5), walk(n.r, 5.5), t === 'Integer' && rt === 'Integer' ? 'Integer' : 'Real');
            }
            if (n.op === '==' || n.op === '!=') {
                return L.eq(walk(n.l, 3.5), walk(n.r, 3.5), n.op, t);
            }
            const op = (L.ops && L.ops[n.op]) || n.op;
            return `${walk(n.l, CMP.includes(n.op) ? p + 0.5 : p)} ${op} ${walk(n.r, p + 0.5)}`;
        };
        const node = parseExpr(src);
        // The code is built on demand: building it may mark helpers as needed (C++ str()).
        return {node, walk, get code() {
            return walk(node);
        }};
    };
    const ex = (src) => expr(src).code;

    const fmtSpec = {Integer: '%d', Real: '%g', String: '%s', Boolean: '%d'};

    const out = [];
    const emit = (ind, line) => out.push('    '.repeat(ind) + line);

    // eslint-disable-next-line complexity
    const printStmt = (b, ind) => {
        const {node, walk} = expr(b.expr);
        const nl = b.newline !== false;
        const parts = concatParts(node, syms, fns);
        if (lang === 'python') {
            emit(ind, `print(${ex(b.expr)}${nl ? '' : ', end=""'})`);
        } else if (lang === 'java') {
            emit(ind, `System.out.print${nl ? 'ln' : ''}(${ex(b.expr)});`);
        } else if (lang === 'csharp') {
            emit(ind, `Console.Write${nl ? 'Line' : ''}(${ex(b.expr)});`);
        } else if (lang === 'javascript') {
            emit(ind, nl ? `console.log(${ex(b.expr)});` : `process.stdout.write(String(${ex(b.expr)}));`);
        } else if (lang === 'cpp') {
            const items = parts.map((p) => (typeOf(p, syms, fns) === 'Boolean' ? `(${walk(p)} ? "true" : "false")` : walk(p, 3.5)));
            emit(ind, `cout << ${items.join(' << ')}${nl ? ' << endl' : ''};`);
        } else if (pascal) {
            const items = parts.map((p) => {
                const tp = typeOf(p, syms, fns);
                return tp === 'Real' || tp === 'Boolean' ? pascalToStr(walk(p), tp) : walk(p);
            });
            emit(ind, `${nl ? 'writeln' : 'write'}(${items.join(', ')});`);
        } else {
            const fmt = parts.map((p) => fmtSpec[typeOf(p, syms, fns)]).join('');
            const args = parts.map((p) => walk(p)).join(', ');
            emit(ind, `printf("${fmt}${nl ? '\\n' : ''}", ${args});`);
        }
    };
    // eslint-disable-next-line complexity
    const inputStmt = (b, ind) => {
        const t = parseExpr(b.target);
        const sym = syms[t.name] || {type: 'Integer'};
        const target = ex(b.target);
        if (lang === 'python') {
            const conv = {Integer: 'int', Real: 'float', String: 'str', Boolean: 'lambda v: v.lower() == "true"'}[sym.type];
            emit(ind, `${target} = ${conv}(input())`);
        } else if (lang === 'java') {
            const m = {Integer: 'nextInt', Real: 'nextDouble', String: 'next', Boolean: 'nextBoolean'}[sym.type];
            emit(ind, `${target} = in.${m}();`);
        } else if (lang === 'csharp') {
            const conv = {Integer: 'int.Parse(Console.ReadLine())',
                Real: 'double.Parse(Console.ReadLine(), CultureInfo.InvariantCulture)',
                String: 'Console.ReadLine()', Boolean: 'bool.Parse(Console.ReadLine())'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (lang === 'javascript') {
            const conv = {Integer: 'parseInt(input())', Real: 'parseFloat(input())', String: 'input()',
                Boolean: 'input().trim().toLowerCase() === "true"'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (lang === 'cpp') {
            emit(ind, {String: `getline(cin >> ws, ${target});`, Boolean: `cin >> boolalpha >> ${target};`}[sym.type] ||
                `cin >> ${target};`);
        } else if (pascal) {
            emit(ind, sym.type === 'Boolean' ? `${target} := ReadBoolean();` : `readln(${target});`);
        } else {
            const spec = {Integer: '%d', Real: '%lf', String: '%255s', Boolean: '%d'}[sym.type];
            emit(ind, `scanf("${spec}", ${sym.type === 'String' ? target : `&${target}`});`);
        }
    };

    const assignStmt = (b, ind) => {
        const target = ex(b.target);
        if (lang !== 'c' || typeOf(parseExpr(b.target), syms, fns) !== 'String') {
            emit(ind, `${target} ${pascal ? ':=' : '='} ${ex(b.expr)}${semi}`);
            return;
        }
        // C strings are char arrays: copy a single string, format a joined one into a buffer first
        // (the target may be part of the expression, e.g. r = r & c).
        const {node, walk} = expr(b.expr);
        const parts = concatParts(node, syms, fns);
        if (parts.length === 1 && typeOf(parts[0], syms, fns) === 'String') {
            emit(ind, `strcpy(${target}, ${ex(b.expr)});`);
            return;
        }
        const fmt = parts.map((p) => fmtSpec[typeOf(p, syms, fns)]).join('');
        const args = parts.map((p) => walk(p)).join(', ');
        emit(ind, '{');
        emit(ind + 1, 'char tmp[256];');
        emit(ind + 1, `snprintf(tmp, sizeof tmp, "${fmt}", ${args});`);
        emit(ind + 1, `strcpy(${target}, tmp);`);
        emit(ind, '}');
    };

    const declare = (block, ind) => {
        String(block.name).split(',').map((s) => s.trim()).filter(Boolean)
            .forEach((name) => declareOne({...block, name}, ind));
    };
    // eslint-disable-next-line complexity
    const declareOne = (b, ind) => {
        syms[b.name] = {type: b.varType, array: Boolean(String(b.size || '').trim())};
        const arr = syms[b.name].array;
        const dv = DEFAULTS[lang] && DEFAULTS[lang][b.varType];
        if (lang === 'python') {
            emit(ind, arr ? `${b.name} = [${dv}] * ${ex(b.size)}` : `${b.name} = ${dv}`);
        } else if (lang === 'java' || lang === 'csharp') {
            const tn = TYPE_NAMES[lang][b.varType];
            emit(ind, arr ? `${tn}[] ${b.name} = new ${tn}[${ex(b.size)}];` : `${tn} ${b.name} = ${dv};`);
        } else if (lang === 'cpp') {
            const tn = TYPE_NAMES.cpp[b.varType];
            emit(ind, arr ? `vector<${tn}> ${b.name}(${ex(b.size)});` : `${tn} ${b.name} = ${dv};`);
        } else if (lang === 'javascript') {
            emit(ind, arr ? `let ${b.name} = new Array(${ex(b.size)}).fill(${dv});` : `let ${b.name} = ${dv};`);
        } else if (pascal) {
            // Declared in the var section; here the array gets its size and the variable its start value.
            emit(ind, arr ? `SetLength(${b.name}, ${ex(b.size)});` : `${b.name} := ${dv};`);
        } else if (b.varType === 'String') {
            emit(ind, arr ? `char ${b.name}[${ex(b.size)}][256];` : `char ${b.name}[256] = "";`);
        } else {
            const tn = TYPE_NAMES.c[b.varType];
            emit(ind, arr ? `${tn} ${b.name}[${ex(b.size)}];` : `${tn} ${b.name} = 0;`);
        }
    };

    const block = (list, ind) => {
        if (!list.length && !pascal) {
            emit(ind, lang === 'python' ? 'pass' : ';');
        }
        list.forEach((b) => stmt(b, ind));
    };
    const open = (head, ind) => {
        if (lang === 'python') {
            emit(ind, `${head}:`);
        } else if (pascal) {
            emit(ind, head);
            emit(ind, 'begin');
        } else {
            emit(ind, `${head} {`);
        }
    };
    const close = (ind) => lang !== 'python' && emit(ind, pascal ? 'end;' : '}');

    const forStmt = (b, ind) => {
        const step = String(b.step || '1').trim() || '1';
        const neg = /^-/.test(step);
        if (lang === 'python') {
            const range = `${ex(b.start)}, ${ex(b.end)} ${neg ? '- 1' : '+ 1'}${step === '1' ? '' : `, ${ex(step)}`}`;
            open(`for ${b.variable} in range(${range})`, ind);
        } else if (pascal && (step === '1' || step === '-1')) {
            open(`for ${b.variable} := ${ex(b.start)} ${neg ? 'downto' : 'to'} ${ex(b.end)} do`, ind);
        } else if (pascal) {
            // Pascal's for loop only counts by 1.
            emit(ind, `${b.variable} := ${ex(b.start)};`);
            open(`while ${b.variable} ${neg ? '>=' : '<='} ${ex(b.end)} do`, ind);
            block(b.body, ind + 1);
            const by = ex(step);
            emit(ind + 1, `${b.variable} := ${b.variable} ${/^-\d/.test(by) ? `- ${by.slice(1)}` : `+ ${by}`};`);
            close(ind);
            return;
        } else {
            const decl = syms[b.variable] ? '' : {javascript: 'let '}[lang] || 'int ';
            open(`for (${decl}${b.variable} = ${ex(b.start)}; ${b.variable} ${neg ? '>=' : '<='} ${ex(b.end)}; ` +
                `${b.variable} += ${ex(step)})`, ind);
        }
        block(b.body, ind + 1);
        close(ind);
    };

    // eslint-disable-next-line complexity
    const stmt = (b, ind) => {
        switch (b.type) {
            case 'declare': declare(b, ind); break;
            case 'assign': assignStmt(b, ind); break;
            case 'input': inputStmt(b, ind); break;
            case 'output': printStmt(b, ind); break;
            case 'call': emit(ind, `${ex(b.expr)}${semi}`); break;
            case 'return': {
                const value = String(b.expr || '').trim() ? ex(b.expr) : '';
                if (pascal) {
                    emit(ind, value ? `exit(${value});` : 'exit;');
                } else {
                    emit(ind, `return${value ? ` ${value}` : ''}${semi}`);
                }
                break;
            }
            case 'comment': emit(ind, `${lang === 'python' ? '#' : '//'} ${b.text}`); break;
            case 'if':
                if (pascal) {
                    emit(ind, `if ${ex(b.cond)} then`);
                    emit(ind, 'begin');
                    block(b.then, ind + 1);
                    if (b.else.length) {
                        emit(ind, 'end');
                        emit(ind, 'else');
                        emit(ind, 'begin');
                        block(b.else, ind + 1);
                    }
                    emit(ind, 'end;');
                    break;
                }
                open(lang === 'python' ? `if ${ex(b.cond)}` : `if (${ex(b.cond)})`, ind);
                block(b.then, ind + 1);
                if (b.else.length) {
                    emit(ind, lang === 'python' ? 'else:' : '} else {');
                    block(b.else, ind + 1);
                }
                close(ind);
                break;
            case 'while':
                open({python: `while ${ex(b.cond)}`, pascal: `while ${ex(b.cond)} do`}[lang] || `while (${ex(b.cond)})`, ind);
                block(b.body, ind + 1);
                close(ind);
                break;
            case 'dowhile':
                if (lang === 'python') {
                    open('while True', ind);
                    block(b.body, ind + 1);
                    emit(ind + 1, `if not (${ex(b.cond)}): break`);
                } else if (pascal) {
                    emit(ind, 'repeat');
                    block(b.body, ind + 1);
                    emit(ind, `until not (${ex(b.cond)});`);
                } else {
                    emit(ind, 'do {');
                    block(b.body, ind + 1);
                    emit(ind, `} while (${ex(b.cond)});`);
                }
                break;
            case 'for': forStmt(b, ind); break;
            default: break;
        }
    };

    // Pascal: the variables of a function (its declarations and for-loop counters) for the var section.
    const pascalVars = (f) => {
        const vars = new Map();
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                const arr = Boolean(String(b.size || '').trim());
                String(b.name).split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
                    vars.set(name, `${arr ? 'array of ' : ''}${TYPE_NAMES.pascal[b.varType]}`);
                });
            } else if (b.type === 'for' && !vars.has(b.variable)) {
                vars.set(b.variable, 'Integer');
            }
        });
        f.params.forEach((p) => vars.delete(p.name));
        return vars;
    };
    const pascalHead = (f) => {
        const ps = f.params
            .map((p) => `${p.array ? 'var ' : ''}${p.name}: ${p.array ? 'array of ' : ''}${TYPE_NAMES.pascal[p.type]}`)
            .join('; ');
        const args = ps ? `(${ps})` : '';
        return f.returnType ? `function ${f.name}${args}: ${TYPE_NAMES.pascal[f.returnType]};` : `procedure ${f.name}${args};`;
    };

    const fnHead = (f, isMain) => {
        const params = f.params.map((p) => p.name);
        if (lang === 'python') {
            return `def ${isMain ? 'main' : f.name}(${params.join(', ')})`;
        }
        if (lang === 'javascript') {
            return `function ${isMain ? 'main' : f.name}(${params.join(', ')})`;
        }
        const tn = TYPE_NAMES[lang];
        const ret = f.returnType ? tn[f.returnType] : 'void';
        const ps = f.params.map((p) => {
            if (lang === 'cpp') {
                return `${p.array ? `vector<${tn[p.type]}>&` : tn[p.type]} ${p.name}`;
            }
            return `${tn[p.type]}${p.array ? {java: '[]', csharp: '[]'}[lang] || '*' : ''} ${p.name}`;
        }).join(', ');
        if (isMain) {
            return {java: 'public static void main(String[] args)', csharp: 'static void Main()', cpp: 'int main()'}[lang] ||
                'int main(void)';
        }
        return `${lang === 'java' || lang === 'csharp' ? 'static ' : ''}${ret} ${f.name}(${ps})`;
    };

    const funcs = [...program.functions].sort((a, b) => (a.name.toLowerCase() === 'main') - (b.name.toLowerCase() === 'main'));
    const mainName = fns.main ? 'main' : program.functions[0].name.toLowerCase();
    const base = lang === 'java' || lang === 'csharp' ? 1 : 0;

    // Function bodies first: the C++ and Pascal headers depend on what the code needs.
    funcs.forEach((f) => {
        const isMain = f.name.toLowerCase() === mainName;
        syms = {};
        f.params.forEach((p) => {
            syms[p.name] = {type: p.type, array: Boolean(p.array)};
        });
        if (pascal) {
            if (!isMain) {
                emit(0, pascalHead(f));
            }
            const vars = pascalVars(f);
            if (vars.size) {
                emit(0, 'var');
                vars.forEach((type, name) => emit(1, `${name}: ${type};`));
            }
            emit(0, 'begin');
            block(f.body, 1);
            emit(0, isMain ? 'end.' : 'end;');
            emit(0, '');
            return;
        }
        open(fnHead(f, isMain), base);
        block(f.body, base + 1);
        if ((lang === 'c' || lang === 'cpp') && isMain) {
            emit(base + 1, 'return 0;');
        }
        close(base);
        emit(0, '');
    });
    const body = out.splice(0);

    if (lang === 'python') {
        emit(0, 'import math');
        emit(0, 'import random');
        emit(0, '');
    } else if (lang === 'c') {
        ['stdio.h', 'stdlib.h', 'string.h', 'math.h'].forEach((h) => emit(0, `#include <${h}>`));
        emit(0, '');
        emit(0, 'static int rand_below(int n) { return rand() % n; }');
        emit(0, '');
        if (program.functions.some((f) => /\b(char|tochar)\s*\(/i.test(JSON.stringify(f.body)))) {
            // One character as a string (Char, ToChar); a few buffers so one printf may use several.
            emit(0, 'static char *char_str(int c) {');
            emit(1, 'static char buf[8][2];');
            emit(1, 'static int k;');
            emit(1, 'k = (k + 1) % 8;');
            emit(1, 'buf[k][0] = (char) c;');
            emit(1, 'buf[k][1] = 0;');
            emit(1, 'return buf[k];');
            emit(0, '}');
            emit(0, '');
        }
    } else if (lang === 'cpp') {
        ['iostream', 'string', 'vector', 'cmath', 'cstdlib'].concat(needs.str ? ['sstream'] : [])
            .forEach((h) => emit(0, `#include <${h}>`));
        emit(0, '');
        emit(0, 'using namespace std;');
        emit(0, '');
        if (needs.str) {
            // Text of a number or truth value, printed the way cout prints it.
            emit(0, 'template <typename T> string str(T value) {');
            emit(1, 'ostringstream out;');
            emit(1, 'out << boolalpha << value;');
            emit(1, 'return out.str();');
            emit(0, '}');
            emit(0, '');
        }
        if (needs.random) {
            emit(0, 'int rand_below(int n) { return rand() % n; }');
            emit(0, '');
        }
        const protos = funcs.filter((f) => f.name.toLowerCase() !== mainName).map((f) => `${fnHead(f, false)};`);
        if (protos.length) {
            protos.forEach((p) => emit(0, p));
            emit(0, '');
        }
    } else if (lang === 'javascript') {
        emit(0, '// Run with Node.js: node main.js');
        emit(0, "const lines = require('fs').readFileSync(0, 'utf8').split(/\\r?\\n/);");
        emit(0, 'let nextLine = 0;');
        emit(0, 'const input = () => lines[nextLine++] ?? \'\';');
        emit(0, '');
    } else if (pascal) {
        emit(0, 'program Main;');
        emit(0, '');
        emit(0, '{$mode objfpc}{$H+}');
        emit(0, '');
        emit(0, 'uses SysUtils, Math;');
        emit(0, '');
        if (/isnumeric\s*\(/i.test(JSON.stringify(program.functions))) {
            emit(0, 'var');
            emit(1, 'Dummy: Double;');
            emit(0, '');
        }
        if (/"varType":"Boolean"/.test(JSON.stringify(program.functions))) {
            emit(0, 'function ReadBoolean: Boolean;');
            emit(0, 'var');
            emit(1, 'S: string;');
            emit(0, 'begin');
            emit(1, 'readln(S);');
            emit(1, "Result := LowerCase(Trim(S)) = 'true';");
            emit(0, 'end;');
            emit(0, '');
        }
        const others = funcs.filter((f) => f.name.toLowerCase() !== mainName);
        if (others.length > 1) {
            // Forward declarations, so functions may call each other in any order.
            others.forEach((f) => emit(0, `${pascalHead(f)} forward;`));
            emit(0, '');
        }
    } else if (lang === 'csharp') {
        emit(0, 'using System;');
        emit(0, 'using System.Globalization;');
        emit(0, '');
        emit(0, 'class Program {');
        emit(1, 'static Random rnd = new Random();');
        emit(1, '');
    } else {
        emit(0, 'import java.util.*;');
        emit(0, '');
        emit(0, 'public class Main {');
        emit(1, 'static Scanner in = new Scanner(System.in);');
        emit(1, 'static Random rnd = new Random();');
        emit(1, '');
    }
    out.push(...body);
    if (lang === 'java' || lang === 'csharp') {
        emit(0, '}');
    } else if (lang === 'python') {
        emit(0, `if __name__ == "__main__":`);
        emit(1, `${mainName === 'main' ? 'main' : mainName}()`);
    } else if (lang === 'javascript') {
        emit(0, `${mainName === 'main' ? 'main' : mainName}();`);
    }
    return out.join('\n').replace(/\n*$/, '\n');
};

export const languages = Object.keys(LANGS);
export const languageLabels = Object.fromEntries(Object.entries(LANGS).map(([k, l]) => [k, l.label]));
export const extensionOf = (lang) => LANGS[lang].ext;

/**
 * Convert an expression AST back into source text (used for per-part rendering).
 *
 * @param {Object} n expression AST node
 */
export function unparse(n) {
    switch (n.k) {
        case 'num': return String(n.v);
        case 'str': return JSON.stringify(n.v);
        case 'bool': return n.v ? 'true' : 'false';
        case 'var': return n.name;
        case 'idx': return `${n.name}[${unparse(n.index)}]`;
        case 'un': return `${n.op}(${unparse(n.e)})`;
        case 'call': return `${n.name}(${n.args.map(unparse).join(', ')})`;
        case 'bin': return `(${unparse(n.l)} ${n.op} ${unparse(n.r)})`;
        default: return '';
    }
}
