// src/blocks/events.js
export const eventBlocks = {
    'start_on_click': {
        isHat: true,
        generator(c, b) { return c.compileNext(b) || ''; },
    },
    'self_on_tap': {
        isHat: true,
        generator(c, b) {
            const type = c.extractParams(b).type || 'mouse_click';
            const body = c.compileNext(b);
            if (!body) return `    // self_on_tap ${type} (empty)\n`;
            // Resolve sprite field: __self or absent → self.name, otherwise look up by ID
            const sf = b.querySelector(':scope > field[name="sprite"]');
            const rawTarget = sf ? sf.textContent.trim() : '__self';
            const targetExpr = rawTarget === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${rawTarget}'] || __actors__._sceneIdToName?.['${rawTarget}'] || '${rawTarget}')`;
            if (type === 'mouse_down') {
                return `\
    while (true) {
        const __target = ${targetExpr};
        yield { _yieldType: "pause", event: \`actor:pointerdown:\${__target}\` };
        let __down = true;
        __core__.eventBus.once(\`actor:pointerup:\${__target}\`, () => { __down = false; });
        while (__down) {
${body}            yield __core__._YIELD_FRAME;
        }
    }
`;
            }
            const event = type === 'mouse_up' ? 'pointerup' : 'pointertap';
            return `\
    while (true) {
        const __target = ${targetExpr};
        const __params = yield { _yieldType: "pause", event: \`actor:${event}:\${__target}\` };
${body}    }
`;
        },
    },
    'when': {
        isHat: true,
        generator(c, b) {
            const cond = c.compileValue(b, 'condition');
            const body = c.compileStatement(b, 'DO') || c.compileNext(b);
            if (!body) return `    // when (empty)\n`;
            return `\
        while (true) {
            while (!(${cond})) {
                yield __core__._YIELD_FRAME;
            }
    ${body}    \nyield __core__._YIELD_FRAME;}
    `;
        },
    },
    'scenes_index_get': {
        generator(c, b) {
            const f = b.querySelector(':scope > field[name="index"]');
            const val = f ? f.textContent.trim() : '1';
            if (val === '__next_scene') {
                return `(__screens__.getCurrentIndex() + 1)`;
            }
            if (val === '__previous_scene') {
                return `(__screens__.getCurrentIndex() - 1)`;
            }
            return val;
        },
    },
    'set_scene_by_index': {
        generator(c, b) {
            const idx = c.compileValue(b, 'index');
            return `    __screens__.switchTo(${idx});\n` + c.compileNext(b);
        },
    },
    'set_scene_transition': {
        generator(c, b) {
            const p = c.extractParams(b);
            const t = p.transition || 'none';
            const d = p.direction || '';
            let name = t;
            if ((t === 'slide' || t === 'bounce') && d) name = t + '_' + d;
            else if (t === 'fadeInOut') name = 'fade_in_out';
            return `    __screens__.setTransitionType('${name}');\n` + c.compileNext(b);
        },
    },
    'on_running_group_activated': {
        isHat: true,
        generator(c, b) {
            const body = c.compileNext(b);
            if (!body) return `    // on_running_group_activated (empty)\n`;
            return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: \`screen:activated:\${self.name}\` };
${body}    }
`;
        },
    },
    'stop': {
        generator(c, b) {
            const scope = c.extractParams(b).scope;
            if (scope === 1 || scope === '1')
                return `    __core__.scheduler.stopTask(__core__.scheduler._currentTaskId);\n` + c.compileNext(b);
            if (scope === 2 || scope === '2')
                return `    __core__.scheduler.stopOtherTasks(self.name, __core__.scheduler._currentTaskId);\n` + c.compileNext(b);
            if (scope === 3 || scope === '3')
                return `    __core__.scheduler.pauseOtherEntityTasks(self.name);\n` + c.compileNext(b);
            return `    __core__.scheduler.stopAll();\n` + c.compileNext(b);
        },
    },
    'on_swipe': {
        isHat: true,
        generator(c, b) {
            const dir = b.querySelector(':scope > field[name="type"]')?.textContent.trim() || 'left';
            const body = c.compileNext(b);
            if (!body) return `    // on_swipe ${dir} (empty)\n`;
            return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: "stage:swipe:${dir}" };
${body}    }
`;
        },
    },
    'restart': {
        generator(c, b) {
            return `\
    {
        const __task = __core__.scheduler._all[__core__.scheduler._currentTaskId];
        if (__task && __task._restart) {
            const __info = __task._restart;
            __core__.scheduler.stopTask(__core__.scheduler._currentTaskId);
            const __self2 = __actors__.getByName(__info.entityName) || __screens__.getByName(__info.entityName)?.bg || self;
            const __gen2 = __info.factory(__self2, __screen__, __actors__, __screens__, __global__, __core__);
            __core__.scheduler.startTask(__core__.scheduler._currentTaskId, __gen2, __info.entityName);
        }
        return;
    }
`;
        },
    },
};
