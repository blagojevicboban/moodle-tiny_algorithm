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
 * Commands (toolbar button, menu item, double-click) for tiny_algorithm.
 *
 * @module tiny_algorithm/commands
 * @copyright  2026 Boban Blagojević
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getString} from 'core/str';
import {component, buttonName, menuItemName, icon, iconSvg, dataAttribute} from './common';
import {openEditor} from './ui';

const isAlgorithmImage = (node) => node && node.nodeName === 'IMG' && node.hasAttribute(dataAttribute);

export const getSetup = async() => {
    const [buttonTitle, menuTitle] = await Promise.all([
        getString('button', component),
        getString('menuitem', component),
    ]);

    return (editor) => {
        editor.ui.registry.addIcon(icon, iconSvg);

        const open = () => openEditor(editor);

        editor.ui.registry.addButton(buttonName, {
            icon,
            tooltip: buttonTitle,
            onAction: open,
        });
        editor.ui.registry.addMenuItem(menuItemName, {
            icon,
            text: menuTitle,
            onAction: open,
        });

        editor.on('dblclick', (e) => {
            if (isAlgorithmImage(e.target)) {
                editor.selection.select(e.target);
                open();
            }
        });
    };
};
