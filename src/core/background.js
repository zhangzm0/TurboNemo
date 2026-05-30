// src/core/background.js
class Background {
    constructor(tilingSprite, name) {
        this.sprite = tilingSprite;
        this.name = name;
        this.type = 'screen';
        this.costumes = [];
        this.currentCostume = 0;
    }

    addCostume(texture) {
        this.costumes.push({ texture, cp: { x: 0, y: 0 } });
    }

    setCostume(index) {
        const data = this.costumes[index - 1];
        if (!data) return;
        this.sprite.texture = data.texture;
        this.currentCostume = index;
    }

    nextCostume(dir = 1) {
        const total = this.costumes.length;
        if (total === 0) return;
        this.setCostume((this.currentCostume - 1 + dir + total) % total + 1);
    }
}

export { Background };