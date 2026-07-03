// test-compile.js — 在浏览器控制台粘贴本脚本，dump 所有编译产物
// 用法: 在加载了作品的页面上，F12 打开控制台粘贴运行

(function() {
    const tasks = Object.values(core.scheduler._all);
    console.log('='.repeat(60));
    console.log(`总计 ${tasks.length} 个任务`);
    console.log('='.repeat(60));

    for (const t of tasks) {
        if (!t._restart) continue;
        console.log('');
        console.log(`%c【${t.entityName}】${t._restart.hatType}`, 'font-weight:bold;font-size:13px;color:#4CAF50');
        console.log(`  taskId: ${t.taskId}, state: ${t.state}`);

        // 编译产物源码
        console.log(`%c── 生成代码 ──`, 'font-weight:bold;color:#888');
        console.log(t._restart.code);

        // Block tree (JSON)
        if (t._restart.blockTree) {
            console.log(`%c── Block 树 ──`, 'font-weight:bold;color:#888');
            console.log(JSON.stringify(t._restart.blockTree, null, 2));
        }
    }

    // 克隆体信息
    console.log('');
    console.log('%c═══ 克隆体信息 ═══', 'font-weight:bold;font-size:13px;color:#FF9800');
    const clones = core.actorManager._clones || {};
    console.log(`克隆体总数: ${Object.keys(clones).length}`);
    for (const [cn, pn] of Object.entries(clones)) {
        const actor = core.actorManager._byName[cn];
        const idx = core.actorManager.getCloneIndex(cn);
        console.log(`  #${idx} ${cn} (proto: ${pn}) exists=${!!actor} pos=(${actor?.sprite?.x?.toFixed(1)}, ${actor?.sprite?.y?.toFixed(1)})`);
    }

    // _idToName 映射
    console.log('');
    console.log('%c═══ ID→Name 映射 ═══', 'font-weight:bold;font-size:13px;color:#03A9F4');
    for (const [id, name] of Object.entries(core.actorManager._idToName || {})) {
        console.log(`  ${id} → ${name}`);
    }

    // 关键变量
    console.log('');
    console.log('%c═══ 全局变量 ═══', 'font-weight:bold;font-size:13px;color:#9C27B0');
    const globalObj = {};
    for (const [name, factory] of Object.entries(core._globalHooks || {})) {
        globalObj[name] = factory();
    }
    for (const [k, v] of Object.entries(globalObj)) {
        if (typeof v !== 'function' && typeof v !== 'object') {
            console.log(`  ${k} = ${v}`);
        }
    }

    // 遍历所有角色的 _vars
    console.log('');
    console.log('%c═══ 角色变量 ═══', 'font-weight:bold;font-size:13px;color:#9C27B0');
    for (const actor of core.actorManager.list) {
        if (actor._vars && Object.keys(actor._vars).length > 0) {
            console.log(`【${actor.name}】`);
            for (const [vk, vv] of Object.entries(actor._vars)) {
                console.log(`  ${vk} = ${vv}`);
            }
        }
    }
})();
