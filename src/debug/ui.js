// src/debug/ui.js
const STYLE = `
#debug-fab {
    position: fixed;
    bottom: 20px; right: 20px;
    width: 44px; height: 44px;
    border-radius: 50%;
    border: none;
    background: #6366f1;
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
    transition: transform 0.2s, opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
}
#debug-fab:hover { transform: scale(1.1); }
#debug-fab.active { transform: rotate(45deg); }

#debug-panel {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 9998;
    font: 12px/1.5 'Menlo', 'Monaco', 'Courier New', monospace;
    color: #e0e0e0;
    pointer-events: none;
    transition: transform 0.25s ease;
    transform: translateY(calc(100% - 36px));
}
#debug-panel.open { transform: translateY(0); }

#debug-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(30,30,46,0.85);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border-top: 1px solid rgba(255,255,255,0.08);
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
}
#debug-toolbar button {
    width: 30px; height: 26px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    background: rgba(42,42,62,0.8);
    color: #ccc;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
}
#debug-toolbar button:hover { background: rgba(58,58,94,0.9); }
#debug-toolbar button:active { background: rgba(74,74,110,0.9); }
#debug-toolbar button.active-btn { background: rgba(99,102,241,0.7); border-color: #6366f1; }

#debug-toggle {
    margin-left: auto;
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    padding: 0 4px;
}
#debug-mode-label {
    margin-left: 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.4);
}

#debug-body {
    max-height: 45vh;
    overflow-y: auto;
    background: rgba(24,24,37,0.82);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255,255,255,0.06);
    pointer-events: auto;
}
#debug-body::-webkit-scrollbar { width: 4px; }
#debug-body::-webkit-scrollbar-track { background: transparent; }
#debug-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

.debug-entity {
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.debug-entity-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    cursor: pointer;
    user-select: none;
}
.debug-entity-header:hover { background: rgba(255,255,255,0.04); }
.debug-entity-icon { font-size: 10px; color: rgba(255,255,255,0.3); transition: transform 0.15s; }
.debug-entity-icon.expanded { transform: rotate(90deg); }
.debug-entity-name { font-weight: bold; color: #c0c0f0; }
.debug-entity-status {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    margin-left: 4px;
}
.debug-entity-status.running { background: rgba(76,175,80,0.25); color: #4caf50; }
.debug-entity-status.paused { background: rgba(255,152,0,0.25); color: #ff9800; }
.debug-entity-status.stopped { background: rgba(244,67,54,0.25); color: #f44336; }

.debug-empty {
    padding: 12px;
    text-align: center;
    color: rgba(255,255,255,0.2);
    font-style: italic;
}
.tv-row.active-row {
    background: rgba(255,152,0,0.12);
    border-left: 2px solid #ff9800;
}

/* 树查看器 */
.debug-tv {
    padding: 2px 0;
    font-size: 11px;
    font-family: 'Menlo','Monaco','Courier New',monospace;
    border-top: 1px solid rgba(255,255,255,0.04);
    background: rgba(0,0,0,0.1);
}
.tv-row {
    padding: 1px 0;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.debug-tv-toggle {
    display: inline-block;
    width: 12px;
    cursor: pointer;
    user-select: none;
    color: rgba(255,255,255,0.3);
    font-size: 9px;
    vertical-align: middle;
}
.debug-tv-toggle.open { color: #6366f1; }
.tv-ph { display: inline-block; width: 12px; }
.tv-children { padding-left: 0; }
.tv-key { color: #7ec8e3; }
.tv-idx { color: rgba(255,255,255,0.35); }
.tv-str { color: #c8e3a0; }
.tv-num { color: #f0c080; }
.tv-null { color: rgba(255,255,255,0.25); font-style: italic; }
.tv-empty { color: rgba(255,255,255,0.2); }
`;

class DebugUI {
    constructor(dbg, core) {
        this.dbg = dbg;
        this.core = core;
        this._open = false;
        this._expandedEntities = new Set();
        this._tvExpanded = new Set();
        this._rafPending = false;

        this._injectStyles();
        this._createDOM();
        this._bindEvents();
        this._attachUpdateHook();
        this._open = false;
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = STYLE;
        document.head.appendChild(style);
    }

    _createDOM() {
        this._fab = document.createElement('button');
        this._fab.id = 'debug-fab';
        this._fab.textContent = '🐛';
        document.body.appendChild(this._fab);

        this._panel = document.createElement('div');
        this._panel.id = 'debug-panel';
        this._panel.innerHTML = `
            <div id="debug-toolbar">
                <button id="dbg-continue" title="Continue">▶</button>
                <button id="dbg-step" title="Step Over">⏭</button>
                <button id="dbg-pause" title="Pause">⏸</button>
                <span id="debug-mode-label">monitor</span>
                <span id="debug-toggle">▲</span>
            </div>
            <div id="debug-body"></div>
        `;
        document.body.appendChild(this._panel);

        this._toolbar = this._panel.querySelector('#debug-toolbar');
        this._body = this._panel.querySelector('#debug-body');
        this._modeLabel = this._panel.querySelector('#debug-mode-label');
        this._toggleIcon = this._panel.querySelector('#debug-toggle');
        this._btnContinue = this._panel.querySelector('#dbg-continue');
        this._btnStep = this._panel.querySelector('#dbg-step');
        this._btnPause = this._panel.querySelector('#dbg-pause');
    }

    _bindEvents() {
        this._fab.addEventListener('click', () => this._toggle());

        this._toolbar.addEventListener('click', (e) => {
            if (e.target === this._toolbar || e.target.closest('#debug-toggle')) {
                this._toggleBody();
            }
        });

        this._btnContinue.addEventListener('click', (e) => { e.stopPropagation(); this.dbg.continue(); });
        this._btnStep.addEventListener('click', (e) => { e.stopPropagation(); this.dbg.stepOver(); });
        this._btnPause.addEventListener('click', (e) => { e.stopPropagation(); this.dbg.pause(); });
    }

    _toggle() {
        this._open = !this._open;
        this._panel.classList.toggle('open', this._open);
        this._fab.classList.toggle('active', this._open);
    }

    _toggleBody() {
        this._panel.classList.toggle('open');
        this._open = this._panel.classList.contains('open');
        this._fab.classList.toggle('active', this._open);
    }

    _attachUpdateHook() {
        this.dbg.onUpdate(() => this._scheduleRender());
    }

    _scheduleRender() {
        if (this._rafPending) return;
        this._rafPending = true;
        requestAnimationFrame(() => {
            this._rafPending = false;
            this._render();
        });
    }

    _render() {
        const mode = this.dbg.getMode();
        this._modeLabel.textContent = mode === 'step' ? 'step' : 'monitor';
        this._btnContinue.classList.toggle('active-btn', mode !== 'step');
        this._btnPause.classList.toggle('active-btn', mode === 'step');

        const allTasks = this.dbg.getAllTasks();
        const taskMap = {};
        for (const t of allTasks) {
            if (!taskMap[t.entityName]) taskMap[t.entityName] = [];
            taskMap[t.entityName].push(t);
        }

        const lastStep = this.dbg.getLastStep();
        const entityNames = Object.keys(taskMap);

        if (entityNames.length === 0) {
            this._body.innerHTML = '<div class="debug-empty">No tasks running</div>';
            return;
        }

        let html = '';
        for (const name of entityNames) {
            const tasks = taskMap[name];
            const isCurrent = lastStep && lastStep.entity === name;
            const expanded = this._expandedEntities.has(name);
            const iconClass = expanded ? ' expanded' : '';
            const status = tasks.some(t => t.state === 'paused') ? 'paused'
                : tasks.some(t => t.state === 'running') ? 'running' : 'stopped';

            html += `<div class="debug-entity">`;
            html += `<div class="debug-entity-header" data-entity="${name}">`;
            html += `<span class="debug-entity-icon${iconClass}">▶</span>`;
            html += `<span class="debug-entity-name">${this._escape(name)}</span>`;
            if (isCurrent && lastStep.screen) {
                html += `<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:4px">@${this._escape(lastStep.screen)}</span>`;
            }
            if (isCurrent && lastStep.type) {
                html += `<span style="font-size:10px;color:#ff9800;margin-left:4px">${this._escape(lastStep.type)}</span>`;
                if (lastStep.fields) {
                    const fStr = Object.entries(lastStep.fields).map(([k,v]) => `${k}:${v}`).join(' ');
                    html += `<span style="font-size:10px;color:#c8e3a0;margin-left:4px">${this._escape(fStr)}</span>`;
                }
                const lv = this.dbg.getLastValue();
                if (lv && lv.entity === name && lv.type === lastStep.type) {
                    const vs = typeof lv.value === 'string' ? `"${lv.value}"` : lv.value;
                    html += `<span style="font-size:10px;color:#f0c080;margin-left:4px">→ ${this._escape(String(vs))}</span>`;
                }
            }
            html += `<span class="debug-entity-status ${status}">${status}</span>`;
            html += `</div>`;

            if (expanded) {
                const viewData = this._buildViewData(name, tasks, lastStep);
                const activePaths = isCurrent ? this._computeActivePaths(tasks, lastStep) : new Set();
                html += `<div class="debug-tv">${this._renderTree(viewData, '', 0, true, '', null, activePaths)}</div>`;
            }

            html += `</div>`;
        }

        this._body.innerHTML = html;

        this._body.querySelectorAll('.debug-entity-header').forEach(el => {
            el.addEventListener('click', () => {
                const name = el.dataset.entity;
                if (this._expandedEntities.has(name)) {
                    this._expandedEntities.delete(name);
                } else {
                    this._expandedEntities.add(name);
                }
                this._scheduleRender();
            });
        });

        // 树节点折叠/展开
        this._body.querySelectorAll('.debug-tv-toggle').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = el.dataset.path;
                if (!path) return;
                if (this._tvExpanded.has(path)) {
                    this._tvExpanded.delete(path);
                } else {
                    this._tvExpanded.add(path);
                }
                this._scheduleRender();
            });
        });
    }

    _buildViewData(name, tasks, lastStep) {
        const nameMap = this.core._varNameMap || {};
        const data = {};
        const isCurrent = lastStep && lastStep.entity === name;

        tasks.forEach((task, i) => {
            const tree = task._restart?.blockTree;
            if (!tree) return;
            data[task._restart.hatType || `script_${i}`] = tree;
        });

        if (isCurrent) {
            const s = {};
            if (lastStep.self) s.self = lastStep.self;
            if (lastStep.screenObj) s.screen = lastStep.screenObj;
            if (lastStep.vars) {
                s.vars = {};
                for (const [id, v] of Object.entries(lastStep.vars)) {
                    s.vars[nameMap[id] || id] = v.value;
                }
            }
            data.state = s;
        }

        return data;
    }

    _computeActivePaths(tasks, lastStep) {
        if (!lastStep) return new Set();
        const targetIdx = lastStep._i;
        if (targetIdx == null) return new Set();
        const activePaths = new Set();

        for (const task of tasks) {
            const tree = task._restart?.blockTree;
            const blockList = task._restart?.blockList;
            if (!tree || !blockList || blockList.length === 0) continue;

            const stepIndices = blockList.map(b => b.idx);
            let pos = 0;
            let found = false;

            // Postorder walk: children (statements, next) processed BEFORE the node itself,
            // matching the compiler's _stepIdx++ order (depth-first, children first)
            const walk = (node, currentPath) => {
                if (!node || found) return;

                // Walk statements first (they're compiled inside the generator)
                if (node.statements) {
                    for (const stmtKey of Object.keys(node.statements)) {
                        walk(
                            node.statements[stmtKey],
                            `${currentPath}.statements.${stmtKey.replace(/[^a-zA-Z0-9_$]/g, '_')}`
                        );
                        if (found) return;
                    }
                }

                // Walk next chain (compiled via compileNext after generator)
                if (node.next) {
                    walk(node.next, `${currentPath}.next`);
                    if (found) return;
                }

                // Now process this node (step idx assigned after generator returns)
                if (pos < stepIndices.length && stepIndices[pos] === targetIdx) {
                    activePaths.add(currentPath);
                    found = true;
                }
                pos++;
            };

            // Root is hat (no step idx), walk its children directly
            if (tree.statements) {
                for (const stmtKey of Object.keys(tree.statements)) {
                    walk(
                        tree.statements[stmtKey],
                        `r.statements.${stmtKey.replace(/[^a-zA-Z0-9_$]/g, '_')}`
                    );
                    if (found) break;
                }
            }
            if (!found && tree.next) {
                walk(tree.next, 'r.next');
            }

            if (found) break;
        }

        return activePaths;
    }

    _renderTree(value, key, depth, isRoot, _path, _visited, _activePaths) {
        if (isRoot && typeof value === 'object' && value !== null) {
            const childPath = 'r';
            let html = '';
            const keys = Array.isArray(value) ? value.map((_, i) => i) : Object.keys(value).filter(k => k !== 'type').sort();
            if (value.type) html += this._renderTree(value.type, 'type', 0, false, childPath, _visited, _activePaths);
            for (const k of keys) {
                html += this._renderTree(value[k], k, 0, false, childPath, _visited, _activePaths);
            }
            return html;
        }

        const indent = depth * 14;
        const myPath = _path || '';
        const childPath = (key !== undefined && key !== null && key !== '' && key !== '__root')
            ? `${myPath}.${String(key).replace(/[^a-zA-Z0-9_$]/g, '_')}`
            : myPath;

        const label = this._renderKeyLabel(key);

        if (value === null || value === undefined) {
            return `<div class="tv-row" style="padding-left:${indent}px">${label}<span class="tv-null">null</span></div>`;
        }
        if (typeof value === 'object') {
            if (_visited && _visited.has(value)) {
                return `<div class="tv-row" style="padding-left:${indent}px">${label}<span class="tv-null">[Circular]</span></div>`;
            }
            const isArray = Array.isArray(value);
            const keys = isArray ? value.map((_, i) => i) : Object.keys(value).filter(k => k !== 'type').sort();
            const hasType = !isArray && value.type;
            const hasChildren = keys.length > 0;
            // Auto-expand the active node and its ancestors without mutating _tvExpanded
            const isActiveNode = _activePaths?.has(childPath);
            const isActiveAncestor = _activePaths && !isActiveNode && [..._activePaths].some(p => p.startsWith(childPath + '.'));
            const collapsed = !this._tvExpanded.has(childPath) && !isActiveNode && !isActiveAncestor;

            const nodeClass = _activePaths?.has(childPath) ? ' tv-row active-row' : ' tv-row';
            let html = `<div class="${nodeClass}" style="padding-left:${indent}px">`;
            if (hasChildren) {
                html += `<span class="debug-tv-toggle" data-path="${childPath}">${collapsed ? '▶' : '▼'}</span>`;
            } else {
                html += `<span class="tv-ph"></span>`;
            }
            html += label;

            if (!hasChildren && !hasType) {
                html += `<span class="tv-empty">{}</span></div>`;
                return html;
            }
            html += `</div>`;

            if (!collapsed) {
                const nextVisited = _visited || new WeakSet();
                nextVisited.add(value);
                html += `<div class="tv-children">`;
                if (hasType) html += this._renderTree(value.type, 'type', depth + 1, false, childPath, nextVisited, _activePaths);
                for (const k of keys) {
                    html += this._renderTree(value[k], k, depth + 1, false, childPath, nextVisited, _activePaths);
                }
                html += `</div>`;
            }
            return html;
        }

        const typeClass = typeof value === 'string' ? 'tv-str' : 'tv-num';
        const display = typeof value === 'string'
            ? `"${this._escape(String(value))}"`
            : this._escape(String(value));
        return `<div class="tv-row" style="padding-left:${indent}px">${label}<span class="${typeClass}">${display}</span></div>`;
    }

    _renderKeyLabel(key) {
        if (typeof key === 'number') return `<span class="tv-idx">${key}: </span>`;
        return `<span class="tv-key">${this._escape(String(key))}: </span>`;
    }

    _escape(str) {
        if (typeof str !== 'string') return String(str);
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

export { DebugUI };
