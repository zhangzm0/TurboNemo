// src/extensions/pen/pen.js
class Pen {
    constructor(graphics) {
        this.graphics = graphics;
        this.down = false;
        this.size = 2;
        this.color = '#cc66cc';
        this.lastX = null;
        this.lastY = null;
        this.filling = false;
        this.fillColor = '#cc66cc';
    }

    clear() {
        this.graphics.clear();
    }

    stamp(text, size, x, y) {
        const t = new PIXI.Text(String(text), {
            fontSize: size || 24,
            fill: this.color,
            fontFamily: 'sans-serif',
        });
        t.anchor.set(0.5, 0.5);
        t.x = x;
        t.y = y;
        this.graphics.addChild(t);
    }

    fillStart(x, y) {
        this.graphics.beginFill(stringToColor(this.fillColor), 1);
        this.graphics.moveTo(x, y);
        this.filling = true;
    }

    fillEnd(x, y) {
        this.graphics.lineTo(x, y);
        this.graphics.endFill();
        this.filling = false;
    }

    line(x, y) {
        if (!this.down) return;
        if (this.lastX === null) {
            this.lastX = x;
            this.lastY = y;
            return;
        }
        if (x === this.lastX && y === this.lastY) return;

        if (this.filling) {
            this.graphics.lineTo(x, y);
        } else {
            this.graphics.lineStyle(this.size, stringToColor(this.color), 1);
            this.graphics.moveTo(this.lastX, this.lastY);
            this.graphics.lineTo(x, y);
        }
        this.lastX = x;
        this.lastY = y;
    }

    up() {
        this.down = false;
        this.lastX = null;
        this.lastY = null;
    }
}

function stringToColor(str) {
    if (str && str.startsWith('#')) {
        return parseInt(str.slice(1), 16);
    }
    return 0xcc66cc;
}

export { Pen, stringToColor };