// src/extensions/operators/index.js
import { def } from '../../blocks/def.js';

export default {
    name: 'operators',
    version: '1.0.0',
    blocks: {
        'math_arithmetic_common': def({
            output: 'Number',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
            ],
            js({fields, values}) {
                const op = fields.OP;
                const a = values.A, b = values.B;
                const ops = {
                    ADD: `__calcAdd(${a}, ${b})`,
                    MINUS: `__calcSubtract(${a}, ${b})`,
                    MULTIPLY: `__calcMultiply(${a}, ${b})`,
                    DIVIDE: `__calcDivide(${a}, ${b})`
                };
                return ops[op] || `__calcAdd(${a}, ${b})`;
            },
        }),
        'math_arithmetic_power': def({
            output: 'Number',
            args0: [
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
            ],
            js: 'Math.pow({A}, {B})',
        }),
        'random': def({
            output: 'Number',
            args0: [
                { type: 'input_value', name: 'a' },
                { type: 'input_value', name: 'b' },
            ],
            js: 'Math.floor({a} + Math.random() * ({b} - {a} + 1))',
        }),
        'math_single': def({
            output: 'Number',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'NUM' },
            ],
            js({fields, values}) {
                const op = fields.OP, num = values.NUM;
                const fns = {
                    ROOT: `Math.sqrt(${num})`,
                    ABS: `Math.abs(${num})`,
                    NEG: `-(${num})`,
                    LN: `Math.log(${num})`,
                    LOG10: `Math.log(${num}) / Math.log(10)`,
                    EXP: `Math.pow(Math.E, ${num})`,
                    POW10: `Math.pow(10, ${num})`
                };
                return fns[op] || num;
            },
        }),
        'math_modulo': def({
            output: 'Number',
            args0: [
                { type: 'input_value', name: 'DIVIDEND' },
                { type: 'input_value', name: 'DIVISOR' },
            ],
            js: '{DIVIDEND} % {DIVISOR}',
        }),
        'math_trig_common': def({
            output: 'Number',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'NUM' },
            ],
            js({fields, values}) {
                const op = fields.OP, num = values.NUM;
                const rad = `(${num} * Math.PI / 180)`;
                const fns = {
                    SIN: `__calcRound(Math.sin(${rad}), 12)`,
                    COS: `__calcRound(Math.cos(${rad}), 12)`,
                    TAN: `__calcRound(Math.tan(${rad}), 12)`
                };
                return fns[op] || '0';
            },
        }),
        'math_trig_arc': def({
            output: 'Number',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'NUM' },
            ],
            js({fields, values}) {
                const op = fields.OP, num = values.NUM;
                const fns = {
                    ASIN: `__calcRound(Math.asin(${num}) * 180 / Math.PI, 12)`,
                    ACOS: `__calcRound(Math.acos(${num}) * 180 / Math.PI, 12)`,
                    ATAN: `__calcRound(Math.atan(${num}) * 180 / Math.PI, 12)`
                };
                return fns[op] || '0';
            },
        }),
        'math_round': def({
            output: 'Number',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'NUM' },
            ],
            js({fields, values}) {
                const op = fields.OP, num = values.NUM;
                const fns = {
                    ROUND: `Math.floor(${num} + 0.5)`,
                    ROUNDUP: `Math.ceil(${num})`,
                    ROUNDDOWN: `Math.floor(${num})`
                };
                return fns[op] || num;
            },
        }),
        'math_number_property': def({
            output: 'Boolean',
            args0: [
                { type: 'field_dropdown', name: 'PROPERTY' },
                { type: 'input_value', name: 'NUMBER_TO_CHECK' },
            ],
            js({fields, values}) {
                const prop = fields.PROPERTY, num = values.NUMBER_TO_CHECK;
                const fns = {
                    EVEN: `(${num} % 2 === 0)`,
                    ODD: `(Math.abs(${num} % 2) === 1)`,
                    PRIME: `__isPrime(${num})`,
                    WHOLE: `(${num} === Math.floor(${num}))`,
                    POSITIVE: `(${num} > 0)`,
                    NEGATIVE: `(${num} < 0)`
                };
                return fns[prop] || 'false';
            },
        }),
        'divisible_by': def({
            output: 'Boolean',
            args0: [
                { type: 'input_value', name: 'NUMBER_TO_CHECK' },
                { type: 'input_value', name: 'DIVISOR' },
            ],
            js: '{NUMBER_TO_CHECK} % {DIVISOR} === 0',
        }),
        'logic_compare': def({
            output: 'Boolean',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
            ],
            js({fields, values}) {
                const op = fields.OP, a = values.A, b = values.B;
                const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
                return `(${a} ${ops[op] || '=='} ${b})`;
            },
        }),
        'logic_operation': def({
            output: 'Boolean',
            args0: [
                { type: 'field_dropdown', name: 'OP' },
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
            ],
            js({fields, values}) {
                const op = fields.OP, a = values.A, b = values.B;
                const ops = { AND: '&&', OR: '||' };
                return `(${a} ${ops[op] || '&&'} ${b})`;
            },
        }),
        'logic_boolean': def({
            output: 'Boolean',
            args0: [
                { type: 'field_dropdown', name: 'BOOL' },
            ],
            js({fields}) {
                return fields.BOOL === 'TRUE' ? 'true' : 'false';
            },
        }),
        'logic_negate': def({
            output: 'Boolean',
            args0: [{ type: 'input_value', name: 'BOOL' }],
            js: '!({BOOL})',
        }),
        'logic_empty': def({
            output: 'Boolean',
            args0: [{ type: 'input_value', name: 'VALUE' }],
            js: "({VALUE} === '' || {VALUE} == null || {VALUE} === 0)",
        }),
        'get_split_options': def({
            output: 'String',
            args0: [{ type: 'field_dropdown', name: 'option' }],
            js({fields}) {
                const option = fields.option || '';
                return `(__core__._bcm?.split_options?.options_dict?.['${option}']?.name || '${option}')`;
            },
        }),
        'text_join': def({
            output: 'String',
            js({values}) {
                const parts = [];
                for (let i = 0; ; i++) {
                    const v = values[`ADD${i}`];
                    if (v === undefined) break;
                    parts.push(`String(${v})`);
                }
                return `(${parts.join(' + ')})`;
            },
        }),
        'text_length': def({output:'Number',args0:[{type:'input_value',name:'VALUE'}],js:'String({VALUE}).length'}),
        'text_contain': def({output:'Boolean',args0:[{type:'input_value',name:'TEXT1'},{type:'input_value',name:'TEXT2'}],js:'String({TEXT1}).indexOf(String({TEXT2})) !== -1'}),
        'text_char_at': def({output:'String',args0:[{type:'input_value',name:'VALUE'},{type:'input_value',name:'INDEX'}],js:'String({VALUE}).charAt({INDEX} - 1)'}),
        'text_split': def({
            args0: [
                { type: 'input_value', name: 'TEXT_TO_SPLIT' },
                { type: 'input_value', name: 'SPLIT_TEXT' },
            ],
            js({values}) {
                const sep = values.SPLIT_TEXT || "','";
                return `String(${values.TEXT_TO_SPLIT}).split(String(${sep})).map(e => isNaN(Number(e)) || e === '' ? e : Number(e))`;
            },
        }),
        'mobile__text': def({output:'String',args0:[{type:'input_value',name:'TEXT'}],js:'String({TEXT})'}),
    },
    install(core) {
        // ponytail: native + 12dp rounding, covers visible float artifacts;
        // add string-based exact math if accumulation errors surface in long loops
        const R = (n) => Math.round(n * 1e12) / 1e12;
        window.__calcAdd = (a, b) => R(a + b);
        window.__calcSubtract = (a, b) => R(a - b);
        window.__calcMultiply = (a, b) => R(a * b);
        window.__calcDivide = (a, b) => R(a / b);

        window.__calcRound = function(num, precision) {
            const str = num.toExponential(precision + 2);
            return parseFloat(parseFloat(str).toFixed(precision));
        };

        // 质数判断
        window.__isPrime = function(n) {
            if (n < 2 || n !== Math.floor(n)) return false;
            if (n % 2 === 0) return n === 2;
            if (n % 3 === 0) return n === 3;
            for (let i = 5; i * i <= n; i += 6) {
                if (n % i === 0 || n % (i + 2) === 0) return false;
            }
            return true;
        };
    },
};
