/**
 * Read-only runner widget: draws a program and lets readers Run / Step it (used by filter_algorithm).
 *
 * @module tiny_algorithm/runner
 */
import {execute} from './interpreter';
import {renderProgram} from './render';
import {t as tr} from './strings';

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
     */
    constructor(host, program, {lang = null} = {}) {
        this.program = program;
        this.lang = lang;
        this.running = null;
        this.build(host);
    }

    t(key) {
        return tr(key, this.lang);
    }

    build(host) {
        const btn = (key, fn) => el('button', {type: 'button', class: 'btn btn-secondary btn-sm', onclick: fn}, this.t(key));
        this.svgHost = el('div', {class: 'alg-view-svg'});
        this.svgHost.innerHTML = renderProgram(this.program);
        this.speed = el('input', {type: 'range', min: 0, max: 1000, value: 600, class: 'alg-speed', 'aria-label': this.t('speed')});
        this.consoleEl = el('div', {class: 'alg-console', role: 'log', 'aria-live': 'polite'});
        this.bar = el('div', {class: 'alg-view-bar'},
            btn('run', () => this.onRun()), btn('step', () => this.onStep()), btn('reset', () => this.reset()), this.speed);
        this.root = el('div', {class: 'alg-viewer'}, this.svgHost, this.bar, this.consoleEl);
        host.replaceChildren(this.root);
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
        this.highlight(null);
    }

    log(text, cls = '') {
        const line = el('div', {class: `alg-line ${cls}`}, text);
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
        });
    }

    askInput(run, ev) {
        return new Promise((resolve) => {
            const row = this.log(`${ev.name} (${ev.type}) ? `);
            const input = el('input', {type: 'text', class: 'form-control form-control-sm alg-input',
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
        try {
            const gen = execute(this.program);
            let res = gen.next();
            while (!res.done && !run.stopped) {
                const ev = res.value;
                if (ev.event === 'step') {
                    this.highlight(ev.id);
                    await this.waitNext(run);
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
            }
        }
    }
}
