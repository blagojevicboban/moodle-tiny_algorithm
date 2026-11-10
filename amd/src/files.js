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
 * Files of an algorithm (Open, Read, Write, Close): the text files it reads, kept with the algorithm (program.files), and
 * the files it writes while it runs (events 'file' of the interpreter). There is no disk: everything stays in the page.
 *
 * @module     tiny_algorithm/files
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';

/** Blocks that use files. */
export const FILE_BLOCKS = ['open', 'read', 'write', 'close'];

/** Largest text file that can be uploaded. */
const MAX_UPLOAD = 200000;

/**
 * Does a program use files (a file block, or a file attached to it)?
 *
 * @param {Object} program
 * @returns {boolean}
 */
export const usesFiles = (program) => {
    const visit = (list) => (list || []).some((b) => FILE_BLOCKS.includes(b.type) ||
        ['then', 'else', 'body'].some((k) => visit(b[k])));
    return Boolean(program && ((program.files && Object.keys(program.files).length) ||
        (program.functions || []).some((f) => visit(f.body))));
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

const download = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
    const a = el('a', {href: url, download: name});
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export class FilesPanel {
    /**
     * @param {Object} o
     * @param {string|null} [o.lang] UI language code
     * @param {boolean} [o.editable] the files of the algorithm can be added, changed and removed
     * @param {function(Object): void} [o.onChange] called with the new files (name => text)
     */
    constructor({lang = null, editable = false, onChange = null} = {}) {
        this.lang = lang;
        this.editable = editable;
        this.onChange = onChange;
        this.files = {};
        this.written = new Map();
        this.input = el('div', {'class': 'tiny_algorithm-files-input'});
        this.output = el('div', {'class': 'tiny_algorithm-files-output', hidden: true});
        this.root = el('div', {'class': 'tiny_algorithm-files'}, this.input, this.output);
    }

    t(key) {
        return t(key, null, this.lang);
    }

    /**
     * Show the files of an algorithm.
     *
     * @param {Object} files name => text
     */
    setFiles(files) {
        this.files = {...(files || {})};
        this.renderInput();
    }

    changed() {
        if (this.onChange) {
            this.onChange({...this.files});
        }
    }

    renderInput() {
        const names = Object.keys(this.files);
        const items = names.map((name) => (this.editable ? this.editItem(name) : el('details', {'class': 'tiny_algorithm-file'},
            el('summary', {}, name), el('pre', {}, this.files[name]))));
        const empty = names.length ? [] : [el('p', {'class': 'text-muted small mb-1'}, this.t('filesempty'))];
        const tools = this.editable ? [el('div', {'class': 'tiny_algorithm-files-tools'},
            el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: () => this.add()}, this.t('filesnew')),
            ' ', this.uploadButton())] : [];
        this.input.replaceChildren(...empty, ...items, ...tools);
    }

    editItem(name) {
        const nameInput = el('input', {type: 'text', 'class': 'form-control form-control-sm', value: name,
            'aria-label': this.t('filesname'), onchange: () => this.rename(name, nameInput.value.trim())});
        const text = el('textarea', {'class': 'form-control form-control-sm', rows: '4', spellcheck: 'false',
            'aria-label': name, oninput: () => {
                this.files[name] = text.value;
                this.changed();
            }});
        text.value = this.files[name];
        return el('div', {'class': 'tiny_algorithm-file'},
            el('div', {'class': 'tiny_algorithm-file-head'}, nameInput,
                el('button', {type: 'button', 'class': 'btn btn-outline-danger btn-sm', onclick: () => {
                    delete this.files[name];
                    this.changed();
                    this.renderInput();
                }}, this.t('filesdelete'))),
            text);
    }

    uploadButton() {
        const picker = el('input', {type: 'file', accept: '.txt,.csv,text/plain', hidden: true, onchange: async() => {
            const file = picker.files && picker.files[0];
            if (file && file.size <= MAX_UPLOAD) {
                this.files[file.name] = await file.text();
                this.changed();
                this.renderInput();
            }
            picker.value = '';
        }});
        return el('span', {}, el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: () => picker.click()},
            this.t('filesupload')), picker);
    }

    add() {
        let n = 1;
        while (Object.hasOwn(this.files, `data${n}.txt`)) {
            n++;
        }
        this.files[`data${n}.txt`] = '';
        this.changed();
        this.renderInput();
    }

    rename(from, to) {
        if (to && to !== from && !Object.hasOwn(this.files, to)) {
            this.files = Object.fromEntries(Object.entries(this.files).map(([k, v]) => [k === from ? to : k, v]));
            this.changed();
        }
        this.renderInput();
    }

    /** Forget the files written by the last run. */
    reset() {
        this.written.clear();
        this.renderOutput();
    }

    /**
     * A file the algorithm wrote (event 'file' of the interpreter).
     *
     * @param {{name: string, text: string}} ev
     */
    apply(ev) {
        this.written.set(ev.name, ev.text);
        this.renderOutput();
    }

    renderOutput() {
        this.output.hidden = !this.written.size;
        this.output.replaceChildren(el('strong', {}, this.t('fileswritten')), ...[...this.written].map(([name, text]) =>
            el('div', {'class': 'tiny_algorithm-file'},
                el('div', {'class': 'tiny_algorithm-file-head'}, el('code', {}, name),
                    el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: () => download(name, text)},
                        this.t('filesdownload'))),
                el('pre', {}, text))));
    }
}
