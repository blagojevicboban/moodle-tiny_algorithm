# tiny_algorithm – flowchart editor for the Moodle TinyMCE editor

Draw algorithms as Flowgorithm-style flowcharts directly in the Moodle text editor, run them step by step,
import and export Flowgorithm `.fprg` files and generate Python / C / Java code.

**Status: alpha.** Developed and tested on Moodle 5.3 (the plugin declares Moodle 5.0 as the minimum).

## Features
- Visual editor: declare, assign, input, output, if, for, while, do-while, call, return, comment; several functions;
  undo / redo; property panel with expression checking.
- Interpreter with console, input prompts, Run / Step / Stop, highlighting of the running block and an infinite-loop guard.
  Variable names are case insensitive, as in Flowgorithm. Declarations can list several names (`a, b, p`).
- Import and export of Flowgorithm `.fprg` files (the real format; unsupported elements are reported as warnings).
- Code generation for Python, C and Java (copy / download).
- The diagram is inserted as an SVG image. The model is stored in the image (`data-algorithm` attribute and SVG metadata), so
  double-clicking the image re-opens it in the editor. Moodle's HTML purifier keeps the attribute.
- "Interactive" option in the dialog marks a diagram with `data-algorithm-run` so that readers can run it, see the companion
  filter below.
- UI strings in English and Serbian (Latin).

## Install
1. Copy this folder to `lib/editor/tiny/plugins/algorithm` (Moodle 5.0) or `public/lib/editor/tiny/plugins/algorithm`
   (Moodle 5.1+).
2. Visit *Site administration → Notifications* (or run `php admin/cli/upgrade.php`).
3. The **Algorithm** button appears in the "advanced" toolbar group and under *Insert* in TinyMCE.

The compiled AMD modules are committed in `amd/build`. After changing `amd/src`, rebuild them with Moodle's
`npx grunt amd --root=<path to this plugin>`.

## Interactive diagrams for readers
Install the companion filter [filter_algorithm](https://github.com/blagojevicboban/moodle-filter_algorithm) and enable it.
It replaces diagrams marked "Interactive" with a diagram that has Run / Step / Reset buttons; execution happens in the reader's
browser. The filter imports `tiny_algorithm/runner`, `tiny_algorithm/render` and `tiny_algorithm/model` from this plugin.

## Tests
The parser, interpreter, code generator, `.fprg` import / export and renderer have Node tests (Node 20+, no dependencies):

    node --import ./tests/register.mjs --test "tests/*.test.mjs"

The Python generator is also checked by running its output; the C and Java output is generated but not compiled by the tests.

## Known limitations
- Moodle's ESLint (`grunt amd`) still reports style errors (JSDoc, line length); the build is done with `--force`.
- Variable names are case insensitive in the interpreter but not in the generated Python / C / Java code.
- Only the editor dialog, saving and re-opening, and the reader view were verified in a browser; arrays, functions and
  `.fprg` import were verified with the Node tests and with real Flowgorithm files, not in the Moodle dialog.

## License
GNU GPL v3 or later, see [LICENSE](LICENSE).
