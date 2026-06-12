// ==================== data/vars/index.js ====================
import { varBlocks } from './blocks.js';
import { installVarDisplay } from './display.js';

export const vars = {
    blocks: varBlocks,
    init() {},
    install(core) {
        installVarDisplay(core);
    },
};