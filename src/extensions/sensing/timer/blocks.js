// sensing/timer/blocks.js
import { def } from '../../../blocks/def.js';

export const timerBlocks = {
    'mobile__set_timer': def({
        args0: [{ type: 'field_dropdown', name: 'timer_action' }],
        js({ fields, next }) {
            if (fields.timer_action === 'start') return `    __global__.__timer__.start();\n` + next;
            if (fields.timer_action === 'stop') return `    __global__.__timer__.stop();\n` + next;
            if (fields.timer_action === 'reset') return `    __global__.__timer__.reset();\n` + next;
            return next || '';
        },
    }),
    'mobile__show_timer': def({
        args0: [{ type: 'field_dropdown', name: 'visible_status' }],
        js({ fields, next }) {
            if (fields.visible_status === 'show') return `    __global__.__timer__.show();\n` + next;
            return `    __global__.__timer__.hide();\n` + next;
        },
    }),
    'mobile__timer_value': def({
        output: 'Number',
        js: '__global__.__timer__.getValue()',
    }),
};
