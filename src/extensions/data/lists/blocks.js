// ==================== data/lists/blocks.js ====================

/**
 * 辅助函数：编译列表操作对象
 * 优先从 block 获取（compileValue），否则从 field 获取列表 ID
 * @returns {string} 生成的 JS 表达式，表示要操作的数组
 */
function compileListTarget(c, b) {
    const varEl = b.querySelector(':scope > value[name="VAR"]');
    if (!varEl) return { expr: '[]', id: '' };

    // 检查是否有非 shadow 的 block（用户拖入的积木，如 text_split、procedures_2_parameter 等）
    const userBlock = varEl.querySelector(':scope > block');
    if (userBlock) {
        // 用 compileValue 编译，返回数组表达式
        const expr = c.compileValue(b, 'VAR');
        return { expr, id: '' };
    }

    // shadow 模式：从 field 读取列表 ID
    const field = varEl.querySelector(':scope > shadow > field[name="VAR"]');
    const id = field ? field.textContent.trim() : '';
    return { expr: `self._vars['${id}']?.value`, id };
}

/**
 * 编译完成后 emit 更新事件的代码片段
 */
function emitUpdateCode(id) {
    return id ? `__core__.eventBus.emit('list:updated', '${id}');` : '';
}

export const listBlocks = {
    'lists_get': {
        generator(c, b) {
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            return `self._vars['${id}']?.value`;
        },
    },
    'list_get': {
        generator(c, b) {
            const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
            return `self._vars['${id}']?.value`;
        },
    },
    'lists_append': {
        generator(c, b) {
            const { expr, id } = compileListTarget(c, b);
            const val = c.compileValue(b, 'VALUE');
            return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { __arr.push(${val}); ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
        },
    },
    'lists_insert_value': {
        generator(c, b) {
            const { expr, id } = compileListTarget(c, b);
            const idx = c.compileValue(b, 'INDEX');
            const val = c.compileValue(b, 'VALUE');
            return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { __arr.splice((${idx}) - 1, 0, ${val}); ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
        },
    },
    'lists_delete': {
        generator(c, b) {
            const type = c.extractParams(b).TYPE;
            const { expr, id } = compileListTarget(c, b);
            if (type === 'all') {
                return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { __arr.length = 0; ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
            }
            if (type === 'last') {
                return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { __arr.pop(); ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
            }
            // 默认：按索引删除
            const idx = c.compileValue(b, 'INDEX');
            return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { __arr.splice((${idx}) - 1, 1); ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
        },
    },
    'lists_replace': {
        generator(c, b) {
            const { expr, id } = compileListTarget(c, b);
            const idx = c.compileValue(b, 'INDEX');
            const val = c.compileValue(b, 'VALUE');
            return `    { const __arr = ${expr}; if (Array.isArray(__arr)) { const __i = (${idx}) - 1; __arr[__i] = ${val}; ${emitUpdateCode(id)} } }\n` + c.compileNext(b);
        },
    },
    'lists_copy': {
        generator(c, b) {
            // TARGET 参数名是 "TARGET"，不是 "VAR"
            // 优先检查用户拖入的 block，再回退到 shadow（与 compileListTarget 一致）
            const targetVarEl = b.querySelector(':scope > value[name="TARGET"]');
            let targetId = '';
            let targetExpr = '[]';
            if (targetVarEl) {
                const targetBlock = targetVarEl.querySelector(':scope > block');
                if (targetBlock) {
                    targetExpr = c.compileValue(b, 'TARGET');
                } else {
                    const targetField = targetVarEl.querySelector(':scope > shadow > field[name="VAR"]');
                    if (targetField) {
                        targetId = targetField.textContent.trim();
                        targetExpr = `self._vars['${targetId}']?.value`;
                    }
                }
            }

            // VALUE 参数：优先检查用户拖入的 block（如 procedures_2_callreturn）
            const valEl = b.querySelector(':scope > value[name="VALUE"]');
            let srcExpr = '[]';
            if (valEl) {
                const srcBlock = valEl.querySelector(':scope > block');
                if (srcBlock) {
                    srcExpr = c.compileValue(b, 'VALUE');
                } else {
                    const srcField = valEl.querySelector(':scope > shadow > field[name="VAR"]');
                    if (srcField) {
                        srcExpr = `self._vars['${srcField.textContent.trim()}']?.value`;
                    }
                }
            }

            return `    { const __src = ${srcExpr}; const __tgt = ${targetExpr}; if (Array.isArray(__src) && Array.isArray(__tgt)) { const __copy = [...__src]; __tgt.length = 0; __tgt.push(...__copy); ${emitUpdateCode(targetId)} } }\n` + c.compileNext(b);
        },
    },
    'lists_get_value': {
        generator(c, b) {
            const { expr } = compileListTarget(c, b);
            const idx = c.compileValue(b, 'INDEX');
            return `((${expr} || [])[(${idx}) - 1] ?? 0)`;
        },
    },
    'lists_length': {
        generator(c, b) {
            const { expr } = compileListTarget(c, b);
            return `((${expr} || []).length)`;
        },
    },
    'lists_index_of': {
        generator(c, b) {
            const { expr } = compileListTarget(c, b);
            const val = c.compileValue(b, 'VALUE');
            return `(((${expr} || []).indexOf(${val})) + 1)`;
        },
    },
    'lists_is_exist': {
        generator(c, b) {
            const { expr } = compileListTarget(c, b);
            const val = c.compileValue(b, 'VALUE');
            return `((${expr} || []).includes(${val}))`;
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