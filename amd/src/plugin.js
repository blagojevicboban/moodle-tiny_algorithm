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

const init = async() => {
    const [tinyMCE, setup, pluginMetadata] = await Promise.all([
        getTinyMCE(),
        getSetup(),
        getPluginMetadata(component, pluginName),
    ]);

    tinyMCE.PluginManager.add(pluginName, (editor) => {
        setup(editor);
        return pluginMetadata;
    });

    return [pluginName, Configuration];
};

export default init();
