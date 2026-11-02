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
 * Strings for component 'tiny_algorithm', language 'en'.
 *
 * @package    tiny_algorithm
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['algorithm:viewplugin'] = 'Use the Algorithm editor plugin';
$string['allowsolution'] = 'Students can show the solution';
$string['button'] = 'Algorithm';
$string['cancel'] = 'Cancel';
$string['copyfromsolution'] = 'Copy from the solution';
$string['dialogtitle'] = 'Algorithm editor';
$string['discard'] = 'Discard changes';
$string['discardquestion'] = 'The algorithm has changes that are not inserted yet. Close the editor and lose them?';
$string['discardtitle'] = 'Changes not inserted';
$string['editable'] = 'Students can edit and test the algorithm';
$string['emptytemplate'] = 'Empty';
$string['imagealt'] = 'Algorithm {$a->name}: {$a->functions} function(s), {$a->blocks} block(s)';
$string['insert'] = 'Insert';
$string['interactive'] = 'Interactive (readers can Run and Step)';
$string['menuitem'] = 'Algorithm...';
$string['onlyeditable'] = 'Used only when "Students can edit and test the algorithm" is ticked.';
$string['pluginname'] = 'Algorithm (flowchart)';
$string['privacy:metadata'] = 'The Algorithm plugin does not store any personal data on the server. The browser keeps a few display settings (code and variables shown or hidden) and, in editable diagrams, the student\'s own copy of the algorithm in its local storage; nothing of it is sent to Moodle.';
$string['separatetemplate'] = 'Students start from a separate template, not from the solution';
$string['showcode'] = 'Show generated code next to the diagram';
$string['showwatch'] = 'Show variable watch next to the diagram';
$string['tabsolution'] = 'Solution';
$string['tabtemplate'] = 'Starting template';
$string['tabtests'] = 'Tests';
$string['ui_actual'] = 'Your output';
$string['ui_addfn'] = '+ Function';
$string['ui_addtest'] = '+ Test';
$string['ui_b_assign'] = 'Assign';
$string['ui_b_call'] = 'Call';
$string['ui_b_comment'] = 'Comment';
$string['ui_b_declare'] = 'Declare';
$string['ui_b_dowhile'] = 'Do … While';
$string['ui_b_for'] = 'For';
$string['ui_b_if'] = 'If';
$string['ui_b_input'] = 'Input';
$string['ui_b_output'] = 'Output';
$string['ui_b_return'] = 'Return';
$string['ui_b_while'] = 'While';
$string['ui_code'] = 'Code';
$string['ui_console'] = 'Console';
$string['ui_copy'] = 'Copy';
$string['ui_delete'] = 'Delete';
$string['ui_delfn'] = '− Function';
$string['ui_difffirst'] = 'First difference in line {$a->n}.';
$string['ui_done'] = 'Done editing';
$string['ui_down'] = 'Down';
$string['ui_download'] = 'Download';
$string['ui_duplicate'] = 'Duplicate';
$string['ui_e_argcount'] = 'Function \'{$a->name}\' expects {$a->count} argument(s)';
$string['ui_e_arraysize'] = 'Array size {$a->size} is larger than {$a->max}';
$string['ui_e_assignboolean'] = 'Cannot assign \'{$a->value}\' to Boolean {$a->name}';
$string['ui_e_assigninteger'] = 'Cannot assign \'{$a->value}\' to Integer {$a->name}';
$string['ui_e_assignreal'] = 'Cannot assign \'{$a->value}\' to Real {$a->name}';
$string['ui_e_badchar'] = 'Unexpected character \'{$a->c}\'';
$string['ui_e_badexpression'] = 'Bad expression';
$string['ui_e_badoperator'] = 'Bad operator {$a->op}';
$string['ui_e_badtarget'] = 'Invalid assignment target';
$string['ui_e_charindex'] = 'Char: index {$a->index} is outside the string "{$a->text}"';
$string['ui_e_divzero'] = 'Division by zero';
$string['ui_e_expected'] = 'Expected \'{$a->op}\'';
$string['ui_e_forstepzero'] = 'For loop step cannot be 0';
$string['ui_e_indexrange'] = 'Index {$a->index} out of range for \'{$a->name}\'';
$string['ui_e_invalidinput'] = '\'{$a->text}\' is not a valid {$a->type}';
$string['ui_e_notarray'] = '\'{$a->name}\' is not an array';
$string['ui_e_notdeclared'] = 'Variable \'{$a->name}\' is not declared';
$string['ui_e_steplimit'] = 'Step limit exceeded (possible infinite loop)';
$string['ui_e_tocodeempty'] = 'ToCode: empty string';
$string['ui_e_unexpected'] = 'Unexpected \'{$a->token}\'';
$string['ui_e_unexpectedend'] = 'Unexpected end of expression';
$string['ui_e_unknownfunction'] = 'Unknown function \'{$a->name}\'';
$string['ui_e_unterminated'] = 'Unterminated string';
$string['ui_edit'] = 'Edit';
$string['ui_error'] = 'Error';
$string['ui_exitfullscreen'] = 'Exit full screen';
$string['ui_expected'] = 'Expected output';
$string['ui_export'] = 'Export .fprg';
$string['ui_f_cond'] = 'Condition';
$string['ui_f_end'] = 'To';
$string['ui_f_expr'] = 'Expression';
$string['ui_f_name'] = 'Name';
$string['ui_f_newline'] = 'New line';
$string['ui_f_size'] = 'Array size (empty = single value)';
$string['ui_f_start'] = 'From';
$string['ui_f_step'] = 'Step';
$string['ui_f_target'] = 'Variable';
$string['ui_f_text'] = 'Text';
$string['ui_f_varType'] = 'Type';
$string['ui_f_variable'] = 'Variable';
$string['ui_failmark'] = 'Failed';
$string['ui_finished'] = 'Program finished.';
$string['ui_fit'] = 'Fit';
$string['ui_fullscreen'] = 'Full screen';
$string['ui_function'] = 'Function';
$string['ui_hiddentest'] = 'Hidden from students';
$string['ui_hidecode'] = 'Hide code';
$string['ui_hidesolution'] = 'Hide solution';
$string['ui_hidewatch'] = 'Hide variables';
$string['ui_hint'] = 'Click a + to insert a block, click a block to edit it.';
$string['ui_import'] = 'Import .fprg';
$string['ui_imported'] = 'Flowgorithm file imported.';
$string['ui_inputs'] = 'Input';
$string['ui_inputshint'] = 'One value per line, "" for an empty value';
$string['ui_insertblock'] = 'Insert block';
$string['ui_keyhint'] = 'Keyboard: the arrow keys move between the blocks and the + signs, Enter edits or inserts, Delete removes the selected block, Alt + arrow moves it, Ctrl + C, X, V and D copy, cut, paste and duplicate it, Escape cancels. With the mouse or a finger, drag a block onto a + sign to move it.';
$string['ui_modified'] = 'Your version';
$string['ui_name'] = 'Name';
$string['ui_noinput'] = 'The algorithm asks for more input than the test provides.';
$string['ui_noinputs'] = '(no input)';
$string['ui_notests'] = 'No tests yet. Enter the inputs; the expected outputs are computed from the solution.';
$string['ui_params'] = 'Parameters (a: Integer, b: Real[])';
$string['ui_passed'] = '{$a->passed} of {$a->total} tests passed';
$string['ui_passmark'] = 'Passed';
$string['ui_paste'] = 'Paste';
$string['ui_redo'] = 'Redo';
$string['ui_refreshexpected'] = 'Compute expected outputs';
$string['ui_reset'] = 'Reset';
$string['ui_resetconfirm'] = 'Discard your changes and restore the original algorithm?';
$string['ui_resetwork'] = 'Restore original';
$string['ui_returns'] = 'Return type';
$string['ui_run'] = 'Run';
$string['ui_runtests'] = 'Test';
$string['ui_showcode'] = 'Show code';
$string['ui_showsolution'] = 'Show solution';
$string['ui_showwatch'] = 'Show variables';
$string['ui_solution'] = 'Solution';
$string['ui_solutionconfirm'] = 'Show the teacher\'s solution?';
$string['ui_solutionfails'] = 'The solution fails on test {$a->n}: {$a->error}';
$string['ui_speed'] = 'Speed';
$string['ui_stale'] = 'You changed the algorithm since this run. Test again.';
$string['ui_step'] = 'Step';
$string['ui_stop'] = 'Stop';
$string['ui_stopped'] = 'Stopped.';
$string['ui_testcase'] = 'Test {$a->n}';
$string['ui_tests'] = 'Tests';
$string['ui_undo'] = 'Undo';
$string['ui_up'] = 'Up';
$string['ui_variables'] = 'Variables';
$string['ui_watchempty'] = 'Run or step the algorithm to see the variables.';
$string['ui_zoomin'] = 'Zoom in';
$string['ui_zoomout'] = 'Zoom out';
$string['ui_zoomreset'] = 'Reset zoom (100%)';
