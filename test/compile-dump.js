// test/compile-dump.js
// 查询参数: ?url=<BCM_URL> 加载指定 BCM

const params = new URLSearchParams(window.location.search);
const bcmUrl = params.get('url');

(async function() {
    if (!bcmUrl) {
        document.getElementById('loading').textContent = '添加 ?url=<BCM_URL>';
        document.getElementById('loading').style.color = '#f38ba8';
        return;
    }
    const resp = await fetch(bcmUrl);
    const bcm = await resp.json();
    document.title = `compile-dump: ${bcm.project_name}`;

    // 加载内核
    const { Compiler } = await import('../src/core/compiler.js');
    const { Registry } = await import('../src/core/registry.js');

    const registry = new Registry();

    // 注册基础块
    const { baseBlocks } = await import('../src/blocks/base.js');
    const { eventBlocks } = await import('../src/blocks/events.js');
    const { controlBlocks } = await import('../src/blocks/control.js');
    registry.registerAll(baseBlocks);
    registry.registerAll(eventBlocks);
    registry.registerAll(controlBlocks);

    // 加载所有扩展
    const exts = [
        'motion', 'looks', 'operators', 'data', 'sensing',
        'clone', 'sound', 'pen', 'procedures', 'broadcast',
    ];
    for (const name of exts) {
        try {
            const mod = await import(`../src/extensions/${name}/index.js`);
            registry.registerAll(mod.default.blocks || {});
        } catch(e) {
            console.warn(`扩展 ${name} 加载失败:`, e.message);
        }
    }

    const compiler = new Compiler(registry);

    // 变量 ID→名称 映射
    const nameMap = {};
    if (bcm.variable?.variable_dict) {
        for (const [id, def] of Object.entries(bcm.variable.variable_dict)) {
            nameMap[id] = def.name;
        }
    }

    const out = document.getElementById('output');
    function addSection(title, content, lang = 'js') {
        const h = document.createElement('h2');
        h.textContent = title;
        out.appendChild(h);
        const pre = document.createElement('pre');
        if (lang === 'json') {
            pre.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        } else {
            pre.textContent = content;
        }
        pre.className = `lang-${lang}`;
        out.appendChild(pre);
    }

    addSection('项目信息', `${bcm.project_name} — ${Object.keys(bcm.actors.actors_dict).length} 个角色`, 'json');

    // 编译每个角色
    for (const actorData of Object.values(bcm.actors.actors_dict)) {
        if (!actorData.blocksXML) continue;

        addSection(`角色: ${actorData.name} (${actorData.id})`, `可见: ${actorData.visible}, 位置: (${actorData.x}, ${actorData.y}), 造型数: ${(actorData.styles||[]).length}`, 'json');

        const scripts = compiler.compile(actorData.blocksXML, actorData.name, 'actor', nameMap);

        for (const script of scripts) {
            addSection(`  ${script.hatType}`, script.code, 'js');
        }
    }

    addSection('注册的所有块类型', Array.from(registry._entries.keys()).sort().join('\n'), 'json');
})();
