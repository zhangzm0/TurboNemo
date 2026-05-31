// src/extensions/pen/index.js
import { Pen, stringToColor } from './pen.js';

export default {
    name: 'pen',
    version: '1.0.0',
    blocks: {
        'self_pen_down': {
            generator(c, b) {
                return `    self._pen.line(self.sprite.x, self.sprite.y);\n    self._pen.down = true;\n` + c.compileNext(b);
            },
        },
        'self_pen_up': {
            generator(c, b) {
                return `    self._pen.up();\n` + c.compileNext(b);
            },
        },
        'clear_drawing': {
            generator(c, b) {
                return `    __screen__.penLayer.clear();\n` + c.compileNext(b);
            },
        },
        'self_set_pen_size': {
            generator(c, b) {
                const size = c.compileValue(b, 'size');
                return `    self._pen.size = ${size};\n` + c.compileNext(b);
            },
        },
        'self_change_pen_size': {
            generator(c, b) {
                const steps = c.compileValue(b, 'steps');
                return `    self._pen.size += ${steps};\n` + c.compileNext(b);
            },
        },
        'self_set_pen_color': {
            generator(c, b) {
                const color = b.querySelector(':scope > field[name="color"]')?.textContent.trim() || '#cc66cc';
                return `    self._pen.color = '${color}';\n` + c.compileNext(b);
            },
        },
        'self_set_pen_color_property': {
            generator(c, b) {
                return c.compileNext(b) || '';
            },
        },
        'self_change_pen_color_property': {
            generator(c, b) {
                return c.compileNext(b) || '';
            },
        },
        'set_fill_path': {
            generator(c, b) {
                const point = c.extractParams(b).point;
                if (point === 'start') {
                    return `    self._pen.fillStart(self.sprite.x, self.sprite.y);\n` + c.compileNext(b);
                }
                return `    self._pen.fillEnd(self.sprite.x, self.sprite.y);\n` + c.compileNext(b);
            },
        },
        'set_fill_style': {
            generator(c, b) {
                const color = b.querySelector(':scope > field[name="style"]')?.textContent.trim() || '#cc66cc';
                return `    self._pen.fillColor = '${color}';\n` + c.compileNext(b);
            },
        },
        'stamp': {
            generator(c, b) {
                const text = c.compileValue(b, 'TEXT') || "''";
                const size = c.compileValue(b, 'SIZE') || '24';
                return `    self._pen.stamp(${text}, ${size}, self.sprite.x, self.sprite.y);\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        // 每个屏幕加画笔层
        core.screenHook('penLayer', (screen) => {
            const penLayer = new PIXI.Graphics();
            penLayer.name = 'pen';
            const actorIdx = screen.container.getChildIndex(screen.actorLayer);
            screen.container.addChildAt(penLayer, actorIdx);
            return penLayer;
        });

        for (const screen of core.screenManager.list) {
            if (!screen.penLayer) {
                const penLayer = new PIXI.Graphics();
                penLayer.name = 'pen';
                const actorIdx = screen.container.getChildIndex(screen.actorLayer);
                screen.container.addChildAt(penLayer, actorIdx);
                screen.penLayer = penLayer;
            }
        }

        // actorHook：每个角色一个 Pen 实例
        core.actorHook('_pen', (actor) => {
            const screen = core.screenManager.getCurrent();
            return new Pen(screen?.penLayer);
        });

        for (const actor of core.actorManager.list) {
            if (!actor._pen) {
                const screen = core.screenManager.getCurrent();
                actor._pen = new Pen(screen?.penLayer);
            }
        }

        // 每帧追踪位置
        core.app.ticker.add(() => {
            for (const actor of core.actorManager.list) {
                if (!actor._pen || !actor._pen.down) continue;
                if (!actor.sprite || !actor.sprite.visible) continue;
                actor._pen.line(actor.sprite.x, actor.sprite.y);
            }
        });
    },
};