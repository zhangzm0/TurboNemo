// test/check-screen.mjs — 检查 BCM 中屏幕切换积木和 Background 注入
import { NemoPlayer } from '../src/core/nemo-player.js';

// 用最小 setup 跑编译检查
const core = new NemoPlayer({ width: 900, height: 562 });

// 注注册必要的扩展
core.use((await import('../src/extensions/screen/index.js')).default);
core.use((await import('../src/extensions/actor/index.js')).default);
core.use((await import('../src/extensions/motion/index.js')).default);
core.use((await import('../src/extensions/variables/index.js')).default);
core.use((await import('../src/extensions/data/index.js')).default);
core.use((await import('../src/extensions/looks/index.js')).default);
core.use((await import('../src/extensions/operators/index.js')).default);
core.use((await import('../src/extensions/sensing/index.js')).default);
core.use((await import('../src/extensions/clone/index.js')).default);
core.use((await import('../src/extensions/broadcast/index.js')).default);
core.use((await import('../src/extensions/sound/index.js')).default);
core.use((await import('../src/extensions/pen/index.js')).default);
core.use((await import('../src/extensions/procedures/index.js')).default);

const workId = '242833401';
await core.loadFromWorkId(parseInt(workId));

// 检查 1: 屏幕数量
console.log(`\n=== Screens: ${core.screenManager.list.length} ===`);
for (const s of core.screenManager.list) {
    console.log(`  [${s.name}] bg type=${s.bg?.type}, has _vars=${!!s.bg?._vars}, has __moveTo=${!!s.bg?.__moveTo}`);
}

// 检查 2: Background 的 selfHook 注入
console.log(`\n=== Background selfHook injection ===`);
for (const s of core.screenManager.list) {
    const bg = s.bg;
    console.log(`  ${s.name}.bg:`);
    console.log(`    type: ${bg.type}`);
    console.log(`    _vars: ${!!bg._vars}`);
    console.log(`    __moveTo: ${typeof bg.__moveTo}`);
    console.log(`    __setX: ${typeof bg.__setX}`);
    console.log(`    __setY: ${typeof bg.__setY}`);
    console.log(`    _brush: ${bg._brush ? 'yes' : 'no'}`);
    console.log(`    sprite is TilingSprite: ${bg.sprite instanceof PIXI.TilingSprite}`);
    console.log(`    sprite.anchor: (${bg.sprite.anchor.x}, ${bg.sprite.anchor.y})`);
}

// 检查 3: switchTo 方法签名
console.log(`\n=== switchTo ===`);
console.log(`  switchTo length: ${core.screenManager.switchTo.length}`); // should be 2 (index + callback)
console.log(`  setTransitionType: ${typeof core.screenManager.setTransitionType}`);

// 检查 4: set_scene_transition blocks in compiled code
console.log(`\n=== Compiled screen transition blocks ===`);
for (const [taskId, task] of Object.entries(core.scheduler._all)) {
    if (task.restartInfo?.code?.includes('setTransitionType')) {
        console.log(`  ${taskId}:`);
        console.log(`    ${task.restartInfo.code.split('\n').filter(l => l.includes('setTransitionType')).join('\n    ')}`);
    }
}

// 检查 5: 扫描 set_scene_transition 积木被调用的情况
console.log(`\n=== Screens using transitions ===`);
for (const [taskId, task] of Object.entries(core.scheduler._all)) {
    const code = task.restartInfo?.code || '';
    if (code.includes('setTransitionType')) {
        const name = task.restartInfo?.entityName || taskId;
        console.log(`  ${name} has setTransitionType call`);
    }
}

console.log('\n=== Done ===');
console.log(`Task count: ${Object.keys(core.scheduler._all).length}`);
