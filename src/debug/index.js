import { Debugger } from './debugger.js';
import { DebugUI } from './ui.js';

export default {
    install(core) {
        core._debugger = new Debugger(core);
        core.compiler._debug = true;
        new DebugUI(core._debugger, core);
    },
};
