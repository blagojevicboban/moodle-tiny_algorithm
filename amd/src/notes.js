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
 * The comment of a block as a tooltip: on hover (after a moment), on keyboard focus, and on a tap on its bubble.
 *
 * @module tiny_algorithm/notes
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

const DELAY = 300;
let counter = 0;

/**
 * Show the comments of the blocks of a diagram as tooltips.
 *
 * @param {HTMLElement} scroller element that holds (and scrolls) the diagram
 * @param {HTMLElement} host positioned element the tooltip is placed in
 */
export const attachNotes = (scroller, host) => {
    const tip = document.createElement('div');
    tip.className = 'tiny_algorithm-tooltip';
    tip.id = `tiny_algorithm-tip${++counter}`;
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    host.append(tip);
    let timer = null;
    let shownFor = null;

    const hide = () => {
        clearTimeout(timer);
        tip.hidden = true;
        if (shownFor) {
            shownFor.removeAttribute('aria-describedby');
        }
        shownFor = null;
    };
    const show = (node) => {
        if (!node.isConnected || !node.dataset.note) {
            return;
        }
        tip.textContent = node.dataset.note;
        tip.hidden = false;
        const box = host.getBoundingClientRect();
        const r = node.getBoundingClientRect();
        const width = tip.offsetWidth;
        const left = Math.max(4, Math.min(r.left - box.left + r.width / 2 - width / 2, box.width - width - 4));
        // Above the block, below it when there is no room.
        let top = r.top - box.top - tip.offsetHeight - 8;
        if (top < 0) {
            top = r.bottom - box.top + 8;
        }
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
        node.setAttribute('aria-describedby', tip.id);
        shownFor = node;
    };
    const noteOf = (e) => (e.target instanceof Element ? e.target.closest('.tiny_algorithm-node[data-note]') : null);

    scroller.addEventListener('pointerover', (e) => {
        const node = noteOf(e);
        if (node && node !== shownFor && e.pointerType !== 'touch') {
            clearTimeout(timer);
            timer = setTimeout(() => show(node), DELAY);
        }
    });
    scroller.addEventListener('pointerout', (e) => {
        const node = noteOf(e);
        if (node && !(e.relatedTarget instanceof Node && node.contains(e.relatedTarget))) {
            hide();
        }
    });
    scroller.addEventListener('focusin', (e) => {
        const node = noteOf(e);
        if (node) {
            show(node);
        }
    });
    scroller.addEventListener('focusout', hide);
    scroller.addEventListener('scroll', hide);
    // A tap on the bubble shows the comment (a tap on the block itself still selects it).
    scroller.addEventListener('click', (e) => {
        const icon = e.target instanceof Element ? e.target.closest('.tiny_algorithm-noteicon') : null;
        if (icon) {
            e.stopPropagation();
            const node = icon.closest('.tiny_algorithm-node');
            if (shownFor === node) {
                hide();
            } else {
                show(node);
            }
        }
    }, true);
    host.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shownFor) {
            hide();
        }
    });
    tip.setAttribute('aria-label', t('note'));
};

/**
 * All the comments of a diagram as a numbered list, with the same numbers in the bubbles of their blocks: for a
 * projector or a printout, where nobody holds the mouse over a block.
 *
 * @param {Element} svgHost element that holds the drawn diagram
 * @param {Object} o
 * @param {string} o.title heading of the list
 * @param {function(string): void} o.select marks a block (by its id) in the diagram
 * @returns {?{root: HTMLElement, show: function(boolean): void}} null when no block has a comment
 */
export const notesList = (svgHost, {title, select}) => {
    const nodes = [...svgHost.querySelectorAll('.tiny_algorithm-node[data-note]')];
    if (!nodes.length) {
        return null;
    }
    const list = document.createElement('ol');
    nodes.forEach((node) => {
        // The first text of a block is its own (the bubble's mark comes after it).
        const text = node.querySelector('text');
        const block = document.createElement('button');
        block.type = 'button';
        block.className = 'btn btn-link btn-sm tiny_algorithm-noteslist-block';
        block.textContent = text ? [...text.childNodes].map((c) => c.textContent).join(' ').trim() : '';
        block.addEventListener('click', () => select(node.dataset.id));
        const note = document.createElement('span');
        note.className = 'tiny_algorithm-noteslist-note';
        note.textContent = node.dataset.note;
        const item = document.createElement('li');
        item.append(block, note);
        list.append(item);
    });
    const heading = document.createElement('strong');
    heading.textContent = title;
    const root = document.createElement('div');
    root.className = 'tiny_algorithm-noteslist';
    root.hidden = true;
    root.append(heading, list);
    const show = (on) => {
        root.hidden = !on;
        nodes.forEach((node, i) => {
            const mark = node.querySelector('.tiny_algorithm-noteicon text');
            if (mark) {
                mark.textContent = on ? String(i + 1) : '…';
            }
        });
    };
    return {root, show};
};
