// ==================== data/vars/display.js ====================
import { _specs, _template, isVar } from '../store.js';

const VAR_STYLE = {
    BG_COLOR: '#FF9834',
    BG_SHADOW: '#F28926',
    NAME_COLOR: '#624026',
    VALUE_COLOR: '#45372E',
    HEIGHT: 54,
    RADIUS: 27,
    VALUE_MIN_WIDTH: 69,
    VALUE_RADIUS: 23,
};

function createVarElement(spec) {
    const container = document.createElement('div');
    container.style.cssText = `
        position:absolute;
        display:flex; align-items:center;
        height:${VAR_STYLE.HEIGHT}px; border-radius:${VAR_STYLE.RADIUS}px;
        background:${VAR_STYLE.BG_COLOR};
        box-shadow:2px 2px 4px rgba(0,0,0,0.2),inset 0 -2px 0 ${VAR_STYLE.BG_SHADOW};
        padding:0 18px; font-family:'PingFang SC','Microsoft YaHei',sans-serif;
        pointer-events:none; white-space:nowrap;
    `;
    container.style.left = (spec.position?.x ?? 0) + 'px';
    container.style.top = -(spec.position?.y ?? 0) + 'px';

    const nameEl = document.createElement('span');
    nameEl.style.cssText = `font-size:21px;color:${VAR_STYLE.NAME_COLOR};font-weight:500;margin-right:12px;line-height:${VAR_STYLE.HEIGHT}px;`;
    nameEl.textContent = spec.name;
    container.appendChild(nameEl);

    const valueEl = document.createElement('span');
    valueEl.style.cssText = `
        font-size:24px;color:${VAR_STYLE.VALUE_COLOR};font-weight:500;
        background:#fff;border:1.5px solid ${VAR_STYLE.BG_SHADOW};
        border-radius:${VAR_STYLE.VALUE_RADIUS}px; padding:4px 12px;
        min-width:${VAR_STYLE.VALUE_MIN_WIDTH}px;text-align:center;line-height:34px;
    `;
    valueEl.textContent = spec.value ?? 0;
    container.appendChild(valueEl);

    return { container, valueEl };
}

function installVarDisplay(core) {
    const displays = {};
    const layer = core.stage.globalHtmlLayer;

    for (const [id, spec] of Object.entries(_specs)) {
        if (!isVar(id)) continue;
        const { container, valueEl } = createVarElement(spec);
        container.style.display = spec.visible ? '' : 'none';
        layer.appendChild(container);
        displays[id] = { el: container, valueEl, spec, _last: undefined };
    }

    window.__varDisplay__ = {
        show(id) {
            if (displays[id]) { displays[id].el.style.display = ''; displays[id].spec.visible = true; }
        },
        hide(id) {
            if (displays[id]) { displays[id].el.style.display = 'none'; displays[id].spec.visible = false; }
        },
    };

    core.app.ticker.add(() => {
        for (const [id, disp] of Object.entries(displays)) {
            if (!disp.spec.visible) continue;
            const val = disp.spec.is_global !== false ? _template[id]?.value : disp.spec.value;
            if (disp._last !== val) {
                disp._last = val;
                disp.valueEl.textContent = val ?? 0;
            }
        }
    });
}

export { installVarDisplay };