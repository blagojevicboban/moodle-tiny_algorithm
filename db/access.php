<?php
// phpcs:ignoreFile moodle.Files.MoodleInternal.MoodleInternalNotNeeded
/**
 * Capabilities for tiny_algorithm.
 *
 * @package    tiny_algorithm
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$capabilities = [
    'tiny/algorithm:viewplugin' => [
        'captype' => 'write',
        'contextlevel' => CONTEXT_MODULE,
        'archetypes' => [
            'editingteacher' => CAP_ALLOW,
            'teacher' => CAP_ALLOW,
            'student' => CAP_ALLOW,
            'manager' => CAP_ALLOW,
        ],
    ],
];
