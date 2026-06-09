// src/blocks/control.js
export const controlBlocks = {
    wait: {
        generator(c, b) {
            const t = c.compileValue(b, "time");
            return (
                `    yield { _yieldType: "wait", frames: Math.round(${t} * 60) };\n` +
                c.compileNext(b)
            );
        },
    },
    wait_until: {
        generator(c, b) {
            const cond = c.compileValue(b, "condition");
            return (
                `\
    while (!(${cond})) {
        yield __core__._YIELD_FRAME;
    }
` + c.compileNext(b)
            );
        },
    },
    repeat_forever: {
        generator(c, b) {
            const body = c.compileStatement(b, "DO");
            return (
                `\
    while (true) {
${body}        yield __core__._YIELD_FRAME;
    }
` + c.compileNext(b)
            );
        },
    },
    repeat_n_times: {
        generator(c, b) {
            const times = c.compileValue(b, "times");
            const body = c.compileStatement(b, "DO");
            return (
                `\
    for (let __i = 0; __i < ${times}; __i++) {
${body}        yield __core__._YIELD_FRAME;
    }
` + c.compileNext(b)
            );
        },
    },
    controls_if_no_else: {
        generator(c, b) {
            const cond = c.compileValue(b, "IF0");
            const body = c.compileStatement(b, "DO0");
            return `    if (${cond}) {\n${body}    }\n` + c.compileNext(b);
        },
    },
    controls_if: {
        generator(c, b) {
            const cond0 = c.compileValue(b, "IF0");
            const body0 = c.compileStatement(b, "DO0");
            let code = `    if (${cond0}) {\n${body0}    }`;
            const mutation = b.querySelector("mutation");
            const elseifCount = parseInt(
                mutation?.getAttribute("elseif") || "0",
            );
            for (let i = 1; i <= elseifCount; i++) {
                const cond = c.compileValue(b, `IF${i}`);
                const body = c.compileStatement(b, `DO${i}`);
                code += ` else if (${cond}) {\n${body}    }`;
            }
            // 直接检查有没有 ELSE statement，不依赖 mutation
            const elseBody = c.compileStatement(b, "ELSE");
            if (elseBody) {
                code += ` else {\n${elseBody}    }`;
            }
            code += "\n" + c.compileNext(b);
            return code;
        },
    },

    // blocks/control.js 里加上

    repeat_forever_until: {
        generator(c, b) {
            const cond = c.compileValue(b, "condition");
            const body = c.compileStatement(b, "DO");
            return (
                `\
        while (true) {
    ${body}        if (${cond}) break;
            yield __core__._YIELD_FRAME;
        }
    ` + c.compileNext(b)
            );
        },
    },

    break: {
        generator(c, b) {
            return `    break;\n` + c.compileNext(b);
        },
    },
};
