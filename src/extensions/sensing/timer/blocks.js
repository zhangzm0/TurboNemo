// sensing/timer/blocks.js
export const timerBlocks = {
    'mobile__set_timer': {
        generator(c, b) {
            const action = c.extractParams(b).timer_action;
            if (action === 'start') return `    __global__.__timer__.start();\n` + c.compileNext(b);
            if (action === 'stop') return `    __global__.__timer__.stop();\n` + c.compileNext(b);
            if (action === 'reset') return `    __global__.__timer__.reset();\n` + c.compileNext(b);
            return c.compileNext(b) || '';
        },
    },
    'mobile__show_timer': {
        generator(c, b) {
            const visible = c.extractParams(b).visible_status;
            if (visible === 'show') return `    __global__.__timer__.show();\n` + c.compileNext(b);
            return `    __global__.__timer__.hide();\n` + c.compileNext(b);
        },
    },
    'mobile__timer_value': {
        generator(c, b) {
            return `__global__.__timer__.getValue()`;
        },
    },
};