// src/extensions/actor/index.js
// src/extensions/actor/index.js
import PPI from '../ppi.js';

function ppiCheck(sprite, e, threshold) {
    const pos = e.getLocalPosition(sprite);
    const xline = Math.floor(pos.x + sprite.width / 2);
    const yline = Math.floor(pos.y + sprite.height / 2);
    return PPI.solve(sprite, xline, yline) > threshold;
}

export default {
    name: 'actor',
    version: '1.0.0',
    initData: { actors: 'actors.actors_dict', styles: 'styles.styles_dict' },
    init(core, data) {
        const bcm = core.assetLoader.bcm;
        core.actorManager._idToName = {};
        for (const [actorId, actorData] of Object.entries(data.actors || {})) {
            core.actorManager._idToName[actorId] = actorData.name;
            const styleId = actorData.current_style_id;
            const tex = core.assetLoader.getTexture(styleId) || PIXI.Texture.WHITE;
            const sprite = new PIXI.Sprite(tex);
            sprite.anchor.set(0.5, 0.5);
            sprite.x = actorData.x || 0;
            sprite.y = -(actorData.y || 0);
            sprite.rotation = -(actorData.rotation || 0);
            sprite.scale.set((actorData.scale || 100) / 100);
            sprite.visible = actorData.visible !== false;
            sprite.interactive = true;
            sprite.buttonMode = true;
            const actor = core.actorManager.createActor(actorData.name, sprite);
            for (const sid of (actorData.styles || [])) {
                const tex2 = core.assetLoader.getTexture(sid);
                const def = data.styles?.[sid];
                if (tex2) actor.costumes[sid] = { texture: tex2, cp: def?.center_point || { x: 0, y: 0 } };
            }
            if (styleId && actorData.styles) actor.setCostume(actorData.styles.indexOf(styleId) + 1);
            const sceneData = bcm.scenes.scenes_dict[actorData.scene_id];
            if (sceneData) {
                const screen = core.screenManager.getByName(sceneData.name);

                if (screen) { screen.actorLayer.addChild(sprite); screen.taskIds.push(actorData.name); actor.__screen__ = screen; }
            }
            const threshold = PPI.threshold;
            sprite.on('pointertap', (e) => {
                if (!ppiCheck(sprite, e, threshold)) return;
                core.eventBus.emit(`actor:pointertap:${actor.name}`);
            });
            sprite.on('pointerdown', (e) => {
                if (!ppiCheck(sprite, e, threshold)) return;
                core.eventBus.emit(`actor:pointerdown:${actor.name}`);
            });
            sprite.on('pointerup', () => core.eventBus.emit(`actor:pointerup:${actor.name}`));
            sprite.on('pointerupoutside', () => core.eventBus.emit(`actor:pointerup:${actor.name}`));
        }
    },
    install(core) {
        PPI.renderer = core.app.renderer;
        core.actorManager._eventBus = core.eventBus;
        core.screenHook('__actors__', () => core.actorManager);
        core.globalHook('__actors__', () => core.actorManager);
    },
};