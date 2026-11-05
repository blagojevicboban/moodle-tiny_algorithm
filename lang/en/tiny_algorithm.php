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
$string['ui_arguments'] = 'Arguments';
$string['ui_argumentshint'] = 'Values of the arguments, e.g. 2, 3 or one per line; an array [1, 2, 3], a matrix [[1, 2], [3, 4]]';
$string['ui_b_assign'] = 'Assign';
$string['ui_b_break'] = 'Break';
$string['ui_b_call'] = 'Call';
$string['ui_b_comment'] = 'Comment';
$string['ui_b_continue'] = 'Continue';
$string['ui_b_declare'] = 'Declare';
$string['ui_b_dowhile'] = 'Do … While';
$string['ui_b_for'] = 'For';
$string['ui_b_if'] = 'If';
$string['ui_b_input'] = 'Input';
$string['ui_b_output'] = 'Output';
$string['ui_b_return'] = 'Return';
$string['ui_b_while'] = 'While';
$string['ui_breakpoint'] = 'Set a breakpoint';
$string['ui_breakpointhit'] = 'Stopped at a breakpoint: {$a->block}';
$string['ui_breakpointoff'] = 'Remove the breakpoint';
$string['ui_breakpointremoved'] = 'Breakpoint removed';
$string['ui_breakpointset'] = 'Breakpoint set';
$string['ui_callstack'] = 'Calls running now';
$string['ui_code'] = 'Code';
$string['ui_codehint'] = 'Click a line of the code to find its block in the diagram; the arrow keys go from block to block.';
$string['ui_console'] = 'Console';
$string['ui_copy'] = 'Copy';
$string['ui_copyto'] = 'Copy to…';
$string['ui_cut'] = 'Cut';
$string['ui_delete'] = 'Delete';
$string['ui_delfn'] = '− Function';
$string['ui_difffirst'] = 'First difference in line {$a->n}.';
$string['ui_done'] = 'Done editing';
$string['ui_down'] = 'Down';
$string['ui_download'] = 'Download';
$string['ui_duplicate'] = 'Duplicate';
$string['ui_e_argcount'] = 'Function \'{$a->name}\' expects {$a->count} argument(s)';
$string['ui_e_argshape'] = 'The value for {$a->name} does not fit the parameter (a single value, an array or a matrix with rows of the same length)';
$string['ui_e_arraysize'] = 'Array size {$a->size} is larger than {$a->max}';
$string['ui_e_assignboolean'] = 'Cannot assign \'{$a->value}\' to Boolean {$a->name}';
$string['ui_e_assigninteger'] = 'Cannot assign \'{$a->value}\' to Integer {$a->name}';
$string['ui_e_assignreal'] = 'Cannot assign \'{$a->value}\' to Real {$a->name}';
$string['ui_e_badchar'] = 'Unexpected character \'{$a->c}\'';
$string['ui_e_badexpression'] = 'Bad expression';
$string['ui_e_badoperator'] = 'Bad operator {$a->op}';
$string['ui_e_badtarget'] = 'Invalid assignment target';
$string['ui_e_calldepth'] = 'Too many nested function calls (more than {$a->max}). Does the recursion have a stop condition that is reached?';
$string['ui_e_charindex'] = 'Char: index {$a->index} is outside the string "{$a->text}"';
$string['ui_e_dimensions'] = 'The number of indexes for {$a->name} must be {$a->count}';
$string['ui_e_divzero'] = 'Division by zero';
$string['ui_e_expected'] = 'Expected \'{$a->op}\'';
$string['ui_e_forstepzero'] = 'For loop step cannot be 0';
$string['ui_e_indexrange'] = 'Index {$a->index} out of range for \'{$a->name}\'';
$string['ui_e_invalidinput'] = '\'{$a->text}\' is not a valid {$a->type}';
$string['ui_e_notarray'] = '\'{$a->name}\' is not an array';
$string['ui_e_notdeclared'] = 'Variable \'{$a->name}\' is not declared';
$string['ui_e_notinloop'] = '{$a->block} can only be inside a loop';
$string['ui_e_outputlimit'] = 'The output is longer than {$a->max} characters';
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
$string['ui_exportpng'] = 'Save as PNG';
$string['ui_exportsvg'] = 'Save as SVG';
$string['ui_f_cond'] = 'Condition';
$string['ui_f_end'] = 'To';
$string['ui_f_expr'] = 'Expression';
$string['ui_f_name'] = 'Name';
$string['ui_f_newline'] = 'New line';
$string['ui_f_size'] = 'Array size (empty = single value)';
$string['ui_f_size2'] = 'Second size (matrix: columns; empty = array)';
$string['ui_f_start'] = 'From';
$string['ui_f_step'] = 'Step';
$string['ui_f_target'] = 'Variable';
$string['ui_f_text'] = 'Text';
$string['ui_f_varType'] = 'Type';
$string['ui_f_variable'] = 'Variable';
$string['ui_failmark'] = 'Failed';
$string['ui_finished'] = 'Program finished.';
$string['ui_fit'] = 'Fit';
$string['ui_fprgbreak'] = 'Flowgorithm has no Break and Continue blocks; they were left out.';
$string['ui_fprgbuiltin'] = 'Flowgorithm does not have these functions: {$a->names}.';
$string['ui_fprginvalid'] = 'This is not a valid XML file.';
$string['ui_fprgmatrix'] = 'Flowgorithm files cannot hold matrices (arrays with two sizes), so the algorithm was not exported.';
$string['ui_fprgmismatch'] = 'The XML file is broken near the element <{$a->name}>.';
$string['ui_fprgnofunctions'] = 'The Flowgorithm file has no functions.';
$string['ui_fprgnotflowgorithm'] = 'This is not a Flowgorithm file.';
$string['ui_fprgreturn'] = 'Flowgorithm returns a value only at the end of a function: the Return blocks of {$a->name} that are not the last step became assignments, so the function goes on after them.';
$string['ui_fprgskipped'] = 'Unsupported element <{$a->name}> was skipped.';
$string['ui_fprgtoolarge'] = 'The file is too large or too deeply nested.';
$string['ui_fullscreen'] = 'Full screen';
$string['ui_function'] = 'Function';
$string['ui_hiddentest'] = 'Hidden from students';
$string['ui_hidecode'] = 'Hide code';
$string['ui_hidesolution'] = 'Hide solution';
$string['ui_hidewatch'] = 'Hide variables';
$string['ui_hint'] = 'Click a + to insert a block, click a block to edit it.';
$string['ui_import'] = 'Import .fprg';
$string['ui_imported'] = 'Flowgorithm file imported.';
$string['ui_inputhintboolean'] = 'Enter true or false.';
$string['ui_inputhintinteger'] = 'Enter a whole number, for example 4.';
$string['ui_inputhintreal'] = 'Enter a number, for example 2.5.';
$string['ui_inputs'] = 'Input';
$string['ui_inputshint'] = 'One value per line, "" for an empty value';
$string['ui_insertblock'] = 'Insert block';
$string['ui_keyhint'] = 'Keyboard: the arrow keys move between the blocks and the + signs, Enter edits or inserts, Delete removes the selected block, Alt + arrow moves it, Ctrl + C, X, V and D copy, cut, paste and duplicate it, Escape cancels. With the mouse or a finger, drag a block onto a + sign to move it.';
$string['ui_modified'] = 'Your version';
$string['ui_moveto'] = 'Move to…';
$string['ui_name'] = 'Name';
$string['ui_noinput'] = 'The algorithm asks for more input than the test provides.';
$string['ui_noinputs'] = '(no input)';
$string['ui_notests'] = 'No tests yet. Enter the inputs; the expected outputs are computed from the solution.';
$string['ui_params'] = 'Parameters (a: Integer, b: Real[], m: Integer[,])';
$string['ui_passed'] = '{$a->passed} of {$a->total} tests passed';
$string['ui_passmark'] = 'Passed';
$string['ui_paste'] = 'Paste';
$string['ui_placehint'] = 'Click the + sign where the block should go (Escape cancels).';
$string['ui_redo'] = 'Redo';
$string['ui_refreshexpected'] = 'Compute expected outputs';
$string['ui_reset'] = 'Reset';
$string['ui_resetconfirm'] = 'Discard your changes and restore the original algorithm?';
$string['ui_resetwork'] = 'Restore original';
$string['ui_resume'] = 'Continue';
$string['ui_returns'] = 'Return type';
$string['ui_run'] = 'Run';
$string['ui_runtests'] = 'Test';
$string['ui_showblock'] = 'Show the block';
$string['ui_showcode'] = 'Show code';
$string['ui_showsolution'] = 'Show solution';
$string['ui_showwatch'] = 'Show variables';
$string['ui_solution'] = 'Solution';
$string['ui_solutionconfirm'] = 'Show the teacher\'s solution?';
$string['ui_solutionfails'] = 'The solution fails on test {$a->n}: {$a->error}';
$string['ui_speed'] = 'Speed';
$string['ui_stale'] = 'You changed the algorithm since this run. Test again.';
$string['ui_statusdone'] = 'Finished · {$a->step} steps';
$string['ui_statuserror'] = 'Error · step {$a->step}';
$string['ui_statuspaused'] = 'Paused · step {$a->step}';
$string['ui_statusrunning'] = 'Running · step {$a->step}';
$string['ui_statusstopped'] = 'Stopped · step {$a->step}';
$string['ui_step'] = 'Step';
$string['ui_stepannounce'] = 'Step {$a->step}: {$a->block}';
$string['ui_stop'] = 'Stop';
$string['ui_stopped'] = 'Stopped.';
$string['ui_testcall'] = 'Function {$a->name}: arguments → returned value';
$string['ui_testcase'] = 'Test {$a->n}';
$string['ui_testio'] = 'Algorithm: inputs → output';
$string['ui_tests'] = 'Tests';
$string['ui_testtype'] = 'What the test runs';
$string['ui_undo'] = 'Undo';
$string['ui_up'] = 'Up';
$string['ui_variables'] = 'Variables';
$string['ui_watchempty'] = 'Run or step the algorithm to see the variables.';
$string['ui_weight'] = 'Weight';
$string['ui_zoomin'] = 'Zoom in';
$string['ui_zoomout'] = 'Zoom out';
$string['ui_zoomreset'] = 'Reset zoom (100%)';
