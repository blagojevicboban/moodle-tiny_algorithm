/**
 * Flowgorithm (.fprg) import and export.
 *
 * Uses a tiny built-in XML reader so it works identically in browsers and Node.
 *
 * @module tiny_algorithm/flowgorithm
 */
import {createBlock, createProgram} from './model';

const ENTITIES = {'&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': '\''};
const unescapeXml = (s) => s.replace(
    /&(lt|gt|amp|quot|apos);|&#(\d+);/g, (m, n, d) => (d ? String.fromCharCode(Number(d)) : ENTITIES[m]));
const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Parse XML into {name, attrs, children}.
 *
 * @param {string} text
 * @returns {object} root element
 */
export const parseXml = (text) => {
    const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
    const attrRe = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    const stack = [];
    let root = null;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (!m[2]) {
            continue;
        }
        if (m[1]) {
            stack.pop();
            continue;
        }
        const attrs = {};
        let a;
        attrRe.lastIndex = 0;
        while ((a = attrRe.exec(m[3])) !== null) {
            attrs[a[1]] = unescapeXml(a[2] !== undefined ? a[2] : a[3]);
        }
        const el = {name: m[2], attrs, children: []};
        if (stack.length) {
            stack[stack.length - 1].children.push(el);
        } else {
            root = el;
        }
        if (!m[4]) {
            stack.push(el);
        }
    }
    if (!root) {
        throw new Error('Not a valid XML document');
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
                warn(warnings, `Unsupported element <${e.name}> was skipped`);
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
        throw new Error('Not a Flowgorithm file');
    }
    const warnings = [];
    const program = createProgram();
    const nameAttr = child(root, 'attributes') && child(root, 'attributes').children.find((c) => c.attrs.name === 'name');
    program.name = (nameAttr && nameAttr.attrs.value) || 'Program';
    program.functions = root.children.filter((c) => c.name === 'function').map((f) => ({
        name: f.attrs.name,
        params: ((child(f, 'parameters') || {children: []}).children).map((p) => ({
            name: p.attrs.name, type: p.attrs.type || 'Integer', array: isTrue(p.attrs.array),
        })),
        returnType: !f.attrs.type || f.attrs.type === 'None' ? null : f.attrs.type,
        body: importList(child(f, 'body'), warnings),
    }));
    if (!program.functions.length) {
        throw new Error('No functions found');
    }
    return {program, warnings};
};

const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join('');

// eslint-disable-next-line complexity
const exportList = (list, ind) => {
    const pad = '  '.repeat(ind);
    let out = '';
    for (const b of list) {
        switch (b.type) {
            case 'declare': {
                const arr = String(b.size || '').trim() !== '';
                out += `${pad}<declare${attrs({
                    name: b.name, type: b.varType, array: arr ? 'True' : 'False', size: arr ? b.size : '',
                })}/>\n`;
                break;
            }
            case 'assign': out += `${pad}<assign${attrs({variable: b.target, expression: b.expr})}/>\n`; break;
            case 'input': out += `${pad}<input${attrs({variable: b.target})}/>\n`; break;
            case 'output':
                out += `${pad}<output${attrs({expression: b.expr, newline: b.newline === false ? 'False' : 'True'})}/>\n`;
                break;
            case 'call': out += `${pad}<call${attrs({expression: b.expr})}/>\n`; break;
            case 'return': out += `${pad}<return${attrs({expression: b.expr || ''})}/>\n`; break;
            case 'comment': out += `${pad}<comment${attrs({text: b.text})}/>\n`; break;
            case 'if':
                out += `${pad}<if${attrs({expression: b.cond})}>\n${pad}  <then>\n${exportList(b.then, ind + 2)}${pad}  </then>\n` +
                    `${pad}  <else>\n${exportList(b.else, ind + 2)}${pad}  </else>\n${pad}</if>\n`;
                break;
            case 'while':
            case 'dowhile': {
                const tag = b.type === 'while' ? 'while' : 'do';
                out += `${pad}<${tag}${attrs({expression: b.cond})}>\n${exportList(b.body, ind + 1)}${pad}</${tag}>\n`;
                break;
            }
            case 'for': {
                const step = String(b.step || '1').trim();
                const dec = step.startsWith('-');
                out += `${pad}<for${attrs({variable: b.variable, start: b.start, end: b.end, direction: dec ? 'dec' : 'inc',
                    step: dec ? step.slice(1) : step})}>\n${exportList(b.body, ind + 1)}${pad}</for>\n`;
                break;
            }
            default: break;
        }
    }
    return out;
};

export const exportFprg = (program) => {
    let out = '<?xml version="1.0"?>\n<flowgorithm fileversion="3.0">\n  <attributes>\n' +
        `    <attribute name="name" value="${escapeXml(program.name || 'Program')}"/>\n  </attributes>\n`;
    for (const f of program.functions) {
        out += `  <function${attrs({name: f.name, type: f.returnType || 'None', variable: ''})}>\n    <parameters>\n` +
            f.params.map(
                (p) => `      <parameter${attrs({name: p.name, type: p.type, array: p.array ? 'True' : 'False'})}/>\n`).join('') +
            `    </parameters>\n    <body>\n${exportList(f.body, 3)}    </body>\n  </function>\n`;
    }
    return `${out}</flowgorithm>\n`;
};
