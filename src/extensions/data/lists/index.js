// ==================== data/lists/index.js ====================
import { listBlocks } from './blocks.js';
import { installListDisplay } from './display.js';

export const lists = {
    blocks: listBlocks,
    init() {},
    install(core) {
        installListDisplay(core);
    },
};