# Changelog

## Unreleased

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
