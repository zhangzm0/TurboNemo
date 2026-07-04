// ==================== extensions/midi/index.js ====================
import { midiBlocks } from './blocks.js';
import { MidiEngine } from './engine.js';
import { DEFAULT_INSTRUMENT } from './gm.js';

const CDN_BASE = 'https://creation.bcmcdn.com/490';

export default {
    name: 'midi',
    version: '1.0.0',
    initData: { sounds: 'audios.sounds' },
    blocks: midiBlocks,
    init(core, data) {
        this._sounds = data.sounds || {};
        this._engine = null;

        // 通过资源加载器注册所有 MIDI 文件（统一走 pack 系统）
        const midiResources = [];
        for (const [id, s] of Object.entries(this._sounds)) {
            if (s.ext !== 'mid' || !s.url) continue;
            const url = s.url.startsWith('http') ? s.url : `${CDN_BASE}/${s.url}`;
            midiResources.push({ id, url });
        }
        if (midiResources.length > 0) {
            core.assetLoader.registerPack('midi_preload', midiResources);
        }
    },
    install(core) {
        const self = this;

        function getEngine() {
            if (!self._engine) {
                self._engine = new MidiEngine(core.eventBus);

                // 注入 pack 数据引用（异步填充，_ensureMidiLoaded 有 fallback fetch）
                const packRef = core.assetLoader.getPack('midi_preload');
                if (packRef) self._engine.setMidiBufferCache(packRef);

                for (const [id, s] of Object.entries(self._sounds)) {
                    if (s.ext === 'mid') self._engine.loadMidi(s);
                }
                self._engine.ensureSampler(DEFAULT_INSTRUMENT);
            }
            return self._engine;
        }

        core.__midiRef = getEngine();
        core.globalHook('__midi__', () => core.__midiRef);
        core.eventBus.on('tn:restart', () => { if (self._engine) self._engine.stopAll(); });
    },
};
