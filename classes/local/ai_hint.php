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
 * AI hints (optional): with an AI provider of the site (Site administration, General, AI) a student can ask why the
 * algorithm stopped with an error or what to look at when a test fails. The answer never gives the solution.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ai_hint {
    /** Longest algorithm text (pseudo-code) sent to the AI. */
    const MAX_CODE = 8000;

    /** Longest description of the problem (error, or input, expected and actual output). */
    const MAX_PROBLEM = 3000;

    /** Longest task text (the question) sent with it. */
    const MAX_TASK = 2000;

    /**
     * Can the current user ask for AI hints here: the site setting is on, an AI provider generates text (and is
     * allowed in this context), and the user has the capability.
     *
     * @param \context $context the page
     * @return bool
     */
    public static function available(\context $context): bool {
        if (!get_config('tiny_algorithm', 'aihints') || !class_exists('\core_ai\manager') || !isloggedin() || isguestuser()) {
            return false;
        }
        if (!has_capability('tiny/algorithm:aihint', $context)) {
            return false;
        }
        try {
            $manager = \core\di::get(\core_ai\manager::class);
            if (!$manager->is_action_available(\core_ai\aiactions\generate_text::class)) {
                return false;
            }
            if (method_exists($manager, 'is_action_enabled_in_context')) {
                return $manager->is_action_enabled_in_context($context, \core_ai\aiactions\generate_text::class);
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * In a quiz the AI only helps with a question that allows it (qtype_algorithm, option AI hints) and that is in the
     * quiz, so it cannot be asked during a test where the teacher did not allow it.
     *
     * @param \context $context the page
     * @param int $questionid the question the student works on, 0 outside a quiz
     * @return bool
     */
    public static function allowed_in(\context $context, int $questionid): bool {
        global $DB;
        if ($context->contextlevel !== CONTEXT_MODULE) {
            return true;
        }
        $cm = get_coursemodule_from_id('', $context->instanceid, 0, false, IGNORE_MISSING);
        if (!$cm || $cm->modname !== 'quiz') {
            return true;
        }
        if (!$questionid || !$DB->get_manager()->table_exists('qtype_algorithm_options')) {
            return false;
        }
        $sql = "SELECT 1
                  FROM {quiz_slots} qs
                  JOIN {question_references} qr ON qr.itemid = qs.id AND qr.component = 'mod_quiz' AND qr.questionarea = 'slot'
                  JOIN {question_versions} qv ON qv.questionbankentryid = qr.questionbankentryid
                  JOIN {qtype_algorithm_options} o ON o.questionid = qv.questionid
                 WHERE qs.quizid = :quizid AND qv.questionid = :questionid AND o.aihints = 1";
        return $DB->record_exists_sql($sql, ['quizid' => $cm->instance, 'questionid' => $questionid]);
    }

    /**
     * Count one more request of a user; false when the limit of requests per hour is reached.
     *
     * @param int $userid
     * @return bool
     */
    public static function take_request(int $userid): bool {
        $limit = (int) get_config('tiny_algorithm', 'aihintlimit');
        if ($limit <= 0) {
            return true;
        }
        $cache = \cache::make('tiny_algorithm', 'aihints');
        $now = time();
        $times = array_values(array_filter((array) ($cache->get($userid) ?: []), fn($t) => $t > $now - HOURSECS));
        if (count($times) >= $limit) {
            return false;
        }
        $times[] = $now;
        $cache->set($userid, $times);
        return true;
    }

    /**
     * The prompt for the AI.
     *
     * @param string $kind error (explain why the algorithm stopped) or test (a test failed)
     * @param string $code the algorithm as pseudo-code
     * @param string $problem the error, or the input, the expected and the actual output
     * @param string $task the task, when known (the question text)
     * @param string $language name of the language of the answer
     * @return string
     */
    public static function prompt(string $kind, string $code, string $problem, string $task, string $language): string {
        $cut = fn(string $text, int $max) => \core_text::substr(trim($text), 0, $max);
        $lines = [
            'You help a beginner who learns programming with flowcharts. The flowchart is shown below as pseudo-code.',
            $kind === 'error' ?
                'The algorithm stopped with the error below. Explain in simple words what the error means and which part ' .
                'of the algorithm causes it.' :
                'A test of the algorithm failed: the input, the expected output and the output of the algorithm are below. ' .
                'Give a hint where to look and what to think about.',
            'Rules: answer in ' . $language . ', in at most five short sentences, without headings. Do not write the corrected ' .
            'algorithm, code or pseudo-code, and do not give the full solution; the student must find the fix. Refer to ' .
            'blocks by their text (for example the block x = x + 1).',
        ];
        if (trim($task) !== '') {
            $lines[] = "\nTask:\n" . $cut($task, self::MAX_TASK);
        }
        $lines[] = "\nAlgorithm (pseudo-code):\n" . $cut($code, self::MAX_CODE);
        $lines[] = "\n" . ($kind === 'error' ? 'Error' : 'Failed test') . ":\n" . $cut($problem, self::MAX_PROBLEM);
        return implode("\n", $lines);
    }
}
