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
 * Marks of a run in the diagram and the code: a red dot on the blocks with a breakpoint, the block where an error
 * stopped the algorithm in red.
 *
 * @module tiny_algorithm/runmarks
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Draw the marks again (after the diagram or the code was drawn).
 *
 * @param {?Element} svgHost element that holds the diagram
 * @param {?Element} codeEl the code panel
 * @param {Set<string>} breakpoints block ids
 * @param {?string} errorId block where an error stopped the algorithm
 */
export const markRun = (svgHost, codeEl, breakpoints, errorId) => {
    if (svgHost) {
        svgHost.querySelectorAll('.tiny_algorithm-bpdot').forEach((n) => n.remove());
        svgHost.querySelectorAll('.tiny_algorithm-node').forEach((n) => {
            const id = n.dataset.id;
            n.classList.toggle('tiny_algorithm-errorblock', Boolean(errorId) && id === errorId);
            n.classList.toggle('tiny_algorithm-hasbp', breakpoints.has(id));
            if (!breakpoints.has(id) || typeof n.getBBox !== 'function') {
                return;
            }
            const box = n.getBBox();
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('class', 'tiny_algorithm-bpdot');
            dot.setAttribute('cx', String(box.x + 4));
            dot.setAttribute('cy', String(box.y + 4));
            dot.setAttribute('r', '6');
            n.append(dot);
        });
    }
    if (codeEl) {
        codeEl.querySelectorAll('[data-block]').forEach((line) => {
            line.classList.toggle('tiny_algorithm-codeline-bp', breakpoints.has(line.dataset.block));
            line.classList.toggle('tiny_algorithm-codeline-error', Boolean(errorId) && line.dataset.block === errorId);
        });
    }
};
