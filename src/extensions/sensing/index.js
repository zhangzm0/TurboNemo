// ==================== sensing/index.js ====================
import { sensingBlocks } from './blocks.js';
import { timer } from './timer/index.js';

/**
 * Cache of non-transparent pixel positions per texture.
 * Key: texture uid, Value: Array<{x, y}>
 */
const _texPointCache = new Map();

/**
 * Collision optimization scale factor — matches official COLLISION_OPTIMIZATION_SCALE_FACTOR = 0.7.
 * Pixel data is stored at 0.7x resolution, and color collision rendering also uses 0.7x.
 */
const COLLISION_SCALE = 0.7;

/**
 * Bounds expansion in pixels — matches official EXTEND_PIXELS = 5.
 */
const EXTEND_PIXELS = 5;

/**
 * Extract non-transparent pixel positions from a texture (texture points).
 * Uses canvas-based approach — avoids extract.pixels(texture) which can fail
 * with plain Texture objects in PIXI v5.
 * Points are stored at 0.7x scaled resolution, matching official
 * get_texture_points_position (internal + bounds points in collision-optimized space).
 */
function getTexturePoints(texture) {
    const key = texture.uid || texture.baseTexture?.uid || texture.textureCacheIds?.[0];
    if (!key) return null;
    if (_texPointCache.has(key)) return _texPointCache.get(key);

    const texW = texture.orig.width;
    const texH = texture.orig.height;
    if (!texW || !texH) return null;

    const scaledW = Math.max(1, Math.floor(texW * COLLISION_SCALE));
    const scaledH = Math.max(1, Math.floor(texH * COLLISION_SCALE));

    const canvas = document.createElement('canvas');
    canvas.width = scaledW;
    canvas.height = scaledH;
    const ctx = canvas.getContext('2d');
    // Get drawable source from the base texture
    const srcRes = texture.baseTexture?.resource;
    let source = srcRes?.source || texture.baseTexture?.getDrawableSource?.();
    if (!source) {
        // For CanvasResource, source is on the resource
        if (srcRes && typeof srcRes === 'object' && 'canvas' in srcRes) {
            source = srcRes.canvas;
        }
    }
    if (!source) return null;
    // Draw only the texture's frame region (supports spritesheet sub-textures)
    ctx.drawImage(source,
        texture.frame.x || 0, texture.frame.y || 0,
        texW, texH,
        0, 0, scaledW, scaledH);
    const scaledData = ctx.getImageData(0, 0, scaledW, scaledH).data;

    const points = [];
    const step = 2;  // step=2 at 0.7x → ~3px step at 1x
    for (let ty = 0; ty < scaledH; ty += step) {
        for (let tx = 0; tx < scaledW; tx += step) {
            const idx = (ty * scaledW + tx) << 2;
            if (idx + 3 < scaledData.length && scaledData[idx + 3] > 0) {
                // Store in 0.7x scaled space (matching official)
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
        // Force resolution 1 to match official — avoids resolution scaling issues with extract.pixels()
        let _bumpBaseRT = new PIXI.BaseRenderTexture();
        _bumpBaseRT.resolution = 1;
        let _bumpRT = new PIXI.RenderTexture(_bumpBaseRT);
        core.actorManager.checkBumpedColor = function (actorName, hexColor) {
            const actor = this._byName[actorName];
            if (!actor?.sprite || !actor.sprite.visible) return false;

            const sprite = actor.sprite;
            const renderer = core.app?.renderer;
            const stage = core.app?.stage;
            if (!renderer || !stage) return false;

            if (!sprite.texture || !sprite.texture.valid) return false;
            if (!sprite.transform || !sprite.parent) return false;

            // Force update all pen canvas textures so the latest strokes are
            // on the GPU (WebGL) before we render to the collision RT.
            for (const s of core.screenManager.list) {
                s.penCanvas?.texture.update();
            }

            const texPoints = getTexturePoints(sprite.texture);
            if (!texPoints || texPoints.length === 0) return false;

            let box;
            try { box = sprite.getBounds(); }
            catch (_e) { return false; }
            if (typeof box?.width !== 'number' || typeof box?.height !== 'number' ||
                typeof box?.x !== 'number' || typeof box?.y !== 'number') return false;

            const stageW = core.width;
            const stageH = core.height;
            const halfW = stageW / 2;
            const halfH = stageH / 2;

            const vertMinX = box.x - halfW;
            const vertMaxX = box.x + box.width - halfW;
            const vertMinY = box.y - halfH;
            const vertMaxY = box.y + box.height - halfH;

            const extL = Math.round(Math.max(-halfW, Math.min(halfW, vertMinX - EXTEND_PIXELS)));
            const extR = Math.round(Math.max(-halfW, Math.min(halfW, vertMaxX + EXTEND_PIXELS)));
            const extT = Math.round(Math.max(-halfH, Math.min(halfH, vertMinY - EXTEND_PIXELS)));
            const extB = Math.round(Math.max(-halfH, Math.min(halfH, vertMaxY + EXTEND_PIXELS)));
            const extW = Math.floor(extR - extL);
            const extH = Math.floor(extB - extT);
            if (extW === 0 || extH === 0) return false;

            const bounds = { x: extL, y: extT, width: extW, height: extH };

            // 3. Scaled bounds size (official get_collision_optimization_scaled_size)
            const scaledW = Math.floor(bounds.width * COLLISION_SCALE);
            const scaledH = Math.floor(bounds.height * COLLISION_SCALE);
            if (scaledW === 0 || scaledH === 0) return false;

            // 4. Parse color to RGB (official hex_to_rgb)
            const colorHex = parseInt(hexColor, 16);
            if (isNaN(colorHex)) return false;
            const colorRgb = [(colorHex >> 16) & 255, (colorHex >> 8) & 255, colorHex & 255];

            // 5. Hide actor, render the rest of the stage
            const prevVisible = sprite.visible;
            sprite.visible = false;
            try {
                // Resize render texture
                try {
                    _bumpRT.resize(scaledW, scaledH, true);
                } catch (_e) {
                    _bumpRT.destroy(true);
                    _bumpBaseRT = new PIXI.BaseRenderTexture();
                    _bumpBaseRT.resolution = 1;
                    _bumpRT = new PIXI.RenderTexture(_bumpBaseRT);
                    _bumpRT.resize(scaledW, scaledH, true);
                    if (!_bumpRT.baseRenderTexture) return false;
                }

                // Build transform matrix (official get_screenshot_area_transform_matrix)
                // Maps centered-stage coord (gx, gy) → render texture pixel (rx, ry)
                // tx = -floor((bounds.x + stageW/2) * 0.7), ty = -floor((bounds.y + stageH/2) * 0.7)
                // a = d = 0.7
                try {
                    renderer.render(stage, _bumpRT, true, new PIXI.Matrix(
                        COLLISION_SCALE, 0, 0, COLLISION_SCALE,
                        -Math.floor((bounds.x + halfW) * COLLISION_SCALE),
                        -Math.floor((bounds.y + halfH) * COLLISION_SCALE)
                    ));
                } catch (_e) { return false; }

                // Read pixels (official extract.pixels)
                let pixels;
                try { pixels = renderer.plugins.extract.pixels(_bumpRT); }
                catch (_e) { return false; }

                // 6. Iterate texture points (official color_match_texture_points loop)
                const scaleX = sprite.scale.x;
                const scaleY = sprite.scale.y;
                const pivX = sprite.pivot.x;
                const pivY = sprite.pivot.y;
                const posX = sprite.x;
                const posY = sprite.y;
                const rot = sprite.rotation;
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                const sprW = sprite.width;
                const sprH = sprite.height;

                for (let i = 0; i < texPoints.length; i++) {
                    const pt = texPoints[i];

                    // Step A: collision_opti_scaled_to_origin_point — unscale 0.7x → 1x
                    const ox = Math.floor(pt.x / COLLISION_SCALE);
                    const oy = Math.floor(pt.y / COLLISION_SCALE);

                    // Step B: map_actor_px_to_local_point (official, exactly)
                    //   origin_center = pos - pivot * scale
                    const ocx = posX - pivX * scaleX;
                    const ocy = posY - pivY * scaleY;
                    //   scale texture pixel
                    const sx = ox * scaleX;
                    const sy = oy * scaleY;
                    //   pre-rotation position, adjusting for anchor(0.5)
                    const prx = scaleX > 0
                        ? sx + ocx - sprW / 2
                        : sx + ocx + sprW / 2;
                    const pry = scaleY > 0
                        ? sy + ocy - sprH / 2
                        : sy + ocy + sprH / 2;
                    //   rotate around position (make_rotate)
                    const dx = prx - posX;
                    const dy = pry - posY;
                    const lx = cosR * dx - sinR * dy + posX;
                    const ly = sinR * dx + cosR * dy + posY;

                    // Step C: (local - bounds) → origin_to_collision_opti_scaled_point
                    const rx = Math.floor((lx - bounds.x) * COLLISION_SCALE);
                    const ry = Math.floor((ly - bounds.y) * COLLISION_SCALE);

                    // Official only guards upper bounds (negative index → undefined pixels → false)
                    if (rx >= scaledW || ry >= scaledH) continue;

                    // Step D: color_match
                    const idx = (ry * scaledW + rx) << 2;
                    if (idx + 2 >= pixels.length) continue;
                    if ((colorRgb[0] & 248) === (pixels[idx] & 248) &&
                        (colorRgb[1] & 248) === (pixels[idx + 1] & 248) &&
                        (colorRgb[2] & 240) === (pixels[idx + 2] & 240)) {
                        return true;
                    }
                }
            } finally {
                sprite.visible = prevVisible;
            }
            return false;
        };
    },
};
