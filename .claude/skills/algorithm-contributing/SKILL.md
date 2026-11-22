---
name: algorithm-contributing
description: Rules and checks for contributing to the Algorithm Moodle plugins (tiny_algorithm, filter_algorithm, qtype_algorithm): flowcharts, their interpreters in JavaScript and PHP, code generation and the question type. Use while writing or changing any PHP, JavaScript, Mustache, CSS or language string in these repositories, before opening a pull request, and when the user asks whether a change is ready. Covers what the Moodle Plugins reviewers flag, the widget strings, the JS/PHP interpreter parity, the checks CI runs and what contributors must not change.
---

# Contributing to the Algorithm plugins

The family: `tiny_algorithm` (core: flowchart editor, interpreter, code generation in 13 languages, step by step,
call tree, arrays, turtle, AI hints), `filter_algorithm` (runnable flowcharts in pages, class view, students' copies on
the server) and `qtype_algorithm` (graded flowchart questions, with a **PHP interpreter** that must give the same
results as the JavaScript one). `filter_algorithm` and `qtype_algorithm` depend on `tiny_algorithm` and import its AMD
modules. Read `CONTRIBUTING.md` of the repository first.

## Workflow

- One issue per pull request, from a branch `fix/<name>` or `feature/<name>`; `Fixes #N` in the description.
- In a feature or fix pull request do not change `version.php`, `CHANGELOG.md` or `description.html`; they change in a
  release commit (see Releases). Say in the pull request when a change needs an upgrade step, a capability, cache or
  service.
- Commit messages in English: one line saying what changes for the user. Never commit keys or passwords.
- Push to your branch, never directly to `main`, also where the repository would allow it.

## Strings

- Texts of the widget (editor, viewer, panels) live in `amd/src/strings.js` as `STR.en` (the English fallback for Node
  tests) **and** in the language files as `ui_<key with . replaced by _>`; every entry point awaits
  `tiny_algorithm/langstrings` `load()` before building the widget. A new text = a new `STR.en` key plus `ui_*` in
  `lang/en`, `lang/sr_lt` and `lang/sr_cr` (`tests/strings.test.mjs` fails otherwise). Placeholders `{name}` in
  `STR.en`, `{$a->name}` in the language files.
- Other PHP texts: `get_string()`; Mustache `{{#str}}`; every capability needs its string.
- The plugins also ship 12 more languages (de, fr, es, it, pt, pl, hr, bs, sl, mk, sk, cs). Add new keys only to en,
  sr_lt and sr_cr; the maintainer generates the other 12 with his translation tools. If a test asks for a key in every
  language, copy the English text there and say so in the pull request.
- Serbian is **ekavian** (rešenje, vrednost, posle, promenljiva, ocena), never ijekavian. No emoji anywhere.

## The two interpreters

- A change of the language of the flowcharts (expressions, blocks, functions, errors, strict initialisation, records,
  files, turtle) must be made in **both** interpreters: `tiny_algorithm/amd/src/interpreter.js` (and `expr.js`) and
  `qtype_algorithm/classes/local/interpreter.php` (and `expr.php`, `tester.php`), with the same results and the same
  error keys.
- Parity: `node tests/fixtures/make_parity.mjs` (in qtype_algorithm, with tiny_algorithm next to it) writes the
  expected results of the JS interpreter to `tests/fixtures/parity.json`; `php tests/fixtures/check_parity.php` runs
  them with the PHP interpreter and lists every difference. It must list none. Add a fixture for the new behaviour.
- Keep `evalNode` and the other recursive functions small: extra locals there overflowed the 200-deep recursion test.

## What the Moodle Plugins reviewers flag

1. Full GPL header with the line `This file is part of Moodle`, then `@copyright` and `@license` in every PHP, JS,
   `.mjs` and Mustache file (copy an existing header).
2. No hard-coded user-facing text, including `aria-label`, `title`, `placeholder` and error messages.
3. No larger HTML built in JavaScript: templates (`core/templates`) for panels and dialogs, `createElement` +
   `textContent` for small parts, SVG with `createElementNS`.
4. Privacy API updated for new personal data or a new place data is sent to; backup and restore for new question
   fields; capability checks, `validate_context` and `require_sesskey()` where needed.

## Checks before a pull request (the same as CI)

```sh
moodle-plugin-ci phplint
moodle-plugin-ci phpcs --max-warnings 0
moodle-plugin-ci phpdoc --max-warnings 0
moodle-plugin-ci validate
moodle-plugin-ci mustache
moodle-plugin-ci grunt --max-lint-warnings 0
moodle-plugin-ci phpunit --fail-on-warning
```

- tiny_algorithm Node tests: `node --import ./tests/register.mjs --test "tests/*.test.mjs"` (the TypeScript code
  generation tests need `tsc` on the PATH; CI installs `typescript@5.9.3`).
- After an interpreter change: the parity check above, and the PHPUnit tests of qtype_algorithm.
- JavaScript: edit `amd/src`, build with `npx grunt amd` and commit `amd/build` too. ESLint: lines up to 132
  characters, complexity up to 20, no nested ternaries, promises awaited or caught.
- CSS: stylelint with zero warnings (`currentcolor` instead of system colours like `CanvasText`, short hex colours, no
  `!important`).
- Accessibility of new panels: keyboard reachable, labels for controls, an axe check where possible.
- PHPUnit must pass on Moodle 4.5 to 5.3: guard APIs that older versions lack.

## Releases

Releases are made by the release manager (the maintainer, or a collaborator he named), after the pull requests are
merged and CI of `main` is green. Order when several plugins change: tiny first, then filter, then qtype (dependencies
first).

1. **Version** in `version.php`: `version` = date and two digits, higher than the last one (`YYYYMMDDXX`), `release`
   (`1.19.1`: patch for fixes, minor for features), `maturity` stays `MATURITY_STABLE`. When the plugin needs the new
   version of tiny, raise `dependencies` to tiny's new `version` in the same release.
2. **CHANGELOG.md**: a new section on top, `## <release> (<date>)`, what changes for teachers and students.
3. **README.md**: describe new features; requirements with the version of tiny the plugin needs.
4. **description.html** (the Marketplace listing): `What's New in v<release>` lists the changes since the version that
   is on the Marketplace now (one line per earlier release, `From x.y.z: ...`); the Marketplace sanitizer keeps only
   `p`, `div`, `a`, `img`, `ul`, `ol`, `li`, `strong`, `em`, `code`, `br`, `hr` (titles as `<p><strong>...</strong></p>`)
   and the field allows **at most 7000 characters**: shorten older items first.
5. Commit `Release <component> <release>`, push, wait for CI of `main`, then the tag: `git tag v<release>` and
   `git push origin v<release>`. A pushed tag is never moved: a fix is a new patch release.
6. **ZIP** for the Marketplace: `git archive --format=zip --prefix=<plugin folder>/ -o <component>-<release>.zip v<release>`
   (`codelab/` for the CodeLab plugins, `algorithm/` for the Algorithm plugins). `.claude/` is left out by
   `.gitattributes`.
7. **Release notes** for the upload form, plain sentences and `-` bullets only: no quotes, no parentheses, no `<`, `>`,
   `$`, `{}` and no code-like names (the upload page is behind Cloudflare and blocks such text).
8. Send the ZIPs and the notes to the maintainer, who uploads them to the Moodle Plugins directory with his account.
9. **Demo sites** (codelab, algorithm and aisim .tsp.edu.rs) take the plugins from `main` when their demo repository
   gets a push; the maintainer (or whoever has write on the demo repositories) refreshes them after a release.
