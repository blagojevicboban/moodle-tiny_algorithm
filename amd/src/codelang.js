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
 * Which language the code panel shows: the algorithm, the course and the site each may choose one.
 *
 * Order: a course that forces its language, then the language of the algorithm, then (when nothing is locked) the language
 * the student last chose in this course, then the language of the course or the site. The algorithm or the course can lock
 * the language: readers then see only that language. Teachers (the editors that choose the language of an algorithm)
 * always get every language the site offers.
 *
 * @module     tiny_algorithm/codelang
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {languages} from './codegen';

const KEY = 'tiny_algorithm_codelang';

const storageKey = (scope) => (scope ? `${KEY}_${scope}` : KEY);

const read = (key) => {
    try {
        return window.localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

/**
 * Remember the language a reader chose (per course; the teacher's choice is remembered for new diagrams everywhere).
 *
 * @param {string} lang language
 * @param {Object} [config] settings of the course and the site (scope: the course)
 * @param {boolean} [teacher] chosen in a teacher's editor
 */
export const rememberLanguage = (lang, config = {}, teacher = false) => {
    try {
        window.localStorage.setItem(storageKey(teacher ? '' : config.scope), lang);
    } catch (e) {
        // Without storage the choice lasts only for this page.
    }
};

/**
 * The languages the site offers (every language when the server sent none).
 *
 * @param {Object} config settings of the course and the site
 * @returns {string[]}
 */
const offeredLanguages = (config) => {
    const offered = (Array.isArray(config.allowed) ? config.allowed : []).filter((l) => languages.includes(l));
    return offered.length ? offered : languages.slice();
};

/**
 * The language to show and the languages to offer.
 *
 * @param {Object} program algorithm (codeLang, codeLock)
 * @param {Object} [config] from the server: default, allowed, force, lock, scope
 * @param {boolean} [teacher] an editor that chooses the language of the algorithm
 * @returns {{lang: string, allowed: string[], locked: boolean}}
 */
export const pickLanguage = (program, config = {}, teacher = false) => {
    const allowed = offeredLanguages(config);
    const ok = (l) => typeof l === 'string' && allowed.includes(l);
    const first = (...candidates) => candidates.find(ok);
    const fallback = first(config.default, 'python') || allowed[0];
    const own = program ? first(program.codeLang) : undefined;
    if (teacher) {
        return {lang: own || first(read(KEY)) || fallback, allowed, locked: false};
    }
    const forced = config.force ? first(config.default) : undefined;
    const lang = forced || own || fallback;
    const ownLock = Boolean(program && program.codeLock && own && !forced);
    if (ownLock || config.lock) {
        return {lang, allowed: [lang], locked: true};
    }
    return {lang: forced || own || first(read(storageKey(config.scope))) || fallback, allowed, locked: false};
};
