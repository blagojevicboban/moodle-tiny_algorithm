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
 * Turtle graphics: the colours of the pen, the blocks that use the turtle and the drawing panel that shows the lines the
 * interpreter reports (events 'turtle'). The turtle starts at the centre (0, 0) and looks up; y goes up, as in Flowgorithm.
 *
 * @module     tiny_algorithm/turtle
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

/** The ten colours of Flowgorithm's Pen shape, in its order, and how they are drawn. */
export const PEN_COLORS = {
    black: '#111111', gray: '#808080', red: '#e32032', orange: '#f37221', yellow: '#f2c01e', green: '#30c07c',
    cyan: '#2ec0e0', blue: '#2080e0', purple: '#a060c0', brown: '#c06c40',
};

/** Blocks of turtle graphics. */
export const TURTLE_BLOCKS = ['forward', 'turn', 'pen', 'home', 'clear'];

/** Most lines the panel keeps (a longer drawing keeps its first lines and says so). */
export const MAX_LINES = 20000;

const NS = 'http://www.w3.org/2000/svg';

/**
 * Does a program use turtle graphics?
 *
 * @param {Object} program
 * @returns {boolean}
 */
export const usesTurtle = (program) => {
    const visit = (list) => (list || []).some((b) => TURTLE_BLOCKS.includes(b.type) ||
        ['then', 'else', 'body'].some((k) => visit(b[k])));
    return Boolean(program && program.functions && program.functions.some((f) => visit(f.body)));
};

const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    return e;
};

const round = (v) => Math.round(v * 100) / 100;

export class TurtleView {
    /**
     * @param {string|null} lang UI language code
     */
    constructor(lang = null) {
        this.lang = lang;
        this.svg = svgEl('svg', {'class': 'tiny_algorithm-turtle-svg', role: 'img', 'aria-label': t('turtle', null, lang)});
        this.lines = svgEl('g', {'stroke-width': 2, 'stroke-linecap': 'round'});
        this.marker = svgEl('polygon', {points: '0,-9 6,7 0,3 -6,7', 'class': 'tiny_algorithm-turtle-marker'});
        this.svg.append(this.lines, this.marker);
        this.note = document.createElement('p');
        this.note.className = 'tiny_algorithm-turtle-note';
        this.note.hidden = true;
        this.root = document.createElement('div');
        this.root.className = 'tiny_algorithm-turtle';
        this.root.append(this.svg, this.note);
        this.reset();
    }

    /** Clear the drawing and put the turtle home. */
    reset() {
        this.lines.replaceChildren();
        this.count = 0;
        this.bounds = {x1: -100, y1: -100, x2: 100, y2: 100};
        this.note.hidden = true;
        this.place({x: 0, y: 0, heading: 90});
    }

    /**
     * Show an event of the interpreter: a cleared screen, a line, the new place and direction of the turtle.
     *
     * @param {{clear: ?boolean, line: ?Object, x: number, y: number, heading: number, color: string}} ev
     */
    apply(ev) {
        if (ev.clear) {
            this.reset();
        }
        if (ev.line) {
            if (this.count < MAX_LINES) {
                const {x1, y1, x2, y2} = ev.line;
                this.lines.append(svgEl('line', {x1: round(x1), y1: round(-y1), x2: round(x2), y2: round(-y2),
                    stroke: PEN_COLORS[ev.line.color] || ev.line.color || '#111111'}));
                this.grow(x1, y1);
                this.grow(x2, y2);
            } else {
                this.note.textContent = t('turtlelimit', {max: String(MAX_LINES)}, this.lang);
                this.note.hidden = false;
            }
            this.count++;
        }
        this.grow(ev.x, ev.y);
        this.place(ev);
    }

    grow(x, y) {
        const b = this.bounds;
        b.x1 = Math.min(b.x1, x);
        b.y1 = Math.min(b.y1, y);
        b.x2 = Math.max(b.x2, x);
        b.y2 = Math.max(b.y2, y);
    }

    /**
     * Move the turtle mark and fit the view to the drawing.
     *
     * @param {{x: number, y: number, heading: number, color: ?string}} p
     */
    place(p) {
        // The mark points up at heading 90 (SVG rotates clockwise, the heading goes counter-clockwise).
        this.marker.setAttribute('transform', `translate(${round(p.x)},${round(-p.y)}) rotate(${round(90 - p.heading)})`);
        this.marker.setAttribute('fill', PEN_COLORS[p.color] || p.color || PEN_COLORS.black);
        const b = this.bounds;
        const pad = 20;
        this.svg.setAttribute('viewBox', `${round(b.x1 - pad)} ${round(-b.y2 - pad)} ${round(b.x2 - b.x1 + 2 * pad)} ` +
            `${round(b.y2 - b.y1 + 2 * pad)}`);
    }
}
