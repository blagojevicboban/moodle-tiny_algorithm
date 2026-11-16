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
 * The AI hint button and the box for its answer (only when the site allows AI hints: codeConfig.ai). The texts sent to
 * the AI are made here; the request itself is in tiny_algorithm/aihint, loaded on the first click.
 *
 * @module tiny_algorithm/aibox
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {t} from './strings';
import {findBlock} from './model';
import {labelOf} from './layout';

/** Longest output of a test sent to the AI. */
const MAX_OUTPUT = 1000;

const cut = (text) => {
    const s = String(text === undefined || text === null ? '' : text);
    return s.length > MAX_OUTPUT ? `${s.slice(0, MAX_OUTPUT)}…` : s;
};

/**
 * The problem of an error: the message and the block where the algorithm stopped.
 *
 * @param {Object} program
 * @param {string} message error text
 * @param {?string} id block where it stopped
 * @returns {string}
 */
export const errorProblem = (program, message, id) => {
    const found = id ? findBlock(program, id) : null;
    return found ? `${message}\nBlock: ${labelOf(found.block)}` : message;
};

/**
 * The problem of a failed test: its input (or call), the expected output and the output of the algorithm.
 *
 * @param {Object} tc test {inputs, call, expected}
 * @param {Object} result {actual, error}
 * @param {?string} call the call of a function test (Sum(2, 3)), null for a test with inputs
 * @returns {string}
 */
export const testProblem = (tc, result, call = null) => [
    call ? `Call: ${call}` : `Input (one value per line):\n${cut(tc.inputs) || '(none)'}`,
    `Expected output:\n${cut(tc.expected)}`,
    `Output of the algorithm:\n${cut(result.actual)}`,
    result.error ? `It stopped with the error: ${result.error}` : '',
].filter(Boolean).join('\n');

/**
 * A button that asks the AI and a box for the answer.
 *
 * @param {string} key string of the button (aiexplain or aitesthint)
 * @param {Function} request () => {kind, program, problem}; called on the click
 * @param {Object} codeConfig configuration of the page (ai, questionid, task)
 * @returns {{button: HTMLButtonElement, box: HTMLElement}}
 */
export const aiBox = (key, request, codeConfig) => {
    const box = document.createElement('div');
    box.className = 'tiny_algorithm-ai';
    box.setAttribute('aria-live', 'polite');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-secondary btn-sm tiny_algorithm-ai-btn';
    button.textContent = `💡 ${t(key)}`;
    button.addEventListener('click', async() => {
        button.disabled = true;
        try {
            const module = await import('tiny_algorithm/aihint');
            await module.ask({...request(), codeConfig, box});
        } catch (e) {
            box.textContent = t('aierror', {message: (e && e.message) || String(e)});
        } finally {
            button.disabled = false;
        }
    });
    return {button, box};
};
