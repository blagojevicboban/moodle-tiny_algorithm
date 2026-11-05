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
 * Flowgorithm (.fprg) import and export.
 *
 * Uses a tiny built-in XML reader so it works identically in browsers and Node.
 *
 * @module tiny_algorithm/flowgorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {createBlock, createProgram, walk} from './model';
import {t} from './strings';

/** Largest file, deepest nesting and most elements the reader accepts. */
const MAX_TEXT = 2 * 1024 * 1024;
const MAX_DEPTH = 200;
const MAX_ELEMENTS = 20000;

const ENTITIES = {lt: '<', gt: '>', amp: '&', quot: '"', apos: '\''};

/**
 * A character given by its number (&#353; or &#x161;).
 *
 * @param {number} n code point
 * @returns {string}
 */
const codePoint = (n) => {
    if (!Number.isInteger(n) || n < 1 || n > 0x10FFFF || (n >= 0xD800 && n <= 0xDFFF)) {
        throw new Error(t('fprginvalid'));
    }
    return String.fromCodePoint(n);
};
const unescapeXml = (s) => s.replace(/&(lt|gt|amp|quot|apos);|&#(\d+);|&#[xX]([0-9a-fA-F]+);/g,
    (m, name, dec, hex) => (name ? ENTITIES[name] : codePoint(dec ? Number(dec) : parseInt(hex, 16))));
const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TAG = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/**
 * Index after the end of a declaration such as <!DOCTYPE ...> (which may have [...] inside).
 *
 * @param {string} text document
 * @param {number} from index of the "<!"
 * @returns {number}
 */
const skipDeclaration = (text, from) => {
    let depth = 0;
    for (let i = from + 2; i < text.length; i++) {
        if (text[i] === '[') {
            depth++;
        } else if (text[i] === ']') {
            depth--;
        } else if (text[i] === '>' && depth <= 0) {
            return i + 1;
        }
    }
    throw new Error(t('fprginvalid'));
};

/**
 * Index after the end of a comment, processing instruction or CDATA section starting at from.
 *
 * @param {string} text document
 * @param {number} from index of the "<"
 * @returns {number} -1 when there is none at from
 */
const skipSpecial = (text, from) => {
    for (const [open, close] of [['<!--', '-->'], ['<?', '?>'], ['<![CDATA[', ']]>']]) {
        if (text.startsWith(open, from)) {
            const end = text.indexOf(close, from + open.length);
            if (end < 0) {
                throw new Error(t('fprginvalid'));
            }
            return end + close.length;
        }
    }
    return text.startsWith('<!', from) ? skipDeclaration(text, from) : -1;
};

/**
 * Parse XML into {name, attrs, children}. Text between the tags is not kept (Flowgorithm keeps everything in
 * attributes). A closing tag must match the open one; the size, the depth and the number of elements are limited.
 *
 * @param {string} text
 * @returns {object} root element
 */
export const parseXml = (text) => {
    text = String(text);
    if (text.length > MAX_TEXT) {
        throw new Error(t('fprgtoolarge'));
    }
    const stack = [];
    let root = null;
    let count = 0;
    let i = 0;
    while ((i = text.indexOf('<', i)) >= 0) {
        const next = skipSpecial(text, i);
        if (next >= 0) {
            i = next;
            continue;
        }
        TAG.lastIndex = i;
        const m = TAG.exec(text);
        if (!m) {
            throw new Error(t('fprginvalid'));
        }
        i = TAG.lastIndex;
        if (m[1]) {
            const open = stack.pop();
            if (!open || open.name !== m[2]) {
                throw new Error(t('fprgmismatch', {name: m[2]}));
            }
            continue;
        }
        const attrs = {};
        for (const a of m[3].matchAll(ATTR)) {
            attrs[a[1]] = unescapeXml(a[2] !== undefined ? a[2] : a[3]);
        }
        const el = {name: m[2], attrs, children: []};
        if (++count > MAX_ELEMENTS) {
            throw new Error(t('fprgtoolarge'));
        }
        if (stack.length) {
            stack[stack.length - 1].children.push(el);
        } else if (!root) {
            root = el;
        } else {
            throw new Error(t('fprginvalid'));
        }
        if (!m[4]) {
            stack.push(el);
            if (stack.length > MAX_DEPTH) {
                throw new Error(t('fprgtoolarge'));
            }
        }
    }
    if (stack.length) {
        throw new Error(t('fprgmismatch', {name: stack[stack.length - 1].name}));
    }
    if (!root) {
        throw new Error(t('fprginvalid'));
    }
    return root;
};

const child = (el, name) => el.children.find((c) => c.name === name);
const isTrue = (v) => String(v).toLowerCase() === 'true';

const warn = (warnings, msg) => {
    if (!warnings.includes(msg)) {
        warnings.push(msg);
    }
};

const loopBody = (e, warnings) => (child(e, 'body') ? importList(child(e, 'body'), warnings) : importList(e, warnings));

// eslint-disable-next-line complexity
const importList = (el, warnings) => {
    const list = [];
    for (const e of el ? el.children : []) {
        const a = e.attrs;
        switch (e.name) {
            case 'declare':
                list.push(createBlock('declare', {
                    name: a.name, varType: a.type || 'Integer', size: isTrue(a.array) ? a.size || '' : '',
                }));
                break;
            case 'assign':
                list.push(createBlock('assign', {target: a.variable, expr: a.expression}));
                break;
            case 'input':
                list.push(createBlock('input', {target: a.variable}));
                break;
            case 'output':
                list.push(createBlock('output', {expr: a.expression, newline: a.newline === undefined ? true : isTrue(a.newline)}));
                break;
            case 'if':
                list.push(createBlock('if', {cond: a.expression, then: importList(child(e, 'then'), warnings),
                    'else': importList(child(e, 'else'), warnings)}));
                break;
            case 'while':
                list.push(createBlock('while', {cond: a.expression, body: loopBody(e, warnings)}));
                break;
            case 'do':
                list.push(createBlock('dowhile', {cond: a.expression, body: loopBody(e, warnings)}));
                break;
            case 'for': {
                const step = String(a.step || '1');
                list.push(createBlock('for', {variable: a.variable, start: a.start, end: a.end,
                    step: a.direction === 'dec' ? `-${step}` : step, body: loopBody(e, warnings)}));
                break;
            }
            case 'call':
                list.push(createBlock('call', {expr: a.expression}));
                break;
            case 'return':
                list.push(createBlock('return', {expr: a.expression || ''}));
                break;
            case 'comment':
                list.push(createBlock('comment', {text: a.text || ''}));
                break;
            default:
                warn(warnings, t('fprgskipped', {name: e.name}));
        }
    }
    return list;
};

/**
 * Import a .fprg document.
 *
 * @param {string} text
 * @returns {{program: object, warnings: string[]}}
 */
export const importFprg = (text) => {
    const root = parseXml(text);
    if (root.name !== 'flowgorithm') {
        throw new Error(t('fprgnotflowgorithm'));
    }
    const warnings = [];
    const program = createProgram();
    const nameAttr = child(root, 'attributes') && child(root, 'attributes').children.find((c) => c.attrs.name === 'name');
    program.name = (nameAttr && nameAttr.attrs.value) || 'Program';
    program.functions = root.children.filter((c) => c.name === 'function').map((f) => {
        const returnType = !f.attrs.type || f.attrs.type === 'None' ? null : f.attrs.type;
        const body = importList(child(f, 'body'), warnings);
        // A Flowgorithm function returns the value of its return variable when it ends.
        const variable = String(f.attrs.variable || '').trim();
        if (returnType && variable && !(body.length && body[body.length - 1].type === 'return')) {
            body.push(createBlock('return', {expr: variable}));
        }
        return {
            name: f.attrs.name,
            params: ((child(f, 'parameters') || {children: []}).children).map((p) => ({
                name: p.attrs.name, type: p.attrs.type || 'Integer', array: isTrue(p.attrs.array),
            })),
            returnType,
            body,
        };
    });
    if (!program.functions.length) {
        throw new Error(t('fprgnofunctions'));
    }
    return {program, warnings};
};

const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join('');

// Our functions that Flowgorithm has under another name, and those it does not have.
const RENAMED = [[/\bToInt\s*\(/gi, 'ToInteger('], [/\bSign\s*\(/gi, 'Sgn('], [/\bPi\s*\(\s*\)/gi, 'Pi']];
const MISSING = /\b(Floor|Ceiling|Round|Exp|IsNumeric)\s*\(/gi;

/**
 * An expression as Flowgorithm writes it; functions Flowgorithm does not have are collected.
 *
 * @param {*} expr expression
 * @param {Set<string>} missing receives the names of functions Flowgorithm does not have
 * @returns {string}
 */
const fprgExpr = (expr, missing) => {
    let text = String(expr ?? '');
    RENAMED.forEach(([re, to]) => {
        text = text.replace(re, to);
    });
    for (const m of text.matchAll(MISSING)) {
        missing.add(m[1]);
    }
    return text;
};

// eslint-disable-next-line complexity
const exportList = (list, ind, ctx) => {
    const pad = '  '.repeat(ind);
    const x = (e) => fprgExpr(e, ctx.missing);
    let out = '';
    for (const b of list) {
        // Flowgorithm has no comments on blocks: the comment becomes a Comment block before it.
        if (typeof b.note === 'string' && b.note.trim()) {
            out += `${pad}<comment${attrs({text: b.note.trim()})}/>\n`;
        }
        switch (b.type) {
            case 'declare': {
                const arr = String(b.size || '').trim() !== '';
                out += `${pad}<declare${attrs({
                    name: b.name, type: b.varType, array: arr ? 'True' : 'False', size: arr ? x(b.size) : '',
                })}/>\n`;
                break;
            }
            case 'assign': out += `${pad}<assign${attrs({variable: b.target, expression: x(b.expr)})}/>\n`; break;
            case 'input': out += `${pad}<input${attrs({variable: b.target})}/>\n`; break;
            case 'output':
                out += `${pad}<output${attrs({expression: x(b.expr), newline: b.newline === false ? 'False' : 'True'})}/>\n`;
                break;
            case 'call': out += `${pad}<call${attrs({expression: x(b.expr)})}/>\n`; break;
            case 'return':
                // Flowgorithm has no Return block: the value goes into the return variable of the function.
                if (ctx.variable && String(b.expr || '').trim() !== '') {
                    out += `${pad}<assign${attrs({variable: ctx.variable, expression: x(b.expr)})}/>\n`;
                }
                break;
            case 'comment': out += `${pad}<comment${attrs({text: b.text})}/>\n`; break;
            case 'if':
                out += `${pad}<if${attrs({expression: x(b.cond)})}>\n${pad}  <then>\n${exportList(b.then, ind + 2, ctx)}` +
                    `${pad}  </then>\n${pad}  <else>\n${exportList(b.else, ind + 2, ctx)}${pad}  </else>\n${pad}</if>\n`;
                break;
            case 'while':
            case 'dowhile': {
                const tag = b.type === 'while' ? 'while' : 'do';
                out += `${pad}<${tag}${attrs({expression: x(b.cond)})}>\n${exportList(b.body, ind + 1, ctx)}${pad}</${tag}>\n`;
                break;
            }
            case 'for': {
                const step = String(b.step || '1').trim();
                const dec = step.startsWith('-');
                out += `${pad}<for${attrs({variable: b.variable, start: x(b.start), end: x(b.end),
                    direction: dec ? 'dec' : 'inc', step: dec ? step.slice(1) : step})}>\n` +
                    `${exportList(b.body, ind + 1, ctx)}${pad}</for>\n`;
                break;
            }
            case 'break':
            case 'continue':
                ctx.loopJump = true;
                break;
            default: break;
        }
    }
    return out;
};

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * How a function returns its value in Flowgorithm: the name of the return variable, a Declare to add for it, and
 * the body to write.
 *
 * @param {Object} f function
 * @returns {{variable: string, declare: (Object|null), body: Object[], early: boolean}} early: a Return before the end
 */
const returnPlan = (f) => {
    const returns = [];
    walk(f.body, (b) => {
        if (b.type === 'return') {
            returns.push(b);
        }
    });
    const last = f.body[f.body.length - 1];
    const endsWithReturn = Boolean(last && last.type === 'return');
    const early = returns.length > (endsWithReturn ? 1 : 0);
    if (!f.returnType) {
        return {variable: '', declare: null, body: f.body, early};
    }
    const declared = new Set(f.params.map((p) => p.name.toLowerCase()));
    walk(f.body, (b) => {
        if (b.type === 'declare') {
            String(b.name).split(',').forEach((n) => declared.add(n.trim().toLowerCase()));
        }
    });
    const value = endsWithReturn ? String(last.expr || '').trim() : '';
    if (!early && NAME.test(value) && declared.has(value.toLowerCase())) {
        return {variable: value, declare: null, body: f.body.slice(0, -1), early};
    }
    let variable = 'Result';
    for (let k = 2; declared.has(variable.toLowerCase()); k++) {
        variable = `Result${k}`;
    }
    return {variable, declare: createBlock('declare', {name: variable, varType: f.returnType}), body: f.body, early};
};

/**
 * Export a .fprg document.
 *
 * @param {Object} program algorithm
 * @param {string[]} [warnings] receives what Flowgorithm cannot express exactly
 * @returns {string}
 */
export const exportFprg = (program, warnings = []) => {
    let out = '<?xml version="1.0"?>\n<flowgorithm fileversion="3.0">\n  <attributes>\n' +
        `    <attribute name="name" value="${escapeXml(program.name || 'Program')}"/>\n  </attributes>\n`;
    const missing = new Set();
    let loopJump = false;
    for (const f of program.functions) {
        const plan = returnPlan(f);
        if (plan.early) {
            warn(warnings, t('fprgreturn', {name: f.name}));
        }
        const ctx = {missing, variable: plan.variable, loopJump: false};
        const body = (plan.declare ? exportList([plan.declare], 3, ctx) : '') + exportList(plan.body, 3, ctx);
        loopJump = loopJump || ctx.loopJump;
        out += `  <function${attrs({name: f.name, type: f.returnType || 'None', variable: plan.variable})}>\n` +
            '    <parameters>\n' +
            f.params.map(
                (p) => `      <parameter${attrs({name: p.name, type: p.type, array: p.array ? 'True' : 'False'})}/>\n`).join('') +
            `    </parameters>\n    <body>\n${body}    </body>\n  </function>\n`;
    }
    if (loopJump) {
        warn(warnings, t('fprgbreak'));
    }
    if (missing.size) {
        warn(warnings, t('fprgbuiltin', {names: [...missing].join(', ')}));
    }
    return `${out}</flowgorithm>\n`;
};
