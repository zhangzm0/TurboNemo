// ==================== extensions/sound/index.js ====================
import { def } from '../../blocks/def.js';
import { midi } from './midi/index.js';

const STATIC_BASE = 'https://static.codemao.cn/nemo/22';
const MIDI_BASE = 'https://creation.bcmcdn.com/490';

const soundBlocks = {
    'sound_get': def({
        output: 'String',
        args0: [{ type: 'field_dropdown', name: 'audio' }],
        js: "'{$audio}'",
    }),
    'sound_get_all': def({
        output: 'String',
        args0: [{ type: 'field_dropdown', name: 'audio' }],
        js({fields}) { return `'${fields.audio || '__all_sounds'}'`; },
    }),
    'audio__play_audio': def({
        args0: [{ type: 'input_value', name: 'audio' }],
        js: '__global__.__sound__.play({audio})',
    }),
    'audio__play_audio_and_wait': def({
        args0: [{ type: 'input_value', name: 'audio' }],
        js({values, next}) {
            return `    { const __p = __global__.__sound__.playAndWait(${values.audio}); if (__p) yield __p; }\n${next}`;
        },
    }),
    'audio__stop_all_audios': def({
        args0: [{ type: 'input_value', name: 'audio' }],
        js: '__global__.__sound__.stopAll({audio})',
    }),
};

export default {
    name: 'sound',
    version: '1.0.0',
    initData: { sounds: 'audios.sounds' },

    get blocks() {
        return { ...soundBlocks, ...midi.blocks };
    },

    init(core, data) {
        this._sounds = data.sounds || {};

        const audioResources = [];
        const midiResources = [];
        for (const [id, s] of Object.entries(this._sounds)) {
            if (!s.url) continue;
            const base = s.ext === 'mid' ? MIDI_BASE : STATIC_BASE;
            const url = s.url.startsWith('http') ? s.url : `${base}/${s.url}`;
            if (s.ext === 'mid') midiResources.push({ id, url, static: true });
            else audioResources.push({ id, url, static: true });
        }
        if (midiResources.length > 0) core.assetLoader.registerPack('midi_preload', midiResources);
        if (audioResources.length > 0) core.assetLoader.registerPack('audio_preload', audioResources);

        midi.init(core, data);
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
        const activeAudios = [];
        const midiEngine = midi.install(core, this._sounds);

        function resolveAudioUrl(id, s) {
            const buf = core.assetLoader.getPackData('audio_preload', id);
            if (buf) {
                const blob = new Blob([buf]);
                return URL.createObjectURL(blob);
            }
            const url = s.url;
            return url?.startsWith('http') ? url : `${STATIC_BASE}/${url}`;
        }

        const soundApi = {
            play(id) {
                if (Array.isArray(id)) return;
                const s = self._sounds[id];
                if (s?.ext === 'mid') { midiEngine.playMidi(id); return; }
                if (!s) return;
                const url = resolveAudioUrl(id, s);
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
                    return new Promise(resolve => {
                        midiEngine.playMidi(id, null, null, null, () => resolve());
                    });
                }
                if (!s) return null;
                const url = resolveAudioUrl(id, s);
                return new Promise(resolve => {
                    const audio = new Audio(url);
                    audio.play().catch(() => {});
                    audio.onended = () => {
                        const idx = activeAudios.indexOf(audio);
                        if (idx > -1) activeAudios.splice(idx, 1);
                        resolve();
                    };
                    audio.onerror = () => { resolve(); };
                    activeAudios.push(audio);
                });
            },
            stopAll(audioId) {
                if (!audioId || audioId === '__all_sounds') {
                    activeAudios.forEach(a => { a.pause(); a.currentTime = 0; });
                    activeAudios.length = 0;
                    midiEngine.stopAll();
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
        core.eventBus.on('tn:restart', () => {
            activeAudios.forEach(a => { a.pause(); a.currentTime = 0; });
            activeAudios.length = 0;
        });

        core.globalHook('__sound__', () => soundApi);
    },
};
