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
 * Record types of an algorithm (2.21): a record groups values under one name (Student with name and avg). The dialog
 * edits them as a name and its fields "name: String, avg: Real"; renaming a type renames it in the declarations, the
 * parameters and the return types.
 *
 * @module tiny_algorithm/records
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {el, openDialog} from './dialog';
import {errorText, t} from './strings';
import {recordTypes} from './interpreter';
import {walk} from './model';

/**
 * Does the algorithm have record types?
 *
 * @param {Object} program
 * @returns {boolean}
 */
export const usesRecords = (program) => Boolean(program && Array.isArray(program.records) && program.records.length);

/**
 * The fields of a record from text: "name: String, avg: Real" (a field without a type is an Integer).
 *
 * @param {string} text
 * @returns {Array<{name: string, type: string}>}
 */
export const parseFields = (text) => String(text).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const [name, type = ''] = s.split(':').map((x) => x.trim());
    const known = ['Integer', 'Real', 'String', 'Boolean'].find((k) => k.toLowerCase() === type.toLowerCase());
    return {name, type: known || type || 'Integer'};
});

/**
 * The fields of a record as text.
 *
 * @param {Array<{name: string, type: string}>} fields
 * @returns {string}
 */
export const fieldsText = (fields) => (fields || []).map((f) => `${f.name}: ${f.type}`).join(', ');

/**
 * Rename a record type wherever the algorithm uses it (declarations, parameters, return types).
 *
 * @param {Object} program
 * @param {string} from old name
 * @param {string} to new name
 */
export const renameRecordType = (program, from, to) => {
    const same = (type) => typeof type === 'string' && type.toLowerCase() === from.toLowerCase();
    program.functions.forEach((f) => {
        f.params.forEach((p) => {
            if (same(p.type)) {
                p.type = to;
            }
        });
        if (same(f.returnType)) {
            f.returnType = to;
        }
        walk(f.body, (b) => {
            if (b.type === 'declare' && same(b.varType)) {
                b.varType = to;
            }
        });
    });
};

/**
 * Open the dialog of the record types.
 *
 * @param {HTMLElement} host widget root
 * @param {Object} program the algorithm (not changed by the dialog)
 * @param {Function} onApply (records, renames) => called with the new types and [[old, new]] names
 */
export const openRecords = (host, program, onApply) => {
    const rows = el('div', {'class': 'tiny_algorithm-records'});
    const message = el('p', {'class': 'tiny_algorithm-error small', role: 'alert', hidden: true});
    const addRow = (def = {name: '', fields: []}) => {
        const name = el('input', {type: 'text', 'class': 'form-control form-control-sm', value: def.name, spellcheck: 'false',
            'aria-label': t('recordname'), placeholder: 'Student'});
        const fields = el('input', {type: 'text', 'class': 'form-control form-control-sm', value: fieldsText(def.fields),
            spellcheck: 'false', 'aria-label': t('recordfields'), placeholder: 'name: String, avg: Real'});
        const row = el('div', {'class': 'tiny_algorithm-record-row'}, name, fields,
            el('button', {type: 'button', 'class': 'btn btn-outline-danger btn-sm', 'aria-label': t('delete'),
                title: t('delete'), onclick: () => row.remove()}, '×'));
        row.dataset.old = def.name;
        rows.append(row);
        return name;
    };
    (program.records || []).forEach((def) => addRow(def));
    const apply = () => {
        const list = [...rows.children].map((row) => {
            const [name, fields] = row.querySelectorAll('input');
            return {old: row.dataset.old, def: {name: name.value.trim(), fields: parseFields(fields.value)}};
        }).filter((r) => r.def.name || r.def.fields.length);
        try {
            recordTypes({records: list.map((r) => r.def)});
        } catch (e) {
            message.textContent = errorText(e);
            message.hidden = false;
            return;
        }
        const renames = list.filter((r) => r.old && r.old !== r.def.name).map((r) => [r.old, r.def.name]);
        dialog.close();
        onApply(list.map((r) => r.def), renames);
    };
    const body = el('div', {},
        el('p', {'class': 'small'}, t('recordsnote')),
        el('div', {'class': 'tiny_algorithm-record-row tiny_algorithm-record-head small text-muted'},
            el('span', {}, t('recordname')), el('span', {}, t('recordfields')), el('span')),
        rows, message,
        el('div', {'class': 'tiny_algorithm-actions'},
            el('button', {type: 'button', 'class': 'btn btn-secondary btn-sm', onclick: () => addRow().focus()}, t('recordadd')),
            el('button', {type: 'button', 'class': 'btn btn-primary btn-sm', onclick: apply}, t('recordapply'))));
    const dialog = openDialog(host, t('recordstitle'), body);
    if (!rows.children.length) {
        addRow();
    }
    const first = rows.querySelector('input');
    if (first) {
        first.focus();
    }
    return dialog;
};
