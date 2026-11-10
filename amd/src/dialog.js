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
 * Small dialogs and messages of the editor and the viewer: a modal dialog (trace table, shortcuts) and a short
 * message at the bottom (Copied, Block deleted · Undo).
 *
 * @module tiny_algorithm/dialog
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

/**
 * Create an element.
 *
 * @param {string} tag
 * @param {Object} attrs attributes; on* are event handlers
 * @param {...*} kids children
 * @returns {HTMLElement}
 */
export const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') {
            e.className = v;
        } else if (k.startsWith('on')) {
            e.addEventListener(k.slice(2), v);
        } else if (v !== undefined && v !== null && v !== false) {
            e.setAttribute(k, v === true ? '' : v);
        }
    }
    kids.flat(Infinity).forEach((c) => c !== null && c !== undefined && e.append(c));
    return e;
};

/**
 * Open a modal dialog over the widget. Escape and × close it; the focus returns to where it was.
 *
 * @param {HTMLElement} host widget root (the dialog is placed inside it, so full screen keeps it)
 * @param {string} title
 * @param {HTMLElement} body content
 * @param {HTMLElement[]} [actions] buttons next to the title
 * @returns {{close: Function, root: HTMLElement}}
 */
export const openDialog = (host, title, body, actions = []) => {
    const back = document.activeElement;
    const id = `tiny_algorithm-d${Date.now()}`;
    let root = null;
    const close = () => {
        root.remove();
        if (back && typeof back.focus === 'function') {
            back.focus();
        }
    };
    const closeBtn = el('button', {type: 'button', 'class': 'btn btn-link tiny_algorithm-dialog-close',
        'aria-label': t('close'), title: t('close'), onclick: close}, '×');
    const box = el('div', {'class': 'tiny_algorithm-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id,
        tabindex: '-1'},
    el('div', {'class': 'tiny_algorithm-dialog-head'}, el('strong', {id}, title),
        el('span', {'class': 'tiny_algorithm-dialog-actions'}, ...actions, closeBtn)),
    el('div', {'class': 'tiny_algorithm-dialog-body'}, body));
    root = el('div', {'class': 'tiny_algorithm-dialog-back', onkeydown: (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            close();
        }
    }, onclick: (e) => {
        if (e.target === root) {
            close();
        }
    }}, box);
    host.append(root);
    box.focus();
    return {close, root};
};

/**
 * A short message at the bottom of the widget, with an optional action (Undo); it goes away after a few seconds.
 *
 * @param {HTMLElement} host widget root
 * @param {string} text
 * @param {?{label: string, run: Function}} action
 */
export const showToast = (host, text, action = null) => {
    host.querySelectorAll('.tiny_algorithm-toast').forEach((n) => n.remove());
    const toast = el('div', {'class': 'tiny_algorithm-toast', role: 'status'}, text);
    if (action) {
        toast.append(el('button', {type: 'button', 'class': 'btn btn-link btn-sm', onclick: () => {
            toast.remove();
            action.run();
        }}, action.label));
    }
    host.append(toast);
    setTimeout(() => toast.remove(), 6000);
};

// Keys and what they do, in the order of the shortcuts dialog.
const SHORTCUTS = [['F5', 'scrun'], ['F10', 'scstep'], ['F8', 'scstepback'], ['F9', 'scbreakpoint'], ['↑ ↓ ← →', 'scmove'],
    ['Enter', 'scedit'], ['Alt + ↑ ↓', 'scmoveblock'], ['Ctrl + C X V D', 'scclipboard'], ['Delete', 'scdelete'],
    ['Ctrl + Z / Y', 'scundo'], ['Esc', 'scescape'], ['?', 'scshortcuts']];

/**
 * Open the list of keyboard shortcuts.
 *
 * @param {HTMLElement} host widget root
 */
export const openShortcuts = (host) => {
    const list = el('dl', {'class': 'tiny_algorithm-shortcuts'},
        SHORTCUTS.map(([key, text]) => [el('dt', {}, el('kbd', {}, key)), el('dd', {}, t(text))]));
    openDialog(host, t('shortcuts'), el('div', {}, list, el('p', {'class': 'text-muted small'}, t('scmouse'))));
};
