// src/extensions/ppi.js
// Pixel-perfect sprite interaction for PixiJS v5
// Adapted from pixi-ppi (https://www.npmjs.com/package/pixi-ppi) which targets PixiJS v8+
// Uses app.renderer.plugins.extract.pixels() to check click point alpha

const PPI = {
    threshold: 50,
    renderer: null,

    solve(sprite, x, y) {
        if (!this.renderer || !sprite?.texture) return 255;
        try {
            const extract = this.renderer.plugins?.extract;
            if (!extract?.pixels) return 255;
            const pixels = extract.pixels(sprite);
            if (!pixels) return 255;
            const w = Math.round(sprite.width);
            const idx = (y * w + x) * 4;
            if (idx >= 0 && idx + 3 < pixels.length) {
                return pixels[idx + 3];
            }
        } catch (_) {}
        return 255;
    },
};

export default PPI;
