/**
 * Toolbar/menu configuration for tiny_algorithm.
 *
 * @module tiny_algorithm/configuration
 */
import {addMenubarItem, addToolbarButton, addToolbarSection} from 'editor_tiny/utils';
import {buttonName} from './common';

const configureToolbar = (toolbar) => {
    addToolbarSection(toolbar, 'advanced', 'lists', true);
    return addToolbarButton(toolbar, 'advanced', buttonName);
};

export const configure = (instanceConfig) => ({
    menu: addMenubarItem(instanceConfig.menu, 'insert', buttonName),
    toolbar: configureToolbar(instanceConfig.toolbar),
});
