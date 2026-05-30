// src/extensions/pen/index.js
export default {
    name: 'pen',
    version: '1.0.0',
    blocks: {
        'self_pen_down': {
            generator(c, b) {
                return `    self._penDown = true;\n` + c.compileNext(b);
            },
        },
        'self_pen_up': {
            generator(c, b) {
                return `    self._penDown = false;\n` + c.compileNext(b);
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
                return `    self._penSize = ${size};\n` + c.compileNext(b);
            },
        },
        'self_change_pen_size': {
            generator(c, b) {
                const steps = c.compileValue(b, 'steps');
                return `    self._penSize += ${steps};\n` + c.compileNext(b);
            },
        },
        'self_set_pen_color': {
            generator(c, b) {
                const color = b.querySelector(':scope > field[name="color"]')?.textContent.trim() || '#cc66cc';
                return `    self._penColor = '${color}';\n` + c.compileNext(b);
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
    },
    install(core) {
        // 每个屏幕加画笔层，层级在 actorLayer 之下
        core.screenHook('penLayer', (screen) => {
            const penLayer = new PIXI.Graphics();
            penLayer.name = 'pen';
            // 插入到 actorLayer 下面
            const actorIdx = screen.container.getChildIndex(screen.actorLayer);
            screen.container.addChildAt(penLayer, actorIdx);
            return penLayer;
        });

        // 给已存在的屏幕补上
        for (const screen of core.screenManager.list) {
            if (!screen.penLayer) {
                const penLayer = new PIXI.Graphics();
                penLayer.name = 'pen';
                const actorIdx = screen.container.getChildIndex(screen.actorLayer);
                screen.container.addChildAt(penLayer, actorIdx);
                screen.penLayer = penLayer;
            }
        }

        // actorHook：画笔状态
        core.actorHook('_penDown', () => false);
        core.actorHook('_penSize', () => 2);
        core.actorHook('_penColor', () => '#cc66cc');
        core.actorHook('_penLastX', () => null);
        core.actorHook('_penLastY', () => null);

        // 给已存在角色补上
        for (const actor of core.actorManager.list) {
            if (actor._penDown === undefined) actor._penDown = false;
            if (!actor._penSize) actor._penSize = 2;
            if (!actor._penColor) actor._penColor = '#cc66cc';
            if (actor._penLastX === undefined) actor._penLastX = null;
            if (actor._penLastY === undefined) actor._penLastY = null;
        }

        // 每帧画线
        core.app.ticker.add(() => {
            for (const actor of core.actorManager.list) {
                if (!actor._penDown) {
                    actor._penLastX = null;
                    actor._penLastY = null;
                    continue;
                }
                const screen = core.screenManager.getCurrent();
                if (!screen?.penLayer || !actor.sprite.visible) continue;
                const x = actor.sprite.x;
                const y = actor.sprite.y;
                if (actor._penLastX !== null && actor._penLastY !== null) {
                    screen.penLayer.lineStyle(actor._penSize, stringToColor(actor._penColor), 1);
                    screen.penLayer.moveTo(actor._penLastX, actor._penLastY);
                    screen.penLayer.lineTo(x, y);
                }
                actor._penLastX = x;
                actor._penLastY = y;
            }
        });
    },
};

function stringToColor(str) {
    if (str.startsWith('#')) {
        return parseInt(str.slice(1), 16);
    }
    return 0xcc66cc;
}