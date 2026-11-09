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
 * The data-algorithm-* attributes of an algorithm image, also kept inside its SVG file.
 *
 * Moodle's HTML cleaning (forum posts, assignment text and other user content) removes data-* attributes and data: URIs.
 * The editor therefore stores the image as a file where it can, writes the attributes into the SVG and marks the image
 * with classes, which the cleaning keeps; restoreAttributes() puts the attributes back before the image is shown.
 *
 * @module tiny_algorithm/embed
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {dataAttribute, imageClass, runAttribute, runClass} from './common';
import {decodeData, serialize} from './model';
import {extractModel} from './render';

const PREFIX = `${dataAttribute}-`;
const ATTRS = /<metadata id="algorithm-attrs">([A-Za-z0-9+/=]+)<\/metadata>/;
// Largest SVG file that is read back (a diagram with its model is far smaller).
const MAX_SVG = 5 * 1024 * 1024;

/**
 * Add the attributes (other than the model, which the SVG already has) to the SVG of an algorithm image.
 *
 * @param {string} svg markup made by renderProgram
 * @param {Object<string, string>} attrs data-algorithm-* attribute names and values
 * @returns {string} SVG markup
 */
export const embedAttributes = (svg, attrs) => {
    const own = Object.fromEntries(Object.entries(attrs).filter(([name]) => name.startsWith(PREFIX)));
    const meta = `<metadata id="algorithm-attrs">${serialize(own)}</metadata>`;
    return svg.replace(/(<svg[^>]*>)/, `$1${meta}`);
};

/**
 * Read the attributes written by embedAttributes (only data-algorithm-* names with string values).
 *
 * @param {string} svgText
 * @returns {Object<string, string>}
 */
export const extractAttributes = (svgText) => {
    const m = ATTRS.exec(svgText);
    let data = null;
    try {
        data = m ? decodeData(m[1]) : null;
    } catch (e) {
        data = null;
    }
    if (!data || typeof data !== 'object') {
        return {};
    }
    return Object.fromEntries(Object.entries(data)
        .filter(([name, value]) => name.startsWith(PREFIX) && /^[a-z-]+$/.test(name) && typeof value === 'string'));
};

/**
 * Classes that mark an algorithm image, so it is found after the cleaning removed its attributes.
 *
 * @param {Object<string, string>} attrs data-algorithm-* attributes of the image
 * @returns {string}
 */
export const imageClasses = (attrs) => (attrs[runAttribute] ? `${imageClass} ${runClass}` : imageClass);

/**
 * Text of the SVG of an image: a data URI is decoded here, a file is fetched.
 *
 * @param {string} src image source
 * @returns {Promise<string|null>}
 */
const svgText = async(src) => {
    const m = /^data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)$/.exec(src);
    if (m) {
        return new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)));
    }
    // Only files of this site (Moodle's pluginfile.php): an image of another site is not fetched.
    if (new URL(src, window.location.href).origin !== window.location.origin) {
        return null;
    }
    const response = await fetch(src, {credentials: 'same-origin'});
    if (!response.ok || Number(response.headers.get('content-length') || 0) > MAX_SVG) {
        return null;
    }
    const text = await response.text();
    return text.length > MAX_SVG ? null : text;
};

/**
 * Give an algorithm image its data-algorithm attributes back from its SVG file, when the cleaning removed them.
 *
 * @param {HTMLImageElement} img
 * @returns {Promise<boolean>} true when the image has a model (data-algorithm) afterwards
 */
export const restoreAttributes = async(img) => {
    if (img.hasAttribute(dataAttribute)) {
        return true;
    }
    if (!img.classList.contains(imageClass) || !img.getAttribute('src')) {
        return false;
    }
    try {
        const text = await svgText(img.src || img.getAttribute('src'));
        if (text === null) {
            return false;
        }
        const model = extractModel(text);
        if (!model || !Array.isArray(model.functions)) {
            return false;
        }
        Object.entries(extractAttributes(text)).forEach(([name, value]) => img.setAttribute(name, value));
        img.setAttribute(dataAttribute, serialize(model));
        return true;
    } catch (e) {
        return false;
    }
};
