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
    MAX_NOTE, blocksFromText, blocksToText, canMoveBlock, cloneProgram, copyBlock, createBlock, createProgram, findBlock, moveBlock,
    renameFunction, walk,
} from './model';
import {renderFunction, renderProgram, showBranch} from './render';
import {runSession} from './session';
import {Timeline, replayTo} from './timeline';
import {openDialog, openShortcuts, showToast} from './dialog';
import {openHelp} from './help';
import {PEN_COLORS, TurtleView, usesTurtle} from './turtle';
import {FilesPanel, usesFiles} from './files';
import {ArrayView, usesArrays} from './arrayview';
import {openTrace} from './trace';
import {attachNotes} from './notes';
import {markRun} from './runmarks';
import {checkExpr} from './expr';
import {isMatrix, languageLabels, extensionOf} from './codegen';
import {pickLanguage, rememberLanguage} from './codelang';
import {SELECTED, blockAt, markCode, nextBlock, revealNode, showCode} from './codeview';
import {TEMPLATES} from './templates';
import {openComplexity} from './complexity';
import {importPython} from './codeimport';
import {importFprg, exportFprg} from './flowgorithm';
import {errorText, t as tr} from './strings';
import {Zoom} from './zoom';
import {Watch} from './watch';
import {readLine} from './consoleinput';

const PALETTE = ['declare', 'assign', 'input', 'output', 'if', 'for', 'while', 'dowhile', 'call', 'return', 'break', 'continue',
    'comment', 'forward', 'turn', 'pen', 'home', 'clear', 'open', 'read', 'write', 'close'];
// Blocks that only make sense inside a loop.
const LOOP_ONLY = ['break', 'continue'];

const FIELDS = {
    declare: [['name', 'text'], ['varType', 'type'], ['size', 'text'], ['size2', 'text']],
    assign: [['target', 'expr'], ['expr', 'expr']],
    input: [['target', 'expr']],
    output: [['expr', 'expr'], ['newline', 'bool']],
    'if': [['cond', 'expr']],
    'while': [['cond', 'expr']],
    dowhile: [['cond', 'expr']],
    'for': [['variable', 'text'], ['start', 'expr'], ['end', 'expr'], ['step', 'expr']],
    call: [['expr', 'expr']],
    'return': [['expr', 'expr']],
    'break': [],
    'continue': [],
    comment: [['text', 'text']],
    forward: [['distance', 'expr'], ['pen', 'penstate']],
    turn: [['angle', 'expr'], ['rotate', 'rotate']],
    pen: [['color', 'color']],
    home: [],
    clear: [],
    open: [['file', 'expr'], ['mode', 'filemode']],
    read: [['target', 'expr']],
    write: [['expr', 'expr']],
    close: [['mode', 'closemode']],
};

// Choices of the select fields: values and the keys of their labels.
const CHOICES = {
    penstate: [['down', 'o.down'], ['up', 'o.up']],
    rotate: [['right', 'o.right'], ['left', 'o.left']],
    color: Object.keys(PEN_COLORS).map((c) => [c, `c.${c}`]),
    filemode: [['read', 'o.read'], ['write', 'o.write'], ['append', 'o.append']],
    closemode: [['read', 'o.closeread'], ['write', 'o.closewrite']],
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

// The title of a panel of the editor.
const paneTitle = (...kids) => el('div', {'class': 'tiny_algorithm-panetitle'}, ...kids);

// Blocks copied in any editor of the page, used when the system clipboard cannot be read.
let clipboard = null;

// Distance (px) the pointer must move before pressing a block becomes dragging it.
const DRAG_START = 6;
// Width (px) from which the code has its own column.
const WIDE = 1400;
// Time (ms) a finger rests on a block before its menu opens.
const LONG_PRESS = 600;

export class AlgorithmEditor {
    /**
     * @param {HTMLElement} container element that receives the editor
     * @param {Object} [options]
     * @param {Object|null} [options.program] algorithm to edit
     * @param {string|null} [options.lang] UI language
     * @param {Function|null} [options.onChange] called with the algorithm after each drawing
     * @param {boolean} [options.showCode] show the generated code (a quiz question may hide it)
     * @param {boolean} [options.fileTools] show import, export and the image buttons (a quiz question may hide them)
     * @param {boolean} [options.chooseLanguage] the language chosen in the code panel becomes the diagram's default
     *     (the teacher's editors; a student's choice does not change the answer)
     * @param {Object} [options.codeConfig] code languages of the site and the course (tiny_algorithm/codelang)
     * @param {boolean} [options.parsons] a Parsons problem: the blocks can only be moved, nested and deleted
     */
    constructor(container, {program = null, lang = null, onChange = null, showCode = true, fileTools = true,
            chooseLanguage = false, codeConfig = {}, parsons = false} = {}) {
        this.lang = lang;
        // A Parsons problem (qtype_algorithm): the blocks are given; they can only be moved, nested and deleted.
        this.parsons = parsons;
        this.chooseLanguage = chooseLanguage;
        this.codeConfig = codeConfig || {};
        this.showCode = showCode;
        this.fileTools = fileTools;
        this.onChange = onChange;
        this.program = program || createProgram();
        this.fnIndex = 0;
        this.selected = null;
        this.undoStack = [];
        this.redoStack = [];
        this.slots = [];
        this.running = null;
        this.breakpoints = new Set();
        this.trace = [];
        this.codeChoice = pickLanguage(this.program, this.codeConfig, chooseLanguage);
        this.codeLang = this.codeChoice.lang;
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
        this.fnSelect = el('select', {
            'class': 'custom-select custom-select-sm tiny_algorithm-fnselect',
            'aria-label': this.t('function'),
            onmousedown: (e) => e.stopPropagation(),
            onpointerdown: (e) => e.stopPropagation(),
            onclick: (e) => e.stopPropagation(),
            onchange: () => {
                this.fnIndex = Number(this.fnSelect.value);
                this.selected = null;
                this.refresh();
            },
        });
        this.speed = el('input',
            {type: 'range', min: 0, max: 1000, value: 600, 'class': 'tiny_algorithm-speed', title: this.t('speed'),
                'aria-label': this.t('speed')});
        this.fileInput = el('input', {type: 'file', accept: '.fprg,.xml', hidden: true, onchange: (e) => this.importFile(e)});
        this.btnUndo = btn('undo', () => this.undo());
        this.btnRedo = btn('redo', () => this.redo());
        this.btnRun = btn('run', () => this.start(false));
        this.btnStep = btn('step', () => this.start(true));
        this.btnBack = btn('stepback', () => this.stepBack());
        this.btnBack.title = this.t('stepbackhint');
        this.btnBack.disabled = true;
        this.timeline = new Timeline((key, values) => tr(key, values), (step) => this.goTo(step));
        this.btnStop = btn('stop', () => this.stop());
        this.statusEl = el('span', {'class': 'tiny_algorithm-status', role: 'status', hidden: true});
        // What a screen reader hears while stepping (the panels change too often to be read).
        this.announcer = el('div', {'class': 'sr-only visually-hidden', 'aria-live': 'polite'});

        this.btnFile = el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm tiny_algorithm-btn tiny_algorithm-filebtn',
            'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: (e) => this.toggleFileMenu(e)}, `${this.t('file')} ▾`);
        this.toolbar = el('div', {
            'class': 'tiny_algorithm-toolbar',
            onmousedown: (e) => e.stopPropagation(),
            onpointerdown: (e) => e.stopPropagation(),
        },
            this.fnSelect,
            ...(this.parsons ? [] : [btn('addfn', () => this.addFunction()), btn('delfn', () => this.removeFunction())]),
            el('span', {'class': 'tiny_algorithm-sep'}), this.btnUndo, this.btnRedo,
            el('span', {'class': 'tiny_algorithm-sep'}), this.btnRun, this.btnBack, this.btnStep, this.btnStop,
            el('span', {'class': 'tiny_algorithm-speedbox'}, el('span', {'aria-hidden': 'true'}, this.t('slow')), this.speed,
                el('span', {'aria-hidden': 'true'}, this.t('fast'))),
            el('span', {'class': 'tiny_algorithm-sep'}), this.btnFile, this.fileInput);
        this.canvas = el('div', {'class': 'tiny_algorithm-canvas', tabindex: '0', onclick: (e) => this.onCanvasClick(e),
            onkeydown: (e) => this.onKey(e), oncopy: (e) => this.onCopy(e, false), oncut: (e) => this.onCopy(e, true),
            onpaste: (e) => this.onPaste(e), onpointerdown: (e) => this.onPointerDown(e),
            onpointermove: (e) => this.onPointerMove(e), onpointerup: (e) => this.onPointerUp(e),
            onpointercancel: () => this.endDrag(), oncontextmenu: (e) => this.onContextMenu(e)});
        this.zoom = new Zoom(this.canvas);
        // A finger pressed on a block drags it instead of scrolling (touch-action is not reliable on SVG elements).
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.press && e.touches.length === 1 && e.cancelable) {
                e.preventDefault();
            }
        }, {passive: false});
        // The zoom stays in the corner of the diagram, so the toolbar fits in one row.
        this.canvasWrap = el('div', {'class': 'tiny_algorithm-canvaswrap'}, this.canvas, this.zoom.controls((key) => this.t(key)));
        attachNotes(this.canvas, this.canvasWrap);
        this.props = el('div', {'class': 'tiny_algorithm-props'});
        this.consoleEl = el('div', {'class': 'tiny_algorithm-console', role: 'log'});
        this.codeEl = el('pre', {'class': 'tiny_algorithm-code', tabindex: '0', title: this.t('codehint'),
            onclick: (e) => this.selectFromCode(blockAt(e)), onkeydown: (e) => this.onCodeKey(e)});
        this.codeSelect = el('select', {
            'class': 'custom-select custom-select-sm', 'aria-label': this.t('code'),
            onmousedown: (e) => e.stopPropagation(),
            onpointerdown: (e) => e.stopPropagation(),
            onclick: (e) => e.stopPropagation(),
            onchange: () => this.setLanguage(this.codeSelect.value),
            disabled: this.codeChoice.locked,
        }, this.codeChoice.allowed.map((l) => el('option', {value: l, selected: l === this.codeLang}, languageLabels[l])));
        // The teacher can lock the language: readers then see only this one.
        this.codeLock = this.chooseLanguage ? el('label', {'class': 'tiny_algorithm-codelock small mb-0'},
            el('input', {type: 'checkbox', checked: Boolean(this.program.codeLock), onchange: (e) => {
                if (e.target.checked) {
                    this.program.codeLock = true;
                } else {
                    delete this.program.codeLock;
                }
                this.program.codeLang = this.codeLang;
                if (this.onChange) {
                    this.onChange(this.program);
                }
            }}), ' ', this.t('codelock')) : [];
        this.copyBtn = btn('copy', () => navigator.clipboard && navigator.clipboard.writeText(this.codeText || ''));
        this.dlBtn = btn('download', () => this.exportCode());
        this.btnCodeLab = el('button', {
            type: 'button',
            'class': 'btn btn-sm btn-outline-primary tiny_algorithm-btn tiny_algorithm-btn-codelab',
            title: this.t('opencodelab'),
            'aria-label': this.t('opencodelab'),
            onclick: () => this.openInCodeLab(),
        }, '🚀 CodeLab');
        this.tabConsole = el('div', {'class': 'tiny_algorithm-pane'}, paneTitle(this.t('console'), ' ', this.statusEl),
            this.timeline.root, this.consoleEl);
        this.tabCode = el('div', {'class': 'tiny_algorithm-pane'},
            paneTitle(this.t('code'), ' ', this.codeSelect, ' ', this.copyBtn, ' ', this.dlBtn, ' ', this.btnCodeLab, ' ',
                this.codeLock), this.codeEl);
        this.watch = new Watch(this.lang);
        this.tabWatch = el('div', {'class': 'tiny_algorithm-pane'}, paneTitle(this.t('variables')), this.watch.root);
        // The drawing of turtle graphics, only for an algorithm that uses the turtle.
        this.turtle = new TurtleView(this.lang);
        this.tabTurtle = el('div', {'class': 'tiny_algorithm-pane', hidden: true}, paneTitle(this.t('turtle')), this.turtle.root);
        // The arrays and matrices while the algorithm runs, only for an algorithm that has arrays.
        this.tabArrays = el('div', {'class': 'tiny_algorithm-pane', hidden: true}, paneTitle(this.t('arrays')),
            new ArrayView(this.program, this.lang).root);
        // The files of the algorithm and the files it writes, only for an algorithm that uses files.
        this.filesPanel = new FilesPanel({lang: this.lang, editable: true, onChange: (files) => {
            if (Object.keys(files).length) {
                this.program.files = files;
            } else {
                delete this.program.files;
            }
            this.filesFor = this.program;
            if (this.onChange) {
                this.onChange(this.program);
            }
        }});
        this.tabFiles = el('div', {'class': 'tiny_algorithm-pane', hidden: true}, paneTitle(this.t('files')), this.filesPanel.root);
        // On a narrow screen the console, the variables and the code share the space below the diagram as tabs.
        const tab = (key) => el('button', {type: 'button', role: 'tab', 'class': 'btn btn-sm btn-link',
            'data-sidetab': key, onclick: () => this.showTab(key)}, this.t(key === 'watch' ? 'variables' : key));
        this.turtleTab = tab('turtle');
        this.turtleTab.hidden = true;
        this.filesTab = tab('files');
        this.filesTab.hidden = true;
        this.arraysTab = tab('arrays');
        this.arraysTab.hidden = true;
        this.tabBar = el('div', {'class': 'tiny_algorithm-tabbar', role: 'tablist'}, tab('console'), this.arraysTab, this.turtleTab,
            this.filesTab,
            tab('watch'),
            this.showCode ? tab('code') : []);
        this.tabConsole.dataset.sidepane = 'console';
        this.tabWatch.dataset.sidepane = 'watch';
        this.tabTurtle.dataset.sidepane = 'turtle';
        this.tabFiles.dataset.sidepane = 'files';
        this.tabArrays.dataset.sidepane = 'arrays';
        this.tabCode.dataset.sidepane = 'code';
        this.side = el('div', {'class': 'tiny_algorithm-side', 'data-sidetab': 'console'}, this.props, this.tabBar, this.tabConsole,
            this.tabArrays, this.tabTurtle, this.tabFiles, this.tabWatch, this.showCode ? this.tabCode : []);
        this.main = el('div', {'class': 'tiny_algorithm-main'}, this.canvasWrap, this.side);
        this.root = el('div', {'class': 'tiny_algorithm-editor', onkeydown: (e) => this.onRunKey(e)}, this.toolbar,
            this.emptyBar(), this.main, this.announcer);
        container.append(this.root);
        // A wide editor (full screen) shows the code in its own column, right of the diagram.
        if (this.showCode && typeof ResizeObserver === 'function') {
            new ResizeObserver(() => this.placeCode()).observe(this.root);
        }
        this.palette = null;
    }

    // ---- State / history --------------------------------------------------------------------------------------------------

    commit(mutator) {
        // A change of the algorithm removes the mark of the last error.
        this.errorId = null;
        this.forgetRun();
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
            this.forgetRun();
            this.refresh();
        }
    }

    redo() {
        if (this.redoStack.length) {
            this.undoStack.push(JSON.stringify(this.program));
            this.program = JSON.parse(this.redoStack.pop());
            this.fnIndex = Math.min(this.fnIndex, this.program.functions.length - 1);
            this.forgetRun();
            this.refresh();
        }
    }

    getProgram() {
        return cloneProgram(this.program);
    }

    /** After a change of the algorithm the last run cannot be repeated: no step back, no timeline. */
    forgetRun() {
        if (!this.running && this.lastRun) {
            this.lastRun = null;
            this.btnBack.disabled = true;
            this.timeline.hide();
        }
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
        const funcs = this.program.functions;
        const currentOptions = [...this.fnSelect.options];
        const same = currentOptions.length === funcs.length &&
            currentOptions.every((opt, i) => opt.value === String(i) && opt.textContent === funcs[i].name);
        if (same) {
            if (this.fnSelect.value !== String(this.fnIndex)) {
                this.fnSelect.value = String(this.fnIndex);
            }
        } else {
            this.fnSelect.replaceChildren(...funcs.map(
                (f, i) => el('option', {value: i, selected: i === this.fnIndex}, f.name)));
        }
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
        this.btnRun.textContent = this.t(this.running && this.running.stepMode ? 'resume' : 'run');
        this.btnRun.title = this.btnRun.textContent;
        this.btnStop.disabled = !this.running;
        markRun(this.canvas, this.codeEl, this.breakpoints, this.errorId);
        this.renderProps();
        this.lockProps();
        this.renderCode();
        markRun(this.canvas, this.codeEl, this.breakpoints, this.errorId);
        if (this.emptyHint) {
            this.emptyHint.hidden = this.program.functions.some((f) => f.body.length);
        }
        const drawing = usesTurtle(this.program);
        this.tabTurtle.hidden = !drawing;
        this.turtleTab.hidden = !drawing;
        const arrays = usesArrays(this.program);
        this.tabArrays.hidden = !arrays;
        this.arraysTab.hidden = !arrays;
        const filing = usesFiles(this.program);
        this.tabFiles.hidden = !filing;
        this.filesTab.hidden = !filing;
        if (this.filesFor !== this.program) {
            this.filesFor = this.program;
            this.filesPanel.setFiles(this.program.files);
        }
        if (this.onChange) {
            this.onChange(this.program);
        }
    }

    /**
     * Show the code in another language; in the teacher's editors it becomes the default of the diagram.
     *
     * @param {string} lang language
     */
    setLanguage(lang) {
        this.codeLang = lang;
        rememberLanguage(lang, this.codeConfig, this.chooseLanguage);
        if (this.chooseLanguage) {
            this.program.codeLang = lang;
            if (this.onChange) {
                this.onChange(this.program);
            }
        }
        this.renderCode();
    }

    renderCode() {
        if (!this.showCode) {
            return;
        }
        try {
            this.codeText = showCode(this.codeEl, this.codeLang, this.program);
        } catch (e) {
            this.codeText = `// ${errorText(e)}`;
            this.codeEl.textContent = this.codeText;
            return;
        }
        // A line clicked in the code stays where it is.
        markCode(this.codeEl, this.selected, SELECTED, !this.fromCode);
    }

    /**
     * Select the block a line of the code comes from and show it in the diagram (also in another function).
     *
     * @param {?string} id block id, null does nothing
     * @param {boolean} focus move the keyboard focus to the block
     */
    selectFromCode(id, focus = false) {
        if (!id || this.running) {
            return;
        }
        const fn = this.program.functions.findIndex((f) => findBlock({functions: [f]}, id));
        if (fn < 0) {
            return;
        }
        this.closePalette();
        this.fnIndex = fn;
        this.selected = id;
        this.focusTarget = `n${id}`;
        this.refocus = focus;
        this.fromCode = true;
        try {
            this.refresh();
        } finally {
            this.fromCode = false;
        }
        revealNode(this.canvas, id);
    }

    /**
     * Keys of the code panel: arrows go through the blocks line by line, Enter goes to the block in the diagram.
     *
     * @param {KeyboardEvent} e
     */
    onCodeKey(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectFromCode(nextBlock(this.codeEl, this.selected, e.key === 'ArrowDown' ? 1 : -1));
        } else if (e.key === 'Enter' && this.selected) {
            e.preventDefault();
            this.selectFromCode(this.selected, true);
        }
    }

    field(label, type, value, onInput) {
        const id = `tiny_algorithm-f-${Math.random().toString(36).slice(2)}`;
        let input;
        let applied = null;
        if (type === 'bool') {
            input = el('input', {type: 'checkbox', id, checked: value !== false, onchange: () => onInput(input.checked)});
        } else if (Object.hasOwn(CHOICES, type)) {
            input = el('select', {
                id, 'class': 'custom-select custom-select-sm',
                onmousedown: (e) => e.stopPropagation(),
                onpointerdown: (e) => e.stopPropagation(),
                onclick: (e) => e.stopPropagation(),
                onchange: () => onInput(input.value),
            }, CHOICES[type].map(([v, key]) => el('option', {value: v, selected: v === value}, this.t(key))));
        } else if (type === 'type') {
            input = el('select', {
                id, 'class': 'custom-select custom-select-sm',
                onmousedown: (e) => e.stopPropagation(),
                onpointerdown: (e) => e.stopPropagation(),
                onclick: (e) => e.stopPropagation(),
                onchange: () => onInput(input.value),
            }, ['Integer', 'Real', 'String', 'Boolean'].map((v) => el('option', {value: v, selected: v === value}, v)));
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
        if (!found && this.parsons) {
            // A Parsons problem: the functions are given; the task is said in the panel.
            this.props.replaceChildren(paneTitle(this.t('function')), el('p', {}, el('strong', {}, this.fn.name)),
                el('p', {'class': 'small'}, this.t('parsonstask')), el('p', {'class': 'text-muted small'}, this.t('parsonshint')));
            return;
        }
        if (!found) {
            this.props.replaceChildren(paneTitle(this.t('function')),
                this.field(this.t('name'), 'text', this.fn.name, (v) => this.commit(() => {
                    if (v.trim()) {
                        renameFunction(this.program, this.fn, v.trim());
                    }
                })),
                this.field(this.t('params'), 'text',
                    this.fn.params.map((p) => `${p.name}: ${p.type}${['', '[]', '[,]'][p.matrix ? 2 : Number(Boolean(p.array))]}`)
                        .join(', '),
                    (v) => this.commit(() => {
                    // "a: Integer[]" is an array parameter, "m: Integer[,]" (or Integer[][]) a matrix.
                    this.fn.params = v.replace(/\[\s*,\s*\]/g, '[][]').split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
                        const [name, type = ''] = s.split(':').map((x) => x.trim());
                        const matrix = /\[\s*\]\s*\[\s*\]$/.test(type);
                        const array = matrix || /\[\s*\]$/.test(type);
                        const p = {name, type: type.replace(/(\[\s*\]\s*)+$/, '').trim() || 'Integer', array};
                        return matrix ? {...p, matrix} : p;
                    });
                })),
                this.field(this.t('returns'), 'text', this.fn.returnType || '', (v) => this.commit(() => {
                    this.fn.returnType = v.trim() || null;
                })),
                el('p', {'class': 'text-muted small'}, this.t('hint')),
                el('p', {'class': 'text-muted small'}, el('button', {type: 'button', 'class': 'btn btn-link btn-sm p-0',
                    onclick: () => openShortcuts(this.root)}, `${this.t('shortcuts')} (?)`)));
            return;
        }
        const b = found.block;
        if (this.parsons) {
            // The blocks of a Parsons problem keep their text: they are moved, nested or deleted.
            this.props.replaceChildren(paneTitle(this.t(`b.${b.type}`)), el('p', {'class': 'small'}, this.t('parsonshint')),
                el('div', {'class': 'tiny_algorithm-actions'},
                    this.actionButton('up', () => this.move(-1)), this.actionButton('down', () => this.move(1)),
                    this.actionButton('moveto', () => this.startPlacing(b.id, false)),
                    this.actionButton('delete', () => this.deleteSelected(), 'btn-outline-danger')));
            return;
        }
        const rows = FIELDS[b.type].map(([key, kind]) => this.field(
            this.t(`f.${key}`), kind, b[key], (v) => this.commit(() => {
            b[key] = v;
        })));
        const act = (label, fn, cls = 'btn-secondary') =>
            el('button', {type: 'button', 'class': `btn btn-sm ${cls}`, onclick: fn}, label);
        // Blocks with an expression link to the help for the operators and functions.
        const help = FIELDS[b.type].some(([, kind]) => kind === 'expr') ? el('p', {'class': 'small mb-1'},
            el('button', {type: 'button', 'class': 'btn btn-link btn-sm p-0', onclick: () => openHelp(this.root)},
                `${this.t('exprhelp')} (?)`)) : [];
        this.props.replaceChildren(paneTitle(this.t(`b.${b.type}`)), ...rows, help, this.noteField(b),
            el('div', {'class': 'tiny_algorithm-actions'},
            act(this.t('up'), () => this.move(-1)), act(this.t('down'), () => this.move(1)),
            act(this.t('duplicate'), () => this.duplicate()),
            act(this.t('delete'), () => this.deleteSelected(), 'btn-outline-danger')));
    }

    /**
     * The comment of a block: shown as a tooltip on the block and as a comment in the code.
     *
     * @param {Object} b block
     * @returns {HTMLElement}
     */
    noteField(b) {
        const id = `tiny_algorithm-note-${b.id}`;
        const area = el('textarea', {id, 'class': 'form-control form-control-sm tiny_algorithm-notefield', rows: '2',
            maxlength: String(MAX_NOTE), onchange: () => this.commit(() => {
                const text = area.value.trim();
                if (text) {
                    b.note = text;
                } else {
                    delete b.note;
                }
            })});
        area.value = b.note || '';
        return el('div', {'class': 'form-group tiny_algorithm-field'}, el('label', {'for': id}, this.t('note')), area);
    }

    /**
     * A button of the block panel.
     *
     * @param {string} key string key of its text
     * @param {Function} fn what it does
     * @param {string} [cls] its style
     * @returns {HTMLElement}
     */
    actionButton(key, fn, cls = 'btn-secondary') {
        return el('button', {type: 'button', 'class': `btn btn-sm ${cls}`, onclick: fn}, this.t(key));
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
        if (this.placing) {
            // Choosing where a block goes: a + sign places it, a click anywhere else cancels.
            if (slot) {
                this.placeAt(slot);
            } else {
                this.endPlacing();
            }
            return;
        }
        this.closePalette();
        if (slot && this.parsons) {
            showToast(this.root, this.t('parsonshint'));
        } else if (slot) {
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
        if (this.placing && (key === 'Escape' || ((key === 'Enter' || key === ' ') && item &&
                item.classList.contains('tiny_algorithm-slot')))) {
            e.preventDefault();
            e.stopPropagation();
            if (key === 'Escape') {
                this.endPlacing();
            } else {
                this.placeAt(item);
            }
        } else if (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown') && this.selected && !this.running) {
            // Alt + arrow moves the selected block up or down.
            e.preventDefault();
            this.focusTarget = `n${this.selected}`;
            this.refocus = true;
            this.move(key === 'ArrowUp' ? -1 : 1);
        } else if (mod && (key === 'd' || key === 'D') && this.selected && !this.running && !this.parsons) {
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
                if (!this.parsons) {
                    this.openPalette(this.slots[Number(item.dataset.slot)], e, item);
                }
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
        const x = at ? at.right : e.clientX || rect.left + 20;
        const y = at ? at.top : e.clientY || rect.top + 20;
        const paste = clipboard && blocksFromText(clipboard) ? [el('button', {
            type: 'button', role: 'menuitem', 'class': 'btn btn-sm btn-light tiny_algorithm-paste',
            onclick: (ev) => {
                ev.stopPropagation();
                this.closePalette();
                this.insertBlocks(blocksFromText(clipboard), slot.list, slot.index);
            },
        }, this.t('paste'))] : [];
        this.palette = el('div', {'class': 'tiny_algorithm-palette', role: 'menu',
            onkeydown: (ev) => this.onPaletteKey(ev, item)}, ...paste,
            PALETTE.filter((type) => slot.inLoop || !LOOP_ONLY.includes(type)).map((type) => el('button', {
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
        this.placeMenu(x, y);
        const first = this.palette.querySelector('button');
        if (first) {
            first.focus();
        }
    }

    /**
     * Right click (or the Menu key, Shift + F10) on a block: copy, cut, duplicate, paste below, delete.
     * On a "+" sign it opens the block menu, which offers Paste when something was copied.
     *
     * @param {MouseEvent} e contextmenu event
     */
    onContextMenu(e) {
        if (this.running) {
            return;
        }
        const slot = e.target.closest('.tiny_algorithm-slot');
        const node = e.target.closest('.tiny_algorithm-node[role="button"]');
        if (!slot && !node) {
            return; // The browser's own menu elsewhere on the canvas.
        }
        e.preventDefault();
        this.closePalette();
        const keyboard = !e.clientX && !e.clientY;
        if (slot) {
            if (!this.parsons) {
                this.openPalette(this.slots[Number(slot.dataset.slot)], keyboard ? {} : e, keyboard ? slot : undefined);
            }
            return;
        }
        this.selected = node.dataset.id;
        this.focusTarget = `n${node.dataset.id}`;
        this.refresh();
        const id = this.selected;
        const target = () => this.canvas.querySelector(`.tiny_algorithm-node[data-id="${CSS.escape(id)}"]`);
        const copy = () => {
            const f = findBlock(this.program, id);
            clipboard = blocksToText([f.block]);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(clipboard).catch(() => null);
            }
        };
        const actions = this.parsons ? [['moveto', () => this.startPlacing(id, false)]] : [
            ['copy', copy],
            ['cut', () => {
                copy();
                this.focusTarget = null;
                this.refocus = true;
                this.deleteSelected();
            }],
            ['duplicate', () => this.duplicate()],
            ['moveto', () => this.startPlacing(id, false)],
            ['copyto', () => this.startPlacing(id, true)],
            [this.breakpoints.has(id) ? 'breakpointoff' : 'breakpoint', () => this.toggleBreakpoint(id)],
            ['addnote', () => {
                const area = this.props.querySelector('.tiny_algorithm-notefield');
                if (area) {
                    area.focus();
                }
            }],
        ];
        if (!this.parsons && clipboard && blocksFromText(clipboard)) {
            actions.push(['paste', () => {
                const f = findBlock(this.program, id);
                this.insertBlocks(blocksFromText(clipboard), f.list, f.index + 1);
            }]);
        }
        actions.push(['delete', () => {
            this.focusTarget = null;
            this.refocus = true;
            this.deleteSelected();
        }]);
        const at = keyboard && target() ? target().getBoundingClientRect() : null;
        const x = at ? at.right : e.clientX;
        const y = at ? at.top : e.clientY;
        this.palette = el('div', {'class': 'tiny_algorithm-palette tiny_algorithm-context', role: 'menu',
            onkeydown: (ev) => this.onPaletteKey(ev, target())},
        actions.map(([key, run]) => el('button', {type: 'button', role: 'menuitem', 'class': 'btn btn-sm btn-light',
            onclick: (ev) => {
                ev.stopPropagation();
                this.closePalette();
                run();
            }}, this.t(key))));
        this.placeMenu(x, y);
        this.palette.querySelector('button').focus();
    }

    /**
     * Put the open menu (blocks or the menu of a block) at a point of the screen, inside the editor: it is not cut off by
     * the scrolling diagram, and it moves left or up when there is no room.
     *
     * @param {number} x client x
     * @param {number} y client y
     */
    placeMenu(x, y) {
        const box = this.root.getBoundingClientRect();
        this.root.append(this.palette);
        const w = this.palette.offsetWidth;
        const h = this.palette.offsetHeight;
        const left = Math.max(4, Math.min(x - box.left + 6, box.width - w - 4));
        const top = Math.max(4, Math.min(y - box.top + 6, box.height - h - 4));
        this.palette.style.left = `${left}px`;
        this.palette.style.top = `${top}px`;
    }

    /**
     * Choose where a block goes: the + signs are marked and the next one clicked (or chosen with Enter) receives it.
     *
     * @param {string} id block id
     * @param {boolean} copy true to put a copy there, false to move the block
     */
    startPlacing(id, copy) {
        this.endPlacing();
        this.placing = {id, copy};
        this.root.classList.add('tiny_algorithm-placing');
        this.placeNote = el('p', {'class': 'tiny_algorithm-place-note', role: 'status'}, this.t('placehint'));
        this.toolbar.after(this.placeNote);
        const first = this.canvas.querySelector('.tiny_algorithm-slot');
        if (first) {
            this.focusables().forEach((it) => it.setAttribute('tabindex', '-1'));
            first.setAttribute('tabindex', '0');
            first.focus();
        }
    }

    endPlacing() {
        if (this.placeNote) {
            this.placeNote.remove();
            this.placeNote = null;
        }
        this.root.classList.remove('tiny_algorithm-placing');
        this.placing = null;
    }

    /**
     * Put the block being placed at a + sign (a move into the block itself is not possible and is ignored).
     *
     * @param {Element} slotEl the + sign
     */
    placeAt(slotEl) {
        const {id, copy} = this.placing;
        const s = this.slots[Number(slotEl.dataset.slot)];
        const f = findBlock(this.program, id);
        if (!f || !s) {
            this.endPlacing();
            return;
        }
        if (copy) {
            this.endPlacing();
            this.insertBlocks([copyBlock(f.block)], s.list, s.index);
            return;
        }
        if (!canMoveBlock(this.program, id, s.list, s.index)) {
            return;
        }
        this.endPlacing();
        this.focusTarget = `n${id}`;
        this.refocus = true;
        this.commit(() => {
            moveBlock(this.program, id, s.list, s.index);
            this.selected = id;
        });
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
            showToast(this.root, this.t('deleted'), {label: this.t('undo'), run: () => this.undo()});
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
        if (this.parsons) {
            // Copies would add blocks to the problem; a cut block could be pasted twice.
            e.preventDefault();
            return;
        }
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
        if (this.parsons) {
            e.preventDefault();
            return;
        }
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
        clearTimeout(this.longPress);
        if (node && e.pointerType === 'touch') {
            // A long press on a block opens its menu, like a right click.
            const at = {clientX: e.clientX, clientY: e.clientY, target: e.target, preventDefault: () => null};
            this.longPress = setTimeout(() => {
                if (this.press && !this.drag) {
                    this.press = null;
                    this.onContextMenu(at);
                }
            }, LONG_PRESS);
        }
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
            clearTimeout(this.longPress);
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
        clearTimeout(this.longPress);
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
        let matrix = false;
        this.program.functions.forEach((f) => {
            matrix = matrix || f.params.some((p) => p.matrix);
            walk(f.body, (b) => {
                matrix = matrix || (b.type === 'declare' && isMatrix(b));
            });
        });
        if (matrix) {
            this.log(this.t('fprgmatrix'), 'tiny_algorithm-error'); // Flowgorithm has no matrices.
            return;
        }
        const warnings = [];
        this.download(`${this.program.name || 'algorithm'}.fprg`, exportFprg(this.program, warnings), 'application/xml');
        if (warnings.length) {
            this.log(warnings.join('\n'), 'tiny_algorithm-info');
        }
    }

    /**
     * Download all functions as one picture. The SVG keeps the model, so it can be inserted and edited again.
     *
     * @param {string} format svg or png
     */
    exportImage(format) {
        const svg = renderProgram(this.program);
        const name = this.program.name || 'algorithm';
        if (format === 'svg') {
            this.download(`${name}.svg`, svg, 'image/svg+xml');
            return;
        }
        // PNG at twice the size, so it stays sharp in documents and slides.
        const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth * 2;
            canvas.height = img.naturalHeight * 2;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => blob && this.download(`${name}.png`, blob, 'image/png'), 'image/png');
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
    }

    exportCode() {
        this.download(`main.${extensionOf(this.codeLang)}`, this.codeText || '', 'text/plain');
    }

    copyImage() {
        const svg = renderProgram(this.program);
        const name = this.program.name || 'algorithm';
        const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth * 2;
            canvas.height = img.naturalHeight * 2;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                    navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(() => {
                        showToast(this.root, this.t('copiedimage'));
                        return true;
                    }).catch(() => {
                        this.download(`${name}.png`, blob, 'image/png');
                    });
                } else if (blob) {
                    this.download(`${name}.png`, blob, 'image/png');
                }
            }, 'image/png');
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
    }

    openInCodeLab() {
        if (!this.codeText) {
            return;
        }
        const langMap = {
            python: 'python',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            java: 'java',
            javascript: 'javascript',
        };
        const targetLang = langMap[this.codeLang] || this.codeLang;
        try {
            window.sessionStorage.setItem('codelab_import', JSON.stringify({
                lang: targetLang,
                code: this.codeText,
                source: 'tiny_algorithm',
                timestamp: Date.now(),
            }));
        } catch (e) {
            // Storage might be restricted.
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this.codeText).catch(() => undefined);
        }
        showToast(this.root, this.t('codelabcopied'));
    }

    showTemplates() {
        let selectedCategory = 'all';
        const listContainer = el('div', {'class': 'tiny_algorithm-templates-list'});

        const renderList = () => {
            const filtered = selectedCategory === 'all'
                ? TEMPLATES
                : TEMPLATES.filter((tmpl) => tmpl.category === selectedCategory);

            listContainer.replaceChildren(...filtered.map((tmpl) => {
                const title = tmpl.title || tmpl.fallbackTitle;
                const desc = tmpl.desc || tmpl.fallbackDesc;
                const btnLoad = el('button', {
                    type: 'button',
                    'class': 'btn btn-primary btn-sm ml-2 ms-2 text-nowrap',
                    onclick: () => {
                        const mainFn = this.program.functions && this.program.functions[0];
                        const hasBlocks = (this.program.functions && this.program.functions.length > 1) ||
                            (mainFn && mainFn.body && mainFn.body.length > 0);
                        // eslint-disable-next-line no-alert
                        if (hasBlocks && !confirm(this.t('confirmtemplate'))) {
                            return;
                        }
                        this.commit(() => {
                            this.program = cloneProgram(tmpl.build());
                            this.selected = null;
                            this.fnIndex = 0;
                        });
                        this.refresh();
                        dlg.close();
                        showToast(this.root, this.t('loadedtemplate'));
                    },
                }, this.t('loadtemplate'));

                return el('div', {'class': 'tiny_algorithm-template-item card mb-2'},
                    el('div', {'class': 'card-body p-2 d-flex justify-content-between align-items-center'},
                        el('div', {'class': 'mr-2 me-2'},
                            el('div', {'class': 'font-weight-bold fw-bold'}, title),
                            el('div', {'class': 'text-muted small'}, desc)
                        ),
                        btnLoad
                    )
                );
            }));
        };

        const cats = [
            ['all', 'templates_all'],
            ['linear', 'templates_linear'],
            ['branching', 'templates_branching'],
            ['loops', 'templates_loops'],
            ['arrays', 'templates_arrays'],
        ];

        const catNav = el('div', {'class': 'btn-group btn-group-sm mb-3 w-100', role: 'group'},
            ...cats.map(([catId, labelKey]) => {
                const b = el('button', {
                    type: 'button',
                    'class': `btn btn-outline-secondary ${catId === selectedCategory ? 'active' : ''}`,
                    onclick: () => {
                        selectedCategory = catId;
                        catNav.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
                        b.classList.add('active');
                        renderList();
                    },
                }, this.t(labelKey));
                return b;
            })
        );

        renderList();
        const body = el('div', {'class': 'tiny_algorithm-templates-wrap',
            style: 'max-height: 420px; overflow-y: auto; min-width: 340px;'},
        catNav, listContainer);

        const dlg = openDialog(this.root, this.t('templates_title'), body);
    }

    // ---- Execution --------------------------------------------------------------------------------------------------------

    log(text, cls = '') {
        const line = el('div', {'class': `tiny_algorithm-line ${cls}`}, text);
        this.consoleEl.append(line);
        this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
        return line;
    }

    highlight(id) {
        markCode(this.codeEl, id);
        this.canvas.querySelectorAll('.tiny_algorithm-running').forEach((n) => n.classList.remove('tiny_algorithm-running'));
        if (!id) {
            showBranch(this.canvas, null);
        }
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

    /**
     * Keys of the whole editor: F5 runs or continues, F10 steps, F9 sets or removes the breakpoint of the selected block.
     *
     * @param {KeyboardEvent} e
     */
    onRunKey(e) {
        if (e.key === 'F5' || e.key === 'F10') {
            e.preventDefault();
            this.start(e.key === 'F10');
        } else if (e.key === 'F8') {
            e.preventDefault();
            this.stepBack();
        } else if (e.key === 'F9' && this.selected) {
            e.preventDefault();
            this.toggleBreakpoint(this.selected);
        } else if (e.key === '?' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
            e.preventDefault();
            openShortcuts(this.root);
        }
    }

    /**
     * The File menu: import, export, pictures (when the question allows them), the trace table and the shortcuts.
     *
     * @param {Event} e click
     */
    toggleFileMenu(e) {
        e.stopPropagation();
        if (this.fileMenu) {
            this.closeFileMenu();
            return;
        }
        const item = (key, run) => el('button', {type: 'button', role: 'menuitem', 'class': 'dropdown-item', onclick: () => {
            this.closeFileMenu();
            run();
        }}, this.t(key));
        const files = this.fileTools ? [
            item('templates', () => this.showTemplates()), item('importcode', () => this.showCodeImport()),
            el('hr', {'class': 'dropdown-divider'}),
            item('import', () => this.fileInput.click()), item('export', () => this.exportFile()),
            item('copyimage', () => this.copyImage()),
            item('exportsvg', () => this.exportImage('svg')), item('exportpng', () => this.exportImage('png')),
            el('hr', {'class': 'dropdown-divider'})] : [];
        this.fileMenu = el('div', {'class': 'tiny_algorithm-filemenu', role: 'menu', onkeydown: (ev) => {
            const items = [...this.fileMenu.querySelectorAll('[role="menuitem"]')];
            const at = items.indexOf(document.activeElement);
            if (ev.key === 'Escape') {
                ev.stopPropagation();
                this.closeFileMenu();
                this.btnFile.focus();
            } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                items[(at + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
            }
        }}, ...files, item('trace', () => this.showTrace()), item('complexity', () => this.showComplexity()),
            item('exprhelp', () => openHelp(this.root)),
            item('shortcuts', () => openShortcuts(this.root)));
        this.btnFile.after(this.fileMenu);
        // The toolbar is a flex row: an absolute child without a position would go to its start, so put it under the button.
        const room = this.toolbar.clientWidth - this.fileMenu.offsetWidth - 4;
        this.fileMenu.style.left = `${Math.max(0, Math.min(this.btnFile.offsetLeft, room))}px`;
        this.fileMenu.style.top = `${this.btnFile.offsetTop + this.btnFile.offsetHeight + 2}px`;
        this.btnFile.setAttribute('aria-expanded', 'true');
        this.fileMenu.querySelector('button').focus();
        this.closeOnOutside = (ev) => {
            if (this.fileMenu && !this.fileMenu.contains(ev.target) && !this.btnFile.contains(ev.target)) {
                this.closeFileMenu();
            }
        };
        setTimeout(() => {
            if (this.fileMenu) {
                document.addEventListener('click', this.closeOnOutside);
            }
        }, 0);
    }

    closeFileMenu() {
        if (this.fileMenu) {
            this.fileMenu.remove();
            this.fileMenu = null;
            this.btnFile.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', this.closeOnOutside);
        }
    }

    /** The code beside the diagram when the editor is wide, under the console and the variables when it is not. */
    placeCode() {
        const wide = this.root.clientWidth >= WIDE;
        if (wide && this.tabCode.parentElement !== this.main) {
            this.main.append(this.tabCode);
        } else if (!wide && this.tabCode.parentElement !== this.side) {
            this.side.append(this.tabCode);
        }
        this.root.classList.toggle('tiny_algorithm-wide', wide);
    }

    /**
     * Show one pane of the side panel (narrow screens).
     *
     * @param {string} key console, watch or code
     */
    showTab(key) {
        this.side.dataset.sidetab = key;
        this.tabBar.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected',
            String(b.dataset.sidetab === key)));
    }

    /**
     * Step through the algorithm with given input values (a failed test): they are entered by themselves.
     *
     * @param {string[]} values input values, one per input
     */
    startWithInputs(values) {
        if (this.running) {
            this.stop();
            return;
        }
        this.pendingInputs = [...values];
        this.start(true);
    }

    /**
     * Code to diagram: Python pasted in a field becomes the algorithm (one undo step). Lines that have no block
     * become comments and are listed.
     */
    showCodeImport() {
        const area = el('textarea', {'class': 'form-control tiny_algorithm-ci-code', rows: '10', spellcheck: 'false',
            'aria-label': this.t('ciarea'), placeholder: 'n = int(input())\nfor i in range(1, n + 1):\n    print(i * i)'});
        const note = el('div', {'class': 'tiny_algorithm-ci-note', role: 'status'});
        let dlg = null;
        const make = () => {
            const result = importPython(area.value, {name: this.program.name || 'Program'});
            if (!result.blocks) {
                note.textContent = this.t('ciempty');
                return;
            }
            const mainFn = this.program.functions && this.program.functions[0];
            const hasBlocks = this.program.functions.length > 1 || (mainFn && mainFn.body && mainFn.body.length > 0);
            // eslint-disable-next-line no-alert
            if (hasBlocks && !confirm(this.t('ciconfirm'))) {
                return;
            }
            this.setProgram(result.program);
            showToast(this.root, tr('cidone', {blocks: String(result.blocks)}));
            if (!result.warnings.length) {
                dlg.close();
                return;
            }
            // The lines that became comments, so they can be drawn by hand.
            note.replaceChildren(el('p', {}, this.t('ciwarnings')), el('ul', {}, result.warnings.map((w) =>
                el('li', {}, tr('ciline', {line: String(w.line), text: w.text})))));
        };
        const body = el('div', {'class': 'tiny_algorithm-ci'}, el('p', {}, this.t('ciintro')), area, note);
        dlg = openDialog(this.root, this.t('importcode'), body, [el('button', {type: 'button',
            'class': 'btn btn-primary btn-sm', onclick: make}, this.t('cimake'))]);
        area.focus();
    }

    /** How fast the algorithm grows: its steps for several sizes n, beside a template to compare with. */
    showComplexity() {
        openComplexity(this.root, cloneProgram(this.program), {others: TEMPLATES.map((tmpl) => ({
            label: tmpl.title || tmpl.fallbackTitle, build: tmpl.build}))});
    }

    /** The trace table of the last run; a row selects its block. */
    showTrace() {
        openTrace(this.root, this.trace, {cut: this.traceCut,
            select: (id) => this.selectFromCode(id, false),
            download: this.fileTools ? (name, text, type) => this.download(name, text, type) : null});
    }

    /**
     * A bar above an empty diagram that says where to start; once closed it stays closed (in this browser).
     *
     * @returns {HTMLElement}
     */
    emptyBar() {
        let closed = false;
        try {
            closed = window.localStorage.getItem('tiny_algorithm_emptyhint') === '1';
        } catch (e) {
            closed = false;
        }
        this.emptyHint = el('div', {'class': 'tiny_algorithm-emptybar', hidden: true},
            el('span', {}, this.t('emptyhint'), ' ', el('button', {type: 'button', 'class': 'btn btn-link btn-sm p-0',
                onclick: () => openShortcuts(this.root)}, `${this.t('shortcuts')} (?)`)),
            el('button', {type: 'button', 'class': 'btn btn-link btn-sm tiny_algorithm-emptybar-close',
                'aria-label': this.t('close'),
                title: this.t('close'), onclick: () => {
                    this.emptyHint.remove();
                    this.emptyHint = null;
                    try {
                        window.localStorage.setItem('tiny_algorithm_emptyhint', '1');
                    } catch (e) {
                        // Without storage the bar comes back next time.
                    }
                }}, '×'));
        if (closed) {
            this.emptyHint.remove();
            this.emptyHint = null;
            return [];
        }
        return this.emptyHint;
    }

    /**
     * Set or remove a breakpoint: Run stops before the block and continues with Step or Continue.
     *
     * @param {string} id block id
     */
    toggleBreakpoint(id) {
        if (this.breakpoints.has(id)) {
            this.breakpoints.delete(id);
        } else {
            this.breakpoints.add(id);
        }
        markRun(this.canvas, this.codeEl, this.breakpoints, this.errorId);
        this.announcer.textContent = this.t(this.breakpoints.has(id) ? 'breakpointset' : 'breakpointremoved');
    }

    /**
     * Ask for an input value in the console; a hint says what was wrong with the previous one.
     *
     * @param {Object} run the run
     * @param {Object} ev input event
     * @param {string} hint
     * @returns {Promise<?string>}
     */
    askInput(run, ev, hint) {
        if (!hint && this.pendingInputs && this.pendingInputs.length) {
            // Values of a test are entered by themselves.
            const v = this.pendingInputs.shift();
            this.log(`${ev.name} (${ev.type}) ? ${v}`);
            return Promise.resolve(v);
        }
        return new Promise((resolve) => {
            const row = this.log(`${ev.name} (${ev.type}) ? `);
            readLine(row, ev, hint, (key) => this.t(key), (v) => {
                run.wake = null;
                resolve(v);
            });
            run.wake = () => resolve(null);
        });
    }

    /**
     * Show the state of the run next to the buttons.
     *
     * @param {string} state running, paused, done, stopped or error
     * @param {number} step steps so far
     */
    showStatus(state, step) {
        this.statusEl.hidden = state === 'running' && !step;
        this.statusEl.className = `tiny_algorithm-status tiny_algorithm-status-${state}`;
        this.statusEl.textContent = tr(`status${state}`, {step});
        this.btnRun.textContent = this.t(state === 'paused' ? 'resume' : 'run');
        this.btnRun.title = this.btnRun.textContent;
        const run = this.running || this.lastRun;
        this.btnBack.disabled = !run || step < 2;
        if (run) {
            this.timeline.update(step, run.horizon || step);
        }
    }

    /** Step back: the run is repeated up to the step before this one and pauses there. */
    stepBack() {
        const run = this.running || this.lastRun;
        if (run && run.steps > 1) {
            this.goTo(run.steps - 1);
        }
    }

    /**
     * Repeat the run (the same Random numbers and input values) up to a step and pause there.
     *
     * @param {number} step step to reach
     */
    goTo(step) {
        const replay = replayTo(this.running || this.lastRun, step);
        if (!replay) {
            return;
        }
        if (this.running) {
            // The run ends quietly and the repeat starts when it has ended.
            this.running.next = replay;
            this.running.clear = true;
            this.stop();
            return;
        }
        this.runFrom(true, replay);
    }

    /**
     * Run or Step: a new run, or the paused run goes on.
     *
     * @param {boolean} stepMode one step (else to the end or the next breakpoint)
     */
    start(stepMode) {
        if (this.running) {
            if (this.running.asking) {
                // The algorithm waits for a value: Run and Step wait for it too.
                return Promise.resolve();
            }
            // Paused or running: Step goes one step on, Run (Continue) runs on to the end or the next breakpoint.
            this.running.stepMode = stepMode;
            if (this.running.wake) {
                this.running.wake();
            }
            return Promise.resolve();
        }
        return this.runFrom(stepMode, null);
    }

    /**
     * A new run from the start.
     *
     * @param {boolean} stepMode pause before the first block
     * @param {?Object} replay a repeat up to a step (step back, the timeline): {until, replay, seed, horizon}
     */
    async runFrom(stepMode, replay) {
        this.closePalette();
        const run = {stepMode, stopped: false, wake: null, timer: null, ...(replay || {})};
        this.running = run;
        this.errorId = null;
        this.consoleEl.replaceChildren();
        this.watch.clear();
        this.turtle.reset();
        this.filesPanel.reset();
        this.refresh();
        // A new panel for every run: the index variables come from the algorithm as it is now.
        this.arrayView = usesArrays(this.program) ? new ArrayView(this.program, this.lang) : null;
        this.tabArrays.replaceChildren(this.tabArrays.firstChild, ...(this.arrayView ? [this.arrayView.root] : []));
        const ui = {
            program: this.program,
            breakpoints: this.breakpoints,
            delay: () => Number(this.speed.max) - Number(this.speed.value),
            highlight: (id) => this.highlight(id),
            branch: (ev) => showBranch(this.canvas, ev),
            watch: (vars, stack) => this.watch.update(vars, stack),
            turtle: (ev) => this.turtle.apply(ev),
            file: (ev) => this.filesPanel.apply(ev),
            arrays: this.arrayView ? (ev) => this.arrayView.update(ev) : null,
            output: (text) => this.flushOutput(text),
            info: (text) => this.log(text, 'tiny_algorithm-info'),
            error: (text, id) => this.showError(text, id),
            ask: (ev, hint) => this.askInput(run, ev, hint),
            given: (ev, value) => this.log(`${ev.name} (${ev.type}) ? ${value}`),
            status: (state, step) => this.showStatus(state, step),
            announce: (text) => {
                this.announcer.textContent = text;
            },
        };
        try {
            this.trace = await runSession(ui, run);
            this.traceCut = Boolean(run.traceCut);
        } finally {
            this.running = null;
            this.lastRun = run.next ? null : run;
            this.pendingInputs = null;
            this.highlight(null);
            this.refresh();
        }
        if (run.next) {
            await this.runFrom(true, run.next);
        }
    }

    /**
     * An error stopped the algorithm: the message, a link to the block, the block and its code lines in red.
     *
     * @param {string} text message
     * @param {?string} id block that was running
     */
    showError(text, id) {
        const line = this.log(`${this.t('error')}: ${text}`, 'tiny_algorithm-error');
        this.errorId = id;
        if (!id) {
            return;
        }
        const fn = this.program.functions.findIndex((f) => findBlock({functions: [f]}, id));
        line.append(' ', el('button', {type: 'button', 'class': 'btn btn-link btn-sm tiny_algorithm-showblock',
            onclick: () => this.selectFromCode(id, true)}, this.t('showblock')));
        if (fn >= 0 && fn !== this.fnIndex) {
            this.fnIndex = fn;
        }
        // Drawn by the refresh at the end of the run; also show it in the diagram now.
        setTimeout(() => revealNode(this.canvas, id), 0);
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
