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

namespace tiny_algorithm\local;

/**
 * The programming language of the generated code: the languages the site offers and its default, and the language a course
 * (or an activity) chose in the local settings of filter_algorithm.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class code_language {
    /** Languages of the code panel (as languages in tiny_algorithm/codegen), pseudo-code first. */
    const LANGUAGES = ['pseudo', 'python', 'c', 'cpp', 'java', 'csharp', 'javascript', 'pascal', 'vb', 'go', 'rust', 'kotlin'];

    /** Names of the programming languages (pseudo-code is translated). */
    const NAMES = ['python' => 'Python', 'c' => 'C', 'cpp' => 'C++', 'java' => 'Java', 'csharp' => 'C#',
        'javascript' => 'JavaScript', 'pascal' => 'Pascal', 'vb' => 'Visual Basic', 'go' => 'Go', 'rust' => 'Rust',
        'kotlin' => 'Kotlin'];

    /**
     * Every language with its name, for a select or a list of checkboxes.
     *
     * @return string[] language => name
     */
    public static function names(): array {
        $names = [];
        foreach (self::LANGUAGES as $lang) {
            $names[$lang] = $lang === 'pseudo' ? get_string('ui_pseudocode', 'tiny_algorithm') : self::NAMES[$lang];
        }
        return $names;
    }

    /**
     * The languages the site offers (all of them when the administrator did not choose).
     *
     * @return string[]
     */
    public static function offered(): array {
        $config = get_config('tiny_algorithm', 'codelangs');
        $chosen = $config === false || $config === '' ? self::LANGUAGES : explode(',', $config);
        $offered = array_values(array_intersect(self::LANGUAGES, $chosen));
        return $offered ?: self::LANGUAGES;
    }

    /**
     * The default language of the site (one it offers).
     *
     * @return string
     */
    public static function site_default(): string {
        $offered = self::offered();
        $default = (string) get_config('tiny_algorithm', 'codelang');
        return in_array($default, $offered, true) ? $default : (in_array('python', $offered, true) ? 'python' : $offered[0]);
    }

    /**
     * The language settings that apply in a context: the nearest course, category or activity that chose a language in the
     * local settings of filter_algorithm, else the site.
     *
     * @param \context $context where the algorithm is shown
     * @return array default, allowed, force (the course language replaces the one of an algorithm), lock (students
     *     cannot change it), scope (the course, where a student's own choice is remembered)
     */
    public static function for_context(\context $context): array {
        global $CFG;
        require_once($CFG->libdir . '/filterlib.php');
        $allowed = self::offered();
        $result = ['default' => self::site_default(), 'allowed' => $allowed, 'force' => false, 'lock' => false, 'scope' => ''];
        $course = $context->get_course_context(false);
        if ($course) {
            $result['scope'] = (string) $course->instanceid;
        }
        foreach ($context->get_parent_context_ids(true) as $id) {
            $local = filter_get_local_config('algorithm', $id);
            if (!empty($local['codelang']) && in_array($local['codelang'], $allowed, true)) {
                $result['default'] = $local['codelang'];
                $result['force'] = !empty($local['codeforce']);
                $result['lock'] = !empty($local['codelock']);
                break;
            }
        }
        return $result;
    }
}
