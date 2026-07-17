// src/core/background.js
class Background {
    constructor(tilingSprite, name) {
        this.sprite = tilingSprite;
        this.name = name;
        this.type = 'background';
        this.costumes = [];
        this.currentCostume = 0;
    }

    // 统一 scroll 语义 — 运动 hook 注入时会被跳过 (backfill 检查 !s.bg[name])
    __moveTo(x, y) { this.sprite.tilePosition.x = x; this.sprite.tilePosition.y = -y; }
    __setX(x)  { this.sprite.tilePosition.x = x; }
    __setY(y)  { this.sprite.tilePosition.y = -y; }
    __addX(dx) { this.sprite.tilePosition.x += dx; }
    __addY(dy) { this.sprite.tilePosition.y -= dy; }

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