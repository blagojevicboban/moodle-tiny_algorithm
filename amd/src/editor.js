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
 * Interactive algorithm editor widget. Framework independent (plain DOM) so it can run
 * inside a Moodle modal or in the standalone test harness.
 *
 * @module tiny_algorithm/editor
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {
    blocksFromText, blocksToText, canMoveBlock, cloneProgram, copyBlock, createBlock, createProgram, findBlock, moveBlock,
    renameFunction,
} from './model';
import {renderFunction, renderProgram} from './render';
import {execute} from './interpreter';
import {checkExpr} from './expr';
import {generate, languages, languageLabels, extensionOf} from './codegen';
import {importFprg, exportFprg} from './flowgorithm';
import {errorText, t as tr} from './strings';
import {Zoom} from './zoom';
import {Watch} from './watch';

const PALETTE = ['declare', 'assign', 'input', 'output', 'if', 'for', 'while', 'dowhile', 'call', 'return', 'comment'];

const FIELDS = {
    declare: [['name', 'text'], ['varType', 'type'], ['size', 'text']],
    assign: [['target', 'expr'], ['expr', 'expr']],
    input: [['target', 'expr']],
    output: [['expr', 'expr'], ['newline', 'bool']],
    'if': [['cond', 'expr']],
    'while': [['cond', 'expr']],
    dowhile: [['cond', 'expr']],
    'for': [['variable', 'text'], ['start', 'expr'], ['end', 'expr'], ['step', 'expr']],
    call: [['expr', 'expr']],
    'return': [['expr', 'expr']],
    comment: [['text', 'text']],
};

const el = (tag, attrs = {}, ...kids) => {
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
    kids.flat().forEach((c) => e.append(c));
    return e;
};

// Blocks copied in any editor of the page, used when the system clipboard cannot be read.
let clipboard = null;

// Distance (px) the pointer must move before pressing a block becomes dragging it.
const DRAG_START = 6;

export class AlgorithmEditor {
    constructor(container, {program = null, lang = null, onChange = null} = {}) {
        this.lang = lang;
        this.onChange = onChange;
        this.program = program || createProgram();
        this.fnIndex = 0;
        this.selected = null;
        this.undoStack = [];
        this.redoStack = [];
        this.slots = [];
        this.running = null;
        this.codeLang = 'python';
        this.build(container);
        this.refresh();
    }

    t(key) {
        return tr(key, this.lang);
    }

    get fn() {
        return this.program.functions[this.fnIndex];
    }

    // ---- DOM construction -------------------------------------------------------------------------------------------------

    build(container) {
        const btn = (key, fn, extra = {}) => el('button', {
            type: 'button', 'class': 'btn btn-secondary btn-sm tiny_algorithm-btn', onclick: fn,
            title: this.t(key), ...extra}, this.t(key));
        this.fnSelect = el('select', {'class': 'custom-select custom-select-sm tiny_algorithm-fnselect', onchange: () => {
            this.fnIndex = Number(this.fnSelect.value);
            this.selected = null;
            this.refresh();
        }});
        this.speed = el('input',
            {type: 'range', min: 0, max: 1000, value: 600, 'class': 'tiny_algorithm-speed', title: this.t('speed')});
        this.fileInput = el('input', {type: 'file', accept: '.fprg,.xml', hidden: true, onchange: (e) => this.importFile(e)});
        this.btnUndo = btn('undo', () => this.undo());
        this.btnRedo = btn('redo', () => this.redo());
        this.btnRun = btn('run', () => this.start(false));
        this.btnStep = btn('step', () => this.start(true));
        this.btnStop = btn('stop', () => this.stop());

        this.toolbar = el('div', {'class': 'tiny_algorithm-toolbar'},
            this.fnSelect, btn('addfn', () => this.addFunction()), btn('delfn', () => this.removeFunction()),
            el('span', {'class': 'tiny_algorithm-sep'}), this.btnUndo, this.btnRedo,
            el('span', {'class': 'tiny_algorithm-sep'}), this.btnRun, this.btnStep, this.btnStop, this.speed,
            el('span', {'class': 'tiny_algorithm-sep'}), el('span', {'class': 'tiny_algorithm-zoom-slot'}),
            el('span', {'class': 'tiny_algorithm-sep'}), btn('import', () => this.fileInput.click()),
            btn('export', () => this.exportFile()),
            this.fileInput);
        this.canvas = el('div', {'class': 'tiny_algorithm-canvas', tabindex: '0', onclick: (e) => this.onCanvasClick(e),
            onkeydown: (e) => this.onKey(e), oncopy: (e) => this.onCopy(e, false), oncut: (e) => this.onCopy(e, true),
            onpaste: (e) => this.onPaste(e), onpointerdown: (e) => this.onPointerDown(e),
            onpointermove: (e) => this.onPointerMove(e), onpointerup: (e) => this.onPointerUp(e),
            onpointercancel: () => this.endDrag()});
        this.zoom = new Zoom(this.canvas);
        // A finger pressed on a block drags it instead of scrolling (touch-action is not reliable on SVG elements).
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.press && e.touches.length === 1 && e.cancelable) {
                e.preventDefault();
            }
        }, {passive: false});
        this.toolbar.querySelector('.tiny_algorithm-zoom-slot').replaceWith(this.zoom.controls((key) => this.t(key)));
        this.props = el('div', {'class': 'tiny_algorithm-props'});
        this.consoleEl = el('div', {'class': 'tiny_algorithm-console', role: 'log'});
        this.codeEl = el('pre', {'class': 'tiny_algorithm-code'});
        this.codeSelect = el('select', {'class': 'custom-select custom-select-sm', onchange: () => {
            this.codeLang = this.codeSelect.value;
            this.renderCode();
        }}, languages.map((l) => el('option', {value: l}, languageLabels[l])));
        this.copyBtn = btn('copy', () => navigator.clipboard && navigator.clipboard.writeText(this.codeEl.textContent));
        this.dlBtn = btn('download', () => this.exportCode());
        this.tabConsole = el('div', {'class': 'tiny_algorithm-pane'}, el('h6', {}, this.t('console')), this.consoleEl);
        this.tabCode = el('div', {'class': 'tiny_algorithm-pane'},
            el('h6', {}, this.t('code'), ' ', this.codeSelect, ' ', this.copyBtn, ' ', this.dlBtn), this.codeEl);
        this.watch = new Watch(this.lang);
        this.tabWatch = el('div', {'class': 'tiny_algorithm-pane'}, el('h6', {}, this.t('variables')), this.watch.root);
        this.side = el('div', {'class': 'tiny_algorithm-side'}, this.props, this.tabConsole, this.tabWatch, this.tabCode);
        this.root = el('div', {'class': 'tiny_algorithm-editor'}, this.toolbar,
            el('div', {'class': 'tiny_algorithm-main'}, this.canvas, this.side));
        container.append(this.root);
        this.palette = null;
    }

    // ---- State / history --------------------------------------------------------------------------------------------------

    commit(mutator) {
        this.undoStack.push(JSON.stringify(this.program));
        if (this.undoStack.length > 100) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        mutator();
        this.refresh();
    }

    undo() {
        if (this.undoStack.length) {
            this.redoStack.push(JSON.stringify(this.program));
            this.program = JSON.parse(this.undoStack.pop());
            this.fnIndex = Math.min(this.fnIndex, this.program.functions.length - 1);
            this.refresh();
        }
    }

    redo() {
        if (this.redoStack.length) {
            this.undoStack.push(JSON.stringify(this.program));
            this.program = JSON.parse(this.redoStack.pop());
            this.fnIndex = Math.min(this.fnIndex, this.program.functions.length - 1);
            this.refresh();
        }
    }

    getProgram() {
        return cloneProgram(this.program);
    }

    /**
     * Replace the whole program (undoable).
     *
     * @param {Object} program new program model
     */
    setProgram(program) {
        this.stop();
        this.commit(() => {
            this.program = cloneProgram(program);
            this.fnIndex = 0;
            this.selected = null;
        });
    }

    getSvg() {
        return renderProgram(this.program);
    }

    // ---- Rendering --------------------------------------------------------------------------------------------------------

    refresh() {
        this.fnSelect.replaceChildren(...this.program.functions.map(
            (f, i) => el('option', {value: i, selected: i === this.fnIndex}, f.name)));
        const {svg, slots} = renderFunction(this.fn, {editable: !this.running});
        this.slots = slots;
        this.canvas.innerHTML = svg;
        this.zoom.apply();
        this.canvas.querySelectorAll('.tiny_algorithm-node').forEach((n) => {
            n.classList.toggle('tiny_algorithm-selected', n.dataset.id === this.selected);
        });
        this.setupFocus();
        this.btnUndo.disabled = !this.undoStack.length;
        this.btnRedo.disabled = !this.redoStack.length;
        this.btnRun.disabled = Boolean(this.running);
        this.btnStop.disabled = !this.running;
        this.renderProps();
        this.lockProps();
        this.renderCode();
        if (this.onChange) {
            this.onChange(this.program);
        }
    }

    renderCode() {
        try {
            this.codeEl.textContent = generate(this.codeLang, this.program);
        } catch (e) {
            this.codeEl.textContent = `// ${errorText(e)}`;
        }
    }

    field(label, type, value, onInput) {
        const id = `tiny_algorithm-f-${Math.random().toString(36).slice(2)}`;
        let input;
        let applied = null;
        if (type === 'bool') {
            input = el('input', {type: 'checkbox', id, checked: value !== false, onchange: () => onInput(input.checked)});
        } else if (type === 'type') {
            input = el('select', {id, 'class': 'custom-select custom-select-sm', onchange: () => onInput(input.value)},
                ['Integer', 'Real', 'String', 'Boolean'].map((v) => el('option', {value: v, selected: v === value}, v)));
        } else {
            input = el('input', {id, type: 'text', 'class': 'form-control form-control-sm', value: value ?? '', spellcheck: 'false',
                onkeydown: (e) => {
                    // Enter applies the value (and must not submit the form around the editor, e.g. a quiz).
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        applied = input.value;
                        this.refocus = true;
                        onInput(input.value);
                    }
                },
                oninput: () => {
                    if (type === 'expr') {
                        const err = checkExpr(input.value || '0');
                        input.classList.toggle('is-invalid', Boolean(err) && input.value.trim() !== '');
                        input.title = err || '';
                    }
                },
                // After Enter the value is applied already; the change event of the blur must not apply it again.
                onchange: () => input.value !== applied && onInput(input.value)});
        }
        return el('div', {'class': 'form-group tiny_algorithm-field'}, el('label', {'for': id}, label), input);
    }

    renderProps() {
        const found = this.selected ? findBlock(this.program, this.selected) : null;
        if (!found) {
            this.props.replaceChildren(el('h6', {}, this.t('function')),
                this.field(this.t('name'), 'text', this.fn.name, (v) => this.commit(() => {
                    if (v.trim()) {
                        renameFunction(this.program, this.fn, v.trim());
                    }
                })),
                this.field(this.t('params'), 'text',
                    this.fn.params.map((p) => `${p.name}: ${p.type}${p.array ? '[]' : ''}`).join(', '), (v) => this.commit(() => {
                    // "a: Integer[]" is an array parameter.
                    this.fn.params = v.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
                        const [name, type = ''] = s.split(':').map((x) => x.trim());
                        const array = /\[\s*\]$/.test(type);
                        return {name, type: type.replace(/\[\s*\]$/, '').trim() || 'Integer', array};
                    });
                })),
                this.field(this.t('returns'), 'text', this.fn.returnType || '', (v) => this.commit(() => {
                    this.fn.returnType = v.trim() || null;
                })),
                el('p', {'class': 'text-muted small'}, this.t('hint')),
                el('p', {'class': 'text-muted small'}, this.t('keyhint')));
            return;
        }
        const b = found.block;
        const rows = FIELDS[b.type].map(([key, kind]) => this.field(
            this.t(`f.${key}`), kind, b[key], (v) => this.commit(() => {
            b[key] = v;
        })));
        const act = (label, fn, cls = 'btn-secondary') =>
            el('button', {type: 'button', 'class': `btn btn-sm ${cls}`, onclick: fn}, label);
        this.props.replaceChildren(el('h6', {}, this.t(`b.${b.type}`)), ...rows, el('div', {'class': 'tiny_algorithm-actions'},
            act(this.t('up'), () => this.move(-1)), act(this.t('down'), () => this.move(1)),
            act(this.t('duplicate'), () => this.duplicate()),
            act(this.t('delete'), () => this.deleteSelected(), 'btn-outline-danger')));
    }

    /** While the algorithm runs, its blocks cannot be changed. */
    lockProps() {
        this.props.querySelectorAll('input, select, button').forEach((e) => {
            e.disabled = Boolean(this.running);
        });
    }

    // ---- Interaction ------------------------------------------------------------------------------------------------------

    onCanvasClick(e) {
        if (this.running || this.dragged) {
            this.dragged = false; // The click that ends a drag does not select.
            return;
        }
        const slot = e.target.closest('.tiny_algorithm-slot');
        const node = e.target.closest('.tiny_algorithm-node');
        this.closePalette();
        if (slot) {
            this.openPalette(this.slots[Number(slot.dataset.slot)], e);
        } else {
            this.selected = node && !['start', 'end'].includes(node.dataset.id) ? node.dataset.id : null;
            this.focusTarget = this.selected ? `n${this.selected}` : this.focusTarget;
            this.refresh();
        }
    }

    /** @returns {Element[]} the blocks and "+" slots that take the keyboard focus, in drawing order */
    focusables() {
        return [...this.canvas.querySelectorAll('.tiny_algorithm-node[role="button"], .tiny_algorithm-slot')];
    }

    /**
     * @param {Element} item block or slot element
     * @returns {string} key of a focusable element that survives a redraw
     */
    static focusKey(item) {
        return item.classList.contains('tiny_algorithm-slot') ? `s${item.dataset.slot}` : `n${item.dataset.id}`;
    }

    /**
     * One block or slot is in the tab order (roving tabindex); the arrow keys move between them.
     * After a keyboard action the focus goes back to the same block or slot (or the one at the same place).
     */
    setupFocus() {
        const items = this.focusables();
        if (!items.length) {
            return;
        }
        let current = items.find((it) => AlgorithmEditor.focusKey(it) === this.focusTarget);
        if (!current && this.selected) {
            current = items.find((it) => it.dataset.id === this.selected);
        }
        if (!current) {
            current = items[Math.min(this.focusIndex || 0, items.length - 1)];
        }
        current.setAttribute('tabindex', '0');
        if (this.refocus) {
            this.refocus = false;
            current.focus();
        }
    }

    moveFocus(item, to) {
        const items = this.focusables();
        const next = items[Math.max(0, Math.min(items.length - 1, to(items.indexOf(item), items.length)))];
        if (next && next !== item) {
            item.setAttribute('tabindex', '-1');
            next.setAttribute('tabindex', '0');
            next.focus();
            this.focusTarget = AlgorithmEditor.focusKey(next);
        }
    }

    // eslint-disable-next-line complexity
    onKey(e) {
        const item = e.target.closest && e.target.closest('.tiny_algorithm-node[role="button"], .tiny_algorithm-slot');
        const key = e.key;
        const mod = e.ctrlKey || e.metaKey;
        if (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown') && this.selected && !this.running) {
            // Alt + arrow moves the selected block up or down.
            e.preventDefault();
            this.focusTarget = `n${this.selected}`;
            this.refocus = true;
            this.move(key === 'ArrowUp' ? -1 : 1);
        } else if (mod && (key === 'd' || key === 'D') && this.selected && !this.running) {
            e.preventDefault();
            this.duplicate();
        } else if (item && !this.running && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(key)) {
            e.preventDefault();
            const step = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[key];
            this.moveFocus(item, (i, n) => {
                if (key === 'Home') {
                    return 0;
                }
                return key === 'End' ? n - 1 : i + step;
            });
        } else if (item && !this.running && (key === 'Enter' || key === ' ')) {
            e.preventDefault();
            this.focusTarget = AlgorithmEditor.focusKey(item);
            if (item.classList.contains('tiny_algorithm-slot')) {
                this.openPalette(this.slots[Number(item.dataset.slot)], e, item);
            } else {
                this.selected = item.dataset.id;
                this.refresh();
                const field = this.props.querySelector('input, select');
                if (field) {
                    field.focus();
                }
            }
        } else if ((key === 'Delete' || key === 'Backspace') && this.selected && !this.running &&
                (e.target === this.canvas || (item && item.dataset.id === this.selected))) {
            e.preventDefault();
            this.focusIndex = item ? this.focusables().indexOf(item) : 0;
            this.focusTarget = null;
            this.refocus = true;
            this.deleteSelected();
        } else if (key === 'Escape' && item && this.selected) {
            e.stopPropagation();
            this.selected = null;
            this.focusTarget = AlgorithmEditor.focusKey(item);
            this.refocus = true;
            this.refresh();
        } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey) || key === 'Z')) {
            e.preventDefault();
            this.redo();
        } else if (mod && key === 'z') {
            e.preventDefault();
            this.undo();
        }
    }

    /**
     * Show the block menu at a "+" slot.
     *
     * @param {object} slot insertion point from the layout
     * @param {Event} e click or key event
     * @param {Element} [item] the slot element (keyboard): the menu opens next to it and Escape returns to it
     */
    openPalette(slot, e, item) {
        const rect = this.canvas.getBoundingClientRect();
        const at = item ? item.getBoundingClientRect() : null;
        const x = (at ? at.right : e.clientX || rect.left + 20) - rect.left + this.canvas.scrollLeft;
        const y = (at ? at.top : e.clientY || rect.top + 20) - rect.top + this.canvas.scrollTop;
        const paste = clipboard && blocksFromText(clipboard) ? [el('button', {
            type: 'button', role: 'menuitem', 'class': 'btn btn-sm btn-light tiny_algorithm-paste',
            onclick: (ev) => {
                ev.stopPropagation();
                this.closePalette();
                this.insertBlocks(blocksFromText(clipboard), slot.list, slot.index);
            },
        }, this.t('paste'))] : [];
        this.palette = el('div', {'class': 'tiny_algorithm-palette', role: 'menu', style: `left:${x + 6}px;top:${y + 6}px`,
            onkeydown: (ev) => this.onPaletteKey(ev, item)}, ...paste,
            PALETTE.map((type) => el('button', {
                type: 'button', role: 'menuitem', 'class': 'btn btn-sm btn-light',
                onclick: (ev) => {
                    ev.stopPropagation();
                    this.closePalette();
                    const block = createBlock(type);
                    this.focusTarget = `n${block.id}`;
                    this.commit(() => {
                        slot.list.splice(slot.index, 0, block);
                        this.selected = block.id;
                    });
                    // From the keyboard (no mouse position), continue in the fields of the new block.
                    const field = ev.detail === 0 && this.props.querySelector('input, select');
                    if (field) {
                        field.focus();
                    }
                },
            }, this.t(`b.${type}`))));
        this.canvas.append(this.palette);
        const first = this.palette.querySelector('button');
        if (first) {
            first.focus();
        }
    }

    onPaletteKey(e, item) {
        const buttons = [...this.palette.querySelectorAll('button')];
        const i = buttons.indexOf(document.activeElement);
        const step = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[e.key];
        e.stopPropagation();
        if (step) {
            e.preventDefault();
            buttons[(i + step + buttons.length) % buttons.length].focus();
        } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            buttons[e.key === 'Home' ? 0 : buttons.length - 1].focus();
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            e.preventDefault();
            this.closePalette();
            if (item && item.isConnected) {
                item.focus();
            } else {
                this.canvas.focus();
            }
        }
    }

    closePalette() {
        if (this.palette) {
            this.palette.remove();
            this.palette = null;
        }
    }

    deleteSelected() {
        const f = findBlock(this.program, this.selected);
        if (f) {
            this.commit(() => {
                f.list.splice(f.index, 1);
                this.selected = null;
            });
        }
    }

    /** Insert a copy of the selected block after it. */
    duplicate() {
        const f = this.running ? null : findBlock(this.program, this.selected);
        if (f) {
            this.insertBlocks([copyBlock(f.block)], f.list, f.index + 1);
        }
    }

    /**
     * Insert blocks (undoable); the first one is selected and focused.
     *
     * @param {Object[]} blocks
     * @param {Object[]} list
     * @param {number} index
     */
    insertBlocks(blocks, list, index) {
        this.focusTarget = `n${blocks[0].id}`;
        this.refocus = true;
        this.commit(() => {
            list.splice(index, 0, ...blocks);
            this.selected = blocks[0].id;
        });
    }

    /**
     * Where pasted blocks go: the focused "+" slot, after the selected block, or at the end of the function.
     *
     * @param {EventTarget} target element that has the focus
     * @returns {{list: Object[], index: number}}
     */
    pastePlace(target) {
        const slot = target && target.closest && target.closest('.tiny_algorithm-slot');
        if (slot) {
            const s = this.slots[Number(slot.dataset.slot)];
            return {list: s.list, index: s.index};
        }
        const f = this.selected ? findBlock(this.program, this.selected) : null;
        return f ? {list: f.list, index: f.index + 1} : {list: this.fn.body, index: this.fn.body.length};
    }

    /**
     * Ctrl + C / Ctrl + X: the selected block goes to the clipboard (as text, so it can be pasted into another diagram).
     *
     * @param {ClipboardEvent} e
     * @param {boolean} cut remove the block too
     */
    onCopy(e, cut) {
        const f = this.selected && !this.running ? findBlock(this.program, this.selected) : null;
        if (!f) {
            return;
        }
        e.preventDefault();
        clipboard = blocksToText([f.block]);
        if (e.clipboardData) {
            e.clipboardData.setData('text/plain', clipboard);
        }
        if (cut) {
            this.focusTarget = null;
            this.refocus = true;
            this.deleteSelected();
        }
    }

    /**
     * Ctrl + V: insert the copied blocks (see pastePlace).
     *
     * @param {ClipboardEvent} e
     */
    onPaste(e) {
        if (this.running) {
            return;
        }
        const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
        const blocks = blocksFromText(text) || (clipboard && blocksFromText(clipboard));
        if (blocks) {
            e.preventDefault();
            const {list, index} = this.pastePlace(e.target);
            this.insertBlocks(blocks, list, index);
        }
    }

    // ---- Dragging blocks (mouse, pen and touch) --------------------------------------------------------------------------

    onPointerDown(e) {
        const node = !this.running && e.button === 0 && e.target.closest('.tiny_algorithm-node[role="button"]');
        this.press = node ? {id: node.dataset.id, x: e.clientX, y: e.clientY, pointer: e.pointerId, node} : null;
    }

    onPointerMove(e) {
        const p = this.press;
        if (!p || e.pointerId !== p.pointer) {
            return;
        }
        if (this.zoom.pinching) {
            this.endDrag(); // A second finger zooms instead.
            return;
        }
        if (!this.drag) {
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START) {
                return;
            }
            this.drag = p;
            this.closePalette();
            this.canvas.setPointerCapture(e.pointerId);
            this.root.classList.add('tiny_algorithm-dragging');
            p.node.classList.add('tiny_algorithm-drag-source');
        }
        e.preventDefault();
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const slot = under && under.closest ? under.closest('.tiny_algorithm-slot') : null;
        const s = slot ? this.slots[Number(slot.dataset.slot)] : null;
        const target = s && canMoveBlock(this.program, p.id, s.list, s.index) ? slot : null;
        if (this.dropSlot !== target) {
            if (this.dropSlot) {
                this.dropSlot.classList.remove('tiny_algorithm-drop');
            }
            if (target) {
                target.classList.add('tiny_algorithm-drop');
            }
            this.dropSlot = target;
        }
        // Scroll the canvas when the pointer is near its top or bottom edge.
        const r = this.canvas.getBoundingClientRect();
        if (e.clientY < r.top + 30) {
            this.canvas.scrollTop -= 15;
        } else if (e.clientY > r.bottom - 30) {
            this.canvas.scrollTop += 15;
        }
    }

    onPointerUp() {
        const drag = this.drag;
        const slot = this.dropSlot;
        this.endDrag();
        if (!drag) {
            return;
        }
        this.dragged = true;
        setTimeout(() => {
            this.dragged = false;
        });
        if (slot) {
            const s = this.slots[Number(slot.dataset.slot)];
            this.focusTarget = `n${drag.id}`;
            this.commit(() => {
                moveBlock(this.program, drag.id, s.list, s.index);
                this.selected = drag.id;
            });
        }
    }

    endDrag() {
        if (this.dropSlot) {
            this.dropSlot.classList.remove('tiny_algorithm-drop');
        }
        if (this.drag) {
            this.root.classList.remove('tiny_algorithm-dragging');
            this.drag.node.classList.remove('tiny_algorithm-drag-source');
        }
        this.press = null;
        this.drag = null;
        this.dropSlot = null;
    }

    move(dir) {
        const f = findBlock(this.program, this.selected);
        const to = f ? f.index + dir : -1;
        if (f && to >= 0 && to < f.list.length) {
            this.commit(() => {
                [f.list[f.index], f.list[to]] = [f.list[to], f.list[f.index]];
            });
        }
    }

    addFunction() {
        this.commit(() => {
            const names = new Set(this.program.functions.map((f) => f.name));
            let n = this.program.functions.length;
            while (names.has(`Function${n}`)) {
                n++;
            }
            this.program.functions.push({name: `Function${n}`, params: [], returnType: null, body: []});
            this.fnIndex = this.program.functions.length - 1;
            this.selected = null;
        });
    }

    removeFunction() {
        if (this.program.functions.length > 1) {
            this.commit(() => {
                this.program.functions.splice(this.fnIndex, 1);
                this.fnIndex = 0;
                this.selected = null;
            });
        }
    }

    // ---- Import / export --------------------------------------------------------------------------------------------------

    importFile(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) {
            return;
        }
        file.text().then((text) => {
            const {program, warnings} = importFprg(text);
            this.commit(() => {
                this.program = program;
                this.fnIndex = 0;
                this.selected = null;
            });
            this.log(warnings.length ? `${this.t('imported')}\n${warnings.join('\n')}` : this.t('imported'), 'tiny_algorithm-info');
            return null;
        }).catch((err) => this.log(err.message, 'tiny_algorithm-error'));
    }

    download(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], {type}));
        const a = el('a', {href: url, download: name});
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    exportFile() {
        this.download(`${this.program.name || 'algorithm'}.fprg`, exportFprg(this.program), 'application/xml');
    }

    exportCode() {
        this.download(`main.${extensionOf(this.codeLang)}`, this.codeEl.textContent, 'text/plain');
    }

    // ---- Execution --------------------------------------------------------------------------------------------------------

    log(text, cls = '') {
        const line = el('div', {'class': `tiny_algorithm-line ${cls}`}, text);
        this.consoleEl.append(line);
        this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
        return line;
    }

    highlight(id) {
        this.canvas.querySelectorAll('.tiny_algorithm-running').forEach((n) => n.classList.remove('tiny_algorithm-running'));
        const n = id && this.canvas.querySelector(`.tiny_algorithm-node[data-id="${id}"]`);
        if (n) {
            n.classList.add('tiny_algorithm-running');
        }
    }

    stop() {
        if (this.running) {
            this.running.stopped = true;
            if (this.running.wake) {
                this.running.wake();
            }
        }
    }

    waitNext(run) {
        return new Promise((resolve) => {
            run.wake = resolve;
            if (!run.stepMode) {
                run.timer = setTimeout(resolve, Number(this.speed.max) - Number(this.speed.value));
            }
        }).then(() => {
            clearTimeout(run.timer);
            run.wake = null;
            return null;
        });
    }

    askInput(run, ev) {
        return new Promise((resolve) => {
            const input = el('input', {type: 'text', 'class': 'form-control form-control-sm tiny_algorithm-input',
                'aria-label': `${ev.name} (${ev.type})`, onkeydown: (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = input.value;
                        input.disabled = true;
                        row.append(` ${v}`);
                        input.remove();
                        resolve(v);
                    }
                }});
            const row = this.log(`${ev.name} (${ev.type}) ? `);
            row.append(input);
            input.focus();
            run.wake = () => resolve('');
        });
    }

    async start(stepMode) {
        if (this.running) {
            // Already paused in step mode: advance one step.
            if (this.running.stepMode && this.running.wake) {
                this.running.wake();
            }
            return;
        }
        this.closePalette();
        const run = {stepMode, stopped: false, wake: null};
        this.running = run;
        this.consoleEl.replaceChildren();
        this.watch.clear();
        this.refresh();
        try {
            const gen = execute(this.program);
            let res = gen.next();
            while (!res.done && !run.stopped) {
                const ev = res.value;
                if (ev.event === 'step') {
                    this.highlight(ev.id);
                    this.watch.update(ev.vars);
                    await this.waitNext(run);
                } else if (ev.event === 'done') {
                    this.watch.update(ev.vars);
                } else if (ev.event === 'output') {
                    this.flushOutput(ev.text);
                } else if (ev.event === 'input') {
                    const v = await this.askInput(run, ev);
                    res = gen.next(v);
                    continue;
                }
                res = gen.next();
            }
            this.log(run.stopped ? this.t('stopped') : this.t('finished'), 'tiny_algorithm-info');
        } catch (err) {
            this.log(`${this.t('error')}: ${errorText(err)}`, 'tiny_algorithm-error');
        } finally {
            this.running = null;
            this.highlight(null);
            this.refresh();
        }
    }

    flushOutput(text) {
        const last = this.consoleEl.lastElementChild;
        if (last && last.classList.contains('tiny_algorithm-out') && !last.dataset.closed) {
            last.textContent += text.replace(/\n$/, '');
            if (text.endsWith('\n')) {
                last.dataset.closed = '1';
            }
        } else {
            const line = this.log(text.replace(/\n$/, ''), 'tiny_algorithm-out');
            if (text.endsWith('\n')) {
                line.dataset.closed = '1';
            }
        }
    }
}
