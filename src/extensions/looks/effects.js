import { ColorMatrixFilter } from '@pixi/filter-color-matrix';

// ponytail: pixelate/twist use simple glsl, displacement skipped (needs sprite map)
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

// effect type codes from BCM: 0=hue,1=alpha,2=brightness,3=pixelate,4=displacement,5=twist,6=saturate
export class Effects {
    constructor(sprite) {
        this._sprite = sprite;
        this._filters = {};
        this._vals = { 0:0, 2:0, 3:0, 5:0, 6:0 };
    }

    _filter(type) {
        if (this._filters[type]) return this._filters[type];
        let f;
        switch (type) {
            case '0': f = new ColorMatrixFilter(); break; // hue
            case '2': f = new ColorMatrixFilter(); break; // brightness
            case '6': f = new ColorMatrixFilter(); break; // saturate
            case '3': f = new PIXI.Filter(undefined, FX.pixelate, { size: 0 }); break;
            case '5': f = new PIXI.Filter(undefined, FX.twist, { radius: 0.5, angle: 0 }); break;
            default: return null;
        }
        this._filters[type] = f;
        return f;
    }

    _sync() {
        const list = [];
        for (const t of ['0','2','6','3','5']) {
            if (this._filters[t]) list.push(this._filters[t]);
        }
        this._sprite.filters = list.length > 0 ? list : null;
    }

    set(type, val) {
        if (type === '1') { this._sprite.alpha = Math.max(0, Math.min(1, (100 - val) / 100)); return; }
        if (type === '4') return; // displacement not supported
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
        if (type === '4') return;
        this.set(type, (this._vals[type] || 0) + val);
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
            case '5': f.uniforms.radius = 0.5; f.uniforms.angle = v * 0.05; break;
        }
    }

    clearAll() {
        this._sprite.alpha = 1;
        this._sprite.filters = null;
        this._filters = {};
        this._vals = { 0:0, 2:0, 3:0, 5:0, 6:0 };
    }
}
