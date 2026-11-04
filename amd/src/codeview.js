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
 * The generated code shown line by line, so the lines of the running block can be marked.
 *
 * @module tiny_algorithm/codeview
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {generateLines} from './codegen';

const LINE = 'tiny_algorithm-codeline';
const CURRENT = 'tiny_algorithm-codeline-current';

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
 */
export const markCode = (pre, id) => {
    pre.querySelectorAll(`.${CURRENT}`).forEach((n) => n.classList.remove(CURRENT));
    if (!id) {
        return;
    }
    const lines = [...pre.querySelectorAll(`.${LINE}`)].filter((n) => n.dataset.block === id);
    lines.forEach((n) => n.classList.add(CURRENT));
    const first = lines[0];
    if (first && pre.clientHeight && (first.offsetTop < pre.scrollTop ||
            first.offsetTop + first.offsetHeight > pre.scrollTop + pre.clientHeight)) {
        // Only the panel scrolls, not the page.
        pre.scrollTop = Math.max(0, first.offsetTop - pre.clientHeight / 3);
    }
};
