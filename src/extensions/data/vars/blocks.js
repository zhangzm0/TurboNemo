// ==================== data/vars/blocks.js ====================
export const varBlocks = {
    'variables_get': {
        generator(c, b) {
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            return `(self._vars['${id}']?.value ?? 0)`;
        },
    },
    'variables_set': {
        generator(c, b) {
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            const val = c.compileValue(b, 'VALUE');
            return `    self._vars['${id}'].value = ${val};\n` + c.compileNext(b);
        },
    },
    'change_variable': {
        generator(c, b) {
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim()
                    || b.querySelector(':scope > field[name="valname"]')?.textContent.trim()
                    || '';
            const method = b.querySelector(':scope > field[name="method"]')?.textContent.trim() || 'increase';
            let val = c.compileValue(b, 'n') || c.compileValue(b, 'VALUE') || '0';
            if (method === 'decrease') val = `-(${val})`;
            return `    self._vars['${id}'].value += ${val};\n` + c.compileNext(b);
        },
    },
    'show_hide_variable': {
        generator(c, b) {
            const func = c.extractParams(b).FUNC;
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            if (func === 'show') return `    __varDisplay__.show('${id}');\n` + c.compileNext(b);
            return `    __varDisplay__.hide('${id}');\n` + c.compileNext(b);
        },
    },
};