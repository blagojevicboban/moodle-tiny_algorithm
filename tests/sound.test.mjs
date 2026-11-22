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
 * Tests of tiny_algorithm/sound: which cue a change of the state of a run gets, and the remembered choice.
 *
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {STEP_TONE_DELAY, TONES, cueFor, playCue, setSound, soundOn} from '../amd/src/sound.js';

test('cueFor: a step while stepping or running slowly, the end, an error; nothing else', () => {
    assert.equal(cueFor('paused', 3, 0), 'step');
    assert.equal(cueFor('running', 3, STEP_TONE_DELAY), 'step');
    assert.equal(cueFor('running', 3, STEP_TONE_DELAY - 1), null, 'running fast: no tone for each step');
    assert.equal(cueFor('running', 0, 1000), null, 'the start of a run');
    assert.equal(cueFor('done', 12, 0), 'end');
    assert.equal(cueFor('error', 4, 0), 'error');
    assert.equal(cueFor('stopped', 4, 1000), null);
});

test('the tones are short and quiet enough to repeat', () => {
    for (const [kind, tones] of Object.entries(TONES)) {
        const seconds = tones.reduce((sum, [, s]) => sum + s, 0);
        assert.ok(seconds <= 0.5, kind);
        tones.forEach(([hz]) => assert.ok(hz >= 200 && hz <= 1000, `${kind} ${hz}`));
    }
});

test('off by default; the choice is remembered; no localStorage means off', () => {
    const store = new Map();
    globalThis.window = {localStorage: {getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k)}};
    try {
        assert.equal(soundOn(), false);
        setSound(true);
        assert.equal(soundOn(), true);
        setSound(false);
        assert.equal(soundOn(), false);
        globalThis.window = {get localStorage() {
            throw new Error('blocked');
        }};
        assert.equal(soundOn(), false);
        setSound(true);
        // Without Web Audio nothing is played and nothing fails.
        playCue('end');
    } finally {
        delete globalThis.window;
    }
});
