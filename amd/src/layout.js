/**
 * Flowchart layout: converts a statement list into drawing primitives.
 *
 * Primitives: {t:'shape', shape, x, y, w, h, text, id}, {t:'line', pts:[[x,y],...], label},
 * {t:'slot', x, y, list, index}. All coordinates are absolute (the y axis points down).
 *
 * @module tiny_algorithm/layout
 */

export const G = 28; // Vertical gap (arrow length) between blocks.
const CHAR_W = 7.6;
const BOX_H = 40;
const DIAMOND_H = 56;
const MARGIN = 24;

export const labelOf = (b) => {
    switch (b.type) {
        case 'declare': return `${b.varType} ${b.name}${String(b.size || '').trim() ? `[${b.size}]` : ''}`;
        case 'assign': return `${b.target} = ${b.expr}`;
        case 'input': return `Input ${b.target}`;
        case 'output': return `Output ${b.expr}`;
        case 'if':
        case 'while':
        case 'dowhile': return b.cond;
        case 'for': return `${b.variable} = ${b.start} to ${b.end}${String(b.step || '1').trim() === '1' ? '' : ` step ${b.step}`}`;
        case 'call': return `Call ${b.expr}`;
        case 'return': return `Return ${b.expr || ''}`.trim();
        case 'comment': return b.text;
        default: return b.type;
    }
};

const textW = (s) => Math.ceil(String(s).length * CHAR_W);

const LINE_H = 16;
const WRAP_CHARS = 44;

/**
 * Split text into lines: keep explicit line breaks and wrap long lines at word boundaries.
 *
 * @param {string} text text to wrap
 * @param {number} max maximum characters per line
 */
export const wrapText = (text, max = WRAP_CHARS) => {
    const out = [];
    for (const para of String(text).split(/\r?\n/)) {
        let line = '';
        for (const word of para.split(/\s+/).filter(Boolean)) {
            if (line && line.length + 1 + word.length > max) {
                out.push(line);
                line = word;
            } else {
                line = line ? `${line} ${word}` : word;
            }
        }
        out.push(line);
    }
    return out.length ? out : [''];
};

/**
 * Text lines drawn inside a block: comments wrap, all other blocks use a single line.
 *
 * @param {Object} b block
 */
export const linesOf = (b) => (b.type === 'comment' ? wrapText(b.text) : [labelOf(b)]);

const shapeOf = (b) => ({
    declare: 'rect', assign: 'rect', call: 'rect', comment: 'note',
    input: 'para', output: 'para', 'if': 'diamond', 'while': 'diamond', dowhile: 'diamond', 'for': 'hexagon',
    'return': 'oval',
}[b.type]);

const sizeOf = (b) => {
    if (b.type === 'comment') {
        const lines = linesOf(b);
        return {
            w: Math.max(100, Math.max(...lines.map(textW)) + 32),
            h: Math.max(BOX_H, lines.length * LINE_H + 20),
        };
    }
    const shape = shapeOf(b);
    const tw = textW(labelOf(b));
    switch (shape) {
        case 'diamond': return {w: Math.max(120, tw + 70), h: DIAMOND_H};
        case 'hexagon': return {w: Math.max(120, tw + 50), h: BOX_H};
        case 'para': return {w: Math.max(110, tw + 54), h: BOX_H};
        default: return {w: Math.max(100, tw + 32), h: BOX_H};
    }
};

const measureList = (list) => {
    let l = 0;
    let r = 0;
    let h = G;
    for (const b of list) {
        const m = measureBlock(b);
        l = Math.max(l, m.l);
        r = Math.max(r, m.r);
        h += m.h + G;
    }
    return {l, r, h};
};

/**
 * Measure the left/right extent and height of a block.
 *
 * @param {Object} b block
 */
function measureBlock(b) {
    const s = sizeOf(b);
    switch (b.type) {
        case 'if': {
            const t = measureList(b.then);
            const e = measureList(b.else);
            const dT = Math.max(t.r + G + 8, s.w / 2);
            const dE = Math.max(e.l + G + 8, s.w / 2);
            return {
                l: Math.max(dT + t.l, s.w / 2),
                r: Math.max(dE + e.r, s.w / 2),
                h: s.h / 2 + Math.max(t.h, e.h),
                dT, dE, t, e, s,
            };
        }
        case 'while':
        case 'for': {
            const m = measureList(b.body);
            return {l: Math.max(m.l, s.w / 2) + G, r: Math.max(m.r, s.w / 2) + G, h: s.h + m.h + G, m, s};
        }
        case 'dowhile': {
            const m = measureList(b.body);
            return {l: Math.max(m.l, s.w / 2), r: Math.max(m.r, s.w / 2) + G, h: m.h + s.h, m, s};
        }
        default:
            return {l: s.w / 2, r: s.w / 2, h: s.h, s};
    }
}

const shape = (out, b, cx, y, s) => out.push({
    t: 'shape', shape: shapeOf(b), x: cx - s.w / 2, y, w: s.w, h: s.h, text: labelOf(b), lines: linesOf(b), id: b.id, type: b.type,
});

const drawList = (out, list, cx, y) => {
    let cy = y;
    list.forEach((b, i) => {
        out.push({t: 'line', pts: [[cx, cy], [cx, cy + G]]});
        out.push({t: 'slot', x: cx, y: cy + G / 2, list, index: i});
        cy += G;
        cy += drawBlock(out, b, cx, cy);
    });
    out.push({t: 'line', pts: [[cx, cy], [cx, cy + G]]});
    out.push({t: 'slot', x: cx, y: cy + G / 2, list, index: list.length});
    return cy + G - y;
};

/**
 * Draw a block and return the y below it.
 *
 * @param {Array} out SVG fragments collected so far
 * @param {Object} b block
 * @param {number} cx centre x
 * @param {number} y top y
 */
function drawBlock(out, b, cx, y) {
    const m = measureBlock(b);
    const s = m.s;
    switch (b.type) {
        case 'if': {
            shape(out, b, cx, y, s);
            const tAxis = cx - m.dT;
            const eAxis = cx + m.dE;
            const my = y + s.h / 2;
            const end = y + m.h;
            out.push({t: 'line', pts: [[cx - s.w / 2, my], [tAxis, my]], label: {text: 'T', x: cx - s.w / 2 - 12, y: my - 6}});
            out.push({t: 'line', pts: [[cx + s.w / 2, my], [eAxis, my]], label: {text: 'F', x: cx + s.w / 2 + 12, y: my - 6}});
            const th = drawList(out, b.then, tAxis, my);
            const eh = drawList(out, b.else, eAxis, my);
            out.push({t: 'line', pts: [[tAxis, my + th], [tAxis, end], [eAxis, end]]});
            out.push({t: 'line', pts: [[eAxis, my + eh], [eAxis, end]]});
            return m.h;
        }
        case 'while':
        case 'for': {
            shape(out, b, cx, y, s);
            const bodyTop = y + s.h;
            const bh = drawList(out, b.body, cx, bodyTop);
            const xl = cx - m.l;
            const xr = cx + m.r;
            const my = y + s.h / 2;
            const bodyBottom = bodyTop + bh;
            const end = bodyBottom + G;
            out.push({t: 'line', pts: [[cx, y + s.h], [cx, bodyTop]], label: {text: 'T', x: cx + 10, y: y + s.h + 10}});
            out.push({t: 'line', pts: [[cx, bodyBottom], [xl, bodyBottom], [xl, my], [cx - s.w / 2, my]]});
            out.push({t: 'line', pts: [[cx + s.w / 2, my], [xr, my], [xr, end], [cx, end]],
                label: {text: 'F', x: cx + s.w / 2 + 12, y: my - 6}});
            return m.h;
        }
        case 'dowhile': {
            const bh = drawList(out, b.body, cx, y);
            const dy = y + bh;
            shape(out, b, cx, dy, s);
            const xr = cx + m.r;
            out.push({t: 'line', pts: [[cx + s.w / 2, dy + s.h / 2], [xr, dy + s.h / 2], [xr, y], [cx, y]],
                label: {text: 'T', x: cx + s.w / 2 + 12, y: dy + s.h / 2 - 6}});
            return m.h;
        }
        default:
            shape(out, b, cx, y, s);
            return m.h;
    }
}

/**
 * Layout one function.
 *
 * @param {object} fn function {name, params, body}
 * @returns {{items: Array, width: number, height: number}}
 */
export const layoutFunction = (fn) => {
    const m = measureList(fn.body);
    const cx = MARGIN + Math.max(m.l, 60);
    const items = [];
    const ovalH = 36;
    const head = `${fn.name}(${fn.params.map((p) => p.name).join(', ')})`;
    items.push({t: 'shape', shape: 'oval', x: cx - 50, y: MARGIN, w: 100, h: ovalH, text: head, id: 'start', type: 'start'});
    const y0 = MARGIN + ovalH;
    const lh = drawList(items, fn.body, cx, y0);
    const yEnd = y0 + lh;
    items.push({t: 'shape', shape: 'oval', x: cx - 40, y: yEnd, w: 80, h: ovalH, text: 'End', id: 'end', type: 'end'});
    return {items, width: cx + Math.max(m.r, 60) + MARGIN, height: yEnd + ovalH + MARGIN};
};
