/**
 * Commands (toolbar button, menu item, double-click) for tiny_algorithm.
 *
 * @module tiny_algorithm/commands
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
