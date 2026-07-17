// ==================== extensions/looks/dialog/choose.js ====================
import { def } from '../../../blocks/def.js';
import { createPanel, createDialogContainer } from './panel.js';

const CHOICE_STYLE = {
    HEIGHT: 60, RADIUS: 36, MARGIN: 18, TOP_MARGIN: 20,
    BG_COLOR: '#FFDA3F', SHADOW_COLOR: '#FDC330',
    ACTIVE_BG: '#983EF7', ACTIVE_SHADOW: '#7E3CC7',
    TEXT_COLOR: '#45372D', ACTIVE_TEXT: '#FFFFFF',
};

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

export const chooseBlocks = {
    'ask_and_choose': def({
        args0: [{ type: 'input_value', name: 'question' }],
        js({values, next, blockEl}) {
            const question = values.question;
            const choices = [];
            for (let i = 0; ; i++) {
                const val = values[`CHOICE${i}`];
                if (val === undefined) break;
                // 仅当有用户拖入的 block（非 shadow）或值不为默认 0 时才加入选项
                if (blockEl.querySelector(`value[name="CHOICE${i}"] > block`) || val !== '(0)') {
                    choices.push(val);
                }
            }
            const choicesArr = '[' + choices.join(', ') + ']';
            return `    __global__.__chooseDialog__.showChoices(self, ${question}, ${choicesArr});\n    { const __res = (yield { _yieldType: "pause", event: "ask:choiceMade" }); self._choiceIndex = __res.index; self._choiceResult = __res.content; }\n` + next;
        },
    }),
    'get_choice_or_index': def({
        args0: [{ type: 'field_dropdown', name: 'type' }],
        js({fields}) {
            if ((fields.type || 'select_index') === 'select_index') return `((self._choiceIndex ?? 0) + 1)`;
            return `(self._choiceResult ?? '')`;
        },
    }),
};

export function installChoose(core) {
    const container = createDialogContainer(core);
    const { mask, panel, show, hide } = createPanel(container, { showBottomDecor: false });

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

    function showChoices(actor, question, choices) {
        const avatarUrl = getAvatarUrl(actor);
        actorNameEl.textContent = truncate(actor.name, 10);
        questionText.textContent = question || "";
        avatar.src = avatarUrl || "";

        panel.querySelectorAll('.ask-choice-container').forEach(el => el.remove());

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
                hide();
                setTimeout(() => {
                    choiceContainer.remove();
                    core.eventBus.emit("ask:choiceMade", { index: i, content: String(choice) });
                }, 250); // 略长于 transition 0.2s
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

        show();
    }

    core.globalHook("__chooseDialog__", () => ({ showChoices }));
}