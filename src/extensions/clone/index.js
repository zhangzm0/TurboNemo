// src/extensions/clone/index.js
export default {
    name: 'clone',
    version: '1.0.0',
    blocks: {
        'mirror': {
            generator(c, b) {
                return `\
            {
                const __c = __actors__.cloneActor(self.name);
                if (__c) {
                    for (const __t of Object.values(__core__.scheduler._all)) {
                        if (__t.entityName === self.name && __t._restart?.hatType === 'start_as_a_mirror') {
                            const __g = __t._restart.factory(__c, __screen__, __actors__, __screens__, __global__, __core__);
                            const __id = __c.name + '_' + __t.taskId;
                            __core__.scheduler.createTask(__id, __c.name);
                            __core__.scheduler.startTask(__id, __g, __c.name);
                        }
                    }
                }
            }
        ` + c.compileNext(b);
            },
        },
        'dispose': {
            generator(c, b) { return `    if (self.isClone) { __actors__.removeClone(self.name); }\n` + c.compileNext(b); },
        },
        'start_as_a_mirror': {
            isHat: true,
            generator(c, b) {
                const body = c.compileStatement(b, 'DO');
                if (!body) return `    // start_as_a_mirror (empty)\n`;
                return `\
    // start_as_a_mirror
    if (!self.isClone) return;
${body}`;
            },
        },
        'get_current_clone_index': { generator(c, b) { return `__actors__.getCloneIndex(self.name)`; } },
        'get_clone_num': {
            generator(c, b) {
                const sf = b.querySelector('field[name="sprite"]');
                const raw = sf?.textContent.trim() || '__self';
                const name = raw === '__self' ? 'self.name' : `(__actors__._idToName?.['${raw}'] || '${raw}')`;
                return `__actors__.getCloneCount(${name})`;
            },
        },
        'get_clone_index_property': {
            generator(c, b) {
                const sf = b.querySelector('field[name="sprite"]');
                const raw = sf?.textContent.trim() || '__self';
                const name = raw === '__self' ? 'self.name' : `(__actors__._idToName?.['${raw}'] || '${raw}')`;
                const idx = c.compileValue(b, 'index');
                const attr = c.extractParams(b).attribute;
                // 对应官方 EntityProperty 枚举: 0=X, 1=Y, 2=STYLE_INDEX, 3=ROTATION, 5=SIZE
                const m = {
                    0: `__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.x ?? 0`,
                    1: `-(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.y ?? 0)`,
                    2: `__actors__.getCloneByIndex(${name}, ${idx})?.currentCostume ?? 0`,
                    3: `-(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.rotation ?? 0)`,
                    5: `(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.scale?.x ?? 1) * 100`,
                };
                return m[attr] || '0';
            },
        },
    },
    install(core) {
        core.actorManager._stopCloneTasks = (cloneName) => {
            for (const taskId of Object.keys(core.scheduler._all)) {
                if (core.scheduler._all[taskId].entityName === cloneName) {
                    core.scheduler.stopTask(taskId);
                }
            }
        };
    },
};