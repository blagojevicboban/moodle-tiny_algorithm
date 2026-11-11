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
 * Read-only runner widget: draws a program and lets readers Run / Step it (used by filter_algorithm).
 *
 * @module tiny_algorithm/runner
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {runSession} from './session';
import {openTrace} from './trace';
import {attachNotes, notesList} from './notes';
import {TurtleView, usesTurtle} from './turtle';
import {FilesPanel, usesFiles} from './files';
import {ArrayView, usesArrays} from './arrayview';
import {markRun} from './runmarks';
import {renderProgram, showBranch} from './render';
import {errorText, t as tr} from './strings';
import {Zoom} from './zoom';
import {Watch} from './watch';
import {generate, languageLabels} from './codegen';
import {pickLanguage, rememberLanguage} from './codelang';
import {SELECTED, blockAt, markCode, nextBlock, revealNode, showCode} from './codeview';
import {readLine} from './consoleinput';
import {Timeline, replayTo} from './timeline';
import {openComplexity, sizeTargets} from './complexity';
import {TEMPLATES} from './templates';

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

// Icons of the full screen button (four corners out, four corners in); the text is in its title and aria-label.
const icon = (d) => '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const FULL_ICON = icon('M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4');
const EXIT_ICON = icon('M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4');

export class AlgorithmRunner {
    /**
     * @param {HTMLElement} host element that receives the widget
     * @param {object} program algorithm model
     * @param {object} [opts]
     * @param {string} [opts.lang] UI language code
     * @param {boolean} [opts.showCode] show the generated code panel (and its toggle button)
     * @param {boolean} [opts.showWatch] show the variable watch panel (and its toggle button)
     * @param {boolean} [opts.fullscreen] offer the full screen button (off inside a student workspace, which has its own)
     * @param {Object} [opts.codeConfig] code languages of the site and the course (tiny_algorithm/codelang)
     */
    constructor(host, program, {lang = null, showCode = true, showWatch = true, fullscreen = true, codeConfig = {}} = {}) {
        this.program = program;
        this.lang = lang;
        this.showCode = showCode;
        this.showWatch = showWatch;
        this.canFullscreen = fullscreen;
        this.running = null;
        this.selected = null;
        this.breakpoints = new Set();
        this.errorId = null;
        this.trace = [];
        this.codeConfig = codeConfig || {};
        this.codeChoice = pickLanguage(program, this.codeConfig);
        this.codeLang = this.codeChoice.lang;
        this.build(host);
    }

    t(key) {
        return tr(key, this.lang);
    }

    build(host) {
        const btn = (key, fn) => el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: fn}, this.t(key));
        // The diagram scrolls, so it takes the keyboard focus (arrow keys scroll it).
        this.svgHost = el('div', {'class': 'tiny_algorithm-view-svg', tabindex: '0', role: 'group',
            'aria-label': this.t('diagram')});
        this.svgHost.innerHTML = renderProgram(this.program);
        this.zoom = new Zoom(this.svgHost);
        this.svgHost.addEventListener('click', (e) => this.onDiagramClick(e));
        this.speed = el('input', {
            type: 'range', min: 0, max: 1000, value: 600, 'class': 'tiny_algorithm-speed', 'aria-label': this.t('speed'),
        });
        this.consoleEl = el('div', {'class': 'tiny_algorithm-console', role: 'log', 'aria-live': 'polite'});
        this.statusEl = el('span', {'class': 'tiny_algorithm-status', role: 'status', hidden: true});
        this.announcer = el('div', {'class': 'sr-only visually-hidden', 'aria-live': 'polite'});
        this.btnRun = btn('run', () => this.onRun());
        this.btnBack = btn('stepback', () => this.stepBack());
        this.btnBack.title = this.t('stepbackhint');
        this.btnBack.disabled = true;
        this.timeline = new Timeline((key, values) => tr(key, values), (step) => this.goTo(step));
        // The bar runs the algorithm and chooses the panels; the zoom and the full screen sit in the corner of the diagram.
        this.bar = el('div', {'class': 'tiny_algorithm-view-bar'},
            this.btnRun, this.btnBack, btn('step', () => this.onStep()), btn('reset', () => this.reset()),
            el('span', {'class': 'tiny_algorithm-speedbox'}, el('span', {'aria-hidden': 'true'}, this.t('slow')), this.speed,
                el('span', {'aria-hidden': 'true'}, this.t('fast'))),
            this.statusEl,
            el('span', {'class': 'tiny_algorithm-grow'}),
            btn('trace', () => openTrace(this.root, this.trace, {cut: this.traceCut, select: (id) => this.showBlock(id)})));
        // How fast the algorithm grows, when it has a size n (a value it reads or an Assign such as n = 8).
        if (sizeTargets(this.program).length) {
            this.bar.append(btn('complexity', () => openComplexity(this.root, this.program, {others: TEMPLATES.map((tmpl) => ({
                label: tmpl.title || tmpl.fallbackTitle, build: tmpl.build}))})));
        }
        const zoomBox = this.zoom.controls((key) => this.t(key));
        if (this.canFullscreen) {
            this.btnFull = el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm tiny_algorithm-zoom-btn',
                onclick: () => this.toggleFullscreen()});
            zoomBox.append(this.btnFull);
            this.updateFullscreenButton(false);
        }
        const canvas = el('div', {'class': 'tiny_algorithm-view-canvas'}, this.svgHost, zoomBox);
        this.watch = new Watch(this.lang);
        const mainParts = [canvas, this.bar, this.timeline.root, this.consoleEl];
        // The drawing of turtle graphics, only for an algorithm that uses the turtle.
        this.turtle = usesTurtle(this.program) ? new TurtleView(this.lang) : null;
        if (this.turtle) {
            mainParts.push(el('div', {'class': 'tiny_algorithm-view-turtle'}, el('strong', {}, this.t('turtle')),
                this.turtle.root));
        }
        // The arrays and matrices while the algorithm runs, only for an algorithm that has arrays.
        this.arrayView = usesArrays(this.program) ? new ArrayView(this.program, this.lang) : null;
        if (this.arrayView) {
            mainParts.push(el('div', {'class': 'tiny_algorithm-view-arrays'}, el('strong', {}, this.t('arrays')),
                this.arrayView.root));
        }
        // The files the algorithm reads, and those it writes.
        this.filesPanel = usesFiles(this.program) ? new FilesPanel({lang: this.lang}) : null;
        if (this.filesPanel) {
            this.filesPanel.setFiles(this.program.files);
            mainParts.push(el('div', {'class': 'tiny_algorithm-view-files'}, el('strong', {}, this.t('files')),
                this.filesPanel.root));
        }
        if (this.showWatch) {
            this.watchToggle = el('button', {type: 'button',
                'class': 'btn btn-secondary btn-sm tiny_algorithm-toggle tiny_algorithm-watch-toggle',
                onclick: () => this.toggleWatch()}, this.t('variables'));
            this.bar.append(this.watchToggle);
            mainParts.push(el('div', {'class': 'tiny_algorithm-view-watch'}, el('strong', {}, this.t('variables')),
                this.watch.root));
        }
        const main = el('div', {'class': 'tiny_algorithm-view-main'}, ...mainParts);
        // The comments are tooltips here; the titles stay for the saved picture.
        this.svgHost.querySelectorAll('title').forEach((n) => n.remove());
        // The algorithm as text, for screen readers and for printing.
        const description = el('details', {'class': 'tiny_algorithm-textdesc'}, el('summary', {}, this.t('textdescription')),
            el('pre', {}, generate('pseudo', this.program)));
        this.root = el('div', {'class': 'tiny_algorithm-viewer'}, main, this.announcer);
        attachNotes(this.svgHost, this.root);
        // All the comments at once (numbered in the diagram), only when some block has one.
        this.notes = notesList(this.svgHost, {title: this.t('comments'), select: (id) => this.showBlock(id)});
        if (this.notes) {
            this.notesToggle = el('button', {type: 'button',
                'class': 'btn btn-secondary btn-sm tiny_algorithm-toggle tiny_algorithm-notes-toggle',
                onclick: () => this.toggleNotes()}, this.t('comments'));
            this.bar.append(this.notesToggle);
            main.append(this.notes.root);
            this.showNotes(AlgorithmRunner.notesShown());
        }
        if (this.showWatch) {
            this.root.classList.toggle('tiny_algorithm-hide-watch', AlgorithmRunner.watchHidden());
            this.updateWatchToggle();
        }
        if (this.showCode) {
            this.codeEl = el('pre', {'class': 'tiny_algorithm-code', tabindex: '0', title: this.t('codehint'),
                onclick: (e) => this.showBlock(blockAt(e), false), onkeydown: (e) => this.onCodeKey(e)});
            this.codeSelect = el('select', {
                'class': 'custom-select custom-select-sm tiny_algorithm-codelang', 'aria-label': this.t('code'),
                onmousedown: (e) => e.stopPropagation(),
                onpointerdown: (e) => e.stopPropagation(),
                onclick: (e) => e.stopPropagation(),
                onchange: () => {
                    this.codeLang = this.codeSelect.value;
                    rememberLanguage(this.codeLang, this.codeConfig);
                    this.renderCode();
                },
                disabled: this.codeChoice.locked,
            }, this.codeChoice.allowed.map((l) => el('option', {value: l, selected: l === this.codeLang}, languageLabels[l])));
            this.codeToggle = el('button', {type: 'button',
                'class': 'btn btn-secondary btn-sm tiny_algorithm-toggle tiny_algorithm-code-toggle',
                onclick: () => this.toggleCode()}, this.t('code'));
            this.bar.append(this.codeToggle);
            const close = el('button', {type: 'button', 'class': 'btn btn-link btn-sm tiny_algorithm-code-close',
                onclick: () => this.toggleCode(), title: this.t('hidecode'), 'aria-label': this.t('hidecode')}, '×');
            this.codePane = el('div', {'class': 'tiny_algorithm-view-code'},
                el('div', {'class': 'tiny_algorithm-code-bar'}, el('strong', {}, this.t('code')), this.codeSelect,
                    btn('copy', () => navigator.clipboard && navigator.clipboard.writeText(this.codeText || '')), close),
                this.codeEl);
            this.root.append(this.codePane);
            this.renderCode();
            this.root.classList.toggle('tiny_algorithm-hide-code', AlgorithmRunner.codeHidden());
            this.updateCodeToggle();
        } else {
            this.root.classList.add('tiny_algorithm-no-code');
        }
        this.root.addEventListener('keydown', (e) => this.onRootKey(e));
        // After the code, so the code stays beside the diagram and the description goes under both.
        this.root.append(description);
        host.classList.add('tiny_algorithm-viewer-host');
        host.replaceChildren(this.root);
        // Large diagrams start fitted to the available width.
        requestAnimationFrame(() => this.zoom.autoFit());
    }

    /** Whether the reader chose to hide the code panel (remembered in this browser). */
    static codeHidden() {
        try {
            return window.localStorage.getItem('tiny_algorithm_hidecode') === '1';
        } catch (e) {
            return false;
        }
    }

    /** Show or hide the code panel and remember the choice. */
    toggleCode() {
        const hidden = this.root.classList.toggle('tiny_algorithm-hide-code');
        try {
            window.localStorage.setItem('tiny_algorithm_hidecode', hidden ? '1' : '0');
        } catch (e) {
            // Storage can be unavailable (private window); the choice then only lasts for this page.
        }
        this.updateCodeToggle();
        if (hidden) {
            this.showBlock(null);
        }
        requestAnimationFrame(() => this.zoom.autoFit());
    }

    /** Whether the code panel is shown, so a block of the diagram can be found in it. */
    codeShown() {
        return Boolean(this.codeEl) && !this.root.classList.contains('tiny_algorithm-hide-code');
    }

    /**
     * A click on a block marks it and its lines in the code; a click on it again or beside the blocks removes the mark.
     *
     * @param {MouseEvent} e
     */
    onDiagramClick(e) {
        const node = e.target instanceof Element ? e.target.closest('.tiny_algorithm-node[data-id]') : null;
        const id = node && !['start', 'end'].includes(node.dataset.id) ? node.dataset.id : null;
        if (e.altKey && id) {
            // Alt + click sets or removes a breakpoint.
            this.toggleBreakpoint(id);
            return;
        }
        if (this.running || !this.codeShown()) {
            return;
        }
        this.showBlock(id === this.selected ? null : id);
    }

    updateCodeToggle() {
        const hidden = this.root.classList.contains('tiny_algorithm-hide-code');
        this.codeToggle.setAttribute('aria-pressed', hidden ? 'false' : 'true');
        this.codeToggle.title = this.t(hidden ? 'showcode' : 'hidecode');
    }

    /**
     * Escape removes the mark of a block (or leaves the covered window); F switches the full screen.
     *
     * @param {KeyboardEvent} e
     */
    onRootKey(e) {
        const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]');
        if (e.key === 'Escape' && this.selected) {
            e.stopPropagation();
            this.showBlock(null);
        } else if (e.key === 'Escape' && this.isFullscreen() && !document.fullscreenElement) {
            e.stopPropagation();
            this.setFullscreen(false);
        } else if (e.key === 'F8' && !typing) {
            e.preventDefault();
            this.stepBack();
        } else if (this.btnFull && !typing && (e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.toggleFullscreen();
        }
    }

    isFullscreen() {
        return this.root.classList.contains('tiny_algorithm-fullscreen');
    }

    /** Full screen through the browser when it can; otherwise (e.g. iPhone) the widget covers the window. */
    toggleFullscreen() {
        const on = !this.isFullscreen();
        if (on && this.root.requestFullscreen) {
            this.root.requestFullscreen().catch(() => null);
        } else if (!on && document.fullscreenElement === this.root) {
            document.exitFullscreen().catch(() => null);
        }
        this.setFullscreen(on);
    }

    setFullscreen(on) {
        this.root.classList.toggle('tiny_algorithm-fullscreen', on);
        document.documentElement.classList.toggle('tiny_algorithm-noscroll', on);
        if (on && !this.onFullscreenChange) {
            this.onFullscreenChange = () => {
                if (!document.fullscreenElement && this.isFullscreen()) {
                    this.setFullscreen(false);
                }
            };
            document.addEventListener('fullscreenchange', this.onFullscreenChange);
        }
        this.updateFullscreenButton(on);
        if (on) {
            this.svgHost.focus({preventScroll: true});
        }
        // The diagram starts again at 100% and is fitted to the new width when it does not fit.
        requestAnimationFrame(() => {
            this.zoom.reset();
            this.zoom.autoFit();
        });
    }

    updateFullscreenButton(on) {
        const text = this.t(on ? 'exitfullscreen' : 'fullscreen');
        this.btnFull.title = text;
        this.btnFull.setAttribute('aria-label', text);
        this.btnFull.setAttribute('aria-pressed', on ? 'true' : 'false');
        this.btnFull.innerHTML = on ? EXIT_ICON : FULL_ICON;
    }

    /** Whether the reader chose to see all the comments (remembered in this browser). */
    static notesShown() {
        try {
            return window.localStorage.getItem('tiny_algorithm_shownotes') === '1';
        } catch (e) {
            return false;
        }
    }

    /** Show or hide the list of comments and remember the choice. */
    toggleNotes() {
        const on = this.notesToggle.getAttribute('aria-pressed') !== 'true';
        try {
            window.localStorage.setItem('tiny_algorithm_shownotes', on ? '1' : '0');
        } catch (e) {
            // Storage can be unavailable (private window); the choice then only lasts for this page.
        }
        this.showNotes(on);
    }

    /**
     * Show or hide the list of comments and the numbers in the bubbles.
     *
     * @param {boolean} on
     */
    showNotes(on) {
        this.notes.show(on);
        this.notesToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        this.notesToggle.title = this.t(on ? 'hidecomments' : 'showcomments');
    }

    /** Whether the reader chose to hide the variable watch (remembered in this browser). */
    static watchHidden() {
        try {
            return window.localStorage.getItem('tiny_algorithm_hidewatch') === '1';
        } catch (e) {
            return false;
        }
    }

    /** Show or hide the variable watch and remember the choice. */
    toggleWatch() {
        const hidden = this.root.classList.toggle('tiny_algorithm-hide-watch');
        try {
            window.localStorage.setItem('tiny_algorithm_hidewatch', hidden ? '1' : '0');
        } catch (e) {
            // Storage can be unavailable (private window); the choice then only lasts for this page.
        }
        this.updateWatchToggle();
    }

    updateWatchToggle() {
        const hidden = this.root.classList.contains('tiny_algorithm-hide-watch');
        this.watchToggle.setAttribute('aria-pressed', hidden ? 'false' : 'true');
        this.watchToggle.title = this.t(hidden ? 'showwatch' : 'hidewatch');
    }

    renderCode() {
        try {
            this.codeText = showCode(this.codeEl, this.codeLang, this.program);
        } catch (err) {
            this.codeText = `// ${errorText(err)}`;
            this.codeEl.textContent = this.codeText;
            return;
        }
        markCode(this.codeEl, this.selected, SELECTED, false);
        markRun(null, this.codeEl, this.breakpoints, this.errorId);
    }

    /**
     * Set or remove a breakpoint: Run stops before the block and goes on with Step or Run.
     *
     * @param {string} id block id
     */
    toggleBreakpoint(id) {
        if (this.breakpoints.has(id)) {
            this.breakpoints.delete(id);
        } else {
            this.breakpoints.add(id);
        }
        markRun(this.svgHost, this.codeEl, this.breakpoints, this.errorId);
        this.announcer.textContent = this.t(this.breakpoints.has(id) ? 'breakpointset' : 'breakpointremoved');
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
            this.running.stopped = true;
            this.running.clear = true;
            if (this.running.wake) {
                this.running.wake();
            }
            return;
        }
        this.start(true, replay);
    }

    /**
     * Mark a block of the diagram and its code lines (the block or a code line was clicked); null removes the mark.
     *
     * @param {?string} id block id
     * @param {boolean} scrollCode scroll the code panel to the block's first line
     */
    showBlock(id, scrollCode = true) {
        if (this.running) {
            return;
        }
        this.selected = id;
        this.svgHost.querySelectorAll('.tiny_algorithm-node').forEach((n) => {
            n.classList.toggle('tiny_algorithm-selected', Boolean(id) && n.dataset.id === id);
        });
        if (this.codeEl) {
            markCode(this.codeEl, id, SELECTED, scrollCode);
        }
        if (id) {
            revealNode(this.svgHost, id);
        }
    }

    /**
     * Arrows go through the blocks line by line (Escape anywhere in the viewer removes the mark).
     *
     * @param {KeyboardEvent} e
     */
    onCodeKey(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const id = nextBlock(this.codeEl, this.selected, e.key === 'ArrowDown' ? 1 : -1);
            if (id) {
                e.preventDefault();
                this.showBlock(id);
            }
        }
    }

    onRun() {
        if (!this.running) {
            this.start(false);
            return;
        }
        if (this.running.asking) {
            return;
        }
        this.running.stepMode = false;
        if (this.running.wake) {
            this.running.wake();
        }
    }

    onStep() {
        if (!this.running) {
            this.start(true);
            return;
        }
        if (this.running.asking) {
            return;
        }
        this.running.stepMode = true;
        if (this.running.wake) {
            this.running.wake();
        }
    }

    reset() {
        if (this.running) {
            this.running.stopped = true;
            this.running.clear = true;
            if (this.running.wake) {
                this.running.wake();
            }
            return;
        }
        this.consoleEl.replaceChildren();
        this.watch.clear();
        if (this.turtle) {
            this.turtle.reset();
        }
        if (this.arrayView) {
            this.arrayView.reset();
        }
        if (this.filesPanel) {
            this.filesPanel.reset();
        }
        this.highlight(null);
        this.errorId = null;
        this.statusEl.hidden = true;
        this.btnRun.textContent = this.t('run');
        this.lastRun = null;
        this.btnBack.disabled = true;
        this.timeline.hide();
        markRun(this.svgHost, this.codeEl, this.breakpoints, null);
    }

    log(text, cls = '') {
        const line = el('div', {'class': `tiny_algorithm-line ${cls}`}, text);
        this.consoleEl.append(line);
        this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
        return line;
    }

    write(text) {
        const last = this.consoleEl.lastElementChild;
        const body = text.replace(/\n$/, '');
        if (last && last.classList.contains('tiny_algorithm-out') && !last.dataset.closed) {
            last.textContent += body;
            if (text.endsWith('\n')) {
                last.dataset.closed = '1';
            }
        } else {
            const line = this.log(body, 'tiny_algorithm-out');
            if (text.endsWith('\n')) {
                line.dataset.closed = '1';
            }
        }
    }

    highlight(id) {
        if (this.codeEl) {
            markCode(this.codeEl, id);
        }
        this.svgHost.querySelectorAll('.tiny_algorithm-running').forEach((n) => n.classList.remove('tiny_algorithm-running'));
        if (!id) {
            showBranch(this.svgHost, null);
        }
        const n = id && this.svgHost.querySelector(`.tiny_algorithm-node[data-id="${id}"]`);
        if (n) {
            n.classList.add('tiny_algorithm-running');
        }
    }

    askInput(run, ev, hint) {
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
     * Run or step from the start.
     *
     * @param {boolean} stepMode pause before the first block
     * @param {?Object} [replay] a repeat up to a step (step back, the timeline): {until, replay, seed, horizon}
     */
    async start(stepMode, replay = null) {
        const run = {stepMode, stopped: false, clear: false, wake: null, timer: null, ...(replay || {})};
        this.showBlock(null, false);
        this.running = run;
        this.errorId = null;
        markRun(this.svgHost, this.codeEl, this.breakpoints, null);
        this.consoleEl.replaceChildren();
        this.watch.clear();
        if (this.turtle) {
            this.turtle.reset();
        }
        if (this.arrayView) {
            this.arrayView.reset();
        }
        if (this.filesPanel) {
            this.filesPanel.reset();
        }
        const ui = {
            program: this.program,
            breakpoints: this.breakpoints,
            delay: () => Number(this.speed.max) - Number(this.speed.value),
            highlight: (id) => this.highlight(id),
            branch: (ev) => showBranch(this.svgHost, ev),
            watch: (vars, stack) => this.watch.update(vars, stack),
            turtle: (ev) => this.turtle && this.turtle.apply(ev),
            file: (ev) => this.filesPanel && this.filesPanel.apply(ev),
            arrays: this.arrayView ? (ev) => this.arrayView.update(ev) : null,
            output: (text) => this.write(text),
            info: (text) => this.log(text, 'tiny_algorithm-info'),
            error: (text, id) => {
                this.log(`${this.t('error')}: ${text}`, 'tiny_algorithm-error');
                this.errorId = id;
            },
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
            this.highlight(null);
            markRun(this.svgHost, this.codeEl, this.breakpoints, this.errorId);
            if (this.errorId) {
                revealNode(this.svgHost, this.errorId);
            }
            if (run.clear && !run.next) {
                this.consoleEl.replaceChildren();
                this.watch.clear();
                this.statusEl.hidden = true;
                this.btnBack.disabled = true;
                this.timeline.hide();
                this.lastRun = null;
            }
        }
        if (run.next) {
            await this.start(true, run.next);
        }
    }
}
