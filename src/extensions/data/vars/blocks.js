import { def } from '../../../blocks/def.js';

// ponytail: 校验变量 ID,作品里删变量后残留的"幽灵引用"会留下 "?" 等非 ID 文本,
// 原样拼进 self._vars['...'] 生成非法 JS。ID 合法格式: UUID 或 Nemo 短 ID(字母数字 ≥6位)。
const _VAR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[A-Za-z0-9]{6,}$/;
function varId(raw, entityName) {
    const id = (raw || '').replace(/'/g, "\\'");
    if (!_VAR_ID_RE.test(id)) {
        console.warn(`[TurboNemo] 非法变量 ID ${JSON.stringify(raw)},角色 ${entityName},已 fallback 到 __ghost_var__`);
        return '__ghost_var__';
    }
    return id;
}

export const varBlocks = {
    'variables_get': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
        ],
        output: 'Number',
        js({ fields, entityName }) {
            const id = varId(fields.VAR, entityName);
            return `(self._vars['${id}']?.value ?? 0)`;
        },
    }),
    'variables_set': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next, entityName }) {
            const id = varId(fields.VAR, entityName);
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
        js({ fields, values, next, entityName }) {
            const id = varId(fields.VAR || fields.valname || '', entityName);
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
        js({ fields, next, entityName }) {
            const func = fields.FUNC;
            const id = varId(fields.VAR, entityName);
            if (func === 'show') return `    __varDisplay__.show('${id}');\n` + next;
            return `    __varDisplay__.hide('${id}');\n` + next;
        },
    }),
    'cloud_variables_get': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
        ],
        output: 'Number',
        js({ fields, entityName }) {
            const id = varId(fields.VAR, entityName);
            return `(self._vars['${id}']?.value ?? 0)`;
        },
    }),
    'cloud_variables_set': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next, entityName }) {
            const id = varId(fields.VAR, entityName);
            return `    if(!self._vars['${id}']) self._vars['${id}'] = { value: 0 };\n    self._vars['${id}'].value = ${values.VALUE};\n` + next;
        },
    }),
    'change_cloud_variable': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'field_dropdown', name: 'method' },
            { type: 'input_value', name: 'VALUE' },
        ],
        js({ fields, values, next, entityName }) {
            const id = varId(fields.VAR, entityName);
            const method = fields.method || 'increase';
            let val = values.VALUE || '0';
            if (method === 'decrease') val = `-(${val})`;
            return `    if (!self._vars['${id}']) self._vars['${id}'] = { value: 0 };\n    self._vars['${id}'].value += ${val};\n` + next;
        },
    }),
    'show_hide_cloud_variable': def({
        args0: [
            { type: 'field_dropdown', name: 'method' },
            { type: 'field_dropdown', name: 'VAR' },
        ],
        js({ fields, next, entityName }) {
            const func = fields.method;
            const id = varId(fields.VAR, entityName);
            if (func === 'show') return `    __varDisplay__.show('${id}');\n` + next;
            return `    __varDisplay__.hide('${id}');\n` + next;
        },
    }),
    'show_ranking': def({
        args0: [
            { type: 'field_dropdown', name: 'VAR' },
            { type: 'field_dropdown', name: 'direction' },
        ],
        js({ fields, next, entityName }) {
            const id = varId(fields.VAR, entityName);
            const dir = fields.direction || 'positive';
            return `    __ranking__.show('${id}', '${dir}');\n` + next;
        },
    }),
    'hide_ranking': def({
        js({ next }) {
            return `    __ranking__.hide();\n` + (next || '');
        },
    }),
    'is_ranking_show_hide': def({
        args0: [
            { type: 'field_dropdown', name: 'visible' },
        ],
        output: 'Boolean',
        js({ fields }) {
            const visible = fields.visible === 'show';
            if (visible) return '__ranking__.visible';
            return '!__ranking__.visible';
        },
    }),
    'username_get': def({
        output: 'String',
        js: `'玩家'`,
    }),
    'connected_users_get': def({
        output: 'Number',
        js: '1',
    }),
};
