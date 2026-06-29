// src/core/actor-manager.js
import { Actor } from './actor.js';
import { getPixelHitArea } from './hitarea.js';

class ActorManager {
    constructor() {
        this.list = [];
        this._byName = {};
        this._clones = {};
        this._selfHooks = {};
        this.MAX_CLONES = 300;
    }

    createActor(name, sprite) {
        const actor = new Actor(sprite, name);
        this.list.push(actor);
        this._byName[name] = actor;
        for (const [hookName, factory] of Object.entries(this._selfHooks || {})) {
            actor[hookName] = factory(actor);
        }
        return actor;
    }

    getByName(name) { return this._byName[name] || null; }

    // core/actor-manager.js - cloneActor 方法
    cloneActor(protoName, newName) {
        const proto = this._byName[protoName];
        if (!proto) return null;

        // 达到上限时，销毁该原型最早创建的克隆体
        const count = this.getCloneCount(protoName);
        if (count >= this.MAX_CLONES) {
            for (const [cn, pn] of Object.entries(this._clones)) {
                if (pn === protoName && this._byName[cn]) {
                    this.removeClone(cn);
                    break;
                }
            }
        }

        const cloneName = newName || `${protoName}_clone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newSprite = new PIXI.Sprite(proto.sprite.texture);
        newSprite.anchor.set(0.5, 0.5);
        newSprite.x = proto.sprite.x;
        newSprite.y = proto.sprite.y;
        newSprite.scale.copyFrom(proto.sprite.scale);
        newSprite.rotation = proto.sprite.rotation;
        newSprite.visible = proto.sprite.visible;
        newSprite.alpha = proto.sprite.alpha;
        newSprite.interactive = true;
        newSprite.buttonMode = true;
        const hitArea = getPixelHitArea(proto.sprite.texture);
        if (hitArea) newSprite.hitArea = hitArea;

        newSprite.on('pointertap', () => this._eventBus?.emit(`actor:pointertap:${cloneName}`));
        newSprite.on('pointerdown', () => this._eventBus?.emit(`actor:pointerdown:${cloneName}`));
        newSprite.on('pointerup', () => this._eventBus?.emit(`actor:pointerup:${cloneName}`));
        newSprite.on('pointerupoutside', () => this._eventBus?.emit(`actor:pointerup:${cloneName}`));

        const clone = new Actor(newSprite, cloneName);
        clone.isClone = true;
        clone._protoName = protoName;
        clone.costumes = { ...proto.costumes };
        clone.currentCostume = proto.currentCostume;
        clone.camp = proto.camp;

        for (const [hookName, factory] of Object.entries(this._selfHooks || {})) {
            clone[hookName] = factory(clone);
        }

        this.list.push(clone);
        this._byName[cloneName] = clone;
        this._clones[cloneName] = protoName;

        if (clone.setCostume) clone.setCostume(clone.currentCostume);
        if (proto.sprite.parent) proto.sprite.parent.addChild(newSprite);

        return clone;
    }

    getCloneIndex(cloneName) {
        const protoName = this._clones[cloneName];
        if (!protoName) return 0;
        let index = 1;
        for (const [cn, pn] of Object.entries(this._clones)) {
            if (pn === protoName) {
                if (cn === cloneName) return index;
                if (this._byName[cn]) index++;
            }
        }
        return 0;
    }

    getCloneByIndex(protoName, index) {
        let i = 1;
        for (const [cn, pn] of Object.entries(this._clones)) {
            if (pn === protoName && this._byName[cn]) {
                if (i === index) return this._byName[cn];
                i++;
            }
        }
        return null;
    }

    removeClone(cloneName) {
        if (this._byName[cloneName]) {
            // 先停掉该克隆体的所有任务
            if (this._stopCloneTasks) {
                this._stopCloneTasks(cloneName);
            }
            this._byName[cloneName].sprite.destroy({ children: false, texture: false, baseTexture: false });
            delete this._byName[cloneName];
            this.list = this.list.filter(a => a.name !== cloneName);
        }
        delete this._clones[cloneName];
        this._eventBus?.emit('clone:removed', { cloneName });
    }

    hitTest(a, b) {
        if (!a || !b) return false;
        const ba = a.getBounds(), bb = b.getBounds();
        return ba.x < bb.x + bb.width && ba.x + ba.width > bb.x && ba.y < bb.y + bb.height && ba.y + ba.height > bb.y;
    }
    isClone(name) { return name in this._clones; }
    getCloneCount(protoName) {
        let count = 0;
        for (const [cn, pn] of Object.entries(this._clones)) {
            if (pn === protoName && this._byName[cn]) count++;
        }
        return count;
    }
}

export { ActorManager };