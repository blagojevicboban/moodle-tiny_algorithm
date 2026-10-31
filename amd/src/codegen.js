/**
 * Code generation (Python, C, Java) from the algorithm model.
 *
 * @module tiny_algorithm/codegen
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

const LANGS = {
    python: {
        ext: 'py',
        and: 'and', or: 'or', not: 'not ', pow: (l, r) => `${l} ** ${r}`, div: (l, r) => `${l} / ${r}`,
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
        ext: 'c',
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
    java: {
        ext: 'java',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concat: (parts) => parts.map((p, i) => (p.type === 'String' || i > 0 ? p.code : `String.valueOf(${p.code})`)).join(' + '),
        eq: (l, r, op, t) => (t === 'String' ? `${op === '!=' ? '!' : ''}${l}.equals(${r})` : `${l} ${op} ${r}`),
        call: (name, args) => {
            const m = {sqrt: 'Math.sqrt', abs: 'Math.abs', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log',
                exp: 'Math.exp', floor: 'Math.floor', ceiling: 'Math.ceil', round: 'Math.round', 'int': '(int)',
                random: 'rnd.nextInt', toint: 'Integer.parseInt', toreal: 'Double.parseDouble', tostring: 'String.valueOf'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `${args[0]}.length()`;
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
        ext: 'cs',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.Pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concat: (parts) => parts.map((p, i) => (i === 0 && p.type !== 'String' ? `"" + ${p.code}` : p.code)).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'Math.Sqrt', abs: 'Math.Abs', sin: 'Math.Sin', cos: 'Math.Cos', tan: 'Math.Tan', log: 'Math.Log',
                exp: 'Math.Exp', floor: 'Math.Floor', ceiling: 'Math.Ceiling', round: 'Math.Round',
                'int': '(int)', sign: 'Math.Sign',
                random: 'rnd.Next', toint: 'Convert.ToInt32', toreal: 'Convert.ToDouble', tostring: 'Convert.ToString'};
            const l = name.toLowerCase();
            if (l === 'len') {
                return `${args[0]}.Length`;
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
};

const TYPE_NAMES = {
    c: {Integer: 'int', Real: 'double', String: 'char*', Boolean: 'int'},
    java: {Integer: 'int', Real: 'double', String: 'String', Boolean: 'boolean'},
    csharp: {Integer: 'int', Real: 'double', String: 'string', Boolean: 'bool'},
};

export const generate = (lang, program) => {
    const L = LANGS[lang];
    if (!L) {
        throw new Error(`Unsupported language ${lang}`);
    }
    const fns = Object.fromEntries(program.functions.map((f) => [f.name.toLowerCase(), f]));
    let syms = {};

    const expr = (src) => {
        // eslint-disable-next-line complexity
        const walk = (n) => {
            switch (n.k) {
                case 'num': return String(n.v);
                case 'str': return JSON.stringify(n.v);
                case 'bool': return L.bool(n.v);
                case 'var': return n.name;
                case 'idx': return `${n.name}[${walk(n.index)}]`;
                case 'un': return n.op === '!' ? `${L.not}${walk(n.e)}` : `${n.op}${walk(n.e)}`;
                case 'call': return L.call(n.name, n.args.map(walk));
                case 'bin': {
                    const t = typeOf(n.l, syms, fns);
                    if (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String')) {
                        const parts = concatParts(n, syms, fns).map((p) => ({code: walk(p), type: typeOf(p, syms, fns)}));
                        return L.concat ? L.concat(parts) : parts.map((p) => p.code).join(' + ');
                    }
                    if (n.op === '&&' || n.op === '||') {
                        return `${walk(n.l)} ${n.op === '&&' ? L.and : L.or} ${walk(n.r)}`;
                    }
                    if (n.op === '^') {
                        return L.pow(walk(n.l), walk(n.r));
                    }
                    if (n.op === '/') {
                        const rt = typeOf(n.r, syms, fns);
                        return L.div(walk(n.l), walk(n.r), t === 'Integer' && rt === 'Integer' ? 'Integer' : 'Real');
                    }
                    if (n.op === '==' || n.op === '!=') {
                        return L.eq(walk(n.l), walk(n.r), n.op, t);
                    }
                    return `${walk(n.l)} ${n.op} ${walk(n.r)}`;
                }
                default: return '';
            }
        };
        const node = parseExpr(src);
        return {code: walk(node), node};
    };
    const ex = (src) => expr(src).code;

    const fmtSpec = {Integer: '%d', Real: '%g', String: '%s', Boolean: '%d'};

    const out = [];
    const emit = (ind, line) => out.push('    '.repeat(ind) + line);

    const printStmt = (b, ind) => {
        const {node} = expr(b.expr);
        const nl = b.newline !== false;
        if (lang === 'python') {
            emit(ind, `print(${ex(b.expr)}${nl ? '' : ', end=""'})`);
        } else if (lang === 'java') {
            emit(ind, `System.out.print${nl ? 'ln' : ''}(${ex(b.expr)});`);
        } else if (lang === 'csharp') {
            emit(ind, `Console.Write${nl ? 'Line' : ''}(${ex(b.expr)});`);
        } else {
            const parts = concatParts(node, syms, fns);
            const fmt = parts.map((p) => fmtSpec[typeOf(p, syms, fns)]).join('');
            const args = parts.map((p) => ex(unparse(p))).join(', ');
            emit(ind, `printf("${fmt}${nl ? '\\n' : ''}", ${args});`);
        }
    };
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
        } else {
            const spec = {Integer: '%d', Real: '%lf', String: '%255s', Boolean: '%d'}[sym.type];
            emit(ind, `scanf("${spec}", ${sym.type === 'String' ? target : `&${target}`});`);
        }
    };

    const assignStmt = (b, ind) => {
        const target = ex(b.target);
        if (lang !== 'c' || typeOf(parseExpr(b.target), syms, fns) !== 'String') {
            emit(ind, `${target} = ${ex(b.expr)}${lang === 'python' ? '' : ';'}`);
            return;
        }
        // C strings are char arrays: copy a single string, format a joined one into a buffer first
        // (the target may be part of the expression, e.g. r = r & c).
        const parts = concatParts(expr(b.expr).node, syms, fns);
        if (parts.length === 1 && typeOf(parts[0], syms, fns) === 'String') {
            emit(ind, `strcpy(${target}, ${ex(b.expr)});`);
            return;
        }
        const fmt = parts.map((p) => fmtSpec[typeOf(p, syms, fns)]).join('');
        const args = parts.map((p) => ex(unparse(p))).join(', ');
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
    const declareOne = (b, ind) => {
        syms[b.name] = {type: b.varType, array: Boolean(String(b.size || '').trim())};
        const arr = syms[b.name].array;
        if (lang === 'python') {
            const dv = {Integer: '0', Real: '0.0', String: '""', Boolean: 'False'}[b.varType];
            emit(ind, arr ? `${b.name} = [${dv}] * ${ex(b.size)}` : `${b.name} = ${dv}`);
        } else if (lang === 'java') {
            const tn = TYPE_NAMES.java[b.varType];
            const dv = {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'}[b.varType];
            emit(ind, arr ? `${tn}[] ${b.name} = new ${tn}[${ex(b.size)}];` : `${tn} ${b.name} = ${dv};`);
        } else if (lang === 'csharp') {
            const tn = TYPE_NAMES.csharp[b.varType];
            const dv = {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'}[b.varType];
            emit(ind, arr ? `${tn}[] ${b.name} = new ${tn}[${ex(b.size)}];` : `${tn} ${b.name} = ${dv};`);
        } else if (b.varType === 'String') {
            emit(ind, arr ? `char ${b.name}[${ex(b.size)}][256];` : `char ${b.name}[256] = "";`);
        } else {
            const tn = TYPE_NAMES.c[b.varType];
            emit(ind, arr ? `${tn} ${b.name}[${ex(b.size)}];` : `${tn} ${b.name} = 0;`);
        }
    };

    const block = (list, ind) => {
        if (!list.length) {
            emit(ind, lang === 'python' ? 'pass' : ';');
        }
        list.forEach((b) => stmt(b, ind));
    };
    const open = (head, ind) => emit(ind, lang === 'python' ? `${head}:` : `${head} {`);
    const close = (ind) => lang !== 'python' && emit(ind, '}');

    // eslint-disable-next-line complexity
    const stmt = (b, ind) => {
        switch (b.type) {
            case 'declare': declare(b, ind); break;
            case 'assign': assignStmt(b, ind); break;
            case 'input': inputStmt(b, ind); break;
            case 'output': printStmt(b, ind); break;
            case 'call': emit(ind, `${ex(b.expr)}${lang === 'python' ? '' : ';'}`); break;
            case 'return':
                emit(ind, `return${String(b.expr || '').trim() ? ` ${ex(b.expr)}` : ''}${lang === 'python' ? '' : ';'}`);
                break;
            case 'comment': emit(ind, `${lang === 'python' ? '#' : '//'} ${b.text}`); break;
            case 'if':
                open(lang === 'python' ? `if ${ex(b.cond)}` : `if (${ex(b.cond)})`, ind);
                block(b.then, ind + 1);
                if (b.else.length) {
                    emit(ind, lang === 'python' ? 'else:' : '} else {');
                    block(b.else, ind + 1);
                }
                close(ind);
                break;
            case 'while':
                open(lang === 'python' ? `while ${ex(b.cond)}` : `while (${ex(b.cond)})`, ind);
                block(b.body, ind + 1);
                close(ind);
                break;
            case 'dowhile':
                if (lang === 'python') {
                    open('while True', ind);
                    block(b.body, ind + 1);
                    emit(ind + 1, `if not (${ex(b.cond)}): break`);
                } else {
                    emit(ind, 'do {');
                    block(b.body, ind + 1);
                    emit(ind, `} while (${ex(b.cond)});`);
                }
                break;
            case 'for': {
                const step = String(b.step || '1').trim() || '1';
                const neg = /^-/.test(step);
                if (lang === 'python') {
                    const range = `${ex(b.start)}, ${ex(b.end)} ${neg ? '- 1' : '+ 1'}${step === '1' ? '' : `, ${ex(step)}`}`;
                    open(`for ${b.variable} in range(${range})`, ind);
                } else {
                    const decl = syms[b.variable] ? '' : 'int ';
                    open(`for (${decl}${b.variable} = ${ex(b.start)}; ${b.variable} ${neg ? '>=' : '<='} ${ex(b.end)}; ` +
                        `${b.variable} += ${ex(step)})`, ind);
                }
                block(b.body, ind + 1);
                close(ind);
                break;
            }
            default: break;
        }
    };

    const fnHead = (f, isMain) => {
        const params = f.params.map((p) => p.name);
        if (lang === 'python') {
            return `def ${isMain ? 'main' : f.name}(${params.join(', ')})`;
        }
        const tn = TYPE_NAMES[lang];
        const ret = f.returnType ? tn[f.returnType] : 'void';
        const arr = lang === 'java' || lang === 'csharp' ? '[]' : '*';
        const ps = f.params.map((p) => `${tn[p.type]}${p.array ? arr : ''} ${p.name}`).join(', ');
        if (isMain) {
            return {java: 'public static void main(String[] args)', csharp: 'static void Main()'}[lang] || 'int main(void)';
        }
        return `${lang === 'java' || lang === 'csharp' ? 'static ' : ''}${ret} ${f.name}(${ps})`;
    };

    const funcs = [...program.functions].sort((a, b) => (a.name.toLowerCase() === 'main') - (b.name.toLowerCase() === 'main'));
    const mainName = fns.main ? 'main' : program.functions[0].name.toLowerCase();

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
    const base = lang === 'java' || lang === 'csharp' ? 1 : 0;
    funcs.forEach((f) => {
        const isMain = f.name.toLowerCase() === mainName;
        syms = {};
        f.params.forEach((p) => {
            syms[p.name] = {type: p.type, array: Boolean(p.array)};
        });
        open(fnHead(f, isMain), base);
        block(f.body, base + 1);
        if (lang === 'c' && isMain) {
            emit(base + 1, 'return 0;');
        }
        close(base);
        emit(0, '');
    });
    if (lang === 'java' || lang === 'csharp') {
        emit(0, '}');
    } else if (lang === 'python') {
        emit(0, `if __name__ == "__main__":`);
        emit(1, `${mainName === 'main' ? 'main' : mainName}()`);
    }
    return out.join('\n').replace(/\n+$/, '\n');
};

export const languages = Object.keys(LANGS);
export const languageLabels = {python: 'Python', c: 'C', java: 'Java', csharp: 'C#'};
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
