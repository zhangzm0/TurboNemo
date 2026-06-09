// ==================== sensing/timer/index.js ====================
import { timerBlocks } from './blocks.js';
import { installTimer } from './runtime.js';

export const timer = {
    blocks: timerBlocks,
    init() {},
    install(core) {
        installTimer(core);
    },
};