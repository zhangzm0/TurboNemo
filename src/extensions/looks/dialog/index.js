// ==================== extensions/looks/dialog/index.js ====================
import { askBlocks, installAsk } from './ask.js';
import { chooseBlocks, installChoose } from './choose.js';
import { printBlocks, installPrint } from './print.js';

export const dialogBlocks = { ...askBlocks, ...chooseBlocks, ...printBlocks };

export function installDialog(core) {
    installAsk(core);
    installChoose(core);
    installPrint(core);
}