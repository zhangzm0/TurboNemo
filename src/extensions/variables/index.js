// src/extensions/variables/index.js

// ---------- 样式常量 ----------
const VAR_STYLE = {
    BG_COLOR: '#FF9834',
    BG_SHADOW: '#F28926',
    NAME_COLOR: '#624026',
    NAME_SIZE: '21px',
    VALUE_COLOR: '#45372E',
    VALUE_SIZE: '24px',
    VALUE_BG: '#FFFFFF',
    VALUE_BORDER: '#F28926',
    HEIGHT: 54,
    RADIUS: 27,
    VALUE_MIN_WIDTH: 69,
    VALUE_RADIUS: 23,
    PADDING: 18,
    GAP: 12,
};

function createVarElement(spec) {
    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute;
        display: flex;
        align-items: center;
        height: 40px;
        border-radius: 20px;
        background: ${VAR_STYLE.BG_COLOR};
        box-shadow: 2px 2px 3px rgba(0,0,0,0.2), inset 0 -1.5px 0 ${VAR_STYLE.BG_SHADOW};
        padding: 0 14px;
        font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
        pointer-events: none;
        white-space: nowrap;
    `;

    const nameEl = document.createElement('span');
    nameEl.style.cssText = `
        font-size: 16px;
        color: ${VAR_STYLE.NAME_COLOR};
        font-weight: 500;
        margin-right: 8px;
        line-height: 40px;
    `;
    nameEl.textContent = spec.name;

    const valueEl = document.createElement('span');
    valueEl.style.cssText = `
        font-size: 18px;
        color: ${VAR_STYLE.VALUE_COLOR};
        font-weight: 500;
        background: ${VAR_STYLE.VALUE_BG};
        border: 1.5px solid ${VAR_STYLE.VALUE_BORDER};
        border-radius: 16px;
        padding: 2px 10px;
        min-width: 52px;
        text-align: center;
        line-height: 26px;
    `;
    valueEl.textContent = spec.value ?? 0;

    container.appendChild(nameEl);
    container.appendChild(valueEl);

    return { container, nameEl, valueEl };
}

// ---------- 其余工具函数 ----------
function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

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

        // 给已存在角色和背景补 _vars
        for (const actor of core.actorManager.list) {
            if (!actor._vars) actor._vars = { ...template };
        }
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

        for (const [id, spec] of Object.entries(self._specs)) {
            const { container, nameEl, valueEl } = createVarElement(spec);
            const pos = nemoToScreen(spec.position?.x ?? 0, spec.position?.y ?? 0);
            container.style.left = pos.left + 'px';
            container.style.top = pos.top + 'px';
            container.style.display = spec.visible ? '' : 'none';
            containerEl.appendChild(container);
            displays[id] = { el: container, nameEl, valueEl, spec, _last: undefined };
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
                        disp.valueEl.textContent = val ?? 0;
                    }
                }
            },
        };

        core.globalHook('__varDisplay__', () => varDisplay);

        // 每帧更新
        core.app.ticker.add(() => varDisplay.update());

        // 窗口大小变化时重新定位
        window.addEventListener('resize', () => {
            for (const [id, disp] of Object.entries(displays)) {
                const pos = nemoToScreen(disp.spec.position?.x ?? 0, disp.spec.position?.y ?? 0);
                disp.el.style.left = pos.left + 'px';
                disp.el.style.top = pos.top + 'px';
            }
        });
    },
};