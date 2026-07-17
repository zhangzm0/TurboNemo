// ==================== data/lists/blocks.js ====================
import { def } from '../../../blocks/def.js';

export const listBlocks = {
    'lists_get': def({
        output: 'Array',
        args0: [{ type: 'field_dropdown', name: 'VAR' }],
        js({fields}) {
            const id = fields.VAR || '';
            return `self._vars['${id.replace(/'/g, "\\'")}']?.value`;
        },
    }),
    'list_get': def({
        output: 'Array',
        args0: [{ type: 'field_dropdown', name: 'VAR' }],
        js({fields}) {
            const id = fields.VAR || '';
            return `self._vars['${id.replace(/'/g, "\\'")}']?.value`;
        },
    }),
    'lists_append': def({
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values, next}) {
            return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { __arr.push(${values.VALUE}); } }\n` + next;
        },
    }),
    'lists_insert_value': def({
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'INDEX' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values, next}) {
            return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { __arr.splice((${values.INDEX}) - 1, 0, ${values.VALUE}); } }\n` + next;
        },
    }),
    'lists_delete': def({
        args0: [
            { type: 'field_dropdown', name: 'TYPE' },
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'INDEX' },
        ],
        js({fields, values, next}) {
            if (fields.TYPE === 'all') {
                return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { __arr.length = 0; } }\n` + next;
            }
            if (fields.TYPE === 'last') {
                return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { __arr.pop(); } }\n` + next;
            }
            return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { __arr.splice((${values.INDEX}) - 1, 1); } }\n` + next;
        },
    }),
    'lists_replace': def({
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'INDEX' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values, next}) {
            return `    { const __arr = ${values.VAR}; if (Array.isArray(__arr)) { const __i = (${values.INDEX}) - 1; __arr[__i] = ${values.VALUE}; } }\n` + next;
        },
    }),
    'lists_copy': def({
        args0: [
            { type: 'input_value', name: 'TARGET' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values, next}) {
            return `    { const __src = ${values.VALUE}; const __tgt = ${values.TARGET}; if (Array.isArray(__src) && Array.isArray(__tgt)) { __tgt.length = 0; __tgt.push(...__src); } }\n` + next;
        },
    }),
    'lists_get_value': def({
        output: 'Number',
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'INDEX' },
        ],
        js({values}) {
            return `((${values.VAR} || [])[(${values.INDEX}) - 1] ?? 0)`;
        },
    }),
    'lists_length': def({
        output: 'Number',
        args0: [
            { type: 'input_value', name: 'VAR' },
        ],
        js({values}) {
            return `((${values.VAR} || []).length)`;
        },
    }),
    'lists_index_of': def({
        output: 'Number',
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values}) {
            return `(((${values.VAR} || []).indexOf(${values.VALUE})) + 1)`;
        },
    }),
    'lists_is_exist': def({
        output: 'Boolean',
        args0: [
            { type: 'input_value', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({values}) {
            return `((${values.VAR} || []).includes(${values.VALUE}))`;
        },
    }),
    'show_hide_list': def({
        args0: [
            { type: 'field_dropdown', name: 'FUNC' },
            { type: 'field_dropdown', name: 'VAR' },
        ],
        js({fields, next}) {
            const id = fields.VAR || '';
            if (fields.FUNC === 'show') return `    __listDisplay__.show('${id.replace(/'/g, "\\'")}');\n` + next;
            return `    __listDisplay__.hide('${id.replace(/'/g, "\\'")}');\n` + next;
        },
    }),
};
