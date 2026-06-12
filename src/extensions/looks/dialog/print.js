// ==================== extensions/looks/dialog/print.js ====================
import { createPanel, createDialogContainer } from './panel.js';

const BASE = new URL('.', import.meta.url).href;
const NEXT_ICON = BASE + "res/new_next_icon.png";
const NEXT_ICON_ACTIVE = BASE + "res/new_next_icon_active.png";

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

export const printBlocks = {
    'show_stage_dialog': {
        generator(c, b) {
            const text = c.compileValue(b, 'text');
            const sprite = c.extractParams(b).sprite || '__self';
            const lookup = sprite === '__self' ? 'self.name' : `'${sprite}'`;
            return `    yield* __global__.__printDialog__.show(${lookup}, ${text});\n` + c.compileNext(b);
        },
    },
};

export function installPrint(core) {
    const container = createDialogContainer(core);
    const { mask, panel, show, hide } = createPanel(container, { showBottomDecor: true });

    panel.style.height = '308px';
    panel.style.overflow = 'visible';

    // 头像
    const avatar = document.createElement("img");
    avatar.style.cssText = `
        position:absolute; left:80px; top:66px;
        width:66px; height:66px; object-fit:contain;
    `;
    panel.appendChild(avatar);

    // 角色名
    const actorNameEl = document.createElement("div");
    actorNameEl.style.cssText = `
        position:absolute; left:158px; top:66px;
        font-size:21px; color:#A19C97; line-height:21px;
        font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
    `;
    panel.appendChild(actorNameEl);

    // 内容文字
    const contentText = document.createElement("div");
    contentText.style.cssText = `
        position:absolute; left:158px; top:100px; right:80px;
        font-size:21px; line-height:36px; letter-spacing:1.3px;
        color:#45372D;
        font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
        word-break:break-all;
        overflow:hidden;
    `;
    panel.appendChild(contentText);

    // 继续按钮
    const nextBtn = document.createElement("div");
    nextBtn.style.cssText = `
        position:absolute; right:62px; bottom:-16px;
        width:66px; height:66px;
        background:url(${NEXT_ICON}) no-repeat;
        background-size:contain;
        cursor:pointer;
    `;
    panel.appendChild(nextBtn);

    // 离屏测量元素（用于精确分页）
    const measureEl = document.createElement("div");
    measureEl.style.cssText = `
        position:absolute; visibility:hidden; pointer-events:none;
        left:158px; top:100px; right:80px;
        font-size:21px; line-height:36px; letter-spacing:1.3px;
        font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
        word-break:break-all;
    `;
    panel.appendChild(measureEl);

    // 计算内容区最大高度：面板高度308px - 头像top66 - 头像高66 - 底部留白约30px
    const maxContentHeight = 308 - 66 - 66 - 30; // ≈146px，约4行

    /**
     * CSS驱动的精确分页
     */
    function splitTextToPages(text) {
        const pages = [];
        let remaining = text;
        while (remaining.length > 0) {
            // 二分查找当前页能放多少字符
            let lo = 0, hi = remaining.length;
            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                measureEl.textContent = remaining.substring(0, mid);
                if (measureEl.scrollHeight <= maxContentHeight) {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }
            const pageText = remaining.substring(0, lo);
            if (pageText.length === 0) break; // 防止死循环（单个字符就超高的极端情况）
            pages.push(pageText);
            remaining = remaining.substring(lo);
        }
        return pages;
    }

    // 打字机动画
    let typewriterTimer = null;
    let currentPageText = '';
    let typewriterCallback = null;

    function startTypewriter(text, el, speed, onComplete) {
        stopTypewriter();
        currentPageText = text;
        typewriterCallback = onComplete;
        let index = 0;
        el.textContent = '';
        typewriterTimer = setInterval(() => {
            if (index < text.length) {
                el.textContent += text[index];
                index++;
            } else {
                stopTypewriter();
                if (onComplete) onComplete();
            }
        }, speed);
    }

    function stopTypewriter() {
        if (typewriterTimer) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
        }
    }

    function finishTypewriter() {
        if (typewriterTimer) {
            stopTypewriter();
            contentText.textContent = currentPageText;
            if (typewriterCallback) {
                const cb = typewriterCallback;
                typewriterCallback = null;
                cb();
            }
        }
    }

    // 页面数据
    let pages = [];
    let pageIndex = 0;

    function showPage() {
        if (pageIndex < pages.length) {
            startTypewriter(pages[pageIndex], contentText, 50, () => {
                core.eventBus.emit('print:typewriterDone');
            });
        }
    }

    function nextPage() {
        if (typewriterTimer) {
            finishTypewriter();
            return;
        }
        pageIndex++;
        if (pageIndex >= pages.length) {
            hide();
            core.eventBus.emit('print:done');
        } else {
            showPage();
            core.eventBus.emit('print:nextPage');
        }
    }

    nextBtn.addEventListener("mousedown", () => { nextBtn.style.backgroundImage = `url(${NEXT_ICON_ACTIVE})`; });
    nextBtn.addEventListener("mouseup", () => { nextBtn.style.backgroundImage = `url(${NEXT_ICON})`; });
    nextBtn.addEventListener("click", nextPage);
    mask.addEventListener("click", nextPage);

    function* showDialog(spriteName, rawText) {
        const actor = core.actorManager.getByName(spriteName);
        avatar.src = getAvatarUrl(actor) || "";
        actorNameEl.textContent = truncate(spriteName, 10);

        const text = typeof rawText === 'string' ? rawText : String(rawText);
        pages = splitTextToPages(text);

        show();

        for (let i = 0; i < pages.length; i++) {
            pageIndex = i;
            showPage();
            yield { _yieldType: 'pause', event: 'print:typewriterDone' };
            if (i < pages.length - 1) {
                yield { _yieldType: 'pause', event: 'print:nextPage' };
            } else {
                yield { _yieldType: 'pause', event: 'print:done' };
            }
        }

        hide();
    }

    core.globalHook("__printDialog__", () => ({ show: showDialog }));
}