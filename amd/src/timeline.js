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
 * Step back and the timeline of a run: a slider over the steps that are known (the run so far, or the whole run when it
 * has ended). Moving it repeats the run up to the chosen step (tiny_algorithm/session).
 *
 * @module tiny_algorithm/timeline
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * What a repeat of a run needs to reach a step: the same seed of Random and the input values entered before.
 *
 * @param {?Object} run the run (running or the last one)
 * @param {number} step step to reach
 * @returns {?Object} {until, replay, seed, horizon}, null when there is nothing to go back to
 */
export const replayTo = (run, step) => {
    if (!run || !run.steps || step < 1) {
        return null;
    }
    return {until: step, replay: (run.inputs || []).slice(), seed: run.seed, horizon: Math.max(run.horizon || 0, run.steps)};
};

export class Timeline {
    /**
     * @param {Function} t string lookup (key, values) => text
     * @param {Function} go called with the chosen step
     */
    constructor(t, go) {
        this.t = t;
        this.label = document.createElement('span');
        this.label.className = 'tiny_algorithm-timeline-label';
        this.range = document.createElement('input');
        Object.assign(this.range, {type: 'range', min: 1, max: 1, value: 1, className: 'tiny_algorithm-timeline-range'});
        this.range.setAttribute('aria-label', t('timeline'));
        // The label follows the slider; the run is repeated when the slider is let go (or a key moves it).
        this.range.addEventListener('input', () => this.show(Number(this.range.value), Number(this.range.max)));
        this.range.addEventListener('change', () => go(Number(this.range.value)));
        this.root = document.createElement('div');
        this.root.className = 'tiny_algorithm-timeline';
        this.root.hidden = true;
        this.root.append(this.range, this.label);
    }

    /**
     * Show the step of the run among the known steps; hidden while fewer than two steps are known.
     *
     * @param {number} step current step
     * @param {number} total known steps
     */
    update(step, total) {
        total = Math.max(total, step);
        this.root.hidden = total < 2;
        this.range.max = String(Math.max(total, 1));
        this.range.value = String(Math.max(step, 1));
        this.show(step, total);
    }

    show(step, total) {
        const text = this.t('timelinestep', {step, total});
        this.label.textContent = text;
        this.range.setAttribute('aria-valuetext', text);
    }

    hide() {
        this.root.hidden = true;
    }
}
