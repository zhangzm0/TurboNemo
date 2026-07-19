import { def } from '../../blocks/def.js';

export default {
    name: 'motion',
    version: '1.0.0',
    blocks: {
        'self_go_forward': def({
            args0: [{ type: 'input_value', name: 'steps' }],
            js({values, next}) {
                const s = values.steps;
                return `    { const __r = self.sprite.rotation; const __dx = Math.cos(-__r) * ${s}, __dy = -Math.sin(-__r) * ${s}; if (self.sprite.tilePosition) { self.__addX(__dx); self.__addY(__dy); } else { self.__moveTo(self.sprite.x + __dx, self.sprite.y + __dy); } }\n` + next;
            },
        }),
        'self_move_to': def({
            args0: [
                { type: 'input_value', name: 'x' },
                { type: 'input_value', name: 'y' },
            ],
            js: 'self.__moveTo({x}, -({y}))',
        }),
        'self_rotate': def({
            args0: [{ type: 'input_value', name: 'degrees' }],
            js: 'self.sprite.rotation -= {degrees} * Math.PI / 180',
        }),
        'self_set_position_x': def({
            args0: [{ type: 'input_value', name: 'value' }],
            js: 'self.__setX({value})',
        }),
        'self_set_position_y': def({
            args0: [{ type: 'input_value', name: 'value' }],
            js: 'self.__setY(-({value}))',
        }),
        'self_change_position_x': def({
            args0: [{ type: 'input_value', name: 'value' }],
            js: 'self.__addX({value})',
        }),
        'self_change_position_y': def({
            args0: [{ type: 'input_value', name: 'value' }],
            js: 'self.__addY(-({value}))',
        }),
        'self_point_towards': def({
            args0: [{ type: 'input_value', name: 'degrees' }],
            js: 'self.sprite.rotation = -({degrees}) * Math.PI / 180',
        }),
        'self_bounce_off_edge': def({
            js: `{ const __hw = __screens__.width / 2, __hh = __screens__.height / 2;
    if (Math.abs(self.sprite.x) > __hw || Math.abs(self.sprite.y) > __hh) {
        self.sprite.rotation = -(Math.PI - self.sprite.rotation);
        self.__moveTo(Math.max(-__hw, Math.min(__hw, self.sprite.x)), Math.max(-__hh, Math.min(__hh, self.sprite.y)));
    } }`,
        }),
        'self_rotate_around': def({
            args0: [
                { type: 'field_dropdown', name: 'sprite' },
                { type: 'input_value', name: 'degrees' },
            ],
            js({fields, values, next}) {
                const target = fields.sprite || '__self';
                const degrees = values.degrees;
                if (target === '__self') {
                    return `    self.sprite.rotation -= ${degrees} * Math.PI / 180;\n` + next;
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
` + next;
            },
        }),
        'self_face_to': def({
            args0: [{ type: 'field_dropdown', name: 'sprite' }],
            js({fields, next}) {
                const target = fields.sprite || '__mouse';
                if (target === '__mouse') {
                    return `\
    { const __m = __global__.__mouse__; const __dx = __m.x - self.sprite.x; const __dy = __m.y + self.sprite.y;
    self.sprite.rotation = Math.atan2(-__dy, __dx); }
` + next;
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                return `\
    { const __t = __actors__.getByName(${lookup});
    if (__t) { const __dx = __t.sprite.x - self.sprite.x; const __dy = __t.sprite.y - self.sprite.y; self.sprite.rotation = Math.atan2(__dy, __dx); } }
` + next;
            },
        }),
        'self_set_rotation_type': def({
            args0: [{ type: 'field_dropdown', name: 'rotation_type' }],
            js: "self.rotationType = '{$rotation_type}'",
        }),
        'self_glide_to': def({
            args0: [
                { type: 'input_value', name: 'time' },
                { type: 'input_value', name: 'x' },
                { type: 'input_value', name: 'y' },
            ],
            js: 'yield* self.__glideTo({time}, {x}, -({y}))',
        }),
        'self_glide_position_x': def({
            args0: [
                { type: 'input_value', name: 'time' },
                { type: 'input_value', name: 'value' },
            ],
            js: 'yield* self.__glideBy({time}, {value}, 0)',
        }),
        'self_glide_position_y': def({
            args0: [
                { type: 'input_value', name: 'time' },
                { type: 'input_value', name: 'value' },
            ],
            js: 'yield* self.__glideBy({time}, 0, -({value}))',
        }),
        'self_move_specify': def({
            args0: [{ type: 'field_dropdown', name: 'target' }],
            js({fields, next}) {
                const target = fields.target;
                if (target === '__pointer') {
                    return `    { const __m = __global__.__mouse__; self.__moveTo(__m.x, -__m.y); }\n` + next;
                }
                if (target === '__random') {
                    return `    { self.__moveTo((Math.random() - 0.5) * __screens__.width, (Math.random() - 0.5) * __screens__.height); }\n` + next;
                }
                const lookup = `(__actors__._idToName?.['${target}'] || '${target}')`;
                return `    { const __t = __actors__.getByName(${lookup}); if (__t) { self.__moveTo(__t.sprite.x, __t.sprite.y); } }\n` + next;
            },
        }),
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
        core.selfHook('__glideBy', (actor) => function*(time, dx, dy) {
            const startX = actor.sprite.x;
            const startY = actor.sprite.y;
            const targetX = startX + dx;
            const targetY = startY + dy;
            if (time <= 0) {
                actor.sprite.x = targetX;
                actor.sprite.y = targetY;
                core.eventBus.emit(`actor:moved:${actor.name}`, actor);
                return;
            }
            const startTime = performance.now();
            let elapsed = 0;
            while (elapsed < time) {
                elapsed = (performance.now() - startTime) / 1000;
                const t = Math.min(elapsed / time, 1);
                actor.sprite.x = startX + dx * t;
                actor.sprite.y = startY + dy * t;
                yield;
            }
            actor.sprite.x = targetX;
            actor.sprite.y = targetY;
            core.eventBus.emit(`actor:moved:${actor.name}`, actor);
        });

    },
};