/**
 * Modal dialog hosting the algorithm editor, and insertion of the result into TinyMCE.
 *
 * @module tiny_algorithm/ui
 */
import Modal from 'core/modal';
import {getStrings} from 'core/str';
import {
    component, dataAttribute, runAttribute, codeAttribute, watchAttribute, editAttribute, solutionAttribute, testsAttribute,
    showSolutionAttribute,
} from './common';
import {AlgorithmEditor} from './editor';
import {createProgram, deserialize, serialize} from './model';
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
 * HTML of the algorithm image.
 *
 * @param {object} o
 * @param {Object} o.program algorithm shown (and, when editable, the students' starting point)
 * @param {string} o.svg diagram of o.program
 * @param {Object} [o.solution] teacher's solution, when students start from a separate template
 * @param {Array} [o.tests] tests with expected outputs
 * @param {object} o.flags interactive, showCode, showWatch, editable, showSolution
 */
const imageHtml = ({program, svg, solution = null, tests = [], flags}) => {
    const m = /width="(\d+)" height="(\d+)"/.exec(svg);
    const attrs = [`${dataAttribute}="${serialize(program)}"`];
    if (flags.interactive || flags.editable) {
        attrs.push(`${runAttribute}="1"`);
    }
    if (!flags.showCode) {
        attrs.push(`${codeAttribute}="0"`);
    }
    if (!flags.showWatch) {
        attrs.push(`${watchAttribute}="0"`);
    }
    if (flags.editable) {
        attrs.push(`${editAttribute}="1"`);
        if (solution) {
            attrs.push(`${solutionAttribute}="${serialize(solution)}"`);
            if (flags.showSolution) {
                attrs.push(`${showSolutionAttribute}="1"`);
            }
        }
        if (tests.length) {
            attrs.push(`${testsAttribute}="${serializeTests(tests)}"`);
        }
    }
    return `<img src="${svgToDataUri(svg)}" ${attrs.join(' ')} ` +
        `alt="${escapeAttr(`Algorithm: ${program.name || ''}`)}" width="${m[1]}" height="${m[2]}">`;
};

export const openEditor = async(editor) => {
    const selected = editor.selection.getNode();
    const existing = selected && selected.nodeName === 'IMG' && (selected.hasAttribute(dataAttribute) ||
        /^data:image\/svg\+xml/.test(selected.getAttribute('src') || '')) ? selected : null;
    const shown = existing ? loadModel(existing) : null;
    const savedSolution = existing ? loadSolution(existing) : null;
    const lang = document.documentElement.lang;

    const keys = ['dialogtitle', 'insert', 'cancel', 'interactive', 'showcode', 'showwatch', 'editable', 'allowsolution',
        'tabsolution', 'tabtemplate', 'tabtests', 'separatetemplate', 'copyfromsolution', 'emptytemplate', 'onlyeditable'];
    const s = Object.fromEntries((await getStrings(keys.map((key) => ({key, component})))).map((v, i) => [keys[i], v]));
    const check = (action, label, cls = 'mb-0 mr-3') =>
        `<label class="${cls}"><input type="checkbox" data-action="${action}"> ${label}</label>`;
    const tab = (name, label, active = false) => '<li class="nav-item">' +
        `<button type="button" class="nav-link${active ? ' active' : ''}" data-tab="${name}" aria-selected="${active}">` +
        `${label}</button></li>`;

    const modal = await Modal.create({
        title: s.dialogtitle,
        body: `<ul class="nav nav-tabs alg-tabs" role="tablist">${tab('solution', s.tabsolution, true)}` +
            `${tab('template', s.tabtemplate)}${tab('tests', s.tabtests)}</ul>` +
            '<div data-pane="solution" class="tiny_algorithm-root"></div>' +
            `<div data-pane="template" hidden><p class="alg-pane-note">${s.onlyeditable}</p>` +
            `<div class="alg-template-bar">${check('separatetemplate', s.separatetemplate)}` +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="copyfromsolution">' +
            `${s.copyfromsolution}</button> ` +
            `<button type="button" class="btn btn-secondary btn-sm" data-action="emptytemplate">${s.emptytemplate}</button></div>` +
            '<div class="tiny_algorithm-template"></div></div>' +
            `<div data-pane="tests" hidden><p class="alg-pane-note">${s.onlyeditable}</p></div>`,
        footer: '<div class="alg-footer-options mr-auto">' + check('interactive', s.interactive) + check('showcode', s.showcode) +
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
    const templateHost = root.querySelector('.tiny_algorithm-template');
    const ensureTemplate = () => {
        if (!template) {
            template = new AlgorithmEditor(templateHost, {program: savedSolution ? shown : widget.getProgram(), lang});
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
        root.querySelectorAll('.alg-pane-note').forEach((n) => {
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

    root.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.destroy());
    root.querySelector('[data-action="insert"]').addEventListener('click', () => {
        widget.stop();
        const solution = widget.getProgram();
        const flags = {interactive: interactive.checked, showCode: showCode.checked, showWatch: showWatch.checked,
            editable: editable.checked, showSolution: allowSolution.checked};
        let html;
        if (editable.checked) {
            if (tests.refreshExpected().length) {
                showTab('tests');
                return;
            }
            const starter = separate.checked ? ensureTemplate() : null;
            if (starter) {
                starter.stop();
            }
            html = imageHtml({program: starter ? starter.getProgram() : solution, svg: (starter || widget).getSvg(),
                solution: starter ? solution : null, tests: tests.tests, flags});
        } else {
            html = imageHtml({program: solution, svg: widget.getSvg(), flags});
        }
        editor.undoManager.transact(() => editor.insertContent(html));
        modal.destroy();
    });
};
