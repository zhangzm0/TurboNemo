// src/extensions/procedures/index.js
export default {
    name: 'procedures',
    version: '1.0.0',
    initData: { procedures: 'procedures.procedure_dict' },
    init(core, data) { this._procedures = data.procedures || {}; },
    blocks: {
        'procedures_2_defnoreturn': {
            isHat: true,
            generator(c, b) {
                const name = b.querySelector('field[name="NAME"]')?.textContent.trim() || '';
                if (!name) return `    // procedure (no name)\n`;
                const body = c.compileStatement(b, 'STACK');
                if (!body) return `    // procedure ${name} (empty)\n`;
                const escapedName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                // 全局函数用固定 key 注册
                return `    __core__._procFns['__global__proc__:${escapedName}'] = function*(self, __screen__, __actors__, __screens__, __global__, __core__, __params) {\n${body}    };\n    return;\n`;
            },
        },
        'procedures_2_callnoreturn': {
            generator(c, b) {
                const name = (b.querySelector('field[name="NAME"]')?.textContent.trim() || '')
                    .replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const mutation = b.querySelector('mutation');
                const pNames = [], args = [];
                if (mutation) {
                    mutation.querySelectorAll('procedures_2_parameter_shadow').forEach((el, i) => {
                        pNames.push(el.getAttribute('name') || `arg${i}`);
                        args.push(c.compileValue(b, `ARG${i}`));
                    });
                }
                const argObj = '{' + pNames.map((p, i) => `'${p.replace(/'/g, "\\'")}': ${args[i]}`).join(', ') + '}';
                // 用固定 key 查找全局函数
                return `    { const __fn = __core__._procFns['__global__proc__:${name}']; if (__fn) yield* __fn(self, __screen__, __actors__, __screens__, __global__, __core__, ${argObj}); }\n` + c.compileNext(b);
            },
        },
        'procedures_2_callreturn': {
            generator(c, b) {
                const name = (b.querySelector('field[name="NAME"]')?.textContent.trim() || '')
                    .replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const mutation = b.querySelector('mutation');
                const pNames = [], args = [];
                if (mutation) {
                    mutation.querySelectorAll('procedures_2_parameter_shadow').forEach((el, i) => {
                        pNames.push(el.getAttribute('name') || `arg${i}`);
                        args.push(c.compileValue(b, `ARG${i}`));
                    });
                }
                const argObj = '{' + pNames.map((p, i) => `'${p.replace(/'/g, "\\'")}': ${args[i]}`).join(', ') + '}';
                // 通过 yield* 委托到过程体，确保过程中的 yield 能被调度器正确处理
                return `yield* __core__._callProcGenerator('__global__proc__:${name}', self, __screen__, __actors__, __screens__, __global__, __core__, ${argObj})`;
            },
        },
        'procedures_2_parameter': {
            generator(c, b) {
                const pname = b.querySelector('field[name="param_name"]')?.textContent.trim() || '';
                const escaped = pname.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `__params['${escaped}']`;
            },
        },
        'procedures_2_return_value': {
            generator(c, b) { return `    return ${c.compileValue(b, 'VALUE')};\n`; },
        },
    },
    install(core) {
        core._procFns = {};
        core._callProcGenerator = function*(name, self, screen, actors, screens, globalObj, coreRef, paramsObj) {
            const factory = coreRef._procFns?.[name];
            if (!factory) return undefined;
            return yield* factory(self, screen, actors, screens, globalObj, coreRef, paramsObj);
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