# Changelog

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
