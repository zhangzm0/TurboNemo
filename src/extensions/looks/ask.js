// ==================== extensions/looks/ask.js ====================
const BASE = new URL('.', import.meta.url).href;
const CONFIRM_BG = BASE + "res/ask_dialog_confirm.png";
const CONFIRM_ACTIVE_BG = BASE + "res/ask_dialog_confirm2.png";

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
    'ask_and_choose': {
        generator(c, b) {
            const question = c.compileValue(b, 'question');
            const choices = [];
            for (let i = 0; i < 4; i++) {
                const val = c.compileValue(b, `CHOICE${i}`);
                if (val !== '0' || b.querySelector(`value[name="CHOICE${i}"]`)) {
                    choices.push(val);
                }
            }
            const choicesArr = '[' + choices.join(', ') + ']';
            return `    __global__.__askDialog__.showChoices(self, ${question}, ${choicesArr});\n    self._choiceResult = (yield { _yieldType: "pause", event: "ask:choiceMade" });\n` + c.compileNext(b);
        },
    },
    'get_choice_or_index': {
        generator(c, b) {
            const type = c.extractParams(b).type || 'select_index';
            if (type === 'select_index') return `((self._choiceIndex ?? 0) + 1)`;
            return `(self._choiceResult ?? '')`;
        },
    },
};

const CHOICE_STYLE = {
    HEIGHT: 60,
    RADIUS: 36,
    MARGIN: 18,
    TOP_MARGIN: 20,
    BG_COLOR: '#FFDA3F',
    SHADOW_COLOR: '#FDC330',
    ACTIVE_BG: '#983EF7',
    ACTIVE_SHADOW: '#7E3CC7',
    TEXT_COLOR: '#45372D',
    ACTIVE_TEXT: '#FFFFFF',
};

export function installAsk(core) {
    const container = document.createElement("div");
    container.style.cssText = `
        position:absolute; top:0; left:0;
        width:${core.width}px; height:${core.height}px;
        pointer-events:none; z-index:100;transform:translate(-50%, -50%);
    `;
    core.stage.htmlContainer.appendChild(container);

    // 遮罩
    const mask = document.createElement("div");
    mask.style.cssText = `
        display:none;
        position:absolute; top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0.54);
        pointer-events:auto;
    `;
    container.appendChild(mask);

    // 面板
    const panel = document.createElement("div");
    panel.style.cssText = `
        display:none;
        position:absolute;
        top:55px; left:50%;
        transform:translateX(-50%);
        width:calc(100% - 48px); max-width:600px;
        padding:48px;
        border-radius:48px;
        background:linear-gradient(#ffdb3f, #fdb835);
        border:#ffffff solid 2px;
        pointer-events:auto;
        overflow:visible;
    `;
    container.appendChild(panel);

    // 内层白色区域
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

    // 底部装饰
    const bottomDecor = document.createElement("div");
    bottomDecor.style.cssText = `
        position:absolute; z-index:-2;
        right:50px; bottom:-28px;
        width:90px; height:90px;
        border-radius:45px;
        border-bottom:solid 2px #ffffff;
        background:linear-gradient(#ffdb3f, #fdb835, #fdb835);
    `;
    panel.appendChild(bottomDecor);

    // 问题区
    const questionArea = document.createElement("div");
    questionArea.style.cssText = "display:flex;";
    panel.appendChild(questionArea);

    // 角色头像
    const avatar = document.createElement("img");
    avatar.style.cssText = "width:66px; height:66px; object-fit:contain;";
    questionArea.appendChild(avatar);

    // 气泡
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

    // 输入框
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

    // 确认按钮
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
        mask.style.display = "none";
        panel.style.display = "none";
        core.eventBus.emit("ask:answered", value);
    }

    confirmBtn.addEventListener("mousedown", () => { confirmBtn.style.backgroundImage = `url(${CONFIRM_ACTIVE_BG})`; });
    confirmBtn.addEventListener("mouseup", () => { confirmBtn.style.backgroundImage = `url(${CONFIRM_BG})`; });
    confirmBtn.addEventListener("click", confirm);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") confirm(); });
    mask.addEventListener("click", confirm);

    function show(actor, question) {
        const avatarUrl = getAvatarUrl(actor);
        actorNameEl.textContent = truncate(actor.name, 10);
        questionText.textContent = question || "";
        avatar.src = avatarUrl || "";
        input.value = "";
        input.style.display = "";
        confirmBtn.style.display = "";
        const oldChoices = panel.querySelectorAll('.ask-choice-container');
        oldChoices.forEach(el => el.remove());
        mask.style.display = "";
        panel.style.display = "";
        setTimeout(() => input.focus(), 100);
    }

    function showChoices(actor, question, choices) {
        const avatarUrl = getAvatarUrl(actor);
        actorNameEl.textContent = truncate(actor.name, 10);
        questionText.textContent = question || "";
        avatar.src = avatarUrl || "";
        input.style.display = "none";
        confirmBtn.style.display = "none";
        const oldChoices = panel.querySelectorAll('.ask-choice-container');
        oldChoices.forEach(el => el.remove());

        const choiceContainer = document.createElement("div");
        choiceContainer.className = 'ask-choice-container';
        choiceContainer.style.cssText = `
            margin-top:${CHOICE_STYLE.TOP_MARGIN}px;
            display:flex; flex-direction:column; gap:${CHOICE_STYLE.MARGIN}px;
        `;
        panel.appendChild(choiceContainer);

        choices.forEach((choice, i) => {
            const btn = document.createElement("div");
            btn.textContent = String(choice);
            btn.style.cssText = `
                height:${CHOICE_STYLE.HEIGHT}px; line-height:${CHOICE_STYLE.HEIGHT}px;
                border-radius:${CHOICE_STYLE.RADIUS}px;
                background:${CHOICE_STYLE.BG_COLOR};
                box-shadow:0 5px 0 ${CHOICE_STYLE.SHADOW_COLOR};
                text-align:center; font-size:21px; font-weight:500;
                color:${CHOICE_STYLE.TEXT_COLOR};
                font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
                cursor:pointer; transition:transform 0.1s, box-shadow 0.1s;
            `;
            const select = () => {
                mask.style.display = "none";
                panel.style.display = "none";
                input.style.display = "";
                confirmBtn.style.display = "";
                choiceContainer.remove();
                core.eventBus.emit("ask:choiceMade", { index: i, content: String(choice) });
            };
            btn.addEventListener("mousedown", () => {
                btn.style.background = CHOICE_STYLE.ACTIVE_BG;
                btn.style.boxShadow = `0 -5px 0 ${CHOICE_STYLE.ACTIVE_SHADOW}`;
                btn.style.color = CHOICE_STYLE.ACTIVE_TEXT;
                btn.style.transform = "translateY(5px)";
            });
            btn.addEventListener("mouseup", select);
            btn.addEventListener("mouseleave", () => {
                btn.style.background = CHOICE_STYLE.BG_COLOR;
                btn.style.boxShadow = `0 5px 0 ${CHOICE_STYLE.SHADOW_COLOR}`;
                btn.style.color = CHOICE_STYLE.TEXT_COLOR;
                btn.style.transform = "translateY(0)";
            });
            btn.addEventListener("touchstart", (e) => {
                e.preventDefault();
                btn.style.background = CHOICE_STYLE.ACTIVE_BG;
                btn.style.boxShadow = `0 -5px 0 ${CHOICE_STYLE.ACTIVE_SHADOW}`;
                btn.style.color = CHOICE_STYLE.ACTIVE_TEXT;
                btn.style.transform = "translateY(5px)";
            });
            btn.addEventListener("touchend", (e) => { e.preventDefault(); select(); });
            choiceContainer.appendChild(btn);
        });

        mask.style.display = "";
        panel.style.display = "";
    }

    core.globalHook("__askDialog__", () => ({ show, showChoices }));
}