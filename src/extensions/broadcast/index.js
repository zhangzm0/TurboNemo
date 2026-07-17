// src/extensions/broadcast/index.js
const _bwCounts = {};
import { def } from '../../blocks/def.js';

export default {
    name: 'broadcast',
    version: '1.0.0',
    initData: { broadcasts: 'broadcast.broadcast_dict' },
    init(core, data) {
        this._broadcasts = data.broadcasts || {};
        // restart 时清除广播等待计数
        for (const k of Object.keys(_bwCounts)) delete _bwCounts[k];
    },
    blocks: {
        'self_listen': def({
            isHat: true,
            args0: [
                { type: 'field_dropdown', name: 'message' },
                { type: 'input_statement', name: 'DO' },
            ],
            js({fields, statements}) {
                const msg = fields.message || '';
                const body = statements.DO;
                if (!body) return `    // listen: ${msg} (empty)\n`;
                const safeMsg = msg.replace(/'/g, "\\'");
                return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: \`broadcast:\${__screen__.name}:${msg}\` };
        __screen__.broadcast.bwInc('${safeMsg}');
${body}        __screen__.broadcast.bwDec('${safeMsg}');
    }
`;
            },
        }),
        'self_broadcast': def({
            args0: [{ type: 'field_dropdown', name: 'message' }],
            js({fields, next}) {
                const msg = fields.message || '';
                const safeMsg = msg.replace(/'/g, "\\'");
                return `    yield __core__._YIELD_FRAME;\n    __screen__.broadcast.send('${safeMsg}');\n` + next;
            },
        }),
        'self_broadcast_and_wait': def({
            args0: [{ type: 'field_dropdown', name: 'message' }],
            js({fields, next}) {
                const msg = fields.message || '';
                const safeMsg = msg.replace(/'/g, "\\'");
                return `\
    __screen__.broadcast.bwStart('${safeMsg}');
    __screen__.broadcast.send('${safeMsg}');
    yield __core__._YIELD_FRAME;
    while (__screen__.broadcast.bwCheck('${safeMsg}')) {
        yield __core__._YIELD_FRAME;
    }
` + next;
            },
        }),
    },
    install(core) {
        core.screenHook('broadcast', (screen) => ({
            send(msg) {
                core.eventBus.emit(`broadcast:${screen.name}:${msg}`, { message: msg });
            },
            bwStart(msg) { _bwCounts[`${screen.name}:${msg}`] = 0; },
            bwInc(msg) {
                const k = `${screen.name}:${msg}`;
                if (k in _bwCounts) _bwCounts[k]++;
            },
            bwDec(msg) {
                const k = `${screen.name}:${msg}`;
                if (k in _bwCounts) {
                    _bwCounts[k]--;
                    if (_bwCounts[k] <= 0) delete _bwCounts[k];
                }
            },
            bwCheck(msg) {
                const k = `${screen.name}:${msg}`;
                return k in _bwCounts && _bwCounts[k] > 0;
            },
        }));

        for (const screen of core.screenManager.list) {
            if (!screen.broadcast) {
                const b = core.screenManager._screenHooks.broadcast(screen);
                screen.broadcast = b;
            }
        }
    },
};
