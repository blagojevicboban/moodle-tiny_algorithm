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
 * Asks the AI of the site (tiny_algorithm_ai_hint) for a hint and shows the answer as plain text. The AI policy of
 * Moodle is accepted first when the user has not done it yet.
 *
 * @module tiny_algorithm/aihint
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Ajax from 'core/ajax';
import CustomEvents from 'core/custom_interaction_events';
import PolicyModal from 'core_ai/policymodal';
import {generate} from './codegen';
import {t} from './strings';

const para = (cls, text) => {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    return p;
};

/**
 * Ask for a hint and show it in the box.
 *
 * @param {Object} args
 * @param {string} args.kind error or test
 * @param {Object} args.program the student's algorithm
 * @param {string} args.problem the error, or the failed test
 * @param {Object} args.codeConfig configuration of the page: questionid and task in a question
 * @param {HTMLElement} args.box where the answer goes
 * @returns {Promise<void>}
 */
export const ask = async({kind, program, problem, codeConfig = {}, box}) => {
    box.replaceChildren(para('tiny_algorithm-ai-wait', t('aithinking')));
    const contextid = (window.M && window.M.cfg && window.M.cfg.contextid) || 0;
    const args = {contextid, kind, code: generate('pseudo', program), problem,
        task: String(codeConfig.task || ''), questionid: Number(codeConfig.questionid) || 0};
    try {
        const result = await Ajax.call([{methodname: 'tiny_algorithm_ai_hint', args}])[0];
        const text = document.createElement('div');
        text.className = 'tiny_algorithm-ai-text';
        text.textContent = result.text;
        box.replaceChildren(para('tiny_algorithm-ai-note', t('aiwarning')), text);
    } catch (e) {
        if (e && e.errorcode === 'aihintpolicy') {
            // The AI policy of the site: accepted once, then the question is asked again.
            box.replaceChildren();
            const modal = await PolicyModal.create();
            modal.getModal().on(CustomEvents.events.activate, modal.getActionSelector('save'), () => {
                ask({kind, program, problem, codeConfig, box});
            });
            return;
        }
        // The messages of the service (off here, the limit per hour, the provider failed) are already in the user's language.
        const own = e && typeof e.errorcode === 'string' && e.errorcode.startsWith('aihint');
        const message = (e && e.message) || String(e);
        box.replaceChildren(para('tiny_algorithm-error', own ? message : t('aierror', {message})));
    }
};
