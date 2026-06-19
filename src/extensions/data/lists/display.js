// ==================== data/lists/display.js ====================
import { _specs, _template, isList } from "../store.js";

const BOTTOM_LINE = new URL('../res/bottomLine.png', import.meta.url).href;
const TITLE_BG = new URL('../res/list_title_bg.png', import.meta.url).href;
const CLOSE_BG = new URL('../res/list_close_bg.png', import.meta.url).href;

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
        position:absolute;
        top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0);
        z-index:9;
        pointer-events:none;
        opacity:0;
        transition: opacity 0.25s ease, background 0.25s ease;
        transform:translate(-50%, -50%);
    `;
    mask.addEventListener("click", () => closePanel());
    container.appendChild(mask);

    // 面板外层容器，用于定位
    const rootPanel = document.createElement("div");
    rootPanel.style.cssText = `
        position:absolute;
        top:-9%; left:0%;
        transform:translate(-50%, -50%) scale(0.9);
        z-index:10;
        pointer-events:none;
        opacity:0;
        transition: opacity 0.25s ease, transform 0.25s ease;
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
            height:54px; line-height:54px;
            border-radius:27px;
            padding:0 18px;
            font-family:'PingFang SC','Microsoft YaHei',sans-serif;
            font-size:21px; color:#624026; font-weight:500;
            white-space:nowrap; pointer-events:auto; cursor:pointer;
            background:#FFDA3F;
            box-shadow:
                0 4px 0 rgba(0,0,0,0.2),
                0 2px 0 #FDC330;
            display:flex; align-items:center; flex-wrap:nowrap;
        `;
        label.style.left = (spec.position?.x ?? 0) + "px";
        label.style.top = -(spec.position?.y ?? 0) + "px";
        label.style.display = spec.visible ? "" : "none";

        const entityName = spec.is_global === false ? (spec.entity_name || "") : "";

        // 角色名（如果有）
        if (entityName) {
            const actorSpan = document.createElement("span");
            actorSpan.style.cssText = 'color:#B14C00; font-size:21px; font-weight:500; margin-right:4px;';
            actorSpan.textContent = entityName;
            label.appendChild(actorSpan);

            const dot = document.createElement("span");
            dot.style.cssText = 'color:#B14C00; margin-right:4px;';
            dot.textContent = '·';
            label.appendChild(dot);
        }

        // 列表名
        const nameSpan = document.createElement("span");
        nameSpan.textContent = spec.name;
        label.appendChild(nameSpan);

        // 倒三角
        const arrow = document.createElement("span");
        arrow.textContent = '▼';
        arrow.style.cssText = 'font-size:10px; color:#673F20; margin-left:8px; display:inline-block;';
        label.appendChild(arrow);

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
            padding-top:30px;
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

        const step = PANEL_WIDTH - 30;
        const rootPanelWidth = listIds.length * step + 30;
        const activePanelCenter = index * step + PANEL_WIDTH / 2;
        const offset = rootPanelWidth / 2 - activePanelCenter;
        panelsWrapper.style.transform = `translateX(${offset}px)`;

        showPanel();
        dirty = true;
        rebuildIfDirty();
    }

    function closePanel() {
        hidePanel();
        currentIndex = -1;
    }

    function showPanel() {
        mask.style.opacity = '1';
        mask.style.background = 'rgba(0,0,0,0.3)';
        mask.style.pointerEvents = 'auto';
        rootPanel.style.opacity = '1';
        rootPanel.style.transform = 'translate(-50%, -50%) scale(1)';
        rootPanel.style.pointerEvents = 'auto';
    }

    function hidePanel() {
        mask.style.opacity = '0';
        mask.style.background = 'rgba(0,0,0,0)';
        mask.style.pointerEvents = 'none';
        rootPanel.style.opacity = '0';
        rootPanel.style.transform = 'translate(-50%, -50%) scale(0.9)';
        rootPanel.style.pointerEvents = 'none';
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
    // 定时检测改为 60 帧一次，且用长度+首尾做 hash
    let tickCount = 0;
    core.app.ticker.add(() => {
        if (dirty) {
            rebuildIfDirty();
            tickCount = 0;
            return;
        }
        if (currentIndex < 0) return;
        // 面板关闭（opacity为0）时跳过
        if (rootPanel.style.opacity === '0') return;
    
        tickCount++;
        if (tickCount % 60 !== 0) return;

        const id = listIds[currentIndex];
        const list = _template[id]?.value || [];
        const len = list.length;
        const hash = len + '|' + (len > 0 ? list[0] : '') + '|' + (len > 0 ? list[len - 1] : '');
        const disp = displays[id];
        const listEl = disp.panel.querySelector("ul");
        if (listEl && listEl._dataHash !== hash) {
            listEl._dataHash = hash;
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
