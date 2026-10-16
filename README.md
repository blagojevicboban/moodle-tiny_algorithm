# Tiny Algorithm - Flowchart Editor for Moodle

[![Moodle Plugin CI](https://github.com/blagojevicboban/moodle-tiny_algorithm/actions/workflows/ci.yml/badge.svg)](https://github.com/blagojevicboban/moodle-tiny_algorithm/actions/workflows/ci.yml)
[![Moodle](https://img.shields.io/badge/Moodle-4.5%20to%205.3-orange.svg)](https://moodle.org)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-purple.svg)](https://php.net)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

**Tiny Algorithm** is a TinyMCE plugin for Moodle that lets teachers and students draw algorithms as
[Flowgorithm](https://www.flowgorithm.org/)-style flowcharts directly in the text editor, run them step by step, import and
export Flowgorithm `.fprg` files and generate **Python**, **C**, **Java** or **C#** code - without leaving the editor.

> Status: **alpha**. Inspired by Flowgorithm, not affiliated with it.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧱 **Visual Editor** | Declare, Assign, Input, Output, If, For, While, Do…While, Call, Return, Comment; several functions, undo / redo |
| ▶️ **Interpreter** | Run / Step / Stop with a speed slider, the running block is highlighted, console with input prompts |
| 🛡️ **Safe Execution** | Infinite-loop guard and clear errors (undeclared variable, division by zero, index out of range) |
| 🔍 **Variable Watch** | Current value of every variable while stepping, changed values highlighted, long arrays shortened |
| 🔎 **Zoom** | **−**, **+**, **100%**, **Fit** buttons or **Ctrl + mouse wheel** |
| 📂 **Flowgorithm Files** | Import and export real `.fprg` files; unsupported elements are reported, not silently dropped |
| 💻 **Code Generation** | Python, C, Java and C#; the C# output is compiled and run by the tests |
| 🖼️ **Editable Images** | The diagram is a normal SVG image that stores its model - double-click it to edit again |
| ⚙️ **Per-diagram Options** | *Interactive*, *Show generated code*, *Show variable watch* (turn code off in quiz questions) |
| 🌐 **Languages** | English and Serbian (Latin) |
| 🔒 **Privacy** | GDPR compliant (Privacy API, no personal data stored) |

## 📋 Requirements

- **Moodle**: 4.5 LTS or newer (4.5, 5.0, 5.1, 5.2 and 5.3 tested)
- **PHP**: 8.2+
- **Editor**: TinyMCE (the default editor)
- **Database**: MySQL, MariaDB or PostgreSQL (the plugin has no tables)

## 🔌 Related Plugins

| Plugin | Purpose |
|--------|---------|
| [filter_algorithm](https://github.com/blagojevicboban/moodle-filter_algorithm) | Gives readers **Run / Step / Reset** on diagrams marked *Interactive* |
| [qtype_algorithm](https://github.com/blagojevicboban/moodle-qtype_algorithm) | Quiz question type where the student draws the algorithm |

Both depend on this plugin, so install it first.

## 🚀 Installation

### Via Git
```bash
cd /path/to/moodle/public/lib/editor/tiny/plugins     # Moodle 5.1+; use lib/editor/tiny/plugins before 5.1
git clone https://github.com/blagojevicboban/moodle-tiny_algorithm.git algorithm
php admin/cli/upgrade.php
```

### Via Download
1. Download the [latest release](https://github.com/blagojevicboban/moodle-tiny_algorithm/releases)
2. Extract to `lib/editor/tiny/plugins/algorithm` (`public/lib/...` in Moodle 5.1+)
3. Visit Site Administration → Notifications

The **Algorithm** button appears in the *advanced* toolbar group and under **Insert → Algorithm…**. To move it, edit the toolbar
under Site administration → Plugins → Text editors → TinyMCE editor → General settings. The compiled AMD modules are included
in `amd/build`.

## 📖 Usage

### For Teachers and Students

1.  **Open the editor**: In any TinyMCE field (Page, course summary, forum post…) click **Algorithm** (or **Insert → Algorithm…**).
2.  **Build the flowchart**:
    -   Click a **+** between blocks to insert a block.
    -   Click a block to edit its properties; use **Up / Down / Delete** to arrange.
3.  **Test it**: **Run** or **Step**; the console asks for *Input* values and the variable watch shows the state.
4.  **Import / Export**: **Import .fprg** loads a Flowgorithm file, **Export** saves one.
5.  **Insert**: Optionally tick **Interactive**, then click **Insert**. Double-click the image later to edit it.

### Expressions

Follow Flowgorithm: `+ - * / ^ mod`, comparisons `= <> < <= > >=`, logic `and or not`, string join `&`, and functions such as
`Sqrt`, `Abs`, `Floor`, `Ceiling`, `Round`, `Len`, `ToInt`, `ToReal`, `ToString`, `Random`. Variable names are case insensitive,
one *Declare* block may list several names (`a, b, p`), arrays use `name[index]`, user functions may be recursive.

## 🔑 Permissions

| Capability | Purpose | Default roles |
|------------|---------|---------------|
| `tiny/algorithm:viewplugin` | Shows the **Algorithm** button in the editor | Manager, Teacher, Editing Teacher, Student |

## 🛠️ Development

```bash
# Rebuild AMD modules after changing amd/src (from the Moodle root)
npx grunt amd --root=public/lib/editor/tiny/plugins/algorithm

# Run the Node tests (parser, interpreter, code generator, .fprg import / export, renderer)
node --import ./tests/register.mjs --test "tests/*.test.mjs"
```

The Python and C# generators are checked by running the generated code (C# needs the .NET SDK and is skipped without `dotnet`).
C and Java output is generated but not compiled by the tests.

## 📁 Structure

```
lib/editor/tiny/plugins/algorithm/
├── amd/
│   ├── src/          # JavaScript modules (model, parser, interpreter, layout, render, codegen, editor, runner…)
│   └── build/        # Compiled modules
├── classes/          # plugininfo, privacy provider
├── db/               # Capabilities
├── lang/             # en, sr_lt
├── tests/            # Node tests
├── styles.css
└── version.php       # Plugin metadata
```

## ⚠️ Known Limitations

- Variable names are case insensitive in the interpreter, but not in the generated Python / C / Java / C# code.
- Arrays, functions and `.fprg` import are verified by the Node tests and real Flowgorithm files, not inside the Moodle dialog.

## 🌍 Languages

- 🇬🇧 English
- 🇷🇸 Srpski (Serbian, Latin)

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).

## 📄 License

GNU GPL v3 or later - see [LICENSE](LICENSE).

## 👤 Author

**Boban Blagojević**  
[GitHub](https://github.com/blagojevicboban)

## 🙏 Credits

- [Flowgorithm](https://www.flowgorithm.org/) - the flowchart style and `.fprg` file format that inspired this plugin
- [TinyMCE](https://www.tiny.cloud/) - the editor it extends

---

Made with ❤️ for teaching programming
