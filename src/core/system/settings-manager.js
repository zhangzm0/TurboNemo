// src/core/settings-manager.js
import 'mdui/components/switch.js';
import 'mdui/components/slider.js';
import 'mdui/components/text-field.js';
import 'mdui/components/button-icon.js';
import 'mdui/components/list.js';
import 'mdui/components/list-item.js';

const STORAGE_KEY = '_tn_settings';

const CATEGORY_LABELS = {
    engine: '引擎',
    audio: '声音',
    debug: '调试',
    looks: '外观',
    procedures: '过程',
    screen: '场景',
};

const GROUP_LABELS = {
    render: '渲染',
    input: '输入',
    display: '显示',
    volume: '音量',
    dialog: '对话框',
    general: '通用',
    clone: '克隆',
    pen: '画笔',
    sound: '音效',
};

class SettingsManager {
    constructor(core) {
        this.core = core;
        this._defs = new Map();
        this._values = {};
        this._overrides = new Map();

        this._defineDefaults();
        this._loadPersisted();
        this._applyOverrides();
        this._applyAll();
        this._createUI();
    }

    // ---- 引擎内置设置 ----
    _defineDefaults() {
        const defs = [
            {
                id: 'render.scale',
                label: '分辨率缩放',
                description: '0.5=省电 1.0=原生 2.0=高清',
                type: 'number',
                min: 0.25, max: 2, step: 0.25,
                defaultValue: 1,
                category: 'engine', group: 'render',
                apply(v, core) {
                    core.app.renderer.resolution = v;
                    core.app.renderer.resize(core.width, core.height);
                    core.stage.resize(core.width, core.height);
                    if (core.app.renderer.plugins?.interaction) {
                        core.app.renderer.plugins.interaction.resolution = v;
                    }
                },
            },
            {
                id: 'swipe.threshold',
                label: '滑动阈值',
                type: 'number',
                min: 5, max: 200, step: 5,
                defaultValue: 30,
                category: 'engine', group: 'input',
                restartSafe: false,
            },
        ];
        for (const d of defs) this.define(d);
    }

    // ---- 公开 API ----

    define(def) {
        if (this._defs.has(def.id)) return;
        this._defs.set(def.id, def);
        if (def.categoryLabel) CATEGORY_LABELS[def.category] = def.categoryLabel;
        if (def.groupLabel) GROUP_LABELS[def.group] = def.groupLabel;
        // 立即应用新注册的设置
        if (def.apply) def.apply(this.get(def.id), this.core);
    }

    get(id) {
        if (this._overrides.has(id)) return this._overrides.get(id);
        if (id in this._values) return this._values[id];
        return this._defs.get(id)?.defaultValue;
    }

    set(id, val) {
        const def = this._defs.get(id);
        if (!def) return;
        val = this._coerce(val, def);
        this._values[id] = val;
        this._save();
        if (def.apply) def.apply(val, this.core);
        this.core.eventBus?.emit('settings:changed', { id, value: val });
    }

    reset(id) {
        const def = this._defs.get(id);
        if (!def) return;
        this.set(id, def.defaultValue);
    }

    resetAll() {
        for (const id of this._defs.keys()) {
            this.set(id, this._defs.get(id).defaultValue);
        }
    }

    getSchema() {
        const cats = {};
        for (const [id, def] of this._defs) {
            if (def.hidden) continue;
            const cat = def.category || 'general';
            const grp = def.group || 'general';
            if (!cats[cat]) cats[cat] = { name: cat, label: CATEGORY_LABELS[cat] || cat, groups: {} };
            if (!cats[cat].groups[grp]) cats[cat].groups[grp] = { name: grp, label: GROUP_LABELS[grp] || grp, items: [] };
            cats[cat].groups[grp].items.push({
                ...def,
                value: this.get(id),
                defaultValue: def.defaultValue,
                overridden: this._overrides.has(id),
            });
        }
        const result = [];
        for (const cat of Object.values(cats)) {
            cat.groups = Object.values(cat.groups);
            result.push(cat);
        }
        return result;
    }

    // ---- 内部 ----

    _coerce(val, def) {
        switch (def.type) {
            case 'boolean': return !!val;
            case 'number':
                val = parseFloat(val);
                if (isNaN(val)) return def.defaultValue;
                if (def.min != null) val = Math.max(def.min, val);
                if (def.max != null) val = Math.min(def.max, val);
                return val;
            case 'string': return String(val);
            default: return val;
        }
    }

    _loadPersisted() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) this._values = JSON.parse(raw);
        } catch (_) { /* ignore */ }
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._values));
        } catch (_) { /* ignore */ }
    }

    _applyOverrides() {
        const params = new URLSearchParams(window.location.search);
        for (const [key, val] of params) {
            const def = this._defs.get(key);
            if (def) this._overrides.set(key, this._coerce(val, def));
        }
    }

    _applyAll() {
        for (const id of this._defs.keys()) {
            const def = this._defs.get(id);
            const val = this.get(id);
            if (def.apply) def.apply(val, this.core);
        }
    }

    // ---- UI ----

    _createUI() {
        const wrap = document.createElement('div');
        wrap.id = 'tn-settings';
        wrap.innerHTML = `
<mdui-button-icon id="tn-menu-btn" icon="more_vert"></mdui-button-icon>
<div id="tn-menu-dropdown" class="tn-menu-closed">
    <div class="tn-menu-item" data-action="settings">设置</div>
    <div class="tn-menu-item" data-action="restart">重启</div>
</div>
<div id="tn-settings-overlay" class="tn-settings-closed"></div>
<div id="tn-settings-panel" class="tn-settings-closed">
    <div class="tn-settings-page" id="tn-settings-page-cats">
        <div class="tn-settings-header">
            <span style="flex:1">设置</span>
            <mdui-button-icon id="tn-settings-close" icon="close"></mdui-button-icon>
        </div>
        <mdui-list id="tn-settings-cat-list"></mdui-list>
    </div>
    <div class="tn-settings-page tn-settings-page-hidden" id="tn-settings-page-detail">
        <div class="tn-settings-header">
            <mdui-button-icon id="tn-settings-back" icon="arrow_back"></mdui-button-icon>
            <span id="tn-settings-cat-title"></span>
        </div>
        <div id="tn-settings-detail-body"></div>
    </div>
</div>`;
        document.body.appendChild(wrap);
        this._injectStyles();

        const menuBtn = wrap.querySelector('#tn-menu-btn');
        const dropdown = wrap.querySelector('#tn-menu-dropdown');
        const overlay = wrap.querySelector('#tn-settings-overlay');
        const panel = wrap.querySelector('#tn-settings-panel');
        panel.classList.add('mdui-theme-dark');
        const catPage = wrap.querySelector('#tn-settings-page-cats');
        const detailPage = wrap.querySelector('#tn-settings-page-detail');
        const catList = wrap.querySelector('#tn-settings-cat-list');
        const backBtn = wrap.querySelector('#tn-settings-back');
        const catTitle = wrap.querySelector('#tn-settings-cat-title');
        const detailBody = wrap.querySelector('#tn-settings-detail-body');

        const openPanel = () => {
            overlay.classList.remove('tn-settings-closed');
            panel.classList.remove('tn-settings-closed');
            this._renderCatList(catList, catPage, detailPage, catTitle, detailBody);
        };
        const closePanel = () => {
            overlay.classList.add('tn-settings-closed');
            panel.classList.add('tn-settings-closed');
        };

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('tn-menu-closed');
        });

        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.tn-menu-item');
            if (!item) return;
            dropdown.classList.add('tn-menu-closed');
            if (item.dataset.action === 'settings') {
                openPanel();
            } else if (item.dataset.action === 'restart') {
                this.core.eventBus.emit('tn:restart');
            }
        });

        // 点击空白处关闭菜单
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                dropdown.classList.add('tn-menu-closed');
            }
        });

        backBtn.addEventListener('click', () => {
            catPage.classList.remove('tn-settings-page-hidden');
            detailPage.classList.add('tn-settings-page-hidden');
        });

        const closeBtn = wrap.querySelector('#tn-settings-close');
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
#tn-settings {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 999;
}
#tn-menu-btn {
    position: fixed;
    top: 10px; right: 10px;
    z-index: 1000;
    pointer-events: auto;
    color: rgba(255,255,255,0.7);
    --mdui-color-primary: rgba(255,255,255,0.7);
}
#tn-menu-dropdown {
    position: fixed;
    top: 48px; right: 10px;
    z-index: 1000;
    pointer-events: auto;
    background: #2a2a3e;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    overflow: hidden;
    transition: opacity 0.15s, transform 0.15s;
}
#tn-menu-dropdown.tn-menu-closed {
    opacity: 0;
    transform: scale(0.9);
    pointer-events: none;
}
.tn-menu-item {
    padding: 12px 20px;
    color: #ddd;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
}
.tn-menu-item:hover {
    background: rgba(255,255,255,0.08);
}
#tn-settings-panel {
    position: fixed;
    top: 0; right: 0;
    width: 320px; max-width: 100vw;
    height: 100vh;
    background: #1e1e2e;
    pointer-events: auto;
    transition: transform 0.25s ease;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 20px rgba(0,0,0,0.5);
}
#tn-settings-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    pointer-events: auto;
    transition: opacity 0.25s ease;
}
#tn-settings-overlay.tn-settings-closed {
    opacity: 0;
    pointer-events: none;
}
#tn-settings-panel.tn-settings-closed {
    transform: translateX(100%);
}
.tn-settings-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
}
.tn-settings-page {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}
.tn-settings-page-hidden { display: none; }
.tn-settings-group {
    padding: 0 16px;
}
.tn-settings-group-title {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 16px 0 8px;
}
.tn-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.tn-settings-row:last-child { border-bottom: none; }
.tn-settings-row-label {
    font-size: 14px;
    color: #ddd;
    flex: 1;
    margin-right: 16px;
}
.tn-settings-row-control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}
.tn-settings-row-desc {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin-top: 2px;
}
.tn-settings-row-control .num-input {
    width: 64px;
}
`;
        document.head.appendChild(style);
    }

    _renderCatList(catList, catPage, detailPage, catTitle, detailBody) {
        catList.innerHTML = '';
        const schema = this.getSchema();
        for (const cat of schema) {
            const total = cat.groups.reduce((s, g) => s + g.items.length, 0);
            const item = document.createElement('mdui-list-item');
            item.textContent = `${cat.label}  (${total})`;
            item.addEventListener('click', () => {
                this._renderDetail(cat, detailPage, catPage, catTitle, detailBody);
            });
            catList.appendChild(item);
        }
    }

    _renderDetail(cat, detailPage, catPage, catTitle, detailBody) {
        catTitle.textContent = cat.label;
        detailBody.innerHTML = '';
        for (const group of cat.groups) {
            const gDiv = document.createElement('div');
            gDiv.className = 'tn-settings-group';
            const title = document.createElement('div');
            title.className = 'tn-settings-group-title';
            title.textContent = group.label;
            gDiv.appendChild(title);

            for (const item of group.items) {
                const row = document.createElement('div');
                row.className = 'tn-settings-row';
                const labelDiv = document.createElement('div');
                labelDiv.className = 'tn-settings-row-label';
                labelDiv.textContent = item.label;
                if (item.description) {
                    const desc = document.createElement('div');
                    desc.className = 'tn-settings-row-desc';
                    desc.textContent = item.description;
                    labelDiv.appendChild(desc);
                }
                row.appendChild(labelDiv);

                const control = document.createElement('div');
                control.className = 'tn-settings-row-control';
                this._renderControl(control, item);
                row.appendChild(control);
                gDiv.appendChild(row);
            }
            detailBody.appendChild(gDiv);
        }
        catPage.classList.add('tn-settings-page-hidden');
        detailPage.classList.remove('tn-settings-page-hidden');
    }

    _renderControl(container, item) {
        const id = item.id;
        if (item.type === 'boolean') {
            const sw = document.createElement('mdui-switch');
            sw.checked = item.value;
            sw.addEventListener('change', () => {
                this.set(id, sw.checked);
            });
            container.appendChild(sw);
        } else if (item.type === 'number') {
            const slider = document.createElement('mdui-slider');
            slider.min = item.min ?? 0;
            slider.max = item.max ?? 100;
            slider.step = item.step ?? 1;
            slider.value = item.value;
            slider.style.width = '120px';

            const input = document.createElement('mdui-text-field');
            input.type = 'number';
            input.min = String(item.min ?? 0);
            input.max = String(item.max ?? 100);
            input.step = String(item.step ?? 1);
            input.value = String(item.value);
            input.className = 'num-input';
            input.variant = 'outlined';

            const update = (v) => {
                v = this._coerce(v, { type: 'number', min: item.min, max: item.max, defaultValue: item.defaultValue });
                this.set(id, v);
                slider.value = v;
                input.value = String(v);
            };

            slider.addEventListener('input', () => {
                input.value = String(slider.value);
            });
            slider.addEventListener('change', () => {
                update(slider.value);
            });
            input.addEventListener('change', () => {
                update(parseFloat(input.value));
            });

            container.appendChild(slider);
            container.appendChild(input);
        } else if (item.type === 'string') {
            const tf = document.createElement('mdui-text-field');
            tf.type = 'text';
            tf.value = item.value;
            tf.variant = 'outlined';
            tf.addEventListener('change', () => {
                this.set(id, tf.value);
            });
            container.appendChild(tf);
        } else if (item.type === 'html') {
            container.innerHTML = item.html || '';
            if (item.setup) item.setup(container, this.core, item);
        } else if (item.type === 'select') {
            const sel = document.createElement('select');
            sel.style.cssText = 'background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:4px 8px;font-size:14px;';
            for (const opt of (item.options || [])) {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (opt.value === item.value) o.selected = true;
                sel.appendChild(o);
            }
            sel.addEventListener('change', () => {
                this.set(id, sel.value);
            });
            container.appendChild(sel);
        }
    }
}

export { SettingsManager };
