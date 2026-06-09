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
        // 建立角色 ID -> name 映射
        const idToName = {};
        const bcm = core._bcm;
        if (bcm?.actors?.actors_dict) {
            for (const [id, data] of Object.entries(bcm.actors.actors_dict)) {
                idToName[id] = data.name;
            }
        }
        core.actorManager._idToName = idToName;
        core.screenManager.width = core.width;
        core.screenManager.height = core.height;
    },
};