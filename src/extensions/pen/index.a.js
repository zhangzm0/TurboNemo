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
};

function parseColor(hex) {
    return parseInt(hex, 16);
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
        const states = new Map();

        function getState(actor) {
            let st = states.get(actor.name);
            if (!st) {
                st = { down: false, lastX: null, lastY: null, filling: false };
                states.set(actor.name, st);
            }
            return st;
        }

        function getPen() {
            return core.screenManager.getCurrent()?.penLayer;
        }

        function onActorMove(actor) {
            const st = getState(actor);
            if (!st.down) return;
            const x = actor.sprite.x;
            const y = actor.sprite.y;
            if (st.lastX === null) { st.lastX = x; st.lastY = y; return; }
            if (x === st.lastX && y === st.lastY) return;
            const g = getPen();
            if (!g) return;
            if (st.filling) {
                // 填充模式：只画路径，不描边，不画圆点
                g.lineStyle(0, 0, 0);
                g.lineTo(x, y);
            } else {
                // 描边模式：画线 + 拐点圆点
                g.lineStyle(penStyle.size, parseColor(penStyle.color), penStyle.alpha);
                g.moveTo(st.lastX, st.lastY);
                g.lineTo(x, y);
                g.beginFill(parseColor(penStyle.color), penStyle.alpha);
                g.drawCircle(st.lastX, st.lastY, penStyle.size / 2);
                g.endFill();
            }
            st.lastX = x;
            st.lastY = y;
        }

        const penApi = {
            down(actor) {
                const st = getState(actor);
                if (st.down) return;
                st.down = true;
                st.lastX = actor.sprite.x;
                st.lastY = actor.sprite.y;
                // 落笔点圆点
                const g = getPen();
                if (g && !st.filling) {
                    g.beginFill(parseColor(penStyle.color), penStyle.alpha);
                    g.drawCircle(st.lastX, st.lastY, penStyle.size / 2);
                    g.endFill();
                }
                core.eventBus.on(`actor:moved:${actor.name}`, onActorMove);
            },
            up(actor) {
                const st = getState(actor);
                if (!st.down) return;
                // 抬笔终点圆点
                if (st.lastX !== null) {
                    const g = getPen();
                    if (g && !st.filling) {
                        g.beginFill(parseColor(penStyle.color), penStyle.alpha);
                        g.drawCircle(st.lastX, st.lastY, penStyle.size / 2);
                        g.endFill();
                    }
                }
                st.down = false;
                st.lastX = null;
                st.lastY = null;
                core.eventBus.off(`actor:moved:${actor.name}`, onActorMove);
            },
            clear() {
                const g = getPen();
                if (g) g.clear();
            },
            setSize(v) { penStyle.size = clamp(v, 1, 10000); },
            changeSize(d) { penStyle.size = clamp(penStyle.size + d, 1, 10000); },
            setColor(hex) {
                penStyle.color = hex;
                const hsl = hex_to_hsl(hex);
                penStyle.hue = hsl[0];
                penStyle.saturation = hsl[1];
                penStyle.brightness = hsl[2];
            },
            setHue(h) {
                h = h % 360; if (h < 0) h += 360;
                penStyle.hue = h;
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
            },
            changeHue(d) { this.setHue(penStyle.hue + d); },
            setSaturation(s) {
                penStyle.saturation = clamp(s, 0, 1);
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
            },
            changeSaturation(d) { this.setSaturation(penStyle.saturation + d); },
            setBrightness(b) {
                penStyle.brightness = clamp(b, 0, 1);
                penStyle.color = hsl_to_hex(penStyle.hue, penStyle.saturation, penStyle.brightness);
            },
            changeBrightness(d) { this.setBrightness(penStyle.brightness + d); },
            setAlpha(a) { penStyle.alpha = clamp(a, 0, 1); },
            changeAlpha(d) { penStyle.alpha = clamp(penStyle.alpha + d, 0, 1); },
            setFillColor(hex) { penStyle.fillColor = hex; },
            fillStart(actor) {
                const st = getState(actor);
                st.filling = true;
                const g = getPen();
                if (!g) return;
                g.beginFill(parseColor(penStyle.fillColor), 1);
                g.moveTo(actor.sprite.x, actor.sprite.y);
            },
            fillEnd(actor) {
                const st = getState(actor);
                if (!st.filling) return;
                const g = getPen();
                if (g) {
                    g.lineTo(actor.sprite.x, actor.sprite.y);
                    g.endFill();
                }
                st.filling = false;
            },
            stamp(text, size, actor) {
                const g = getPen();
                if (!g) return;
                const t = new PIXI.Text(String(text), {
                    fontSize: clamp(size || 24, 1, 10000),
                    fill: '#' + penStyle.color,
                    fontFamily: 'Arial, Microsoft YaHei',
                    fontWeight: 'bold',
                });
                t.anchor.set(0.5, 0.5);
                t.x = actor.sprite.x;
                t.y = actor.sprite.y;
                t.alpha = penStyle.alpha;
                g.addChild(t);
            },
        };

        core.globalHook('__pen__', () => penApi);

        function createPenLayer(screen) {
            const g = new PIXI.Graphics();
            g.name = 'pen';
            screen.container.addChildAt(g, screen.container.getChildIndex(screen.actorLayer));
            return g;
        }

        core.screenHook('penLayer', (screen) => createPenLayer(screen));

        for (const screen of core.screenManager.list) {
            if (!screen.penLayer) {
                screen.penLayer = createPenLayer(screen);
            }
        }
    },
};