// src/extensions/motion/index.js
export default {
    name: 'motion',
    version: '1.0.0',
    blocks: {
        'self_move_to': {
            generator(c, b) {
                const x = c.compileValue(b, 'x'), y = c.compileValue(b, 'y');
                return `    self.__moveTo(${x}, -(${y}));\n` + c.compileNext(b);
            },
        },
        'self_go_forward': {
            generator(c, b) {
                const s = c.compileValue(b, 'steps');
                return `    { const __r = self.sprite.rotation; const __dx = Math.cos(-__r) * ${s}, __dy = -Math.sin(-__r) * ${s}; if (self.sprite.tilePosition) { self.__addX(__dx); self.__addY(__dy); } else { self.__moveTo(self.sprite.x + __dx, self.sprite.y + __dy); } }\n` + c.compileNext(b);
            },
        },
        'self_rotate': {
            generator(c, b) {
                const d = c.compileValue(b, 'degrees');
                return `    self.sprite.rotation -= ${d} * Math.PI / 180;\n` + c.compileNext(b);
            },
        },
        'self_set_position_x': {
            generator(c, b) { return `    self.__setX(${c.compileValue(b, 'value')});\n` + c.compileNext(b); },
        },
        'self_set_position_y': {
            generator(c, b) { return `    self.__setY(-(${c.compileValue(b, 'value')}));\n` + c.compileNext(b); },
        },
        'self_change_position_x': {
            generator(c, b) { return `    self.__addX(${c.compileValue(b, 'value')});\n` + c.compileNext(b); },
        },
        'self_change_position_y': {
            generator(c, b) { return `    self.__addY(-(${c.compileValue(b, 'value')}));\n` + c.compileNext(b); },
        },
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
        self.__moveTo(Math.max(-__hw, Math.min(__hw, self.sprite.x)), Math.max(-__hh, Math.min(__hh, self.sprite.y)));
    } }
` + c.compileNext(b);
            },
        },
        'self_rotate_around': {
            generator(c, b) {
                const target = c.extractParams(b).sprite || '__self';
                const degrees = c.compileValue(b, 'degrees');
                if (target === '__self') {
                    return `    self.sprite.rotation -= ${degrees} * Math.PI / 180;\n` + c.compileNext(b);
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                const rad = `${degrees} * Math.PI / 180`;
                return `\
    { const __t = __actors__.getByName(${lookup});
    if (__t) {
        const __dx = self.sprite.x - __t.sprite.x;
        const __dy = self.sprite.y - __t.sprite.y;
        const __cos = Math.cos(${rad});
        const __sin = Math.sin(${rad});
        const __nx = __dx * __cos - __dy * __sin;
        const __ny = __dx * __sin + __dy * __cos;
        self.sprite.x = __t.sprite.x + __nx;
        self.sprite.y = __t.sprite.y + __ny;
        self.sprite.rotation -= ${rad};
        __core__.eventBus.emit('actor:moved:' + self.name, self);
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
    self.sprite.rotation = Math.atan2(-__dy, __dx); }
` + c.compileNext(b);
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                return `\
    { const __t = __actors__.getByName(${lookup});
    if (__t) { const __dx = __t.sprite.x - self.sprite.x; const __dy = __t.sprite.y - self.sprite.y; self.sprite.rotation = Math.atan2(__dy, __dx); } }
` + c.compileNext(b);
            },
        },
        'self_set_rotation_type': {
            generator(c, b) {
                const type = c.extractParams(b).rotation_type || '2';
                return `    self.rotationType = '${type}';\n` + c.compileNext(b);
            },
        },
        'self_glide_to': {
            generator(c, b) {
                const t = c.compileValue(b, 'time');
                const x = c.compileValue(b, 'x');
                const y = c.compileValue(b, 'y');
                return `    yield* self.__glideTo(${t}, ${x}, -(${y}));\n` + c.compileNext(b);
            },
        },
        'self_move_specify': {
            generator(c, b) {
                const target = c.extractParams(b).target;
                if (target === '__pointer') {
                    return `    { const __m = __global__.__mouse__; self.__moveTo(__m.x, -__m.y); }\n` + c.compileNext(b);
                }
                if (target === '__random') {
                    return `    { self.__moveTo((Math.random() - 0.5) * __screens__.width, (Math.random() - 0.5) * __screens__.height); }\n` + c.compileNext(b);
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                return `    { const __t = __actors__.getByName(${lookup}); if (__t) { self.__moveTo(__t.sprite.x, __t.sprite.y); } }\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        core.selfHook('__moveTo', (actor) => (x, y) => {
            actor.sprite.x = x;
            actor.sprite.y = y;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.selfHook('__setX', (actor) => (x) => {
            actor.sprite.x = x;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.selfHook('__setY', (actor) => (y) => {
            actor.sprite.y = y;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.selfHook('__addX', (actor) => (dx) => {
            actor.sprite.x += dx;
            if (actor.name === '视角') console.log('[视角 addX]', dx.toFixed(4), '→ x:', actor.sprite.x.toFixed(4));
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.selfHook('__addY', (actor) => (dy) => {
            actor.sprite.y += dy;
            if (actor.name === '视角') console.log('[视角 addY]', dy.toFixed(4), '→ y:', actor.sprite.y.toFixed(4));
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.selfHook('__glideTo', (actor) => function*(time, x, y) {
            const startX = actor.sprite.x;
            const startY = actor.sprite.y;
            if (time <= 0) {
                actor.sprite.x = x;
                actor.sprite.y = y;
                core.eventBus.emit(`actor:moved:${actor.name}`, actor);
                return;
            }
            const startTime = performance.now();
            let elapsed = 0;
            while (elapsed < time) {
                elapsed = (performance.now() - startTime) / 1000;
                const t = Math.min(elapsed / time, 1);
                actor.sprite.x = startX + (x - startX) * t;
                actor.sprite.y = startY + (y - startY) * t;
                yield;
            }
            actor.sprite.x = x;
            actor.sprite.y = y;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });

    },
};