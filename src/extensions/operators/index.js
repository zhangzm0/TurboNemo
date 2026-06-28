// src/extensions/operators/index.js
export default {
    name: 'operators',
    version: '1.0.0',
    blocks: {
        'math_arithmetic_common': {
            generator(c, b) {
                const op = c.extractParams(b).OP;
                const a = c.compileValue(b, 'A'), b2 = c.compileValue(b, 'B');
                const ops = { 
                    ADD: `__calcAdd(${a}, ${b2})`, 
                    MINUS: `__calcSubtract(${a}, ${b2})`, 
                    MULTIPLY: `__calcMultiply(${a}, ${b2})`, 
                    DIVIDE: `__calcDivide(${a}, ${b2})` 
                };
                return ops[op] || `__calcAdd(${a}, ${b2})`;
            },
        },
        'math_arithmetic_power': { 
            generator(c, b) { 
                return `Math.pow(${c.compileValue(b, 'A')}, ${c.compileValue(b, 'B')})`; 
            } 
        },
        'random': { 
            generator(c, b) { 
                const a = c.compileValue(b, 'a'), b2 = c.compileValue(b, 'b'); 
                return `(Math.floor(${a} + Math.random() * (${b2} - ${a} + 1)))`; 
            } 
        },
        'math_single': {
            generator(c, b) {
                const op = c.extractParams(b).OP, num = c.compileValue(b, 'NUM');
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
        },
        'math_modulo': { 
            generator(c, b) { 
                return `(${c.compileValue(b, 'DIVIDEND')} % ${c.compileValue(b, 'DIVISOR')})`; 
            } 
        },
        'math_trig_common': {
            generator(c, b) {
                const op = c.extractParams(b).OP, num = c.compileValue(b, 'NUM');
                const rad = `(${num} * Math.PI / 180)`;
                const fns = { 
                    SIN: `__calcRound(Math.sin(${rad}), 12)`, 
                    COS: `__calcRound(Math.cos(${rad}), 12)`, 
                    TAN: `__calcRound(Math.tan(${rad}), 12)` 
                };
                return fns[op] || '0';
            },
        },
        'math_trig_arc': {
            generator(c, b) {
                const op = c.extractParams(b).OP, num = c.compileValue(b, 'NUM');
                const fns = { 
                    ASIN: `__calcRound(Math.asin(${num}) * 180 / Math.PI, 12)`, 
                    ACOS: `__calcRound(Math.acos(${num}) * 180 / Math.PI, 12)`, 
                    ATAN: `__calcRound(Math.atan(${num}) * 180 / Math.PI, 12)` 
                };
                return fns[op] || '0';
            },
        },
        'math_round': {
            generator(c, b) {
                const op = c.extractParams(b).OP, num = c.compileValue(b, 'NUM');
                const fns = { 
                    ROUND: `Math.floor(${num} + 0.5)`, 
                    ROUNDUP: `Math.ceil(${num})`, 
                    ROUNDDOWN: `Math.floor(${num})` 
                };
                return fns[op] || num;
            },
        },
        'math_number_property': {
            generator(c, b) {
                const prop = c.extractParams(b).PROPERTY, num = c.compileValue(b, 'NUMBER_TO_CHECK');
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
        },
        'divisible_by': { 
            generator(c, b) { 
                return `(${c.compileValue(b, 'NUMBER_TO_CHECK')} % ${c.compileValue(b, 'DIVISOR')} === 0)`; 
            } 
        },
        'logic_compare': {
            generator(c, b) {
                const op = c.extractParams(b).OP, a = c.compileValue(b, 'A'), b2 = c.compileValue(b, 'B');
                const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
                return `(${a} ${ops[op] || '=='} ${b2})`;
            },
        },
        'logic_operation': {
            generator(c, b) {
                const op = c.extractParams(b).OP, a = c.compileValue(b, 'A'), b2 = c.compileValue(b, 'B');
                const ops = { AND: '&&', OR: '||' };
                return `(${a} ${ops[op] || '&&'} ${b2})`;
            },
        },
        'logic_boolean': { 
            generator(c, b) { 
                const b2 = c.extractParams(b).BOOL; 
                return { TRUE: 'true', FALSE: 'false' }[b2] || 'false'; 
            } 
        },
        'logic_negate': {
            generator(c, b) {
                return `!(${c.compileValue(b, 'BOOL')})`;
            }
        },
        'logic_empty': {
            generator(c, b) {
                const val = c.compileValue(b, 'VALUE');
                return `(${val} === '' || ${val} == null || ${val} === 0)`;
            },
        },
        'get_split_options': {
            generator(c, b) {
                const option = b.querySelector(':scope > field[name="option"]')?.textContent.trim() || '';
                return `(__core__._bcm?.split_options?.options_dict?.['${option}']?.name || '${option}')`;
            },
        },
        'text_join': {
            generator(c, b) {
                const parts = [];
                for (let i = 0; ; i++) {
                    const v = c.compileValue(b, `ADD${i}`);
                    if (v === '0' && !b.querySelector(`value[name="ADD${i}"]`)) break;
                    parts.push(`String(${v})`);
                }
                return `(${parts.join(' + ')})`;
            },
        },
        'text_length': { 
            generator(c, b) { 
                return `String(${c.compileValue(b, 'VALUE')}).length`; 
            } 
        },
        'text_contain': { 
            generator(c, b) { 
                return `(String(${c.compileValue(b, 'TEXT1')}).indexOf(String(${c.compileValue(b, 'TEXT2')})) !== -1)`; 
            } 
        },
        'text_char_at': { 
            generator(c, b) { 
                return `String(${c.compileValue(b, 'VALUE')}).charAt(${c.compileValue(b, 'INDEX')} - 1)`; 
            } 
        },
        'text_split': {
            generator(c, b) {
                const sepEl = b.querySelector(':scope > value[name="SPLIT_TEXT"]');
                const sep = sepEl ? c.compileValue(b, 'SPLIT_TEXT') : "','";
                return `String(${c.compileValue(b, 'TEXT_TO_SPLIT')}).split(String(${sep})).map(e => isNaN(Number(e)) || e === '' ? e : Number(e))`;
            }
        },
        'mobile__text': { 
            generator(c, b) { 
                return `String(${c.compileValue(b, 'TEXT')})`; 
            } 
        },
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