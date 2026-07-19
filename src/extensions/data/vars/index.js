// ==================== data/vars/index.js ====================
import { varBlocks } from './blocks.js';
import { installVarDisplay } from './display.js';
import { installRanking } from './ranking.js';

export const vars = {
    blocks: varBlocks,
    init() {},
    install(core) {
        installVarDisplay(core);
        installRanking(core);
    },
};