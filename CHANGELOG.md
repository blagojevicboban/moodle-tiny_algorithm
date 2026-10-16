# Changelog

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
