// src/blocks/events.js
import { def } from './def.js';

export const eventBlocks = {
    'start_on_click': def({
        isHat: true,
        js({next}) { return `    ////yield __core__._YIELD_FRAME;\n` + (next || ''); },
    }),
    'self_on_tap': def({
        isHat: true,
        args0: [
            { type: 'field_dropdown', name: 'type' },
            { type: 'field_dropdown', name: 'sprite' },
        ],
        js({fields, next}) {
            const rawType = fields.type;
            const type = rawType === '1' || rawType === 'mouse_down' ? 'mouse_down'
                : rawType === '2' || rawType === 'mouse_up' ? 'mouse_up'
                : 'mouse_click';
            const body = next;
            if (!body) return `    // self_on_tap ${type} (empty)\n`;
            const rawTarget = fields.sprite || '__self';
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
    }),
    'when': def({
        isHat: true,
        args0: [
            { type: 'input_value', name: 'condition' },
            { type: 'input_statement', name: 'DO' },
        ],
        js({values, statements, next}) {
            const cond = values.condition;
            const body = statements.DO || next || '';
            if (!body) return `    // when (empty)\n`;
            return `\
        while (true) {
            while (!(${cond})) {
                yield __core__._YIELD_FRAME;
            }
    ${body}    \nyield __core__._YIELD_FRAME;}
    `;
        },
    }),
    'scenes_index_get': def({
        output: 'Number',
        args0: [{ type: 'field_dropdown', name: 'index' }],
        js({fields}) {
            const val = fields.index || '1';
            if (val === '__next_scene') return `(__screens__.getCurrentIndex() + 1)`;
            if (val === '__previous_scene') return `(__screens__.getCurrentIndex() - 1)`;
            return val;
        },
    }),
    'set_scene_by_index': def({
        args0: [{ type: 'input_value', name: 'index' }],
        js: '__screens__.switchTo({index})',
    }),
    'set_scene_transition': def({
        args0: [
            { type: 'field_dropdown', name: 'transition' },
            { type: 'field_dropdown', name: 'direction' },
        ],
        js({fields, next}) {
            const t = fields.transition || 'none';
            const d = fields.direction || '';
            let name = t;
            if ((t === 'slide' || t === 'bounce') && d) name = t + '_' + d;
            else if (t === 'fadeInOut') name = 'fade_in_out';
            return `    __screens__.setTransitionType('${name}');\n` + next;
        },
    }),
    'on_running_group_activated': def({
        isHat: true,
        js({next}) {
            const body = next;
            if (!body) return `    // on_running_group_activated (empty)\n`;
            return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: \`screen:activated:\${self.name}\` };
${body}    }
`;
        },
    }),
    'stop': def({
        args0: [{ type: 'field_input', name: 'scope' }],
        js({fields, next}) {
            const scope = fields.scope;
            if (scope === '1')
                return `    __core__.scheduler.stopTask(__core__.scheduler._currentTaskId);\n` + next;
            if (scope === '2')
                return `    __core__.scheduler.stopOtherTasks(self.name, __core__.scheduler._currentTaskId);\n` + next;
            if (scope === '3')
                return `    __core__.scheduler.pauseOtherEntityTasks(self.name);\n` + next;
            return `    __core__.scheduler.stopAll();\n` + next;
        },
    }),
    'on_swipe': def({
        isHat: true,
        args0: [{ type: 'field_dropdown', name: 'type' }],
        js({fields, next}) {
            const dir = fields.type || 'left';
            const body = next;
            if (!body) return `    // on_swipe ${dir} (empty)\n`;
            return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: "stage:swipe:${dir}" };
${body}    }
`;
        },
    }),
    'restart': def({ js: '__core__.restart(); __core__.start();' }),
};
