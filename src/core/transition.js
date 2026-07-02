// src/core/transition.js
function tween(target, props, duration, easing, onComplete) {
    const start = {};
    const changes = {};
    for (const [k, v] of Object.entries(props)) {
        start[k] = target[k];
        changes[k] = v - target[k];
    }
    const startTime = performance.now();
    const handler = () => {
        const t = Math.min((performance.now() - startTime) / (duration * 1000), 1);
        const e = easing(t);
        for (const k of Object.keys(changes)) target[k] = start[k] + changes[k] * e;
        if (t >= 1) { onComplete(); return; }
        requestAnimationFrame(handler);
    };
    handler();
}

function easeOutQuad(t) { return t * (2 - t); }
function easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

class Transition {
    constructor() {
        this._pending = false;
    }

    run(type, outContainer, inContainer, width, height, onComplete) {
        if (this._pending) { onComplete(); return; }
        if (type === 'none') { onComplete(); return; }

        this._pending = true;
        inContainer.visible = true;

        const done = () => {
            outContainer.x = 0; outContainer.y = 0; outContainer.alpha = 1;
            inContainer.x = 0; inContainer.y = 0; inContainer.alpha = 1;
            outContainer.visible = false;
            this._pending = false;
            onComplete();
        };

        switch (type) {
            case 'slide_up': this._slide(0, height, 0, -height, outContainer, inContainer, done); break;
            case 'slide_down': this._slide(0, -height, 0, height, outContainer, inContainer, done); break;
            case 'slide_left': this._slide(width, 0, -width, 0, outContainer, inContainer, done); break;
            case 'slide_right': this._slide(-width, 0, width, 0, outContainer, inContainer, done); break;
            case 'bounce_up': this._bounce(0, height, inContainer, done); break;
            case 'bounce_down': this._bounce(0, -height, inContainer, done); break;
            case 'bounce_left': this._bounce(width, 0, inContainer, done); break;
            case 'bounce_right': this._bounce(-width, 0, inContainer, done); break;
            case 'fade_in_out': this._fade(outContainer, inContainer, done); break;
            default: done(); break;
        }
    }

    _slide(outX, outY, inX, inY, outC, inC, done) {
        inC.x = inX; inC.y = inY;
        let count = 0;
        const check = () => { if (++count >= 2) done(); };
        tween(outC, { x: outX, y: outY }, 0.5, easeOutQuad, check);
        tween(inC, { x: 0, y: 0 }, 0.5, easeOutQuad, check);
    }

    _bounce(startX, startY, inC, done) {
        inC.x = startX; inC.y = startY;
        tween(inC, { x: 0, y: 0 }, 1, easeOutBounce, done);
    }

    _fade(outC, inC, done) {
        inC.alpha = 0;
        let count = 0;
        const check = () => { if (++count >= 2) done(); };
        tween(outC, { alpha: 0 }, 0.5, easeOutQuad, check);
        tween(inC, { alpha: 1 }, 0.5, easeOutQuad, check);
    }
}

export { Transition };
