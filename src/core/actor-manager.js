// src/core/actor-manager.js
import { Actor } from './actor.js';
import { getTexturePixelData } from './hitarea.js';

const _point = new PIXI.Point();  // reusable temp point for hitTest loop
const MIN_PIXELS_FOR_COLLISION = 5;
const COLLISION_STEP = 2;

class ActorManager {
    constructor() {
        this.list = [];
        this._byName = {};
        this._clones = {};
        this._selfHooks = {};
        this.MAX_CLONES = 300;
        this._spritePool = [];
    }

    reset() {
        for (const actor of this.list) {
            if (actor.sprite.parent) actor.sprite.parent.removeChild(actor.sprite);
            actor.sprite.removeAllListeners();
        }
        this._spritePool = [];
        this.list = [];
        this._byName = {};
        this._clones = {};
    }

    _recycleSprite(sprite) {
        if (sprite.parent) sprite.parent.removeChild(sprite);
        sprite.removeAllListeners();
        this._spritePool.push(sprite);
    }

    _acquireSprite(texture) {
        if (this._spritePool.length > 0) {
            const sprite = this._spritePool.pop();
            sprite.texture = texture;
            return sprite;
        }
        return new PIXI.Sprite(texture);
    }

    createActor(name, sprite) {
        const actor = new Actor(sprite, name);
        actor._eventBus = this._eventBus;
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
        const newSprite = this._acquireSprite(proto.sprite.texture);
        newSprite.anchor.set(0.5, 0.5);
        newSprite.x = proto.sprite.x;
        newSprite.y = proto.sprite.y;
        newSprite.scale.copyFrom(proto.sprite.scale);
        newSprite.rotation = proto.sprite.rotation;
        newSprite.visible = proto.sprite.visible;
        newSprite.alpha = proto.sprite.alpha;
        newSprite.interactive = true;
        newSprite.buttonMode = true;

        let tapGuard = false;
        newSprite.on('pointertap', () => {
            if (tapGuard) return;
            tapGuard = true;
            requestAnimationFrame(() => { tapGuard = false; });
            this._eventBus?.emit(`actor:pointertap:${cloneName}`);
        });
        newSprite.on('pointerdown', () => this._eventBus?.emit(`actor:pointerdown:${cloneName}`));
        newSprite.on('pointerup', () => this._eventBus?.emit(`actor:pointerup:${cloneName}`));
        newSprite.on('pointerupoutside', () => this._eventBus?.emit(`actor:pointerup:${cloneName}`));

        const clone = new Actor(newSprite, cloneName);
        clone._eventBus = this._eventBus;
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
            this._recycleSprite(this._byName[cloneName].sprite);
            delete this._byName[cloneName];
            this.list = this.list.filter(a => a.name !== cloneName);
        }
        delete this._clones[cloneName];
        this._eventBus?.emit('clone:removed', { cloneName });
    }

    hitTest(a, b) {
        if (!a || !b) return false;
        // AABB quick rejection (same as official check_bumped_other)
        const ba = a.getBounds(), bb = b.getBounds();
        if (!(ba.x < bb.x + bb.width && ba.x + ba.width > bb.x && ba.y < bb.y + bb.height && ba.y + ba.height > bb.y)) {
            return false;
        }

        // Compute intersection rectangle
        const left   = Math.max(ba.x, bb.x);
        const right  = Math.min(ba.x + ba.width, bb.x + bb.width);
        const top    = Math.max(ba.y, bb.y);
        const bottom = Math.min(ba.y + ba.height, bb.y + bb.height);

        // Tiny sprites (area < 10) need only 1 overlapping pixel, matching official
        const isTiny = a.width * a.height < 10 || b.width * b.height < 10;
        let collisionPixels = 0;

        for (let x = left; x < right; x += COLLISION_STEP) {
            _point.x = x;
            for (let y = top; y < bottom; y += COLLISION_STEP) {
                _point.y = y;
                if (this._isTouching(a, _point) && this._isTouching(b, _point)) {
                    collisionPixels++;
                    if (isTiny) return true;
                    if (collisionPixels >= MIN_PIXELS_FOR_COLLISION) return true;
                }
            }
        }
        return false;
    }

    /** Check if a global point lands on a non-transparent pixel of the sprite.
     *  Matches official Actor.is_touching: global→local→texture→alpha check. */
    _isTouching(sprite, globalPoint) {
        if (!sprite.visible || !sprite.texture?.valid || !sprite.parent) return false;

        // Prefer the cached pixel hitArea (already has 0.7x Uint32 data per texture).
        // hitArea.contains(localX, localY) matches the official alpha check.
        // Note: must NOT pass _point as output here — toLocal would overwrite globalPoint.
        if (sprite.hitArea) {
            const local = sprite.toLocal(globalPoint);
            return sprite.hitArea.contains(local.x, local.y);
        }

        // Fallback: build pixel data on demand using the same cache as hitarea.js
        const pd = getTexturePixelData(sprite.texture);
        if (pd) {
            const local = sprite.toLocal(globalPoint);
            const px = Math.floor((local.x + pd.texW / 2) * 0.7);
            const py = Math.floor((local.y + pd.texH / 2) * 0.7);
            if (px < 0 || px >= pd.sw || py < 0 || py >= pd.sh) return false;
            return (pd.pixelData[py * pd.sw + px] >>> 24) > 0;
        }

        // No pixel data at all — AABB fallback (edge case, shouldn't normally happen)
        return true;
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