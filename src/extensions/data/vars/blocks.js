import { def } from '../../../blocks/def.js';

export const varBlocks = {
    'variables_get': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
        ],
        output: 'Number',
        js({ fields }) {
            const id = fields.VAR.replace(/'/g, "\\'");
            return `(self._vars['${id}']?.value ?? 0)`;
        },
    }),
    'variables_set': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next }) {
            const id = fields.VAR.replace(/'/g, "\\'");
            return `    if (!self._vars['${id}']) self._vars['${id}'] = { value: 0 };\n    self._vars['${id}'].value = ${values.VALUE};\n` + next;
        },
    }),
    'change_variable': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'field_dropdown', name: 'valname' },
            { type: 'field_dropdown', name: 'method' },
            { type: 'input_value', name: 'n' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next }) {
            const id = (fields.VAR || fields.valname || '').replace(/'/g, "\\'");
            const method = fields.method || 'increase';
            let val = values.n || values.VALUE || '0';
            if (method === 'decrease') val = `-(${val})`;
            return `    if (!self._vars['${id}']) self._vars['${id}'] = { value: 0 };\n    self._vars['${id}'].value += ${val};\n` + next;
        },
    }),
    'show_hide_variable': def({
        args0: [
            { type: 'field_dropdown', name: 'FUNC' },
            { type: 'field_dropdown', name: 'VAR' },
        ],
        js({ fields, next }) {
            const func = fields.FUNC;
            const id = fields.VAR.replace(/'/g, "\\'");
            if (func === 'show') return `    __varDisplay__.show('${id}');\n` + next;
            return `    __varDisplay__.hide('${id}');\n` + next;
        },
    }),
    'cloud_variables_get': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
        ],
        output: 'Number',
        js({ fields }) {
            const id = fields.VAR.replace(/'/g, "\\'");
            return `(self._vars['${id}']?.value ?? 0)`;
        },
    }),
    'cloud_variables_set': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next }) {
            const id = fields.VAR.replace(/'/g, "\\'");
            return `    if (!self._vars['${id}']) self._vars['${id}'] = { value: 0 };\n    self._vars['${id}'].value = ${values.VALUE};\n` + next;
        },
    }),
};
