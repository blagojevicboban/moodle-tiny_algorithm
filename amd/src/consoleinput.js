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
 * The field in the console where a running algorithm reads a value. It is confirmed with Enter or with the ✓ button:
 * phone keyboards often send no Enter key (Next / Go instead), so the field sits in a small form whose submit confirms it.
 *
 * @module tiny_algorithm/consoleinput
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Add the field to a console line; the confirmed value goes to the callback.
 *
 * @param {HTMLElement} row console line that shows the question (the value is written after it)
 * @param {object} ev input event of the interpreter (name, type)
 * @param {?string} hint why the last value was refused, or null
 * @param {Function} t string lookup (key) => text
 * @param {Function} onValue called with the value (a string) when it is confirmed
 */
export const readLine = (row, ev, hint, t, onValue) => {
    const label = `${ev.name} (${ev.type})`;
    const form = document.createElement('form');
    form.className = 'tiny_algorithm-inputform';
    form.noValidate = true;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm tiny_algorithm-input';
    input.setAttribute('aria-label', label);
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.spellcheck = false;
    const ok = document.createElement('button');
    ok.type = 'submit';
    ok.className = 'btn btn-primary btn-sm tiny_algorithm-inputok';
    ok.textContent = '✓';
    ok.title = t('inputok');
    ok.setAttribute('aria-label', t('inputok'));
    let done = false;
    const confirm = () => {
        if (done) {
            return;
        }
        done = true;
        const v = input.value;
        form.remove();
        row.append(` ${v}`);
        onValue(v);
    };
    // The submit of this form must never reach a form around the widget (e.g. a quiz page).
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        confirm();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            confirm();
        }
    });
    form.append(input, ok);
    row.append(form);
    if (hint) {
        const note = document.createElement('span');
        note.className = 'tiny_algorithm-inputhint';
        note.id = `tiny_algorithm-h${Date.now()}`;
        note.textContent = hint;
        row.append(note);
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', note.id);
    }
    input.focus({preventScroll: true});
    row.scrollIntoView({block: 'nearest'});
};
