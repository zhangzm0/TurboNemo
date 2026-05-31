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
            if (type === 'mouse_down') {
                return `\
    while (true) {
        yield { _yieldType: "pause", event: \`actor:pointerdown:\${self.name}\` };
        let __down = true;
        __core__.eventBus.once(\`actor:pointerup:\${self.name}\`, () => { __down = false; });
        while (__down) {
${body}            yield __core__._YIELD_FRAME;
        }
    }
`;
            }
            const event = type === 'mouse_up' ? 'pointerup' : 'pointertap';
            return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: \`actor:${event}:\${self.name}\` };
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
            const t = c.extractParams(b).type || 'none';
            return `    __screens__.setTransition('${t}');\n` + c.compileNext(b);
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
            switch (scope) {
                case '1': return `    __core__.scheduler.stopTask(__core__.scheduler._currentTaskId);\n` + c.compileNext(b);
                case '2': return `    __core__.scheduler.stopOtherTasks(self.name, __core__.scheduler._currentTaskId);\n` + c.compileNext(b);
                case '3': return `    __core__.scheduler.stopOtherEntityTasks(self.name);\n` + c.compileNext(b);
                default:  return `    __core__.scheduler.stopAll();\n` + c.compileNext(b);
            }
        },
    },
};