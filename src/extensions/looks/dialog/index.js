// ==================== extensions/looks/dialog/index.js ====================
import { askBlocks, installAsk } from './ask.js';
import { chooseBlocks, installChoose } from './choose.js';

export const dialogBlocks = { ...askBlocks, ...chooseBlocks };

export function installDialog(core) {
    installAsk(core);
    installChoose(core);
}