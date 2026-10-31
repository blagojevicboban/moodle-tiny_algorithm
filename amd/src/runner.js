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
import {execute} from './interpreter';
import {renderProgram} from './render';
import {t as tr} from './strings';
import {Zoom} from './zoom';
import {Watch} from './watch';
import {generate, languages, languageLabels} from './codegen';

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

export class AlgorithmRunner {
    /**
     * @param {HTMLElement} host element that receives the widget
     * @param {object} program algorithm model
     * @param {object} [opts]
     * @param {string} [opts.lang] UI language code
     * @param {boolean} [opts.showCode] show the generated code panel (and its toggle button)
     * @param {boolean} [opts.showWatch] show the variable watch panel (and its toggle button)
     */
    constructor(host, program, {lang = null, showCode = true, showWatch = true} = {}) {
        this.program = program;
        this.lang = lang;
        this.showCode = showCode;
        this.showWatch = showWatch;
        this.running = null;
        this.codeLang = 'python';
        this.build(host);
    }

    t(key) {
        return tr(key, this.lang);
    }

    build(host) {
        const btn = (key, fn) => el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: fn}, this.t(key));
        this.svgHost = el('div', {'class': 'alg-view-svg'});
        this.svgHost.innerHTML = renderProgram(this.program);
        this.zoom = new Zoom(this.svgHost);
        this.speed = el('input', {
            type: 'range', min: 0, max: 1000, value: 600, 'class': 'alg-speed', 'aria-label': this.t('speed'),
        });
        this.consoleEl = el('div', {'class': 'alg-console', role: 'log', 'aria-live': 'polite'});
        this.bar = el('div', {'class': 'alg-view-bar'},
            btn('run', () => this.onRun()), btn('step', () => this.onStep()), btn('reset', () => this.reset()), this.speed,
            this.zoom.controls((key) => this.t(key)));
        this.watch = new Watch(this.lang);
        const mainParts = [this.svgHost, this.bar, this.consoleEl];
        if (this.showWatch) {
            this.watchToggle = el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm alg-watch-toggle',
                onclick: () => this.toggleWatch()});
            this.bar.append(this.watchToggle);
            mainParts.push(el('div', {'class': 'alg-view-watch'}, el('strong', {}, this.t('variables')), this.watch.root));
        }
        const main = el('div', {'class': 'alg-view-main'}, ...mainParts);
        this.root = el('div', {'class': 'alg-viewer'}, main);
        if (this.showWatch) {
            this.root.classList.toggle('alg-hide-watch', AlgorithmRunner.watchHidden());
            this.updateWatchToggle();
        }
        if (this.showCode) {
            this.codeEl = el('pre', {'class': 'alg-code', tabindex: '0'});
            this.codeSelect = el('select', {'class': 'custom-select custom-select-sm alg-codelang', 'aria-label': this.t('code'),
                onchange: () => {
                    this.codeLang = this.codeSelect.value;
                    this.renderCode();
                }}, languages.map((l) => el('option', {value: l}, languageLabels[l])));
            this.codeToggle = el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm alg-code-toggle',
                onclick: () => this.toggleCode()});
            this.bar.append(this.codeToggle);
            const close = el('button', {type: 'button', 'class': 'btn btn-link btn-sm alg-code-close',
                onclick: () => this.toggleCode(), title: this.t('hidecode'), 'aria-label': this.t('hidecode')}, '×');
            this.codePane = el('div', {'class': 'alg-view-code'},
                el('div', {'class': 'alg-code-bar'}, el('strong', {}, this.t('code')), this.codeSelect,
                    btn('copy', () => navigator.clipboard && navigator.clipboard.writeText(this.codeEl.textContent)), close),
                this.codeEl);
            this.root.append(this.codePane);
            this.renderCode();
            this.root.classList.toggle('alg-hide-code', AlgorithmRunner.codeHidden());
            this.updateCodeToggle();
        } else {
            this.root.classList.add('alg-no-code');
        }
        host.classList.add('alg-viewer-host');
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
        const hidden = this.root.classList.toggle('alg-hide-code');
        try {
            window.localStorage.setItem('tiny_algorithm_hidecode', hidden ? '1' : '0');
        } catch (e) {
            // Storage can be unavailable (private window); the choice then only lasts for this page.
        }
        this.updateCodeToggle();
        requestAnimationFrame(() => this.zoom.autoFit());
    }

    updateCodeToggle() {
        const hidden = this.root.classList.contains('alg-hide-code');
        this.codeToggle.textContent = this.t(hidden ? 'showcode' : 'hidecode');
        this.codeToggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
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
        const hidden = this.root.classList.toggle('alg-hide-watch');
        try {
            window.localStorage.setItem('tiny_algorithm_hidewatch', hidden ? '1' : '0');
        } catch (e) {
            // Storage can be unavailable (private window); the choice then only lasts for this page.
        }
        this.updateWatchToggle();
    }

    updateWatchToggle() {
        const hidden = this.root.classList.contains('alg-hide-watch');
        this.watchToggle.textContent = this.t(hidden ? 'showwatch' : 'hidewatch');
        this.watchToggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    }

    renderCode() {
        try {
            this.codeEl.textContent = generate(this.codeLang, this.program);
        } catch (err) {
            this.codeEl.textContent = `// ${err.message}`;
        }
    }

    onRun() {
        if (!this.running) {
            this.start(false);
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
        this.highlight(null);
    }

    log(text, cls = '') {
        const line = el('div', {'class': `alg-line ${cls}`}, text);
        this.consoleEl.append(line);
        this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
        return line;
    }

    write(text) {
        const last = this.consoleEl.lastElementChild;
        const body = text.replace(/\n$/, '');
        if (last && last.classList.contains('alg-out') && !last.dataset.closed) {
            last.textContent += body;
            if (text.endsWith('\n')) {
                last.dataset.closed = '1';
            }
        } else {
            const line = this.log(body, 'alg-out');
            if (text.endsWith('\n')) {
                line.dataset.closed = '1';
            }
        }
    }

    highlight(id) {
        this.svgHost.querySelectorAll('.alg-running').forEach((n) => n.classList.remove('alg-running'));
        const n = id && this.svgHost.querySelector(`.alg-node[data-id="${id}"]`);
        if (n) {
            n.classList.add('alg-running');
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
            const row = this.log(`${ev.name} (${ev.type}) ? `);
            const input = el('input', {type: 'text', 'class': 'form-control form-control-sm alg-input',
                'aria-label': `${ev.name} (${ev.type})`, onkeydown: (e) => {
                    if (e.key === 'Enter') {
                        const v = input.value;
                        input.remove();
                        row.append(` ${v}`);
                        run.wake = null;
                        resolve(v);
                    }
                }});
            row.append(input);
            input.focus();
            run.wake = () => resolve('');
        });
    }

    async start(stepMode) {
        const run = {stepMode, stopped: false, clear: false, wake: null, timer: null};
        this.running = run;
        this.consoleEl.replaceChildren();
        this.watch.clear();
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
                    this.write(ev.text);
                } else if (ev.event === 'input') {
                    const v = await this.askInput(run, ev);
                    if (run.stopped) {
                        break;
                    }
                    res = gen.next(v);
                    continue;
                }
                res = gen.next();
            }
            if (!run.clear) {
                this.log(run.stopped ? this.t('stopped') : this.t('finished'), 'alg-info');
            }
        } catch (err) {
            this.log(`${this.t('error')}: ${err.message}`, 'alg-error');
        } finally {
            this.running = null;
            this.highlight(null);
            if (run.clear) {
                this.consoleEl.replaceChildren();
                this.watch.clear();
            }
        }
    }
}
