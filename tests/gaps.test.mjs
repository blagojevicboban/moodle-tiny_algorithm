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
 * Tests of fill-the-gaps problems in the diagram: an empty field of a gap is drawn as a blank, a filled one as typed,
 * and the block itself is not changed.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {GAP, labelOf} from '../amd/src/layout.js';
import {createBlock as B} from '../amd/src/model.js';

test('an empty gap is drawn as a blank', () => {
    const w = B('while', {cond: '', gaps: ['cond']});
    assert.equal(labelOf(w), GAP);
    assert.equal(w.cond, '');
    const f = B('for', {variable: 'i', start: '1', end: '', gaps: ['end']});
    assert.equal(labelOf(f), `i = 1 to ${GAP}`);
});

test('a filled gap is drawn as typed; blocks without gaps are unchanged', () => {
    assert.equal(labelOf(B('assign', {target: 's', expr: 's + i', gaps: ['expr']})), 's = s + i');
    assert.equal(labelOf(B('assign', {target: 's', expr: ''})), 's = ');
});
