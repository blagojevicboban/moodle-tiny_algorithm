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
 * Lets Node resolve Moodle-style extension-less relative imports ('./model') used by amd/src.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?js$/.test(specifier)) {
        try {
            return await nextResolve(`${specifier}.js`, context);
        } catch {
            // Fall through to the default resolution.
        }
    }
    return nextResolve(specifier, context);
}
