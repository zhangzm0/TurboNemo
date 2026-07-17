// src/extensions/procedures/index.js
import { def } from '../../blocks/def.js';

export default {
    name: 'procedures',
    version: '1.0.0',
    initData: { procedures: 'procedures.procedure_dict' },
    init(core, data) { this._procedures = data.procedures || {}; },
    blocks: {
        'procedures_2_defnoreturn': def({
            isHat: true,
            args0: [
                { type: 'field_input', name: 'NAME' },
                { type: 'input_statement', name: 'STACK' },
            ],
            js({fields, statements}) {
                const name = fields.NAME || '';
                if (!name) return `    // procedure (no name)\n`;
                const body = statements.STACK;
                if (!body) return `    // procedure ${name} (empty)\n`;
                const escapedName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `    __core__._procFns['__global__proc__:${escapedName}'] = function*(self, __screen__, __actors__, __screens__, __global__, __core__, __params) {\n${body}    };\n    return;\n`;
            },
        }),
        'procedures_2_callnoreturn': def({
            args0: [{ type: 'field_input', name: 'NAME' }],
            js({fields, values, next, blockEl}) {
                const name = (fields.NAME || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const mutation = blockEl.querySelector('mutation');
                const pNames = [], args = [];
                if (mutation) {
                    mutation.querySelectorAll('procedures_2_parameter_shadow').forEach((el, i) => {
                        pNames.push(el.getAttribute('name') || `arg${i}`);
                        args.push(values[`ARG${i}`] || '0');
                    });
                }
                let hoisted = '', argProps = '';
                args.forEach((a, i) => {
                    hoisted += `    var __a${i} = (${a});\n`;
                    argProps += `'${pNames[i].replace(/'/g, "\\'")}': __a${i}, `;
                });
                const argObj = '{' + argProps.replace(/, $/, '') + '}';
                return `${hoisted}    { const __fn = __core__._procFns['__global__proc__:${name}']; if (__fn) yield {_yieldType:'call', genFactory:function(){return __fn(self, __screen__, __actors__, __screens__, __global__, __core__, ${argObj});}}; }\n` + next;
            },
        }),
        'procedures_2_callreturn': def({
            output: 'Number',
            args0: [{ type: 'field_input', name: 'NAME' }],
            js({fields, values, blockEl}) {
                const name = (fields.NAME || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const mutation = blockEl.querySelector('mutation');
                const pNames = [], args = [];
                if (mutation) {
                    mutation.querySelectorAll('procedures_2_parameter_shadow').forEach((el, i) => {
                        pNames.push(el.getAttribute('name') || `arg${i}`);
                        args.push(values[`ARG${i}`] || '0');
                    });
                }
                let argProps = '';
                args.forEach((a, i) => {
                    argProps += `'${pNames[i].replace(/'/g, "\\'")}': ${a}, `;
                });
                const argObj = '{' + argProps.replace(/, $/, '') + '}';
                return `(yield {_yieldType:'call', genFactory: function*() { return __core__._callProcGen('__global__proc__:${name}', self, __screen__, __actors__, __screens__, __global__, __core__, ${argObj}); }})`;
            },
        }),
        'procedures_2_parameter': def({
            output: 'String',
            args0: [{ type: 'field_input', name: 'param_name' }],
            js({fields}) {
                const pname = fields.param_name || '';
                const escaped = pname.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `__params['${escaped}']`;
            },
        }),
        'procedures_2_return_value': def({
            args0: [{ type: 'input_value', name: 'VALUE' }],
            js({values}) { return `    return ${values.VALUE};\n`; },
        }),
    },
    install(core) {
        core.settings?.define({
            id: 'procedures.recursion_limit',
            label: '递归深度上限',
            type: 'number',
            min: 10, max: 100000, step: 10,
            defaultValue: 10000,
            category: 'engine', group: 'general',
            restartSafe: false,
        });

        core._procFns = {};
        core._callProcGen = function(name, self, screen, actors, screens, globalObj, coreRef, paramsObj) {
            const factory = coreRef._procFns?.[name];
            if (!factory) return null;
            return factory(self, screen, actors, screens, globalObj, coreRef, paramsObj);
        };

        // 直接从已加载的 bcm 注册过程
        const bcm = core._bcm;
        if (!bcm) return;
    
        const globalObj = {};
        for (const [name, factory] of Object.entries(core._globalHooks)) globalObj[name] = factory();
        const dummySelf = { name: '__global__proc__', _protoName: null, type: 'actor' };
        const dummyScreen = { name: '__global__proc__' };
        const procedures = bcm?.procedures?.procedure_dict || {};
        for (const procData of Object.values(procedures)) {
            if (!procData.blocksXML) continue;
            const scripts = core.compiler.compile(procData.blocksXML, '__global__proc__', 'actor');
            for (const script of scripts) {
                try {console.log(script.code);
                    const fn = new Function(`return (${script.code})`)();
                    const gen = fn(dummySelf, dummyScreen, core.actorManager, core.screenManager, globalObj, core);
                    let r = gen.next();
                    while (!r.done) r = gen.next();
                } catch(e) {
                    console.warn(`procedure ${procData.name} 编译失败:`, e.message);
                }
            }
        }
        // console.log('✅ procedures registered:', Object.keys(core._procFns));
    },
};