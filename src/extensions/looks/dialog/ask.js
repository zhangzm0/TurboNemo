// ==================== extensions/looks/dialog/ask.js ====================
import { createPanel, createDialogContainer } from './panel.js';

const CONFIRM_BG = new URL('res/ask_dialog_confirm.png', import.meta.url).href;
const CONFIRM_ACTIVE_BG = new URL('res/ask_dialog_confirm2.png', import.meta.url).href;

function truncate(str, max) {
    if (!str) return "";
    if (str.length <= max) return str;
    return str.substring(0, max - 1) + "…" + str.substring(str.length - 1);
}

function getAvatarUrl(actor) {
    if (!actor) return "";
    const keys = Object.keys(actor.costumes || {});
    if (keys.length === 0) return "";
    const currentId = keys[actor.currentCostume - 1] || keys[0];
    const texture = actor.costumes[currentId]?.texture;
    if (!texture?.baseTexture?.resource?.url) return "";
    return texture.baseTexture.resource.url;
}

export const askBlocks = {
    'self_ask': {
        generator(c, b) {
            const text = c.compileValue(b, "text");
            return `    __global__.__askDialog__.show(self, ${text});\n    self._answer = (yield { _yieldType: "pause", event: "ask:answered" });\n` + c.compileNext(b);
        },
    },
    'get_answer': {
        generator(c, b) { return `(self._answer ?? '')`; },
    },
};

export function installAsk(core) {
    const container = createDialogContainer(core);
    const { mask, panel, show, hide } = createPanel(container, { showBottomDecor: true });

    const questionArea = document.createElement("div");
    questionArea.style.cssText = "display:flex;";
    panel.appendChild(questionArea);

    const avatar = document.createElement("img");
    avatar.style.cssText = "width:66px; height:66px; object-fit:contain;";
    questionArea.appendChild(avatar);

    const speech = document.createElement("div");
    speech.style.cssText = `
        flex:1; display:block;
        font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
        font-size:24px; margin-left:12px; font-weight:bolder;
    `;
    questionArea.appendChild(speech);

    const actorNameEl = document.createElement("div");
    actorNameEl.style.cssText = "white-space:nowrap; color:#a19c97; font-size:21px;";
    speech.appendChild(actorNameEl);

    const questionText = document.createElement("div");
    questionText.style.cssText = `
        display:block; color:#45372d; font-size:27px; line-height:36px;
        display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2;
        letter-spacing:1.5px; overflow:hidden; word-break:break-all;
    `;
    speech.appendChild(questionText);

    const input = document.createElement("input");
    input.style.cssText = `
        margin-top:20px; margin-bottom:10px;
        border-radius:36px; border:#fdc635 2px solid;
        height:72px; outline:none; font-size:24px;
        padding:0 24px; color:#4a4a4a;
        width:100%; box-sizing:border-box;
    `;
    input.placeholder = "输入..";
    panel.appendChild(input);

    const confirmBtn = document.createElement("div");
    confirmBtn.style.cssText = `
        position:absolute; right:62px; bottom:-16px;
        width:66px; height:66px;
        background:url(${CONFIRM_BG}) no-repeat;
        background-size:contain;
        cursor:pointer;
    `;
    panel.appendChild(confirmBtn);

    function confirm() {
        if (input.style.display === 'none') return;
        const value = input.value.trim();
        if (!value) return;
        input.value = "";
        hide();
        core.eventBus.emit("ask:answered", value);
    }

    confirmBtn.addEventListener("mousedown", () => { confirmBtn.style.backgroundImage = `url(${CONFIRM_ACTIVE_BG})`; });
    confirmBtn.addEventListener("mouseup", () => { confirmBtn.style.backgroundImage = `url(${CONFIRM_BG})`; });
    confirmBtn.addEventListener("click", confirm);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") confirm(); });
    mask.addEventListener("click", confirm);

    function showAsk(actor, question) {
        const avatarUrl = getAvatarUrl(actor);
        actorNameEl.textContent = truncate(actor.name, 10);
        questionText.textContent = question || "";
        avatar.src = avatarUrl || "";
        input.value = "";
        input.style.display = "";
        confirmBtn.style.display = "";
        panel.querySelectorAll('.ask-choice-container').forEach(el => el.remove());
        show();
        setTimeout(() => input.focus(), 200);
    }

    core.globalHook("__askDialog__", () => ({ show: showAsk }));
}