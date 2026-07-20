// src/core/compiler.js
class Compiler {
    constructor(registry) {
        this.registry = registry;
        this.target = 'actor';
        this._debug = false;
    }

    compile(blocksXML, entityName, target = 'actor', nameMap = {}) {
        if (!blocksXML) return [];
        this.target = target;
        this._entityName = entityName;
        this._stepIdx = 0;
        this._blockDebugList = [];
        blocksXML = blocksXML.replace(/"([a-zA-Z][a-zA-Z0-9_]*=)/g, '" $1');
        blocksXML = `<root>${blocksXML}</root>`;
        const parser = new DOMParser();
        const doc = parser.parseFromString(blocksXML, 'text/xml');
        if (doc.documentElement?.tagName === 'parsererror') return [];
        const rootBlocks = doc.querySelectorAll(':scope > block');
        const scripts = [];
        rootBlocks.forEach((blockEl, index) => {
            const type = (blockEl.getAttribute('type') || '').trim();
            const blockDef = this.registry.get(type);
            if (!blockDef || !blockDef.isHat) return;
            const blockTree = this.blockToObject(blockEl, nameMap);
            const scriptStart = this._blockDebugList.length;
            const body = this.compileBlock(blockEl);
            if (!body) return;
            const scriptBlockList = this._blockDebugList.slice(scriptStart);
            const fnName = `script_${entityName.replace(/[^a-zA-Z0-9_]/g, '_')}_${index}`;
            const code = `\
    function* ${fnName}(self, __screen__, __actors__, __screens__, __global__, __core__) {
${body}
    }`;
            scripts.push({ name: fnName, code, hatType: type, blockList: scriptBlockList, blockTree });
        });
        return scripts;
    }

    blockToObject(blockEl, nameMap = {}) {
        const type = blockEl.getAttribute('type') || '';
        const obj = { type };
        const id = blockEl.getAttribute('id');
        if (id) obj.id = id;

        const fields = {};
        blockEl.querySelectorAll(':scope > field').forEach(f => {
            const name = f.getAttribute('name');
            if (!name) return;
            let val = f.textContent.trim();
            if (name === 'VAR' || name === 'LIST') val = nameMap[val] || val;
            fields[name] = val;
        });
        if (Object.keys(fields).length) obj.fields = fields;

        const values = {};
        blockEl.querySelectorAll(':scope > value').forEach(v => {
            const name = v.getAttribute('name');
            if (!name) return;
            const block = v.querySelector(':scope > block');
            const shadow = v.querySelector(':scope > shadow');
            if (block) values[name] = this.blockToObject(block, nameMap);
            else if (shadow) values[name] = this.blockToObject(shadow, nameMap);
        });
        if (Object.keys(values).length) obj.values = values;

        const statements = {};
        blockEl.querySelectorAll(':scope > statement').forEach(s => {
            const name = s.getAttribute('name');
            if (!name) return;
            const child = s.querySelector(':scope > block');
            if (child) statements[name] = this.blockToObject(child, nameMap);
        });
        if (Object.keys(statements).length) obj.statements = statements;

        const mutation = blockEl.querySelector(':scope > mutation');
        if (mutation) {
            obj.mutation = {};
            for (const attr of mutation.attributes) {
                obj.mutation[attr.name] = attr.value;
            }
        }

        const nextBlock = blockEl.querySelector(':scope > next > block');
        if (nextBlock) obj.next = this.blockToObject(nextBlock, nameMap);
        return obj;
    }

    compileBlock(blockEl, fromValue = false) {
        const type = (blockEl.getAttribute('type') || '').trim();
        const blockDef = this.registry.get(type);
        let code;
        if (!blockDef) {
            code = `0 /* unknown: ${type} */\n` + this.compileNext(blockEl);
        } else {
            code = this._compileStructured(blockDef, blockEl);
        }
        if (this._debug && !blockDef?.isHat) {
            if (fromValue) {
                code = `__core__._debugger.value('${type}', ${code}, self?.name||'bg')`;
            } else {
                const stepIdx = this._stepIdx++;
                this._blockDebugList.push({ idx: stepIdx });
                const fields = {};
                blockEl.querySelectorAll(':scope > field').forEach(f => {
                    const n = f.getAttribute('name');
                    if (n) fields[n] = f.textContent.trim();
                });
                const fieldsStr = Object.keys(fields).length ? `,fields:${JSON.stringify(fields)}` : '';
                code = `var __dbg=__core__._debugger.step({_i:${stepIdx},type:'${type}'${fieldsStr},entity:self?.name||'bg',self:self,screen:__screen__?.name||'',screenObj:__screen__,vars:self?._vars});if(__dbg){yield __dbg;}\n${code}`;
            }
        }
        return code;
    }

    // Blockly-like: args0 declares inputs, js is a template string or function
    _compileStructured(def, blockEl) {
        const ctx = { values: {}, fields: {}, statements: {}, next: '', target: this.target, blockEl, entityName: this._entityName || '?' };
        // Phase 1: compile inputs declared in args0
        for (const arg of def.args0 || []) {
            if (!arg.name) continue;
            if (arg.type === 'input_value') {
                ctx.values[arg.name] = this.compileValue(blockEl, arg.name);
            } else if (arg.type === 'input_statement') {
                ctx.statements[arg.name] = this.compileStatement(blockEl, arg.name);
            } else if (arg.type?.startsWith('field_')) {
                const el = blockEl.querySelector(`:scope > field[name="${arg.name}"]`);
                ctx.fields[arg.name] = el?.textContent?.trim?.() ?? '';
            }
        }
        // Phase 2: auto-discover mutation inputs not declared in args0
        for (const el of blockEl.querySelectorAll(':scope > value')) {
            const name = el.getAttribute('name');
            if (name && !(name in ctx.values)) ctx.values[name] = this.compileValue(blockEl, name);
        }
        for (const el of blockEl.querySelectorAll(':scope > field')) {
            const name = el.getAttribute('name');
            if (name && !(name in ctx.fields)) ctx.fields[name] = el.textContent?.trim?.() ?? '';
        }
        for (const el of blockEl.querySelectorAll(':scope > statement')) {
            const name = el.getAttribute('name');
            if (name && !(name in ctx.statements)) ctx.statements[name] = this.compileStatement(blockEl, name);
        }
        ctx.next = this.compileNext(blockEl);

        if (typeof def.js === 'function') return def.js(ctx);

        if (typeof def.js === 'string') {
            let code = def.js
                .replace(/\{\$(\w+)\}/g, (_, k) => ctx.fields[k] ?? '')
                .replace(/\{(\w+)\}/g, (_, k) => ctx.values[k] ?? '0');
            if (def.output) return `(${code})`;
            return `    ${code}\n` + ctx.next;
        }
        return '';
    }

    compileNext(blockEl) {
        for (const child of blockEl.children) {
            if (child.tagName === 'next') {
                const block = child.querySelector(':scope > block');
                if (block) return this.compileBlock(block);
            }
        }
        return '';
    }

    compileStatement(blockEl, name) {
        const stmtEl = blockEl.querySelector(`:scope > statement[name="${name}"]`);
        if (stmtEl) {
            const block = stmtEl.querySelector(':scope > block');
            if (block) return this.compileBlock(block);
        }
        return '';
    }

    compileValue(blockEl, name) {
        const valueEl = blockEl.querySelector(`:scope > value[name="${name}"]`);
        if (!valueEl) return '0';
        const blocks = valueEl.querySelectorAll(':scope > block');
        let code;
        if (blocks.length > 0) {
            code = this.compileBlock(blocks[blocks.length - 1], true);
        } else {
            const shadow = valueEl.querySelector(':scope > shadow');
            if (shadow) code = this.compileBlock(shadow, true);
            else return '0';
        }
        return `(${code})`;
    }

    extractParams(blockEl) {
        const params = {};
        blockEl.querySelectorAll(':scope > field').forEach(f => {
            const name = f.getAttribute('name');
            if (!name) return;
            const val = f.textContent.trim();
            const num = Number(val);
            params[name] = isNaN(num) || val === '' ? val : num;
        });
        return params;
    }
}

export { Compiler };
