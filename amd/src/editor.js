/**
 * Interactive algorithm editor widget. Framework independent (plain DOM) so it can run
 * inside a Moodle modal or in the standalone test harness.
 *
 * @module tiny_algorithm/editor
 */
import {createBlock, createProgram, findBlock, cloneProgram} from './model';
import {renderFunction, renderProgram} from './render';
import {execute} from './interpreter';
import {checkExpr} from './expr';
import {generate, languages, extensionOf} from './codegen';
import {importFprg, exportFprg} from './flowgorithm';
import {t as tr} from './strings';
import {Zoom} from './zoom';

const PALETTE = ['declare', 'assign', 'input', 'output', 'if', 'for', 'while', 'dowhile', 'call', 'return', 'comment'];

const FIELDS = {
    declare: [['name', 'text'], ['varType', 'type'], ['size', 'text']],
    assign: [['target', 'expr'], ['expr', 'expr']],
    input: [['target', 'expr']],
    output: [['expr', 'expr'], ['newline', 'bool']],
    if: [['cond', 'expr']],
    while: [['cond', 'expr']],
    dowhile: [['cond', 'expr']],
    for: [['variable', 'text'], ['start', 'expr'], ['end', 'expr'], ['step', 'expr']],
    call: [['expr', 'expr']],
    return: [['expr', 'expr']],
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

export class AlgorithmEditor {
    constructor(container, {program = null, lang = null} = {}) {
        this.lang = lang;
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
        const btn = (key, fn, extra = {}) => el('button', {type: 'button', class: 'btn btn-secondary btn-sm alg-btn', onclick: fn,
            title: this.t(key), ...extra}, this.t(key));
        this.fnSelect = el('select', {class: 'custom-select custom-select-sm alg-fnselect', onchange: () => {
            this.fnIndex = Number(this.fnSelect.value);
            this.selected = null;
            this.refresh();
        }});
        this.speed = el('input', {type: 'range', min: 0, max: 1000, value: 600, class: 'alg-speed', title: this.t('speed')});
        this.fileInput = el('input', {type: 'file', accept: '.fprg,.xml', hidden: true, onchange: (e) => this.importFile(e)});
        this.btnUndo = btn('undo', () => this.undo());
        this.btnRedo = btn('redo', () => this.redo());
        this.btnRun = btn('run', () => this.start(false));
        this.btnStep = btn('step', () => this.start(true));
        this.btnStop = btn('stop', () => this.stop());

        this.toolbar = el('div', {class: 'alg-toolbar'},
            this.fnSelect, btn('addfn', () => this.addFunction()), btn('delfn', () => this.removeFunction()),
            el('span', {class: 'alg-sep'}), this.btnUndo, this.btnRedo,
            el('span', {class: 'alg-sep'}), this.btnRun, this.btnStep, this.btnStop, this.speed,
            el('span', {class: 'alg-sep'}), el('span', {class: 'alg-zoom-slot'}),
            el('span', {class: 'alg-sep'}), btn('import', () => this.fileInput.click()), btn('export', () => this.exportFile()),
            this.fileInput);
        this.canvas = el('div', {class: 'alg-canvas', tabindex: '0', onclick: (e) => this.onCanvasClick(e),
            onkeydown: (e) => this.onKey(e)});
        this.zoom = new Zoom(this.canvas);
        this.toolbar.querySelector('.alg-zoom-slot').replaceWith(this.zoom.controls((key) => this.t(key)));
        this.props = el('div', {class: 'alg-props'});
        this.consoleEl = el('div', {class: 'alg-console', role: 'log'});
        this.codeEl = el('pre', {class: 'alg-code'});
        this.codeSelect = el('select', {class: 'custom-select custom-select-sm', onchange: () => {
            this.codeLang = this.codeSelect.value;
            this.renderCode();
        }}, languages.map((l) => el('option', {value: l}, l === 'c' ? 'C' : l[0].toUpperCase() + l.slice(1))));
        this.copyBtn = btn('copy', () => navigator.clipboard && navigator.clipboard.writeText(this.codeEl.textContent));
        this.dlBtn = btn('download', () => this.exportCode());
        this.tabConsole = el('div', {class: 'alg-pane'}, el('h6', {}, this.t('console')), this.consoleEl);
        this.tabCode = el('div', {class: 'alg-pane'}, el('h6', {}, this.t('code'), ' ', this.codeSelect, ' ', this.copyBtn, ' ', this.dlBtn), this.codeEl);
        this.side = el('div', {class: 'alg-side'}, this.props, this.tabConsole, this.tabCode);
        this.root = el('div', {class: 'alg-editor'}, this.toolbar, el('div', {class: 'alg-main'}, this.canvas, this.side));
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

    getSvg() {
        return renderProgram(this.program);
    }

    // ---- Rendering --------------------------------------------------------------------------------------------------------

    refresh() {
        this.fnSelect.replaceChildren(...this.program.functions.map((f, i) => el('option', {value: i, selected: i === this.fnIndex}, f.name)));
        const {svg, slots} = renderFunction(this.fn, {editable: !this.running});
        this.slots = slots;
        this.canvas.innerHTML = svg;
        this.zoom.apply();
        this.canvas.querySelectorAll('.alg-node').forEach((n) => {
            n.classList.toggle('alg-selected', n.dataset.id === this.selected);
        });
        this.btnUndo.disabled = !this.undoStack.length;
        this.btnRedo.disabled = !this.redoStack.length;
        this.btnRun.disabled = Boolean(this.running);
        this.btnStop.disabled = !this.running;
        this.renderProps();
        this.renderCode();
    }

    renderCode() {
        try {
            this.codeEl.textContent = generate(this.codeLang, this.program);
        } catch (e) {
            this.codeEl.textContent = `// ${e.message}`;
        }
    }

    field(label, type, value, onInput) {
        const id = `alg-f-${Math.random().toString(36).slice(2)}`;
        let input;
        if (type === 'bool') {
            input = el('input', {type: 'checkbox', id, checked: value !== false, onchange: () => onInput(input.checked)});
        } else if (type === 'type') {
            input = el('select', {id, class: 'custom-select custom-select-sm', onchange: () => onInput(input.value)},
                ['Integer', 'Real', 'String', 'Boolean'].map((v) => el('option', {value: v, selected: v === value}, v)));
        } else {
            input = el('input', {id, type: 'text', class: 'form-control form-control-sm', value: value ?? '', spellcheck: 'false',
                oninput: () => {
                    if (type === 'expr') {
                        const err = checkExpr(input.value || '0');
                        input.classList.toggle('is-invalid', Boolean(err) && input.value.trim() !== '');
                        input.title = err || '';
                    }
                },
                onchange: () => onInput(input.value)});
        }
        return el('div', {class: 'form-group alg-field'}, el('label', {for: id}, label), input);
    }

    renderProps() {
        const found = this.selected ? findBlock(this.program, this.selected) : null;
        if (!found) {
            this.props.replaceChildren(el('h6', {}, this.t('function')),
                this.field(this.t('name'), 'text', this.fn.name, (v) => this.commit(() => {
                    this.fn.name = v.trim() || this.fn.name;
                })),
                this.field(this.t('params'), 'text', this.fn.params.map((p) => `${p.name}: ${p.type}`).join(', '), (v) => this.commit(() => {
                    this.fn.params = v.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
                        const [name, type] = s.split(':').map((x) => x.trim());
                        return {name, type: type || 'Integer', array: false};
                    });
                })),
                this.field(this.t('returns'), 'text', this.fn.returnType || '', (v) => this.commit(() => {
                    this.fn.returnType = v.trim() || null;
                })),
                el('p', {class: 'text-muted small'}, this.t('hint')));
            return;
        }
        const b = found.block;
        const rows = FIELDS[b.type].map(([key, kind]) => this.field(this.t(`f.${key}`), kind, b[key], (v) => this.commit(() => {
            b[key] = v;
        })));
        const act = (label, fn, cls = 'btn-secondary') => el('button', {type: 'button', class: `btn btn-sm ${cls}`, onclick: fn}, label);
        this.props.replaceChildren(el('h6', {}, this.t(`b.${b.type}`)), ...rows, el('div', {class: 'alg-actions'},
            act(this.t('up'), () => this.move(-1)), act(this.t('down'), () => this.move(1)),
            act(this.t('delete'), () => this.deleteSelected(), 'btn-outline-danger')));
    }

    // ---- Interaction ------------------------------------------------------------------------------------------------------

    onCanvasClick(e) {
        if (this.running) {
            return;
        }
        const slot = e.target.closest('.alg-slot');
        const node = e.target.closest('.alg-node');
        this.closePalette();
        if (slot) {
            this.openPalette(this.slots[Number(slot.dataset.slot)], e);
        } else {
            this.selected = node && !['start', 'end'].includes(node.dataset.id) ? node.dataset.id : null;
            this.refresh();
        }
    }

    onKey(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected && e.target === this.canvas) {
            this.deleteSelected();
        } else if (e.key === 'Enter' && e.target.closest && e.target.closest('.alg-slot')) {
            const slot = e.target.closest('.alg-slot');
            this.openPalette(this.slots[Number(slot.dataset.slot)], e);
        } else if (e.ctrlKey && e.key === 'z') {
            this.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            this.redo();
        }
    }

    openPalette(slot, e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX || rect.left + 20) - rect.left + this.canvas.scrollLeft;
        const y = (e.clientY || rect.top + 20) - rect.top + this.canvas.scrollTop;
        this.palette = el('div', {class: 'alg-palette', role: 'menu', style: `left:${x + 6}px;top:${y + 6}px`},
            PALETTE.map((type) => el('button', {type: 'button', role: 'menuitem', class: 'btn btn-sm btn-light', onclick: (ev) => {
                ev.stopPropagation();
                this.closePalette();
                const block = createBlock(type);
                this.commit(() => {
                    slot.list.splice(slot.index, 0, block);
                    this.selected = block.id;
                });
            }}, this.t(`b.${type}`))));
        this.canvas.append(this.palette);
        const first = this.palette.querySelector('button');
        if (first) {
            first.focus();
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
            let n = this.program.functions.length;
            while (this.program.functions.some((f) => f.name === `Function${n}`)) {
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
            this.log(warnings.length ? `${this.t('imported')}\n${warnings.join('\n')}` : this.t('imported'), 'alg-info');
        }).catch((err) => this.log(err.message, 'alg-error'));
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
        const line = el('div', {class: `alg-line ${cls}`}, text);
        this.consoleEl.append(line);
        this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
        return line;
    }

    highlight(id) {
        this.canvas.querySelectorAll('.alg-running').forEach((n) => n.classList.remove('alg-running'));
        const n = id && this.canvas.querySelector(`.alg-node[data-id="${id}"]`);
        if (n) {
            n.classList.add('alg-running');
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
        });
    }

    askInput(run, ev) {
        return new Promise((resolve) => {
            const input = el('input', {type: 'text', class: 'form-control form-control-sm alg-input',
                'aria-label': `${ev.name} (${ev.type})`, onkeydown: (e) => {
                    if (e.key === 'Enter') {
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
        this.refresh();
        try {
            const gen = execute(this.program);
            let res = gen.next();
            while (!res.done && !run.stopped) {
                const ev = res.value;
                if (ev.event === 'step') {
                    this.highlight(ev.id);
                    await this.waitNext(run);
                } else if (ev.event === 'output') {
                    this.flushOutput(ev.text);
                } else if (ev.event === 'input') {
                    const v = await this.askInput(run, ev);
                    res = gen.next(v);
                    continue;
                }
                res = gen.next();
            }
            this.log(run.stopped ? this.t('stopped') : this.t('finished'), 'alg-info');
        } catch (err) {
            this.log(`${this.t('error')}: ${err.message}`, 'alg-error');
        } finally {
            this.running = null;
            this.highlight(null);
            this.refresh();
        }
    }

    flushOutput(text) {
        const last = this.consoleEl.lastElementChild;
        if (last && last.classList.contains('alg-out') && !last.dataset.closed) {
            last.textContent += text.replace(/\n$/, '');
            if (text.endsWith('\n')) {
                last.dataset.closed = '1';
            }
        } else {
            const line = this.log(text.replace(/\n$/, ''), 'alg-out');
            if (text.endsWith('\n')) {
                line.dataset.closed = '1';
            }
        }
    }
}
