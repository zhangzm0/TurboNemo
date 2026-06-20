// src/extensions/broadcast/index.js
const _bwCounts = {};

export default {
    name: 'broadcast',
    version: '1.0.0',
    initData: { broadcasts: 'broadcast.broadcast_dict' },
    init(core, data) {
        this._broadcasts = data.broadcasts || {};
    },
    blocks: {
        'self_listen': {
            isHat: true,
            generator(c, b) {
                const msg = b.querySelector(':scope > field[name="message"]')?.textContent.trim() || '';
                const body = c.compileStatement(b, 'DO');
                if (!body) return `    // listen: ${msg} (empty)\n`;
                return `\
    while (true) {
        const __params = yield { _yieldType: "pause", event: \`broadcast:\${__screen__.name}:${msg}\` };
        __screen__.broadcast.bwInc('${msg}');
${body}        __screen__.broadcast.bwDec('${msg}');
    }
`;
            },
        },
        'self_broadcast': {
            generator(c, b) {
                const msg = b.querySelector(':scope > field[name="message"]')?.textContent.trim() || '';
                return `    __screen__.broadcast.send('${msg}');\n` + c.compileNext(b);
            },
        },
        'self_broadcast_and_wait': {
            generator(c, b) {
                const msg = b.querySelector(':scope > field[name="message"]')?.textContent.trim() || '';
                return `\
    __screen__.broadcast.bwStart('${msg}');
    __screen__.broadcast.send('${msg}');
    yield __core__._YIELD_FRAME;
    while (__screen__.broadcast.bwCheck('${msg}')) {
        yield __core__._YIELD_FRAME;
    }
` + c.compileNext(b);
            },
        },
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
