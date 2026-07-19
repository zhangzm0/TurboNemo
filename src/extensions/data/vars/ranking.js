function installRanking(core) {
    let currentVar = null;
    let currentDir = 'positive';
    let visible = false;
    let container = null;
    let titleEl = null;
    let listEl = null;

    function ensureContainer() {
        if (container) return;
        container = document.createElement('div');
        container.style.cssText = `
            position:absolute; top:20px; left:50%; transform:translateX(-50%);
            width:300px; background:#fff; border-radius:12px;
            box-shadow:0 4px 12px rgba(0,0,0,0.15);
            font-family:'PingFang SC','Microsoft YaHei',sans-serif;
            overflow:hidden; z-index:100; display:none;
        `;

        titleEl = document.createElement('div');
        titleEl.style.cssText = `
            background:#FF9834; color:#fff; padding:12px 16px;
            font-size:18px; font-weight:600; text-align:center;
        `;
        titleEl.textContent = '排行榜';
        container.appendChild(titleEl);

        listEl = document.createElement('div');
        listEl.style.cssText = `padding:8px 0; max-height:400px; overflow-y:auto;`;
        container.appendChild(listEl);

        core.stage.globalHtmlLayer.appendChild(container);
    }

    function updateList() {
        if (!listEl || !currentVar) return;
        const vars = core.actorManager?.getByName?.('master')?._vars || {};
        const val = vars[currentVar]?.value ?? 0;
        const items = [
            { rank: 1, name: '玩家', value: val },
        ];
        if (currentDir === 'reverse') {
            items.sort((a, b) => a.value - b.value);
        } else {
            items.sort((a, b) => b.value - a.value);
        }
        listEl.innerHTML = '';
        items.forEach((item, i) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display:flex; align-items:center; padding:8px 16px;
                font-size:15px; color:#333;
                border-bottom:1px solid #f0f0f0;
            `;
            const rankEl = document.createElement('span');
            rankEl.style.cssText = `width:30px; font-weight:600; color:#FF9834;`;
            rankEl.textContent = item.rank;
            row.appendChild(rankEl);
            const nameEl = document.createElement('span');
            nameEl.style.cssText = `flex:1;`;
            nameEl.textContent = item.name;
            row.appendChild(nameEl);
            const valEl = document.createElement('span');
            valEl.style.cssText = `font-weight:600; color:#333;`;
            valEl.textContent = item.value;
            row.appendChild(valEl);
            listEl.appendChild(row);
        });
    }

    const ranking = {
        get visible() { return visible; },
        show(varId, direction = 'positive') {
            ensureContainer();
            currentVar = varId;
            currentDir = direction;
            visible = true;
            container.style.display = '';
            updateList();
        },
        hide() {
            visible = false;
            if (container) container.style.display = 'none';
        },
    };

    window.__ranking__ = ranking;

    core.app.ticker.add(() => {
        if (visible && currentVar) {
            updateList();
        }
    });
}

export { installRanking };
