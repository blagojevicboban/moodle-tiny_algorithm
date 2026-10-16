/**
 * Tiny Algoritam plugin entry point.
 *
 * @module tiny_algorithm/plugin
 */
import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata} from 'editor_tiny/utils';
import {component, pluginName} from './common';
import * as Configuration from './configuration';
import {getSetup} from './commands';

export default new Promise(async(resolve) => {
    const [tinyMCE, setup, pluginMetadata] = await Promise.all([
        getTinyMCE(),
        getSetup(),
        getPluginMetadata(component, pluginName),
    ]);

    tinyMCE.PluginManager.add(pluginName, (editor) => {
        setup(editor);
        return pluginMetadata;
    });

    resolve([pluginName, Configuration]);
});
