/**
 * SVG renderer for layout primitives.
 *
 * @module tiny_algorithm/render
 */
import {layoutFunction} from './layout';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COLORS = {
    stroke: '#1f2937',
    fill: {
        rect: '#dbeafe', para: '#dcfce7', diamond: '#fef3c7', hexagon: '#fae8ff', oval: '#e5e7eb', note: '#fff7ed',
    },
};

const shapeSvg = (it) => {
    const {x, y, w, h} = it;
    const fill = COLORS.fill[it.shape] || '#fff';
    const attrs = `fill="${fill}" stroke="${COLORS.stroke}" stroke-width="1.5"`;
    let body;
    switch (it.shape) {
        case 'oval':
            body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${attrs}/>`;
            break;
        case 'para':
            body = `<polygon points="${x + 14},${y} ${x + w},${y} ${x + w - 14},${y + h} ${x},${y + h}" ${attrs}/>`;
            break;
        case 'diamond':
            body = `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${attrs}/>`;
            break;
        case 'hexagon':
            body = `<polygon points="${x + 16},${y} ${x + w - 16},${y} ${x + w},${y + h / 2} ${x + w - 16},${y + h} ` +
                `${x + 16},${y + h} ${x},${y + h / 2}" ${attrs}/>`;
            break;
        case 'note':
            body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs} stroke-dasharray="5 3"/>`;
            break;
        default:
            body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs}/>`;
    }
    const text = `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" ` +
        `font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#111827">${esc(it.text)}</text>`;
    return `<g class="alg-node" data-id="${esc(it.id)}">${body}${text}</g>`;
};

const lineSvg = (it) => {
    const d = it.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
    let s = `<path d="${d}" fill="none" stroke="${COLORS.stroke}" stroke-width="1.5"/>`;
    if (it.label) {
        s += `<text x="${it.label.x}" y="${it.label.y}" text-anchor="middle" font-size="11" ` +
            `font-family="Segoe UI, Arial, sans-serif" fill="#374151">${esc(it.label.text)}</text>`;
    }
    return s;
};

/**
 * Render a function to SVG markup.
 *
 * @param {object} fn function to draw
 * @param {object} [opts]
 * @param {boolean} [opts.editable] include insertion slots ("+" handles)
 * @returns {{svg: string, slots: Array, width: number, height: number}}
 */
export const renderFunction = (fn, {editable = false} = {}) => {
    const {items, width, height} = layoutFunction(fn);
    const slots = [];
    let body = '';
    for (const it of items) {
        if (it.t === 'line') {
            body += lineSvg(it);
        }
    }
    for (const it of items) {
        if (it.t === 'shape') {
            body += shapeSvg(it);
        } else if (it.t === 'slot' && editable) {
            slots.push(it);
            body += `<g class="alg-slot" data-slot="${slots.length - 1}" tabindex="0" role="button" aria-label="Insert block">` +
                `<circle cx="${it.x}" cy="${it.y}" r="8" fill="#fff" stroke="#6b7280" stroke-width="1"/>` +
                `<path d="M${it.x - 4},${it.y} h8 M${it.x},${it.y - 4} v8" stroke="#6b7280" stroke-width="1.5"/></g>`;
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
        `viewBox="0 0 ${width} ${height}">${body}</svg>`;
    return {svg, slots, width, height};
};

const toBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    bytes.forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return btoa(bin);
};

/**
 * Render every function of the program stacked vertically into one static SVG.
 * The serialized model is embedded in <metadata> so the image alone can be re-opened for editing.
 *
 * @param {object} program
 * @returns {string} SVG markup
 */
export const renderProgram = (program) => {
    let y = 0;
    let width = 0;
    let body = '';
    for (const fn of program.functions) {
        const r = renderFunction(fn);
        body += `<g transform="translate(0,${y})">${r.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`;
        y += r.height;
        width = Math.max(width, r.width);
    }
    const meta = toBase64(JSON.stringify(program));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}">` +
        `<metadata id="algorithm-model">${meta}</metadata><rect width="${width}" height="${y}" fill="#ffffff"/>${body}</svg>`;
};

/**
 * Extract the model embedded by renderProgram from SVG text (or null).
 *
 * @param {string} svgText
 * @returns {object|null}
 */
export const extractModel = (svgText) => {
    const m = /<metadata id="algorithm-model">([A-Za-z0-9+/=]+)<\/metadata>/.exec(svgText);
    if (!m) {
        return null;
    }
    const bin = atob(m[1]);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
};
