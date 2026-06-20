// ==================== sensing/index.js ====================
import { sensingBlocks } from './blocks.js';
import { timer } from './timer/index.js';

export default {
    name: 'sensing',
    version: '1.0.0',

    get blocks() {
        return { ...sensingBlocks, ...timer.blocks };
    },

    init(core, data) {
        timer.init(core, data);
    },

    install(core) {
        timer.install(core);
    },
};