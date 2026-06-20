// ==================== sensing/blocks.js ====================
export const sensingBlocks = {
    'mouse_down': {
        generator(c, b) {
            const type = c.extractParams(b).mouse_event_type || 'down';
            if (type === 'down') return `__global__.__mouse__?.down ?? false`;
            if (type === 'up') return `!(__global__.__mouse__?.down ?? true)`;
            if (type === 'click') return `__global__.__mouse__?.click ?? false`;
            return 'false';
        },
    },
    'mobile__get': {
        generator(c, b) {
            const sf = b.querySelector(':scope > field[name="sprite"]');
            const target = sf ? sf.textContent.trim() : '__self';
            const attr = c.extractParams(b).attribute;
            const lookup = target === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${target}'] || '${target}')`;
            if (attr == '0') return `(__actors__.getByName(${lookup})?.sprite?.x ?? 0)`;
            if (attr == '1') return `(-(__actors__.getByName(${lookup})?.sprite?.y ?? 0))`;
            if (attr == '2') return `(__actors__.getByName(${lookup})?.currentCostume ?? 0)`;
            if (attr == '3') return `(-(__actors__.getByName(${lookup})?.sprite?.rotation ?? 0))`;
            if (attr == '4') return `((__actors__.getByName(${lookup})?.sprite?.scale?.x ?? 1) * 100)`;
            return '0';
        },
    },
    'self_distance_to': {
        generator(c, b) {
            const sf = b.querySelector(':scope > field[name="sprite"]');
            const target = sf ? sf.textContent.trim() : '__mouse';
            if (target === '__mouse')
                return `Math.hypot((__global__.__mouse__?.x ?? 0) - self.sprite.x, (__global__.__mouse__?.y ?? 0) + self.sprite.y)`;
            const lookup = target === '__self'
                ? 'self.name'
                : `(__actors__._idToName?.['${target}'] || '${target}')`;
            return `__actors__.getByName(${lookup})?.sprite ? Math.hypot(__actors__.getByName(${lookup}).sprite.x - self.sprite.x, __actors__.getByName(${lookup}).sprite.y - self.sprite.y) : 0`;
        },
    },
    'get_mouse_info': {
        generator(c, b) {
            const p = c.extractParams(b).position;
            return p === 'x' ? `(__global__.__mouse__?.x ?? 0)` : `(__global__.__mouse__?.y ?? 0)`;
        },
    },
    'get_stage_info': {
        generator(c, b) {
            const i = c.extractParams(b).info;
            return i === 'width' ? `__screens__.width` : `__screens__.height`;
        },
    },
    'self_set_role_camp': {
        generator(c, b) {
            const camp = c.extractParams(b).role_camp || 'camp_red';
            return `    self.camp = '${camp}';\n` + c.compileNext(b);
        },
    },
    'bump': {
        generator(c, b) {
            const f1 = b.querySelector(':scope > field[name="sprite1"]');
            const f2 = b.querySelector(':scope > field[name="sprite2"]');
            const aName = f1?.textContent.trim() || '__self';
            const bName = f2?.textContent.trim() || '__edge';
            const isCampA = aName.startsWith('camp_');
            const isCampB = bName.startsWith('camp_');
            // camp lookup: iterate actors in camp group
            const campCheckA = isCampA ? `__actors__.list.filter(a => a.camp === '${aName}')` : null;
            const campCheckB = isCampB ? `__actors__.list.filter(a => a.camp === '${bName}')` : null;
            const actorLookupA = isCampA ? null : (aName === '__self' ? 'self' : `__actors__.getByName(${JSON.stringify(aName)})`);
            const actorLookupB = isCampB ? null : (bName === '__self' ? 'self' : (bName === '__edge' || bName === '__mouse' ? null : `__actors__.getByName(${JSON.stringify(bName)})`));

            if (bName === '__edge') {
                const getA = isCampA
                    ? `(function(){ var __actors = ${campCheckA}; for(var __i=0;__i<__actors.length;__i++){ var __a=__actors[__i]; if(!__a?.sprite) continue; var __hw=__screens__.width/2,__hh=__screens__.height/2; if(Math.abs(__a.sprite.x)>__hw||Math.abs(__a.sprite.y)>__hh) return true; } return false; })()`
                    : `(function(){ var __a = ${actorLookupA === 'self' ? 'self' : `__actors__.getByName(${actorLookupA === 'self' ? 'self.name' : `'${aName}'`})`}; if(!__a?.sprite) return false; var __hw = __screens__.width/2, __hh = __screens__.height/2; return Math.abs(__a.sprite.x) > __hw || Math.abs(__a.sprite.y) > __hh; })()`;
                return getA;
            }
            if (bName === '__mouse') {
                if (isCampA) {
                    return `(function(){ var __list = ${campCheckA}; var __m = __global__.__mouse__; var __mx = __screens__.width/2 + __m.x; var __my = __screens__.height/2 - __m.y; for(var __i=0;__i<__list.length;__i++){ var __a=__list[__i]; if(!__a?.sprite) continue; var __b = __a.sprite.getBounds(); if(__mx>=__b.x&&__mx<=__b.x+__b.width&&__my>=__b.y&&__my<=__b.y+__b.height) return true; } return false; })()`;
                }
                const lookup = aName === '__self' ? 'self.name' : `'${aName}'`;
                return `(function(){
    var __a = __actors__.getByName(${lookup});
    if(!__a?.sprite) return false;
    var __m = __global__.__mouse__;
    var __b = __a.sprite.getBounds();
    var __mx = __screens__.width/2 + __m.x;
    var __my = __screens__.height/2 - __m.y;
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
            const la = aName === '__self' ? 'self.name' : `'${aName}'`;
            const lb = bName === '__self' ? 'self.name' : `'${bName}'`;
            return `(function(){ var __a=__actors__.getByName(${la}),__b=__actors__.getByName(${lb}); if(!__a?.sprite||!__b?.sprite) return false; return __actors__.hitTest(__a.sprite,__b.sprite); })()`;
        },
    },
    'bump_into_color': { generator(c, b) { return 'false'; } },
    'self_out_of_boundary': {
        generator(c, b) {
            return `(function(){ var __hw = __screens__.width/2, __hh = __screens__.height/2; return Math.abs(self.sprite.x) > __hw || Math.abs(self.sprite.y) > __hh; })()`;
        },
    },
    'check_sence': {
        generator(c, b) {
            const idx = c.compileValue(b, 'index');
            return `__screens__.getCurrent()?.name !== __screens__.list[${idx}-1]?.name`;
        },
    },
    'get_time': {
        generator(c, b) {
            const op = c.extractParams(b).op, now = 'new Date()';
            if (op === 'year') return `${now}.getFullYear()`;
            if (op === 'month') return `${now}.getMonth() + 1`;
            if (op === 'date') return `${now}.getDate()`;
            if (op === 'week') return `${now}.getDay()`;
            if (op === 'hour') return `${now}.getHours()`;
            if (op === 'minute') return `${now}.getMinutes()`;
            if (op === 'second') return `${now}.getSeconds()`;
            return '0';
        },
    },
    'mobile__get_voice_volume': { generator(c, b) { return '0'; } },
    'mobile__enable_voice_detection': { generator(c, b) { return c.compileNext(b) || ''; } },
};