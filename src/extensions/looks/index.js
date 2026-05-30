// src/extensions/looks/index.js
export default {
    name: 'looks',
    version: '1.0.0',
    blocks: {
        'self_appear': { generator(c, b) { return `    self.sprite.visible = true;\n` + c.compileNext(b); } },
        'self_disappear': { generator(c, b) { return `    self.sprite.visible = false;\n` + c.compileNext(b); } },
        'set_scale': { generator(c, b) { const v = c.compileValue(b, 'scale'); return `    self.sprite.scale.set(${v} / 100);\n` + c.compileNext(b); } },
        'self_change_scale': { generator(c, b) { const v = c.compileValue(b, 'scale'); return `    self.sprite.scale.x += ${v} / 100; self.sprite.scale.y += ${v} / 100;\n` + c.compileNext(b); } },
        'styles_index_get': { generator(c, b) { const f = b.querySelector('field[name="index"]'); return f ? f.textContent.trim() : '1'; } },
        'set_costume_by_index': { generator(c, b) { const idx = c.compileValue(b, 'index'); return `    self.setCostume(${idx});\n` + c.compileNext(b); } },
        'self_next_or_previous_style': {
            generator(c, b) {
                const dir = c.extractParams(b).style_change_direction === 'next' ? 1 : -1;
                return `    self.nextCostume(${dir});\n` + c.compileNext(b);
            },
        },
        'self_flip': {
            generator(c, b) {
                const opt = c.extractParams(b).options;
                const axis = opt === 'HORIZONTAL' ? 'y' : 'x';
                return `    self.sprite.scale.${axis} *= -1;\n` + c.compileNext(b);
            },
        },
        'set_width_height_scale': {
            generator(c, b) {
                const type = c.extractParams(b).type;
                const val = c.compileValue(b, 'value');
                if (type === 'width') return `    self.sprite.scale.x = ${val} / 100;\n` + c.compileNext(b);
                return `    self.sprite.scale.y = ${val} / 100;\n` + c.compileNext(b);
            },
        },
        'add_width_height_scale': {
            generator(c, b) {
                const type = c.extractParams(b).type;
                const val = c.compileValue(b, 'value');
                if (type === 'width') return `    self.sprite.scale.x += ${val} / 100;\n` + c.compileNext(b);
                return `    self.sprite.scale.y += ${val} / 100;\n` + c.compileNext(b);
            },
        },
        'mobile_change_actor_layer': {
            generator(c, b) {
                const opt = c.extractParams(b).options;
                if (opt === 'front') return `    if (self.sprite.parent) self.sprite.parent.setChildIndex(self.sprite, self.sprite.parent.children.length - 1);\n` + c.compileNext(b);
                if (opt === 'back') return `    if (self.sprite.parent) self.sprite.parent.setChildIndex(self.sprite, 0);\n` + c.compileNext(b);
                if (opt === 'forward') return `    if (self.sprite.parent) { var __idx = self.sprite.parent.getChildIndex(self.sprite); self.sprite.parent.setChildIndex(self.sprite, Math.min(__idx + 1, self.sprite.parent.children.length - 1)); }\n` + c.compileNext(b);
                return `    if (self.sprite.parent) { var __idx = self.sprite.parent.getChildIndex(self.sprite); self.sprite.parent.setChildIndex(self.sprite, Math.max(__idx - 1, 0)); }\n` + c.compileNext(b);
            },
        },
        // 在 blocks 对象里加
        'self_set_effect_2': {
            generator(c, b) {
                return c.compileNext(b) || '';
            },
        },
        'self_ask': {
            generator(c, b) {
                const text = c.compileValue(b, 'text');
                return `    self._answer = prompt(String(${text}));\n` + c.compileNext(b);
            },
        },
        'get_answer': {
            generator(c, b) {
                return `(self._answer ?? '')`;
            },
        },
    },
    install(core) {},
};