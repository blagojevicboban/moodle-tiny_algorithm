<?php
namespace tiny_algorithm;

use context;
use editor_tiny\editor;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_menuitems;
use editor_tiny\plugin_with_configuration;

/**
 * Tiny Algoritam plugin info.
 *
 * @package    tiny_algorithm
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugininfo extends plugin implements plugin_with_buttons, plugin_with_menuitems, plugin_with_configuration {

    public static function is_enabled(context $context, array $options, array $fpoptions, ?editor $editor = null): bool {
        return has_capability('tiny/algorithm:viewplugin', $context);
    }

    public static function get_available_buttons(): array {
        return ['tiny_algorithm/algorithm'];
    }

    public static function get_available_menuitems(): array {
        return ['tiny_algorithm/algorithm'];
    }

    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?editor $editor = null
    ): array {
        return [];
    }
}
