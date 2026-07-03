// 最小事件系统测试 — 不依赖 PIXI/BCM
import { EventBus } from '../src/core/event-bus.js';
import { Scheduler } from '../src/core/scheduler.js';

const bus = new EventBus();
const sched = new Scheduler(bus);

let events = [];

// 注册一个 on_running_group_activated 风格的 task
sched.createTask('test_1', 'actorA', {
    hatType: 'on_running_group_activated',
    factory: (self, scr, am, sm, g, c) => {
        events.push('factory_called');
        return (function*() {
            while (true) {
                events.push('waiting_for_activate');
                const p = yield { _yieldType: 'pause', event: 'screen:activated:actorA' };
                events.push('activated:' + (p?.msg || 'no_msg'));
                yield { _yieldType: 'frame' };
            }
        })();
    }
});

// 手动 start 一个 generator（模拟编译后的行为）
const gen = (function*() {
    while (true) {
        events.push('waiting_for_activate');
        const p = yield { _yieldType: 'pause', event: 'screen:activated:actorA' };
        events.push('activated:' + (p?.msg || 'no_msg'));
        yield { _yieldType: 'frame' };
    }
})();

sched.startTask('test_1', gen, 'actorA');

// tick 一次 — 让 task 跑到 yield
events.push('--- tick 1 ---');
sched.tick();

// 发射事件
events.push('--- emit event ---');
bus.emit('screen:activated:actorA', { msg: 'hello' });

// tick — 让 task 处理 resume
events.push('--- tick 2 ---');
sched.tick();

// 第二次 pause + event
events.push('--- tick 3 ---');
sched.tick(); // 消耗 frame yield, 回到 pause

events.push('--- tick 4 ---');
sched.tick(); // 停在 pause

events.push('--- emit event 2 ---');
bus.emit('screen:activated:actorA', { msg: 'second' });

events.push('--- tick 5 ---');
sched.tick();

// 现在测试 stop + restart
events.push('--- stop task ---');
sched.stopTask('test_1');

events.push('--- emit after stop ---');
bus.emit('screen:activated:actorA', { msg: 'should_not_resume' });

events.push('--- tick 6 ---');
sched.tick();

// restart
events.push('--- restart task ---');
sched.restartTask('test_1', { name: 'actorA' }, null, null, null, {}, null);

events.push('--- emit after restart ---');
bus.emit('screen:activated:actorA', { msg: 'after_restart' });

events.push('--- tick 7 ---');
sched.tick();

console.log(events.join('\n'));

// 验证
let ok = true;
if (!events.includes('activated:hello')) { console.log('FAIL: first event not received'); ok = false; }
if (!events.includes('activated:second')) { console.log('FAIL: second event not received'); ok = false; }
if (events.includes('activated:should_not_resume')) { console.log('FAIL: stopped task was resurrected!'); ok = false; }
if (!events.includes('activated:after_restart')) { console.log('FAIL: restarted task did not receive event'); ok = false; }
if (ok) console.log('\nALL OK');
