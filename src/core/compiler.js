// src/core/compiler.js
class Compiler {
    constructor(registry) {
        this.registry = registry;
        this.target = 'actor';
    }

    compile(blocksXML, entityName, target = 'actor') {
        if (!blocksXML) return [];
        this.target = target;
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
            const body = this.compileBlock(blockEl);
            if (!body) return;
            const fnName = `script_${entityName.replace(/[^a-zA-Z0-9_]/g, '_')}_${index}`;
            const code = `\
function* ${fnName}(self, __screen__, __actors__, __screens__, __global__, __core__) {
${body}
}`;
            scripts.push({ name: fnName, code, hatType: type });
        });
        // console.log('编译', scripts);
        return scripts;
    }

    compileBlock(blockEl) {
        const type = (blockEl.getAttribute('type') || '').trim();
        const blockDef = this.registry.get(type);
        if (!blockDef) {
            return `0 /* unknown: ${type} */\n` + this.compileNext(blockEl);
        }
        if (blockDef.generator) return blockDef.generator(this, blockEl);
        return this._defaultGenerator(blockEl);
    }

    _defaultGenerator(blockEl) {
        const type = (blockEl.getAttribute('type') || '').trim();
        const params = this.extractParams(blockEl);
        return `    yield __core__.host.execute('${type}', ${JSON.stringify(params)});\n` + this.compileNext(blockEl);
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
        if (blocks.length > 0) return this.compileBlock(blocks[blocks.length - 1]);
        const shadow = valueEl.querySelector(':scope > shadow');
        if (shadow) return this.compileBlock(shadow);
        return '0';
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