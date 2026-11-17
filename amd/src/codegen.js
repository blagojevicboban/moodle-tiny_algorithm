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
import {usesTurtle} from './turtle';
import {usesFiles} from './files';
import {parseExpr} from './expr';
import {t} from './strings';
import {labelOf} from './layout';

const BUILTIN_TYPES = {
    abs: 'Real', sqrt: 'Real', sin: 'Real', cos: 'Real', tan: 'Real', log: 'Real', exp: 'Real', pi: 'Real',
    arcsin: 'Real', arccos: 'Real', arctan: 'Real', log10: 'Real',
    floor: 'Integer', ceiling: 'Integer', round: 'Integer', 'int': 'Integer', sign: 'Integer', sgn: 'Integer',
    random: 'Integer', len: 'Integer', size: 'Integer',
    toint: 'Integer', tointeger: 'Integer', toreal: 'Real', tostring: 'String', tofixed: 'String', 'char': 'String',
    isnumeric: 'Boolean', tochar: 'String', tocode: 'Integer',
};

// Other names for the same function (Flowgorithm's and ours).
const ALIASES = {tointeger: 'toint', sgn: 'sign', size: 'len'};

/**
 * A value of a table of names that has it as its own key (not one of Object's, like constructor).
 *
 * @param {Object} table
 * @param {string} key
 * @returns {*}
 */
const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

/**
 * Words a name may not be in a language (its keywords) and names the generated code uses itself; a name of the
 * algorithm that is one of them gets "_" added. Pascal and Visual Basic ignore the case of names.
 */
const RESERVED = {
    python: 'False None True and as assert async await break class continue def del elif else except finally for from ' +
        'global if import in is lambda nonlocal not or pass raise return try while with yield print input range math ' +
        'random int float str len abs round chr ord format',
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long ' +
        'register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while ' +
        'printf scanf strcpy strcmp strlen snprintf memset tmp char_str rand_below to_fixed rand pow sqrt fabs sin cos ' +
        'tan log log10 exp floor ceil round asin acos atan bool true false',
    cpp: 'auto break case char const continue default do double else enum extern float for goto if inline int long ' +
        'register return short signed sizeof static struct switch typedef union unsigned void volatile while bool true ' +
        'false class new delete namespace using template typename this private public protected virtual friend operator ' +
        'throw try catch nullptr and or not xor string vector cout cin endl str rand_below to_fixed std getline ws ' +
        'boolalpha stoi stod pow sqrt abs sin cos tan log log10 exp floor ceil round asin acos atan rand',
    java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends ' +
        'final finally float for goto if implements import instanceof int interface long native new package private ' +
        'protected public return short static strictfp super switch synchronized this throw throws transient try void ' +
        'volatile while true false null var record yield in rnd fmt Math String System Integer Double Main args',
    csharp: 'abstract as base bool break byte case catch char checked class const continue decimal default delegate do ' +
        'double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface ' +
        'internal is lock long namespace new null object operator out override params private protected public readonly ' +
        'ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ' +
        'ulong unchecked unsafe ushort using virtual void volatile while var rnd Console Math Convert CultureInfo Program',
    javascript: 'break case catch class const continue debugger default delete do else export extends false finally for ' +
        'function if import in instanceof new null return super switch this throw true try typeof var void while with ' +
        'yield let static enum await implements package protected interface private public arguments eval undefined ' +
        'NaN Infinity lines nextLine input console process Math String parseInt parseFloat require isNaN',
    pascal: 'and array begin case const div do downto else end file for function goto if in label mod nil not of or ' +
        'packed procedure program record repeat set then to type until var while with absolute asm inline interface ' +
        'implementation unit uses string shl shr xor result exit self object constructor destructor inherited operator ' +
        'true false integer real boolean double writeln write readln read length copy chr ord sqrt abs power random ' +
        'setlength main dummy readboolean inttostr floattostr booltostr strtoint strtofloat floattostrf trunc round ' +
        'floor ceil ln exp sin cos tan arcsin arccos arctan log10 sign pi lowercase trim tryStrToFloat break continue ' +
        'sysutils math class as is try except finally raise on property out threadvar resourcestring initialization ' +
        'finalization library exports export generic specialize dispose new',
    go: 'break default func interface select case defer go map struct chan else goto package switch const fallthrough ' +
        'if range type continue for import return var true false nil iota int float64 string bool byte rune error len ' +
        'cap make new append copy delete panic recover print println close complex real imag main fmt math strconv ' +
        'strings bufio os rand reader readLine readInt readReal fmtReal sgn toInt parseReal isNumeric k_',
    rust: 'as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref ' +
        'return self Self static struct super trait true type unsafe use where while async await dyn abstract become box ' +
        'do final macro override priv typeof unsized virtual yield try union i64 f64 String bool Vec vec io std main ' +
        'fmt_real read_line rand_below format println print',
    kotlin: 'as break class continue do else false for fun if in interface is null object package return super this ' +
        'throw true try typealias typeof val var when while by catch constructor delegate dynamic field file finally get ' +
        'import init param property receiver set setparam where Int Double String Boolean Math IntArray DoubleArray ' +
        'BooleanArray Array println print readln fmt main java kotlin',
    php: 'abstract and array as break callable case catch class clone const continue declare default die do echo else ' +
        'elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach ' +
        'function global goto if implements include include_once instanceof insteadof interface isset list match ' +
        'namespace new or print private protected public readonly require require_once return static switch throw trait ' +
        'try unset use var while xor yield this true false null self parent int float bool string void mixed iterable ' +
        'object never read_line fmt sqrt abs sin cos tan log log10 exp floor ceil round fmod strlen count random_int chr ' +
        'ord number_format is_numeric strcmp strtolower trim rtrim fgets array_fill asin acos atan pi sprintf',
    vb: 'addhandler addressof alias and andalso as boolean byref byte byval call case catch cbool cbyte cchar cdate cdbl ' +
        'cdec char cint class clng cobj const continue csbyte cshort csng cstr ctype cuint culng cushort date decimal ' +
        'declare default delegate dim directcast do double each else elseif end endif enum erase error event exit false ' +
        'finally for friend function get gettype getxmlnamespace global gosub goto handles if implements imports in ' +
        'inherits integer interface is isnot let lib like long loop me mod module mustinherit mustoverride mybase ' +
        'myclass namespace narrowing new next not nothing notinheritable notoverridable object of on operator option ' +
        'optional or orelse overloads overridable overrides paramarray partial private property protected public ' +
        'raiseevent readonly redim rem removehandler resume return sbyte select set shadows shared short single static ' +
        'step stop string structure sub synclock then throw to true try trycast typeof uinteger ulong ushort using ' +
        'variant wend when while widening with withevents writeonly xor console math rnd fmt boolstr program main fix ' +
        'len chrw ascw array cultureinfo numberstyles fill_r fill_c vblf vbtab',
};
// TypeScript also checks the names against the global functions of the browser (tsc main.ts knows them).
RESERVED.typescript = `${RESERVED.javascript} print close open stop alert confirm prompt focus blur fetch scroll scrollTo ` +
    'scrollBy find postMessage moveTo moveBy resizeTo resizeBy setTimeout setInterval clearTimeout clearInterval atob btoa ' +
    'queueMicrotask structuredClone reportError getComputedStyle matchMedia requestAnimationFrame cancelAnimationFrame ' +
    'captureEvents releaseEvents getSelection type number string boolean any unknown never declare namespace module';
const RESERVED_SETS = Object.fromEntries(Object.entries(RESERVED).map(([lang, words]) => [lang,
    new Set(words.split(' ').map((w) => (lang === 'pascal' || lang === 'vb' || lang === 'php' ? w.toLowerCase() : w)))]));

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
        case 'var':
            if (!own(syms, n.name) && n.name.toLowerCase() === 'pi') {
                return 'Real';
            }
            return own(syms, n.name) ? syms[n.name].type : 'Integer';
        case 'idx': return own(syms, n.name) ? syms[n.name].type : 'Integer';
        case 'fld': {
            const f = fieldDef(recOf(typeOf(n.e, syms, fns)), n);
            return f ? f.type : 'Integer';
        }
        case 'un': return n.op === '!' ? 'Boolean' : typeOf(n.e, syms, fns);
        case 'call': {
            const f = own(fns, n.name.toLowerCase());
            return f ? f.returnType || 'Integer' : own(BUILTIN_TYPES, n.name.toLowerCase()) || 'Real';
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

// The record types of the algorithm being generated (lower case name => {name, fields}).
let recDefs = new Map();

/**
 * The record types of an algorithm (not checked: the interpreter reports a wrong one).
 *
 * @param {Object} program
 * @returns {Map<string, Object>}
 */
const recordMap = (program) => new Map((Array.isArray(program.records) ? program.records : [])
    .filter((r) => r && r.name && Array.isArray(r.fields)).map((r) => [String(r.name).toLowerCase(), r]));

/**
 * The record type of a type name, or null for a basic type.
 *
 * @param {*} type
 * @returns {?Object}
 */
const recOf = (type) => (typeof type === 'string' && recDefs.get(type.toLowerCase())) || null;

/**
 * The field of a record type that a field node reads.
 *
 * @param {?Object} def record type
 * @param {Object} n fld node (field: the name as written)
 * @returns {?Object}
 */
const fieldDef = (def, n) => (def ? def.fields.find((f) => f.name.toLowerCase() === String(n.field || n.name).toLowerCase()) :
    null) || null;

/**
 * A PHP string literal (in double quotes: $ is escaped, control characters are written as \\x..).
 *
 * @param {string} v text
 * @returns {string}
 */
const phpString = (v) => `"${[...String(v)].map((c) => own(PHP_ESCAPES, c) ??
    (c < ' ' ? `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}` : c)).join('')}"`;
const PHP_ESCAPES = {'\\': '\\\\', '"': '\\"', '$': '\\$', '\n': '\\n', '\t': '\\t', '\r': '\\r'};

// PHP code that needs no parentheses before a cast: a variable, a number.
const phpAtom = (code) => (/^\$?[\w.]+$/.test(code) ? code : `(${code})`);

// Marks the PHP helper fmt() as needed.
let phpNeeds = {};

/**
 * PHP text of a value, as the interpreter writes it: a truth value true or false, a real number with fmt().
 *
 * @param {string} code generated expression
 * @param {string} type Integer, Real, String or Boolean
 * @param {boolean} cast a whole number as a string too
 * @returns {string}
 */
const phpText = (code, type, cast = false) => {
    if (type === 'Boolean') {
        return `(${code} ? "true" : "false")`;
    }
    if (type === 'Real') {
        phpNeeds.fmt = true;
        return `fmt(${code})`;
    }
    return cast && type !== 'String' ? `(string) ${phpAtom(code)}` : code;
};

const JAVASCRIPT = {
    ext: 'js', label: 'JavaScript',
    and: '&&', or: '||', not: '!', pow: (l, r) => `${l} ** ${r}`, powInfix: true, div: (l, r) => `${l} / ${r}`,
    bool: (v) => (v ? 'true' : 'false'),
    concatWrap: true,
    concat: (parts) => parts.map((p, i) => (p.type === 'String' || i > 0 ? p.code : `String(${p.code})`)).join(' + '),
    eq: (l, r, op) => `${l} ${op === '==' ? '===' : '!=='} ${r}`,
    call: (name, args) => {
        const m = {sqrt: 'Math.sqrt', abs: 'Math.abs', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log',
            exp: 'Math.exp', floor: 'Math.floor', ceiling: 'Math.ceil', round: 'Math.round', 'int': 'Math.trunc',
            sign: 'Math.sign', toint: 'parseInt', toreal: 'parseFloat', tostring: 'String', arcsin: 'Math.asin',
            arccos: 'Math.acos', arctan: 'Math.atan', log10: 'Math.log10'};
        const l = name.toLowerCase();
        if (l === 'tofixed') {
            return `${atom(args[0])}.toFixed(${args[1]})`;
        }
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
        return l === 'pi' ? 'Math.PI' : `${own(m, l) || name}(${args.join(', ')})`;
    },
};

const LANGS = {
    python: {
        ext: 'py', label: 'Python',
        and: 'and', or: 'or', not: 'not ', pow: (l, r) => `${l} ** ${r}`, powInfix: true, div: (l, r) => `${l} / ${r}`,
        bool: (v) => (v ? 'True' : 'False'),
        concat: (parts) => parts.map((p) => {
            if (p.type === 'Boolean') {
                return `str(${p.code}).lower()`;
            }
            return p.type === 'String' ? p.code : `str(${p.code})`;
        }).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'math.sqrt', abs: 'abs', sin: 'math.sin', cos: 'math.cos', tan: 'math.tan', log: 'math.log',
                exp: 'math.exp', floor: 'math.floor', ceiling: 'math.ceil', round: 'round', 'int': 'int', len: 'len',
                random: 'random.randrange', toint: 'int', toreal: 'float', tostring: 'str', pi: 'math.pi',
                arcsin: 'math.asin', arccos: 'math.acos', arctan: 'math.atan', log10: 'math.log10'};
            const l = name.toLowerCase();
            if (l === 'sign') {
                return `((${args[0]}) > 0) - ((${args[0]}) < 0)`;
            }
            if (l === 'tofixed') {
                return `format(${args[0]}, "." + str(${args[1]}) + "f")`;
            }
            const ch = charCall(l, args, {at: (t, i) => `${t}[${i}]`, fromCode: (n) => `chr(${n})`, code: (t) => `ord(${t})`});
            if (ch) {
                return ch;
            }
            if (l === 'pi') {
                return 'math.pi';
            }
            return `${own(m, l) || name}(${args.join(', ')})`;
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
                ceiling: 'ceil', round: 'round', 'int': '(int)', len: 'strlen', random: 'rand_below', toint: 'atoi',
                toreal: 'atof', arcsin: 'asin', arccos: 'acos', arctan: 'atan', log10: 'log10'};
            const l = name.toLowerCase();
            if (l === 'sign') {
                return `((${args[0]}) > 0) - ((${args[0]}) < 0)`;
            }
            if (l === 'tofixed') {
                needs.toFixed = true;
                return `to_fixed(${args[0]}, ${args[1]})`;
            }
            const ch = charCall(l, args, {at: (t, i) => `char_str(${t}[${i}])`, fromCode: (n) => `char_str(${n})`,
                code: (t) => `(int) (unsigned char) ${t}[0]`});
            if (ch) {
                return ch;
            }
            if (l === 'pi') {
                needs.pi = true;
                return 'M_PI';
            }
            return `${own(m, l) || name}(${args.join(', ')})`;
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
                ceiling: 'ceil', round: 'round', 'int': '(int)', toint: 'stoi', toreal: 'stod', arcsin: 'asin', arccos: 'acos',
                arctan: 'atan', log10: 'log10'};
            const l = name.toLowerCase();
            if (l === 'sign') {
                return `((${args[0]}) > 0) - ((${args[0]}) < 0)`;
            }
            if (l === 'tofixed') {
                needs.toFixed = true;
                return `to_fixed(${args[0]}, ${args[1]})`;
            }
            if (l === 'len') {
                return `(int) string(${args[0]}).length()`;
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
            if (l === 'pi') {
                needs.pi = true;
                return 'M_PI';
            }
            return `${own(m, l) || name}(${args.join(', ')})`;
        },
    },
    java: {
        ext: 'java', label: 'Java',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concatWrap: true,
        concat: (parts) => parts.map((p, i) => {
            if (p.type === 'Real') {
                return `fmt(${p.code})`; // A whole Real is written as 7, not 7.0, like the interpreter.
            }
            return p.type === 'String' || i > 0 ? p.code : `String.valueOf(${p.code})`;
        }).join(' + '),
        eq: (l, r, op, t) => (t === 'String' ? `${op === '!=' ? '!' : ''}${atom(l)}.equals(${r})` : `${l} ${op} ${r}`),
        call: (name, args) => {
            const m = {sqrt: 'Math.sqrt', abs: 'Math.abs', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log',
                exp: 'Math.exp', floor: 'Math.floor', ceiling: 'Math.ceil', round: 'Math.round', 'int': '(int)',
                random: 'rnd.nextInt', toint: 'Integer.parseInt', toreal: 'Double.parseDouble', tostring: 'String.valueOf',
                arcsin: 'Math.asin', arccos: 'Math.acos', arctan: 'Math.atan', log10: 'Math.log10'};
            const l = name.toLowerCase();
            if (l === 'sign') {
                return `(int) Math.signum(${args[0]})`;
            }
            if (l === 'tofixed') {
                return `String.format(java.util.Locale.ROOT, "%." + (${args[1]}) + "f", (double) (${args[0]}))`;
            }
            if (l === 'len') {
                return `${atom(args[0])}.length()`;
            }
            const ch = charCall(l, args, {at: (t, i) => `String.valueOf(${t}.charAt(${i}))`,
                fromCode: (n) => `String.valueOf((char) (${n}))`, code: (t) => `(int) ${t}.charAt(0)`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'Math.PI' : `${own(m, l) || name}(${args.join(', ')})`;
        },
    },
    csharp: {
        ext: 'cs', label: 'C#',
        and: '&&', or: '||', not: '!', pow: (l, r) => `Math.Pow(${l}, ${r})`,
        div: (l, r, t) => (t === 'Integer' ? `(double) ${l} / ${r}` : `${l} / ${r}`),
        bool: (v) => (v ? 'true' : 'false'),
        concatWrap: true,
        concat: (parts) => parts.map((p, i) => {
            if (p.type === 'Boolean') {
                return `(${p.code} ? "true" : "false")`;
            }
            return i === 0 && p.type !== 'String' ? `"" + ${p.code}` : p.code;
        }).join(' + '),
        eq: (l, r, op) => `${l} ${op} ${r}`,
        call: (name, args) => {
            const m = {sqrt: 'Math.Sqrt', abs: 'Math.Abs', sin: 'Math.Sin', cos: 'Math.Cos', tan: 'Math.Tan', log: 'Math.Log',
                exp: 'Math.Exp', floor: 'Math.Floor', ceiling: 'Math.Ceiling', round: 'Math.Round',
                'int': '(int)', sign: 'Math.Sign', arcsin: 'Math.Asin', arccos: 'Math.Acos', arctan: 'Math.Atan',
                log10: 'Math.Log10',
                random: 'rnd.Next', toint: 'Convert.ToInt32', toreal: 'Convert.ToDouble', tostring: 'Convert.ToString'};
            const l = name.toLowerCase();
            if (l === 'tofixed') {
                return `((double) (${args[0]})).ToString("F" + (${args[1]}), CultureInfo.InvariantCulture)`;
            }
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
            return l === 'pi' ? 'Math.PI' : `${own(m, l) || name}(${args.join(', ')})`;
        },
    },
    javascript: JAVASCRIPT,
    typescript: {...JAVASCRIPT, ext: 'ts', label: 'TypeScript'},
    php: {
        ext: 'php', label: 'PHP',
        and: '&&', or: '||', not: '!', pow: (l, r) => `${l} ** ${r}`, powInfix: true, div: (l, r) => `${l} / ${r}`,
        bool: (v) => (v ? 'true' : 'false'),
        str: (v) => phpString(v),
        concatWrap: true,
        concat: (parts) => parts.map((p) => phpText(p.code, p.type)).join(' . '),
        // === for texts: == compares texts that look like numbers as numbers.
        eq: (l, r, op, t) => (t === 'String' ? `${l} ${op === '==' ? '===' : '!=='} ${r}` : `${l} ${op} ${r}`),
        cmp: (l, r, op) => `strcmp(${l}, ${r}) ${op} 0`,
        mod: (l, r, t) => (t === 'Real' ? `fmod(${l}, ${r})` : null),
        call: (name, args, types) => {
            const m = {sqrt: 'sqrt', abs: 'abs', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', exp: 'exp',
                arcsin: 'asin', arccos: 'acos', arctan: 'atan', log10: 'log10', len: 'strlen', isnumeric: 'is_numeric'};
            const l = name.toLowerCase();
            if (l === 'floor' || l === 'ceiling') {
                return `(int) ${l === 'floor' ? 'floor' : 'ceil'}(${args[0]})`;
            }
            if (l === 'round') {
                return `(int) floor(${args[0]} + 0.5)`; // Halves up, as in the interpreter (PHP's round goes away from 0).
            }
            if (l === 'int' || l === 'toint') {
                return `(int) ${phpAtom(args[0])}`;
            }
            if (l === 'toreal') {
                return `(float) ${phpAtom(args[0])}`;
            }
            if (l === 'tostring') {
                return types[0] === 'String' ? args[0] : phpText(args[0], types[0], true);
            }
            if (l === 'sign') {
                return `(${args[0]} <=> 0)`;
            }
            if (l === 'random') {
                return `random_int(0, ${args[0]} - 1)`;
            }
            if (l === 'tofixed') {
                return `number_format(${args[0]}, ${args[1]}, ".", "")`;
            }
            const ch = charCall(l, args, {at: (t, i) => `${t}[${i}]`, fromCode: (n) => `chr(${n})`, code: (t) => `ord(${t})`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'M_PI' : `${own(m, l) || name}(${args.join(', ')})`;
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
                toint: 'StrToInt', toreal: 'StrToFloat', arcsin: 'ArcSin', arccos: 'ArcCos', arctan: 'ArcTan', log10: 'Log10'};
            const l = name.toLowerCase();
            if (l === 'tofixed') {
                return `FloatToStrF(${args[0]}, ffFixed, 18, ${args[1]})`;
            }
            if (l === 'tostring') {
                return pascalToStr(args[0], types[0]);
            }
            if (l === 'isnumeric') {
                return `TryStrToFloat(${args[0]}, Dummy)`;
            }
            // Pascal strings start at 1. Copy gives a string of one character like Flowgorithm (s[i] would be a Char,
            // which ToCode cannot index).
            const at = (t, i) => `Copy(${t}, ${/^\d+$/.test(i) ? Number(i) + 1 : `${i} + 1`}, 1)`;
            const ch = charCall(l, args, {at, fromCode: (n) => `Chr(${n})`, code: (t) => `Ord(${t}[1])`});
            if (ch) {
                return ch;
            }
            return l === 'pi' ? 'Pi' : `${own(m, l) || name}(${args.join(', ')})`;
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
    typescript: {Integer: 'number', Real: 'number', String: 'string', Boolean: 'boolean'},
    php: {Integer: 'int', Real: 'float', String: 'string', Boolean: 'bool'},
};
const DEFAULTS = {
    python: {Integer: '0', Real: '0.0', String: '""', Boolean: 'False'},
    java: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    csharp: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    cpp: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    javascript: {Integer: '0', Real: '0', String: '""', Boolean: 'false'},
    php: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
    pascal: {Integer: '0', Real: '0.0', String: "''", Boolean: 'False'},
};

/**
 * The comment of a block (its note) as lines of a code comment.
 *
 * @param {Object} b block
 * @returns {string[]}
 */
const noteLines = (b) => (typeof b.note === 'string' && b.note.trim() ?
    b.note.trim().split(/\r?\n/).map((line) => line.trim()) : []);

/**
 * Every statement of a list and of the lists nested in it.
 *
 * @param {Array} list statements
 * @returns {Array}
 */
const allBlocks = (list) => list.flatMap((b) => [b, ...allBlocks([...(b.then || []), ...(b.else || []), ...(b.body || [])])]);

/**
 * Generate the program in a language.
 *
 * @param {string} lang python, c, cpp, java, csharp, javascript or pascal
 * @param {Object} program the algorithm
 * @returns {string} source code
 */
export const generate = (lang, program) => generateLines(lang, program).text;

/**
 * Generate the program and tell which block every line of the code comes from (for marking the running block).
 *
 * @param {string} language python, c, cpp, java, csharp, javascript, typescript, php or pascal
 * @param {Object} program the algorithm
 * @returns {{text: string, owners: Array}} source code, and per line the id of its block or null
 */
export const generateLines = (language, program) => {
    if (language === 'pseudo') {
        return generatePseudo(program);
    }
    if (Object.hasOwn(TYPED, language)) {
        return generateTyped(language, program);
    }
    const L = own(LANGS, language);
    if (!L) {
        throw new Error(`Unsupported language ${language}`);
    }
    // TypeScript is the JavaScript code with the types of the variables, parameters and fields.
    const ts = language === 'typescript';
    const php = language === 'php';
    const lang = ts ? 'javascript' : language;
    // PHP variables start with $.
    const vn = (name) => (php ? `$${name}` : name);
    // The TypeScript type of a variable or parameter.
    const tsType = (type, array, matrix) => `${recOf(type) ? recOf(type).name : TYPE_NAMES.typescript[type]}` +
        `${array ? '[]' : ''}${matrix ? '[]' : ''}`;
    needs = {};
    phpNeeds = {};
    recDefs = recordMap(program);
    const pascal = lang === 'pascal';
    const semi = lang === 'python' ? '' : ';';
    const fns = Object.assign(Object.create(null), Object.fromEntries(program.functions.map((f) => [f.name.toLowerCase(), f])));
    let syms = Object.create(null);
    // The interpreter ignores the case of names, the languages (but Pascal) do not: every name is written as declared,
    // and a name that is a word of the language gets "_" added.
    const reserved = RESERVED_SETS[language] || new Set();
    const caseless = lang === 'pascal' || lang === 'vb' || php;
    const used = new Set();
    program.functions.forEach((f) => {
        used.add(f.name.toLowerCase());
        f.params.forEach((p) => used.add(p.name.toLowerCase()));
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                String(b.name).split(',').forEach((x) => used.add(x.trim().toLowerCase()));
            } else if (b.type === 'for') {
                used.add(String(b.variable || '').trim().toLowerCase());
            }
        });
    });
    const renamed = new Map();
    const safe = (name) => {
        const key = caseless ? name.toLowerCase() : name;
        if (!reserved.has(key)) {
            return name;
        }
        if (!renamed.has(key)) {
            let s = `${name}_`;
            while (reserved.has(caseless ? s.toLowerCase() : s) || used.has(s.toLowerCase())) {
                s += '_';
            }
            used.add(s.toLowerCase());
            renamed.set(key, s);
        }
        return renamed.get(key);
    };
    const fnName = (f) => safe(f.name);
    let canon = Object.create(null);
    // Pi that is not a variable stays Pi: it is the number pi.
    const nameOf = (name) => {
        const known = own(canon, String(name).toLowerCase());
        if (known) {
            return vn(known);
        }
        return String(name).toLowerCase() === 'pi' ? String(name) : vn(safe(String(name)));
    };
    const fixNames = (n) => {
        if (n.k === 'var' || n.k === 'idx') {
            n.name = nameOf(n.name);
        } else if (n.k === 'fld') {
            n.field = n.field || n.name;
            n.name = safe(n.field);
        } else if (n.k === 'call' && own(fns, n.name.toLowerCase())) {
            n.user = true;
            n.name = fnName(fns[n.name.toLowerCase()]);
        } else if (n.k === 'call' && Object.hasOwn(ALIASES, n.name.toLowerCase())) {
            n.name = ALIASES[n.name.toLowerCase()];
        }
        [n.e, n.l, n.r, n.index, n.index2, ...(n.args || [])].forEach((c) => c && fixNames(c));
        return n;
    };
    const parse = (src) => fixNames(parseExpr(src));
    // The name of a type in the code: a record type keeps its name (Pascal: T + name), a basic type its word.
    const typeName = (type) => {
        const def = recOf(type);
        if (def) {
            return pascal ? `T${def.name}` : def.name;
        }
        return TYPE_NAMES[lang][type];
    };
    // A record value that is stored or passed: a copy where the language would share the object.
    const copyRec = (code, node) => {
        const def = recOf(typeOf(node, syms, fns));
        if (!def || node.k === 'call') {
            return code;
        }
        return {python: `replace(${code})`, java: `${code}.copy()`, csharp: `${code}.Copy()`,
            javascript: `Object.assign(new ${def.name}(), ${code})`, php: `clone ${code}`}[lang] || code;
    };
    // A record in a text: Type(field = value, ...) as the interpreter writes it.
    const recText = (n) => {
        const def = recOf(typeOf(n, syms, fns));
        if (!def) {
            return n;
        }
        const parts = [];
        def.fields.forEach((f, i) => {
            parts.push({k: 'str', v: `${i ? ', ' : `${def.name}(`}${f.name} = `});
            parts.push({k: 'fld', e: n, name: safe(f.name), field: f.name});
        });
        parts.push({k: 'str', v: ')'});
        return parts.reduce((l, r) => ({k: 'bin', op: '&', l, r}));
    };
    // Records joined to a text become their text.
    const expandRecords = (n) => {
        if (n.k === 'bin' && (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String'))) {
            n.l = recText(expandRecords(n.l));
            n.r = recText(expandRecords(n.r));
        }
        return n;
    };
    // The function of the algorithm a generated name belongs to.
    const userFn = (name) => program.functions.find((f) => fnName(f) === name) || null;

    const expr = (src) => {
        // Code of a node; ctx is the precedence the surrounding code needs, so lower precedence gets parentheses.
        const walk = (n, ctx = 0) => {
            let code;
            switch (n.k) {
                case 'num': code = String(n.v); break;
                case 'str': code = L.str ? L.str(n.v) : JSON.stringify(n.v); break;
                case 'bool': code = L.bool(n.v); break;
                case 'var': code = !own(syms, n.name) && n.name.toLowerCase() === 'pi' ? L.call('pi', [], []) : n.name; break;
                case 'idx': code = indexCode(n); break;
                case 'fld': code = `${walk(n.e, 9)}${php ? '->' : '.'}${n.name}`; break;
                case 'un': code = n.op === '!' ? `${L.not}${walk(n.e, 8)}` : `${n.op}${walk(n.e, 8)}`; break;
                case 'call': code = callCode(n); break;
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
            if (L.cmp && CMP.includes(n.op) && t === 'String') {
                return L.cmp(walk(n.l), walk(n.r), n.op);
            }
            if (L.mod && n.op === '%') {
                const real = t === 'Real' || typeOf(n.r, syms, fns) === 'Real';
                const code = L.mod(walk(n.l), walk(n.r), real ? 'Real' : 'Integer');
                if (code) {
                    return code;
                }
            }
            const op = (L.ops && L.ops[n.op]) || n.op;
            return `${walk(n.l, CMP.includes(n.op) ? p + 0.5 : p)} ${op} ${walk(n.r, p + 0.5)}`;
        };
        // A call: of a function of the algorithm (even when a built-in function has the same name), the length of an
        // array, or a built-in function.
        const callCode = (n) => {
            if (n.user) {
                return `${n.name}(${callArgs(n).join(', ')})`;
            }
            const a = n.args[0];
            const l = n.name.toLowerCase();
            if (l === 'len' && a && a.k === 'var' && own(syms, a.name) && syms[a.name].array) {
                return arrayLength(a.name);
            }
            // ToInt and ToReal of a number (not of a text): the whole part, the number itself.
            if ((l === 'toint' || l === 'toreal') && a && typeOf(a, syms, fns) !== 'String') {
                return l === 'toint' ? L.call('int', [walk(a)], ['Real']) : walk(a, 8);
            }
            if (l === 'eof') {
                return lang === 'python' ? '_eof()' : 'EOF()';
            }
            return L.call(n.name, callArgs(n), n.args.map((x) => typeOf(x, syms, fns)));
        };
        const arrayLength = (name) => ({python: `len(${name})`, java: `${name}.length`, javascript: `${name}.length`,
            php: `count(${name})`,
            csharp: syms[name].matrix ? `${name}.GetLength(0)` : `${name}.Length`, cpp: `(int) ${name}.size()`,
            pascal: `Length(${name})`, c: syms[name].param ? `${name}_rows` : `(int) (sizeof ${name} / sizeof ${name}[0])`,
        }[lang] || `len(${name})`);
        // Arguments of a call. In C a matrix parameter needs its numbers of rows and columns too: from the matrix
        // parameter of the caller, or with sizeof from a matrix declared there.
        const callArgs = (n) => {
            const f = n.user ? own(fns, String(n.origName || '').toLowerCase()) || userFn(n.name) : null;
            return n.args.flatMap((a, i) => {
                const p = f && f.params[i];
                if (php && p && !p.array && p.type === 'Integer' && typeOf(a, syms, fns) === 'Real') {
                    return [`(int) ${phpAtom(walk(a))}`];
                }
                if (lang !== 'c' || !p || !p.matrix || a.k !== 'var') {
                    return [p && !p.array ? copyRec(walk(a), a) : walk(a)];
                }
                const m = a.name;
                if (own(syms, m) && syms[m].param) {
                    return [`${m}_rows`, `${m}_cols`, m];
                }
                return [`(int) (sizeof ${m} / sizeof ${m}[0])`, `(int) (sizeof ${m}[0] / sizeof ${m}[0][0])`, m];
            });
        };
        // Element of an array a[i]; of a matrix a[i, j] in C# and a[i][j] in the other languages.
        const indexCode = (n) => {
            if (!n.index2) {
                return `${n.name}[${walk(n.index)}]`;
            }
            return lang === 'csharp' ? `${n.name}[${walk(n.index)}, ${walk(n.index2)}]` :
                `${n.name}[${walk(n.index)}][${walk(n.index2)}]`;
        };
        const node = expandRecords(parse(src));
        // The code is built on demand: building it may mark helpers as needed (C++ str()).
        return {node, walk, get code() {
            return walk(node);
        }};
    };
    const ex = (src) => expr(src).code;
    const exText = ex;

    const fmtSpec = {Integer: '%d', Real: '%g', String: '%s', Boolean: '%s'};
    // An argument of C's printf: a truth value is written as true or false.
    const cArg = (p, walk) => (typeOf(p, syms, fns) === 'Boolean' ? `(${walk(p)}) ? "true" : "false"` : walk(p));

    const out = [];
    // The block whose code is being written; every line remembers it.
    const owners = [];
    let owner = null;
    const emit = (ind, line) => {
        out.push('    '.repeat(ind) + line);
        owners.push(owner);
    };

    // eslint-disable-next-line complexity
    const printStmt = (b, ind) => {
        const {node: whole, walk} = expr(b.expr);
        const node = recText(whole);
        if (node !== whole) {
            // A whole record: write its text.
            b = {...b, expr: null};
        }
        const ex = (src) => (src === null ? walk(node) : exText(src));
        const nl = b.newline !== false;
        const parts = concatParts(node, syms, fns);
        const bool = parts.length === 1 && typeOf(node, syms, fns) === 'Boolean';
        if (lang === 'python') {
            emit(ind, `print(${bool ? `str(${ex(b.expr)}).lower()` : ex(b.expr)}${nl ? '' : ', end=""'})`);
        } else if (lang === 'java') {
            const code = typeOf(node, syms, fns) === 'Real' ? `fmt(${walk(node)})` : walk(node);
            emit(ind, `System.out.print${nl ? 'ln' : ''}(${code});`);
        } else if (lang === 'csharp') {
            emit(ind, `Console.Write${nl ? 'Line' : ''}(${bool ? `(${ex(b.expr)} ? "true" : "false")` : ex(b.expr)});`);
        } else if (lang === 'javascript') {
            emit(ind, nl ? `console.log(${ex(b.expr)});` : `process.stdout.write(String(${ex(b.expr)}));`);
        } else if (php) {
            const code = phpText(walk(node), typeOf(node, syms, fns));
            emit(ind, nl ? `echo ${code}, "\\n";` : `echo ${code};`);
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
            const args = parts.map((p) => cArg(p, walk)).join(', ');
            emit(ind, `printf("${fmt}${nl ? '\\n' : ''}", ${args});`);
        }
    };
    const inputStmt = (b, ind) => {
        const t = parse(b.target);
        const sym = t.k === 'fld' ? {type: typeOf(t, syms, fns)} : own(syms, t.name) || {type: 'Integer'};
        const target = ex(b.target);
        if (lang === 'python') {
            if (sym.type === 'Boolean') {
                emit(ind, `${target} = input().strip().lower() == "true"`);
            } else {
                emit(ind, `${target} = ${{Integer: 'int', Real: 'float', String: 'str'}[sym.type]}(input())`);
            }
        } else if (lang === 'java') {
            // Whole lines, like the algorithm reads them (nextInt would leave the end of the line for the next input).
            const conv = {Integer: 'Integer.parseInt(in.nextLine().trim())', Real: 'Double.parseDouble(in.nextLine().trim())',
                String: 'in.nextLine()', Boolean: 'in.nextLine().trim().equalsIgnoreCase("true")'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (lang === 'csharp') {
            const conv = {Integer: 'int.Parse(Console.ReadLine())',
                Real: 'double.Parse(Console.ReadLine(), CultureInfo.InvariantCulture)',
                String: 'Console.ReadLine()', Boolean: 'bool.Parse(Console.ReadLine())'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (lang === 'javascript') {
            const conv = {Integer: 'parseInt(input())', Real: 'parseFloat(input())', String: 'input()',
                Boolean: 'input().trim().toLowerCase() === "true"'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (php) {
            phpNeeds.input = true;
            const conv = {Integer: '(int) read_line()', Real: '(float) read_line()', String: 'read_line()',
                Boolean: 'strtolower(trim(read_line())) === "true"'}[sym.type];
            emit(ind, `${target} = ${conv};`);
        } else if (lang === 'cpp') {
            emit(ind, {String: `getline(cin >> ws, ${target});`, Boolean: `cin >> boolalpha >> ${target};`}[sym.type] ||
                `cin >> ${target};`);
        } else if (pascal) {
            emit(ind, sym.type === 'Boolean' ? `${target} := ReadBoolean();` : `readln(${target});`);
        } else {
            const spec = {Integer: '%d', Real: '%lf', String: ' %255[^\\n]', Boolean: '%d'}[sym.type];
            emit(ind, `scanf("${spec}", ${sym.type === 'String' ? target : `&${target}`});`);
        }
    };

    const assignStmt = (b, ind) => {
        const target = ex(b.target);
        if (recOf(typeOf(parse(b.target), syms, fns))) {
            const {node, code} = expr(b.expr);
            emit(ind, `${target} ${pascal ? ':=' : '='} ${copyRec(code, node)}${semi}`);
            return;
        }
        // Python keeps a division real; the algorithm stores a whole number in an Integer (mid = (low + high) / 2).
        if (lang === 'python' && typeOf(parse(b.target), syms, fns) === 'Integer' &&
                typeOf(parse(b.expr), syms, fns) === 'Real') {
            emit(ind, `${target} = int(${ex(b.expr)})`);
            return;
        }
        if ((php || lang === 'javascript') && typeOf(parse(b.target), syms, fns) === 'Integer' &&
                typeOf(parse(b.expr), syms, fns) === 'Real') {
            emit(ind, php ? `${target} = (int) ${phpAtom(ex(b.expr))};` : `${target} = Math.trunc(${ex(b.expr)});`);
            return;
        }
        if (lang !== 'c' || typeOf(parse(b.target), syms, fns) !== 'String') {
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
        const args = parts.map((p) => cArg(p, walk)).join(', ');
        emit(ind, '{');
        emit(ind + 1, 'char tmp[256];');
        emit(ind + 1, `snprintf(tmp, sizeof tmp, "${fmt}", ${args});`);
        emit(ind + 1, `strcpy(${target}, tmp);`);
        emit(ind, '}');
    };

    const declare = (block, ind) => {
        String(block.name).split(',').map((s) => s.trim()).filter(Boolean)
            .forEach((name) => declareOne({...block, name: nameOf(name)}, ind));
    };
    // eslint-disable-next-line complexity
    const declareOne = (b, ind) => {
        syms[b.name] = {type: b.varType, array: Boolean(String(b.size || '').trim())};
        const arr = syms[b.name].array;
        const dv = DEFAULTS[lang] && DEFAULTS[lang][b.varType];
        if (recOf(b.varType)) {
            declareRecord(b, ind, arr);
            return;
        }
        if (arr && isMatrix(b)) {
            declareMatrix(b, ind, dv);
        } else if (lang === 'python') {
            emit(ind, arr ? `${b.name} = [${dv}] * ${pyFactor(ex(b.size))}` : `${b.name} = ${dv}`);
        } else if (lang === 'java' || lang === 'csharp') {
            const tn = TYPE_NAMES[lang][b.varType];
            emit(ind, arr ? `${tn}[] ${b.name} = new ${tn}[${ex(b.size)}];` : `${tn} ${b.name} = ${dv};`);
            if (arr && lang === 'java' && b.varType === 'String') {
                emit(ind, `java.util.Arrays.fill(${b.name}, "");`); // Java strings start as null.
            }
        } else if (lang === 'cpp') {
            const tn = TYPE_NAMES.cpp[b.varType];
            emit(ind, arr ? `vector<${tn}> ${b.name}(${ex(b.size)});` : `${tn} ${b.name} = ${dv};`);
        } else if (lang === 'javascript') {
            const tn = ts ? `: ${tsType(b.varType, arr)}` : '';
            emit(ind, arr ? `let ${b.name}${tn} = new Array(${ex(b.size)}).fill(${dv});` : `let ${b.name}${tn} = ${dv};`);
        } else if (php) {
            emit(ind, arr ? `${b.name} = array_fill(0, ${ex(b.size)}, ${dv});` : `${b.name} = ${dv};`);
        } else if (pascal) {
            // Declared in the var section; here the array gets its size and the variable its start value.
            emit(ind, arr ? `SetLength(${b.name}, ${ex(b.size)});` : `${b.name} := ${dv};`);
        } else if (b.varType === 'String') {
            emit(ind, arr ? `char ${b.name}[${ex(b.size)}][256];` : `char ${b.name}[256] = "";`);
        } else {
            const tn = TYPE_NAMES.c[b.varType];
            emit(ind, arr ? `${tn} ${b.name}[${ex(b.size)}];` : `${tn} ${b.name} = 0;`);
        }
        if (arr && lang === 'c') {
            // A C array with a variable size cannot have an initializer: start from zeros and empty strings.
            emit(ind, `memset(${b.name}, 0, sizeof ${b.name});`);
        }
    };

    const pyFactor = (code) => (/^[\w.]+$/.test(code) ? code : `(${code})`);

    // A record, or an array of records (each element a new record with the start values of its fields).
    const declareRecord = (b, ind, arr) => {
        const tn = typeName(b.varType);
        const n = arr ? ex(b.size) : '';
        if (lang === 'python') {
            emit(ind, arr ? `${b.name} = [${tn}() for _ in range(${n})]` : `${b.name} = ${tn}()`);
        } else if (lang === 'java' || lang === 'csharp') {
            emit(ind, arr ? `${tn}[] ${b.name} = new ${tn}[${n}];` : `${tn} ${b.name} = new ${tn}();`);
            if (arr) {
                const len = lang === 'java' ? 'length' : 'Length';
                emit(ind, `for (int k_ = 0; k_ < ${b.name}.${len}; k_++) {`);
                emit(ind + 1, `${b.name}[k_] = new ${tn}();`);
                emit(ind, '}');
            }
        } else if (lang === 'cpp') {
            emit(ind, arr ? `vector<${tn}> ${b.name}(${n});` : `${tn} ${b.name}{};`);
        } else if (lang === 'javascript') {
            const t = ts ? `: ${tsType(b.varType, arr)}` : '';
            emit(ind, arr ? `let ${b.name}${t} = Array.from({length: ${n}}, () => new ${tn}());` :
                `let ${b.name}${t} = new ${tn}();`);
        } else if (php) {
            if (arr) {
                emit(ind, `${b.name} = [];`);
                emit(ind, `for ($k_ = 0; $k_ < ${n}; $k_++) {`);
                emit(ind + 1, `${b.name}[] = new ${tn}();`);
                emit(ind, '}');
            } else {
                emit(ind, `${b.name} = new ${tn}();`);
            }
        } else if (pascal) {
            emit(ind, arr ? `SetLength(${b.name}, ${n});` : `${b.name} := Default(${tn});`);
        } else if (arr) {
            emit(ind, `${tn} ${b.name}[${n}];`);
            emit(ind, `memset(${b.name}, 0, sizeof ${b.name});`);
        } else {
            emit(ind, `${tn} ${b.name} = {0};`);
        }
    };

    // The definitions of the record types, in the syntax of the language.
    const recordTypes = (ind) => {
        const fieldType = (type) => ({python: {Integer: 'int', Real: 'float', String: 'str', Boolean: 'bool'}[type],
            javascript: null}[lang] ?? TYPE_NAMES[lang][type]);
        [...recDefs.values()].forEach((def) => {
            const tn = typeName(def.name);
            const fields = def.fields.map((f) => ({name: safe(f.name), type: f.type, dv: (DEFAULTS[lang] || {})[f.type]}));
            if (lang === 'python') {
                emit(ind, '@dataclass');
                emit(ind, `class ${tn}:`);
                fields.forEach((f) => emit(ind + 1, `${f.name}: ${fieldType(f.type)} = ${f.dv}`));
                emit(ind, '');
                emit(ind, '');
            } else if (lang === 'java') {
                emit(ind, `static class ${tn} {`);
                fields.forEach((f) => emit(ind + 1, `${fieldType(f.type)} ${f.name} = ${f.dv};`));
                emit(ind + 1, `${tn} copy() {`);
                emit(ind + 2, `${tn} c = new ${tn}();`);
                fields.forEach((f) => emit(ind + 2, `c.${f.name} = ${f.name};`));
                emit(ind + 2, 'return c;');
                emit(ind + 1, '}');
                emit(ind, '}');
                emit(ind, '');
            } else if (lang === 'csharp') {
                emit(ind, `class ${tn} {`);
                fields.forEach((f) => emit(ind + 1, `public ${fieldType(f.type)} ${f.name} = ${f.dv};`));
                emit(ind + 1, `public ${tn} Copy() {`);
                emit(ind + 2, `return (${tn}) MemberwiseClone();`);
                emit(ind + 1, '}');
                emit(ind, '}');
                emit(ind, '');
            } else if (lang === 'cpp') {
                emit(ind, `struct ${tn} {`);
                fields.forEach((f) => emit(ind + 1, `${fieldType(f.type)} ${f.name} = ${f.dv};`));
                emit(ind, '};');
                emit(ind, '');
            } else if (ts) {
                emit(ind, `class ${tn} {`);
                fields.forEach((f) => emit(ind + 1, `${f.name}: ${TYPE_NAMES.typescript[f.type]} = ${f.dv};`));
                emit(ind, '}');
                emit(ind, '');
            } else if (php) {
                emit(ind, `class ${tn} {`);
                fields.forEach((f) => emit(ind + 1, `public $${f.name} = ${f.dv};`));
                emit(ind, '}');
                emit(ind, '');
            } else if (lang === 'javascript') {
                emit(ind, `class ${tn} {`);
                emit(ind + 1, 'constructor() {');
                fields.forEach((f) => emit(ind + 2, `this.${f.name} = ${f.dv};`));
                emit(ind + 1, '}');
                emit(ind, '}');
                emit(ind, '');
            } else if (pascal) {
                emit(ind, 'type');
                emit(ind + 1, `${tn} = record`);
                fields.forEach((f) => emit(ind + 2, `${f.name}: ${TYPE_NAMES.pascal[f.type]};`));
                emit(ind + 1, 'end;');
                emit(ind, '');
            } else {
                emit(ind, 'typedef struct {');
                fields.forEach((f) => emit(ind + 1, f.type === 'String' ? `char ${f.name}[256];` :
                    `${TYPE_NAMES.c[f.type]} ${f.name};`));
                emit(ind, `} ${tn};`);
                emit(ind, '');
            }
        });
    };

    // A matrix: rows b.size, columns b.size2.
    const declareMatrix = (b, ind, dv) => {
        const [n, m] = [ex(b.size), ex(b.size2)];
        if (lang === 'python') {
            emit(ind, `${b.name} = [[${dv}] * ${pyFactor(m)} for _ in range(${n})]`);
        } else if (lang === 'java') {
            emit(ind, `${TYPE_NAMES.java[b.varType]}[][] ${b.name} = new ${TYPE_NAMES.java[b.varType]}[${n}][${m}];`);
            if (b.varType === 'String') {
                emit(ind, `for (String[] row : ${b.name}) {`);
                emit(ind + 1, 'java.util.Arrays.fill(row, "");');
                emit(ind, '}');
            }
        } else if (lang === 'csharp') {
            emit(ind, `${TYPE_NAMES.csharp[b.varType]}[,] ${b.name} = new ${TYPE_NAMES.csharp[b.varType]}[${n}, ${m}];`);
        } else if (lang === 'cpp') {
            const tn = TYPE_NAMES.cpp[b.varType];
            emit(ind, `vector<vector<${tn}>> ${b.name}(${n}, vector<${tn}>(${m}));`);
        } else if (lang === 'javascript') {
            const tn = ts ? `: ${tsType(b.varType, true, true)}` : '';
            emit(ind, `let ${b.name}${tn} = Array.from({length: ${n}}, () => new Array(${m}).fill(${dv}));`);
        } else if (php) {
            emit(ind, `${b.name} = array_fill(0, ${n}, array_fill(0, ${m}, ${dv}));`);
        } else if (pascal) {
            emit(ind, `SetLength(${b.name}, ${n}, ${m});`);
        } else if (b.varType === 'String') {
            emit(ind, `char ${b.name}[${n}][${m}][256];`);
        } else {
            emit(ind, `${TYPE_NAMES.c[b.varType]} ${b.name}[${n}][${m}];`);
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

    // Loops being written, innermost last: what a Continue must do first (Python's do-while checks its condition,
    // Pascal's counting while loop adds the step).
    const loops = [];
    const inLoop = (before, write) => {
        loops.push(before);
        try {
            write();
        } finally {
            loops.pop();
        }
    };
    const forStmt = (blk, ind) => {
        const b = {...blk, variable: nameOf(blk.variable)};
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
            const by = ex(step);
            const next = `${b.variable} := ${b.variable} ${/^-\d/.test(by) ? `- ${by.slice(1)}` : `+ ${by}`};`;
            inLoop([next], () => block(b.body, ind + 1));
            emit(ind + 1, next);
            close(ind);
            return;
        } else {
            const decl = own(syms, b.variable) || php ? '' : {javascript: 'let '}[lang] || 'int ';
            open(`for (${decl}${b.variable} = ${ex(b.start)}; ${b.variable} ${neg ? '>=' : '<='} ${ex(b.end)}; ` +
                `${b.variable} += ${ex(step)})`, ind);
        }
        inLoop([], () => block(b.body, ind + 1));
        close(ind);
    };

    const stmt = (b, ind) => {
        const outer = owner;
        owner = b.id || null;
        noteLines(b).forEach((line) => emit(ind, `${lang === 'python' ? '#' : '//'} ${line}`));
        stmtCode(b, ind);
        owner = outer;
    };
    // Turtle graphics: Python's turtle module; the other languages have no standard drawing library (a comment).
    const turtleStmt = (b, ind) => {
        if (lang !== 'python') {
            emit(ind, `// Turtle: ${labelOf(b)}`);
            return;
        }
        const up = 'turtle.setheading(90)';
        const code = {
            forward: () => (b.pen === 'up' ? ['turtle.penup()', `turtle.forward(${ex(b.distance)})`, 'turtle.pendown()']
                : [`turtle.forward(${ex(b.distance)})`]),
            turn: () => [`turtle.${b.rotate === 'left' ? 'left' : 'right'}(${ex(b.angle)})`],
            pen: () => [`turtle.pencolor(${JSON.stringify(String(b.color || 'black'))})`],
            home: () => ['turtle.penup()', 'turtle.home()', up, 'turtle.pendown()'],
            clear: () => ['turtle.clear()', 'turtle.penup()', 'turtle.home()', up, 'turtle.pendown()'],
        }[b.type]();
        code.forEach((line) => emit(ind, line));
    };
    // Files: Python opens, reads and writes them; the other languages get a comment.
    const fileStmt = (b, ind) => {
        if (lang !== 'python') {
            emit(ind, `// File: ${labelOf(b)}`);
            return;
        }
        const handle = (mode) => `_files["${mode === 'read' ? 'read' : 'write'}"]`;
        if (b.type === 'open') {
            const how = {write: 'w', append: 'a'}[b.mode] || 'r';
            emit(ind, `${handle(b.mode)} = open(${ex(b.file)}, "${how}", encoding="utf-8")`);
        } else if (b.type === 'read') {
            const sym = own(syms, parse(b.target).name) || {type: 'Integer'};
            const line = '_files["read"].readline().rstrip("\\n")';
            emit(ind, sym.type === 'Boolean' ? `${ex(b.target)} = ${line}.strip().lower() == "true"`
                : `${ex(b.target)} = ${{Integer: 'int', Real: 'float', String: ''}[sym.type]}(${line})`);
        } else if (b.type === 'write') {
            emit(ind, `_files["write"].write(str(${ex(b.expr)}) + "\\n")`);
        } else {
            emit(ind, `${handle(b.mode)}.close()`);
        }
    };
    // eslint-disable-next-line complexity
    const stmtCode = (b, ind) => {
        switch (b.type) {
            case 'declare': declare(b, ind); break;
            case 'assign': assignStmt(b, ind); break;
            case 'input': inputStmt(b, ind); break;
            case 'output': printStmt(b, ind); break;
            case 'call': emit(ind, `${ex(b.expr)}${semi}`); break;
            case 'return': {
                let value = String(b.expr || '').trim() ? ex(b.expr) : '';
                if (php && value && current && current.returnType === 'Integer' && typeOf(parse(b.expr), syms, fns) === 'Real') {
                    value = `(int) ${phpAtom(value)}`;
                }
                if (pascal) {
                    emit(ind, value ? `exit(${value});` : 'exit;');
                } else {
                    emit(ind, `return${value ? ` ${value}` : ''}${semi}`);
                }
                break;
            }
            case 'comment': emit(ind, `${lang === 'python' ? '#' : '//'} ${b.text}`); break;
            case 'forward':
            case 'turn':
            case 'pen':
            case 'home':
            case 'clear': turtleStmt(b, ind); break;
            case 'open':
            case 'read':
            case 'write':
            case 'close': fileStmt(b, ind); break;
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
                inLoop([], () => block(b.body, ind + 1));
                close(ind);
                break;
            case 'dowhile':
                if (lang === 'python') {
                    open('while True', ind);
                    const check = `if not (${ex(b.cond)}): break`;
                    inLoop([check], () => block(b.body, ind + 1));
                    emit(ind + 1, check);
                } else if (pascal) {
                    emit(ind, 'repeat');
                    inLoop([], () => block(b.body, ind + 1));
                    emit(ind, `until not (${ex(b.cond)});`);
                } else {
                    emit(ind, 'do {');
                    inLoop([], () => block(b.body, ind + 1));
                    emit(ind, `} while (${ex(b.cond)});`);
                }
                break;
            case 'for': forStmt(b, ind); break;
            case 'break':
                emit(ind, pascal ? 'Break;' : `break${semi}`);
                break;
            case 'continue':
                (loops[loops.length - 1] || []).forEach((line) => emit(ind, line));
                emit(ind, pascal ? 'Continue;' : `continue${semi}`);
                break;
            default: break;
        }
    };

    // A matrix parameter and the matrix passed to it need the same named type in Pascal.
    const pascalMatrix = (type) => {
        needs.pascalMatrix = needs.pascalMatrix || new Set();
        needs.pascalMatrix.add(type);
        return `T${type}Matrix`;
    };

    // Pascal: the variables of a function (its declarations and for-loop counters) for the var section.
    const pascalVars = (f) => {
        const vars = new Map();
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                const arr = Boolean(String(b.size || '').trim());
                const of = arr ? 'array of ' : '';
                String(b.name).split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
                    vars.set(nameOf(name), isMatrix(b) ? pascalMatrix(b.varType) : `${of}${typeName(b.varType)}`);
                });
            } else if (b.type === 'for' && !vars.has(nameOf(b.variable))) {
                vars.set(nameOf(b.variable), 'Integer');
            }
        });
        f.params.forEach((p) => vars.delete(safe(p.name)));
        return vars;
    };
    const pascalHead = (f) => {
        const ps = f.params
            .map((p) => `${p.array ? 'var ' : ''}${safe(p.name)}: ` +
                (p.matrix ? pascalMatrix(p.type) : `${p.array ? 'array of ' : ''}${typeName(p.type)}`))
            .join('; ');
        const args = ps ? `(${ps})` : '';
        return f.returnType ? `function ${fnName(f)}${args}: ${typeName(f.returnType)};` :
            `procedure ${fnName(f)}${args};`;
    };

    const fnHead = (fn, isMain) => {
        const f = {...fn, name: fnName(fn), params: fn.params.map((p) => ({...p, name: safe(p.name)}))};
        const params = f.params.map((p) => p.name);
        if (lang === 'python') {
            return `def ${isMain ? 'main' : f.name}(${params.join(', ')})`;
        }
        if (ts) {
            const ps = f.params.map((p) => `${p.name}: ${tsType(p.type, p.array, p.matrix)}`).join(', ');
            const ret = f.returnType ? tsType(f.returnType) : 'void';
            return `function ${isMain ? 'main' : f.name}(${isMain ? '' : ps}): ${isMain ? 'void' : ret}`;
        }
        if (lang === 'javascript') {
            return `function ${isMain ? 'main' : f.name}(${params.join(', ')})`;
        }
        if (php) {
            const phpType = (type) => (recOf(type) ? recOf(type).name : TYPE_NAMES.php[type]);
            const ps = f.params.map((p) => (p.array ? `array &$${p.name}` : `${phpType(p.type)} $${p.name}`)).join(', ');
            const ret = f.returnType ? phpType(f.returnType) : 'void';
            return `function ${isMain ? 'main' : f.name}(${isMain ? '' : ps}): ${isMain ? 'void' : ret}`;
        }
        const tn = new Proxy({}, {get: (o, type) => typeName(type)});
        const ret = f.returnType ? tn[f.returnType] : 'void';
        const ps = f.params.map((p) => {
            if (p.matrix) {
                const dims = `[${p.name}_rows][${p.name}_cols]`;
                return {
                    java: `${tn[p.type]}[][] ${p.name}`,
                    csharp: `${tn[p.type]}[,] ${p.name}`,
                    cpp: `vector<vector<${tn[p.type]}>>& ${p.name}`,
                }[lang] || `int ${p.name}_rows, int ${p.name}_cols, ` +
                    (p.type === 'String' ? `char ${p.name}${dims}[256]` : `${tn[p.type]} ${p.name}${dims}`);
            }
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
    let current = null;
    funcs.forEach((f) => {
        const isMain = f.name.toLowerCase() === mainName;
        current = f;
        syms = Object.create(null);
        f.params.forEach((p) => {
            syms[vn(safe(p.name))] = {type: p.type, array: Boolean(p.array), matrix: Boolean(p.matrix), param: true};
        });
        // The first spelling wins: parameters, then declarations and For variables in the order of the diagram.
        canon = Object.create(null);
        const spell = (name) => {
            canon[name.toLowerCase()] = own(canon, name.toLowerCase()) || safe(name);
        };
        f.params.forEach((p) => spell(p.name));
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                String(b.name).split(',').map((x) => x.trim()).filter(Boolean).forEach(spell);
            } else if (b.type === 'for' && String(b.variable || '').trim()) {
                spell(String(b.variable).trim());
            }
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
        if (lang === 'csharp' && isMain) {
            // Real numbers are written with a dot, whatever the language of the computer.
            emit(base + 1, 'CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;');
        }
        block(f.body, base + 1);
        if ((lang === 'c' || lang === 'cpp') && isMain) {
            emit(base + 1, 'return 0;');
        }
        close(base);
        emit(0, '');
    });
    const body = out.splice(0);
    const bodyOwners = owners.splice(0);

    // The start of the program in each language: imports, helpers the code needs, the class around Java and C#.
    const headers = {
        python: () => {
            emit(0, 'import math');
            emit(0, 'import random');
            if (usesTurtle(program)) {
                emit(0, 'import turtle');
                emit(0, '');
                // The turtle looks up at the start, as in the editor.
                emit(0, 'turtle.setheading(90)');
            }
            if (recDefs.size) {
                emit(0, 'from dataclasses import dataclass, replace');
            }
            emit(0, '');
            if (recDefs.size) {
                emit(0, '');
                recordTypes(0);
            }
            if (usesFiles(program)) {
                // The file open for reading and the one open for writing, and EOF() of the first.
                emit(0, '_files = {}');
                emit(0, '');
                emit(0, '');
                emit(0, 'def _eof():');
                emit(1, 'here = _files["read"].tell()');
                emit(1, 'end = _files["read"].readline() == ""');
                emit(1, '_files["read"].seek(here)');
                emit(1, 'return end');
                emit(0, '');
                emit(0, '');
            }
        },
        c: () => {
            if (needs.pi) {
                emit(0, '#define _USE_MATH_DEFINES'); // M_PI on every compiler.
            }
            ['stdio.h', 'stdlib.h', 'string.h', 'math.h'].forEach((h) => emit(0, `#include <${h}>`));
            emit(0, '');
            recordTypes(0);
            emit(0, 'static int rand_below(int n) { return rand() % n; }');
            emit(0, '');
            if (needs.toFixed) {
                // ToFixed: a number with n decimals; a few buffers so one printf may use several.
                emit(0, 'static char *to_fixed(double v, int n) {');
                emit(1, 'static char buf[8][64];');
                emit(1, 'static int k;');
                emit(1, 'k = (k + 1) % 8;');
                emit(1, 'snprintf(buf[k], sizeof buf[k], "%.*f", n, v);');
                emit(1, 'return buf[k];');
                emit(0, '}');
                emit(0, '');
            }
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
        },
        cpp: () => {
            if (needs.pi) {
                emit(0, '#define _USE_MATH_DEFINES'); // M_PI on every compiler.
            }
            ['iostream', 'string', 'vector', 'cmath', 'cstdlib'].concat(needs.str || needs.toFixed ? ['sstream'] : [])
                .concat(needs.toFixed ? ['iomanip'] : [])
                .forEach((h) => emit(0, `#include <${h}>`));
            emit(0, '');
            emit(0, 'using namespace std;');
            emit(0, '');
            recordTypes(0);
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
            if (needs.toFixed) {
                emit(0, 'string to_fixed(double v, int n) {');
                emit(1, 'ostringstream out;');
                emit(1, 'out << fixed << setprecision(n) << v;');
                emit(1, 'return out.str();');
                emit(0, '}');
                emit(0, '');
            }
            const protos = funcs.filter((f) => f.name.toLowerCase() !== mainName).map((f) => `${fnHead(f, false)};`);
            if (protos.length) {
                protos.forEach((p) => emit(0, p));
                emit(0, '');
            }
        },
        javascript: () => {
            if (ts) {
                emit(0, '// Run with Node.js: npx tsc main.ts && node main.js');
                emit(0, 'declare const require: any;');
                emit(0, 'declare const process: any;');
                emit(0, "const lines: string[] = require('fs').readFileSync(0, 'utf8').split(/\\r?\\n/);");
                emit(0, 'let nextLine = 0;');
                emit(0, 'const input = (): string => lines[nextLine++] ?? \'\';');
                emit(0, '');
                recordTypes(0);
                return;
            }
            emit(0, '// Run with Node.js: node main.js');
            emit(0, "const lines = require('fs').readFileSync(0, 'utf8').split(/\\r?\\n/);");
            emit(0, 'let nextLine = 0;');
            emit(0, 'const input = () => lines[nextLine++] ?? \'\';');
            emit(0, '');
            recordTypes(0);
        },
        pascal: () => {
            emit(0, 'program Main;');
            emit(0, '');
            emit(0, '{$mode objfpc}{$H+}');
            emit(0, '');
            emit(0, 'uses SysUtils, Math;');
            emit(0, '');
            if (needs.pascalMatrix) {
                emit(0, 'type');
                [...needs.pascalMatrix].sort().forEach((t) => emit(1, `T${t}Matrix = array of array of ${TYPE_NAMES.pascal[t]};`));
                emit(0, '');
            }
            recordTypes(0);
            if (/isnumeric\s*\(/i.test(JSON.stringify(program.functions))) {
                emit(0, 'var');
                emit(1, 'Dummy: Double;');
                emit(0, '');
            }
            if (/"(varType|type)":"Boolean"/.test(JSON.stringify([program.functions, program.records || []]))) {
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
        },
        php: () => {
            emit(0, '<?php');
            emit(0, '// Run with PHP: php main.php');
            emit(0, '');
            if (phpNeeds.input) {
                emit(0, 'function read_line(): string {');
                emit(1, '$line = fgets(STDIN);');
                emit(1, 'return $line === false ? "" : rtrim($line, "\\r\\n");');
                emit(0, '}');
                emit(0, '');
            }
            if (phpNeeds.fmt) {
                // Reals as the algorithm writes them: 7 for a whole number, otherwise rounded to 10 decimals.
                emit(0, 'function fmt($v): string {');
                emit(1, '$s = rtrim(rtrim(sprintf("%.10F", $v), "0"), ".");');
                emit(1, 'return $s === "-0" ? "0" : $s;');
                emit(0, '}');
                emit(0, '');
            }
            recordTypes(0);
        },
        csharp: () => {
            emit(0, 'using System;');
            emit(0, 'using System.Globalization;');
            emit(0, '');
            emit(0, 'class Program {');
            emit(1, 'static Random rnd = new Random();');
            emit(1, '');
            recordTypes(1);
        },
        java: () => {
            emit(0, 'import java.util.*;');
            emit(0, '');
            emit(0, 'public class Main {');
            emit(1, 'static Scanner in = new Scanner(System.in);');
            emit(1, 'static Random rnd = new Random();');
            emit(1, '');
            // Reals as the algorithm writes them: 7 for a whole number, otherwise rounded to 10 decimals.
            emit(1, 'static String fmt(double v) {');
            emit(2, 'if (v == Math.rint(v) && Math.abs(v) < 1e15) {');
            emit(3, 'return String.valueOf((long) v);');
            emit(2, '}');
            emit(2, 'return java.math.BigDecimal.valueOf(Math.round(v * 1e10) / 1e10).stripTrailingZeros().toPlainString();');
            emit(1, '}');
            emit(1, '');
            recordTypes(1);
        },
    };
    const emitHeader = () => (own(headers, php ? 'php' : lang) || headers.java)();
    const emitFooter = () => {
        if (lang === 'java' || lang === 'csharp') {
            emit(0, '}');
        } else if (lang === 'python') {
            emit(0, `if __name__ == "__main__":`);
            emit(1, `${mainName === 'main' ? 'main' : mainName}()`);
            if (usesTurtle(program)) {
                emit(1, 'turtle.done()');
            }
        } else if (lang === 'javascript') {
            emit(0, `${mainName === 'main' ? 'main' : mainName}();`);
        } else if (php) {
            emit(0, 'main();');
        }
    };
    emitHeader();
    out.push(...body);
    owners.push(...bodyOwners);
    emitFooter();
    // One owner per line of the text (an emitted piece may hold several lines).
    const lineOwners = out.flatMap((piece, i) => piece.split('\n').map(() => owners[i]));
    const text = out.join('\n').replace(/\n*$/, '\n');
    return {text, owners: lineOwners.slice(0, text.split('\n').length - 1)};
};

// ---- Visual Basic .NET, Go, Rust and Kotlin ----------------------------------------------------------------------------
// These languages are stricter about numbers (Go, Rust and Kotlin do not mix whole and real numbers on their own, Visual
// Basic rounds when it stores a real number in an Integer), so their generator knows the type of every expression and
// converts where the interpreter does: a Real stored in an Integer loses its fraction, an Integer meets a Real as a Real.

/**
 * A Visual Basic string literal (no backslash escapes: a line break is vbLf, a tab vbTab).
 *
 * @param {string} v text
 * @returns {string}
 */
const vbString = (v) => {
    const pieces = String(v).split(/(\n|\t)/).filter((x) => x !== '');
    if (!pieces.length) {
        return '""';
    }
    return pieces.map((x) => ({'\n': 'vbLf', '\t': 'vbTab'}[x] || `"${x.replace(/"/g, '""')}"`)).join(' & ');
};

const realLiteral = (v) => (/[.eE]/.test(String(v)) ? String(v) : `${v}.0`);

/**
 * Code that needs no parentheses around it: a name, a number, or a call or a parenthesised group that ends the code.
 *
 * @param {string} code
 * @returns {string}
 */
const tight = (code) => {
    if (/^[\w.:]+$/.test(code)) {
        return code;
    }
    const open = code.search(/\(/);
    if (open >= 0 && /^[\w.:]*$/.test(code.slice(0, open)) && code.endsWith(')')) {
        let depth = 0;
        for (let i = open; i < code.length; i++) {
            depth += {'(': 1, ')': -1}[code[i]] || 0;
            if (depth === 0) {
                return i === code.length - 1 ? code : `(${code})`;
            }
        }
    }
    return `(${code})`;
};

const TYPED = {
    vb: {
        label: 'Visual Basic', ext: 'vb',
        types: {Integer: 'Integer', Real: 'Double', String: 'String', Boolean: 'Boolean'},
        defaults: {Integer: '0', Real: '0.0', String: '""', Boolean: 'False'},
        str: vbString, bool: (v) => (v ? 'True' : 'False'), and: 'AndAlso', or: 'OrElse', not: 'Not ',
        ops: {'%': 'Mod', '==': '=', '!=': '<>'},
        toReal: (c) => c, toInt: (c) => `CInt(Fix(${c}))`,
        pow: (l, r) => `${l} ^ ${r}`, comment: "'",
    },
    go: {
        label: 'Go', ext: 'go', strict: true,
        types: {Integer: 'int', Real: 'float64', String: 'string', Boolean: 'bool'},
        defaults: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
        str: (v) => JSON.stringify(v), bool: (v) => (v ? 'true' : 'false'), and: '&&', or: '||', not: '!',
        toReal: (c) => `float64(${c})`,
        // Go does not convert a constant with a fraction to int: math.Trunc makes it a value first.
        toInt: (c) => (/^[\d.\s()+\-*/]+$/.test(c) ? `int(math.Trunc(${c}))` : `int(${c})`),
        pow: (l, r) => `math.Pow(${l}, ${r})`, comment: '//',
    },
    rust: {
        label: 'Rust', ext: 'rs', strict: true, realLiteral: true, semi: ';',
        types: {Integer: 'i64', Real: 'f64', String: 'String', Boolean: 'bool'},
        defaults: {Integer: '0', Real: '0.0', String: 'String::new()', Boolean: 'false'},
        str: (v) => `${JSON.stringify(v)}.to_string()`, bool: (v) => (v ? 'true' : 'false'), and: '&&', or: '||', not: '!',
        toReal: (c) => `(${c} as f64)`, toInt: (c) => `(${c} as i64)`,
        pow: (l, r) => `${l.replace(/^(\(?-?)([\d.]+)(\)?)$/, '$1$2_f64$3')}.powf(${r})`, comment: '//',
    },
    kotlin: {
        label: 'Kotlin', ext: 'kt', strict: true, realLiteral: true,
        types: {Integer: 'Int', Real: 'Double', String: 'String', Boolean: 'Boolean'},
        defaults: {Integer: '0', Real: '0.0', String: '""', Boolean: 'false'},
        str: (v) => JSON.stringify(v).replace(/\$/g, '\\$'), bool: (v) => (v ? 'true' : 'false'), and: '&&', or: '||',
        not: '!', toReal: (c) => `${c}.toDouble()`, toInt: (c) => `${c}.toInt()`,
        pow: (l, r) => `Math.pow(${l}, ${r})`, comment: '//',
    },
};

const KOTLIN_ARRAYS = {Integer: 'IntArray', Real: 'DoubleArray', Boolean: 'BooleanArray', String: 'Array<String>'};

/**
 * Built-in functions: their code, from the arguments ({code, type}), an argument as a Real and as an Integer.
 *
 * @param {string} lang language
 * @param {string} l lower case name
 * @param {Array} a arguments {code, type}
 * @param {Function} real argument i as a real number
 * @param {Function} whole argument i as a whole number
 * @param {Object} needs helpers the code needs
 * @returns {string|null}
 */
// eslint-disable-next-line complexity
const typedBuiltin = (lang, l, a, real, whole, needs) => {
    const c = (i) => (a[i] ? a[i].code : '');
    const math = {sqrt: 'Sqrt', sin: 'Sin', cos: 'Cos', tan: 'Tan', exp: 'Exp', log: 'Log', log10: 'Log10', abs: 'Abs',
        arcsin: 'Asin', arccos: 'Acos', arctan: 'Atan'};
    if (lang === 'go') {
        if (Object.hasOwn(math, l) || ['floor', 'ceiling', 'round', 'pi'].includes(l)) {
            needs.goMath = true;
        }
        if (['toint', 'toreal', 'tofixed', 'isnumeric'].includes(l)) {
            needs.goStrconv = true;
        }
        if (l === 'random') {
            needs.goRand = true;
        }
        if (l === 'sign') {
            needs.goSign = true;
        }
        return Object.hasOwn(math, l) ? `math.${math[l]}(${real(0)})` : {
            floor: `int(math.Floor(${real(0)}))`, ceiling: `int(math.Ceil(${real(0)}))`, round: `int(math.Floor(${real(0)} + 0.5))`,
            'int': `int(${real(0)})`, sign: `sgn(${real(0)})`, random: `rand.Intn(${whole(0)})`, len: `len([]rune(${c(0)}))`,
            toint: `toInt(${c(0)})`, toreal: `parseReal(${c(0)})`, tofixed: `strconv.FormatFloat(${real(0)}, 'f', ${whole(1)}, 64)`,
            isnumeric: `isNumeric(${c(0)})`,
            'char': a.length > 1 ? `string([]rune(${c(0)})[${whole(1)}])` : `string(rune(${whole(0)}))`,
            tochar: `string(rune(${whole(0)}))`, tocode: `int([]rune(${c(0)})[0])`, pi: 'math.Pi',
        }[l] ?? null;
    }
    if (lang === 'rust') {
        const m = {sqrt: 'sqrt', sin: 'sin', cos: 'cos', tan: 'tan', exp: 'exp', log: 'ln', log10: 'log10', abs: 'abs',
            arcsin: 'asin', arccos: 'acos', arctan: 'atan'};
        // A method of a number literal needs its type (1.0_f64.atan()).
        const lit = (i) => real(i).replace(/^(\(?-?)([\d.]+)(\)?)$/, (x, open, num, close) => `${open}${num}_f64${close}`);
        return Object.hasOwn(m, l) ? `${lit(0)}.${m[l]}()` : {
            floor: `(${lit(0)}.floor() as i64)`, ceiling: `(${lit(0)}.ceil() as i64)`,
            round: `((${real(0)} + 0.5_f64).floor() as i64)`,
            'int': `(${real(0)} as i64)`, sign: `(if ${real(0)} > 0.0 { 1 } else if ${real(0)} < 0.0 { -1 } else { 0 })`,
            random: `rand_below(${whole(0)})`, len: `(${c(0)}.chars().count() as i64)`,
            toint: `${c(0)}.trim().parse::<i64>().unwrap()`, toreal: `${c(0)}.trim().parse::<f64>().unwrap()`,
            tofixed: `format!("{:.*}", (${whole(1)}) as usize, ${real(0)})`, isnumeric: `${c(0)}.trim().parse::<f64>().is_ok()`,
            'char': a.length > 1 ? `${c(0)}.chars().nth((${whole(1)}) as usize).unwrap().to_string()` :
                `char::from_u32((${whole(0)}) as u32).unwrap().to_string()`,
            tochar: `char::from_u32((${whole(0)}) as u32).unwrap().to_string()`, tocode: `(${c(0)}.chars().next().unwrap() as i64)`,
            pi: 'std::f64::consts::PI',
        }[l] ?? null;
    }
    if (lang === 'kotlin') {
        const m = {...math, sqrt: 'sqrt', sin: 'sin', cos: 'cos', tan: 'tan', exp: 'exp', log: 'log', log10: 'log10',
            abs: 'abs', arcsin: 'asin', arccos: 'acos', arctan: 'atan'};
        return Object.hasOwn(m, l) ? `Math.${m[l]}(${real(0)})` : {
            floor: `Math.floor(${real(0)}).toInt()`, ceiling: `Math.ceil(${real(0)}).toInt()`,
            round: `Math.floor(${real(0)} + 0.5).toInt()`, 'int': `${real(0)}.toInt()`, sign: `Math.signum(${real(0)}).toInt()`,
            random: `kotlin.random.Random.nextInt(${whole(0)})`, len: `${atom(c(0))}.length`, toint: `${atom(c(0))}.trim().toInt()`,
            toreal: `${atom(c(0))}.trim().toDouble()`,
            tofixed: `String.format(java.util.Locale.ROOT, "%." + (${whole(1)}) + "f", ${real(0)})`,
            isnumeric: `(${atom(c(0))}.trim().toDoubleOrNull() != null)`,
            'char': a.length > 1 ? `${atom(c(0))}[${whole(1)}].toString()` : `(${whole(0)}).toChar().toString()`,
            tochar: `(${whole(0)}).toChar().toString()`, tocode: `${atom(c(0))}[0].code`, pi: 'Math.PI',
        }[l] ?? null;
    }
    if (l === 'random') {
        needs.vbRandom = true;
    }
    return Object.hasOwn(math, l) ? `Math.${math[l]}(${c(0)})` : {
        floor: `CInt(Math.Floor(${c(0)}))`, ceiling: `CInt(Math.Ceiling(${c(0)}))`, round: `CInt(Math.Floor(${c(0)} + 0.5))`,
        'int': `CInt(Fix(${c(0)}))`, sign: `Math.Sign(${c(0)})`, random: `rnd.Next(${c(0)})`, len: `Len(${c(0)})`,
        toint: `Integer.Parse(${c(0)})`, toreal: `Double.Parse(${c(0)}, CultureInfo.InvariantCulture)`,
        tofixed: `CDbl(${c(0)}).ToString("F" & (${c(1)}), CultureInfo.InvariantCulture)`,
        isnumeric: `Double.TryParse(${c(0)}, NumberStyles.Float, CultureInfo.InvariantCulture, Nothing)`,
        'char': a.length > 1 ? `${atom(c(0))}.Chars(${c(1)}).ToString()` : `ChrW(${c(0)}).ToString()`,
        tochar: `ChrW(${c(0)}).ToString()`, tocode: `AscW(${atom(c(0))}.Chars(0))`, pi: 'Math.PI',
    }[l] ?? null;
};

/**
 * Generate a program in Visual Basic .NET, Go, Rust or Kotlin.
 *
 * @param {string} lang vb, go, rust or kotlin
 * @param {Object} program the algorithm
 * @returns {{text: string, owners: Array}}
 */
const generateTyped = (lang, program) => {
    recDefs = recordMap(program);
    const base0 = TYPED[lang];
    // Record types are types of the language too: their names, and a new record as the start value.
    const L = {...base0,
        types: new Proxy(base0.types, {get: (o, type) => (recOf(type) ? recOf(type).name : o[type])}),
        defaults: new Proxy(base0.defaults, {get: (o, type) => {
            const def = recOf(type);
            if (!def) {
                return o[type];
            }
            return {go: `${def.name}{}`, rust: `${def.name}::default()`, kotlin: `${def.name}()`}[lang] || `New ${def.name}()`;
        }})};
    const vb = lang === 'vb';
    const semi = L.semi || '';
    const need = {};
    const fns = Object.assign(Object.create(null), Object.fromEntries(program.functions.map((f) => [f.name.toLowerCase(), f])));
    let syms = Object.create(null);

    // Names: as declared, and with "_" when they are words of the language.
    const reserved = RESERVED_SETS[lang];
    const used = new Set();
    program.functions.forEach((f) => {
        used.add(f.name.toLowerCase());
        f.params.forEach((p) => used.add(p.name.toLowerCase()));
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                String(b.name).split(',').forEach((x) => used.add(x.trim().toLowerCase()));
            } else if (b.type === 'for') {
                used.add(String(b.variable || '').trim().toLowerCase());
            }
        });
    });
    const renamed = new Map();
    const safe = (name) => {
        const key = vb ? name.toLowerCase() : name;
        if (!reserved.has(key)) {
            return name;
        }
        if (!renamed.has(key)) {
            let s = `${name}_`;
            while (reserved.has(vb ? s.toLowerCase() : s) || used.has(s.toLowerCase())) {
                s += '_';
            }
            used.add(s.toLowerCase());
            renamed.set(key, s);
        }
        return renamed.get(key);
    };
    const fnName = (f) => safe(f.name);
    let canon = Object.create(null);
    const nameOf = (name) => own(canon, String(name).toLowerCase()) ||
        (String(name).toLowerCase() === 'pi' ? String(name) : safe(String(name)));
    const fixNames = (n) => {
        if (n.k === 'var' || n.k === 'idx') {
            n.name = nameOf(n.name);
        } else if (n.k === 'call' && own(fns, n.name.toLowerCase())) {
            n.fn = fns[n.name.toLowerCase()];
            n.name = fnName(n.fn);
        } else if (n.k === 'fld') {
            n.field = n.field || n.name;
            n.name = safe(n.field);
        } else if (n.k === 'call' && Object.hasOwn(ALIASES, n.name.toLowerCase())) {
            n.name = ALIASES[n.name.toLowerCase()];
        }
        [n.e, n.l, n.r, n.index, n.index2, ...(n.args || [])].forEach((c) => c && fixNames(c));
        return n;
    };
    // A record in a text: Type(field = value, ...) as the interpreter writes it.
    const recText = (n) => {
        const def = recOf(typeOf(n, syms, fns));
        if (!def) {
            return n;
        }
        const parts = [];
        def.fields.forEach((f, i) => {
            parts.push({k: 'str', v: `${i ? ', ' : `${def.name}(`}${f.name} = `});
            parts.push({k: 'fld', e: n, name: safe(f.name), field: f.name});
        });
        parts.push({k: 'str', v: ')'});
        return parts.reduce((l, r) => ({k: 'bin', op: '&', l, r}));
    };
    const expandRecords = (n) => {
        if (n.k === 'bin' && (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String'))) {
            n.l = recText(expandRecords(n.l));
            n.r = recText(expandRecords(n.r));
        }
        return n;
    };
    const parse = (src) => expandRecords(fixNames(parseExpr(src)));
    // A record that is stored or passed: a copy where the language would share the object (Rust clones when it reads).
    const copyRec = (code, n) => (recOf(typeOf(n, syms, fns)) && n.k !== 'call' ?
        {vb: `${code}.Copy()`, kotlin: `${code}.copy()`}[lang] || code : code);

    // ---- Expressions: every code knows its type.
    const conv = (e, to) => {
        if (e.type === to) {
            return e.code;
        }
        if (e.type === 'Integer' && to === 'Real') {
            return /^\d+$/.test(e.code) && lang !== 'vb' ? `${e.code}.0` : L.toReal(tight(e.code));
        }
        if (e.type === 'Real' && to === 'Integer') {
            if (lang === 'go') {
                need.goMath = true;
            }
            return L.toInt(tight(e.code));
        }
        return e.code;
    };
    const numeric = (t) => t === 'Integer' || t === 'Real';
    const index = (e) => {
        const code = conv(e, 'Integer');
        return lang === 'rust' ? `(${code}) as usize` : code;
    };
    let lvalue = false;
    const sym = (name) => own(syms, name);

    // eslint-disable-next-line complexity
    const node = (n) => {
        switch (n.k) {
            case 'num':
                return n.int ? {code: String(n.v), type: 'Integer'} :
                    {code: L.realLiteral ? realLiteral(n.v) : String(n.v), type: 'Real'};
            case 'str': return {code: L.str(n.v), type: 'String'};
            case 'bool': return {code: L.bool(n.v), type: 'Boolean'};
            case 'var': {
                const s = sym(n.name);
                if (!s && n.name.toLowerCase() === 'pi') {
                    return {code: typedBuiltin(lang, 'pi', [], () => '', () => '', need), type: 'Real'};
                }
                const type = s ? s.type : 'Integer';
                const clone = (type === 'String' || recOf(type)) && !lvalue && !(s && s.array);
                return {code: lang === 'rust' && clone ? `${n.name}.clone()` : n.name, type};
            }
            case 'idx': {
                const s = sym(n.name);
                const type = s ? s.type : 'Integer';
                const target = lvalue;
                lvalue = false;
                const i = index(walk(n.index));
                const j = n.index2 ? index(walk(n.index2)) : null;
                lvalue = target;
                let code;
                if (vb) {
                    code = j === null ? `${n.name}(${i})` : `${n.name}(${i}, ${j})`;
                } else {
                    code = j === null ? `${n.name}[${i}]` : `${n.name}[${i}][${j}]`;
                }
                return {code: lang === 'rust' && (type === 'String' || recOf(type)) && !lvalue ? `${code}.clone()` : code, type};
            }
            case 'fld': {
                // The record itself is not copied to read or set one of its fields.
                const outer = lvalue;
                lvalue = true;
                const rec = walk(n.e, 9);
                lvalue = outer;
                const f = fieldDef(recOf(rec.type), n);
                const type = f ? f.type : 'Integer';
                const code = `${rec.code}.${n.name}`;
                return {code: lang === 'rust' && type === 'String' && !lvalue ? `${code}.clone()` : code, type};
            }
            case 'un': {
                const e = walk(n.e, 8);
                if (n.op === '!') {
                    return {code: `${L.not}${e.code}`, type: 'Boolean'};
                }
                return {code: n.op === '-' ? `-${e.code}` : e.code, type: e.type};
            }
            case 'call': return callNode(n);
            case 'bin': return binNode(n);
            default: return {code: '', type: 'Integer'};
        }
    };
    const walk = (n, ctx = 0) => {
        const r = node(n);
        return precOf(n) < ctx ? {code: `(${r.code})`, type: r.type} : r;
    };
    const toText = (parts) => {
        if (lang === 'rust') {
            if (parts.length === 1 && parts[0].type === 'String') {
                return parts[0].code;
            }
            return `format!("${'{}'.repeat(parts.length)}", ` +
                `${parts.map((p) => (p.type === 'Real' ? `fmt_real(${p.code})` : p.code)).join(', ')})`;
        }
        if (lang === 'go') {
            return parts.map((p) => {
                if (p.type !== 'String') {
                    need.goStrconv = true;
                }
                return {String: p.code, Integer: `strconv.Itoa(${p.code})`, Real: `fmtReal(${p.code})`,
                    Boolean: `strconv.FormatBool(${p.code})`}[p.type];
            }).join(' + ');
        }
        if (lang === 'kotlin') {
            return parts.map((p, i) => {
                const code = p.type === 'Real' ? `fmt(${p.code})` : p.code;
                return i === 0 && p.type !== 'String' && p.type !== 'Real' ? `"" + ${tight(code)}` : code;
            }).join(' + ');
        }
        return parts.map((p) => ({Real: `Fmt(${p.code})`, Boolean: `BoolStr(${p.code})`, Integer: `CStr(${p.code})`}[p.type] ||
            p.code)).join(' & ');
    };
    // eslint-disable-next-line complexity
    const binNode = (n) => {
        const p = PREC[n.op] ?? 4;
        if (n.op === '&' || (n.op === '+' && typeOf(n, syms, fns) === 'String')) {
            return {code: toText(concatParts(n, syms, fns).map((q) => walk(q, 4.5))), type: 'String'};
        }
        if (n.op === '&&' || n.op === '||') {
            return {code: `${walk(n.l, p).code} ${n.op === '&&' ? L.and : L.or} ${walk(n.r, p + 0.5).code}`, type: 'Boolean'};
        }
        const l = walk(n.l, n.op === '^' ? 8 : p + (CMP.includes(n.op) ? 0.5 : 0));
        const r = walk(n.r, n.op === '^' ? 8 : p + 0.5);
        if (n.op === '^') {
            return {code: L.pow(tight(conv(l, 'Real')), conv(r, 'Real')), type: 'Real'};
        }
        if (n.op === '/') {
            const code = vb ? `${l.code} / ${r.code}` : `${tight(conv(l, 'Real'))} / ${tight(conv(r, 'Real'))}`;
            return {code, type: 'Real'};
        }
        const mixed = numeric(l.type) && numeric(r.type) && l.type !== r.type;
        const t = mixed || l.type === 'Real' || r.type === 'Real' ? 'Real' : l.type;
        const lc = L.strict && mixed ? conv(l, 'Real') : l.code;
        const rc = L.strict && mixed ? conv(r, 'Real') : r.code;
        if (n.op === '%' && lang === 'go' && t === 'Real') {
            need.goMath = true;
            return {code: `math.Mod(${conv(l, 'Real')}, ${conv(r, 'Real')})`, type: 'Real'};
        }
        if (n.op === '%' && vb) {
            return {code: `(${lc} Mod ${rc})`, type: t};
        }
        const op = (L.ops && own(L.ops, n.op)) || n.op;
        return {code: `${lc} ${op} ${rc}`, type: CMP.includes(n.op) ? 'Boolean' : t};
    };
    const arrayLength = (name) => {
        const s = sym(name);
        if (lang === 'go') {
            return `len(${name})`;
        }
        if (lang === 'rust') {
            return `(${name}.len() as i64)`;
        }
        if (lang === 'kotlin') {
            return `${name}.size`;
        }
        return s.matrix ? `${name}.GetLength(0)` : `${name}.Length`;
    };
    const callNode = (n) => {
        const l = n.name.toLowerCase();
        if (n.fn) {
            const args = n.args.map((a, i) => {
                const p = n.fn.params[i];
                if (p && p.array && a.k === 'var') {
                    const s = sym(a.name);
                    return lang === 'rust' && !(s && s.param) ? `&mut ${a.name}` : a.name;
                }
                return p ? copyRec(conv(walk(a), p.type), a) : walk(a).code;
            });
            return {code: `${n.name}(${args.join(', ')})`, type: n.fn.returnType || 'Integer'};
        }
        const a0 = n.args[0];
        if (l === 'len' && a0 && a0.k === 'var' && sym(a0.name) && sym(a0.name).array) {
            return {code: arrayLength(a0.name), type: 'Integer'};
        }
        const args = n.args.map((a) => walk(a));
        if ((l === 'toint' || l === 'toreal') && args[0] && args[0].type !== 'String') {
            return {code: conv(args[0], l === 'toint' ? 'Integer' : 'Real'), type: l === 'toint' ? 'Integer' : 'Real'};
        }
        if (l === 'tostring') {
            return {code: toText([args[0]]), type: 'String'};
        }
        // Missing arguments give empty code: the table of built-in functions builds every entry.
        const real = (i) => (args[i] ? tight(conv(args[i], 'Real')) : '');
        const whole = (i) => (args[i] ? conv(args[i], 'Integer') : '');
        const code = typedBuiltin(lang, l, args, real, whole, need);
        if (code === null) {
            return {code: `${n.name}(${args.map((a) => a.code).join(', ')})`, type: 'Real'};
        }
        return {code, type: own(BUILTIN_TYPES, l) || 'Real'};
    };
    const ex = (src, to = null) => {
        const e = walk(parse(src));
        return to ? conv(e, to) : e.code;
    };
    const target = (src) => {
        lvalue = true;
        try {
            const n = parse(src);
            const w = walk(n);
            return {code: w.code, type: n.k === 'var' || n.k === 'idx' ? (sym(n.name) || {type: 'Integer'}).type : w.type};
        } finally {
            lvalue = false;
        }
    };

    // ---- Statements.
    const out = [];
    const owners = [];
    let owner = null;
    const emit = (ind, line) => {
        out.push('    '.repeat(ind) + line);
        owners.push(owner);
    };

    const printStmt = (b, ind) => {
        const whole = parse(b.expr);
        const rec = recText(whole);
        const text = rec === whole ? toText([walk(whole)]) : walk(rec).code;
        const nl = b.newline !== false;
        if (lang === 'go') {
            need.goFmt = true;
            emit(ind, `fmt.Print${nl ? 'ln' : ''}(${text})`);
        } else if (lang === 'rust') {
            emit(ind, nl ? `println!("{}", ${text});` : `print!("{}", ${text});`);
            if (!nl) {
                emit(ind, 'io::stdout().flush().unwrap();');
            }
        } else if (lang === 'kotlin') {
            emit(ind, `print${nl ? 'ln' : ''}(${text})`);
        } else {
            emit(ind, `Console.Write${nl ? 'Line' : ''}(${text})`);
        }
    };
    const READ = {
        go: {Integer: 'readInt()', Real: 'readReal()', String: 'readLine()',
            Boolean: 'strings.EqualFold(strings.TrimSpace(readLine()), "true")'},
        rust: {Integer: 'read_line().trim().parse::<i64>().unwrap()', Real: 'read_line().trim().parse::<f64>().unwrap()',
            String: 'read_line()', Boolean: 'read_line().trim().eq_ignore_ascii_case("true")'},
        kotlin: {Integer: 'readln().trim().toInt()', Real: 'readln().trim().toDouble()', String: 'readln()',
            Boolean: 'readln().trim().equals("true", ignoreCase = true)'},
        vb: {Integer: 'Integer.Parse(Console.ReadLine().Trim())',
            Real: 'Double.Parse(Console.ReadLine().Trim(), CultureInfo.InvariantCulture)', String: 'Console.ReadLine()',
            Boolean: 'Console.ReadLine().Trim().ToLower() = "true"'},
    };
    const inputStmt = (b, ind) => {
        const t = target(b.target);
        if (lang === 'go') {
            need.goInput = true;
            need.goStrconv = true;
        }
        emit(ind, `${t.code} = ${READ[lang][t.type] || READ[lang].String}${semi}`);
    };
    const assignStmt = (b, ind) => {
        const t = target(b.target);
        if (recOf(t.type)) {
            const n = parse(b.expr);
            emit(ind, `${t.code} = ${copyRec(walk(n).code, n)}${semi}`);
            return;
        }
        emit(ind, `${t.code} = ${ex(b.expr, t.type)}${semi}`);
    };

    const declare = (b, ind) => String(b.name).split(',').map((x) => x.trim()).filter(Boolean)
        .forEach((name) => declareOne({...b, name: nameOf(name)}, ind));
    // eslint-disable-next-line complexity
    const declareOne = (b, ind) => {
        const size = String(b.size || '').trim() ? ex(b.size, 'Integer') : null;
        const size2 = size !== null && isMatrix(b) ? ex(b.size2, 'Integer') : null;
        syms[b.name] = {type: b.varType, array: size !== null, matrix: size2 !== null};
        const tn = L.types[b.varType];
        const dv = L.defaults[b.varType];
        if (recOf(b.varType) && size !== null && lang === 'kotlin') {
            emit(ind, `var ${b.name}: Array<${tn}> = Array(${size}) { ${dv} }`);
            return;
        }
        if (recOf(b.varType) && size !== null && vb) {
            const last = /^\d+$/.test(size) ? String(Number(size) - 1) : `${atom(size)} - 1`;
            emit(ind, `Dim ${b.name}(${last}) As ${tn}`);
            emit(ind, `For k_ As Integer = 0 To ${b.name}.Length - 1`);
            emit(ind + 1, `${b.name}(k_) = ${dv}`);
            emit(ind, 'Next');
            return;
        }
        if (lang === 'go') {
            if (size === null) {
                emit(ind, `var ${b.name} ${tn} = ${dv}`);
            } else if (size2 === null) {
                emit(ind, `var ${b.name} []${tn} = make([]${tn}, ${size})`);
            } else {
                emit(ind, `var ${b.name} [][]${tn} = make([][]${tn}, ${size})`);
                emit(ind, `for k_ := range ${b.name} {`);
                emit(ind + 1, `${b.name}[k_] = make([]${tn}, ${size2})`);
                emit(ind, '}');
            }
            emit(ind, `_ = ${b.name}`);
        } else if (lang === 'rust') {
            if (size === null) {
                emit(ind, `let mut ${b.name}: ${tn} = ${dv};`);
            } else if (size2 === null) {
                emit(ind, `let mut ${b.name}: Vec<${tn}> = vec![${dv}; (${size}) as usize];`);
            } else {
                emit(ind, `let mut ${b.name}: Vec<Vec<${tn}>> = vec![vec![${dv}; (${size2}) as usize]; (${size}) as usize];`);
            }
        } else if (lang === 'kotlin') {
            const arr = KOTLIN_ARRAYS[b.varType];
            const make = (n) => (b.varType === 'String' ? `Array(${n}) { "" }` : `${arr}(${n})`);
            if (size === null) {
                emit(ind, `var ${b.name}: ${tn} = ${dv}`);
            } else if (size2 === null) {
                emit(ind, `var ${b.name}: ${arr} = ${make(size)}`);
            } else {
                emit(ind, `var ${b.name}: Array<${arr}> = Array(${size}) { ${make(size2)} }`);
            }
        } else if (size === null) {
            emit(ind, `Dim ${b.name} As ${tn} = ${dv}`);
        } else {
            const last = (n) => (/^\d+$/.test(n) ? String(Number(n) - 1) : `${atom(n)} - 1`);
            emit(ind, `Dim ${b.name}(${last(size)}${size2 === null ? '' : `, ${last(size2)}`}) As ${tn}`);
            if (b.varType === 'String' && size2 === null) {
                emit(ind, `Array.Fill(${b.name}, "")`);
            } else if (b.varType === 'String') {
                emit(ind, `For fill_r As Integer = 0 To ${b.name}.GetLength(0) - 1`);
                emit(ind + 1, `For fill_c As Integer = 0 To ${b.name}.GetLength(1) - 1`);
                emit(ind + 2, `${b.name}(fill_r, fill_c) = ""`);
                emit(ind + 1, 'Next');
                emit(ind, 'Next');
            }
        }
    };

    // Loops being written, innermost last: their kind (Visual Basic names it in Exit and Continue) and what a Continue
    // must do first (the condition of a do-while in Go and Rust, the step of a counting loop in Rust and Kotlin).
    const loops = [];
    const inLoop = (kind, before, write) => {
        loops.push({kind, before});
        try {
            write();
        } finally {
            loops.pop();
        }
    };
    const block = (list, ind) => list.forEach((b) => stmt(b, ind));
    const cond = (src) => ex(src, 'Boolean');
    const ifStmt = (b, ind) => {
        const c = cond(b.cond);
        emit(ind, vb ? `If ${c} Then` : {go: `if ${c} {`, rust: `if ${c} {`}[lang] || `if (${c}) {`);
        block(b.then, ind + 1);
        if (b.else.length) {
            emit(ind, vb ? 'Else' : '} else {');
            block(b.else, ind + 1);
        }
        emit(ind, vb ? 'End If' : '}');
    };
    const whileStmt = (b, ind) => {
        const c = cond(b.cond);
        emit(ind, {vb: `While ${c}`, go: `for ${c} {`, rust: `while ${c} {`}[lang] || `while (${c}) {`);
        inLoop('While', [], () => block(b.body, ind + 1));
        emit(ind, vb ? 'End While' : '}');
    };
    const doStmt = (b, ind) => {
        const c = cond(b.cond);
        if (vb || lang === 'kotlin') {
            emit(ind, vb ? 'Do' : 'do {');
            inLoop('Do', [], () => block(b.body, ind + 1));
            emit(ind, vb ? `Loop While ${c}` : `} while (${c})`);
            return;
        }
        const check = lang === 'go' ? `if !(${c}) { break }` : `if !(${c}) { break; }`;
        emit(ind, lang === 'go' ? 'for {' : 'loop {');
        inLoop('Do', [check], () => block(b.body, ind + 1));
        emit(ind + 1, check);
        emit(ind, '}');
    };
    const forStmt = (b, ind) => {
        const v = nameOf(b.variable);
        const type = (sym(v) || {type: 'Integer'}).type;
        const step = String(b.step || '1').trim() || '1';
        const neg = /^-/.test(step);
        const [start, end, by] = [ex(b.start, type), ex(b.end, type), ex(step, type)];
        if (vb) {
            emit(ind, `For ${v} = ${start} To ${end}${step === '1' ? '' : ` Step ${by}`}`);
            inLoop('For', [], () => block(b.body, ind + 1));
            emit(ind, 'Next');
            return;
        }
        if (lang === 'go') {
            emit(ind, `for ${v} = ${start}; ${v} ${neg ? '>=' : '<='} ${end}; ${v} += ${by} {`);
            inLoop('For', [], () => block(b.body, ind + 1));
            emit(ind, '}');
            return;
        }
        // Rust and Kotlin count with a while loop, so the step may be any expression.
        const next = `${v} += ${by}${semi}`;
        emit(ind, `${v} = ${start}${semi}`);
        emit(ind, lang === 'rust' ? `while ${v} ${neg ? '>=' : '<='} ${end} {` : `while (${v} ${neg ? '>=' : '<='} ${end}) {`);
        inLoop('For', [next], () => block(b.body, ind + 1));
        emit(ind + 1, next);
        emit(ind, '}');
    };
    let fnReturn = null;
    // eslint-disable-next-line complexity
    const stmtCode = (b, ind) => {
        switch (b.type) {
            case 'declare': declare(b, ind); break;
            case 'assign': assignStmt(b, ind); break;
            case 'input': inputStmt(b, ind); break;
            case 'output': printStmt(b, ind); break;
            case 'call': emit(ind, `${ex(b.expr)}${semi}`); break;
            case 'return': {
                const value = String(b.expr || '').trim() && fnReturn ? ` ${ex(b.expr, fnReturn)}` : '';
                emit(ind, `${vb ? 'Return' : 'return'}${value}${semi}`);
                break;
            }
            case 'comment':
                String(b.text).split('\n').forEach((line) => emit(ind, `${L.comment} ${line}`));
                break;
            case 'forward':
            case 'turn':
            case 'pen':
            case 'home':
            case 'clear': emit(ind, `${L.comment} Turtle: ${labelOf(b)}`); break;
            case 'open':
            case 'read':
            case 'write':
            case 'close': emit(ind, `${L.comment} File: ${labelOf(b)}`); break;
            case 'if': ifStmt(b, ind); break;
            case 'while': whileStmt(b, ind); break;
            case 'dowhile': doStmt(b, ind); break;
            case 'for': forStmt(b, ind); break;
            case 'break': {
                const loop = loops[loops.length - 1];
                emit(ind, vb ? `Exit ${loop ? loop.kind : 'For'}` : `break${semi}`);
                break;
            }
            case 'continue': {
                const loop = loops[loops.length - 1];
                (loop ? loop.before : []).forEach((line) => emit(ind, line));
                emit(ind, vb ? `Continue ${loop ? loop.kind : 'For'}` : `continue${semi}`);
                break;
            }
            default: break;
        }
    };
    const stmt = (b, ind) => {
        const outer = owner;
        owner = b.id || null;
        noteLines(b).forEach((line) => emit(ind, `${L.comment} ${line}`));
        stmtCode(b, ind);
        owner = outer;
    };

    // ---- Functions.
    const paramCode = (p) => {
        const name = safe(p.name);
        const tn = L.types[p.type];
        if (lang === 'go') {
            return `${name} ${p.matrix ? '[][]' : ''}${p.array && !p.matrix ? '[]' : ''}${tn}`;
        }
        if (lang === 'rust') {
            if (!p.array) {
                return `mut ${name}: ${tn}`;
            }
            return `${name}: &mut ${p.matrix ? `Vec<Vec<${tn}>>` : `Vec<${tn}>`}`;
        }
        if (lang === 'kotlin') {
            const arr = KOTLIN_ARRAYS[p.type] || `Array<${tn}>`;
            if (p.matrix) {
                return `${name}: Array<${arr}>`;
            }
            return `${name}: ${p.array ? arr : tn}`;
        }
        let brackets = p.array ? '()' : '';
        if (p.matrix) {
            brackets = '(,)';
        }
        return `${name}${brackets} As ${tn}`;
    };
    const mainName = fns.main ? 'main' : program.functions[0].name.toLowerCase();
    const base = vb ? 1 : 0;
    const funcs = [...program.functions].sort((a, b) => (a.name.toLowerCase() === 'main') - (b.name.toLowerCase() === 'main'));
    funcs.forEach((f) => {
        const isMain = f.name.toLowerCase() === mainName;
        syms = Object.create(null);
        canon = Object.create(null);
        f.params.forEach((p) => {
            canon[p.name.toLowerCase()] = own(canon, p.name.toLowerCase()) || safe(p.name);
            syms[safe(p.name)] = {type: p.type, array: Boolean(p.array), matrix: Boolean(p.matrix), param: true};
        });
        const loopVars = [];
        allBlocks(f.body).forEach((b) => {
            if (b.type === 'declare') {
                String(b.name).split(',').map((x) => x.trim()).filter(Boolean).forEach((name) => {
                    canon[name.toLowerCase()] = own(canon, name.toLowerCase()) || safe(name);
                });
            } else if (b.type === 'for' && String(b.variable || '').trim()) {
                const name = String(b.variable).trim();
                if (!own(canon, name.toLowerCase())) {
                    canon[name.toLowerCase()] = safe(name);
                    loopVars.push(canon[name.toLowerCase()]);
                }
            }
        });
        fnReturn = isMain ? null : f.returnType || null;
        const name = isMain ? {vb: 'Main'}[lang] || 'main' : fnName(f);
        const params = isMain ? '' : f.params.map(paramCode).join(', ');
        const ret = fnReturn ? L.types[fnReturn] : '';
        if (vb) {
            emit(base, fnReturn ? `Function ${name}(${params}) As ${ret}` : `Sub ${name}(${params})`);
        } else {
            const after = ret ? {go: ` ${ret}`, rust: ` -> ${ret}`, kotlin: `: ${ret}`}[lang] : '';
            emit(base, `${{go: 'func', rust: 'fn', kotlin: 'fun'}[lang]} ${name}(${params})${after} {`);
        }
        const ind = base + 1;
        if (vb && isMain) {
            emit(ind, 'CultureInfo.CurrentCulture = CultureInfo.InvariantCulture');
        }
        if (lang === 'kotlin') {
            // Parameters cannot be changed in Kotlin; the algorithm may change them.
            f.params.filter((p) => !p.array).forEach((p) => emit(ind, `var ${safe(p.name)} = ${safe(p.name)}`));
        }
        // Counters of For loops that are not declared: whole numbers of the function.
        loopVars.forEach((v) => {
            syms[v] = {type: 'Integer'};
            emit(ind, {go: `var ${v} int`, rust: `let mut ${v}: i64 = 0;`, kotlin: `var ${v}: Int = 0`}[lang] ||
                `Dim ${v} As Integer`);
            if (lang === 'go') {
                emit(ind, `_ = ${v}`);
            }
        });
        block(f.body, ind);
        if (fnReturn && !vb) {
            emit(ind, `return ${L.defaults[fnReturn]}${semi}`);
        }
        const end = fnReturn ? 'End Function' : 'End Sub';
        emit(base, vb ? end : '}');
        emit(0, '');
    });
    const body = out.splice(0);
    const bodyOwners = owners.splice(0);

    // The definitions of the record types.
    const recordTypes = (ind) => [...recDefs.values()].forEach((def) => {
        const fields = def.fields.map((f) => ({name: safe(f.name), type: base0.types[f.type], dv: base0.defaults[f.type]}));
        if (lang === 'go') {
            emit(ind, `type ${def.name} struct {`);
            fields.forEach((f) => emit(ind + 1, `${f.name} ${f.type}`));
            emit(ind, '}');
        } else if (lang === 'rust') {
            emit(ind, '#[derive(Clone, Default)]');
            emit(ind, `struct ${def.name} {`);
            fields.forEach((f) => emit(ind + 1, `${f.name}: ${f.type},`));
            emit(ind, '}');
        } else if (lang === 'kotlin') {
            emit(ind, `data class ${def.name}(${fields.map((f) => `var ${f.name}: ${f.type} = ${f.dv}`).join(', ')})`);
        } else {
            emit(ind, `Class ${def.name}`);
            fields.forEach((f) => emit(ind + 1, `Public ${f.name} As ${f.type} = ${f.dv}`));
            emit(ind + 1, `Public Function Copy() As ${def.name}`);
            emit(ind + 2, `Return CType(MemberwiseClone(), ${def.name})`);
            emit(ind + 1, 'End Function');
            emit(ind, 'End Class');
        }
        emit(ind, '');
    });

    // ---- Start and end of the program.
    const helperLines = {
        go: () => {
            const imports = ['fmt'].filter(() => need.goFmt);
            if (need.goInput) {
                imports.push('bufio', 'os');
            }
            if (need.goMath || need.goStrconv) {
                imports.push('math');
            }
            if (need.goStrconv) {
                imports.push('strconv', 'strings');
            }
            if (need.goRand) {
                imports.push('math/rand');
            }
            emit(0, 'package main');
            emit(0, '');
            if (imports.length) {
                emit(0, 'import (');
                [...new Set(imports)].sort().forEach((i) => emit(1, `"${i}"`));
                emit(0, ')');
                emit(0, '');
            }
            if (need.goStrconv) {
                emit(0, '// A real number as the algorithm writes it: 7 for a whole number, otherwise rounded to 10 decimals.');
                emit(0, 'func fmtReal(v float64) string {');
                emit(1, 'if v == math.Trunc(v) && math.Abs(v) < 1e15 {');
                emit(2, 'return strconv.FormatInt(int64(v), 10)');
                emit(1, '}');
                emit(1, "return strconv.FormatFloat(math.Round(v*1e10)/1e10, 'f', -1, 64)");
                emit(0, '}');
                emit(0, '');
                emit(0, 'func toInt(s string) int {');
                emit(1, 'v, _ := strconv.Atoi(strings.TrimSpace(s))');
                emit(1, 'return v');
                emit(0, '}');
                emit(0, '');
                emit(0, 'func parseReal(s string) float64 {');
                emit(1, 'v, _ := strconv.ParseFloat(strings.TrimSpace(s), 64)');
                emit(1, 'return v');
                emit(0, '}');
                emit(0, '');
                emit(0, 'func isNumeric(s string) bool {');
                emit(1, '_, err := strconv.ParseFloat(strings.TrimSpace(s), 64)');
                emit(1, 'return err == nil');
                emit(0, '}');
                emit(0, '');
            }
            if (need.goSign) {
                emit(0, 'func sgn(v float64) int {');
                emit(1, 'if v > 0 {');
                emit(2, 'return 1');
                emit(1, '} else if v < 0 {');
                emit(2, 'return -1');
                emit(1, '}');
                emit(1, 'return 0');
                emit(0, '}');
                emit(0, '');
            }
            if (need.goInput) {
                emit(0, 'var reader = bufio.NewReader(os.Stdin)');
                emit(0, '');
                emit(0, 'func readLine() string {');
                emit(1, "s, _ := reader.ReadString('\\n')");
                emit(1, 'return strings.TrimRight(s, "\\r\\n")');
                emit(0, '}');
                emit(0, '');
                emit(0, 'func readInt() int {');
                emit(1, 'return toInt(readLine())');
                emit(0, '}');
                emit(0, '');
                emit(0, 'func readReal() float64 {');
                emit(1, 'return parseReal(readLine())');
                emit(0, '}');
                emit(0, '');
            }
        },
        rust: () => {
            emit(0, '#![allow(unused_variables, unused_mut, unused_assignments, unused_parens, non_snake_case, ' +
                'unreachable_code, dead_code, unused_imports)]');
            emit(0, 'use std::io::{self, Write};');
            emit(0, '');
            emit(0, '/// A real number as the algorithm writes it: 7 for a whole number, otherwise rounded to 10 decimals.');
            emit(0, 'fn fmt_real(v: f64) -> String {');
            emit(1, 'if v == v.trunc() && v.abs() < 1e15 {');
            emit(2, 'return format!("{}", v as i64);');
            emit(1, '}');
            emit(1, 'format!("{}", (v * 1e10).round() / 1e10)');
            emit(0, '}');
            emit(0, '');
            emit(0, 'fn read_line() -> String {');
            emit(1, 'let mut s = String::new();');
            emit(1, 'io::stdin().read_line(&mut s).unwrap();');
            emit(1, "s.trim_end_matches(&['\\r', '\\n'][..]).to_string()");
            emit(0, '}');
            emit(0, '');
            emit(0, 'fn rand_below(n: i64) -> i64 {');
            emit(1, 'use std::sync::atomic::{AtomicU64, Ordering};');
            emit(1, 'static STATE: AtomicU64 = AtomicU64::new(0);');
            emit(1, 'let mut s = STATE.load(Ordering::Relaxed);');
            emit(1, 'if s == 0 {');
            emit(2, 's = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as u64 | 1;');
            emit(1, '}');
            emit(1, 's ^= s << 13;');
            emit(1, 's ^= s >> 7;');
            emit(1, 's ^= s << 17;');
            emit(1, 'STATE.store(s, Ordering::Relaxed);');
            emit(1, '(s % (n as u64)) as i64');
            emit(0, '}');
            emit(0, '');
        },
        kotlin: () => {
            emit(0, '// A real number as the algorithm writes it: 7 for a whole number, otherwise rounded to 10 decimals.');
            emit(0, 'fun fmt(v: Double): String {');
            emit(1, 'if (v == Math.rint(v) && Math.abs(v) < 1e15) {');
            emit(2, 'return v.toLong().toString()');
            emit(1, '}');
            emit(1, 'return java.math.BigDecimal.valueOf(Math.round(v * 1e10) / 1e10).stripTrailingZeros().toPlainString()');
            emit(0, '}');
            emit(0, '');
        },
        vb: () => {
            emit(0, 'Imports System');
            emit(0, 'Imports System.Globalization');
            emit(0, '');
            emit(0, 'Module Program');
            if (need.vbRandom) {
                emit(1, 'Private rnd As New Random()');
                emit(1, '');
            }
            emit(1, "' A real number as the algorithm writes it: 7 for a whole number, otherwise rounded to 10 decimals.");
            emit(1, 'Function Fmt(v As Double) As String');
            emit(2, 'If v = Math.Truncate(v) AndAlso Math.Abs(v) < 1E+15 Then');
            emit(3, 'Return CLng(v).ToString()');
            emit(2, 'End If');
            emit(2, 'Return (Math.Round(v * 1E+10, MidpointRounding.AwayFromZero) / 1E+10).ToString(CultureInfo.InvariantCulture)');
            emit(1, 'End Function');
            emit(1, '');
            emit(1, 'Function BoolStr(v As Boolean) As String');
            emit(2, 'Return If(v, "true", "false")');
            emit(1, 'End Function');
            emit(1, '');
        },
    };
    helperLines[lang]();
    out.push(...body);
    owners.push(...bodyOwners);
    if (vb) {
        emit(0, 'End Module');
    }
    if (recDefs.size) {
        // The record types after the program (all four languages allow types there).
        emit(0, '');
        recordTypes(0);
    }
    const lineOwners = out.flatMap((piece, i) => piece.split('\n').map(() => owners[i]));
    const text = out.join('\n').replace(/\n*$/, '\n');
    return {text, owners: lineOwners.slice(0, text.split('\n').length - 1)};
};

// ---- Pseudo-code ------------------------------------------------------------------------------------------------------
// Keywords in the language of the user (pc_* strings), expressions as the algorithm writes them, ← for assignment.

/**
 * The algorithm as pseudo-code.
 *
 * @param {Object} program the algorithm
 * @returns {{text: string, owners: Array}}
 */
const generatePseudo = (program) => {
    const kw = (key) => t(`pc${key}`);
    const out = [];
    const owners = [];
    let owner = null;
    const emit = (ind, line) => {
        out.push('  '.repeat(ind) + line);
        owners.push(owner);
    };
    const list = (blocks, ind) => blocks.forEach((b) => {
        const outer = owner;
        owner = b.id || null;
        noteLines(b).forEach((line) => emit(ind, `// ${line}`));
        block(b, ind);
        owner = outer;
    });
    const step = (b) => (String(b.step || '1').trim() === '1' ? '' : ` ${kw('step')} ${b.step}`);
    const SIMPLE = {
        declare: (b) => `${kw('declare')} ${labelOf(b)}`, assign: (b) => `${b.target} ← ${b.expr}`,
        input: (b) => `${kw('input')} ${b.target}`, output: (b) => `${kw('output')} ${b.expr}`,
        call: (b) => `${kw('call')} ${b.expr}`, 'return': (b) => `${kw('return')} ${b.expr || ''}`.trim(),
        'break': () => kw('break'), 'continue': () => kw('continue'),
        forward: (b) => `${kw('forward')} ${b.distance}${b.pen === 'up' ? ` (${kw('penup')})` : ''}`,
        turn: (b) => `${kw('turn')} ${kw(b.rotate === 'left' ? 'left' : 'right')} ${b.angle}`,
        pen: (b) => `${kw('pen')} ${b.color}`, home: () => kw('home'), clear: () => kw('clear'),
        open: (b) => `${kw('open')} ${b.file} ${kw({write: 'forwrite', append: 'forappend'}[b.mode] || 'forread')}`,
        read: (b) => `${kw('read')} ${b.target}`, write: (b) => `${kw('write')} ${b.expr}`,
        close: (b) => `${kw('close')} (${kw(b.mode === 'write' ? 'forwrite' : 'forread')})`,
    };
    const block = (b, ind) => {
        if (Object.hasOwn(SIMPLE, b.type)) {
            emit(ind, SIMPLE[b.type](b));
        } else if (b.type === 'comment') {
            String(b.text).split(/\r?\n/).forEach((line) => emit(ind, `// ${line}`));
        } else if (b.type === 'if') {
            emit(ind, `${kw('if')} ${b.cond} ${kw('then')}`);
            list(b.then, ind + 1);
            if (b.else.length) {
                emit(ind, kw('else'));
                list(b.else, ind + 1);
            }
            emit(ind, kw('endif'));
        } else if (b.type === 'while') {
            emit(ind, `${kw('while')} ${b.cond}`);
            list(b.body, ind + 1);
            emit(ind, kw('endwhile'));
        } else if (b.type === 'dowhile') {
            emit(ind, kw('repeat'));
            list(b.body, ind + 1);
            emit(ind, `${kw('while')} ${b.cond}`);
        } else if (b.type === 'for') {
            emit(ind, `${kw('for')} ${b.variable} ${kw('from')} ${b.start} ${kw('to')} ${b.end}${step(b)}`);
            list(b.body, ind + 1);
            emit(ind, kw('endfor'));
        }
    };
    // The record types first: RECORD Student / name: String / avg: Real / END RECORD.
    (Array.isArray(program.records) ? program.records : []).forEach((def) => {
        emit(0, `${kw('record')} ${def.name}`);
        (def.fields || []).forEach((f) => emit(1, `${f.name}: ${f.type}`));
        emit(0, kw('endrecord'));
        emit(0, '');
    });
    program.functions.forEach((f, i) => {
        if (i) {
            emit(0, '');
        }
        const brackets = (p) => {
            if (p.matrix) {
                return '[,]';
            }
            return p.array ? '[]' : '';
        };
        const params = f.params.map((p) => `${p.name}: ${p.type}${brackets(p)}`).join(', ');
        emit(0, `${kw('function')} ${f.name}(${params})${f.returnType ? `: ${f.returnType}` : ''}`);
        list(f.body, 1);
        emit(0, kw('endfunction'));
    });
    const text = `${out.join('\n')}\n`;
    return {text, owners};
};

// Pseudo-code first, then the programming languages.
export const languages = ['pseudo', ...Object.keys(LANGS), ...Object.keys(TYPED)];
export const languageLabels = Object.fromEntries([...Object.entries(LANGS), ...Object.entries(TYPED)]
    .map(([k, l]) => [k, l.label]));
// The name of pseudo-code is in the language of the user (read when the list is drawn).
Object.defineProperty(languageLabels, 'pseudo', {enumerable: true, get: () => t('pseudocode')});
/**
 * The language the code panel shows first: the one the teacher chose for the diagram, else the last one this browser
 * chose for a new diagram, else Python.
 *
 * @param {Object} program algorithm (its codeLang)
 * @returns {string}
 */
export const defaultLanguage = (program) => {
    if (program && languages.includes(program.codeLang)) {
        return program.codeLang;
    }
    try {
        const last = window.localStorage.getItem('tiny_algorithm_codelang');
        if (languages.includes(last)) {
            return last;
        }
    } catch (e) {
        // No storage: Python.
    }
    return 'python';
};

export const extensionOf = (lang) => (lang === 'pseudo' ? 'txt' : (own(LANGS, lang) || TYPED[lang]).ext);

/**
 * Is a Declare block a matrix (it has two sizes)?
 *
 * @param {Object} b declare block
 * @returns {boolean}
 */
export const isMatrix = (b) => Boolean(String(b.size || '').trim() && String(b.size2 || '').trim());

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
        case 'idx': return n.index2 ? `${n.name}[${unparse(n.index)}, ${unparse(n.index2)}]` : `${n.name}[${unparse(n.index)}]`;
        case 'un': return `${n.op}(${unparse(n.e)})`;
        case 'call': return `${n.name}(${n.args.map(unparse).join(', ')})`;
        case 'bin': return `(${unparse(n.l)} ${n.op} ${unparse(n.r)})`;
        default: return '';
    }
}
