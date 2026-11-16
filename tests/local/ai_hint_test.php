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
 * Tests of the AI hints: off unless the site turns them on, the prompt never asks for the solution, the limit per
 * hour, and a quiz allows them only for its own questions with the option on.
 *
 * @package    tiny_algorithm
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_algorithm\local\ai_hint
 * @covers     \tiny_algorithm\external\ai_hint
 */
final class ai_hint_test extends \advanced_testcase {
    public function test_off_by_default(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $student = $gen->create_and_enrol($course, 'student');
        $this->setUser($student);
        $context = \context_course::instance($course->id);
        $this->assertFalse(ai_hint::available($context));
        $this->assertFalse(code_language::for_context($context)['ai']);
        $this->expectException(\moodle_exception::class);
        \tiny_algorithm\external\ai_hint::execute($context->id, 'error', 'x = y', 'y is not declared');
    }

    public function test_prompt(): void {
        $code = "Input n\nOutput n * 2";
        $prompt = ai_hint::prompt('test', $code, "Input: 2\nExpected: 5", 'Write n + 3.', 'Serbian (Latin script)');
        $this->assertStringContainsString('answer in Serbian (Latin script)', $prompt);
        $this->assertStringContainsString('do not give the full solution', $prompt);
        $this->assertStringContainsString("Task:\nWrite n + 3.", $prompt);
        $this->assertStringContainsString("Failed test:\nInput: 2", $prompt);
        $error = ai_hint::prompt('error', str_repeat('x', 20000), 'Step limit', '', 'English');
        $this->assertStringNotContainsString('Task:', $error);
        $this->assertStringContainsString("Error:\nStep limit", $error);
        $this->assertLessThan(9000, strlen($error));
    }

    public function test_limit_per_hour(): void {
        $this->resetAfterTest();
        set_config('aihintlimit', 2, 'tiny_algorithm');
        $this->assertTrue(ai_hint::take_request(5));
        $this->assertTrue(ai_hint::take_request(5));
        $this->assertFalse(ai_hint::take_request(5));
        $this->assertTrue(ai_hint::take_request(6));
        set_config('aihintlimit', 0, 'tiny_algorithm');
        $this->assertTrue(ai_hint::take_request(5));
    }

    public function test_quiz_allows_only_its_questions_with_the_option(): void {
        global $DB;
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $page = $gen->create_module('page', ['course' => $course->id]);
        $this->assertTrue(ai_hint::allowed_in(\context_module::instance($page->cmid), 0));
        $this->assertTrue(ai_hint::allowed_in(\context_course::instance($course->id), 0));
        $quiz = $gen->create_module('quiz', ['course' => $course->id]);
        $quizcontext = \context_module::instance($quiz->cmid);
        $this->assertFalse(ai_hint::allowed_in($quizcontext, 0));
        if (!$DB->get_manager()->table_exists('qtype_algorithm_options')) {
            return;
        }
        $qgen = $gen->get_plugin_generator('core_question');
        $category = $qgen->create_question_category(['contextid' => $quizcontext->id]);
        $question = $qgen->create_question('shortanswer', null, ['category' => $category->id]);
        $DB->insert_record('qtype_algorithm_options', (object) ['questionid' => $question->id, 'aihints' => 1]);
        // Not in the quiz yet.
        $this->assertFalse(ai_hint::allowed_in($quizcontext, $question->id));
        quiz_add_quiz_question($question->id, $quiz);
        $this->assertTrue(ai_hint::allowed_in($quizcontext, $question->id));
        $DB->set_field('qtype_algorithm_options', 'aihints', 0, ['questionid' => $question->id]);
        $this->assertFalse(ai_hint::allowed_in($quizcontext, $question->id));
    }
}
