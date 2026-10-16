/**
 * Modal dialog hosting the algorithm editor, and insertion of the result into TinyMCE.
 *
 * @module tiny_algorithm/ui
 */
import Modal from 'core/modal';
import {getStrings} from 'core/str';
import {component, dataAttribute, runAttribute} from './common';
import {AlgorithmEditor} from './editor';
import {deserialize, serialize} from './model';
import {extractModel} from './render';

const svgToDataUri = (svg) => {
    const bytes = new TextEncoder().encode(svg);
    let bin = '';
    bytes.forEach((b) => {
        bin += String.fromCharCode(b);
    });
    return `data:image/svg+xml;base64,${btoa(bin)}`;
};

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Load the model stored in an existing algorithm image (attribute first, embedded SVG metadata second). */
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

const imageHtml = (program, svg, interactive) => {
    const m = /width="(\d+)" height="(\d+)"/.exec(svg);
    return `<img src="${svgToDataUri(svg)}" ${dataAttribute}="${serialize(program)}"${interactive ? ` ${runAttribute}="1"` : ''} ` +
        `alt="${escapeAttr(`Algorithm: ${program.name || ''}`)}" width="${m[1]}" height="${m[2]}">`;
};

export const openEditor = async(editor) => {
    const selected = editor.selection.getNode();
    const existing = selected && selected.nodeName === 'IMG' && (selected.hasAttribute(dataAttribute) ||
        /^data:image\/svg\+xml/.test(selected.getAttribute('src') || '')) ? selected : null;
    const program = existing ? loadModel(existing) : null;

    const [title, insert, cancel, interactiveLabel] = await getStrings([
        {key: 'dialogtitle', component},
        {key: 'insert', component},
        {key: 'cancel', component},
        {key: 'interactive', component},
    ]);

    const modal = await Modal.create({
        title,
        body: '<div class="tiny_algorithm-root"></div>',
        footer: `<label class="mr-auto mb-0"><input type="checkbox" data-action="interactive"> ${interactiveLabel}</label>` +
            `<button type="button" class="btn btn-primary" data-action="insert">${insert}</button>` +
            `<button type="button" class="btn btn-secondary" data-action="cancel">${cancel}</button>`,
        large: true,
        show: true,
        removeOnClose: true,
    });

    const root = modal.getRoot()[0];
    const interactive = root.querySelector('[data-action="interactive"]');
    interactive.checked = Boolean(existing && existing.hasAttribute(runAttribute));
    const widget = new AlgorithmEditor(root.querySelector('.tiny_algorithm-root'), {
        program,
        lang: document.documentElement.lang,
    });

    root.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.destroy());
    root.querySelector('[data-action="insert"]').addEventListener('click', () => {
        widget.stop();
        const html = imageHtml(widget.getProgram(), widget.getSvg(), interactive.checked);
        editor.undoManager.transact(() => editor.insertContent(html));
        modal.destroy();
    });
};
