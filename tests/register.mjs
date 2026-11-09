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
import * as nodeModule from 'node:module';
import {resolveSync} from './loader-hooks.mjs';

// registerHooks (Node 22.15+) runs the hook in this thread; module.register() is deprecated and kept for older versions.
if (typeof nodeModule.registerHooks === 'function') {
    nodeModule.registerHooks({resolve: resolveSync});
} else {
    nodeModule.register('./loader-hooks.mjs', import.meta.url);
}
