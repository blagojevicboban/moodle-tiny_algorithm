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
 * Tests of the help for the expressions: every example runs and gives the expected value.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {FUNCTIONS, OPERATORS, evaluate} from '../amd/src/help.js';
import {STR} from '../amd/src/strings.js';

test('every example of the help runs, and the fixed ones give these values', () => {
    const expected = {
        '7 / 2': '3.5', '2 ^ 10': '1024', '17 mod 5': '2', '"x = " & 5': 'x = 5', '3 <> 4': 'true',
        'not (3 > 4) and true': 'true', 'Abs(-7)': '7', 'Sqrt(16)': '4', 'Round(2.5)': '3', 'Int(7.9)': '7',
        'Floor(2.7) & " " & Ceiling(2.1)': '2 3', 'Sin(Pi / 2)': '1', 'Log10(1000)': '3', 'Sgn(-3)': '-1',
        'Len("Pirot")': '5', 'Char("Pirot", 0)': 'P', 'ToCode("A") & " " & ToChar(66)': '65 B',
        'ToInteger("12") + 1': '13', 'ToFixed(3.14159, 2)': '3.14', 'IsNumeric("12a")': 'false',
    };
    for (const [, example, key] of [...OPERATORS, ...FUNCTIONS]) {
        assert.ok(STR.en[`h.${key}`], `meaning h.${key}`);
        const value = evaluate(example);
        if (expected[example] !== undefined) {
            assert.equal(value, expected[example], example);
        }
    }
    assert.ok(['0', '1', '2', '3', '4', '5'].includes(evaluate('Random(6)')));
    assert.match(evaluate('Pi'), /^3\.14159/);
});
