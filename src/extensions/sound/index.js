// ==================== extensions/sound/index.js ====================
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
            generator(c, b) {
                const id = c.compileValue(b, 'audio');
                return `    __global__.__sound__.stopAll(${id});\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        core.settings?.define({
            id: 'audio.volume',
            label: '音量',
            type: 'number',
            min: 0, max: 1, step: 0.05,
            defaultValue: 1,
            category: 'audio', group: 'volume',
        });

        const self = this;
        const STATIC_BASE = 'https://static.codemao.cn/nemo/22';
        const activeAudios = [];

        function midiEngine() { return core.__midiRef || null; }

        const soundApi = {
            play(id) {
                if (Array.isArray(id)) return;
                const s = self._sounds[id];
                if (s?.ext === 'mid') { midiEngine()?.playMidi(id); return; }
                if (!s) return;
                const url = s.url?.startsWith('http') ? s.url : `${STATIC_BASE}/${s.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
                audio.onended = () => {
                    const idx = activeAudios.indexOf(audio);
                    if (idx > -1) activeAudios.splice(idx, 1);
                };
                activeAudios.push(audio);
            },
            playAndWait(id) {
                if (Array.isArray(id)) return null;
                const s = self._sounds[id];
                if (s?.ext === 'mid') {
                    const m = midiEngine();
                    if (m) {
                        const ev = `midi:ended:${id}:${Date.now()}`;
                        m.playMidi(id, null, null, null, () => core.eventBus.emit(ev));
                        return ev;
                    }
                }
                if (!s) return null;
                const url = s.url?.startsWith('http') ? s.url : `${STATIC_BASE}/${s.url}`;
                const audio = new Audio(url);
                audio.play().catch(() => {});
                const eventName = `audio:ended:${id}:${Date.now()}`;
                audio.onended = () => {
                    const idx = activeAudios.indexOf(audio);
                    if (idx > -1) activeAudios.splice(idx, 1);
                    core.eventBus.emit(eventName);
                };
                audio.onerror = () => { core.eventBus.emit(eventName); };
                activeAudios.push(audio);
                return eventName;
            },
            stopAll(audioId) {
                if (!audioId || audioId === '__all_sounds') {
                    activeAudios.forEach(a => { a.pause(); a.currentTime = 0; });
                    activeAudios.length = 0;
                    midiEngine()?.stopAll();
                    return;
                }
                activeAudios.forEach((a, i) => {
                    a.pause();
                    a.currentTime = 0;
                    delete activeAudios[i];
                });
                activeAudios.length = 0;
            },
        };
        core.globalHook('__sound__', () => soundApi);
    },
};
