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
 * Loads the editor widget strings (ui_* strings of tiny_algorithm) from Moodle once, in the user's language.
 * Await load() before building an editor, runner, workspace or tests panel.
 *
 * @module     tiny_algorithm/langstrings
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getStrings} from 'core/str';
import {STR, langKey, setStrings} from './strings';

let loading = null;

/**
 * Load all widget strings (only the first call asks Moodle; on failure the English fallback stays).
 *
 * @returns {Promise<void>}
 */
export const load = () => {
    if (!loading) {
        const keys = Object.keys(STR.en);
        loading = getStrings(keys.map((key) => ({key: langKey(key), component: 'tiny_algorithm'})))
            .then((texts) => setStrings(Object.fromEntries(keys.map((key, i) => [key, texts[i]]))))
            .catch(() => undefined);
    }
    return loading;
};
