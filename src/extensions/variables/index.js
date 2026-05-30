// src/extensions/variables/index.js
export default {
    name: 'variables',
    version: '1.0.0',
    initData: { varDict: 'variable.variable_dict' },
    init(core, data) {
        this._specs = {};
        for (const [id, def] of Object.entries(data.varDict || {})) {
            this._specs[id] = def;
        }
    },
    blocks: {
        'variables_get': {
            generator(c, b) {
                const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
                return `(self._vars['${id}']?.value ?? 0)`;
            },
        },
        'variables_set': {
            generator(c, b) {
                const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
                const val = c.compileValue(b, 'VALUE');
                return `    self._vars['${id}'].value = ${val};\n` + c.compileNext(b);
            },
        },
        'change_variable': {
            generator(c, b) {
                const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim()
                        || b.querySelector(':scope > field[name="valname"]')?.textContent.trim()
                        || '';
                const method = b.querySelector(':scope > field[name="method"]')?.textContent.trim() || 'increase';
                let val = c.compileValue(b, 'n') || c.compileValue(b, 'VALUE') || '0';
                if (method === 'decrease') {
                    val = `-(${val})`;
                }
                return `    self._vars['${id}'].value += ${val};\n` + c.compileNext(b);
            },
        },
        'show_hide_variable': {
            generator(c, b) {
                const func = c.extractParams(b).FUNC;
                const id = b.querySelector(':scope > field[name="VAR"]')?.textContent.trim() || '';
                if (func === 'show') {
                    return `    __global__.__varDisplay__.show('${id}');\n` + c.compileNext(b);
                }
                return `    __global__.__varDisplay__.hide('${id}');\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        const self = this;

        // ---------- 变量模板 ----------
        const template = {};
        for (const [id, spec] of Object.entries(self._specs)) {
            template[id] = { value: spec.value ?? 0 };
        }

        // ---------- actorHook ----------
        core.actorHook('_vars', (actor) => {
            if (actor.isClone && actor._protoName) {
                const proto = core.actorManager.getByName(actor._protoName);
                const protoId = Object.values(core._bcm?.actors?.actors_dict || {})
                    .find(a => a.name === actor._protoName)?.id;
                const vars = { ...proto._vars };
                for (const [id, spec] of Object.entries(self._specs)) {
                    if (spec.current_entity === protoId && spec.is_global === false) {
                        vars[id] = { value: proto?._vars?.[id]?.value ?? spec.value ?? 0 };
                    }
                }
                return vars;
            }
            return { ...template };
        });

        // ---------- 给已存在角色补 _vars ----------
        for (const actor of core.actorManager.list) {
            if (!actor._vars) actor._vars = { ...template };
        }

        // ---------- 给背景补 _vars ----------
        for (const screen of core.screenManager.list) {
            if (screen.bg && !screen.bg._vars) {
                screen.bg._vars = { ...template };
            }
        }

        // ---------- 变量显示 ----------
        const displays = {};
        const wrapper = core.app.view.parentElement;
        const containerEl = document.createElement('div');
        containerEl.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
        wrapper.appendChild(containerEl);

        function nemoToScreen(nx, ny) {
            const rect = core.app.view.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const scaleX = rect.width / core.width;
            const scaleY = rect.height / core.height;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            return {
                left: (rect.left - wrapperRect.left) + cx + nx * scaleX,
                top: (rect.top - wrapperRect.top) + cy - ny * scaleY,
            };
        }

        function createDisplay(id, spec) {
            const el = document.createElement('div');
            el.style.cssText = 'position:absolute;font-size:14px;color:#fff;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:4px;white-space:nowrap;';
            el.textContent = `${spec.name}: ${spec.value ?? 0}`;
            const pos = nemoToScreen(spec.position?.x ?? 0, spec.position?.y ?? 0);
            el.style.left = pos.left + 'px';
            el.style.top = pos.top + 'px';
            el.style.display = spec.visible ? '' : 'none';
            containerEl.appendChild(el);
            displays[id] = { el, spec };
        }

        for (const [id, spec] of Object.entries(self._specs)) {
            createDisplay(id, spec);
        }

        const varDisplay = {
            show(id) {
                if (displays[id]) {
                    displays[id].el.style.display = '';
                    displays[id].spec.visible = true;
                }
            },
            hide(id) {
                if (displays[id]) {
                    displays[id].el.style.display = 'none';
                    displays[id].spec.visible = false;
                }
            },
            update() {
                for (const [id, disp] of Object.entries(displays)) {
                    if (!disp.spec.visible) continue;
                    const val = disp.spec.is_global !== false
                        ? template[id]?.value
                        : disp.spec.value;
                    if (disp._last !== val) {
                        disp._last = val;
                        disp.el.textContent = disp._name + val;
                    }
                }
            },
        };

        core.globalHook('__varDisplay__', () => varDisplay);

        // ---------- 每帧更新 ----------
        core.app.ticker.add(() => varDisplay.update());

        // ---------- 窗口大小变化时重新定位 ----------
        window.addEventListener('resize', () => {
            for (const [id, disp] of Object.entries(displays)) {
                const pos = nemoToScreen(disp.spec.position?.x ?? 0, disp.spec.position?.y ?? 0);
                disp.el.style.left = pos.left + 'px';
                disp.el.style.top = pos.top + 'px';
            }
        });
    },
};