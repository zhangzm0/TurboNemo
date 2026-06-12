// ==================== data/index.js ====================
import { createStore, installStore } from './store.js';
import { vars } from './vars/index.js';
import { lists } from './lists/index.js';

export default {
    name: 'data',
    version: '1.0.0',
    initData: { varDict: 'variable.variable_dict' },

    get blocks() {
        return { ...vars.blocks, ...lists.blocks };
    },

    init(core, data) {
        createStore(data);
    },

    install(core) {
        installStore(core);
        vars.install(core);
        lists.install(core);
    },
};