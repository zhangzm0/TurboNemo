// src/extensions/actor/index.js
import { getPixelHitArea } from '../../core/hitarea.js';

export default {
    name: 'actor',
    version: '1.0.0',
    initData: { actors: 'actors.actors_dict', styles: 'styles.styles_dict' },
    init(core, data) {
        const bcm = core.assetLoader.bcm;
        core.actorManager._idToName = {};

        // Listen for costume changes → update hitArea
        core.eventBus.on('actor:costume-changed', ({ actor }) => {
            const ha = getPixelHitArea(actor.sprite.texture);
            actor.sprite.hitArea = ha || null;
        });

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
            const hitArea = getPixelHitArea(tex);
            if (hitArea) sprite.hitArea = hitArea;
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
            sprite.on('pointertap', () => core.eventBus.emit(`actor:pointertap:${actor.name}`));
            sprite.on('pointerdown', () => core.eventBus.emit(`actor:pointerdown:${actor.name}`));
            sprite.on('pointerup', () => core.eventBus.emit(`actor:pointerup:${actor.name}`));
            sprite.on('pointerupoutside', () => core.eventBus.emit(`actor:pointerup:${actor.name}`));
        }
    },
    install(core) {
        core.actorManager._eventBus = core.eventBus;
        core.screenHook('__actors__', () => core.actorManager);
        core.globalHook('__actors__', () => core.actorManager);
    },
};
