import { def } from './def.js';

export const controlBlocks = {
    wait: def({
        args0: [{ type: 'input_value', name: 'time' }],
        js: 'yield { _yieldType: "wait", frames: Math.ceil({time} * 60) }',
    }),

    wait_until: def({
        args0: [{ type: 'input_value', name: 'condition' }],
        js({values, next}) {
            return `\
    while (!(${values.condition})) {
        yield __core__._YIELD_FRAME;
    }
` + next;
        },
    }),

    repeat_forever: def({
        args0: [{ type: 'input_statement', name: 'DO' }],
        js({statements, next}) {
            return `\
    while (__screen__ === __screens__.getCurrent()) {
${statements.DO}        yield __core__._YIELD_FRAME;
    }
` + next;
        },
    }),

    repeat_n_times: def({
        args0: [
            { type: 'input_value', name: 'times' },
            { type: 'input_statement', name: 'DO' },
        ],
        js({values, statements, next}) {
            return `\
    for (let __i = 0; __i < ${values.times}; __i++) {
${statements.DO}        yield __core__._YIELD_FRAME;
    }
` + next;
        },
    }),

    controls_if_no_else: def({
        args0: [
            { type: 'input_value', name: 'IF0' },
            { type: 'input_statement', name: 'DO0' },
        ],
        js({values, statements, next}) {
            return `    if (${values.IF0}) {\n${statements.DO0}    }\n` + next;
        },
    }),

    controls_if: def({
        js({values, statements, next}) {
            let code = `    if (${values.IF0}) {\n${statements.DO0}    }`;
            for (let i = 1; ; i++) {
                const cond = values[`IF${i}`];
                const body = statements[`DO${i}`];
                if (cond === undefined && body === undefined) break;
                code += ` else if (${cond || '0'}) {\n${body || ''}    }`;
            }
            if (statements.ELSE !== undefined) {
                code += ` else {\n${(statements.ELSE || '')}    }`;
            }
            return code + '\n' + next;
        },
    }),

    repeat_forever_until: def({
        args0: [
            { type: 'input_value', name: 'condition' },
            { type: 'input_statement', name: 'DO' },
        ],
        js({values, statements, next}) {
            return `\
    while (true) {
        if (${values.condition}) break;
${statements.DO}        yield __core__._YIELD_FRAME;
    }
` + next;
        },
    }),

    break: def({ js: 'break' }),

    'warp': def({
        args0: [{ type: 'input_statement', name: 'DO' }],
        js({statements, next}) {
            let body = statements.DO;
            if (!body) return next || '';
            return `\
    // warp begin
    {
        let __warpSteps = 0;
${body.replace(/yield __core__\._YIELD_FRAME;/g,
    `if (++__warpSteps >= 200) { __warpSteps = 0; yield __core__._YIELD_FRAME; }`
)}
    }
    // warp end
` + next;
        },
    }),
};
