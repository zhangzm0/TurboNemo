// ==================== extensions/looks/dialog/bubble.js ====================
// Speech/thought bubble that appears above the actor's head (PIXI Graphics)
// Based on official Nemo runtime implementation
//   - Bubble stays visible until replaced by next call, actor destroyed, or time expires
//   - No click-to-dismiss
//   - Follows actor position/alpha/visibility

const TEXT_STYLE = {
    fontSize: 26,
    fontFamily: ['PingFangSC-Medium', 'Microsoft YaHei', 'sans-serif'],
    fill: 0x666666,
    wordWrap: true,
    wordWrapWidth: 208,
    breakWords: true,
    lineHeight: 36,
};

const DIALOG_MIN_WIDTH = 108;
const DIALOG_MAX_WIDTH = 248;
const TEXT_PADDING = 20;

class ActorBubble {
    constructor(actor, stageWidth, stageHeight, app, eventBus) {
        this.actor = actor;
        this.stageWidth = stageWidth;
        this.stageHeight = stageHeight;
        this.app = app;
        this.eventBus = eventBus;

        this.container = new PIXI.Container();
        this.container.visible = false;

        this.bg = new PIXI.Graphics();
        this.container.addChild(this.bg);

        this.bubbles = new PIXI.Graphics();
        this.container.addChild(this.bubbles);

        this.text = new PIXI.Text('', TEXT_STYLE);
        this.container.addChild(this.text);

        if (actor.sprite && actor.sprite.parent) {
            actor.sprite.parent.addChild(this.container);
        }

        this.contentWidth = 0;
        this.contentHeight = 0;
        this.type = 'say';
        this._tickerFn = null;
    }

    setText(text, type) {
        const changed = text !== this.text.text || type !== this.type;
        this.text.text = String(text);
        this.type = type;
        this.container.visible = true;

        if (changed) {
            this._updateStyle();
        }
        this._updatePosition();

        // Follow actor while visible
        if (!this._tickerFn) {
            this._tickerFn = () => this._updatePosition();
            this.app.ticker.add(this._tickerFn);
        }
    }

    hide() {
        if (this._tickerFn) {
            this.app.ticker.remove(this._tickerFn);
            this._tickerFn = null;
        }
        this.container.visible = false;
    }

    _updateStyle() {
        this.contentHeight = this.text.height + 30;
        const width = this.text.width + 2 * TEXT_PADDING;
        this.contentWidth = Math.max(DIALOG_MIN_WIDTH, Math.min(DIALOG_MAX_WIDTH, width));

        const bubbleCenterPosX = 5;
        const bubbleSayWidth = 50;
        const bubbleSayPoint = {
            startX: 0.1 * DIALOG_MAX_WIDTH,
            centerX: 0.1 * DIALOG_MAX_WIDTH - bubbleCenterPosX,
        };
        const bigBubblePos = { x: 25, y: this.contentHeight + 20 };
        const smallBubblePos = { x: 5, y: this.contentHeight + 40 };
        const radius = this.contentHeight > 80 ? 40 : this.contentHeight / 2;

        this.bg.clear();
        this.bg.lineStyle(2, 0xeeeeee, 1);
        this.bg.beginFill(0xFFFFFF, 1);

        this.bubbles.clear();

        if (this.type === 'think') {
            this.bubbles.lineStyle(2, 0xeeeeee, 1);
            this.bubbles.beginFill(0xffffff);
            this.bubbles.drawEllipse(bigBubblePos.x, bigBubblePos.y, 13, 10);
            this.bubbles.drawEllipse(smallBubblePos.x, smallBubblePos.y, 8, 6);
            this.bubbles.endFill();
            this.bubbles.visible = true;

            this.bg.drawRoundedRect(0, 0, this.contentWidth, this.contentHeight, radius);
            this.bg.endFill();
        } else {
            this.bg.drawRoundedRect(0, 0, this.contentWidth, this.contentHeight, 16);
            this.bg.moveTo(bubbleSayPoint.startX, this.contentHeight);
            this.bg.lineTo(bubbleSayPoint.centerX, this.contentHeight + 25);
            this.bg.lineTo(bubbleSayPoint.startX + bubbleSayWidth, this.contentHeight);
            this.bg.endFill();

            // White line to cover the border of the rect
            this.bg.lineStyle(2, 0xffffff, 1);
            this.bg.moveTo(bubbleSayPoint.startX, this.contentHeight);
            this.bg.lineTo(bubbleSayPoint.startX + bubbleSayWidth, this.contentHeight);

            this.bubbles.visible = false;
        }

        // Position text
        const isMinWidth = this.contentWidth === DIALOG_MIN_WIDTH;
        const posXOffset = isMinWidth ? (this.contentWidth - this.text.width) / 2 : TEXT_PADDING;
        this.text.position.set(posXOffset, TEXT_PADDING);
    }

    _updatePosition() {
        const sprite = this.actor.sprite;
        if (!sprite || !sprite.parent) return;

        const halfH = (sprite.height || 0) / 2;
        const bubbleH = this.contentHeight + 25;
        this.container.position.set(
            sprite.x - this.contentWidth / 2,
            sprite.y - halfH - bubbleH
        );

        this.container.scale.x = 1;
        this.text.scale.x = 1;

        // Edge detection
        const bounds = this.container.getBounds();
        const hw = this.stageWidth / 2;
        const hh = this.stageHeight / 2;

        if (bounds.x + bounds.width > this.stageWidth && this.container.scale.x > 0) {
            this.container.scale.x = -1;
            this.text.scale.x = -1;
            this.text.position.x = this.contentWidth - this.text.position.x;
            if (sprite.x > hw) {
                this.container.position.x = hw;
            }
        }

        if (bounds.x < 0) {
            this.container.position.x = -hw;
        }
        if (bounds.y < 0) {
            this.container.position.y = -hh;
        }
        if (bounds.y + this.container.height > this.stageHeight) {
            this.container.position.y = hh - this.container.height;
        }
    }

    destroy() {
        this.hide();
        if (this.container.parent) {
            this.container.parent.removeChild(this.container);
        }
        this.container.destroy({ children: true });
    }
}

class BubbleManager {
    constructor(core) {
        this.core = core;
        this.bubbles = new Map();
    }

    getBubble(actor) {
        if (!actor) return null;
        let bubble = this.bubbles.get(actor.name);
        if (!bubble) {
            bubble = new ActorBubble(actor, this.core.width, this.core.height, this.core.app, this.core.eventBus);
            this.bubbles.set(actor.name, bubble);
        }
        return bubble;
    }

    // Set bubble text and continue (stays visible until replaced)
    setText(actor, text, type) {
        const bubble = this.getBubble(actor);
        if (bubble) bubble.setText(text, type);
    }

    // Hide bubble
    clear(actor) {
        if (!actor) return;
        const bubble = this.bubbles.get(actor.name);
        if (bubble) bubble.hide();
    }

    destroy() {
        this.bubbles.forEach(b => b.destroy());
        this.bubbles.clear();
    }
}

// self_dialog_wait (对话/思考 文本):
//   Show bubble, yield 1 frame to render, then continue.
//   Bubble stays visible until next dialog call replaces it.
// self_dialog (对话/思考 文本 持续 X 秒):
//   Show bubble, wait X seconds (blocking), then hide and continue.
export const bubbleBlocks = {
    'self_dialog_wait': {
        generator(c, b) {
            const text = c.compileValue(b, 'text');
            const typeEl = b.querySelector('field[name="type"]');
            const type = typeEl ? typeEl.textContent.trim() : 'say';
            return (
                `    __global__.__bubble__.setText(self, ${text}, '${type}');\n` +
                `    yield;\n` +
                c.compileNext(b)
            );
        },
    },
    'self_dialog': {
        generator(c, b) {
            const text = c.compileValue(b, 'text');
            const typeEl = b.querySelector('field[name="type"]');
            const type = typeEl ? typeEl.textContent.trim() : 'say';
            const time = c.compileValue(b, 'time') || '2';
            return (
                `    __global__.__bubble__.setText(self, ${text}, '${type}');\n` +
                `    yield { _yieldType: "wait", frames: Math.ceil(${time} * 60) };\n` +
                `    __global__.__bubble__.clear(self);\n` +
                c.compileNext(b)
            );
        },
    },
};

export function installBubble(core) {
    const manager = new BubbleManager(core);

    core.globalHook('__bubble__', () => ({
        setText(self, text, type) { manager.setText(self, text, type); },
        clear(self) { manager.clear(self); },
    }));

    // Cleanup on reset
    const _orig = core.reset;
    if (_orig) {
        core.reset = function (...args) {
            manager.destroy();
            return _orig.apply(core, args);
        };
    }
}
