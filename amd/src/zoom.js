/**
 * Zoom for the diagram SVG inside a scrollable element (used by the editor and the reader view).
 * The SVG keeps its viewBox, only its width / height attributes are scaled, so scrollbars follow the zoom.
 *
 * @module tiny_algorithm/zoom
 */
const MIN = 0.2;
const MAX = 4;
const FACTOR = 1.25;

export class Zoom {
    /**
     * @param {HTMLElement} scrollEl scrollable element that contains the <svg>
     */
    constructor(scrollEl) {
        this.el = scrollEl;
        this.scale = 1;
        this.label = null;
        // Ctrl + mouse wheel zooms around the pointer.
        scrollEl.addEventListener('wheel', (e) => {
            if (!(e.ctrlKey || e.metaKey)) {
                return;
            }
            e.preventDefault();
            this.zoomBy(e.deltaY < 0 ? FACTOR : 1 / FACTOR, e.clientX, e.clientY);
        }, {passive: false});
    }

    svg() {
        return this.el.querySelector('svg');
    }

    /** Unscaled size of the svg, remembered on first use (the editor replaces the svg on every refresh). */
    base(svg) {
        if (!svg.dataset.bw) {
            svg.dataset.bw = svg.getAttribute('width');
            svg.dataset.bh = svg.getAttribute('height');
        }
        return [Number(svg.dataset.bw), Number(svg.dataset.bh)];
    }

    /** Apply the current scale to the (possibly new) svg. */
    apply() {
        const svg = this.svg();
        if (svg) {
            const [w, h] = this.base(svg);
            svg.setAttribute('width', Math.round(w * this.scale));
            svg.setAttribute('height', Math.round(h * this.scale));
        }
        if (this.label) {
            this.label.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    set(scale, clientX = null, clientY = null) {
        const old = this.scale;
        this.scale = Math.min(MAX, Math.max(MIN, scale));
        if (old === this.scale) {
            return;
        }
        const rect = this.el.getBoundingClientRect();
        const ax = (clientX === null ? rect.left + rect.width / 2 : clientX) - rect.left;
        const ay = (clientY === null ? rect.top + rect.height / 2 : clientY) - rect.top;
        const px = (this.el.scrollLeft + ax) / old;
        const py = (this.el.scrollTop + ay) / old;
        this.apply();
        this.el.scrollLeft = px * this.scale - ax;
        this.el.scrollTop = py * this.scale - ay;
    }

    zoomBy(factor, clientX = null, clientY = null) {
        this.set(this.scale * factor, clientX, clientY);
    }

    reset() {
        this.set(1);
    }

    /** Scale down so that the diagram fits the width (never enlarges). */
    fit() {
        const svg = this.svg();
        if (svg && this.el.clientWidth > 0) {
            const [w] = this.base(svg);
            this.set(Math.min(1, (this.el.clientWidth - 16) / w));
        }
    }

    /** Fit only when the diagram is wider than the available space. */
    autoFit() {
        const svg = this.svg();
        if (svg && this.el.clientWidth > 0 && this.base(svg)[0] > this.el.clientWidth) {
            this.fit();
        }
    }

    /**
     * Build the zoom buttons.
     *
     * @param {Function} t string lookup (key) => text
     * @returns {HTMLElement}
     */
    controls(t) {
        const mk = (text, title, fn) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-secondary btn-sm alg-zoom-btn';
            b.textContent = text;
            b.title = title;
            b.setAttribute('aria-label', title);
            b.addEventListener('click', fn);
            return b;
        };
        this.label = mk(`${Math.round(this.scale * 100)}%`, t('zoomreset'), () => this.reset());
        const box = document.createElement('span');
        box.className = 'alg-zoom';
        box.append(
            mk('−', t('zoomout'), () => this.zoomBy(1 / FACTOR)),
            this.label,
            mk('+', t('zoomin'), () => this.zoomBy(FACTOR)),
            mk(t('fit'), t('fit'), () => this.fit())
        );
        return box;
    }
}
