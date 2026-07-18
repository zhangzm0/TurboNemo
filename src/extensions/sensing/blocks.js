// ==================== sensing/blocks.js ====================
import { def } from '../../blocks/def.js';

export const sensingBlocks = {
    // ── 手机摇晃 ──
    'on_phone_shake': def({
        isHat: true,
        js({next}) {
            if (!next) return `    // on_phone_shake (empty)\n`;
            return `\
    while (true) {
        yield { _yieldType: "pause", event: "phone:shake" };
${next}    }\n`;
        },
    }),

    // ── 手机倾斜方向事件 ──
    'on_phone_tilt': def({
        isHat: true,
        args0: [{ type: 'field_dropdown', name: 'type' }],
        js({fields, next}) {
            const dir = fields.type || 'up';
            if (!next) return `    // on_phone_tilt ${dir} (empty)\n`;
            return `\
    while (true) {
        yield { _yieldType: "pause", event: "phone:tilt:${dir}" };
${next}    }\n`;
        },
    }),

    // ── 手机倾斜分量 ──
    'get_orientation': def({
        output: 'Number',
        args0: [{ type: 'field_dropdown', name: 'axis' }],
        js({fields}) {
            return fields.axis === 'X'
                ? '(__global__.__tilt__?.gamma ?? 0)'
                : '(__global__.__tilt__?.beta ?? 0)';
        },
    }),

    // ── 手机听到声响 ──
    'on_receive_sound': def({
        isHat: true,
        js({next}) {
            if (!next) return `    // on_receive_sound (empty)\n`;
            return `\
    while (true) {
        yield { _yieldType: "pause", event: "phone:sound" };
${next}    }\n`;
        },
    }),

    'mouse_down': def({
        args0: [
            { type: 'field_dropdown', name: 'mouse_event_type' },
        ],
        output: 'Boolean',
        js(ctx) {
            const type = ctx.fields.mouse_event_type || 'down';
            if (type === 'down') return `__global__.__mouse__?.down ?? false`;
            if (type === 'up') return `!(__global__.__mouse__?.down ?? true)`;
            if (type === 'click') return `__global__.__mouse__?.click ?? false`;
            return 'false';
        },
    }),
    'mobile__get': def({
        output: 'Number',
        args0: [
            { type: 'field_dropdown', name: 'sprite' },
            { type: 'field_dropdown', name: 'attribute' },
        ],
        js({fields}) {
            const target = fields.sprite || '__self';
            const attr = fields.attribute;
            const lookup = target === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${target}'] || '${target}')`;
            const actorExpr = `__actors__.getByName(${lookup})`;
            const bgExpr = `__screens__.getByName(${lookup})?.bg`;
            // Round to 2 decimal places, matching official get_fixed_number(num, 2)
            const R = (v) => `Math.round((${v}) * 100) / 100`;
            if (attr == '0') return R(`${actorExpr}?.sprite?.x ?? ${bgExpr}?.sprite?.tilePosition?.x ?? 0`);
            if (attr == '1') return R(`-(${actorExpr}?.sprite?.y ?? ${bgExpr}?.sprite?.tilePosition?.y ?? 0)`);
            if (attr == '2') return R(`${actorExpr}?.currentCostume ?? ${bgExpr}?.currentCostume ?? 0`);
            if (attr == '3') return R(`-(${actorExpr}?.sprite?.rotation ?? ${bgExpr}?.sprite?.rotation ?? 0) * 180 / Math.PI`);
            if (attr == '4') return R(`(${actorExpr}?.sprite?.scale?.x ?? ${bgExpr}?.sprite?.scale?.x ?? 1) * 100`);
            if (attr == '5') return R(`(${actorExpr}?.sprite?.scale?.x ?? ${bgExpr}?.sprite?.scale?.x ?? 1) * 100`);
            return '0';
        },
    }),
    'self_distance_to': def({
        output: 'Number',
        args0: [{ type: 'field_dropdown', name: 'sprite' }],
        js({fields}) {
            const target = fields.sprite || '__mouse';
            if (target === '__mouse')
                return `Math.hypot((__global__.__mouse__?.x ?? 0) - self.sprite.x, (__global__.__mouse__?.y ?? 0) + self.sprite.y)`;
            const lookup = target === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${target}'] || '${target}')`;
            return `__actors__.getByName(${lookup})?.sprite ? Math.hypot(__actors__.getByName(${lookup}).sprite.x - self.sprite.x, __actors__.getByName(${lookup}).sprite.y - self.sprite.y) : 0`;
        },
    }),
    'get_mouse_info': def({
        args0: [
            { type: 'field_dropdown', name: 'position' },
        ],
        output: 'Number',
        js(ctx) {
            const p = ctx.fields.position;
            return p === 'x' ? `(__global__.__mouse__?.x ?? 0)` : `(__global__.__mouse__?.y ?? 0)`;
        },
    }),
    'get_stage_info': def({
        args0: [
            { type: 'field_dropdown', name: 'info' },
        ],
        output: 'Number',
        js(ctx) {
            const i = ctx.fields.info;
            return i === 'width' ? `__screens__.width` : `__screens__.height`;
        },
    }),
    'self_set_role_camp': def({
        args0: [
            { type: 'field_dropdown', name: 'role_camp' },
        ],
        js(ctx) {
            const camp = ctx.fields.role_camp || 'camp_red';
            return `    self.camp = '${camp}';\n` + ctx.next;
        },
    }),
    'bump': def({
        output: 'Boolean',
        args0: [
            { type: 'field_dropdown', name: 'sprite1' },
            { type: 'field_dropdown', name: 'sprite2' },
        ],
        js({fields}) {
            const rawA = fields.sprite1 || '__self';
            const rawB = fields.sprite2 || '__edge';
            const isCampA = rawA.startsWith('camp_');
            const isCampB = rawB.startsWith('camp_');
            // Resolve UUID to name at runtime via _idToName (like mobile__get does)
            const nameExpr = (raw) => {
                if (raw === '__self') return 'self.name';
                return `(__actors__._idToName?.['${raw}'] || '${raw}')`;
            };
            const getActor = (raw) => {
                if (raw === '__self') return 'self';
                return `__actors__.getByName(${nameExpr(raw)})`;
            };
            const campCheckA = isCampA ? `__actors__.list.filter(a => a.camp === '${rawA}')` : null;
            const campCheckB = isCampB ? `__actors__.list.filter(a => a.camp === '${rawB}')` : null;
            const actorLookupA = isCampA ? null : getActor(rawA);
            const actorLookupB = isCampB ? null : (rawB === '__edge' || rawB === '__mouse' ? null : getActor(rawB));

            if (rawB === '__edge') {
                return isCampA
                    ? `(function(){ var __actors = ${campCheckA}; for(var __i=0;__i<__actors.length;__i++){ var __a=__actors[__i]; if(!__a?.sprite) continue; var __b=__a.sprite.getBounds(); if(__b.x<=0||__b.x+__b.width>=__screens__.width||__b.y<=0||__b.y+__b.height>=__screens__.height) return true; } return false; })()`
                    : `(function(){ var __a = ${actorLookupA}; if(!__a?.sprite) return false; var __b = __a.sprite.getBounds(); return __b.x <= 0 || __b.x + __b.width >= __screens__.width || __b.y <= 0 || __b.y + __b.height >= __screens__.height; })()`;
            }
            if (rawB === '__mouse') {
                if (isCampA) {
                    return `(function(){ var __list=${campCheckA};var __m=__global__.__mouse__;if(!__m.down)return false;var __mx=__screens__.width/2+__m.x;var __my=__screens__.height/2-__m.y;for(var __i=0;__i<__list.length;__i++){var __a=__list[__i];if(!__a?.sprite)continue;var __local=__a.sprite.toLocal({x:__mx,y:__my});if(__a.sprite.hitArea&&__a.sprite.hitArea.contains(__local.x,__local.y))return true;if(!__a.sprite.hitArea){var __b=__a.sprite.getBounds();if(__mx>=__b.x&&__mx<=__b.x+__b.width&&__my>=__b.y&&__my<=__b.y+__b.height)return true;}}return false;})()`;
                }
                return `(function(){
    var __a = ${getActor(rawA)};
    if(!__a?.sprite) return false;
    var __m = __global__.__mouse__;
    if(!__m.down) return false;
    var __mx = __screens__.width/2 + __m.x;
    var __my = __screens__.height/2 - __m.y;
    var __local = __a.sprite.toLocal({x: __mx, y: __my});
    if(__a.sprite.hitArea) return __a.sprite.hitArea.contains(__local.x, __local.y);
    var __b = __a.sprite.getBounds();
    return __mx >= __b.x && __mx <= __b.x+__b.width && __my >= __b.y && __my <= __b.y+__b.height;
})()`;
            }
            // actor-to-actor bump
            if (isCampA && isCampB) {
                return `(function(){ var __alist=${campCheckA},__blist=${campCheckB}; for(var __i=0;__i<__alist.length;__i++){ var __a=__alist[__i]; if(!__a?.sprite) continue; for(var __j=0;__j<__blist.length;__j++){ var __b=__blist[__j]; if(!__b?.sprite||__a===__b) continue; if(__actors__.hitTest(__a.sprite,__b.sprite)) return true; } } return false; })()`;
            }
            if (isCampA) {
                return `(function(){ var __alist=${campCheckA},__b=${actorLookupB}; if(!__b?.sprite) return false; for(var __i=0;__i<__alist.length;__i++){ var __a=__alist[__i]; if(!__a?.sprite||__a===__b) continue; if(__actors__.hitTest(__a.sprite,__b.sprite)) return true; } return false; })()`;
            }
            if (isCampB) {
                return `(function(){ var __blist=${campCheckB},__a=${actorLookupA}; if(!__a?.sprite) return false; for(var __i=0;__i<__blist.length;__i++){ var __b=__blist[__i]; if(!__b?.sprite||__a===__b) continue; if(__actors__.hitTest(__a.sprite,__b.sprite)) return true; } return false; })()`;
            }
            return `(function(){ var __a=__actors__.getByName(${nameExpr(rawA)}),__b=__actors__.getByName(${nameExpr(rawB)}); if(!__a?.sprite||!__b?.sprite) return false; return __actors__.hitTest(__a.sprite,__b.sprite); })()`;
        },
    }),
    'bump_into_color': def({
        output: 'Boolean',
        args0: [
            { type: 'field_dropdown', name: 'sprite' },
            { type: 'field_colour', name: 'color' },
        ],
        js({fields}) {
            const target = fields.sprite || '__self';
            const hex = (fields.color || '#ffffff').replace(/^#/, '');
            const nameExpr = target === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${target}'] || '${target}')`;
            return `__actors__.checkBumpedColor(${nameExpr}, '${hex}')`;
        },
    }),
    'self_out_of_boundary': def({
        output: 'Boolean',
        js(ctx) {
            return `(function(){ var __b = self.sprite.getBounds(); return __b.x <= 0 || __b.x + __b.width >= __screens__.width || __b.y <= 0 || __b.y + __b.height >= __screens__.height; })()`;
        },
    }),
    'check_sence': def({
        args0: [
            { type: 'field_dropdown', name: 'options' },
            { type: 'input_value', name: 'index' },
        ],
        output: 'Boolean',
        js(ctx) {
            const eqCheck = `__screens__.getCurrent()?.name === __screens__.list[${ctx.values.index}-1]?.name`;
            return ctx.fields.options === 'true' ? eqCheck : `!(${eqCheck})`;
        },
    }),
    'get_time': def({
        args0: [
            { type: 'field_dropdown', name: 'op' },
        ],
        output: 'Number',
        js(ctx) {
            const op = ctx.fields.op, now = 'new Date()';
            if (op === 'year') return `${now}.getFullYear()`;
            if (op === 'month') return `${now}.getMonth() + 1`;
            if (op === 'date') return `${now}.getDate()`;
            if (op === 'week') return `${now}.getDay()`;
            if (op === 'hour') return `${now}.getHours()`;
            if (op === 'minute') return `${now}.getMinutes()`;
            if (op === 'second') return `${now}.getSeconds()`;
            return '0';
        },
    }),
    'mobile__get_voice_volume': def({
        output: 'Number',
        js: '(__global__.__voice__?.volume ?? 0)',
    }),
    'mobile__enable_voice_detection': def({
        args0: [{ type: 'field_dropdown', name: 'state' }],
        js({fields, next}) {
            const on = fields.state === 'open';
            return `    __core__._setVoice(${on});\n` + (next || '');
        },
    }),
    'user_id_get': def({
        output: 'String',
        js: '"guest"',
    }),
};
