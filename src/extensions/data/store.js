// ==================== data/store.js ====================
let _specs = {};
let _template = {};

function createStore(data) {
    _specs = {};
    _template = {};
    for (const [id, def] of Object.entries(data.varDict || {})) {
        _specs[id] = def;
        if (def.type === 'list') {
            _template[id] = { value: Array.isArray(def.value) ? [...def.value] : [] };
        } else {
            _template[id] = { value: def.value ?? 0 };
        }
    }
}

function installStore(core) {
    core.actorHook('_vars', (actor) => {
        if (actor.isClone && actor._protoName) {
            const proto = core.actorManager.getByName(actor._protoName);
            const protoId = Object.values(core._bcm?.actors?.actors_dict || {})
                .find(a => a.name === actor._protoName)?.id;
            const vars = { ...proto._vars };
            for (const [id, spec] of Object.entries(_specs)) {
                if (spec.current_entity === protoId && spec.is_global === false) {
                    if (spec.type === 'list') {
                        vars[id] = { value: [...(proto?._vars?.[id]?.value || [])] };
                    } else {
                        vars[id] = { value: proto?._vars?.[id]?.value ?? spec.value ?? 0 };
                    }
                }
            }
            return vars;
        }
        return { ..._template };
    });

    for (const actor of core.actorManager.list) {
        if (!actor._vars) actor._vars = { ..._template };
    }
    for (const screen of core.screenManager.list) {
        if (screen.bg && !screen.bg._vars) screen.bg._vars = { ..._template };
    }
}

function isList(id) { return _specs[id]?.type === 'list'; }
function isVar(id) { return !isList(id) && _specs[id]?.type !== 'timer'; }

export { createStore, installStore, _specs, _template, isList, isVar };