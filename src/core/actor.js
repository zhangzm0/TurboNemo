// src/core/actor.js
class Actor {
    constructor(sprite, name) {
        this.sprite = sprite;
        this.name = name;
        this.type = 'actor';
        this.isClone = false;
        this.costumes = {};
        this.currentCostume = 0;
        this._costumeKeys = null;
        this._costumeCount = 0;
    }

    setCostume(index) {
        if (!this._costumeKeys) {
            this._costumeKeys = Object.keys(this.costumes);
            this._costumeCount = this._costumeKeys.length;
        }
        if (this._costumeCount === 0) return;
        const id = this._costumeKeys[index - 1];
        if (!id) return;
        const data = this.costumes[id];
        this.sprite.texture = data.texture;
        // Actor.setCostume
        if (data.cp.x !== this.sprite.pivot.x || data.cp.y !== this.sprite.pivot.y) {
            this.sprite.pivot.set(data.cp.x, data.cp.y);
        }
        this.currentCostume = index;
    }

    nextCostume(dir = 1) {
        if (!this._costumeKeys) {
            this._costumeKeys = Object.keys(this.costumes);
            this._costumeCount = this._costumeKeys.length;
        }
        if (this._costumeCount === 0) return;
        this.setCostume((this.currentCostume - 1 + dir + this._costumeCount) % this._costumeCount + 1);
    }
}

export { Actor };