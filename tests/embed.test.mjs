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
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {embedAttributes, extractAttributes, imageClasses, restoreAttributes} from '../amd/src/embed.js';
import {createProgram, deserialize, serialize} from '../amd/src/model.js';
import {extractModel, renderProgram} from '../amd/src/render.js';

const program = createProgram('Zbir č');
const attrs = {
    'data-algorithm': serialize(program),
    'data-algorithm-run': '1',
    'data-algorithm-edit': '1',
    'data-algorithm-tests': 'W10=',
};

/** Minimal stand-in for an <img> element. */
class FakeImage {
    constructor(attributes, classes) {
        this.attributes = new Map(Object.entries(attributes));
        this.classList = {contains: (c) => classes.includes(c)};
        this.src = attributes.src;
    }
    hasAttribute(name) {
        return this.attributes.has(name);
    }
    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }
    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
}

test('attributes are embedded in the SVG next to the model', () => {
    const svg = embedAttributes(renderProgram(program), attrs);
    assert.deepEqual(extractModel(svg), program);
    assert.deepEqual(extractAttributes(svg),
        {'data-algorithm-run': '1', 'data-algorithm-edit': '1', 'data-algorithm-tests': 'W10='});
    assert.deepEqual(extractAttributes(renderProgram(program)), {});
    const foreign = '<svg><metadata id="algorithm-attrs">' + serialize({onclick: 'x', 'data-algorithm-x': 1}) + '</metadata></svg>';
    assert.deepEqual(extractAttributes(foreign), {});
});

test('image classes mark interactive images', () => {
    assert.equal(imageClasses(attrs), 'tiny_algorithm-image tiny_algorithm-run');
    assert.equal(imageClasses({'data-algorithm': 'x'}), 'tiny_algorithm-image');
});

test('restoreAttributes reads a cleaned image back from its SVG file', async() => {
    const svg = embedAttributes(renderProgram(program), attrs);
    const saved = globalThis.fetch;
    globalThis.fetch = async(url) => ({ok: url === 'https://moodle.test/sum.svg', text: async() => svg});
    try {
        const img = new FakeImage({src: 'https://moodle.test/sum.svg'}, ['tiny_algorithm-image', 'tiny_algorithm-run']);
        assert.equal(await restoreAttributes(img), true);
        assert.deepEqual(deserialize(img.getAttribute('data-algorithm')), program);
        assert.equal(img.getAttribute('data-algorithm-edit'), '1');
        assert.equal(await restoreAttributes(new FakeImage({src: 'https://moodle.test/sum.svg'}, [])), false);
        assert.equal(await restoreAttributes(new FakeImage({src: 'https://moodle.test/gone.svg'}, ['tiny_algorithm-image'])),
            false);
        const kept = new FakeImage({'src': 'x', 'data-algorithm': 'AAAA'}, []);
        assert.equal(await restoreAttributes(kept), true);
        assert.equal(kept.getAttribute('data-algorithm'), 'AAAA');
    } finally {
        globalThis.fetch = saved;
    }
});
