// src/extensions/screen/index.js
export default {
    name: 'screen',
    version: '1.0.0',
    initData: { scenes: 'scenes.scenes_dict', scenesOrder: 'scenes.scenes_order' },
    init(core, data) {
        const w = core.width, h = core.height;
        for (const id of (data.scenesOrder || [])) {
            const d = data.scenes?.[id];
            if (!d) continue;
            const tex = core.assetLoader.getTexture(d.current_style_id) || PIXI.Texture.WHITE;
            const screen = core.screenManager.createScreen(d.name, tex, w, h); // ✅ 用 d.name
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
            const from = this._current;
            _orig(index);
            const to = this._current;
            core.eventBus.emit('screen:switched', { from: from?.name, to: to?.name });
            core.eventBus.emit(`screen:activated:${to.name}`);
        };
        core.globalHook('__screens__', () => core.screenManager);
        core.screenHook('broadcast', () => ({
            send(msg) { core.eventBus.emit(`broadcast:${msg}`, { message: msg }); },
        }));
    },
};