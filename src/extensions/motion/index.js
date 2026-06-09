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
                return `    { const __r = self.sprite.rotation; self.__moveTo(self.sprite.x + Math.cos(-__r) * ${s}, self.sprite.y - Math.sin(-__r) * ${s}); }\n` + c.compileNext(b);
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
        'self_face_to': {
            generator(c, b) {
                const target = c.extractParams(b).sprite || '__mouse';
                if (target === '__mouse') {
                    return `\
    { const __m = __global__.__mouse__; const __dx = __m.x - self.sprite.x; const __dy = __m.y + self.sprite.y;
    self.sprite.rotation = -Math.atan2(-__dy, __dx); }
` + c.compileNext(b);
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                return `\
    { const __t = __actors__.getByName(${lookup});
    if (__t) { const __dx = __t.sprite.x - self.sprite.x; const __dy = __t.sprite.y - self.sprite.y; self.sprite.rotation = -Math.atan2(__dy, __dx); } }
` + c.compileNext(b);
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
        core.actorHook('__moveTo', (actor) => (x, y) => {
            actor.sprite.x = x;
            actor.sprite.y = y;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.actorHook('__setX', (actor) => (x) => {
            actor.sprite.x = x;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.actorHook('__setY', (actor) => (y) => {
            actor.sprite.y = y;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.actorHook('__addX', (actor) => (dx) => {
            actor.sprite.x += dx;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });
        core.actorHook('__addY', (actor) => (dy) => {
            actor.sprite.y += dy;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });

        // 给已存在角色补上
        for (const actor of core.actorManager.list) {
            if (!actor.__moveTo) {
                actor.__moveTo = (x, y) => { actor.sprite.x = x; actor.sprite.y = y; core.eventBus.emit(`actor:moved:${actor.name}`, actor); };
                actor.__setX = (x) => { actor.sprite.x = x; core.eventBus.emit(`actor:moved:${actor.name}`, actor); };
                actor.__setY = (y) => { actor.sprite.y = y; core.eventBus.emit(`actor:moved:${actor.name}`, actor); };
                actor.__addX = (dx) => { actor.sprite.x += dx; core.eventBus.emit(`actor:moved:${actor.name}`, actor); };
                actor.__addY = (dy) => { actor.sprite.y += dy; core.eventBus.emit(`actor:moved:${actor.name}`, actor); };
            }
        }
    },
};