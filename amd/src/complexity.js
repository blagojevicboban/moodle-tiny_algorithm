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
 * How fast does an algorithm grow? It is run for several sizes n (n is the first value it reads, or the number of an
 * Assign such as n = 8), its steps are counted and drawn against n beside the curves n, n log n and n², and the
 * curve that fits best is named (it looks like O(n²)). A second algorithm (a template) can be drawn beside it.
 *
 * @module tiny_algorithm/complexity
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {execute} from './interpreter';
import {cloneProgram} from './model';
import {el, openDialog} from './dialog';
import {t} from './strings';

/** Sizes measured unless the reader chooses others. */
export const DEFAULT_SIZES = [10, 20, 50, 100, 200, 500];

/** Most steps of one run (a bigger n stops the measuring). */
export const MAX_RUN_STEPS = 1000000;

/** Most sizes in one measuring. */
const MAX_SIZES = 12;

/** Seed of Random and of the values entered after n, so a measuring can be repeated. */
const SEED = 20261111;

/** Steps run before the page may draw again. */
const CHUNK = 50000;

/** Growth rates the measuring can name, from the slowest. */
export const GROWTHS = [
    {key: 'o1', f: () => 1},
    {key: 'ologn', f: (n) => Math.log2(Math.max(n, 2))},
    {key: 'on', f: (n) => n},
    {key: 'onlogn', f: (n) => n * Math.log2(Math.max(n, 2))},
    {key: 'on2', f: (n) => n * n},
    {key: 'on3', f: (n) => n * n * n},
];

/**
 * Where the size n can be put: an Assign of a whole number from 2 (n = 8, not sum = 0) in the main function, and the
 * first value the algorithm reads (when it has an Input).
 *
 * @param {Object} program
 * @returns {Array<{kind: string, name: ?string, id: ?string, value: ?string}>} the best first (a variable named n)
 */
export const sizeTargets = (program) => {
    const found = [];
    let input = false;
    const visit = (list) => (list || []).forEach((b) => {
        const name = String(b.target).trim();
        if (b.type === 'assign' && /^\s*\d+\s*$/.test(String(b.expr)) && Number(b.expr) >= 2 && /^[A-Za-z_]\w*$/.test(name) &&
                !found.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
            found.push({kind: 'var', name, id: b.id, value: String(b.expr).trim()});
        }
        input = input || b.type === 'input';
        ['then', 'else', 'body'].forEach((k) => visit(b[k]));
    });
    const main = program && program.functions && (program.functions.find((f) => f.name.toLowerCase() === 'main') ||
        program.functions[0]);
    if (main) {
        visit(main.body);
    }
    found.sort((a, b) => Number(b.name.toLowerCase() === 'n') - Number(a.name.toLowerCase() === 'n'));
    const targets = found.map((x) => ({...x}));
    if (input) {
        // When the algorithm reads n, the first value it reads is the size.
        targets.splice(found.length && found[0].name.toLowerCase() === 'n' ? 1 : 0, 0, {kind: 'input', name: null, id: null,
            value: null});
    }
    return targets;
};

/**
 * The sizes typed by the reader: whole numbers from 1, at most MAX_SIZES, in order, without repeats.
 *
 * @param {string} text e.g. 10, 20, 50
 * @returns {number[]}
 */
export const parseSizes = (text) => [...new Set(String(text).split(/[\s,;]+/).map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b).slice(0, MAX_SIZES);

/**
 * Random whole numbers from a seed (the values entered after n).
 *
 * @param {number} seed
 * @returns {Function} () => number from 0 to 999
 */
const values = (seed) => {
    let s = seed;
    return () => {
        s = (s * 48271) % 2147483647;
        return s % 1000;
    };
};

/**
 * An answer to an Input of a given type.
 *
 * @param {string} type
 * @param {number} v a random whole number
 * @returns {string}
 */
const answer = (type, v) => {
    switch (String(type)) {
        case 'Boolean':
            return v % 2 ? 'true' : 'false';
        case 'String':
            return `s${v}`;
        default:
            return String(v);
    }
};

/**
 * Count the steps of one run with size n.
 *
 * @param {Object} program
 * @param {Object} target where n goes (sizeTargets)
 * @param {number} n size
 * @param {Object} [opts]
 * @param {Function} [opts.pause] returns a Promise; awaited every CHUNK steps so the page can draw
 * @returns {Promise<{n: number, steps: ?number, error: ?string}>} steps null when the run failed (error: its code)
 */
export const countSteps = async(program, target, n, {pause = null} = {}) => {
    let p = program;
    if (target.kind === 'var') {
        p = cloneProgram(program);
        const visit = (list) => (list || []).forEach((b) => {
            if (b.id === target.id) {
                b.expr = String(n);
            }
            ['then', 'else', 'body'].forEach((k) => visit(b[k]));
        });
        p.functions.forEach((f) => visit(f.body));
    }
    const next = values(SEED);
    let first = target.kind === 'input';
    let steps = 0;
    try {
        const gen = execute(p, {seed: SEED, maxSteps: MAX_RUN_STEPS});
        let res = gen.next();
        while (!res.done) {
            const ev = res.value;
            let value;
            if (ev.event === 'step') {
                steps++;
                if (pause && steps % CHUNK === 0) {
                    await pause();
                }
            } else if (ev.event === 'input') {
                value = first ? String(n) : answer(ev.type, next());
                first = false;
            }
            res = gen.next(value);
        }
    } catch (e) {
        return {n, steps: null, error: e && e.code ? e.code : 'error'};
    }
    return {n, steps, error: null};
};

/**
 * Measure the steps for every size; a size that fails (too many steps) ends the measuring.
 *
 * @param {Object} program
 * @param {Object} target
 * @param {number[]} sizes
 * @param {Object} [opts]
 * @param {Function} [opts.pause] see countSteps
 * @param {Function} [opts.progress] called with each result
 * @param {Function} [opts.stopped] returns true when the reader closed the dialog
 * @returns {Promise<Array>} results of countSteps
 */
export const measure = async(program, target, sizes, {pause = null, progress = null, stopped = null} = {}) => {
    const results = [];
    for (const n of sizes) {
        if (stopped && stopped()) {
            break;
        }
        const r = await countSteps(program, target, n, {pause});
        results.push(r);
        if (progress) {
            progress(r);
        }
        if (r.steps === null) {
            break;
        }
        if (pause) {
            await pause();
        }
    }
    return results;
};

/**
 * The growth that fits the steps best: steps ≈ a·f(n) + b with the least squares. A faster growth wins only when its
 * error is less than half of the error of the slower one, so a straight line is not called n log n.
 *
 * @param {Array<{n: number, steps: ?number}>} points
 * @returns {?{key: string, a: number, b: number}} null with fewer than three sizes
 */
export const classify = (points) => {
    const pts = points.filter((p) => p.steps !== null);
    if (pts.length < 3) {
        return null;
    }
    const total = pts.reduce((s, p) => s + p.steps, 0) / pts.length;
    const variance = pts.reduce((s, p) => s + (p.steps - total) ** 2, 0) || 1;
    let best = null;
    GROWTHS.forEach((g) => {
        const xs = pts.map((p) => g.f(p.n));
        const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
        const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
        const a = sxx ? xs.reduce((s, x, i) => s + (x - mx) * (pts[i].steps - total), 0) / sxx : 0;
        if (g.key !== 'o1' && a <= 0) {
            return;
        }
        const b = total - a * mx;
        const err = (g.key === 'o1' ? variance : xs.reduce((s, x, i) => s + (pts[i].steps - a * x - b) ** 2, 0)) / variance;
        if (!best || err < best.err / 2) {
            best = {key: g.key, a: g.key === 'o1' ? 0 : a, b: g.key === 'o1' ? total : b, err};
        }
    });
    return best && {key: best.key, a: best.a, b: best.b};
};

// ---- The dialog -------------------------------------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, text = null) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    if (text !== null) {
        e.textContent = text;
    }
    return e;
};

/** Colours of the two algorithms (validated categorical pair) and of the reference curves. */
const COLORS = ['#2a78d6', '#eb6834'];

/** Reference curves drawn behind the measured ones. */
const REFERENCES = ['on', 'onlogn', 'on2'];

const fmt = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));

/**
 * Draw the steps of one or two algorithms against n, with the reference curves from the first point of the first.
 *
 * @param {Array<{label: string, points: Array}>} series
 * @returns {SVGElement}
 */
export const drawChart = (series) => {
    const W = 560;
    const H = 300;
    const m = {l: 56, r: 92, t: 22, b: 40};
    const all = series.flatMap((s) => s.points.filter((p) => p.steps !== null));
    const maxN = Math.max(...all.map((p) => p.n), 1);
    const maxS = Math.max(...all.map((p) => p.steps), 1);
    const x = (n) => m.l + (n / maxN) * (W - m.l - m.r);
    const y = (s) => H - m.b - (Math.min(s, maxS * 1.05) / (maxS * 1.05)) * (H - m.t - m.b);
    const root = svg('svg', {viewBox: `0 0 ${W} ${H}`, 'class': 'tiny_algorithm-cx-chart', role: 'img',
        'aria-label': t('cxchart')});
    // Gridlines and the axes.
    for (let i = 0; i <= 4; i++) {
        const v = (maxS * 1.05 * i) / 4;
        root.append(svg('line', {x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), 'class': 'tiny_algorithm-cx-grid'}),
            svg('text', {x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', 'class': 'tiny_algorithm-cx-tick'}, fmt(v)));
    }
    const first = series[0].points.filter((p) => p.steps !== null);
    // The sizes under the axis; one too close to the one before it (10 and 20 beside 500) is left out.
    let lastTick = -Infinity;
    [...new Set(all.map((p) => p.n))].sort((a, b) => a - b).filter((n) => {
        const keep = x(n) - lastTick >= 26;
        lastTick = keep ? x(n) : lastTick;
        return keep;
    }).forEach((n) => root.append(svg('text', {x: x(n), y: H - m.b + 16,
        'text-anchor': 'middle', 'class': 'tiny_algorithm-cx-tick'}, String(n))));
    root.append(svg('text', {x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', 'class': 'tiny_algorithm-cx-axis'}, 'n'),
        svg('text', {x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', 'class': 'tiny_algorithm-cx-axis',
            transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`}, t('cxsteps')));
    // Reference curves through the first point of the first algorithm: where the measured line goes compared with
    // them shows its growth. A curve is cut at the top of the chart and named where it leaves it (or at its end).
    // Names at the right end of the lines, moved apart so they do not cover each other.
    const right = [];
    if (first.length) {
        const top = maxS * 1.05;
        const clipId = `tiny_algorithm-cx-clip${Date.now()}`;
        root.append(svg('clipPath', {id: clipId}).appendChild(svg('rect', {x: m.l, y: m.t, width: W - m.l - m.r,
            height: H - m.t - m.b})).parentNode);
        const start = first[0];
        REFERENCES.forEach((key) => {
            const g = GROWTHS.find((x2) => x2.key === key);
            const c = start.steps / g.f(start.n);
            const pts = [];
            let end = null;
            for (let i = 0; i <= 80; i++) {
                const n = start.n + ((maxN - start.n) * i) / 80;
                const v = c * g.f(n);
                pts.push(`${x(n).toFixed(1)},${(H - m.b - (v / top) * (H - m.t - m.b)).toFixed(1)}`);
                if (v <= top) {
                    end = {n, v};
                }
            }
            root.append(svg('polyline', {points: pts.join(' '), 'class': 'tiny_algorithm-cx-ref', 'clip-path': `url(#${clipId})`}));
            if (end && end.n >= maxN) {
                right.push({y: y(end.v) + 4, text: t(`cx${key}`), cls: 'tiny_algorithm-cx-reflabel'});
            } else if (end) {
                root.append(svg('text', {x: x(end.n), y: m.t - 2, 'text-anchor': 'middle', 'class': 'tiny_algorithm-cx-reflabel'},
                    t(`cx${key}`)));
            }
        });
    }
    // The measured algorithms, with a label at their last point.
    series.forEach((s, k) => {
        const pts = s.points.filter((p) => p.steps !== null);
        if (!pts.length) {
            return;
        }
        root.append(svg('polyline', {points: pts.map((p) => `${x(p.n).toFixed(1)},${y(p.steps).toFixed(1)}`).join(' '),
            'class': 'tiny_algorithm-cx-line', stroke: COLORS[k]}));
        pts.forEach((p) => {
            const dot = svg('circle', {cx: x(p.n), cy: y(p.steps), r: 4, fill: COLORS[k], 'class': 'tiny_algorithm-cx-dot'});
            dot.append(svg('title', {}, `${s.label}: n = ${p.n}, ${t('cxsteps')} = ${p.steps}`));
            root.append(dot);
        });
        const lp = pts[pts.length - 1];
        if (lp.n >= maxN) {
            right.push({y: y(lp.steps) + 4, text: s.label, cls: 'tiny_algorithm-cx-label'});
        } else {
            root.append(svg('text', {x: x(lp.n) + 6, y: y(lp.steps) - 6, 'class': 'tiny_algorithm-cx-label'}, s.label));
        }
    });
    right.sort((a, b) => a.y - b.y);
    right.forEach((l, i) => {
        l.y = Math.max(l.y, i ? right[i - 1].y + 13 : m.t);
    });
    // Pushed below the axis: move the column up.
    const over = right.length ? right[right.length - 1].y - (H - m.b + 4) : 0;
    right.forEach((l) => root.append(svg('text', {x: x(maxN) + 8, y: l.y - Math.max(0, over), 'class': l.cls}, l.text)));
    return root;
};

/**
 * The table of the measured steps (a view of the chart for every reader).
 *
 * @param {Array<{label: string, points: Array}>} series
 * @returns {HTMLElement}
 */
const table = (series) => {
    const sizes = [...new Set(series.flatMap((s) => s.points.map((p) => p.n)))].sort((a, b) => a - b);
    const value = (s, n) => {
        const p = s.points.find((q) => q.n === n);
        if (!p) {
            return '';
        }
        return p.steps === null ? t('cxfailed') : String(p.steps);
    };
    return el('table', {'class': 'tiny_algorithm-trace tiny_algorithm-cx-table'},
        el('thead', {}, el('tr', {}, el('th', {scope: 'col'}, 'n'), series.map((s) => el('th', {scope: 'col'}, s.label)))),
        el('tbody', {}, sizes.map((n) => el('tr', {}, el('th', {scope: 'row'}, String(n)),
            series.map((s) => el('td', {}, value(s, n)))))));
};

/**
 * Open the measuring dialog.
 *
 * @param {HTMLElement} host widget root
 * @param {Object} program the algorithm
 * @param {Object} [opts]
 * @param {Array} [opts.others] algorithms to compare with: [{label, build: () => program}]
 */
export const openComplexity = (host, program, {others = []} = {}) => {
    const targets = sizeTargets(program);
    if (!targets.length) {
        openDialog(host, t('cxtitle'), el('p', {}, t('cxnosize')));
        return;
    }
    const targetLabel = (x) => (x.kind === 'input' ? t('cxinput') : t('cxvariable', {name: x.name, value: x.value}));
    const targetSelect = el('select', {'class': 'custom-select custom-select-sm', id: 'tiny_algorithm-cx-target'},
        targets.map((x, i) => el('option', {value: String(i)}, targetLabel(x))));
    const sizesInput = el('input', {type: 'text', 'class': 'form-control form-control-sm', id: 'tiny_algorithm-cx-sizes',
        value: DEFAULT_SIZES.join(', ')});
    const usable = others.filter((o) => sizeTargets(o.build()).length);
    const compare = el('select', {'class': 'custom-select custom-select-sm', id: 'tiny_algorithm-cx-compare'},
        el('option', {value: ''}, t('cxnocompare')), usable.map((o, i) => el('option', {value: String(i)}, o.label)));
    const status = el('p', {'class': 'tiny_algorithm-cx-status', role: 'status'});
    const result = el('div', {'class': 'tiny_algorithm-cx-result'});
    const field = (id, label, input) => el('div', {'class': 'tiny_algorithm-cx-field'}, el('label', {'for': id}, label), input);
    let busy = false;
    // An object, so the functions made in the loop below read its current value.
    const state = {closed: false};
    const stopped = () => state.closed;
    const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
    const run = async() => {
        if (busy) {
            return;
        }
        const sizes = parseSizes(sizesInput.value);
        if (sizes.length < 2) {
            status.textContent = t('cxfewsizes');
            return;
        }
        busy = true;
        go.disabled = true;
        result.replaceChildren();
        const jobs = [{label: t('cxthis'), program, target: targets[Number(targetSelect.value)]}];
        if (compare.value !== '') {
            const o = usable[Number(compare.value)];
            const p = o.build();
            jobs.push({label: o.label, program: p, target: sizeTargets(p)[0]});
        }
        const series = [];
        for (const job of jobs) {
            const points = await measure(job.program, job.target, sizes, {pause, stopped, progress: (r) => {
                status.textContent = t('cxprogress', {name: job.label, n: String(r.n)});
            }});
            series.push({label: job.label, points});
        }
        busy = false;
        go.disabled = false;
        if (state.closed) {
            return;
        }
        const verdicts = series.map((s) => {
            const fit = classify(s.points);
            const failed = s.points.find((p) => p.steps === null);
            const parts = [fit ? t('cxlooks', {name: s.label, growth: t(`cx${fit.key}`)}) : t('cxunknown', {name: s.label})];
            if (failed) {
                parts.push(t(failed.error === 'steplimit' ? 'cxlimit' : 'cxerror', {n: String(failed.n),
                    max: String(MAX_RUN_STEPS)}));
            }
            return el('p', {'class': 'tiny_algorithm-cx-verdict'}, parts.join(' '));
        });
        status.textContent = '';
        // Two algorithms: a legend too (each line is also labelled at its end).
        const legend = series.length > 1 ? el('div', {'class': 'tiny_algorithm-cx-legend'}, series.map((x, k) =>
            el('span', {}, el('span', {'class': 'tiny_algorithm-cx-swatch', style: `background: ${COLORS[k]}`}), x.label))) : '';
        result.replaceChildren(...verdicts, legend, drawChart(series), el('p', {'class': 'tiny_algorithm-cx-note'}, t('cxnote')),
            table(series));
    };
    const go = el('button', {type: 'button', 'class': 'btn btn-primary btn-sm', onclick: run}, t('cxmeasure'));
    const body = el('div', {'class': 'tiny_algorithm-cx'},
        el('p', {}, t('cxintro')),
        el('div', {'class': 'tiny_algorithm-cx-form'}, field('tiny_algorithm-cx-target', t('cxsize'), targetSelect),
            field('tiny_algorithm-cx-sizes', t('cxsizes'), sizesInput),
            usable.length ? field('tiny_algorithm-cx-compare', t('cxcompare'), compare) : '', go),
        status, result);
    const dialog = openDialog(host, t('cxtitle'), body);
    // Closing the dialog stops a measuring that is still running.
    const observer = new MutationObserver(() => {
        if (!dialog.root.isConnected) {
            state.closed = true;
            observer.disconnect();
        }
    });
    observer.observe(host, {childList: true});
    run();
};
