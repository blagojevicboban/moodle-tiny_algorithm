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
 * Modal dialog hosting the algorithm editor, and insertion of the result into TinyMCE.
 *
 * @module tiny_algorithm/ui
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Modal from 'core/modal';
import ModalEvents from 'core/modal_events';
import {saveCancelPromise} from 'core/notification';
import {getString, getStrings} from 'core/str';
import {getFilePicker} from 'editor_tiny/options';
import uploadFile from 'editor_tiny/uploader';
import {
    component, dataAttribute, runAttribute, codeAttribute, watchAttribute, editAttribute, solutionAttribute, testsAttribute,
    showSolutionAttribute, imageClass,
} from './common';
import {AlgorithmEditor} from './editor';
import {embedAttributes, imageClasses, restoreAttributes} from './embed';
import {load as loadStrings} from './langstrings';
import {createProgram, deserialize, serialize, walk} from './model';
import {extractModel} from './render';
import {TestsPanel, deserializeTests, serializeTests} from './tests';

const svgToDataUri = (svg) => {
    const bytes = new TextEncoder().encode(svg);
    let bin = '';
    bytes.forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return `data:image/svg+xml;base64,${btoa(bin)}`;
};

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Load the model stored in an existing algorithm image (attribute first, embedded SVG metadata second).
 *
 * @param {HTMLImageElement} img algorithm image
 */
const loadModel = (img) => {
    try {
        if (img.hasAttribute(dataAttribute)) {
            return deserialize(img.getAttribute(dataAttribute));
        }
        const m = /^data:image\/svg\+xml;base64,(.+)$/.exec(img.getAttribute('src') || '');
        return m ? extractModel(atob(m[1])) : null;
    } catch (e) {
        return null;
    }
};

/**
 * Load the teacher's solution of an existing algorithm image, when it differs from what students start from.
 *
 * @param {HTMLImageElement} img algorithm image
 */
const loadSolution = (img) => {
    try {
        return img.hasAttribute(solutionAttribute) ? deserialize(img.getAttribute(solutionAttribute)) : null;
    } catch (e) {
        return null;
    }
};

/**
 * The data-algorithm attributes of the image.
 *
 * @param {object} o
 * @param {Object} o.program algorithm shown (and, when editable, the students' starting point)
 * @param {Object} [o.solution] teacher's solution, when students start from a separate template
 * @param {Array} [o.tests] tests with expected outputs
 * @param {object} o.flags interactive, showCode, showWatch, editable, showSolution
 * @returns {Object<string, string>}
 */
const imageAttributes = ({program, solution = null, tests = [], flags}) => {
    const attrs = {[dataAttribute]: serialize(program)};
    if (flags.interactive || flags.editable) {
        attrs[runAttribute] = '1';
    }
    if (!flags.showCode) {
        attrs[codeAttribute] = '0';
    }
    if (!flags.showWatch) {
        attrs[watchAttribute] = '0';
    }
    if (flags.editable) {
        attrs[editAttribute] = '1';
        if (solution) {
            attrs[solutionAttribute] = serialize(solution);
            if (flags.showSolution) {
                attrs[showSolutionAttribute] = '1';
            }
        }
        if (tests.length) {
            attrs[testsAttribute] = serializeTests(tests);
        }
    }
    return attrs;
};

/**
 * Can the SVG be stored as a file of the text (the editor has a file area with the upload repository)?
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
const canUpload = (editor) => {
    try {
        const picker = getFilePicker(editor, 'image');
        return Boolean(picker && picker.itemid && Object.values(picker.repositories || {}).some((r) => r.type === 'upload'));
    } catch (e) {
        return false;
    }
};

/**
 * Source of the image: a file in the editor's file area where possible (it survives Moodle's HTML cleaning), else a data URI.
 *
 * @param {TinyMCE} editor
 * @param {string} svg
 * @param {string} name algorithm name
 * @returns {Promise<string>}
 */
const imageSource = async(editor, svg, name) => {
    if (canUpload(editor)) {
        const base = (name || '').normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        try {
            return await uploadFile(editor, 'image', new Blob([svg], {type: 'image/svg+xml'}), `${base || 'algorithm'}.svg`,
                () => null);
        } catch (e) {
            // A failed upload (quota, file type not allowed) falls back to the data URI.
        }
    }
    return svgToDataUri(svg);
};

/**
 * HTML of the algorithm image. Everything the viewer needs is in the SVG; the image only has its source, classes and alt
 * text (since 2.0; images written by 1.x also carry the data-algorithm attributes, which are still read).
 *
 * @param {TinyMCE} editor
 * @param {object} o see imageAttributes, and o.svg, the diagram of o.program
 * @returns {Promise<string>}
 */
const imageHtml = async(editor, o) => {
    const m = /width="(\d+)" height="(\d+)"/.exec(o.svg);
    const attrs = imageAttributes(o);
    const src = await imageSource(editor, embedAttributes(o.svg, attrs), o.program.name);
    let blocks = 0;
    o.program.functions.forEach((f) => walk(f.body, () => {
        blocks++;
    }));
    const alt = await getString('imagealt', component, {name: o.program.name || '', functions: o.program.functions.length,
        blocks});
    return `<img src="${escapeAttr(src)}" class="${imageClasses(attrs)}" alt="${escapeAttr(alt)}" ` +
        `width="${m[1]}" height="${m[2]}">`;
};

export const openEditor = async(editor) => {
    await loadStrings();
    const selected = editor.selection.getNode();
    let existing = selected && selected.nodeName === 'IMG' && (selected.hasAttribute(dataAttribute) ||
        selected.classList.contains(imageClass) || /^data:image\/svg\+xml/.test(selected.getAttribute('src') || ''))
        ? selected.cloneNode() : null;
    if (existing && !(await restoreAttributes(existing)) && !/^data:image\/svg\+xml/.test(existing.getAttribute('src') || '')) {
        existing = null;
    }
    const shown = existing ? loadModel(existing) : null;
    const savedSolution = existing ? loadSolution(existing) : null;
    const lang = document.documentElement.lang;

    const keys = ['dialogtitle', 'insert', 'cancel', 'interactive', 'showcode', 'showwatch', 'editable', 'allowsolution',
        'tabsolution', 'tabtemplate', 'tabtests', 'separatetemplate', 'copyfromsolution', 'emptytemplate', 'onlyeditable',
        'discard', 'discardquestion', 'discardtitle'];
    const s = Object.fromEntries((await getStrings(keys.map((key) => ({key, component})))).map((v, i) => [keys[i], v]));
    const check = (action, label, cls = 'mb-0 mr-3') =>
        `<label class="${cls}"><input type="checkbox" data-action="${action}"> ${label}</label>`;
    const tab = (name, label, active = false) => '<li class="nav-item">' +
        `<button type="button" class="nav-link${active ? ' active' : ''}" data-tab="${name}" aria-selected="${active}">` +
        `${label}</button></li>`;

    const modal = await Modal.create({
        title: s.dialogtitle,
        body: `<ul class="nav nav-tabs tiny_algorithm-tabs" role="tablist">${tab('solution', s.tabsolution, true)}` +
            `${tab('template', s.tabtemplate)}${tab('tests', s.tabtests)}</ul>` +
            '<div data-pane="solution" class="tiny_algorithm-root"></div>' +
            `<div data-pane="template" hidden><p class="tiny_algorithm-pane-note">${s.onlyeditable}</p>` +
            `<div class="tiny_algorithm-template-bar">${check('separatetemplate', s.separatetemplate)}` +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="copyfromsolution">' +
            `${s.copyfromsolution}</button> ` +
            `<button type="button" class="btn btn-secondary btn-sm" data-action="emptytemplate">${s.emptytemplate}</button></div>` +
            '<div class="tiny_algorithm-template"></div></div>' +
            `<div data-pane="tests" hidden><p class="tiny_algorithm-pane-note">${s.onlyeditable}</p></div>`,
        footer: '<div class="tiny_algorithm-footer-options mr-auto">' + check('interactive', s.interactive) +
            check('showcode', s.showcode) +
            check('showwatch', s.showwatch) + check('editable', s.editable) + check('allowsolution', s.allowsolution) + '</div>' +
            `<button type="button" class="btn btn-primary" data-action="insert">${s.insert}</button>` +
            `<button type="button" class="btn btn-secondary" data-action="cancel">${s.cancel}</button>`,
        large: true,
        show: true,
        removeOnClose: true,
    });

    const root = modal.getRoot()[0];
    const box = (action) => root.querySelector(`[data-action="${action}"]`);
    const pane = (name) => root.querySelector(`[data-pane="${name}"]`);
    const interactive = box('interactive');
    interactive.checked = Boolean(existing && existing.hasAttribute(runAttribute));
    const showCode = box('showcode');
    showCode.checked = existing ? existing.getAttribute(codeAttribute) !== '0' : true;
    const showWatch = box('showwatch');
    showWatch.checked = existing ? existing.getAttribute(watchAttribute) !== '0' : true;
    const editable = box('editable');
    editable.checked = Boolean(existing && existing.getAttribute(editAttribute) === '1');
    const allowSolution = box('allowsolution');
    allowSolution.checked = Boolean(existing && existing.getAttribute(showSolutionAttribute) === '1');
    const separate = box('separatetemplate');
    separate.checked = Boolean(savedSolution);

    const widget = new AlgorithmEditor(pane('solution'), {program: savedSolution || shown, lang});
    let template = null;
    let templateStart = null;
    const templateHost = root.querySelector('.tiny_algorithm-template');
    const ensureTemplate = () => {
        if (!template) {
            template = new AlgorithmEditor(templateHost, {program: savedSolution ? shown : widget.getProgram(), lang});
            templateStart = JSON.stringify(template.getProgram());
        }
        return template;
    };
    const tests = new TestsPanel(pane('tests'), {
        tests: existing ? deserializeTests(existing.getAttribute(testsAttribute)) : [],
        mode: 'teacher', lang, getSolution: () => widget.getProgram(),
    });

    const showTab = (name) => {
        root.querySelectorAll('[data-tab]').forEach((b) => {
            b.classList.toggle('active', b.dataset.tab === name);
            b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false');
        });
        root.querySelectorAll('[data-pane]').forEach((p) => {
            p.hidden = p.dataset.pane !== name;
        });
        if (name === 'template' && separate.checked) {
            ensureTemplate();
        }
    };
    const update = () => {
        interactive.disabled = editable.checked;
        if (editable.checked) {
            interactive.checked = true;
        }
        allowSolution.disabled = !editable.checked || !separate.checked;
        root.querySelectorAll('.tiny_algorithm-pane-note').forEach((n) => {
            n.hidden = editable.checked;
        });
        templateHost.hidden = !separate.checked;
        box('copyfromsolution').hidden = !separate.checked;
        box('emptytemplate').hidden = !separate.checked;
        if (separate.checked && !pane('template').hidden) {
            ensureTemplate();
        }
    };
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    [editable, separate].forEach((b) => b.addEventListener('change', update));
    box('copyfromsolution').addEventListener('click', () => ensureTemplate().setProgram(widget.getProgram()));
    box('emptytemplate').addEventListener('click', () => ensureTemplate().setProgram(createProgram(widget.getProgram().name)));
    update();

    // Closing the dialog with changes that are not inserted asks first (Cancel, the X, Escape, a click outside).
    const state = () => JSON.stringify([widget.getProgram(), tests.tests,
        [interactive, showCode, showWatch, editable, allowSolution, separate].map((b) => b.checked)]);
    const start = state();
    const changed = () => state() !== start || Boolean(template && JSON.stringify(template.getProgram()) !== templateStart);
    const close = async() => {
        if (changed()) {
            try {
                await saveCancelPromise(s.discardtitle, s.discardquestion, s.discard);
            } catch (e) {
                return; // Keep editing.
            }
        }
        modal.destroy();
    };
    const guard = (e) => {
        if (changed()) {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    };
    root.querySelector('[data-action="cancel"]').addEventListener('click', close);
    root.querySelectorAll('[data-action="hide"]').forEach((b) => b.addEventListener('click', guard, true));
    // Escape that the editor did not use (to close its block menu or deselect a block) reaches the dialog.
    modal.getModal()[0].addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            guard(e);
        }
    });
    modal.getRoot().on(ModalEvents.outsideClick, (e) => {
        if (changed()) {
            e.preventDefault();
            close();
        }
    });
    const insert = root.querySelector('[data-action="insert"]');
    insert.addEventListener('click', async() => {
        widget.stop();
        const solution = widget.getProgram();
        const flags = {interactive: interactive.checked, showCode: showCode.checked, showWatch: showWatch.checked,
            editable: editable.checked, showSolution: allowSolution.checked};
        let image;
        if (editable.checked) {
            if (tests.refreshExpected().length) {
                showTab('tests');
                return;
            }
            const starter = separate.checked ? ensureTemplate() : null;
            if (starter) {
                starter.stop();
            }
            image = {program: starter ? starter.getProgram() : solution, svg: (starter || widget).getSvg(),
                solution: starter ? solution : null, tests: tests.tests, flags};
        } else {
            image = {program: solution, svg: widget.getSvg(), flags};
        }
        insert.disabled = true;
        const html = await imageHtml(editor, image);
        editor.undoManager.transact(() => editor.insertContent(html));
        modal.destroy();
    });
};
