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
 * The outline of an algorithm: its functions and blocks as a tree (the WAI-ARIA tree pattern), for screen readers and
 * the keyboard. Up and Down go through the visible items, Right opens an item or goes to its first child, Left closes
 * it or goes to its parent, Home and End go to the first and the last item, Enter shows the block in the diagram.
 *
 * @module tiny_algorithm/outline
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el, openDialog} from './dialog';
import {labelOf} from './layout';
import {t} from './strings';

/**
 * The items of the outline (also used by the tests): a function, a block, or the Then / Else part of an If.
 *
 * @param {Object} program the algorithm
 * @returns {Array<{text: string, fn: number, id: ?string, children: Array}>}
 */
export const outlineItems = (program) => {
    const block = (b, fn) => {
        const text = b.type === 'comment' ? `${t('b.comment')}: ${b.text || ''}` : `${t(`b.${b.type}`)}: ${labelOf(b)}`;
        const item = {text, fn, id: b.id, children: []};
        if (b.type === 'if') {
            item.children = [
                {text: t('outlinethen'), fn, id: b.id, children: (b.then || []).map((c) => block(c, fn))},
                {text: t('outlineelse'), fn, id: b.id, children: (b.else || []).map((c) => block(c, fn))},
            ];
        } else if (Array.isArray(b.body)) {
            item.children = b.body.map((c) => block(c, fn));
        }
        return item;
    };
    return (program.functions || []).map((f, fn) => ({
        text: t('outlinefunction', {name: `${f.name}(${(f.params || []).map((p) => p.name).join(', ')})`}),
        fn, id: null, children: (f.body || []).map((b) => block(b, fn)),
    }));
};

/**
 * The tree element.
 *
 * @param {Object} program the algorithm
 * @param {Function} onPick (fn index, block id or null) when Enter is pressed or an item is double-clicked
 * @returns {HTMLElement}
 */
export const outlineTree = (program, onPick) => {
    const tree = el('ul', {role: 'tree', 'class': 'tiny_algorithm-outline', 'aria-label': t('outline')});
    const build = (items, parent, level) => items.forEach((it) => {
        const li = el('li', {role: 'treeitem', 'aria-level': String(level), tabindex: '-1',
            ondblclick: (e) => {
                e.stopPropagation();
                onPick(it.fn, it.id);
            }}, el('span', {'class': 'tiny_algorithm-outline-text'}, it.text));
        li.pick = () => onPick(it.fn, it.id);
        if (it.children.length) {
            // Functions start open, the blocks inside loops and branches too: the whole algorithm can be read.
            li.setAttribute('aria-expanded', 'true');
            const group = el('ul', {role: 'group'});
            build(it.children, group, level + 1);
            li.append(group);
        }
        parent.append(li);
    });
    build(outlineItems(program), tree, 1);
    const visible = () => [...tree.querySelectorAll('[role="treeitem"]')].filter((n) => !n.closest('[role="group"][hidden]'));
    const focus = (n) => {
        if (!n) {
            return;
        }
        tree.querySelectorAll('[role="treeitem"]').forEach((x) => x.setAttribute('tabindex', '-1'));
        n.setAttribute('tabindex', '0');
        n.focus();
    };
    const open = (n, on) => {
        n.setAttribute('aria-expanded', String(on));
        n.querySelector(':scope > [role="group"]').hidden = !on;
    };
    tree.addEventListener('keydown', (e) => {
        const items = visible();
        const at = items.indexOf(document.activeElement);
        const n = items[at];
        if (!n) {
            return;
        }
        const expandable = n.hasAttribute('aria-expanded');
        const expanded = n.getAttribute('aria-expanded') === 'true';
        const keys = {
            ArrowDown: () => focus(items[at + 1]),
            ArrowUp: () => focus(items[at - 1]),
            Home: () => focus(items[0]),
            End: () => focus(items[items.length - 1]),
            ArrowRight: () => {
                if (expandable && !expanded) {
                    open(n, true);
                } else if (expandable) {
                    focus(n.querySelector(':scope > [role="group"] > [role="treeitem"]'));
                }
            },
            ArrowLeft: () => {
                if (expandable && expanded) {
                    open(n, false);
                } else {
                    focus(n.parentElement.closest('[role="treeitem"]'));
                }
            },
            Enter: () => n.pick(),
        };
        if (keys[e.key]) {
            e.preventDefault();
            e.stopPropagation();
            keys[e.key]();
        }
    });
    tree.addEventListener('click', (e) => {
        const n = e.target.closest('[role="treeitem"]');
        if (n) {
            e.stopPropagation();
            focus(n);
        }
    });
    const first = tree.querySelector('[role="treeitem"]');
    if (first) {
        first.setAttribute('tabindex', '0');
    }
    return tree;
};

/**
 * Open the outline in a dialog; picking an item closes it.
 *
 * @param {HTMLElement} host widget root
 * @param {Object} program the algorithm
 * @param {Function} onPick (fn index, block id or null)
 */
export const openOutline = (host, program, onPick) => {
    let dialog = null;
    const tree = outlineTree(program, (fn, id) => {
        dialog.close();
        onPick(fn, id);
    });
    dialog = openDialog(host, t('outline'), el('div', {}, el('p', {'class': 'text-muted small'}, t('outlinehint')), tree));
    const first = tree.querySelector('[role="treeitem"]');
    if (first) {
        first.focus();
    }
};
