// ==================== sensing/index.js ====================
import { sensingBlocks } from './blocks.js';
import { timer } from './timer/index.js';

export default {
    name: 'sensing',
    version: '1.0.0',

    get blocks() {
        return { ...sensingBlocks, ...timer.blocks };
    },

    init(core, data) {
        timer.init(core, data);
    },

    install(core) {
        timer.install(core);

        // color collision detection for bump_into_color block
        let _bumpRT = null;
        core.actorManager.checkBumpedColor = function (actorName, hexColor) {
            const actor = this._byName[actorName];
            if (!actor?.sprite || !actor.sprite.visible) return false;

            const sprite = actor.sprite;
            const renderer = core.app.renderer;
            const stage = core.app.stage;

            const bounds = sprite.getBounds();
            if (bounds.width <= 0 || bounds.height <= 0) return false;

            const colorHex = parseInt(hexColor, 16);
            if (isNaN(colorHex)) return false;
            const targetR = (colorHex >> 16) & 255;
            const targetG = (colorHex >> 8) & 255;
            const targetB = colorHex & 255;

            const w = Math.ceil(bounds.width);
            const h = Math.ceil(bounds.height);
            if (w > 2048 || h > 2048) return false;

            sprite.visible = false;
            try {
                if (!_bumpRT || _bumpRT.width < w || _bumpRT.height < h) {
                    if (_bumpRT) _bumpRT.destroy(true);
                    _bumpRT = PIXI.RenderTexture.create({ width: w, height: h });
                }
                renderer.render(stage, {
                    renderTexture: _bumpRT,
                    transform: new PIXI.Matrix().translate(-bounds.x, -bounds.y),
                });
                let pixels;
                try { pixels = renderer.plugins.extract.pixels(_bumpRT); }
                catch (_e) { return false; }

                const step = 3;
                for (let y = 0; y < h; y += step) {
                    for (let x = 0; x < w; x += step) {
                        const idx = (y * w + x) << 2;
                        if (idx + 2 >= pixels.length) continue;
                        if ((pixels[idx] & 248) === (targetR & 248) &&
                            (pixels[idx + 1] & 248) === (targetG & 248) &&
                            (pixels[idx + 2] & 240) === (targetB & 240)) {
                            return true;
                        }
                    }
                }
            } finally {
                sprite.visible = true;
            }
            return false;
        };
    },
};