// ==================== extensions/looks/index.js ====================
import { looksBlocks } from './blocks.js';
import { dialogBlocks, installDialog } from './dialog/index.js';
import { Effects } from './effects.js';

export default {
    name: 'looks',
    version: '1.0.0',
    blocks: { ...looksBlocks, ...dialogBlocks },
    install(core) {
        installDialog(core);
        core.selfHook('_effects', (actor) => (actor.sprite ? new Effects(actor.sprite) : null));
    },
};