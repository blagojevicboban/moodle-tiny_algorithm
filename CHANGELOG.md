# Changelog

## 2.8.0 – 2026-11-10 (stable)

- **Code language on three levels:**
  - Site: Site administration, Plugins, TinyMCE, Algorithm has a default code language and the languages offered.
  - Course, category or activity: the local settings of the Algorithm viewer filter (Course, More, Filters) choose a
    language, may use it for every algorithm and may lock it for students (needs filter_algorithm 2.8.0).
  - Algorithm: the language chosen in the code panel of the dialog, and a new option, Students see only this language.
  The algorithm comes before the course unless the course forces its language; a student's own choice is remembered per
  course when nothing is locked. Teachers' editors always offer every language of the site.
- New modules codelang.js and options.js, class local/code_language and settings.php; Node and PHPUnit tests.

## 2.7.1 – 2026-11-10 (stable)

- The style of the full screen button of the editor dialog has no !important (the stylelint check of 2.7.0 failed);
  the same look with a more specific selector.

## 2.7.0 – 2026-11-10 (stable)

- **Turtle graphics:** five new blocks, Forward (with the pen down or up), Turn (right or left, in degrees), Pen (ten
  colours), Home and Clear. The turtle starts at the centre and looks up. A Drawing panel beside the console (and under
  the reader view) shows the lines while the algorithm runs or steps; it appears only for an algorithm that uses the
  turtle and keeps up to 20,000 lines.
- The blocks have their own look (a rounded light green box) and English labels, like the other blocks.
- Flowgorithm files: forward, turn, pen, home and clear shapes are imported and exported with their attributes.
- Generated code: Python draws with the turtle module; the other languages get a comment for each turtle block;
  pseudo-code has FORWARD, TURN, PEN, HOME and CLEAR.
- The distance and the angle must be numbers (the same check as in the PHP interpreter of qtype_algorithm).
- **Full screen dialog:** a button beside the close button of the editor dialog makes it fill the window (the diagram
  and the side panel grow, and on a wide screen the code moves to its own column); the same button makes it small again.
- Flowgorithm is a separate program by Devin Cook; this plugin is not affiliated with it.

## 2.6.0 – 2026-11-10 (stable)

Suggestions of a student of TSP Pirot:
- **Help for the expressions:** Operators and functions in the File menu, and a link under the fields of every block with
  an expression, open a table of the operators and the functions with their meaning and an example. The result of each
  example is computed by the interpreter when the help opens, so it always matches what an algorithm does.
- **Variable declared twice:** before a run, the console warns when a function declares the same variable in more than
  one Declare block, or declares a parameter again (a second Declare makes a new variable and the old value is lost).
  One Declare inside a loop is not reported.
- New strings in English, Serbian Latin and Serbian Cyrillic.

## 2.5.3 – 2026-11-09 (stable)

- **Comments button in the reader view:** when some block has a comment, the bar has a Comments switch. It numbers the
  bubbles of the blocks and lists all the comments under the diagram (block and comment), for a projector or a printout
  where nobody holds the mouse over a block. A click on a block in the list marks it in the diagram and in the code; the
  choice is remembered in the browser. The tooltips stay as they were.
- **Safer interpreter:** a string can have at most 100,000 characters, and the arrays of the calls running at the same
  time at most 1,000,000 elements together (a row of a matrix counts as 10). Declaring an array costs one step for every
  20 elements, so a loop that declares big arrays stops quickly. A matrix with no columns cannot have more rows than an
  array can have elements. The PHP interpreter of qtype_algorithm has the same limits, so a response cannot fill the
  memory or the time of the grading server.
- New error messages for the two limits (English, Serbian Latin and Cyrillic).
- **Fast steps with big arrays:** a step copies only the start of an array for the variables panel and the trace table
  (16 elements, and the length), so Run, Step and the tests in the browser no longer slow down with the size of the
  arrays, and a long trace of a big array no longer fills the memory of the browser.
- **Exercise dialog:** a note under the separate template says that the solution is always saved in the page, also when
  students cannot show it, and that graded work belongs in the Algorithm question type (also in the README).
- An image whose attributes were removed by the HTML cleaning is read back only from a file of the same site and only
  up to 5 MB.
- The Node tests use module.registerHooks() where Node has it (module.register() is deprecated).

## 2.5.2 – 2026-11-08 (stable)

- **Reader view toolbar:** the zoom buttons and a new full screen button sit in the corner of the diagram, as in the
  editor; the bar keeps Run, Step, Reset, the speed and the status, then Trace table, Variables and Code.
- **Full screen for the reader view:** the diagram, the bar, the console, the variables and the code cover the screen
  (through the browser, or by covering the window where the browser cannot, e.g. on an iPhone); Esc, the same button
  or the F key leave it. On a wide screen the code stays beside the diagram.
- **Variables and Code are switches:** pressed (blue) means the panel is shown; the label stays the same.
- **Input on phones:** the field where the algorithm reads a value has a check button, and the Go / Done key of a phone
  keyboard confirms it (phone keyboards often send no Enter key). It never submits a quiz page around the widget.
- **Narrow screens:** the speed slider loses its Slow / Fast words and the bar uses smaller gaps.

## 2.5.1 – 2026-11-08 (stable)

- **Algorithm templates library:** added standard school programming templates (Swap, Rectangle, Max of 2, Even/Odd, Sum 1..N, Factorial, Euclid GCD, Linear search) accessible from the File menu.
- **Copy image to clipboard:** one-click high-resolution PNG export directly to system clipboard for pasting into presentations and worksheets.
- **CodeLab bridge:** added button to prepare and copy generated code for the CodeLab execution environment.

## 2.5.0 – 2026-11-08 (stable)

- **Synchronized 2.5.0 release:** unified versioning and build alignment with filter_algorithm and qtype_algorithm (build 2026111500).
- **Verified translation integrity:** complete Ekavian Serbian and English language strings.
- **Maintenance & QA:** rebuilt all AMD modules with Moodle Grunt, validated copyright headers across all files.

## 2.4.4 – 2026-11-05 (stable)

- **File menu:** it opens under the File button (it opened at the left edge of the toolbar, because the toolbar is a
  flex row), and its items have their own padding and colours, so a theme cannot paint the focused item dark with
  dark text.

## 2.4.3 – 2026-11-05 (stable)

- Same code as 2.4.2, with a new version number: the Moodle Plugins directory test run of 2.4.2 failed before it
  started (no log files), and an uploaded version number cannot be used again.

## 2.4.2 – 2026-11-05 (stable)

- **Accessibility (axe: no violations in the viewer, the trace table, the editor, the shortcuts and a quiz question):**
  the diagram of a page takes the keyboard focus and can be scrolled with the arrow keys; the function list and the
  speed slider have names; the panel titles no longer break the heading order of the page; the zoom button is named
  by the zoom it shows; the list of shortcuts is a correct definition list.

## 2.4.1 – 2026-11-05 (stable)

- **Default code language:** the language chosen in the code panel of the insert dialog (or of the question form)
  becomes the language every reader sees first; new diagrams start with the teacher's last choice. A student's choice
  in an attempt does not change the answer. The language list also shows the language really shown (it showed
  Pseudo-code above Python code).
- **Wide editor (full screen):** the code has its own column right of the diagram; the diagram uses the whole width
  again; the File button stays next to the other buttons.
- **Menus are not cut off:** the block menu and the menu of a block open inside the editor, not inside the scrolling
  diagram, and move left or up when there is no room.
- **Viewer:** the Text description goes under the diagram and the code.
- **Fix:** a click in the side panel of the insert dialog switched its tabs (the panel used the dialog's attributes).
- Checked with the Boost and Moove themes.

## 2.4.0 – 2026-11-05 (stable)

Interpreter (the same in qtype_algorithm's PHP interpreter, checked by the parity fixtures):
- **Break and Continue** blocks (only inside a loop; outside a loop the run stops before it starts).
- **Limits:** at most 200 nested calls of user functions and 100000 characters of output, with clear errors.
- **Typed input:** an Integer takes only a whole number, a Real only a number, a Boolean only true or false.
- **Random** gives the same numbers in every test and grading run (a seed), so expected outputs stay valid.
- **Pi** without a variable of that name is the number pi; Flowgorithm's **ToInteger, Sgn, Size, Arcsin, Arccos,
  Arctan, Log10, ToFixed**.
- Variables named like JavaScript object properties (constructor, toString) work.
- **Function tests** can pass arrays and matrices (`[1, 2, 3]`, `[[1, 2], [3, 4]]`); the result shows them after the
  call, so a procedure that sorts or fills an array can be tested.

Editor and viewer:
- **Debugging:** breakpoints (F9, the block menu, Alt + click in pages), Continue, a status, the call stack above the
  variables, the block and code lines of an error in red with Show the block, F5 / F10.
- **Trace table** of the last run (File menu, viewer button): values after each step, Copy, Download CSV.
- **Break, Continue and early Return** are drawn with a dashed line to where they go; blocks after a jump are faded;
  the run warns about them and about functions that may end without Return.
- **Comments on blocks** shown as tooltips and written above the block's code.
- A value that does not fit the type is asked again with a hint; a screen reader hears every step.
- **File menu** (import, export, pictures, trace table, shortcuts), zoom in the corner of the diagram, Slow / Fast on
  the speed slider, **?** lists the keyboard shortcuts, Undo right after Delete, a hint on an empty diagram, a long
  press opens the block menu, tabs for the console, the variables and the code on narrow screens.
- Options `showCode` and `fileTools` of the editor (qtype_algorithm's "hide the code and the file tools").
- A failed test of a quiz question can be stepped through with its input.

Generated code:
- **Pseudo-code** in the user's language, and a **Text description** (the pseudo-code) under every diagram of a page.
- **Visual Basic .NET, Go, Rust and Kotlin** (a typed generator that converts numbers like the interpreter).
- Break and Continue, Pi and the new functions in every language; names that are words of the language get "_";
  Java and C read whole lines (text input with spaces works); Len of an array; a function of the algorithm named like
  a built-in one is called as written.

Flowgorithm files:
- The return variable of a function is imported as a Return block and exported back (no `<return>` elements).
- A stricter XML reader (closing tags, `&#x...;` entities, CDATA, limits) and translated import messages.
- The export reports functions Flowgorithm does not have and writes comments of blocks as Comment blocks.

2.3.0 and 2.3.1 (not on the Marketplace on their own) are part of this release.

## 2.3.1 – 2026-11-06 (stable)

- **A click on a block shows its code in the viewer too:** in pages and quiz questions (no editing) a click on a
  block marks it and its lines in the code panel; a click on it again, beside the blocks or Escape removes the mark.
  Without the code panel (hidden or turned off) the click does nothing and the blocks no longer look clickable.

## 2.3.0 – 2026-11-06 (stable)

- **A click on the code finds the block:** clicking a line of the generated code selects the block it comes from
  and scrolls the diagram to it (it also switches to the function of the block). The lines of the selected block are
  marked blue in the code, so a click on a block shows its code too. In the code panel the arrow keys go from block
  to block and Enter moves the focus to the block in the diagram. In the viewer of filter_algorithm and quiz
  questions the click marks the block without editing it, Escape removes the mark. While a program runs the clicks
  do nothing and the orange mark of the running block stays. (`blockAt`, `nextBlock` and `revealNode` in
  `codeview.js`; new `tests/codeview.test.mjs`.)

## 2.2.1 – 2026-11-05 (stable)

- **Run and Step do not make the test results old:** a student who edits a copy of an exercise and steps through it
  no longer sees "You changed the algorithm since this run"; only a real change of the algorithm does that
  (`workspace.js`).

## 2.2.0 – 2026-11-05 (stable)

- **The running block is marked in the code too:** during Run and Step the lines of the generated code that belong to
  the current block are highlighted and scrolled into view, in the editor, the viewer of filter_algorithm and quiz
  questions (`generateLines` in `codegen.js` tells the block of every line, `codeview.js` shows and marks them).
- **Matrices as parameters:** a parameter written `m: Integer[,]` (or `Integer[][]`) is a matrix, passed by reference
  like an array and used as `m[i, j]`. Passing an array, a number or a matrix of the wrong kind gives a clear error.
  The generated code supports it in all seven languages (in C the function also gets the numbers of rows and
  columns, in Pascal the matrix has a named type).
- **Do...While shows its F branch:** the line below the condition is labelled F and is marked while running when the
  loop ends, like the F branch of the other conditions.
- **Pascal: Char(s, i) compiles with ToCode:** `Char(s, i)` is now `Copy(s, i + 1, 1)`, a string of one character;
  `s[i + 1]` was a Char, so `ToCode(Char(s, i))` did not compile.
- **CI runs the Pascal test again:** only `fp-compiler` is installed (the `fpc` package took 18 minutes on a slow
  mirror), and a program that does not compile now fails the test instead of skipping it as "no compiler".

## 2.1.0 – 2026-11-04 (stable)

- **Arrows on the connections:** a line that enters a block, the line back to the condition of a loop, the exit of a
  loop and the two branches of an If that meet below it end in an arrowhead (`layout.js` marks the lines, `render.js`
  draws a small triangle, no SVG marker ids). Lines that only run on into another line stay plain. Saved images get
  the arrows when the diagram is opened and inserted again. New `tests/layout.test.mjs`.
- **Names as declared in the generated code:** the interpreter ignores capital letters in names, the languages do not.
  The code now writes every variable, parameter and function the way it was declared (`Suma` also where the diagram
  says `suma`), and knows its type there too (C printed such a Real with `%d`).
- **Save as SVG or PNG:** two new toolbar buttons download all functions of the diagram as one picture, for handouts,
  tests on paper and slides. The PNG is twice the size on screen; the SVG keeps the model like the inserted image.
- **The branch taken is marked while running:** after every condition of an If, While, For or Do...While, Run and
  Step colour the T or F branch the algorithm takes (thicker line, bold label), in the editor, the viewer of
  filter_algorithm and quiz questions. The interpreter reports it with a new `branch` event.

## 2.0.0 – 2026-11-02 (stable)

- **One storage format:** the image keeps only its source, classes and alt text; the model, the options, the solution and
  the tests are only in the SVG (`embed.js`). Images written by 1.x (with `data-algorithm` attributes) are still read. The
  alt text comes from the new `imagealt` string (name, number of functions and blocks).
- **Drag and drop:** blocks are dragged onto a **+** sign with the mouse, a pen or a finger (pointer events, one undo step);
  a finger on the background still scrolls, two fingers zoom. No text selection while dragging.
- **Copy and paste:** Ctrl/Cmd + C, X, V and D copy, cut, paste and duplicate the selected block (system clipboard as JSON,
  with a fallback in memory), **Paste** in the block menu, a **Duplicate** button; Alt + arrow moves the selected block.
- **Context menu:** a right click (or the Menu key, Shift + F10) on a block offers Copy, Cut, Duplicate, Paste below, Delete,
  **Move to…** and **Copy to…**: the + signs are marked and the one clicked (or chosen with Enter) receives the block;
  Escape cancels. A right click on a + sign opens the block menu.
- The dialog asks before Cancel, the X, Escape or a click outside throw away changes; the fields are locked while the
  algorithm runs; array parameters keep their `[]` when the parameter list is edited; larger targets for fingers.
- **Matrices:** Declare has a second size (`size2`); `m[i, j]` and `m[i][j]`; the interpreter checks the number of indexes
  (new error `e.dimensions`) and each index, the size limit counts all elements; code in all seven languages; the variable
  watch shows a matrix as a table; the `.fprg` export refuses a matrix (`fprgmatrix`).
- **Function tests:** a test with `call` runs one function with the inputs as arguments and compares the value it returns
  (`execute(program, {call})`, `callText`). **Comparison options** `ignorecase`, `ignorespaces`, `tolerance` (`sameLine`).
  The tests panel lets the teacher choose what a test runs, and (question type) its weight.
- Generated code fixed: C arrays start from zeros (`memset`), Java writes whole Reals as `7` (`fmt`) and String arrays start
  as `""`, C# writes Reals with a dot whatever the language of the computer, Python `[0] * (n + 1)`.
- New Node tests: storage format, copy and move of blocks, matrices (compiled in C, C++, C#, Java, JavaScript, Pascal,
  Python), function tests, comparison options.

## 1.2.0 – 2026-11-02 (stable)

- **Fixed: diagrams disappeared in forum posts, assignment text and other content that Moodle cleans.** The HTML cleaning
  removes `data:` images and `data-*` attributes. Where the editor has a file area the SVG is now uploaded as a file of the
  text; the options, the solution and the tests are written into the SVG as well (new module `embed.js`), and the image
  gets the classes `tiny_algorithm-image` and `tiny_algorithm-run`, which the cleaning keeps. Without a file area the image
  is a data URI as before. Content saved with an older version keeps its HTML in the database: open the diagram in the
  editor and click **Insert** to store it as a file.
- Renaming a function renames its calls in every expression of the program (names compare without case, text in quotes
  is left alone; nothing changes when the name is invalid or used by another function).
- **CSS classes renamed** from `alg-*` to `tiny_algorithm-*` (frankenstyle). A theme that styled the old classes must use the
  new names.
- Double-click also opens an algorithm image that lost its attributes.

## 1.1.0 – 2026-11-01 (stable)

- **Keyboard:** the blocks of the editor take the focus (one tab stop, roving tabindex). The arrow keys, Home and End move
  between the blocks and the **+** signs; Enter or Space on a **+** opens the block menu, on a block selects it and moves to
  its first field; Enter in a field applies the value and returns to the block; Delete removes the selected block; Escape
  deselects it. The block menu works with the arrow keys, Home, End, Escape and Tab. Undo / redo also with Cmd on a Mac
  and Ctrl+Shift+Z. A hint under the function fields lists the keys (`ui_keyhint`).
- Enter in a field of the editor and in the console input no longer submits the form around the editor (quiz page).
- **Translated error messages:** the interpreter and the expression parser throw `AlgorithmError` with a code and values
  (new `e.*` strings, `ui_e_*` in the language files); `errorText()` shows them in the user's language in the console,
  the code panel and the tests. The `message` stays English, so the PHP interpreter of qtype_algorithm is still compared
  with the browser.
- Arrays are limited to 100000 elements (`MAX_ARRAY_SIZE`, new error `e.arraysize`), the same limit as on the server.
- `fill()` replaces the placeholders in one pass (a value that contains `{name}` is not replaced again).
- The running block has a dark border too, the focused block a dashed one, and the **+** signs more contrast.
- `privacy:metadata` mentions what the browser keeps in its local storage.
- Serbian translations are ekavian (rešenje, vrednost, posle, ocena).

## 1.0.0 – 2026-10-31 (stable)

- **Stable release.**
- **Code generation in C++, JavaScript and Pascal**, next to Python, C, Java and C#. C++ uses `iostream`, `string` and
  `vector`; JavaScript runs with Node.js and reads the input from standard input; Pascal is for Free Pascal
  (`{$mode objfpc}`, a `var` section per function, `repeat … until`, strings from index 1).
- **Fixed:** the generated code lost the parentheses of the expression (`(a + b) * 2` became `a + b * 2`,
  `not (a or b)` became `!a || b`) in every language. Parentheses now follow the operator precedence of the target language.
- **Translation:** the texts of the editor, viewer, workspace and tests panel moved from `amd/src/strings.js` to the language
  files (`ui_*` strings in en, sr_lt, sr_cr) and are loaded through `core/str` by the new `tiny_algorithm/langstrings`
  module, so they can be translated in AMOS. `strings.js` keeps the English texts as a fallback (Fixes #2).
- Every source file has the Moodle GPL boilerplate (Fixes #1).
- The tests compile and run the generated C++, JavaScript and Pascal programs and compare them with the interpreter;
  the GitHub workflow runs the Node tests (with .NET and Free Pascal).

## 0.5.2 – 2026-10-28 (alpha)

- Tests: a line with only `""` in the inputs is an empty value, so a test can enter an empty text.
- After the student changes the algorithm, the last test results are greyed out with a note to test again.
- C code: string assignment uses `strcpy`, and a joined string (`r = r & c`) is formatted with `snprintf` first.
- `tests` module: `runProgram` also returns the output written after the last input; `checkedOutput` compares only that part
  and/or only the numbers in it (`runTests`, `computeExpected`, `TestsPanel` take the same `check` option). Used by
  qtype_algorithm 0.3.0, which also uses the new `hiddenOption` and `onChange` of the teacher's test list.

## 0.5.1 – 2026-10-28 (alpha)

- Flowgorithm string functions: **`Char(s, i)`** returns the character at index `i` (from 0), **`ToChar(n)`** the character
  with code `n`, **`ToCode(s)`** the code of the first character. Python, C, Java and C# code uses them too.
  `Char(n)` with one argument still means `ToChar(n)`, so older diagrams keep working.
- `Char` with an index outside the string and `ToCode` of an empty string stop the run with an error, as in Flowgorithm.

## 0.5.0 – 2026-10-28 (alpha)

- **Students can edit and test** a diagram in any content (Page, Text and media area, Book, Lesson…) when the teacher ticks
  *Students can edit and test the algorithm*. Students get an **Edit** button for their own copy (kept in their browser),
  **Restore original**, **Full screen** and, when allowed, **Show solution** (new `workspace` module).
- **Tests**: the teacher enters only the inputs (one value per line); the expected outputs are computed from the teacher's
  solution. Students run the tests and see ✓/✗ with the expected and actual output side by side and the first different line
  highlighted (new `tests` module, Node tests in `tests/tests.test.mjs`).
- **Starting template**: students can start from a separate template (empty, or copied from the solution) instead of the
  solution. The dialog has the tabs *Solution*, *Starting template* and *Tests*.
- New attributes: `data-algorithm-edit`, `data-algorithm-solution`, `data-algorithm-tests`, `data-algorithm-showsolution`.
  Diagrams without them behave as before.
- `AlgorithmEditor.setProgram()` (undoable).

## 0.4.0 – 2026-10-16 (alpha)

- Supports **Moodle 4.5 LTS** (`requires` lowered to 4.5, `supported` 4.5 – 5.3); tested on 4.5, 5.0 – 5.3.
- Moodle coding standard: phpcs, ESLint and stylelint report no problems; GitHub Actions (moodle-plugin-ci) added.
- New README and `description.html` for the Moodle plugins directory.
- **Serbian Cyrillic (sr_cr)** language files and UI strings; the UI picks Latin or Cyrillic from the Moodle language.

## 0.3.0 – 2026-10-17 (alpha)

- **Variable watch** panel (editor and reader view): shows the value of every variable at each step, highlights values that
  changed, and truncates long arrays.
- The code panel in the reader view can be **hidden or shown** with a button that remembers the choice; on a narrow content area
  it moves below the diagram (layout follows the width of the content, not of the screen).
- Per-diagram author options in the dialog: **Show generated code** and **Show variable watch** (`data-algorithm-code="0"` and
  `data-algorithm-watch="0"` hide them, for example in quiz questions that would reveal the answer).
- `AlgorithmEditor` gets an `onChange` callback (used by `qtype_algorithm`).
- The viewer styles moved from `filter_algorithm` to this plugin, next to the runner that builds the markup.

## 0.2.0 – 2026-10-16 (alpha)

- Code generation for **C#** (compiled and run in the tests when the .NET SDK is available).
- The reader view (`runner`) shows the generated code next to the diagram, with a language selector (Python, C, Java, C#),
  a Copy button and a **Code** button that hides or shows the panel.

## 0.1.0 – 2026-10-16 (alpha)

- Visual flowchart editor in TinyMCE (declare, assign, input, output, if, for, while, do…while, call, return, comment;
  several functions; undo / redo).
- Interpreter with console, input prompts, Run / Step / Stop, highlighting and an infinite-loop guard.
  Case-insensitive variable names and multi-name declarations, as in Flowgorithm.
- Flowgorithm `.fprg` import and export (real file format).
- Code generation for Python, C and Java.
- Zoom (−, +, 100%, Fit, Ctrl + mouse wheel).
- Long and multi-line comment blocks are wrapped.
- Diagrams are inserted as SVG images that keep their model (`data-algorithm`) and can be edited again by double-click.
- **Interactive** option (`data-algorithm-run`) for the companion filter `filter_algorithm`.
- English and Serbian (Latin) strings.
