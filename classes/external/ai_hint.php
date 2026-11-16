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

namespace tiny_algorithm\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use tiny_algorithm\local\ai_hint as hint;

/**
 * Ask the AI of the site for a hint about an error or a failed test of the student's algorithm.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ai_hint extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context of the page'),
            'kind' => new external_value(PARAM_ALPHA, 'error or test'),
            'code' => new external_value(PARAM_RAW, 'The algorithm as pseudo-code'),
            'problem' => new external_value(PARAM_RAW, 'The error, or the input, expected and actual output of the test'),
            'task' => new external_value(PARAM_RAW, 'The task (question text), may be empty', VALUE_DEFAULT, ''),
            'questionid' => new external_value(PARAM_INT, 'The question in a quiz, 0 elsewhere', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Ask for the hint.
     *
     * @param int $contextid
     * @param string $kind
     * @param string $code
     * @param string $problem
     * @param string $task
     * @param int $questionid
     * @return array
     */
    public static function execute(
        int $contextid,
        string $kind,
        string $code,
        string $problem,
        string $task = '',
        int $questionid = 0
    ): array {
        global $USER;
        $params = self::validate_parameters(self::execute_parameters(), ['contextid' => $contextid, 'kind' => $kind,
            'code' => $code, 'problem' => $problem, 'task' => $task, 'questionid' => $questionid]);
        $context = \context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/algorithm:aihint', $context);
        if (!hint::available($context) || !hint::allowed_in($context, $params['questionid'])) {
            throw new \moodle_exception('aihintoff', 'tiny_algorithm');
        }
        if (!\core_ai\manager::get_user_policy_status((int) $USER->id)) {
            throw new \moodle_exception('aihintpolicy', 'tiny_algorithm');
        }
        if (trim($params['code']) === '' || trim($params['problem']) === '') {
            throw new \invalid_parameter_exception('Nothing to explain');
        }
        if (!hint::take_request((int) $USER->id)) {
            $limit = (int) get_config('tiny_algorithm', 'aihintlimit');
            throw new \moodle_exception('aihintlimitreached', 'tiny_algorithm', '', $limit);
        }
        // The international name of the language of the user (Serbian has two scripts).
        $language = get_string('thislanguageint', 'langconfig');
        $scripts = ['sr_lt' => ' (Latin script)', 'sr_cr' => ' (Cyrillic script)'];
        $language .= $scripts[current_language()] ?? '';
        $action = new \core_ai\aiactions\generate_text(
            contextid: $context->id,
            userid: (int) $USER->id,
            prompttext: hint::prompt(
                $params['kind'] === 'error' ? 'error' : 'test',
                $params['code'],
                $params['problem'],
                strip_tags($params['task']),
                $language
            ),
        );
        try {
            $response = \core\di::get(\core_ai\manager::class)->process_action($action);
        } catch (\Throwable $e) {
            // A provider that cannot be reached can also throw; the student gets the same message.
            throw new \moodle_exception('aihintfailed', 'tiny_algorithm', '', $e->getMessage());
        }
        if (!$response->get_success()) {
            throw new \moodle_exception('aihintfailed', 'tiny_algorithm', '', $response->get_errormessage());
        }
        return ['text' => trim((string) ($response->get_response_data()['generatedcontent'] ?? ''))];
    }

    /**
     * Result.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'text' => new external_value(PARAM_RAW, 'The hint (plain text)'),
        ]);
    }
}
