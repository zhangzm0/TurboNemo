// src/core/hitarea.js
// Pixel-buffer-based hitArea for precise sprite click detection.
// Matches the official Nemo approach:
//   - Lazily compute 0.7x scaled Uint32Array from texture baseTexture
//   - Per-click: one array read + alpha check, pixel-perfect
//   - Transparent pixels naturally pass through to sprites beneath

const _pixelCache = new Map();

/**
 * Try to get a drawable source (HTMLImageElement/HTMLCanvasElement) from a texture.
 */
function getSourceFromTexture(texture) {
    if (!texture?.baseTexture) return null;
    const bt = texture.baseTexture;
    // PixiJS v5: BaseTexture.resource.source
    if (bt.resource?.source) return bt.resource.source;
    // PixiJS v5 alternative API
    if (bt.getDrawableSource) return bt.getDrawableSource();
    return null;
}

/**
 * Build a 0.7x Uint32Array pixel buffer from a drawable source.
 */
function buildPixelData(source) {
    const texW = source.naturalWidth || source.width;
    const texH = source.naturalHeight || source.height;
    if (!texW || !texH) return null;

    const sw = Math.ceil(texW * 0.7);
    const sh = Math.ceil(texH * 0.7);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const pixelData = new Uint32Array(imageData.data.buffer);

    return { pixelData, sw, sh, texW, texH };
}

/**
 * Get or create a pixel hitArea object for a texture.
 * Pixel data is lazily computed from the texture's baseTexture source,
 * then cached by texture uid for reuse across sprites.
 */
function getPixelHitArea(texture) {
    if (!texture) return null;

    // PIXI v5: uid is on BaseTexture, not Texture. Try all three.
    const key = texture.uid || texture.baseTexture?.uid || texture.textureCacheIds?.[0];
    if (!key) return null;

    // Check for cached hitArea
    const haKey = `_ha_${key}`;
    const existing = _pixelCache.get(haKey);
    if (existing) return existing;

    // Build pixel data from texture source (lazy)
    let pd = _pixelCache.get(key);
    if (!pd) {
        const source = getSourceFromTexture(texture);
        if (source) {
            pd = buildPixelData(source);
            if (pd) _pixelCache.set(key, pd);
        }
    }
    if (!pd) return null;

    const { pixelData, sw, sh, texW, texH } = pd;

    const hitArea = {
        contains(x, y) {
            // (x, y) in local coords with anchor (0.5, 0.5)
            // Convert to texture pixel coords, then scale to 0.7x
            const px = Math.floor((x + texW / 2) * 0.7);
            const py = Math.floor((y + texH / 2) * 0.7);
            if (px < 0 || px >= sw || py < 0 || py >= sh) return false;
            return (pixelData[py * sw + px] >>> 24) > 0;
        }
    };

    _pixelCache.set(haKey, hitArea);
    return hitArea;
}

/**
 * Look up cached pixel data for a texture (without building a hitArea).
 * Returns { pixelData, sw, sh, texW, texH } or null.
 */
function getTexturePixelData(texture) {
    if (!texture) return null;
    const key = texture.uid || texture.baseTexture?.uid || texture.textureCacheIds?.[0];
    if (!key) return null;
    return _pixelCache.get(key) || null;
}

export {
    getPixelHitArea,
    getTexturePixelData,
};
