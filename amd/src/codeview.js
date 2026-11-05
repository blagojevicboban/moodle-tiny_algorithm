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
 * The generated code shown line by line, so the lines of the running or selected block can be marked and a click
 * on a line can find its block.
 *
 * @module tiny_algorithm/codeview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {generateLines} from './codegen';

const LINE = 'tiny_algorithm-codeline';
const CURRENT = 'tiny_algorithm-codeline-current';
export const SELECTED = 'tiny_algorithm-codeline-selected';

/**
 * Show the code of the program in a pre element, one element per line.
 *
 * @param {HTMLElement} pre the code panel
 * @param {string} lang language of the code
 * @param {Object} program the algorithm
 * @returns {string} the code as text (for Copy and Download)
 */
export const showCode = (pre, lang, program) => {
    const {text, owners} = generateLines(lang, program);
    pre.replaceChildren(...text.replace(/\n$/, '').split('\n').map((line, i) => {
        const span = document.createElement('span');
        span.className = LINE;
        if (owners[i]) {
            span.dataset.block = owners[i];
        }
        // The line break is part of the line, so the code reads right with any styles.
        span.textContent = `${line}\n`;
        return span;
    }));
    return text;
};

/**
 * Mark the lines of a block in the code panel and scroll them into view; null removes the mark.
 *
 * @param {HTMLElement} pre the code panel
 * @param {?string} id block id
 * @param {string} cls class of the mark (the running block by default)
 * @param {boolean} scroll scroll the panel to the first line
 */
export const markCode = (pre, id, cls = CURRENT, scroll = true) => {
    pre.querySelectorAll(`.${cls}`).forEach((n) => n.classList.remove(cls));
    if (!id) {
        return;
    }
    const lines = [...pre.querySelectorAll(`.${LINE}`)].filter((n) => n.dataset.block === id);
    lines.forEach((n) => n.classList.add(cls));
    const first = lines[0];
    if (scroll && first && pre.clientHeight && (first.offsetTop < pre.scrollTop ||
            first.offsetTop + first.offsetHeight > pre.scrollTop + pre.clientHeight)) {
        // Only the panel scrolls, not the page.
        pre.scrollTop = Math.max(0, first.offsetTop - pre.clientHeight / 3);
    }
};

/**
 * The block a clicked code line comes from.
 *
 * @param {Event} e click event inside the code panel
 * @returns {?string} block id, null for lines of no block
 */
export const blockAt = (e) => {
    const line = e.target instanceof Element ? e.target.closest(`.${LINE}`) : null;
    return line && line.dataset.block ? line.dataset.block : null;
};

/**
 * The block of the next (or previous) code line that belongs to another block than id, for the arrow keys.
 *
 * @param {HTMLElement} pre the code panel
 * @param {?string} id block now selected
 * @param {number} dir 1 down, -1 up
 * @returns {?string} block id, null when there is none
 */
export const nextBlock = (pre, id, dir) => {
    const owners = [...pre.querySelectorAll(`.${LINE}`)].map((n) => n.dataset.block || null);
    const at = id ? owners.indexOf(id) : -1;
    if (at < 0) {
        const list = dir > 0 ? owners : owners.slice().reverse();
        return list.find((o) => o) || null;
    }
    // From the first line of the block: down reaches the body of a loop or if, up the line before the block.
    for (let i = at + dir; i >= 0 && i < owners.length; i += dir) {
        if (owners[i] && owners[i] !== id) {
            return owners[i];
        }
    }
    return null;
};

/**
 * Scroll a diagram so that a block is visible; only the diagram scrolls, not the page.
 *
 * @param {HTMLElement} scrollEl scrollable element with the SVG
 * @param {string} id block id
 */
export const revealNode = (scrollEl, id) => {
    const node = scrollEl.querySelector(`.tiny_algorithm-node[data-id="${id}"]`);
    if (!node || !scrollEl.clientHeight) {
        return;
    }
    const box = scrollEl.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) {
        scrollEl.scrollTop += r.top - box.top - (scrollEl.clientHeight - r.height) / 2;
    }
    if (r.left < box.left || r.right > box.right) {
        scrollEl.scrollLeft += r.left - box.left - (scrollEl.clientWidth - r.width) / 2;
    }
};
