// src/extensions/broadcast/index.js
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
${body}    }
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
                return `    yield { _yieldType: "wait", frames: 1 };\n` + c.compileNext(b);
            },
        },
    },
    install(core) {
        // 每个屏幕独立的广播
        core.screenHook('broadcast', (screen) => ({
            send(msg) {
                core.eventBus.emit(`broadcast:${screen.name}:${msg}`, { message: msg });
            },
        }));

        // 给已存在的屏幕补上
        for (const screen of core.screenManager.list) {
            if (!screen.broadcast) {
                screen.broadcast = {
                    send(msg) {
                        core.eventBus.emit(`broadcast:${screen.name}:${msg}`, { message: msg });
                    },
                };
            }
        }
    },
};