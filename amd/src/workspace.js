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
 * Student workspace (used by filter_algorithm when the teacher lets students edit): the reader view of the student's
 * own copy of the algorithm, an inline editor for that copy, the teacher's tests, full screen and, when allowed,
 * the teacher's solution. The copy is kept in the browser (localStorage) only.
 *
 * @module tiny_algorithm/workspace
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {AlgorithmEditor} from './editor';
import {AlgorithmRunner} from './runner';
import {TestsPanel} from './tests';
import {cloneProgram, deserialize, serialize} from './model';
import {t as tr} from './strings';
import {openClassView} from './classview';

/** Milliseconds a change waits before the copy is sent to the teacher (the class view). */
const SHARE_DELAY = 1500;

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

/**
 * Short hash, so that a changed algorithm or changed tests get a fresh student copy.
 *
 * @param {string} text text to hash
 * @returns {string} hex hash
 */
export const hash = (text) => {
    let h = 7;
    for (let i = 0; i < text.length; i++) {
        h = (h * 31 + text.charCodeAt(i)) % 4294967296;
    }
    return h.toString(16);
};

export class AlgorithmWorkspace {
    /**
     * @param {HTMLElement} host element that receives the widget
     * @param {object} opts
     * @param {Object} opts.starter algorithm the students start from
     * @param {Object} [opts.solution] the teacher's solution, when it differs from the starter
     * @param {Array} [opts.tests] [{inputs, expected}]
     * @param {boolean} [opts.showCode] show the generated code panel
     * @param {boolean} [opts.showWatch] show the variable watch panel
     * @param {boolean} [opts.showSolution] students may open the solution
     * @param {string} [opts.lang] UI language code
     * @param {string|number} [opts.scope] where the algorithm is (context id), part of the storage key
     * @param {Object} [opts.codeConfig] code languages of the site and the course (tiny_algorithm/codelang)
     * @param {Function} [opts.share] sends the student's copy to the class view: (key, JSON or '' when it is back to the
     *     original) => Promise
     * @param {Function} [opts.loadClass] the copies of the class for the teacher: (key) => Promise of the copies
     */
    constructor(host, {starter, solution = null, tests = [], showCode = true, showWatch = true, showSolution = false,
            lang = null, scope = '', codeConfig = {}, share = null, loadClass = null}) {
        this.starter = starter;
        this.solution = solution;
        this.tests = tests;
        this.opts = {lang, showCode, showWatch, fullscreen: false, codeConfig};
        this.lang = lang;
        // The exercise: its starting algorithm and its tests (a changed exercise is a new one).
        this.workKey = `w${hash(serialize(starter) + JSON.stringify(tests))}`;
        this.storageKey = `tiny_algorithm_work_${scope}_${this.workKey.slice(1)}`;
        this.share = share;
        this.loadClass = loadClass;
        this.work = this.load() || cloneProgram(starter);
        this.editing = false;
        this.view = null;
        this.solutionView = null;
        this.build(host, showSolution && solution);
        this.mount();
        // A copy changed before the class view existed (or on another page load) reaches the teacher too.
        if (this.isModified()) {
            this.shareSoon();
        }
    }

    /** Send the copy to the class view a moment after the last change. */
    shareSoon() {
        if (!this.share) {
            return;
        }
        clearTimeout(this.shareTimer);
        this.shareTimer = setTimeout(() => {
            const text = this.isModified() ? JSON.stringify(this.work) : '';
            Promise.resolve(this.share(this.workKey, text)).catch(() => null);
        }, SHARE_DELAY);
    }

    t(key) {
        return tr(key, this.lang);
    }

    build(host, canShowSolution) {
        const btn = (key, fn) => el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: fn}, this.t(key));
        this.btnEdit = btn('edit', () => this.toggleEdit());
        this.btnReset = btn('resetwork', () => this.resetWork());
        this.btnFull = btn('fullscreen', () => this.toggleFullscreen());
        this.badge = el('span', {'class': 'tiny_algorithm-ws-modified'}, this.t('modified'));
        this.bar = el('div', {'class': 'tiny_algorithm-ws-bar'}, this.btnEdit, this.btnReset, this.btnFull, this.badge);
        this.body = el('div', {'class': 'tiny_algorithm-ws-body'});
        this.root = el('div', {'class': 'tiny_algorithm-workspace', onkeydown: (e) => {
            if (e.key === 'Escape' && this.root.classList.contains('tiny_algorithm-fullscreen') && !document.fullscreenElement) {
                this.setFullscreen(false);
            }
        }}, this.bar, this.body);
        if (this.tests.length) {
            this.testsPanel = new TestsPanel(this.root, {tests: this.tests, mode: 'student', lang: this.lang,
                getProgram: () => this.current()});
        }
        if (this.loadClass) {
            // The teacher: the copies of the class.
            this.bar.append(btn('classwork', () => openClassView(this.root, {load: () => this.loadClass(this.workKey),
                tests: this.tests, lang: this.lang, codeConfig: this.opts.codeConfig})));
        }
        if (canShowSolution) {
            this.btnSolution = btn('showsolution', () => this.toggleSolution());
            this.bar.append(this.btnSolution);
            this.solutionHost = el('div', {'class': 'tiny_algorithm-ws-solution', hidden: true});
            this.root.append(this.solutionHost);
        }
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.root.classList.contains('tiny_algorithm-fullscreen')) {
                this.setFullscreen(false);
            }
        });
        host.replaceChildren(this.root);
    }

    /** The student's program as it is now (also while the editor is open). */
    current() {
        return this.editing ? this.view.getProgram() : this.work;
    }

    /** Show the student's copy in the reader view or in the editor. */
    mount() {
        if (this.view instanceof AlgorithmEditor) {
            this.view.stop();
        } else if (this.view) {
            this.view.reset();
        }
        this.body.replaceChildren();
        if (this.editing) {
            this.view = new AlgorithmEditor(this.body, {program: cloneProgram(this.work), lang: this.lang,
                codeConfig: this.opts.codeConfig, onChange: (program) => this.save(program)});
        } else {
            const host = el('div');
            this.body.append(host);
            this.view = new AlgorithmRunner(host, this.work, this.opts);
        }
        this.btnEdit.textContent = this.t(this.editing ? 'done' : 'edit');
        this.btnEdit.setAttribute('aria-pressed', this.editing ? 'true' : 'false');
        this.updateModified();
    }

    toggleEdit() {
        if (this.editing) {
            this.work = this.view.getProgram();
        }
        this.editing = !this.editing;
        this.mount();
    }

    isModified() {
        return serialize(this.work) !== serialize(this.starter);
    }

    updateModified() {
        const modified = this.isModified();
        this.badge.hidden = !modified;
        this.btnReset.disabled = !modified;
    }

    /** Previously saved copy of this student, or null. */
    load() {
        try {
            const text = window.localStorage.getItem(this.storageKey);
            return text ? deserialize(text) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Keep the student's copy (or forget it when it is back to the original).
     *
     * @param {Object} program the edited program
     */
    save(program) {
        // The editor also draws again during Run and Step: only a real change makes the test results old.
        const changed = serialize(program) !== serialize(this.work);
        this.work = cloneProgram(program);
        try {
            if (this.isModified()) {
                window.localStorage.setItem(this.storageKey, serialize(this.work));
            } else {
                window.localStorage.removeItem(this.storageKey);
            }
        } catch (e) {
            // Storage can be unavailable (private window, quota); the copy then only lasts for this page.
        }
        if (this.testsPanel && changed) {
            this.testsPanel.markStale();
        }
        if (changed) {
            this.shareSoon();
        }
        this.updateModified();
    }

    resetWork() {
        // eslint-disable-next-line no-alert
        if (!window.confirm(this.t('resetconfirm'))) {
            return;
        }
        this.save(this.starter);
        this.mount();
    }

    toggleSolution() {
        const show = this.solutionHost.hidden;
        // eslint-disable-next-line no-alert
        if (show && !this.solutionView && !window.confirm(this.t('solutionconfirm'))) {
            return;
        }
        if (show && !this.solutionView) {
            const host = el('div');
            this.solutionHost.append(el('strong', {}, this.t('solution')), host);
            this.solutionHost.hidden = false;
            this.solutionView = new AlgorithmRunner(host, this.solution, this.opts);
        }
        this.solutionHost.hidden = !show;
        this.btnSolution.textContent = this.t(show ? 'hidesolution' : 'showsolution');
    }

    /** Full screen through the browser when possible, otherwise by covering the window. */
    toggleFullscreen() {
        const on = !this.root.classList.contains('tiny_algorithm-fullscreen');
        if (on && this.root.requestFullscreen) {
            this.root.requestFullscreen().catch(() => null);
        } else if (!on && document.fullscreenElement === this.root) {
            document.exitFullscreen().catch(() => null);
        }
        this.setFullscreen(on);
    }

    setFullscreen(on) {
        this.root.classList.toggle('tiny_algorithm-fullscreen', on);
        this.btnFull.textContent = this.t(on ? 'exitfullscreen' : 'fullscreen');
        this.btnFull.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) {
            this.root.setAttribute('tabindex', '-1');
            this.root.focus();
        } else {
            this.root.removeAttribute('tabindex');
        }
        requestAnimationFrame(() => this.view && this.view.zoom && this.view.zoom.autoFit());
    }
}
