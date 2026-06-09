// ==================== extensions/looks/dialog/panel.js ====================
export function createPanel(container, options = {}) {
    const { showBottomDecor = false } = options;

    const mask = document.createElement("div");
    mask.style.cssText = `
        display:none;
        position:absolute; top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0.54);
        pointer-events:auto;
    `;
    container.appendChild(mask);

    const panel = document.createElement("div");
    panel.style.cssText = `
        display:none;
        position:absolute;
        bottom:55px; left:50%;
        transform:translate(-50%, 0%);
        width:calc(100% - 48px); max-width:600px;
        padding:48px;
        border-radius:48px;
        background:linear-gradient(#ffdb3f, #fdb835);
        border:#ffffff solid 2px;
        pointer-events:auto;
        overflow:visible;
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

    function show() { mask.style.display = ""; panel.style.display = ""; }
    function hide() { mask.style.display = "none"; panel.style.display = "none"; }

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