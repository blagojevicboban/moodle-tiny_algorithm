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
 * Options of tiny_algorithm sent by the server (plugininfo): the code languages of the site and the course.
 *
 * @module     tiny_algorithm/options
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName} from './common';

const codeConfigName = getPluginOptionName(pluginName, 'codeconfig');

/**
 * Register the options of the plugin with an editor.
 *
 * @param {Object} editor TinyMCE editor
 */
export const register = (editor) => {
    editor.options.register(codeConfigName, {processor: 'object', 'default': {}});
};

/**
 * The code languages of the site and the course (see tiny_algorithm/codelang).
 *
 * @param {Object} editor TinyMCE editor
 * @returns {Object}
 */
export const getCodeConfig = (editor) => {
    try {
        return editor.options.get(codeConfigName) || {};
    } catch (e) {
        return {};
    }
};
