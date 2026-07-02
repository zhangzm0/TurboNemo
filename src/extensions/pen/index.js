// src/extensions/pen/index.js
function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function hex_to_hsl(hex) {
    let r = parseInt(hex.slice(0, 2), 16) / 255;
    let g = parseInt(hex.slice(2, 4), 16) / 255;
    let b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return [h * 360, s, l];
}

function hsl_to_hex(h, s, l) {
    h = h % 360;
    if (h < 0) h += 360;
    const f = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(f(p, q, h / 360 + 1 / 3) * 255);
    const g = Math.round(f(p, q, h / 360) * 255);
    const b = Math.round(f(p, q, h / 360 - 1 / 3) * 255);
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------- Brush 类 ----------
class Brush {
    constructor(canvas, ctx, actor, eventBus, onDirty) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.actor = actor;
        this.eventBus = eventBus;
        this.onDirty = onDirty;
        this.size = 5;
        this.color = "000000";
        this.alpha = 1;
        this.hsl = [0, 0, 0];
        this.fillColor = null;
        this._r = 0;
        this._g = 0;
        this._b = 0;
        this._fillR = 0;
        this._fillG = 0;
        this._fillB = 0;
        this.updateColorCache();
        this.updateFillColorCache();
        this.down = false;
        this.lastX = null;
        this.lastY = null;
        this.filling = false;
        this.fillPoints = [];

        this._onMove = () => {
            if (this.down && this.actor.sprite) {
                this.drawLine(this.actor.sprite.x, this.actor.sprite.y);
            }
        };
        this._onFillMove = () => {
            if (this.filling && this.actor.sprite) {
                this.addFillPoint(this.actor.sprite.x, this.actor.sprite.y);
            }
        };
    }

    updateColorCache() {
        const hex = this.color;
        this._r = parseInt(hex.slice(0, 2), 16);
        this._g = parseInt(hex.slice(2, 4), 16);
        this._b = parseInt(hex.slice(4, 6), 16);
    }
    updateFillColorCache() {
        if (!this.fillColor) return;
        const hex = this.fillColor;
        this._fillR = parseInt(hex.slice(0, 2), 16);
        this._fillG = parseInt(hex.slice(2, 4), 16);
        this._fillB = parseInt(hex.slice(4, 6), 16);
    }

    setColor(hex) {
        this.color = hex;
        this.hsl = hex_to_hsl(hex);
        this.updateColorCache();
    }
    setSize(v) {
        this.size = clamp(v, 1, 10000);
    }
    changeSize(d) {
        this.size = clamp(this.size + d, 1, 10000);
    }
    setHue(h) {
        h = h % 360;
        if (h < 0) h += 360;
        this.hsl[0] = h;
        this.color = hsl_to_hex(this.hsl[0], this.hsl[1], this.hsl[2]);
        this.updateColorCache();
    }
    changeHue(d) {
        this.setHue(this.hsl[0] + d);
    }
    setSaturation(s) {
        this.hsl[1] = clamp(s, 0, 1);
        this.color = hsl_to_hex(this.hsl[0], this.hsl[1], this.hsl[2]);
        this.updateColorCache();
    }
    changeSaturation(d) {
        this.setSaturation(this.hsl[1] + d);
    }
    setBrightness(b) {
        this.hsl[2] = clamp(b, 0, 1);
        this.color = hsl_to_hex(this.hsl[0], this.hsl[1], this.hsl[2]);
        this.updateColorCache();
    }
    changeBrightness(d) {
        this.setBrightness(this.hsl[2] + d);
    }
    setAlpha(a) {
        this.alpha = clamp(a, 0, 1);
    }
    changeAlpha(d) {
        this.alpha = clamp(this.alpha + d, 0, 1);
    }
    setFillColor(hex) {
        this.fillColor = hex;
        this.updateFillColorCache();
    }

    penDown() {
        this.down = true;
        this.lastX = this.actor.sprite.x;
        this.lastY = this.actor.sprite.y;
        this.drawLine(this.lastX, this.lastY);
        this.eventBus.on(`actor:moved:${this.actor.name}`, this._onMove);
    }
    penUp() {
        this.down = false;
        this.eventBus.off(`actor:moved:${this.actor.name}`, this._onMove);
        this.lastX = null;
        this.lastY = null;
    }
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.onDirty();
    }
    drawLine(x, y) {
        if (this.lastX === null) {
            this.lastX = x;
            this.lastY = y;
            return;
        }
        const ctx = this.ctx;
        ctx.save();
        ctx.lineWidth = this.size;
        ctx.strokeStyle = `rgb(${this._r},${this._g},${this._b})`;
        ctx.globalAlpha = this.alpha;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(this.toCanvasX(this.lastX), this.toCanvasY(this.lastY));
        ctx.lineTo(this.toCanvasX(x), this.toCanvasY(y));
        ctx.stroke();
        ctx.restore();
        this.lastX = x;
        this.lastY = y;
        this.onDirty();
    }
    fillStart(x, y) {
        if (!this.filling) {
            this.filling = true;
            this.eventBus.on(
                `actor:moved:${this.actor.name}`,
                this._onFillMove,
            );
        }
        this.fillPoints = [];
        this.fillPoints.push({ x: this.toCanvasX(x), y: this.toCanvasY(y) });
    }
    addFillPoint(x, y) {
        if (!this.filling) return;
        const cx = this.toCanvasX(x),
            cy = this.toCanvasY(y);
        const last = this.fillPoints[this.fillPoints.length - 1];
        if (last && Math.abs(last.x - cx) < 0.5 && Math.abs(last.y - cy) < 0.5)
            return;
        this.fillPoints.push({ x: cx, y: cy });
    }
    fillEnd() {
        if (!this.filling) return;
        this.eventBus.off(`actor:moved:${this.actor.name}`, this._onFillMove);
        if (this.fillPoints.length < 2) {
            this.filling = false;
            return;
        }
        const ctx = this.ctx;
        ctx.save();
        // Use fill color if explicitly set, otherwise fall back to stroke/pen color
        const r = this.fillColor ? this._fillR : this._r;
        const g = this.fillColor ? this._fillG : this._g;
        const b = this.fillColor ? this._fillB : this._b;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(this.fillPoints[0].x, this.fillPoints[0].y);
        for (let i = 1; i < this.fillPoints.length; i++) {
            ctx.lineTo(this.fillPoints[i].x, this.fillPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        this.fillPoints = [];
        this.filling = false;
        this.onDirty();
    }
    stamp(text, size, x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = `bold ${clamp(size || 24, 1, 10000)}px Arial, Microsoft YaHei`;
        ctx.fillStyle = `rgb(${this._r},${this._g},${this._b})`;
        ctx.globalAlpha = this.alpha;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(String(text), this.toCanvasX(x), this.toCanvasY(y));
        ctx.restore();
        this.onDirty();
    }
    toCanvasX(sx) {
        return this.canvas.width / 2 + sx;
    }
    toCanvasY(sy) {
        return this.canvas.height / 2 + sy;
    }
}

function isScreen(c) {
    return c.target === "screen";
}

export default {
    name: "pen",
    version: "1.0.0",
    blocks: {
        self_pen_down: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                return `    self._brush.penDown();\n` + c.compileNext(b);
            },
        },
        self_pen_up: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                return `    self._brush.penUp();\n` + c.compileNext(b);
            },
        },
        clear_drawing: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                return `    self._brush.clear();\n` + c.compileNext(b);
            },
        },
        self_set_pen_size: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const size = c.compileValue(b, "size");
                return `    self._brush.setSize(${size});\n` + c.compileNext(b);
            },
        },
        self_change_pen_size: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const steps = c.compileValue(b, "steps");
                return (
                    `    self._brush.changeSize(${steps});\n` + c.compileNext(b)
                );
            },
        },
        self_set_pen_color: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const color = (
                    b
                        .querySelector(':scope > field[name="color"]')
                        ?.textContent.trim() || "#cc66cc"
                ).slice(1);
                return (
                    `    self._brush.setColor('${color}');\n` + c.compileNext(b)
                );
            },
        },
        self_set_pen_color_property: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const type = c.extractParams(b).scope;
                const val = c.compileValue(b, "val");
                if (type === "hue")
                    return (
                        `    self._brush.setHue(${val});\n` + c.compileNext(b)
                    );
                if (type === "saturation")
                    return (
                        `    self._brush.setSaturation((${val}) / 100);\n` +
                        c.compileNext(b)
                    );
                if (type === "brightness")
                    return (
                        `    self._brush.setBrightness((${val}) / 100);\n` +
                        c.compileNext(b)
                    );
                if (type === "alpha")
                    return (
                        `    self._brush.setAlpha((100 - (${val})) / 100);\n` +
                        c.compileNext(b)
                    );
                return c.compileNext(b) || "";
            },
        },
        self_change_pen_color_property: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const type = c.extractParams(b).scope;
                const steps = c.compileValue(b, "steps");
                if (type === "hue")
                    return (
                        `    self._brush.changeHue(${steps});\n` +
                        c.compileNext(b)
                    );
                if (type === "saturation")
                    return (
                        `    self._brush.changeSaturation((${steps}) / 100);\n` +
                        c.compileNext(b)
                    );
                if (type === "brightness")
                    return (
                        `    self._brush.changeBrightness((${steps}) / 100);\n` +
                        c.compileNext(b)
                    );
                if (type === "alpha")
                    return (
                        `    self._brush.changeAlpha(-(${steps}) / 100);\n` +
                        c.compileNext(b)
                    );
                return c.compileNext(b) || "";
            },
        },
        set_fill_path: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const point = c.extractParams(b).point;
                if (point === "start") {
                    return (
                        `    self._brush.fillStart(self.sprite.x, self.sprite.y);\n` +
                        c.compileNext(b)
                    );
                }
                return `    self._brush.fillEnd();\n` + c.compileNext(b);
            },
        },
        set_fill_style: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const color = (
                    b
                        .querySelector(':scope > field[name="style"]')
                        ?.textContent.trim() || "#cc66cc"
                ).slice(1);
                return (
                    `    self._brush.setFillColor('${color}');\n` +
                    c.compileNext(b)
                );
            },
        },
        stamp: {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || "";
                const text = c.compileValue(b, "TEXT") || "''";
                const size = c.compileValue(b, "SIZE") || "24";
                return (
                    `    self._brush.stamp(${text}, ${size}, self.sprite.x, self.sprite.y);\n` +
                    c.compileNext(b)
                );
            },
        },
    },

    install(core) {
        let dirty = false;
        function markDirty() {
            dirty = true;
        }

        function createPenLayer(screen) {
            const canvas = document.createElement("canvas");
            canvas.width = core.width;
            canvas.height = core.height;
            const texture = PIXI.Texture.from(canvas);
            const sprite = new PIXI.Sprite(texture);
            sprite.name = "pen";
            sprite.x = -core.width / 2;
            sprite.y = -core.height / 2;
            screen.container.addChildAt(
                sprite,
                screen.container.getChildIndex(screen.actorLayer),
            );
            return { canvas, ctx: canvas.getContext("2d"), sprite, texture };
        }

        core.screenHook("penCanvas", (screen) => createPenLayer(screen));
        for (const screen of core.screenManager.list) {
            if (!screen.penCanvas) screen.penCanvas = createPenLayer(screen);
        }

        core.selfHook("_brush", (actor) => {
            const screen = actor.__screen__ || core.screenManager.getCurrent();
            const penCanvas = screen?.penCanvas;
            if (!penCanvas) return null;
            return new Brush(
                penCanvas.canvas,
                penCanvas.ctx,
                actor,
                core.eventBus,
                markDirty,
            );
        });

        core.app.ticker.add(() => {
            if (!dirty) return;
            for (const screen of core.screenManager.list) {
                screen.penCanvas?.texture.update();
            }
            dirty = false;
        });
    },
};
