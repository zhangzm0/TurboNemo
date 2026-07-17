import { midiBlocks } from './blocks.js';
import { MidiEngine } from './engine.js';
import { DEFAULT_INSTRUMENT } from './gm.js';

export const midi = {
    blocks: midiBlocks,
    _engine: null,

    init() {},

    install(core, soundData) {
        const self = this;

        function getEngine() {
            if (!self._engine) {
                self._engine = new MidiEngine(core.eventBus);
                const packRef = core.assetLoader.getPack('midi_preload');
                if (packRef) self._engine.setMidiBufferCache(packRef);

                for (const [id, s] of Object.entries(soundData)) {
                    if (s.ext === 'mid') self._engine.loadMidi(s);
                }
                self._engine.ensureSampler(DEFAULT_INSTRUMENT);
            }
            return self._engine;
        }

        const engine = getEngine();
        core.globalHook('__midi__', () => engine);

        core.eventBus.on('tn:restart', () => { if (self._engine) self._engine.stopAll(); });

        return engine;
    },
};
