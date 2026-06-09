// ==================== data/lists/blocks.js ====================

function getListId(b) {
    const varEl = b.querySelector(':scope > value[name="VAR"]');
    if (!varEl) return '';
    const field = varEl.querySelector(':scope > shadow > field[name="VAR"]')
              || varEl.querySelector(':scope > field[name="VAR"]');
    return field ? field.textContent.trim() : '';
}

function getListIdByName(b, name) {
    const varEl = b.querySelector(`:scope > value[name="${name}"]`);
    if (!varEl) return '';
    const field = varEl.querySelector(':scope > shadow > field[name="VAR"]')
              || varEl.querySelector(':scope > field[name="VAR"]');
    return field ? field.textContent.trim() : '';
}

export const listBlocks = {
    'lists_get': {
        generator(c, b) {
            const id = getListId(b) || b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            return `self._vars['${id}']?.value`;
        },
    },
    'list_get': {
        generator(c, b) {
            const id = getListId(b) || b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            return `self._vars['${id}']?.value`;
        },
    },
    'lists_append': {
        generator(c, b) {
            const id = getListId(b);
            const val = c.compileValue(b, 'VALUE');
            return `    { const __v = self._vars['${id}']; if (__v) { if (!__v.value) __v.value = []; __v.value.push(${val}); __core__.eventBus.emit('list:append:${id}', ${val}); } }\n` + c.compileNext(b);
        },
    },
    'lists_insert_value': {
        generator(c, b) {
            const id = getListId(b);
            const idx = c.compileValue(b, 'INDEX');
            const val = c.compileValue(b, 'VALUE');
            return `    { const __v = self._vars['${id}']; if (__v?.value) { const __i = (${idx}) - 1; __v.value.splice(__i, 0, ${val}); __core__.eventBus.emit('list:insert:${id}', { index: __i, value: ${val} }); } }\n` + c.compileNext(b);
        },
    },
    'lists_delete': {
        generator(c, b) {
            const id = getListId(b);
            const idx = c.compileValue(b, 'INDEX');
            return `    { const __v = self._vars['${id}']; if (__v?.value) { const __i = (${idx}) - 1; __v.value.splice(__i, 1); __core__.eventBus.emit('list:delete:${id}', __i); } }\n` + c.compileNext(b);
        },
    },
    'lists_replace': {
        generator(c, b) {
            const id = getListId(b);
            const idx = c.compileValue(b, 'INDEX');
            const val = c.compileValue(b, 'VALUE');
            return `    { const __v = self._vars['${id}']; if (__v?.value) { const __i = (${idx}) - 1; __v.value[__i] = ${val}; __core__.eventBus.emit('list:replace:${id}', { index: __i, value: ${val} }); } }\n` + c.compileNext(b);
        },
    },
    'lists_copy': {
        generator(c, b) {
            const targetId = getListIdByName(b, 'TARGET');
            const srcId = getListIdByName(b, 'VALUE');
            return `    { const __src = self._vars['${srcId}']?.value; const __tgt = self._vars['${targetId}']?.value; if (__src && __tgt) { __tgt.length = 0; __tgt.push(...__src); __core__.eventBus.emit('list:copy:${targetId}', '${srcId}'); } }\n` + c.compileNext(b);
        },
    },
    'lists_get_value': {
        generator(c, b) {
            const id = getListId(b);
            const idx = c.compileValue(b, 'INDEX');
            return `((self._vars['${id}']?.value || [])[(${idx}) - 1] ?? 0)`;
        },
    },
    'lists_length': {
        generator(c, b) {
            const id = getListId(b);
            return `((self._vars['${id}']?.value || []).length)`;
        },
    },
    'lists_index_of': {
        generator(c, b) {
            const id = getListId(b);
            const val = c.compileValue(b, 'VALUE');
            return `(((self._vars['${id}']?.value || []).indexOf(${val})) + 1)`;
        },
    },
    'lists_is_exist': {
        generator(c, b) {
            const id = getListId(b);
            const val = c.compileValue(b, 'VALUE');
            return `((self._vars['${id}']?.value || []).includes(${val}))`;
        },
    },
    'show_hide_list': {
        generator(c, b) {
            const func = c.extractParams(b).FUNC;
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            if (func === 'show') return `    __listDisplay__.show('${id}');\n` + c.compileNext(b);
            return `    __listDisplay__.hide('${id}');\n` + c.compileNext(b);
        },
    },
};