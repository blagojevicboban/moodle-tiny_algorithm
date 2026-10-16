<?php
namespace tiny_algorithm\privacy;

/**
 * Privacy provider: the plugin stores no personal data.
 *
 * @package    tiny_algorithm
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements \core_privacy\local\metadata\null_provider {
    /**
     * Reason string.
     *
     * @return string
     */
    public static function get_reason(): string {
        return 'privacy:metadata';
    }
}
