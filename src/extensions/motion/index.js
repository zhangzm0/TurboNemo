// src/extensions/motion/index.js
export default {
    name: 'motion',
    version: '1.0.0',
    blocks: {
        'self_move_to': {
            generator(c, b) {
                const x = c.compileValue(b, 'x'), y = c.compileValue(b, 'y');
                return `    self.sprite.x = ${x}; self.sprite.y = -${y};\n` + c.compileNext(b);
            },
        },
        'self_go_forward': {
            generator(c, b) {
                const s = c.compileValue(b, 'steps');
                return `    { const __r = self.sprite.rotation; self.sprite.x += Math.cos(-__r) * ${s}; self.sprite.y -= Math.sin(-__r) * ${s}; }\n` + c.compileNext(b);
            },
        },
        'self_rotate': {
            generator(c, b) {
                const d = c.compileValue(b, 'degrees');
                return `    self.sprite.rotation -= ${d} * Math.PI / 180;\n` + c.compileNext(b);
            },
        },
        'self_set_position_x': { generator(c, b) { return `    self.sprite.x = ${c.compileValue(b, 'value')};\n` + c.compileNext(b); } },
        'self_set_position_y': { generator(c, b) { return `    self.sprite.y = -${c.compileValue(b, 'value')};\n` + c.compileNext(b); } },
        'self_change_position_x': { generator(c, b) { return `    self.sprite.x += ${c.compileValue(b, 'value')};\n` + c.compileNext(b); } },
        'self_change_position_y': { generator(c, b) { return `    self.sprite.y -= ${c.compileValue(b, 'value')};\n` + c.compileNext(b); } },
        'self_point_towards': {
            generator(c, b) {
                const d = c.compileValue(b, 'degrees');
                return `    self.sprite.rotation = -(${d}) * Math.PI / 180;\n` + c.compileNext(b);
            },
        },
        'self_bounce_off_edge': {
            generator(c, b) {
                return `\
    { const __hw = __screens__.width / 2, __hh = __screens__.height / 2;
    if (Math.abs(self.sprite.x) > __hw || Math.abs(self.sprite.y) > __hh) {
        self.sprite.rotation = -(Math.PI - self.sprite.rotation);
        self.sprite.x = Math.max(-__hw, Math.min(__hw, self.sprite.x));
        self.sprite.y = Math.max(-__hh, Math.min(__hh, self.sprite.y));
    } }
` + c.compileNext(b);
            },
        },
        'self_face_to': {
            generator(c, b) {
                const target = c.extractParams(b).sprite || '__mouse';
                if (target === '__mouse') {
                    return `\
    { const __m = __global__.__mouse__; const __dx = __m.x - self.sprite.x; const __dy = __m.y + self.sprite.y;
    self.sprite.rotation = -Math.atan2(-__dy, __dx); }
` + c.compileNext(b);
                }
                return `\
    { const __t = __actors__.getByName('${target}');
    if (__t) { const __dx = __t.sprite.x - self.sprite.x; const __dy = __t.sprite.y - self.sprite.y; self.sprite.rotation = -Math.atan2(__dy, __dx); } }
` + c.compileNext(b);
            },
        },
        'self_move_specify': {
            generator(c, b) {
                const target = c.extractParams(b).target;
                if (target === '__pointer') {
                    return `    { const __m = __global__.__mouse__; self.sprite.x = __m.x; self.sprite.y = - __m.y; }\n` + c.compileNext(b);
                }
                if (target === '__random') {
                    return `    { self.sprite.x = (Math.random() - 0.5) * __screens__.width; self.sprite.y = (Math.random() - 0.5) * __screens__.height; }\n` + c.compileNext(b);
                }
                return `    { const __t = __actors__.getByName('${target}'); if (__t) { self.sprite.x = __t.sprite.x; self.sprite.y = __t.sprite.y; } }\n` + c.compileNext(b);
            },
        },
    },
    install(core) {},
};