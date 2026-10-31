# Changelog

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
