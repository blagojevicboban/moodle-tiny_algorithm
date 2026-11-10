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
 * UI strings of the editor widget. In Moodle they come from the language files (ui_* strings of tiny_algorithm, loaded by
 * tiny_algorithm/langstrings); the English table below is the fallback that keeps the widget and its tests working
 * without Moodle.
 *
 * @module tiny_algorithm/strings
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export const STR = {
    en: {
        reset: 'Reset', showcode: 'Show code', hidecode: 'Hide code', variables: 'Variables', showwatch: 'Show variables',
        hidewatch: 'Hide variables', watchempty: 'Run or step the algorithm to see the variables.', zoomin: 'Zoom in',
        zoomout: 'Zoom out', zoomreset: 'Reset zoom (100%)', fit: 'Fit', undo: 'Undo', redo: 'Redo', run: 'Run', step: 'Step',
        stop: 'Stop', addfn: '+ Function', delfn: '− Function',
        'import': 'Import .fprg', 'export': 'Export .fprg', exportsvg: 'Save as SVG', exportpng: 'Save as PNG',
        copyimage: 'Copy image', copiedimage: 'Image copied to clipboard.',
        templates: 'Templates…', 'templates_title': 'Algorithm Templates',
        'templates_all': 'All', 'templates_linear': 'Linear', 'templates_branching': 'Branching',
        'templates_loops': 'Loops', 'templates_arrays': 'Arrays',
        loadtemplate: 'Load template', confirmtemplate: 'Loading a template will replace the current diagram. Continue?',
        loadedtemplate: 'Template loaded.',
        opencodelab: 'Open in CodeLab', codelabcopied: 'Code prepared for CodeLab (copied to clipboard).',
        copy: 'Copy', download: 'Download', speed: 'Speed',
        console: 'Console', code: 'Code',
        codehint: 'Click a line of the code to find its block in the diagram; the arrow keys go from block to block.',
        'function': 'Function', name: 'Name',
        params: 'Parameters (a: Integer, b: Real[], m: Integer[,])',
        returns: 'Return type', hint: 'Click a + to insert a block, click a block to edit it.',
        keyhint: 'Keyboard: the arrow keys move between the blocks and the + signs, Enter edits or inserts, ' +
            'Delete removes the selected block, Alt + arrow moves it, Ctrl + C, X, V and D copy, cut, paste and duplicate it, ' +
            'Escape cancels. With the mouse or a finger, drag a block onto a + sign to move it.',
        up: 'Up', down: 'Down', 'delete': 'Delete', duplicate: 'Duplicate', paste: 'Paste', cut: 'Cut',
        moveto: 'Move to…', copyto: 'Copy to…', placehint: 'Click the + sign where the block should go (Escape cancels).',
        imported: 'Flowgorithm file imported.', stopped: 'Stopped.',
        fprgmatrix: 'Flowgorithm files cannot hold matrices (arrays with two sizes), so the algorithm was not exported.',
        fprginvalid: 'This is not a valid XML file.', fprgmismatch: 'The XML file is broken near the element <{name}>.',
        fprgnotflowgorithm: 'This is not a Flowgorithm file.', fprgnofunctions: 'The Flowgorithm file has no functions.',
        fprgtoolarge: 'The file is too large or too deeply nested.', fprgskipped: 'Unsupported element <{name}> was skipped.',
        fprgreturn: 'Flowgorithm returns a value only at the end of a function: the Return blocks of {name} that are not ' +
            'the last step became assignments, so the function goes on after them.',
        fprgbreak: 'Flowgorithm has no Break and Continue blocks; they were left out.',
        fprgbuiltin: 'Flowgorithm does not have these functions: {names}.',
        finished: 'Program finished.', error: 'Error',
        'f.name': 'Name', 'f.varType': 'Type', 'f.size': 'Array size (empty = single value)',
        'f.size2': 'Second size (matrix: columns; empty = array)', 'f.target': 'Variable',
        'f.expr': 'Expression', 'f.newline': 'New line', 'f.cond': 'Condition', 'f.variable': 'Variable', 'f.start': 'From',
        'f.end': 'To', 'f.step': 'Step', 'f.text': 'Text',
        'b.declare': 'Declare', 'b.assign': 'Assign', 'b.input': 'Input', 'b.output': 'Output', 'b.if': 'If',
        'b.for': 'For', 'b.while': 'While', 'b.dowhile': 'Do … While', 'b.call': 'Call', 'b.return': 'Return',
        'b.comment': 'Comment', 'b.break': 'Break', 'b.continue': 'Continue',
        noreturn: '{name} may end without Return: a call of it then has no value.',
        unreachable: 'Blocks after a Break, Continue or Return never run: {count}.', runinputs: 'Step with this input',
        diagram: 'Diagram', pseudocode: 'Pseudo-code', note: 'Comment', addnote: 'Add a comment',
        comments: 'Comments', showcomments: 'Show all comments', hidecomments: 'Hide the comments',
        codelock: 'Students see only this language',
        'b.open': 'Open',
        'b.read': 'Read',
        'b.write': 'Write',
        'b.close': 'Close',
        'f.file': 'File name',
        'f.mode': 'Mode',
        'o.read': 'Read',
        'o.write': 'Write (a new file)',
        'o.append': 'Append (add at the end)',
        'o.closeread': 'The file open for reading',
        'o.closewrite': 'The file open for writing',
        'files': 'Files',
        'filesnew': 'New file',
        'filesupload': 'Upload a text file',
        'filesdelete': 'Delete',
        'filesname': 'File name',
        'filesempty': 'No files yet. A file the algorithm reads must be here.',
        'fileswritten': 'Written by the algorithm',
        'filesdownload': 'Download',
        'pcopen': 'OPEN',
        'pcread': 'READ',
        'pcwrite': 'WRITE',
        'pcclose': 'CLOSE',
        'pcforread': 'FOR READING',
        'pcforwrite': 'FOR WRITING',
        'pcforappend': 'FOR APPENDING',
        'b.forward': 'Forward',
        'b.turn': 'Turn',
        'b.pen': 'Pen',
        'b.home': 'Home',
        'b.clear': 'Clear',
        'f.distance': 'Distance',
        'f.pen': 'Pen',
        'f.angle': 'Angle (degrees)',
        'f.rotate': 'Direction',
        'f.color': 'Colour',
        'o.down': 'Down (draws a line)',
        'o.up': 'Up (only moves)',
        'o.right': 'Right',
        'o.left': 'Left',
        'c.black': 'Black',
        'c.gray': 'Grey',
        'c.red': 'Red',
        'c.orange': 'Orange',
        'c.yellow': 'Yellow',
        'c.green': 'Green',
        'c.cyan': 'Cyan',
        'c.blue': 'Blue',
        'c.purple': 'Purple',
        'c.brown': 'Brown',
        'turtle': 'Drawing',
        'turtlelimit': 'Only the first {max} lines are drawn.',
        'pcforward': 'FORWARD',
        'pcturn': 'TURN',
        'pcleft': 'LEFT',
        'pcright': 'RIGHT',
        'pcpen': 'PEN',
        'pcpenup': 'PEN UP',
        'pchome': 'HOME',
        'pcclear': 'CLEAR',
        'exprhelp': 'Operators and functions',
        'helpoperator': 'Operator',
        'helpfunction': 'Function',
        'helpmeaning': 'Meaning',
        'helpexample': 'Example',
        'helpresult': 'Result',
        'helpnotes': 'Indexes start from 0: a[0] is the first element of an array and m[i, j] an element of a ' +
            'matrix. Capital and small letters are the same in the names of variables and functions. Text ' +
            'is written between quotation marks.',
        'redeclared': 'In {name} these variables are declared more than once: {names}. A second Declare makes a new ' +
            'variable, and the old value is lost.',
        'h.arith': 'Addition, subtraction, multiplication and division (/ can give a real number)',
        'h.power': 'Power',
        'h.mod': 'Remainder of a division',
        'h.join': 'Joins text and values',
        'h.compare': 'Equal, not equal, less, less or equal, greater, greater or equal; the result is true or false',
        'h.logic': 'Logical not, and, or (also !, && and ||)',
        'h.abs': 'Absolute value',
        'h.sqrt': 'Square root',
        'h.round': 'Rounds to the nearest whole number',
        'h.int': 'Whole part of a number (the decimals are dropped)',
        'h.floorceil': 'Rounds down and rounds up',
        'h.random': 'A random whole number from 0 to n - 1',
        'h.trig': 'Sine, cosine and tangent of an angle in radians',
        'h.arc': 'Inverse functions, the angle in radians',
        'h.log': 'Natural logarithm, logarithm to base 10, and e to the power x',
        'h.pi': 'The number pi',
        'h.sgn': 'Sign of a number: -1, 0 or 1',
        'h.len': 'Number of characters of a text, or of elements of an array',
        'h.char': 'Character of a text at index i (from 0)',
        'h.code': 'Code of a character, and the character with a code',
        'h.convert': 'Text to an Integer or a Real number, and a value to text',
        'h.tofixed': 'A number as text with d decimals',
        'h.isnumeric': 'Is the text a number?',
        textdescription: 'Text description',
        pcfunction: 'FUNCTION', pcendfunction: 'END FUNCTION', pcdeclare: 'DECLARE', pcinput: 'INPUT', pcoutput: 'OUTPUT',
        pcif: 'IF', pcthen: 'THEN', pcelse: 'ELSE', pcendif: 'END IF', pcwhile: 'WHILE', pcendwhile: 'END WHILE',
        pcrepeat: 'REPEAT', pcfor: 'FOR', pcfrom: 'FROM', pcto: 'TO', pcstep: 'STEP', pcendfor: 'END FOR', pccall: 'CALL',
        pcreturn: 'RETURN', pcbreak: 'EXIT LOOP', pccontinue: 'NEXT ROUND',
        resume: 'Continue', breakpoint: 'Set a breakpoint', breakpointoff: 'Remove the breakpoint',
        breakpointset: 'Breakpoint set', breakpointremoved: 'Breakpoint removed',
        breakpointhit: 'Stopped at a breakpoint: {block}', stepannounce: 'Step {step}: {block}',
        statusrunning: 'Running · step {step}', statuspaused: 'Paused · step {step}', statusdone: 'Finished · {step} steps',
        stepback: '◀ Back', stepbackhint: 'Step back (F8): repeats the run up to the step before',
        timeline: 'Timeline of the run', timelinestep: 'Step {step} of {total}',
        statusstopped: 'Stopped · step {step}', statuserror: 'Error · step {step}', showblock: 'Show the block',
        callstack: 'Calls running now', inputhintinteger: 'Enter a whole number, for example 4.',
        inputhintreal: 'Enter a number, for example 2.5.', inputok: 'Confirm the value', inputhintboolean: 'Enter true or false.',
        file: 'File',
        slow: 'Slow',
        fast: 'Fast',
        trace: 'Trace table',
        traceempty: 'Run or step the algorithm first; the trace table shows its last run.',
        traceblock: 'Block',
        traceoutput: 'Output',
        tracecsv: 'Download CSV',
        tracecut: 'The first {max} steps of the run; a row selects its block.',
        tracesteps: '{count} steps; a row selects its block.',
        close: 'Close',
        deleted: 'Block deleted.',
        emptyhint: 'Click a + to add the first block.',
        shortcuts: 'Keyboard shortcuts',
        scrun: 'Run, or continue after a pause',
        scstep: 'One step',
        scstepback: 'One step back',
        scbreakpoint: 'Set or remove a breakpoint on the selected block',
        scmove: 'Move between the blocks and the + signs',
        scedit: 'Edit the block, or insert a block at a + sign',
        scmoveblock: 'Move the selected block up or down',
        scclipboard: 'Copy, cut, paste and duplicate blocks',
        scdelete: 'Delete the selected block',
        scundo: 'Undo and redo',
        scescape: 'Close a menu, a dialog or a hint',
        scshortcuts: 'This list',
        scmouse: 'With the mouse or a finger: drag a block onto a + sign to move it; a right click (or a long press) opens ' +
            'the menu of a block.',
        edit: 'Edit', done: 'Done editing', resetwork: 'Restore original',
        resetconfirm: 'Discard your changes and restore the original algorithm?', modified: 'Your version',
        fullscreen: 'Full screen', exitfullscreen: 'Exit full screen', showsolution: 'Show solution',
        hidesolution: 'Hide solution', solutionconfirm: "Show the teacher's solution?", solution: 'Solution', tests: 'Tests',
        runtests: 'Test', testcase: 'Test {n}', passed: '{passed} of {total} tests passed', inputs: 'Input',
        inputshint: 'One value per line, "" for an empty value',
        testtype: 'What the test runs', testio: 'Algorithm: inputs → output',
        testcall: 'Function {name}: arguments → returned value', arguments: 'Arguments',
        argumentshint: 'Values of the arguments, e.g. 2, 3 or one per line; an array [1, 2, 3], a matrix [[1, 2], [3, 4]]',
        weight: 'Weight',
        expected: 'Expected output', actual: 'Your output', noinputs: '(no input)',
        stale: 'You changed the algorithm since this run. Test again.',
        hiddentest: 'Hidden from students',
        addtest: '+ Test', refreshexpected: 'Compute expected outputs',
        notests: 'No tests yet. Enter the inputs; the expected outputs are computed from the solution.',
        noinput: 'The algorithm asks for more input than the test provides.', difffirst: 'First difference in line {n}.',
        insertblock: 'Insert block', passmark: 'Passed', failmark: 'Failed',
        solutionfails: 'The solution fails on test {n}: {error}',
        'e.unterminated': 'Unterminated string', 'e.badchar': "Unexpected character '{c}'", 'e.expected': "Expected '{op}'",
        'e.unexpectedend': 'Unexpected end of expression', 'e.unexpected': "Unexpected '{token}'",
        'e.charindex': 'Char: index {index} is outside the string "{text}"', 'e.tocodeempty': 'ToCode: empty string',
        'e.assigninteger': "Cannot assign '{value}' to Integer {name}",
        'e.assignreal': "Cannot assign '{value}' to Real {name}",
        'e.assignboolean': "Cannot assign '{value}' to Boolean {name}",
        'e.notdeclared': "Variable '{name}' is not declared", 'e.notarray': "'{name}' is not an array",
        'e.indexrange': "Index {index} out of range for '{name}'", 'e.divzero': 'Division by zero',
        'e.badoperator': 'Bad operator {op}', 'e.unknownfunction': "Unknown function '{name}'",
        'e.badexpression': 'Bad expression', 'e.badtarget': 'Invalid assignment target',
        'e.steplimit': 'Step limit exceeded (possible infinite loop)', 'e.invalidinput': "'{text}' is not a valid {type}",
        'e.forstepzero': 'For loop step cannot be 0', 'e.argcount': "Function '{name}' expects {count} argument(s)",
        'e.arraysize': 'Array size {size} is larger than {max}',
        'e.dimensions': 'The number of indexes for {name} must be {count}',
        'e.calldepth': 'Too many nested function calls (more than {max}). ' +
            'Does the recursion have a stop condition that is reached?',
        'e.outputlimit': 'The output is longer than {max} characters',
        'e.stringlimit': 'A string is longer than {max} characters',
        'e.filenotfound': "There is no file '{name}'",
        'e.noreadfile': 'No file is open for reading',
        'e.nowritefile': 'No file is open for writing',
        'e.fileend': "The file '{name}' has no more lines",
        'e.memorylimit': 'The arrays have more than {max} elements in all',
        'e.notinloop': '{block} can only be inside a loop',
        'e.argshape': 'The value for {name} does not fit the parameter (a single value, an array or a matrix with rows of ' +
            'the same length)',
    },
};

/** Strings loaded from Moodle (key without the ui_ prefix => text). */
let loaded = {};

/**
 * Language string identifier in lang/<lang>/tiny_algorithm.php for a widget key ('f.name' => 'ui_f_name').
 *
 * @param {string} key widget key
 * @returns {string}
 */
export const langKey = (key) => `ui_${key.replace(/\./g, '_')}`;

/**
 * Use these strings instead of the English fallback.
 *
 * @param {Object} strings widget key => text
 */
export const setStrings = (strings) => {
    loaded = {...loaded, ...strings};
};

/**
 * Fill {$a->name} (Moodle) and {name} placeholders.
 *
 * @param {string} text string with placeholders
 * @param {Object} values name => value
 * @returns {string}
 */
export const fill = (text, values = {}) => text.replace(/\{(?:\$a->)?(\w+)\}/g,
    (m, k) => (Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m));

/**
 * Text of a widget string. The language is the one Moodle loaded for the user (the second argument is kept for older
 * callers and ignored).
 *
 * @param {string} key widget key
 * @param {string|Object} [values] placeholder values (a language code from older callers is ignored)
 * @returns {string}
 */
export const t = (key, values) => {
    const text = loaded[key] ?? STR.en[key] ?? key;
    return values && typeof values === 'object' ? fill(text, values) : text;
};

/**
 * An error that stops the algorithm. The message is always English (the PHP interpreter in qtype_algorithm throws the
 * same messages); errorText() shows it in the user's language.
 */
export class AlgorithmError extends Error {
    /**
     * @param {string} code key of the e.* string
     * @param {Object} [values] placeholder values
     */
    constructor(code, values = {}) {
        super(fill(STR.en[`e.${code}`], values));
        this.code = code;
        this.values = values;
    }
}

/**
 * The message of an error in the user's language.
 *
 * @param {Error} err error thrown while parsing or running an algorithm
 * @returns {string}
 */
export const errorText = (err) => (err instanceof AlgorithmError ? t(`e.${err.code}`, err.values) : err.message);
