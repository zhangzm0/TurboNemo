// src/extensions/clone/index.js
export default {
    name: 'clone',
    version: '1.0.0',
    blocks: {
        'mirror': {
            generator(c, b) {
                return `\
            const __clone = __actors__.cloneActor(self.name);
            if (__clone) {
                for (const __t of Object.values(__core__.scheduler._all)) {
                    if (__t.entityName === self.name && __t._restart?.hatType === 'start_as_a_mirror') {
                        const __gen = __t._restart.factory(__clone, __screen__, __actors__, __screens__, __global__, __core__);
                        const __tid = __clone.name + '_' + __t.taskId;
                        __core__.scheduler.createTask(__tid, __clone.name);
                        __core__.scheduler.startTask(__tid, __gen, __clone.name);
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
                const name = (sf?.textContent.trim() || '__self') === '__self' ? 'self.name' : `'${sf.textContent.trim()}'`;
                return `__actors__.getCloneCount(${name})`;
            },
        },
        'get_clone_index_property': {
            generator(c, b) {
                const sf = b.querySelector('field[name="sprite"]');
                const name = (sf?.textContent.trim() || '__self') === '__self' ? 'self.name' : `'${sf.textContent.trim()}'`;
                const idx = c.compileValue(b, 'index');
                const attr = c.extractParams(b).attribute;
                const m = {
                    'X': `__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.x ?? 0`,
                    'Y': `-(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.y ?? 0)`,
                    'STYLE_INDEX': `__actors__.getCloneByIndex(${name}, ${idx})?.currentCostume ?? 0`,
                    'ROTATION': `-(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.rotation ?? 0)`,
                    'SIZE': `(__actors__.getCloneByIndex(${name}, ${idx})?.sprite?.scale?.x ?? 1) * 100`,
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