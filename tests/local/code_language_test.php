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
 * Tests of the code language of the site, a category, a course and an activity.
 *
 * @package    tiny_algorithm
 * @category   test
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_algorithm\local\code_language
 */
final class code_language_test extends \advanced_testcase {
    public function test_site_languages(): void {
        $this->resetAfterTest();
        $this->assertSame(code_language::LANGUAGES, code_language::offered());
        $this->assertSame('python', code_language::site_default());
        set_config('codelangs', 'csharp,pseudo,nonsense', 'tiny_algorithm');
        $this->assertSame(['pseudo', 'csharp'], code_language::offered());
        // A default the site does not offer falls back to the first offered language.
        set_config('codelang', 'java', 'tiny_algorithm');
        $this->assertSame('pseudo', code_language::site_default());
        set_config('codelang', 'csharp', 'tiny_algorithm');
        $this->assertSame('csharp', code_language::site_default());
        $this->assertSame('Pseudo-code', code_language::names()['pseudo']);
    }

    public function test_nearest_context_wins(): void {
        global $CFG;
        require_once($CFG->libdir . '/filterlib.php');
        $this->resetAfterTest();
        $category = $this->getDataGenerator()->create_category();
        $course = $this->getDataGenerator()->create_course(['category' => $category->id]);
        $page = $this->getDataGenerator()->create_module('page', ['course' => $course->id]);
        $module = \context_module::instance($page->cmid);
        $coursecontext = \context_course::instance($course->id);

        $config = code_language::for_context($module);
        $this->assertSame(['default' => 'python', 'allowed' => code_language::LANGUAGES, 'force' => false, 'lock' => false,
            'scope' => (string) $course->id, 'codelab' => []], $config);

        filter_set_local_config('algorithm', \context_coursecat::instance($category->id)->id, 'codelang', 'java');
        $this->assertSame('java', code_language::for_context($module)['default']);

        filter_set_local_config('algorithm', $coursecontext->id, 'codelang', 'csharp');
        filter_set_local_config('algorithm', $coursecontext->id, 'codelock', '1');
        $config = code_language::for_context($module);
        $this->assertSame(['csharp', false, true], [$config['default'], $config['force'], $config['lock']]);

        // The activity chooses its own; a language the site does not offer is ignored.
        filter_set_local_config('algorithm', $module->id, 'codelang', 'pseudo');
        filter_set_local_config('algorithm', $module->id, 'codeforce', '1');
        $config = code_language::for_context($module);
        $this->assertSame(['pseudo', true, false], [$config['default'], $config['force'], $config['lock']]);
        set_config('codelangs', 'python,csharp', 'tiny_algorithm');
        $this->assertSame('csharp', code_language::for_context($module)['default']);
        $this->assertSame('', code_language::for_context(\context_system::instance())['scope']);
    }

    public function test_codelab_languages(): void {
        $this->resetAfterTest();
        $context = \context_system::instance();
        // Without the right to run (not logged in), or without tiny_codelab: no Run button.
        $this->assertSame([], code_language::codelab($context));
        if (!class_exists('\tiny_codelab\local\jobe')) {
            return;
        }
        $this->setAdminUser();
        set_config('jobeserver', '', 'tiny_codelab');
        $this->assertSame([], code_language::codelab($context), 'no Jobe server');

        // A Jobe server with C and Python (its answer cached, so the test asks no server).
        set_config('jobeserver', 'https://jobe.example.org', 'tiny_codelab');
        set_config('languages', 'c,cpp,python', 'tiny_codelab');
        $jobe = new \tiny_codelab\local\jobe();
        $answer = ['ok' => true, 'versions' => ['c' => '13', 'python' => '3.12'], 'error' => '', 'time' => time()];
        \cache::make('tiny_codelab', 'languages')->set($jobe->cache_key(), $answer);
        $this->assertSame(['python', 'c'], code_language::codelab($context));
        $this->assertSame(['python', 'c'], code_language::for_context($context)['codelab']);
    }
}
