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
 * Common values for tiny_algorithm.
 *
 * @module tiny_algorithm/common
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export const component = 'tiny_algorithm';
export const pluginName = `${component}/plugin`;
export const buttonName = component;
export const menuItemName = component;
export const icon = `${component}_icon`;
export const dataAttribute = 'data-algorithm';
export const runAttribute = 'data-algorithm-run';
export const codeAttribute = 'data-algorithm-code';
export const watchAttribute = 'data-algorithm-watch';
export const editAttribute = 'data-algorithm-edit';
export const solutionAttribute = 'data-algorithm-solution';
export const testsAttribute = 'data-algorithm-tests';
export const showSolutionAttribute = 'data-algorithm-showsolution';
export const iconSvg =
    '<svg width="24" height="24" viewBox="0 0 24 24">' +
    '<rect x="8" y="2" width="8" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M12 6v3M12 15v3" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="M12 9l4 3-4 3-4-3z" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="8" y="18" width="8" height="4" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';
