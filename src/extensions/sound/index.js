// src/extensions/sound/index.js
export default {
    name: 'sound',
    version: '1.0.0',
    initData: { sounds: 'audios.sounds' },
    init(core, data) { this._sounds = data.sounds || {}; },
    blocks: {
        'audio__play_audio': {
            generator(c, b) {
                const id = b.querySelector('field[name="audio"]')?.textContent.trim() || '';
                return `    __global__.__sound__.play('${id}');\n` + c.compileNext(b);
            },
        },
        'audio__play_audio_and_wait': {
            generator(c, b) {
                const id = b.querySelector('field[name="audio"]')?.textContent.trim() || '';
                return `    yield* __global__.__sound__.playAndWait('${id}');\n` + c.compileNext(b);
            },
        },
        'audio__stop_all_audios': {
            generator(c, b) { return `    __global__.__sound__.stopAll();\n` + c.compileNext(b); },
        },
    },
    install(core) {
        const self = this;
        const STATIC_BASE = 'https://static.codemao.cn/nemo/22';
        const soundApi = {
            play(id) {
                const def = self._sounds[id];
                if (!def) return;
                const url = def.url?.startsWith('http') ? def.url : `${STATIC_BASE}/${def.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
            },
            playAndWait(id) {
                const def = self._sounds[id];
                if (!def) return (function*() {})();
                const url = def.url?.startsWith('http') ? def.url : `${STATIC_BASE}/${def.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
                return (function*() { yield new Promise(r => { audio.onended = r; audio.onerror = r; }); })();
            },
            stopAll() {},
        };
        core.globalHook('__sound__', () => soundApi);
    },
};