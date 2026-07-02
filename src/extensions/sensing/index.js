// ==================== sensing/index.js ====================
import { sensingBlocks } from './blocks.js';
import { timer } from './timer/index.js';

/**
 * Cache of non-transparent pixel positions per texture.
 * Key: texture uid, Value: Array<{x, y}>
 */
const _texPointCache = new Map();

/**
 * Extract non-transparent pixel positions from a texture (texture points).
 * Cached per texture — matches official get_texture_points_position approach.
 */
function getTexturePoints(renderer, texture) {
    const key = texture.uid || texture.textureCacheIds?.[0];
    if (!key) return null;
    if (_texPointCache.has(key)) return _texPointCache.get(key);

    let pixels;
    try { pixels = renderer.plugins.extract.pixels(texture); }
    catch (_e) { return null; }

    const texW = texture.orig.width;
    const texH = texture.orig.height;
    if (!texW || !texH || pixels.length < 4) return null;

    const points = [];
    const step = 3;
    for (let ty = 0; ty < texH; ty += step) {
        for (let tx = 0; tx < texW; tx += step) {
            const idx = (ty * texW + tx) << 2;
            if (idx + 3 < pixels.length && pixels[idx + 3] > 0) {
                points.push({ x: tx, y: ty });
            }
        }
    }

    _texPointCache.set(key, points);
    return points;
}

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
        // One shared RenderTexture, resized as needed (matches official approach)
        let _bumpRT = new PIXI.RenderTexture(new PIXI.BaseRenderTexture());
        core.actorManager.checkBumpedColor = function (actorName, hexColor) {
            const actor = this._byName[actorName];
            if (!actor?.sprite || !actor.sprite.visible) return false;

            const sprite = actor.sprite;
            const renderer = core.app?.renderer;
            const stage = core.app?.stage;
            if (!renderer || !stage) return false;

            // Skip if sprite has no valid texture
            if (!sprite.texture || !sprite.texture.valid) return false;
            if (!sprite.transform || !sprite.parent) return false;

            // Get cached texture points (non-transparent pixel positions)
            const texPoints = getTexturePoints(renderer, sprite.texture);
            if (!texPoints || texPoints.length === 0) return false;

            let bounds;
            try { bounds = sprite.getBounds(); }
            catch (_e) { return false; }
            if (typeof bounds?.width !== 'number' || typeof bounds?.height !== 'number' ||
                typeof bounds?.x !== 'number' || typeof bounds?.y !== 'number') return false;

            const w = Math.ceil(bounds.width);
            const h = Math.ceil(bounds.height);
            if (!(w > 0) || !(h > 0) || w > 2048 || h > 2048) return false;

            const colorHex = parseInt(hexColor, 16);
            if (isNaN(colorHex)) return false;
            const targetR = (colorHex >> 16) & 255;
            const targetG = (colorHex >> 8) & 255;
            const targetB = colorHex & 255;

            sprite.visible = false;
            try {
                // Resize render texture in-place
                try {
                    _bumpRT.resize(w, h, true);
                } catch (_e) {
                    _bumpRT.destroy(true);
                    _bumpRT = new PIXI.RenderTexture(new PIXI.BaseRenderTexture());
                    _bumpRT.resize(w, h, true);
                    if (!_bumpRT.baseRenderTexture) return false;
                }
                // Render stage (without this sprite) to the render texture
                try {
                    renderer.render(stage, {
                        renderTexture: _bumpRT,
                        transform: new PIXI.Matrix().translate(-bounds.x, -bounds.y),
                    });
                } catch (_e) { return false; }
                // Read pixels from render texture
                let pixels;
                try { pixels = renderer.plugins.extract.pixels(_bumpRT); }
                catch (_e) { return false; }

                // Ensure world transform is up-to-date (PIXI ticker runs scheduler before updateTransform)
                sprite._recursivePostUpdateTransform();
                // Pre-compute sprite world transform for point mapping
                const wt = sprite.worldTransform;
                const origW = sprite.texture.orig.width;
                const origH = sprite.texture.orig.height;
                const ax = sprite.anchor.x;
                const ay = sprite.anchor.y;

                // Map each texture point through sprite transform and check color
                for (let i = 0; i < texPoints.length; i++) {
                    const pt = texPoints[i];
                    // Texture pixel → sprite local coords (accounting for anchor)
                    const lx = pt.x - ax * origW;
                    const ly = pt.y - ay * origH;
                    // Sprite local → global (stage) coords via world transform
                    const gx = wt.tx + lx * wt.a + ly * wt.c;
                    const gy = wt.ty + lx * wt.b + ly * wt.d;
                    // Global coords → render texture coords
                    const rx = Math.floor(gx - bounds.x);
                    const ry = Math.floor(gy - bounds.y);
                    if (rx < 0 || rx >= w || ry < 0 || ry >= h) continue;
                    const idx = (ry * w + rx) << 2;
                    if (idx + 2 >= pixels.length) continue;
                    // Compare color with bitmask (matches official color_match)
                    if ((pixels[idx] & 248) === (targetR & 248) &&
                        (pixels[idx + 1] & 248) === (targetG & 248) &&
                        (pixels[idx + 2] & 240) === (targetB & 240)) {
                        return true;
                    }
                }
            } finally {
                sprite.visible = true;
            }
            return false;
        };
    },
};
