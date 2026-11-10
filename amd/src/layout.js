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
 * Flowchart layout: converts a statement list into drawing primitives.
 *
 * Primitives: {t:'shape', shape, x, y, w, h, text, id}, {t:'line', pts:[[x,y],...], label, arrow},
 * {t:'slot', x, y, list, index}. All coordinates are absolute (the y axis points down). A line with arrow
 * ends in an arrowhead: it enters a block or joins another line there. A line with branch ('<id>:T' or '<id>:F')
 * leaves a decision; the editor marks it while the algorithm runs.
 *
 * @module tiny_algorithm/layout
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const G = 28; // Vertical gap (arrow length) between blocks.
const CHAR_W = 7.6;
const BOX_H = 40;
const DIAMOND_H = 56;
const MARGIN = 24;
// Distance of the line of a jump (Break, Continue, an early Return) from what it passes.
const JUMP = 14;

// Labels that are only a word and one field of the block.
const SIMPLE_LABELS = {
    input: (b) => `Input ${b.target}`, output: (b) => `Output ${b.expr}`, call: (b) => `Call ${b.expr}`,
    'break': () => 'Break', 'continue': () => 'Continue', comment: (b) => b.text,
    forward: (b) => `Forward ${b.distance}${b.pen === 'up' ? ' (pen up)' : ''}`,
    turn: (b) => `Turn ${b.rotate === 'left' ? 'left' : 'right'} ${b.angle}`,
    pen: (b) => `Pen ${b.color}`, home: () => 'Home', clear: () => 'Clear',
};

export const labelOf = (b) => {
    if (Object.hasOwn(SIMPLE_LABELS, b.type)) {
        return SIMPLE_LABELS[b.type](b);
    }
    switch (b.type) {
        case 'declare': {
            const size = String(b.size || '').trim();
            const size2 = size ? String(b.size2 || '').trim() : '';
            return `${b.varType} ${b.name}${size ? `[${size}${size2 ? `, ${size2}` : ''}]` : ''}`;
        }
        case 'assign': return `${b.target} = ${b.expr}`;
        case 'if':
        case 'while':
        case 'dowhile': return b.cond;
        case 'for': return `${b.variable} = ${b.start} to ${b.end}${String(b.step || '1').trim() === '1' ? '' : ` step ${b.step}`}`;
        case 'return': return `Return ${b.expr || ''}`.trim();
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
    'return': 'oval', 'break': 'oval', 'continue': 'oval',
    forward: 'turtle', turn: 'turtle', pen: 'turtle', home: 'turtle', clear: 'turtle',
}[b.type]);

/**
 * Break and Continue blocks of a loop body (also inside If blocks, not inside other loops).
 *
 * @param {Array} list blocks
 * @returns {{brk: boolean, cont: boolean}}
 */
const jumpsOf = (list) => {
    const found = {brk: false, cont: false};
    const visit = (blocks) => (blocks || []).forEach((b) => {
        found.brk = found.brk || b.type === 'break';
        found.cont = found.cont || b.type === 'continue';
        if (b.type === 'if') {
            visit(b.then);
            visit(b.else);
        }
    });
    visit(list);
    return found;
};

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
            // Continue goes round the left side to the condition, Break round the right side to the way out.
            const m = measureList(b.body);
            const j = jumpsOf(b.body);
            return {l: Math.max(m.l, s.w / 2) + (j.cont ? JUMP : 0), r: Math.max(m.r, s.w / 2) + G + (j.brk ? JUMP : 0),
                h: m.h + s.h, m, s, j};
        }
        default:
            return {l: s.w / 2, r: s.w / 2, h: s.h, s};
    }
}

// Mark the lines from index from on (up to, not including, index to) as the branch of a decision.
const tagBranch = (out, from, to, key) => out.slice(from, to).forEach((it) => {
    if (it.t === 'line') {
        it.branch = key;
    }
});

const shape = (out, b, cx, y, s, ctx = {}) => out.push({
    t: 'shape', shape: shapeOf(b), x: cx - s.w / 2, y, w: s.w, h: s.h, text: labelOf(b), lines: linesOf(b), id: b.id, type: b.type,
    faded: Boolean(ctx.faded), note: typeof b.note === 'string' ? b.note.trim() : '',
});

// The last line gets an arrow only when a block follows the list (endArrow); otherwise it runs into another line.
// The line below a Do...While is the way out of the loop: it carries the F of that condition.
const lineAfter = (prev, cx, cy, arrow) => {
    const line = {t: 'line', pts: [[cx, cy], [cx, cy + G]], arrow};
    if (prev && prev.type === 'dowhile') {
        line.branch = `${prev.id}:F`;
        line.label = {text: 'F', x: cx + 10, y: cy + 10};
    }
    return line;
};

/**
 * Draw a list of blocks with the lines and "+" signs between them; returns its height.
 *
 * @param {Array} out SVG fragments collected so far
 * @param {Array} list blocks
 * @param {number} cx centre x
 * @param {number} y top y
 * @param {boolean} endArrow the last line ends in an arrow (a block follows)
 * @param {Object} ctx loop: jumps of the innermost loop, fn: early returns, tail: the function ends after this list,
 *     faded: the blocks can never run
 * @returns {number}
 */
const drawList = (out, list, cx, y, endArrow = false, ctx = {}) => {
    let cy = y;
    let jumped = Boolean(ctx.faded);
    list.forEach((b, i) => {
        out.push(lineAfter(list[i - 1], cx, cy, true));
        out.push({t: 'slot', x: cx, y: cy + G / 2, list, index: i, inLoop: Boolean(ctx.loop)});
        cy += G;
        cy += drawBlock(out, b, cx, cy, {...ctx, faded: jumped, last: i === list.length - 1});
        // Blocks after a Break, Continue or Return in the same list are never reached.
        jumped = jumped || ['break', 'continue', 'return'].includes(b.type);
    });
    out.push(lineAfter(list[list.length - 1], cx, cy, endArrow));
    out.push({t: 'slot', x: cx, y: cy + G / 2, list, index: list.length, inLoop: Boolean(ctx.loop)});
    return cy + G - y;
};

/**
 * A jump (Break, Continue, an early Return) waits for the place it goes to; finish() draws it from there.
 *
 * @param {Array} jumps jumps of a loop or function
 * @param {Array} out SVG fragments
 * @param {Function} route (jump) => points from the jump to its target
 */
const finishJumps = (jumps, out, route) => jumps.forEach((j) => out.push({t: 'line', pts: route(j), arrow: true,
    branch: `${j.id}:T`, jump: true}));

/**
 * Draw a block and return the y below it.
 *
 * @param {Array} out SVG fragments collected so far
 * @param {Object} b block
 * @param {number} cx centre x
 * @param {number} y top y
 * @param {Object} ctx see drawList
 */
function drawBlock(out, b, cx, y, ctx = {}) {
    const m = measureBlock(b);
    const s = m.s;
    // The If continues where its list continues; a loop body never ends the function.
    const tail = Boolean(ctx.tail && ctx.last);
    switch (b.type) {
        case 'if': {
            shape(out, b, cx, y, s, ctx);
            const tAxis = cx - m.dT;
            const eAxis = cx + m.dE;
            const my = y + s.h / 2;
            const end = y + m.h;
            out.push({t: 'line', pts: [[cx - s.w / 2, my], [tAxis, my]], label: {text: 'T', x: cx - s.w / 2 - 12, y: my - 6},
                branch: `${b.id}:T`});
            out.push({t: 'line', pts: [[cx + s.w / 2, my], [eAxis, my]], label: {text: 'F', x: cx + s.w / 2 + 12, y: my - 6},
                branch: `${b.id}:F`});
            // The first line of each branch belongs to it too.
            let from = out.length;
            const inner = {...ctx, tail};
            const th = drawList(out, b.then, tAxis, my, false, inner);
            tagBranch(out, from, from + 1, `${b.id}:T`);
            from = out.length;
            const eh = drawList(out, b.else, eAxis, my, false, inner);
            tagBranch(out, from, from + 1, `${b.id}:F`);
            // Both branches run into the point below the condition.
            out.push({t: 'line', pts: [[tAxis, my + th], [tAxis, end], [cx, end]], arrow: true, branch: `${b.id}:T`});
            out.push({t: 'line', pts: [[eAxis, my + eh], [eAxis, end], [cx, end]], arrow: true, branch: `${b.id}:F`});
            return m.h;
        }
        case 'while':
        case 'for': {
            shape(out, b, cx, y, s, ctx);
            const bodyTop = y + s.h;
            const from = out.length;
            const loop = [];
            const bh = drawList(out, b.body, cx, bodyTop, false, {...ctx, loop, tail: false});
            tagBranch(out, from, from + 1, `${b.id}:T`);
            const xl = cx - m.l;
            const xr = cx + m.r;
            // Break runs into the way out on the right, Continue into the way back on the left.
            finishJumps(loop, out, (j) => [[j.x, j.y], [j.type === 'break' ? xr : xl, j.y]]);
            const my = y + s.h / 2;
            const bodyBottom = bodyTop + bh;
            const end = bodyBottom + G;
            out.push({t: 'line', pts: [[cx, y + s.h], [cx, bodyTop]], label: {text: 'T', x: cx + 10, y: y + s.h + 10},
                branch: `${b.id}:T`});
            out.push({t: 'line', pts: [[cx, bodyBottom], [xl, bodyBottom], [xl, my], [cx - s.w / 2, my]], arrow: true});
            out.push({t: 'line', pts: [[cx + s.w / 2, my], [xr, my], [xr, end], [cx, end]], arrow: true,
                label: {text: 'F', x: cx + s.w / 2 + 12, y: my - 6}, branch: `${b.id}:F`});
            return m.h;
        }
        case 'dowhile': {
            const loop = [];
            const bh = drawList(out, b.body, cx, y, true, {...ctx, loop, tail: false});
            const dy = y + bh;
            shape(out, b, cx, dy, s, ctx);
            const xr = cx + m.r - (m.j.brk ? JUMP : 0);
            const xb = cx + m.r;
            const xc = cx - m.l;
            finishJumps(loop, out, (j) => (j.type === 'break' ?
                [[j.x, j.y], [xb, j.y], [xb, dy + s.h + G / 2], [cx, dy + s.h + G / 2]] :
                [[j.x, j.y], [xc, j.y], [xc, dy + s.h / 2], [cx - s.w / 2, dy + s.h / 2]]));
            out.push({t: 'line', pts: [[cx + s.w / 2, dy + s.h / 2], [xr, dy + s.h / 2], [xr, y], [cx, y]], arrow: true,
                branch: `${b.id}:T`,
                label: {text: 'T', x: cx + s.w / 2 + 12, y: dy + s.h / 2 - 6}});
            return m.h;
        }
        default:
            shape(out, b, cx, y, s, ctx);
            if ((b.type === 'break' || b.type === 'continue') && ctx.loop) {
                const left = b.type === 'continue';
                ctx.loop.push({id: b.id, type: b.type, x: left ? cx - s.w / 2 : cx + s.w / 2, y: y + s.h / 2});
            } else if (b.type === 'return' && ctx.fn && !tail) {
                // A Return that is not the last step of the function jumps to End.
                ctx.fn.push({id: b.id, type: b.type, x: cx + s.w / 2, y: y + s.h / 2});
            }
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
    const returns = [];
    const lh = drawList(items, fn.body, cx, y0, true, {fn: returns, tail: true});
    const yEnd = y0 + lh;
    // Early returns go round the right side of the diagram into the line above End.
    const xr = cx + Math.max(m.r, 60) + JUMP;
    finishJumps(returns, items, (j) => [[j.x, j.y], [xr, j.y], [xr, yEnd - G / 2], [cx, yEnd - G / 2]]);
    items.push({t: 'shape', shape: 'oval', x: cx - 40, y: yEnd, w: 80, h: ovalH, text: 'End', id: 'end', type: 'end'});
    return {items, width: cx + Math.max(m.r, 60) + MARGIN + (returns.length ? JUMP : 0), height: yEnd + ovalH + MARGIN};
};
