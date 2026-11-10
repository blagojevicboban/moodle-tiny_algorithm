<?php
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
 * Site settings of tiny_algorithm: the default language of the generated code and the languages offered.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

use tiny_algorithm\local\code_language;

if ($ADMIN->fulltree) {
    $names = code_language::names();
    $settings->add(new admin_setting_configselect(
        'tiny_algorithm/codelang',
        get_string('codelang', 'tiny_algorithm'),
        get_string('codelang_desc', 'tiny_algorithm'),
        'python',
        $names
    ));
    $settings->add(new admin_setting_configmulticheckbox(
        'tiny_algorithm/codelangs',
        get_string('codelangs', 'tiny_algorithm'),
        get_string('codelangs_desc', 'tiny_algorithm'),
        array_fill_keys(array_keys($names), 1),
        $names
    ));
}
