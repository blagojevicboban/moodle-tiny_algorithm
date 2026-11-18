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
 * The call tree: every call of a function drawn as a node under the call that made it, while the algorithm runs or
 * steps. The running call is blue, the calls waiting for it light blue, a finished call shows the value it returned,
 * and a call made again with the same arguments (fib(2) in fib(5)) is amber, so repeated work is easy to see.
 *
 * @module tiny_algorithm/calltree
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

/** Most calls drawn as nodes; later calls are only counted. */
export const MAX_NODES = 200;

/** Height of one level of the tree and of a node, in SVG units. */
const LEVEL = 56;
const NODE_H = 24;

/** Width of one character of a label, and the space around a node, in SVG units. */
const CHAR_W = 7.2;
const GAP = 10;

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Does a program have functions besides the main one (only then the call tree is offered)?
 *
 * @param {Object} program
 * @returns {boolean}
 */
export const usesCalls = (program) => Boolean(program && program.functions && program.functions.length > 1);

/**
 * The calls of a run as a tree, built from the call and return events of the interpreter (execute with calls).
 */
export class CallTreeModel {
    constructor() {
        this.reset();
    }

    /** No calls yet. */
    reset() {
        this.root = null;
        // The calls running now, the current one last (null for a call that is only counted).
        this.path = [];
        this.count = 0;
        this.hidden = 0;
        this.deepest = 0;
        this.keys = new Map();
    }

    /**
     * Take one event of the interpreter (other events are ignored).
     *
     * @param {Object} ev
     */
    apply(ev) {
        if (ev.event === 'call') {
            const key = `${ev.name.toLowerCase()}(${ev.args.join(', ')})`;
            const label = `${ev.name}(${ev.args.join(', ')})`;
            const isRoot = this.path.length === 0 && !this.root;
            if (!isRoot) {
                this.count++;
                this.keys.set(key, (this.keys.get(key) || 0) + 1);
            }
            this.deepest = Math.max(this.deepest, this.path.length);
            const parent = this.path.length ? this.path[this.path.length - 1] : null;
            if (!isRoot && (this.count > MAX_NODES || (this.path.length && !parent))) {
                this.hidden++;
                this.path.push(null);
                return;
            }
            const node = {label, key, value: null, done: false, children: []};
            if (isRoot) {
                this.root = node;
            } else if (parent) {
                parent.children.push(node);
            }
            this.path.push(node);
        } else if (ev.event === 'return') {
            const node = this.path.pop();
            if (node) {
                node.done = true;
                node.value = ev.value;
            }
        }
    }

    /** @returns {number} calls made again with arguments used before */
    get repeated() {
        let n = 0;
        this.keys.forEach((c) => {
            n += c - 1;
        });
        return n;
    }

    /**
     * Is this call made more than once with the same arguments?
     *
     * @param {Object} node
     * @returns {boolean}
     */
    isRepeated(node) {
        return (this.keys.get(node.key) || 0) > 1;
    }

    /** @returns {Object|null} the call running now */
    get current() {
        for (let i = this.path.length - 1; i >= 0; i--) {
            if (this.path[i]) {
                return this.path[i];
            }
        }
        return null;
    }
}

/**
 * Place the nodes of a tree: the leaves side by side, each call centred above its calls.
 *
 * @param {Object} root
 * @param {number} slot width of one node
 * @returns {{nodes: Array<{node: Object, x: number, y: number, parent: ?Object}>, width: number, height: number}}
 */
export const layoutTree = (root, slot) => {
    const nodes = [];
    let next = 0;
    let levels = 0;
    const place = (node, level, parent) => {
        levels = Math.max(levels, level + 1);
        const item = {node, x: 0, y: level * LEVEL + NODE_H / 2 + 4, parent};
        nodes.push(item);
        if (!node.children.length) {
            item.x = next * slot + slot / 2;
            next++;
        } else {
            const kids = node.children.map((c) => place(c, level + 1, item));
            item.x = (kids[0].x + kids[kids.length - 1].x) / 2;
        }
        return item;
    };
    if (root) {
        place(root, 0, null);
    }
    return {nodes, width: Math.max(next, 1) * slot, height: levels * LEVEL};
};

const svg = (tag, attrs, text) => {
    const e = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    if (text !== undefined) {
        e.textContent = text;
    }
    return e;
};

const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text !== undefined) {
        e.textContent = text;
    }
    return e;
};

export class CallTreeView {
    /**
     * @param {string|null} lang UI language code
     */
    constructor(lang = null) {
        this.lang = lang;
        this.model = new CallTreeModel();
        this.root = el('div', 'tiny_algorithm-calltree');
        this.summary = el('p', 'tiny_algorithm-calltree-summary');
        this.summary.setAttribute('aria-live', 'polite');
        this.scroller = el('div', 'tiny_algorithm-calltree-scroll');
        // A scrolling region takes the keyboard focus, so the tree can be scrolled with the arrow keys.
        this.scroller.tabIndex = 0;
        this.scroller.setAttribute('role', 'region');
        this.scroller.setAttribute('aria-label', t('calltree', null, lang));
        this.empty = el('p', 'tiny_algorithm-calltree-empty', t('calltreeempty', null, lang));
        this.reset();
    }

    /** No calls yet (before a run). */
    reset() {
        this.model.reset();
        this.root.replaceChildren(this.empty);
    }

    /**
     * Take a call or return event; nothing is drawn until draw().
     *
     * @param {Object} ev
     */
    apply(ev) {
        this.model.apply(ev);
    }

    /**
     * Take an event of a run: calls and returns grow the tree, a step or the end draws it.
     *
     * @param {Object} ev
     */
    update(ev) {
        if (ev.event === 'step' || ev.event === 'done') {
            this.draw();
        } else {
            this.apply(ev);
        }
    }

    /** Draw the tree as it is now (on a step and at the end of the run). */
    draw() {
        const m = this.model;
        if (!m.root) {
            this.root.replaceChildren(this.empty);
            return;
        }
        const longest = Math.max(4, ...this.labels(m.root));
        const slot = Math.ceil(longest * CHAR_W + GAP * 2);
        const {nodes, width, height} = layoutTree(m.root, slot);
        const text = t('calltreesummary', {calls: m.count, repeated: m.repeated, depth: m.deepest}, this.lang);
        this.summary.textContent = m.hidden ? `${text} · ${t('calltreemore', {count: m.hidden}, this.lang)}` : text;
        const onPath = new Set(m.path.filter(Boolean));
        const current = m.current;
        const pic = svg('svg', {width, height, viewBox: `0 0 ${width} ${height}`, role: 'img',
            'aria-label': this.summary.textContent, 'class': 'tiny_algorithm-calltree-svg'});
        let currentItem = null;
        nodes.forEach((item) => {
            if (item.parent) {
                pic.append(svg('line', {x1: item.parent.x, y1: item.parent.y + NODE_H / 2, x2: item.x, y2: item.y - NODE_H / 2,
                    'class': 'tiny_algorithm-calltree-edge'}));
            }
        });
        nodes.forEach((item) => {
            const n = item.node;
            const classes = ['tiny_algorithm-calltree-node'];
            if (n === current) {
                classes.push('tiny_algorithm-calltree-current');
                currentItem = item;
            } else if (onPath.has(n)) {
                classes.push('tiny_algorithm-calltree-waiting');
            } else if (n.done) {
                classes.push('tiny_algorithm-calltree-done');
            }
            if (item.parent && m.isRepeated(n)) {
                classes.push('tiny_algorithm-calltree-repeated');
            }
            const w = Math.max(n.label.length * CHAR_W + GAP, 30);
            const g = svg('g', {'class': classes.join(' ')});
            g.append(svg('rect', {x: item.x - w / 2, y: item.y - NODE_H / 2, width: w, height: NODE_H, rx: 6}));
            g.append(svg('text', {x: item.x, y: item.y + 4, 'text-anchor': 'middle'}, n.label));
            if (n.done && n.value !== null) {
                g.append(svg('text', {x: item.x, y: item.y + NODE_H / 2 + 13, 'text-anchor': 'middle',
                    'class': 'tiny_algorithm-calltree-value'}, `= ${n.value}`));
            }
            pic.append(g);
        });
        this.scroller.replaceChildren(pic);
        this.root.replaceChildren(this.summary, this.scroller);
        // Keep the running call in sight.
        if (currentItem && this.scroller.clientWidth) {
            const left = currentItem.x - this.scroller.clientWidth / 2;
            this.scroller.scrollLeft = Math.max(0, left);
        }
    }

    /**
     * Lengths of the labels and values of a tree.
     *
     * @param {Object} node
     * @returns {number[]}
     */
    labels(node) {
        const out = [node.label.length, node.value === null ? 0 : String(node.value).length + 2];
        node.children.forEach((c) => out.push(...this.labels(c)));
        return out;
    }
}
