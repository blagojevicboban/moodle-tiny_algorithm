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
 * Optional sound cues of a run: a short quiet tone for a step, a low one for an error and a rising one for the end, made
 * with the Web Audio API (no sound files). Off until the reader turns them on with the Sound button of the editor or
 * the viewer; the browser remembers the choice. Turning them on is the reader's own choice, so it also holds when the
 * reader asked for reduced motion.
 *
 * @module tiny_algorithm/sound
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Key in localStorage. */
const KEY = 'tiny_algorithm_sound';

/** Shortest pause between steps (ms) that still gets the tone of a step while running. */
export const STEP_TONE_DELAY = 250;

/** The tones of each cue: [frequency in Hz, seconds]. */
export const TONES = {
    step: [[880, 0.04]],
    error: [[330, 0.12], [220, 0.22]],
    end: [[523, 0.09], [659, 0.09], [784, 0.16]],
};

/** Loudness of a tone (0 to 1): quiet. */
const VOLUME = 0.06;

let context = null;

/**
 * Whether the reader turned the cues on (false when localStorage cannot be used).
 *
 * @returns {boolean}
 */
export const soundOn = () => {
    try {
        return window.localStorage.getItem(KEY) === '1';
    } catch (e) {
        return false;
    }
};

/**
 * Turn the cues on or off for this browser.
 *
 * @param {boolean} on
 */
export const setSound = (on) => {
    try {
        if (on) {
            window.localStorage.setItem(KEY, '1');
        } else {
            window.localStorage.removeItem(KEY);
        }
    } catch (e) {
        // Private mode: the choice holds until the page is left.
    }
};

/**
 * The cue of a change of the state of a run.
 *
 * @param {string} state running, paused, done, stopped or error
 * @param {number} step steps so far
 * @param {number} delay pause between steps while running (ms)
 * @returns {?string} step, error or end; null for no sound
 */
export const cueFor = (state, step, delay) => {
    if (state === 'error') {
        return 'error';
    }
    if (state === 'done') {
        return 'end';
    }
    if (step > 0 && (state === 'paused' || (state === 'running' && delay >= STEP_TONE_DELAY))) {
        return 'step';
    }
    return null;
};

/**
 * Play a cue, when the cues are on and the browser has Web Audio.
 *
 * @param {?string} kind step, error or end
 */
export const playCue = (kind) => {
    const AudioContext = typeof window === 'undefined' ? null : window.AudioContext || window.webkitAudioContext;
    if (!kind || !TONES[kind] || !AudioContext || !soundOn()) {
        return;
    }
    try {
        context = context || new AudioContext();
        if (context.state === 'suspended') {
            context.resume().catch(() => undefined);
        }
        let at = context.currentTime + 0.01;
        TONES[kind].forEach(([frequency, seconds]) => {
            const tone = context.createOscillator();
            const gain = context.createGain();
            tone.type = 'sine';
            tone.frequency.value = frequency;
            // A soft start and end, so the tone does not click.
            gain.gain.setValueAtTime(0, at);
            gain.gain.linearRampToValueAtTime(VOLUME, at + 0.01);
            gain.gain.linearRampToValueAtTime(0, at + seconds);
            tone.connect(gain).connect(context.destination);
            tone.start(at);
            tone.stop(at + seconds + 0.02);
            at += seconds;
        });
    } catch (e) {
        // No sound is fine.
    }
};

/**
 * The Sound button: a toggle (aria-pressed) that turns the cues on and off.
 *
 * @param {function(string): string} t strings of the widget (sound, soundhint)
 * @returns {HTMLButtonElement}
 */
export const soundButton = (t) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary btn-sm tiny_algorithm-soundbtn';
    button.textContent = t('sound');
    button.title = t('soundhint');
    const show = () => {
        const on = soundOn();
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.classList.toggle('active', on);
    };
    button.addEventListener('click', () => {
        setSound(!soundOn());
        show();
        // The click lets the browser start audio; a short tone says the cues are on.
        playCue('step');
    });
    show();
    return button;
};
