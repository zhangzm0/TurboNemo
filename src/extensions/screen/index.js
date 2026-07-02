// src/extensions/screen/index.js
export default {
    name: 'screen',
    version: '1.0.0',
    initData: { scenes: 'scenes.scenes_dict', scenesOrder: 'scenes.scenes_order' },
    init(core, data) {
        const w = core.width, h = core.height;
        // 建立场景 ID → 名称映射，供 self_on_tap 的 sprite 字段解析使用
        core.actorManager._sceneIdToName = {};
        for (const [id, d] of Object.entries(data.scenes || {})) {
            core.actorManager._sceneIdToName[id] = d.name;
        }
        for (const id of (data.scenesOrder || [])) {
            const d = data.scenes?.[id];
            if (!d) continue;
            const tex = core.assetLoader.getTexture(d.current_style_id) || PIXI.Texture.WHITE;
            const screen = core.screenManager.createScreen(d.name, tex, w, h);
            const bg = screen.bg;
            for (const sid of (d.styles || [])) {
                const tex2 = core.assetLoader.getTexture(sid);
                if (tex2) bg.addCostume(tex2);
            }
            if (d.styles && d.current_style_id) {
                bg.setCostume(d.styles.indexOf(d.current_style_id) + 1);
            }
        }
        if (core.screenManager.list.length > 0) core.screenManager.switchTo(1);
    },
    install(core) {
        const _orig = core.screenManager.switchTo.bind(core.screenManager);
        core.screenManager.switchTo = function(index) {
            _orig(index, (fromName, toName) => {
                core.eventBus.emit('screen:switched', { from: fromName, to: toName });
                core.eventBus.emit(`screen:activated:${toName}`);
                const to = this._current || this.list.find(s => s.name === toName);
                if (to && to.taskIds) {
                    for (const actorName of to.taskIds) {
                        core.eventBus.emit(`screen:activated:${actorName}`);
                    }
                }
                if (to) {
                    // Resume scene-level scripts by screen name
                    core.scheduler.resumeEntityTasks(to.name);
                    // Resume actor-level scripts
                    if (to.taskIds) {
                        for (const actorName of to.taskIds) {
                            core.scheduler.resumeEntityTasks(actorName);
                        }
                    }
                }
            });
        };
        core.screenManager.width = core.width;
        core.screenManager.height = core.height;
        core.globalHook('__screens__', () => core.screenManager);
        core.screenHook('broadcast', () => ({
            send(msg) { core.eventBus.emit(`broadcast:${msg}`, { message: msg }); },
        }));
        // 为所有背景精灵添加指针事件，支持 self_on_tap
        for (const screen of core.screenManager.list) {
            const bgSprite = screen.bg?.sprite;
            if (!bgSprite) continue;
            bgSprite.interactive = true;
            bgSprite.on('pointertap', () => core.eventBus.emit(`actor:pointertap:${screen.name}`));
            bgSprite.on('pointerdown', () => core.eventBus.emit(`actor:pointerdown:${screen.name}`));
            bgSprite.on('pointerup', () => core.eventBus.emit(`actor:pointerup:${screen.name}`));
            bgSprite.on('pointerupoutside', () => core.eventBus.emit(`actor:pointerup:${screen.name}`));
        }

        // 延迟到第一帧发出初始 screen:activated，让所有 on_running_group_activated 脚本启动
        const firstScreen = core.screenManager.getCurrent();
        if (firstScreen && core.app?.ticker) {
            const activate = () => {
                core.eventBus.emit(`screen:activated:${firstScreen.name}`);
                if (firstScreen.taskIds) {
                    for (const actorName of firstScreen.taskIds) {
                        core.eventBus.emit(`screen:activated:${actorName}`);
                    }
                }
                core.app.ticker.remove(activate);
            };
            core.app.ticker.add(activate);
        }
    },
};
