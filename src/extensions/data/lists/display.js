// ==================== data/lists/display.js ====================
import { _specs, _template, isList } from "../store.js";

// 底部装饰线
const BOTTOM_LINE =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQYAAAAGCAYAAAAhQjCIAAAAv0lEQVRYR2NkGAUjOgT+/29gun1C0pSJiVkDFBD//v29oWrx/DQjY8O/ER0wI9zzjCPc/yPe+7eOzzRnYmTSRw6If///XVSzTD854gNnBAcA473jc/3+Mf6TGMFhMGy9zvSf6YWSZfImfB68c3JOPMP//+woahgZf6qYpyzEp2803QzbZMMASjejBcPwjV9wBI8WDMM4gmnkNXDBQCOzR40dIiEw2pUYIhFFZ2eOFgx0DvDBZt3o4ONgi5HB4R4AltVTJ7ZUDmgAAAAASUVORK5CYII=";
// 标题栏背景
const TITLE_BG =
    "data:image/png;base64,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";
// 关闭按钮图标
const CLOSE_BG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABBElEQVRYR+1WwQ3CMAxsugd8kPjCBEiMAoPBKEhMAF8kPrBHgowUqQpO4nNC00f7jOy7i+1LbbrGn2nM380C2AocdqsFteZ8fb5rtCiF9yOAgp0xWyLu+/51ujzuJSKO+/XGWrskDOPcLbxUUkCpiCG5WAAFhomaSkgxoi6QAnDtQXKTNkSAvBA0J/sOIIBIrBecFSCdCQ35dzClFksRaMkhAbFK0Ln3uca24grEhmxYQY1dYQFcJTQ3h4YwnJOw56MK4Mi9wL+3gJv20YawqQ0lPpfEcG9O1gUIMBIrcoEGEM2Z5u8YvUXJTjC9laz5UkrlbLqWS/eDWnHZd6AWUQxnFvABkpFIMD6R4JQAAAAASUVORK5CYII=";
function truncate(str, max) {
    if (!str) return "";
    if (str.length <= max) return str;
    return str.substring(0, max - 1) + "…" + str.substring(str.length - 1);
}

function installListDisplay(core) {
    const displays = {};
    const listIds = [];
    let currentIndex = -1;
    let dirty = false;

    // ========== 独立容器 ==========
    const container = document.createElement("div");
    container.style.cssText = `
        position:absolute; top:0; left:0;
        width:${core.width}px; height:${core.height}px;
        pointer-events:none; z-index:90;
    `;
    core.stage.htmlContainer.appendChild(container);

    // 遮罩
    const mask = document.createElement("div");
    mask.style.cssText = `
        display:none;
        position:absolute;
        top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0.3);
        z-index:9;
        pointer-events:auto;
        transform:translate(-50%, -50%);
    `;
    mask.addEventListener("click", () => closePanel());
    container.appendChild(mask);

    // 面板外层容器，用于定位
    const rootPanel = document.createElement("div");
    rootPanel.style.cssText = `
        display:none;
        position:absolute;
        top:-9%; left:0%;
        transform:translate(-50%, -50%);
        z-index:10;
        pointer-events:auto;
    `;
    container.appendChild(rootPanel);

    // 所有列表面板的水平排列容器
    const panelsWrapper = document.createElement("div");
    panelsWrapper.style.cssText = `
        display:flex;
        flex-direction:row;
        transition: transform 0.3s ease;
    `;
    rootPanel.appendChild(panelsWrapper);

    // 点击 rootPanel 左右边缘区域切换列表
    rootPanel.addEventListener("click", (e) => {
        if (listIds.length <= 1) return;
        const rect = rootPanel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const mid = rect.width / 2;
        if (x < mid - 120) {
            if (currentIndex > 0) showList(currentIndex - 1);
        } else if (x > mid + 120) {
            if (currentIndex < listIds.length - 1) showList(currentIndex + 1);
        }
    });
    // 在 rootPanel 上增加触摸滑动
    let touchStartX = 0;
    let touchMoved = false;

    rootPanel.addEventListener("touchstart", (e) => {
        if (listIds.length <= 1) return;
        touchStartX = e.touches[0].clientX;
        touchMoved = false;
        panelsWrapper.style.transition = "none"; // 滑动时去掉动画
    });

    rootPanel.addEventListener("touchmove", (e) => {
        if (listIds.length <= 1) return;
        const dx = e.touches[0].clientX - touchStartX;
        if (Math.abs(dx) > 10) touchMoved = true;
        // 实时跟随手指
        const step = PANEL_WIDTH - 30;
        const baseOffset =
            -currentIndex * step +
            (listIds.length * step + 30) / 2 -
            PANEL_WIDTH / 2;
        panelsWrapper.style.transform = `translateX(${baseOffset + dx}px)`;
    });

    rootPanel.addEventListener("touchend", (e) => {
        panelsWrapper.style.transition = "transform 0.3s ease";
        if (!touchMoved) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 60) {
            if (dx < 0 && currentIndex < listIds.length - 1) {
                showList(currentIndex + 1);
            } else if (dx > 0 && currentIndex > 0) {
                showList(currentIndex - 1);
            } else {
                showList(currentIndex); // 回弹
            }
        } else {
            showList(currentIndex); // 回弹
        }
    });

    // ========== 标签层 ==========
    const labelLayer = core.stage.globalHtmlLayer;

    const PANEL_WIDTH = 455;

    // 预先创建每个列表的独立面板
    for (const [id, spec] of Object.entries(_specs)) {
        if (!isList(id)) continue;
        listIds.push(id);

        // 列表标签
        const label = document.createElement("div");
        label.style.cssText = `
            position:absolute;
            border-radius:20px;
            background:#FFDA3F;
            box-shadow:2px 2px 4px rgba(0,0,0,0.2),inset 0 -1.5px 0 #FDC330;
            padding:8px 14px;
            font-family:'PingFang SC','Microsoft YaHei',sans-serif;
            font-size:16px; color:#624026; font-weight:500;
            white-space:nowrap; pointer-events:auto; cursor:pointer;
        `;
        label.style.left = (spec.position?.x ?? 0) + "px";
        label.style.top = -(spec.position?.y ?? 0) + "px";
        label.style.display = spec.visible ? "" : "none";
        const entityName =
            spec.is_global === false ? spec.entity_name || "" : "";
        label.textContent = (entityName ? entityName + " · " : "") + spec.name;
        label.addEventListener("click", () => {
            const idx = listIds.indexOf(id);
            if (idx !== -1) showList(idx);
        });
        labelLayer.appendChild(label);

        // 创建该列表的完整面板
        const panel = createListPanel(id, spec, entityName);
        panelsWrapper.appendChild(panel);

        displays[id] = { label, spec, panel, pool: [] };
    }

    // 如果没有列表，直接返回
    if (listIds.length === 0) return;

    // ========== 创建单个列表的面板 DOM ==========
    function createListPanel(id, spec, entityName) {
        const panel = document.createElement("div");
        panel.style.cssText = `
            flex-shrink:0;
            width:${PANEL_WIDTH}px;
            display:flex;
            flex-direction:column;
            align-items:center;
            transform: scale(0.8);
            filter: brightness(0.7);
            transition: transform 200ms ease-out, filter 200ms ease-out;
            margin-right: -30px;
        `;

        // 标题栏
        const titleBar = document.createElement("div");
        titleBar.style.cssText = `
            width:455px; height:78px;
            position:relative; top:0px; z-index:1;
            display:flex; flex-direction:column;
            justify-content:center; align-items:center;
            font-family:PingFangSC-Medium,'PingFang SC','Microsoft YaHei',sans-serif;
            font-size:27px; color:#ffffff; font-weight:bold;
            background:url(${TITLE_BG}) no-repeat;
            background-size:cover;
        `;
        panel.appendChild(titleBar);

        const titleText = document.createElement("span");
        titleText.textContent = truncate(spec.name, 10);
        titleBar.appendChild(titleText);

        if (entityName) {
            const titleEntity = document.createElement("span");
            titleEntity.style.cssText =
                "font-size:18px;line-height:21px;opacity:0.5;";
            titleEntity.textContent = truncate(entityName, 4);
            titleBar.insertBefore(titleEntity, titleText);
        }

        // 关闭按钮
        const closeBtn = document.createElement("div");
        closeBtn.style.cssText = `
            width:24px; height:24px;
            position:absolute; right:12px; top:32px;
            background:url(${CLOSE_BG}) no-repeat;
            background-size:contain;
            cursor:pointer;
        `;
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closePanel();
        });
        titleBar.appendChild(closeBtn);

        // 内容区
        const content = document.createElement("div");
        content.style.cssText = `
            position:relative;
            width:393px; height:449px;
            border-radius:24px;
            background:#ffffff;
            display:flex; flex-direction:column;
            align-items:center; justify-content:flex-start;
            padding-top:0px;
            margin-top:-30px;
            box-sizing:border-box;
        `;
        panel.appendChild(content);

        const contentBg = document.createElement("div");
        contentBg.style.cssText = `
            position:absolute; z-index:-1;
            left:-18px; top:-18px; right:-18px; bottom:-18px;
            border-radius:33px;
            border:#ffffff solid 2px;
            background:linear-gradient(#ffdb3f, #fdb835);
        `;
        content.appendChild(contentBg);

        const listEl = document.createElement("ul");
        listEl.style.cssText = `
            width:100%; height:100%;
            overflow-y:auto; overflow-x:hidden;
            font-family:PingFangSC-Regular,'PingFang SC','Microsoft YaHei',sans-serif;
            font-size:24px; color:#333333;
            list-style-type:none;
            border-radius:24px;
            margin:0; padding:0;
            position:relative;
        `;
        content.appendChild(listEl);

        return panel;
    }

    // ========== 面板切换 ==========
    function showList(index) {
        if (index < 0 || index >= listIds.length) return;
        currentIndex = index;

        // 更新激活样式
        for (let i = 0; i < listIds.length; i++) {
            const p = displays[listIds[i]].panel;
            if (i === index) {
                p.style.transform = "scale(1)";
                p.style.filter = "brightness(1)";
            } else {
                p.style.transform = "scale(0.8)";
                p.style.filter = "brightness(0.7)";
            }
        }

        // 计算偏移使激活面板居中
        const step = PANEL_WIDTH - 30; // 425
        const rootPanelWidth = listIds.length * step + 30;
        const activePanelCenter = index * step + PANEL_WIDTH / 2;
        const offset = rootPanelWidth / 2 - activePanelCenter;
        panelsWrapper.style.transform = `translateX(${offset}px)`;

        mask.style.display = "";
        rootPanel.style.display = "block";
        dirty = true;
        rebuildIfDirty();
    }

    function closePanel() {
        mask.style.display = "none";
        rootPanel.style.display = "none";
        currentIndex = -1;
    }

    // ========== 行元素构建/更新 ==========
    function updateLiContent(li, i, v) {
        const spans = li.querySelectorAll("span");
        if (spans[0]) {
            spans[0].textContent = i + 1;
            spans[0].style.fontSize = i >= 99 ? "18px" : "21px";
        }
        if (spans[1]) spans[1].textContent = v;
        li.style.backgroundColor = i % 2 === 0 ? "#fff9e4" : "#ffffff";
    }

    function createLiElement(i, v) {
        const li = document.createElement("li");
        li.style.cssText = `width:100%;height:53px;display:flex;align-items:center;justify-content:center;position:relative;background-color:${i % 2 === 0 ? "#fff9e4" : "#ffffff"};`;
        li.innerHTML = `
            <span style="width:52px;height:30px;font-size:${i >= 99 ? "18px" : "21px"};color:#c6c3c0;font-weight:bold;line-height:30px;text-align:center;padding:0 4px 0 6px;">${i + 1}</span>
            <span style="flex:1;height:48px;line-height:48px;font-size:21px;text-align:center;padding-right:52px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#43372e;">${v}</span>
        `;
        return li;
    }

    function buildEmptyHTML() {
        return `<li style="position:relative;height:100%;"><img src="${BOTTOM_LINE}" style="width:196px;height:5px;position:absolute;bottom:15px;left:calc(50% - 98px);" /></li>`;
    }

    function rebuildCurrentList() {
        if (currentIndex < 0) return;
        const id = listIds[currentIndex];
        const list = _template[id]?.value || [];
        const disp = displays[id];
        const pool = disp.pool;
        const listEl = disp.panel.querySelector("ul");
        if (!listEl) return;

        if (list.length === 0) {
            listEl.innerHTML = buildEmptyHTML();
            return;
        }

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < list.length; i++) {
            if (i < pool.length) {
                updateLiContent(pool[i], i, list[i]);
                fragment.appendChild(pool[i]);
            } else {
                const li = createLiElement(i, list[i]);
                pool.push(li);
                fragment.appendChild(li);
            }
        }

        const bottom = document.createElement("li");
        bottom.style.cssText =
            "position:relative;min-height:48px;border-bottom-left-radius:24px;border-bottom-right-radius:24px;";
        bottom.innerHTML = `<img src="${BOTTOM_LINE}" style="width:196px;height:5px;position:absolute;bottom:15px;left:calc(50% - 98px);" />`;
        fragment.appendChild(bottom);

        listEl.innerHTML = "";
        listEl.appendChild(fragment);
    }

    function rebuildIfDirty() {
        if (!dirty || currentIndex < 0) return;
        dirty = false;
        rebuildCurrentList();
    }

    // ========== 事件监听 ==========
    core.eventBus.on("list:updated", (updatedId) => {
        if (currentIndex >= 0 && listIds[currentIndex] === updatedId) {
            dirty = true;
        }
    });

    // ========== 每帧更新 + 定时检测 ==========
    let tickCount = 0;
    core.app.ticker.add(() => {
        if (dirty) {
            rebuildIfDirty();
            tickCount = 0;
            return;
        }
        if (currentIndex < 0) return;
        tickCount++;
        if (tickCount % 30 !== 0) return;

        const id = listIds[currentIndex];
        const list = _template[id]?.value || [];
        const newHash =
            list.length +
            "|" +
            (list.length > 0 ? JSON.stringify(list).length : "");
        const disp = displays[id];
        const listEl = disp.panel.querySelector("ul");
        if (listEl && listEl._dataHash !== newHash) {
            listEl._dataHash = newHash;
            rebuildCurrentList();
        }
    });

    // ========== 全局 API ==========
    window.__listDisplay__ = {
        show(id) {
            if (displays[id]) {
                displays[id].label.style.display = "";
                displays[id].spec.visible = true;
            }
        },
        hide(id) {
            if (displays[id]) {
                displays[id].label.style.display = "none";
                displays[id].spec.visible = false;
            }
            if (listIds[currentIndex] === id) closePanel();
        },
    };
}

export { installListDisplay };
