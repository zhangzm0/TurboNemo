// ==================== extensions/looks/index.js ====================
import { looksBlocks } from './blocks.js';
import { dialogBlocks, installDialog } from './dialog/index.js';
import { Effects } from './effects.js';

export default {
    name: 'looks',
    version: '1.0.0',
    blocks: { ...looksBlocks, ...dialogBlocks },
    install(core) {
        installDialog(core);
        core.selfHook('_effects', (actor) => (actor.sprite ? new Effects(actor.sprite) : null));
        core.selfHook('__fadeTo', (actor) => function* (targetAlpha, duration) {
            const startAlpha = actor.sprite.alpha;
            if (duration <= 0 || startAlpha === targetAlpha) {
                actor.sprite.alpha = targetAlpha;
                return;
            }
            const startTime = performance.now();
            let elapsed = 0;
            while (elapsed < duration) {
                elapsed = (performance.now() - startTime) / 1000;
                const t = Math.min(elapsed / duration, 1);
                actor.sprite.alpha = startAlpha + (targetAlpha - startAlpha) * t;
                yield;
            }
            actor.sprite.alpha = targetAlpha;
        });

        // inherit effect values when cloning
        const origClone = core.actorManager.cloneActor;
        core.actorManager.cloneActor = function (protoName, newName) {
            const clone = origClone.call(this, protoName, newName);
            if (clone) {
                const proto = this._byName[protoName];
                if (proto?._effects && clone._effects) {
                    proto._effects.cloneTo(clone._effects);
                }
            }
            return clone;
        };
    },
};