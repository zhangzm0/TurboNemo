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
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s, l];
}

function hsl_to_hex(h, s, l) {
    h = h % 360; if (h < 0) h += 360;
    const f = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(f(p, q, h / 360 + 1/3) * 255);
    const g = Math.round(f(p, q, h / 360) * 255);
    const b = Math.round(f(p, q, h / 360 - 1/3) * 255);
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const penStyle = {
    size: 1,
    color: '000000',
    alpha: 1,
    hue: 0,
    saturation: 0,
    brightness: 0,
    fillColor: '000000',
    _r: 0, _g: 0, _b: 0,
    _fillR: 0, _fillG: 0, _fillB: 0,
};

function updateColorCache() {
    const hex = penStyle.color;
    penStyle._r = parseInt(hex.slice(0, 2), 16);
    penStyle._g = parseInt(hex.slice(2, 4), 16);
    penStyle._b = parseInt(hex.slice(4, 6), 16);
}

function updateFillColorCache() {
    const hex = penStyle.fillColor;
    penStyle._fillR = parseInt(hex.slice(0, 2), 16);
    penStyle._fillG = parseInt(hex.slice(2, 4), 16);
    penStyle._fillB = parseInt(hex.slice(4, 6), 16);
}

function isScreen(c) { return c.target === 'screen'; }

export default {
    name: 'pen',
    version: '1.0.0',
    blocks: {
        'self_pen_down': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                return `    __global__.__pen__.down(self);\n` + c.compileNext(b);
            },
        },
        'self_pen_up': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                return `    __global__.__pen__.up(self);\n` + c.compileNext(b);
            },
        },
        'clear_drawing': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                return `    __global__.__pen__.clear();\n` + c.compileNext(b);
            },
        },
        'self_set_pen_size': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const size = c.compileValue(b, 'size');
                return `    __global__.__pen__.setSize(${size});\n` + c.compileNext(b);
            },
        },
        'self_change_pen_size': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const steps = c.compileValue(b, 'steps');
                return `    __global__.__pen__.changeSize(${steps});\n` + c.compileNext(b);
            },
        },
        'self_set_pen_color': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const color = (b.querySelector(':scope > field[name="color"]')?.textContent.trim() || '#cc66cc').slice(1);
                return `    __global__.__pen__.setColor('${color}');\n` + c.compileNext(b);
            },
        },
        'self_set_pen_color_property': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const type = c.extractParams(b).scope;
                const val = c.compileValue(b, 'val');
                if (type === 'hue') return `    __global__.__pen__.setHue(${val});\n` + c.compileNext(b);
                if (type === 'saturation') return `    __global__.__pen__.setSaturation((${val}) / 100);\n` + c.compileNext(b);
                if (type === 'brightness') return `    __global__.__pen__.setBrightness((${val}) / 100);\n` + c.compileNext(b);
                if (type === 'alpha') return `    __global__.__pen__.setAlpha((100 - (${val})) / 100);\n` + c.compileNext(b);
                return c.compileNext(b) || '';
            },
        },
        'self_change_pen_color_property': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const type = c.extractParams(b).scope;
                const steps = c.compileValue(b, 'steps');
                if (type === 'hue') return `    __global__.__pen__.changeHue(${steps});\n` + c.compileNext(b);
                if (type === 'saturation') return `    __global__.__pen__.changeSaturation((${steps}) / 100);\n` + c.compileNext(b);
                if (type === 'brightness') return `    __global__.__pen__.changeBrightness((${steps}) / 100);\n` + c.compileNext(b);
                if (type === 'alpha') return `    __global__.__pen__.changeAlpha(-(${steps}) / 100);\n` + c.compileNext(b);
                return c.compileNext(b) || '';
            },
        },
        'set_fill_path': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const point = c.extractParams(b).point;
                if (point === 'start') {
                    return `    __global__.__pen__.fillStart(self);\n` + c.compileNext(b);
                }
                return `    __global__.__pen__.fillEnd(self);\n` + c.compileNext(b);
            },
        },
        'set_fill_style': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const color = (b.querySelector(':scope > field[name="style"]')?.textContent.trim() || '#cc66cc').slice(1);
                return `    __global__.__pen__.setFillColor('${color}');\n` + c.compileNext(b);
            },
        },
        'stamp': {
            generator(c, b) {
                if (isScreen(c)) return c.compileNext(b) || '';
                const text = c.compileValue(b, 'TEXT') || "''";
                const size = c.compileValue(b, 'SIZE') || '24';
                return `    __global__.__pen__.stamp(${text}, ${size}, self);\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        updateColorCache();
        updateFillColorCache();

        const states = new Map();
        let dirty = false;

        function getState(actor) {
            let st = states.get(actor.name);
            if (!st) {
                st = { down: false, lastX: null, lastY: null, filling: false, fillPath: null };
                states.set(actor.name, st);
            }
            return st;
        }

        function getPen() {
            return core.screenManager.getCurrent()?.penCanvas;
        }

        function toCanvasX(sx) { return core.width / 2 + sx; }
        function toCanvasY(sy) { return core.height / 2 + sy; }

        function flush() {
            if (!dirty) return;
            const pen = getPen();
            if (pen) pen.texture.update();
            dirty = false;
        }

        function onActorMove(actor) {
            const st = getState(actor);
            if (!st.down) return;
            const x = actor.sprite.x;
            const y = actor.sprite.y;
            if (st.lastX === null) { st.lastX = x; st.lastY = y; return; }
            // if (x === st.lastX && y === st.lastY) return;
            const pen = getPen();
            if (!pen) return;
            const ctx = pen.ctx;
            ctx.save();
            ctx.lineWidth = penStyle.size;
            ctx.strokeStyle = `rgb(${penStyle._r},${penStyle._g},${penStyle._b})`;
            ctx.globalAlpha = penStyle.alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (st.filling) {
                ctx.lineTo(toCanvasX(x), toCanvasY(y));
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(toCanvasX(st.lastX), toCanvasY(st.lastY));
                ctx.lineTo(toCanvasX(x), toCanvasY(y));
                ctx.stroke();
            }
            ctx.restore();
            st.lastX = x;
            st.lastY = y;
            dirty = true;
        }

        const penApi = {
            down(actor) {
                const st = getState(actor);
                if (st.down) return;
                st.down = true;
                st.lastX = actor.sprite.x;
                st.lastY = actor.sprite.y;
                core.eventBus.on(`actor:moved:${actor.name}`, onActorMove);
            },
            up(actor) {
                const st = getState(actor);
                if (!st.down) return;
                st.down = false;
                st.lastX = null;
                st.lastY = null;
                core.eventBus.off(`actor:moved:${actor.name}`, onActorMove);
            },
            clear() {
                const pen = getPen();
                if (!pen) return;
                pen.ctx.clearRect(0, 0, core.width, core.height);
                dirty = true;
            },
            setSize(v) { penStyle.size = clamp(v, 1, 10000); },
            changeSize(d) { penStyle.size = clamp(penStyle.size + d, 1, 10000); },
            setColor(hex) {
                penStyle.color = hex;
                updateColorCache();
                const hsl = hex_to_hsl(hex);
                penStyle.hue = hsl[0];
                penStyle.saturation = hsl[1];
                penStyle.brightness = hsl[2];
            },
            setHue(h) {
                h = h % 360; if (h < 0) h += 360;
                penStyle.hue = h;
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
                updateColorCache();
            },
            changeHue(d) { this.setHue(penStyle.hue + d); },
            setSaturation(s) {
                penStyle.saturation = clamp(s, 0, 1);
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
                updateColorCache();
            },
            changeSaturation(d) { this.setSaturation(penStyle.saturation + d); },
            setBrightness(b) {
                penStyle.brightness = clamp(b, 0, 1);
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
                updateColorCache();
            },
            changeBrightness(d) { this.setBrightness(penStyle.brightness + d); },
            setAlpha(a) { penStyle.alpha = clamp(a, 0, 1); },
            changeAlpha(d) { penStyle.alpha = clamp(penStyle.alpha + d, 0, 1); },
            setFillColor(hex) {
                penStyle.fillColor = hex;
                updateFillColorCache();
            },
            fillStart(actor) {
                const st = getState(actor);
                st.filling = true;
                st.fillPath = [];
                const pen = getPen();
                if (!pen) return;
                const ctx = pen.ctx;
                ctx.save();
                ctx.fillStyle = `rgb(${penStyle._fillR},${penStyle._fillG},${penStyle._fillB})`;
                ctx.lineWidth = penStyle.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(toCanvasX(actor.sprite.x), toCanvasY(actor.sprite.y));
            },
            fillEnd(actor) {
                const st = getState(actor);
                const pen = getPen();
                if (pen && st.filling) {
                    const ctx = pen.ctx;
                    ctx.lineTo(toCanvasX(actor.sprite.x), toCanvasY(actor.sprite.y));
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                    dirty = true;
                }
                st.filling = false;
                st.fillPath = null;
            },
            stamp(text, size, actor) {
                const pen = getPen();
                if (!pen) return;
                const ctx = pen.ctx;
                ctx.save();
                ctx.font = `bold ${clamp(size || 24, 1, 10000)}px Arial, Microsoft YaHei`;
                ctx.fillStyle = `rgb(${penStyle._r},${penStyle._g},${penStyle._b})`;
                ctx.globalAlpha = penStyle.alpha;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(String(text), toCanvasX(actor.sprite.x), toCanvasY(actor.sprite.y));
                ctx.restore();
                dirty = true;
            },
        };

        core.globalHook('__pen__', () => penApi);

        function createPenLayer(screen) {
            const canvas = document.createElement('canvas');
            canvas.width = core.width;
            canvas.height = core.height;
            const texture = PIXI.Texture.from(canvas);
            const sprite = new PIXI.Sprite(texture);
            sprite.name = 'pen';
            sprite.x = -core.width / 2;
            sprite.y = -core.height / 2;
            screen.container.addChildAt(sprite, screen.container.getChildIndex(screen.actorLayer));
            return { canvas, ctx: canvas.getContext('2d'), sprite, texture };
        }

        core.screenHook('penCanvas', (screen) => createPenLayer(screen));

        for (const screen of core.screenManager.list) {
            if (!screen.penCanvas) {
                screen.penCanvas = createPenLayer(screen);
            }
        }

        core.app.ticker.add(() => flush());
    },
};