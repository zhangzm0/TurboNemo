import { ColorMatrixFilter } from '@pixi/filter-color-matrix';

const FX = {
    // pixelate: grid-based pixelation effect
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
    // twist/whirl: radial swirl distortion
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
    // fisheye: barrel/pincushion radial distortion
    fisheye: `
        precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float amount;
        void main() {
            vec2 uv = vTextureCoord;
            vec2 center = vec2(0.5, 0.5);
            vec2 offset = uv - center;
            float dist = length(offset);
            float maxDist = sqrt(0.5);
            float norm = dist / maxDist;
            float scale = 1.0 + (amount / 100.0) * norm * norm;
            vec2 mapped = center + offset * scale;
            if (mapped.x < 0.0 || mapped.x > 1.0 || mapped.y < 0.0 || mapped.y > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            } else {
                gl_FragColor = texture2D(uSampler, mapped);
            }
        }
    `,
};

// effect type codes from BCM: 0=hue,1=alpha,2=brightness,3=pixelate,4=displacement(fisheye),5=twist,6=saturate(mosaic)
export class Effects {
    constructor(sprite) {
        this._sprite = sprite;
        this._filters = {};
        this._vals = { 0:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    }

    _filter(type) {
        if (this._filters[type]) return this._filters[type];
        let f;
        switch (type) {
            case '0': f = new ColorMatrixFilter(); break; // hue
            case '2': f = new ColorMatrixFilter(); break; // brightness
            case '6': f = new ColorMatrixFilter(); break; // saturate
            case '3': f = new PIXI.Filter(undefined, FX.pixelate, { size: 0 }); break;
            case '4': f = new PIXI.Filter(undefined, FX.fisheye, { amount: 0 }); break;
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
        // saturate/mosaic: internal value is negated; user 0-100 maps to internal 0..-100
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
        // saturate/mosaic: internal value is negative of user's, so subtract
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
            case '2': f.reset(); f.brightness((v + 100) / 100, false); break;
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
            case '4': f.uniforms.amount = v; break;
            case '5': f.uniforms.radius = 0.5; f.uniforms.angle = v * 0.05; break;
        }
    }

    // copy effect values from another Effects instance (used when cloning actors)
    cloneTo(targetEffects) {
        // copy alpha/ghost
        targetEffects._sprite.alpha = this._sprite.alpha;
        // copy filter-based effects
        for (const [type, val] of Object.entries(this._vals)) {
            if (val !== 0) targetEffects.set(type, val);
        }
    }

    clearAll() {
        this._sprite.alpha = 1;
        this._sprite.filters = null;
        this._filters = {};
        this._vals = { 0:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    }
}
