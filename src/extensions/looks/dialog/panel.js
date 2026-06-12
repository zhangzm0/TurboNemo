// ==================== extensions/looks/dialog/panel.js ====================
export function createPanel(container, options = {}) {
    const { showBottomDecor = false } = options;

    const mask = document.createElement("div");
    mask.style.cssText = `
        position:absolute; top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0);
        opacity:0;
        pointer-events:none;
        transition: opacity 0.2s ease, background 0.2s ease;
    `;
    container.appendChild(mask);

    const panel = document.createElement("div");
    panel.style.cssText = `
        position:absolute;
        bottom:55px; left:50%;
        transform:translate(-50%, 10px);
        width:calc(100% - 48px); max-width:600px;
        padding:48px;
        border-radius:48px;
        background:linear-gradient(#ffdb3f, #fdb835);
        border:#ffffff solid 2px;
        pointer-events:none;
        overflow:visible;
        opacity:0;
        transition: opacity 0.2s ease, transform 0.2s ease;
    `;
    container.appendChild(panel);

    const innerBg = document.createElement("div");
    innerBg.style.cssText = `
        position:absolute; z-index:-1;
        left:18px; top:18px; right:18px; bottom:18px;
        border-radius:36px;
        background:#ffffff;
        border:2px solid #e99411;
        box-shadow:inset 0 0 4px 0 rgba(232,142,8,0.49);
    `;
    panel.appendChild(innerBg);

    let bottomDecor = null;
    if (showBottomDecor) {
        bottomDecor = document.createElement("div");
        bottomDecor.style.cssText = `
            position:absolute; z-index:-2;
            right:50px; bottom:-28px;
            width:90px; height:90px;
            border-radius:45px;
            border-bottom:solid 2px #ffffff;
            background:linear-gradient(#ffdb3f, #fdb835, #fdb835);
        `;
        panel.appendChild(bottomDecor);
    }

    function show() {
        mask.style.opacity = '1';
        mask.style.background = 'rgba(0,0,0,0.54)';
        mask.style.pointerEvents = 'auto';
        panel.style.opacity = '1';
        panel.style.transform = 'translate(-50%, 0)';
        panel.style.pointerEvents = 'auto';
    }

    function hide() {
        document.activeElement?.blur();
        mask.style.opacity = '0';
        mask.style.background = 'rgba(0,0,0,0)';
        mask.style.pointerEvents = 'none';
        panel.style.opacity = '0';
        panel.style.transform = 'translate(-50%, 10px)';
        panel.style.pointerEvents = 'none';
    }

    return { mask, panel, innerBg, bottomDecor, show, hide };
}

export function createDialogContainer(core) {
    const container = document.createElement("div");
    container.style.cssText = `
        position:absolute;
        top:0%; left:0%;
        transform:translate(-50%, -50%);
        width:${core.width}px; height:${core.height}px;
        pointer-events:none; z-index:100;
    `;
    core.stage.htmlContainer.appendChild(container);
    return container;
}