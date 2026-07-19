function createDisplacementMap(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const cx = size / 2;
    const cy = size / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) {
                data[idx] = 128;
                data[idx + 1] = 128;
                data[idx + 2] = 0;
                data[idx + 3] = 255;
                continue;
            }
            const nx = dx / dist;
            const ny = dy / dist;
            const t = Math.min(dist / maxDist, 1);
            const strength = t;
            data[idx] = 128 + Math.round(nx * 127 * strength);
            data[idx + 1] = 128 + Math.round(ny * 127 * strength);
            data[idx + 2] = 0;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

let _displacementTexture = null;
function getDisplacementTexture() {
    if (_displacementTexture) return _displacementTexture;
    const canvas = createDisplacementMap(512);
    _displacementTexture = PIXI.Texture.from(canvas);
    return _displacementTexture;
}

const FX = {
    pixelate: `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec4 inputSize;
        uniform float size;
        void main() {
            vec2 d = 1.0 / (inputSize.xy / max(size, 1.0));
            vec2 c = floor(vTextureCoord / d) * d + d * 0.5;
            gl_FragColor = texture2D(uSampler, c);
        }
    `,
    twist: `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec4 inputSize;
        uniform vec4 outputFrame;
        uniform float radius;
        uniform float angle;
        void main() {
            vec2 uv = vTextureCoord;
            vec2 center = vec2(0.5, 0.5);
            vec2 offset = uv - center;
            float dist = length(offset);
            if (dist < radius) {
                float percent = (radius - dist) / radius;
                float theta = percent * percent * angle;
                float s = sin(theta);
                float c = cos(theta);
                vec2 rotated = vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);
                gl_FragColor = texture2D(uSampler, center + rotated);
            } else {
                gl_FragColor = texture2D(uSampler, uv);
            }
        }
    `,
};

export class Effects {
    constructor(sprite) {
        this._sprite = sprite;
        this._filters = {};
        this._vals = { 0:0, 2:100, 3:0, 4:0, 5:0, 6:0 };
    }

    _filter(type) {
        if (this._filters[type]) return this._filters[type];
        let f;
        switch (type) {
            case '0': f = new PIXI.filters.ColorMatrixFilter(); break;
            case '2': f = new PIXI.filters.ColorMatrixFilter(); break;
            case '6': f = new PIXI.filters.ColorMatrixFilter(); break;
            case '3': f = new PIXI.Filter(undefined, FX.pixelate, { size: 0 }); break;
            case '4':
                {
                    const tex = getDisplacementTexture();
                    f = new PIXI.filters.DisplacementFilter(tex);
                    f.scale.set(0, 0);
                }
                break;
            case '5': f = new PIXI.Filter(undefined, FX.twist, { radius: 0.5, angle: 0 }); break;
            default: return null;
        }
        this._filters[type] = f;
        return f;
    }

    _sync() {
        const list = [];
        for (const t of ['0','2','6','3','4','5']) {
            if (this._filters[t]) list.push(this._filters[t]);
        }
        this._sprite.filters = list.length > 0 ? list : null;
    }

    set(type, val) {
        if (type === '1') { this._sprite.alpha = Math.max(0, Math.min(1, (100 - val) / 100)); return; }
        if (type === '6') val = Math.max(-100, Math.min(0, -val));
        const f = this._filter(type);
        if (!f) return;
        this._vals[type] = val;
        this._apply(type, f);
        this._sync();
    }

    change(type, val) {
        if (type === '1') {
            const cur = (1 - this._sprite.alpha) * 100;
            this._sprite.alpha = Math.max(0, Math.min(1, (100 - (cur + val)) / 100));
            return;
        }
        const cur = this._vals[type] || 0;
        if (type === '6') {
            this.set(type, cur - val);
        } else {
            this.set(type, cur + val);
        }
    }

    _apply(type, f) {
        const v = this._vals[type] || 0;
        switch (type) {
            case '0': f.reset(); f.hue(v, false); break;
            case '2': f.reset(); f.brightness(v / 100, false); break;
            case '6':
                f.reset();
                { const m = 1 + v / 100; const im = 1 - m;
                  f.matrix = [
                    0.3086*im+m, 0.6094*im, 0.0820*im, 0,0,
                    0.3086*im, 0.6094*im+m, 0.0820*im, 0,0,
                    0.3086*im, 0.6094*im, 0.0820*im+m, 0,0,
                    0,0,0,1,0,
                  ]; }
                break;
            case '3': f.uniforms.size = v; break;
            case '4':
                {
                    const scale = v * 2;
                    f.scale.set(scale, scale);
                }
                break;
            case '5': f.uniforms.radius = 0.5; f.uniforms.angle = v * 0.05; break;
        }
    }

    cloneTo(targetEffects) {
        targetEffects._sprite.alpha = this._sprite.alpha;
        for (const [type, val] of Object.entries(this._vals)) {
            const def = type === '2' ? 100 : 0;
            if (val !== def) targetEffects.set(type, val);
        }
    }

    clearAll() {
        this._sprite.alpha = 1;
        this._sprite.filters = null;
        this._filters = {};
        this._vals = { 0:0, 2:100, 3:0, 4:0, 5:0, 6:0 };
    }
}
