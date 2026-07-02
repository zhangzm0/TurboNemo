// src/extensions/sound/index.js
export default {
    name: 'sound',
    version: '1.0.0',
    initData: { sounds: 'audios.sounds' },
    init(core, data) { this._sounds = data.sounds || {}; },
    blocks: {
        // shadow value blocks that return the selected audio ID
        'sound_get': {
            generator(c, b) {
                const id = b.querySelector(':scope > field[name="audio"]')?.textContent.trim() || '';
                return `'${id}'`;
            },
        },
        'sound_get_all': {
            generator(c, b) {
                const id = b.querySelector(':scope > field[name="audio"]')?.textContent.trim() || '__all_sounds';
                return `'${id}'`;
            },
        },
        'audio__play_audio': {
            generator(c, b) {
                const id = c.compileValue(b, 'audio');
                return `    __global__.__sound__.play(${id});\n` + c.compileNext(b);
            },
        },
        'audio__play_audio_and_wait': {
            generator(c, b) {
                const id = c.compileValue(b, 'audio');
                return `    { const __ev = __global__.__sound__.playAndWait(${id}); if (__ev) yield { _yieldType: "pause", event: __ev }; }\n` + c.compileNext(b);
            },
        },
        'audio__stop_all_audios': {
            generator(c, b) { return `    __global__.__sound__.stopAll();\n` + c.compileNext(b); },
        },
    },
    install(core) {
        const self = this;
        const STATIC_BASE = 'https://static.codemao.cn/nemo/22';
        const activeAudios = []; // 所有活跃的 Audio 实例

        const soundApi = {
            play(id) {
                const def = self._sounds[id];
                if (!def) return;
                const url = def.url?.startsWith('http') ? def.url : `${STATIC_BASE}/${def.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
                audio.onended = () => {
                    const idx = activeAudios.indexOf(audio);
                    if (idx > -1) activeAudios.splice(idx, 1);
                };
                activeAudios.push(audio);
            },
            playAndWait(id) {
                const def = self._sounds[id];
                if (!def) return null;
                const url = def.url?.startsWith('http') ? def.url : `${STATIC_BASE}/${def.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
                const eventName = `audio:ended:${id}:${Date.now()}`;
                audio.onended = () => {
                    const idx = activeAudios.indexOf(audio);
                    if (idx > -1) activeAudios.splice(idx, 1);
                    core.eventBus.emit(eventName);
                };
                audio.onerror = () => {
                    core.eventBus.emit(eventName);
                };
                activeAudios.push(audio);
                return eventName;
            },
            stopAll() {
                activeAudios.forEach(a => {
                    a.pause();
                    a.currentTime = 0;
                });
                activeAudios.length = 0;
            },
        };
        core.globalHook('__sound__', () => soundApi);
    },
};