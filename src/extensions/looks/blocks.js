// ==================== extensions/looks/blocks.js ====================
import { def } from '../../blocks/def.js';

export const looksBlocks = {
    'self_appear': def({ js: 'self.sprite.visible = true' }),
    'self_disappear': def({ js: 'self.sprite.visible = false' }),
    'set_scale': def({
        args0: [{ type: 'input_value', name: 'scale' }],
        js: 'self.sprite.scale.set({scale} / 100)',
    }),
    'self_change_scale': def({
        args0: [{ type: 'input_value', name: 'scale' }],
        js: 'self.sprite.scale.x += {scale} / 100; self.sprite.scale.y += {scale} / 100',
    }),
    'styles_index_get': def({
        output: 'Number',
        args0: [{ type: 'field_input', name: 'index' }],
        js({ fields, entityName }) {
            // ponytail: 幽灵字段可能含 "?" 等非数字,Number("?")=NaN 会崩。合法正整数直接用,否则 fallback 0 并告警。
            if (!/^\d+$/.test((fields.index || '').trim())) {
                console.warn(`[TurboNemo] 非法造型索引 ${JSON.stringify(fields.index)},角色 ${entityName || '?'},已 fallback 到 0`);
                return '0';
            }
            return fields.index.trim();
        },
    }),
    'set_costume_by_index': def({
        args0: [{ type: 'input_value', name: 'index' }],
        js: 'self.setCostume({index})',
    }),
    'self_next_or_previous_style': def({
        args0: [{ type: 'field_dropdown', name: 'style_change_direction' }],
        js({fields, next}) {
            const dir = fields.style_change_direction === 'next' ? 1 : -1;
            return `    self.nextCostume(${dir});\n` + next;
        },
    }),
    'self_flip': def({
        args0: [{ type: 'field_dropdown', name: 'options' }],
        js({fields, next}) {
            const axis = fields.options === '0' ? 'y' : 'x';
            return `    self.sprite.scale.${axis} *= -1;\n` + next;
        },
    }),
    'set_width_height_scale': def({
        args0: [
            { type: 'field_dropdown', name: 'type' },
            { type: 'input_value', name: 'value' },
        ],
        js({fields, values, next}) {
            if (fields.type === 'width') return `    self.sprite.scale.x = ${values.value} / 100;\n` + next;
            return `    self.sprite.scale.y = ${values.value} / 100;\n` + next;
        },
    }),
    'add_width_height_scale': def({
        args0: [
            { type: 'field_dropdown', name: 'type' },
            { type: 'input_value', name: 'value' },
        ],
        js({fields, values, next}) {
            if (fields.type === 'width') return `    self.sprite.scale.x += ${values.value} / 100;\n` + next;
            return `    self.sprite.scale.y += ${values.value} / 100;\n` + next;
        },
    }),
    'mobile_change_actor_layer': def({
        args0: [{ type: 'field_dropdown', name: 'options' }],
        js({fields, next}) {
            const opt = fields.options;
            if (opt === 'front') return `    if (self.sprite.parent) self.sprite.parent.setChildIndex(self.sprite, self.sprite.parent.children.length - 1);\n` + next;
            if (opt === 'back') return `    if (self.sprite.parent) self.sprite.parent.setChildIndex(self.sprite, 0);\n` + next;
            if (opt === 'forward') return `    if (self.sprite.parent) { var __idx = self.sprite.parent.getChildIndex(self.sprite); self.sprite.parent.setChildIndex(self.sprite, Math.min(__idx + 1, self.sprite.parent.children.length - 1)); }\n` + next;
            return `    if (self.sprite.parent) { var __idx = self.sprite.parent.getChildIndex(self.sprite); self.sprite.parent.setChildIndex(self.sprite, Math.max(__idx - 1, 0)); }\n` + next;
        },
    }),
    'self_set_effect_2': def({
        args0: [
            { type: 'field_dropdown', name: 'scope' },
            { type: 'input_value', name: 'val' },
        ],
        js: "self._effects.set('{$scope}', {val})",
    }),
    'self_change_effect_2': def({
        args0: [
            { type: 'field_dropdown', name: 'scope' },
            { type: 'input_value', name: 'steps' },
        ],
        js: "self._effects.change('{$scope}', {steps})",
    }),
    'self_clear_effects': def({ js: 'self._effects.clearAll()' }),
    'self_translate_animation': def({
        js({next}) { return next || ''; },
    }),
    'self_gradually_appear': def({
        js({next}) {
            return `    self.sprite.visible = true;\n    yield* self.__fadeTo(1, 0.3);\n` + next;
        },
    }),
    'self_gradually_disappear': def({
        js({next}) {
            return `    yield* self.__fadeTo(0, 0.3);\n    self.sprite.visible = false;\n` + next;
        },
    }),
};
