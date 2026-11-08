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
 * Tests for the educational algorithm templates.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATES} from '../amd/src/templates.js';

test('templates list contains all 8 standard templates across expected categories', () => {
    assert.equal(TEMPLATES.length, 8);
    const ids = TEMPLATES.map((t) => t.id);
    assert.deepEqual(ids, ['swap', 'rectangle', 'max2', 'evenodd', 'sum_n', 'factorial', 'gcd', 'linear_search']);

    const categories = new Set(TEMPLATES.map((t) => t.category));
    assert.ok(categories.has('linear'));
    assert.ok(categories.has('branching'));
    assert.ok(categories.has('loops'));
    assert.ok(categories.has('arrays'));
});

test('every template generates a valid program model with a populated Main function', () => {
    for (const tmpl of TEMPLATES) {
        const prog = tmpl.build();
        assert.ok(prog.name, `${tmpl.id} has name`);
        assert.equal(prog.version, 1, `${tmpl.id} version 1`);
        assert.ok(prog.functions && prog.functions.length >= 1, `${tmpl.id} has functions`);
        const main = prog.functions[0];
        assert.equal(main.name, 'Main', `${tmpl.id} first fn is Main`);
        assert.ok(main.body.length > 0, `${tmpl.id} has statements`);

        // Check every block has id, type and valid props
        for (const b of main.body) {
            assert.ok(b.id, `${tmpl.id} block has id`);
            assert.ok(b.type, `${tmpl.id} block has type`);
        }
    }
});
