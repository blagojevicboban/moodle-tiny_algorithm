# Tiny Algorithm – Flowchart Editor (TinyMCE Plugin)

**Tiny Algorithm** is a self-contained TinyMCE plugin for Moodle. It lets teachers and students draw algorithms as
[Flowgorithm](https://www.flowgorithm.org/)-style flowcharts directly in the Moodle text editor, run them step by step,
import and export Flowgorithm `.fprg` files and generate **Python**, **C**, **Java** or **C#** code – without leaving the editor.

> Status: **alpha**. Developed and tested on Moodle 5.3. This project is inspired by Flowgorithm but is not affiliated with it.

## Features

- **Visual Editor**: Build a flowchart from blocks: *Declare, Assign, Input, Output, If, For, While, Do…While, Call, Return,
  Comment*. Several functions per diagram, undo / redo, and a property panel that checks expressions as you type.
- **Built-in Interpreter**:
  - **Run / Step / Stop** with a speed slider, the running block is highlighted on the diagram.
  - **Console** with input prompts for *Input* blocks.
  - **Infinite-loop guard** and clear error messages (undeclared variable, division by zero, index out of range).
  - Flowgorithm-compatible rules: variable names are case insensitive, one *Declare* block may list several names (`a, b, p`),
      arrays with `name[index]`, user functions (also recursive) and common built-in functions.
- **Readable Comments**: Long and multi-line comments are wrapped inside the comment block.
- **Variable Watch**: A table with the current value of every variable while the algorithm runs or is stepped through;
  changed values are highlighted and long arrays are shortened.
- **Zoom**: **−**, **+**, **100%** and **Fit** buttons, or **Ctrl + mouse wheel** to zoom around the pointer.
- **Flowgorithm Import / Export**: Open and save real `.fprg` files. Unsupported elements are reported as warnings instead of
  being silently dropped.
- **Code Generation**: Copy or download the diagram as Python, C, Java or C#. The generated C# is compiled and run by the
  tests and gives the same output as the interpreter.
- **Editable Images**: The diagram is inserted as an SVG image. The model is stored in the image itself
  (`data-algorithm` attribute and SVG metadata), so **double-clicking the image re-opens it in the editor**. Moodle's HTML
  purifier keeps the attribute and TinyMCE stores the SVG as a normal file.
- **Per-diagram Options**: **Interactive** (readers can run it), **Show generated code** and **Show variable watch**. Turn code
  and watch off, for example, in quiz questions that would otherwise reveal the answer.
- **Interactive Option**: Tick **Interactive** in the dialog so that readers can run the diagram themselves
  (needs the companion filter below).
- **Languages**: English and Serbian (Latin).
- **Privacy Compliant**: Implements the Moodle Privacy API (null provider – no personal data stored).

## Related Plugins

- **[qtype_algorithm](https://github.com/blagojevicboban/moodle-qtype_algorithm)** – a quiz question type in which the student
  draws the algorithm with this editor (manual grading).
- **[filter_algorithm](https://github.com/blagojevicboban/moodle-filter_algorithm)** – Algorithm viewer: turns diagrams
  marked *Interactive* into a diagram with **Run / Step / Reset** buttons for readers. The execution happens in the reader's
  browser. It reuses the `runner`, `render` and `model` modules of this plugin, so install this plugin first.

## Compatibility

| Moodle Version   | Status                                  |
|------------------|-----------------------------------------|
| Moodle 5.3       | ✅ Tested                               |
| Moodle 5.0 – 5.2 | ⚠️ Declared minimum is 5.0, not tested |
| Moodle 4.x       | ❌ Not supported (requires Moodle 5.0+) |

**PHP**: whatever your Moodle version requires (tested with PHP 8.3).

## Installation

1. Place the plugin folder in `lib/editor/tiny/plugins/algorithm` (Moodle 5.0) or
   `public/lib/editor/tiny/plugins/algorithm` (Moodle 5.1 and later).
2. Log in to Moodle as an administrator.
3. Navigate to **Site administration → Notifications** to complete the installation
   (or run `php admin/cli/upgrade.php`).
4. The **Algorithm** button appears in the *advanced* toolbar group and under **Insert → Algorithm…** in TinyMCE.
   To move it, edit the toolbar under **Site administration → Plugins → Text editors → TinyMCE editor → General settings**.

The compiled AMD modules are included in `amd/build`.

## Usage

1. Open a TinyMCE editor (e.g. a Page resource, course summary or forum post).
2. Click the **Algorithm** button (or **Insert → Algorithm…**).
3. Click a **+** between blocks to insert a block, click a block to edit its properties, use **Up / Down / Delete** to arrange.
4. Use **Run** or **Step** to test the algorithm, or **Import .fprg** to load a Flowgorithm file.
5. Optionally tick **Interactive**, then click **Insert**. To edit later, double-click the image in the editor.

**Expressions** follow Flowgorithm: `+ - * / ^ mod`, comparisons `= <> < <= > >=`, logic `and or not`, string join `&`,
and functions such as `Sqrt`, `Abs`, `Floor`, `Ceiling`, `Round`, `Len`, `ToInt`, `ToReal`, `ToString`, `Random`.

## Permissions

The plugin uses the following capability:

- `tiny/algorithm:viewplugin`: Controls who sees the **Algorithm** button in the editor.

**Default roles with access**: Manager, Teacher, Editing Teacher, Student.

## Building from Source

If you modify the JavaScript source files in `amd/src`, rebuild the AMD modules from the Moodle root:

```bash
npx grunt amd --root=public/lib/editor/tiny/plugins/algorithm
```

Moodle's ESLint rules still report style issues (JSDoc, line length) for this plugin, so the build currently needs `--force`.

## Tests

The parser, interpreter, code generator, `.fprg` import / export and renderer have Node tests (no dependencies):

```bash
node --import ./tests/register.mjs --test "tests/*.test.mjs"
```

The Python and C# generators are also checked by running the generated code (C# needs the .NET SDK and is skipped when `dotnet`
is not installed). The C and Java output is generated but not compiled by the tests.

## Known Limitations

- Variable names are case insensitive in the interpreter, but not in the generated Python / C / Java / C# code.
- Only the editor dialog, saving, re-opening, the reader view and zoom were verified in a browser. Arrays, functions and
  `.fprg` import were verified with the Node tests and with real Flowgorithm files, not inside the Moodle dialog.

## Technical Requirements

- Moodle 5.0 or higher (5.3 tested)
- TinyMCE editor enabled (standard in Moodle 5)
- Node.js 20.6+ (for running the tests and for building AMD modules if you modify the source)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as
published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for details.

---

© 2026 [Boban Blagojević](https://github.com/blagojevicboban)
