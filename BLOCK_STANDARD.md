# TurboNemo 积木接口标准

> 以 Nemo 官方 Blockly JSON 格式为积木定义的主要形式，TurboNemo 只在此基础上
> 附加 `generator`（代码生成）和 `isHat`（事件标记），做到"一次定义、双方使用"。

---

## 目录

1. [总则](#1-总则)
2. [第一层：BlockDef —— 积木定义（官方 JSON）](#2-第一层-blockdef--积木定义官方-json)
3. [第二层：BlockXML —— 默认值与飞出场](#3-第二层-blockxml--默认值与飞出场)
4. [第三层：Generator —— 代码生成器](#4-第三层-generator--代码生成器)
5. [第四层：BlockEvent —— 事件触发](#5-第四层-blockevent--事件触发)
6. [扩展定义 Extension Pack](#6-扩展定义-extension-pack)
7. [与 Nemo 的互操作](#7-与-nemo-的互操作)
8. [校验与 Tooling](#8-校验与-tooling)
9. [附录](#9-附录)

---

## 1. 总则

### 核心原则

```
TurboNemo 积木定义 = 官方 Blockly JSON + generator
```

**一条积木定义，两个系统共用：**

- **Nemo** 用它调用 `blink.define_blocks_with_json_array()` 注册编辑器积木
- **TurboNemo** 用它调用 `registry.register()` 注册编译器积木

积木的 `type` 字段是两个系统之间的唯一连接点。同一 `type` 的积木，在 Nemo
中执行异步函数，在 TurboNemo 中由 generator 生成协程代码。两者行为等价。

### 一条积木定义实例

```javascript
{
  // 以下字段 = 官方 Blockly JSON，与 Nemo block_config.ts 完全一致
  type: 'self_go_forward',
  message0: '%{BKY_SELF_GO_FORWARD}',
  args0: [
    { type: 'input_value', name: 'steps', check: 'Number', align: 'CENTRE' },
  ],
  previousStatement: true,
  nextStatement: true,
  colour: '%{BKY_ACTIONS_HUE}',
  inputsInline: true,

  // 以下字段 = TurboNemo 专属扩展（Nemo 忽略）
  generator(c, b) {
    const s = c.compileValue(b, 'steps');
    return `    { const __r = self.sprite.rotation;
      const __dx = Math.cos(-__r) * ${s}, __dy = -Math.sin(-__r) * ${s};
      self.__moveTo(self.sprite.x + __dx, self.sprite.y + __dy); }\n`
      + c.compileNext(b);
  },
}
```

---

## 2. 第一层：BlockDef —— 积木定义（官方 JSON）

### 格式

完全遵循 Nemo 的 Blockly JSON 格式。字段与 Nemo 的 `BlockConfigDict` 一致。

```javascript
{
  // === 必需 ===
  type:        string,         // 全局唯一积木类型名
  message0:    string,         // 积木显示文本，%1 %2 引用 args0
  args0:       ArgDef[],       // 参数数组
  colour:      string,         // %{BKY_XXX_HUE}
  inputsInline: boolean,       // true=水平 false=垂直

  // === 连接器（三选一，见下表）===
  previousStatement?: boolean,
  nextStatement?: boolean,
  output?: string | string[],

  // === 可选 ===
  tooltip?:    string,
  extensions?: string[],
  mutator?:    string,
  helpUrl?:    string,
}
```

### 连接器规则

| 积木类型 | JSON 字段 | TN 标记 | 示例 |
|---------|----------|---------|------|
| 指令积木 | `previousStatement + nextStatement` | 无 | `self_go_forward` |
| 事件积木 | 仅 `nextStatement` | `isHat: true` | `start_on_click` |
| 表达式积木 | 仅 `output` | 无 | `math_arithmetic_common` |

### args0 参数类型

| type | TN 中的处理方式 | 示例 |
|------|---------------|------|
| `input_value` | `c.compileValue(b, name)` 编译子积木 | `{ type: 'input_value', name: 'steps', check: 'Number' }` |
| `input_statement` | `c.compileStatement(b, name)` 编译内嵌积木 | `{ type: 'input_statement', name: 'DO' }` |
| `input_dummy` | 忽略（占位用） | `{ type: 'input_dummy' }` |
| `field_dropdown` | `c.extractParams(b).name` 读取选中的值 | `{ type: 'field_dropdown', name: 'OP', options: [...] }` |
| `field_image` | 忽略（仅视觉） | `{ type: 'field_image', src, width, height }` |
| `field_icon` | 忽略（仅视觉） | `{ type: 'field_icon', src, is_head }` |
| `field_colour` | `c.extractParams(b).name` 读取颜色值 | `{ type: 'field_colour', name: 'color' }` |
| 自定义 field | DOM 中读取对应 `field[name]` | `field_gesture`, `field_piano` 等 |

### args0 参数名规范

以下 `name` 值在两个系统中必须一致（指向同一个 XML 节点）：

| name | 含义 | check |
|------|------|-------|
| `steps` | 步数 | `Number` |
| `degrees` | 角度 | `Number` |
| `x` / `y` | 坐标 | `Number` |
| `value` | 通用值 | `Number` |
| `time` | 时间(秒) | `Number` |
| `scale` | 缩放 | `Number` |
| `text` | 文本 | `String` |
| `index` | 索引 | `Number` |
| `condition` | 条件 | `Boolean` |
| `sprite` | 角色（下拉） | field_dropdown |
| `message` | 消息（下拉） | field_dropdown |

### 颜色常量

使用 Nemo 官方的 `%{BKY_XXX_HUE}`，不硬编码数值。

---

## 3. 第二层：BlockXML —— 默认值与飞出场

### 与 Nemo 的关系

Nemo 为每个积木定义默认 shadow 值和飞出场 XML。**TurboNemo 不定义 XML，而是直接消费 Nemo 生成的 XML。**

```
Nemo 定义 XML（block_xml.ts） → 作品文件 .bcm → TurboNemo 消费（compiler.js）
```

### TN 中的处理

TurboNemo 的 `Compiler.compile()` 直接接收与 Nemo 完全相同的积木 XML：

```xml
<block type="self_go_forward">
  <value name="steps">
    <shadow type="math_number">
      <field name="NUM">10</field>
    </shadow>
  </value>
</block>
```

Compiler 的 `compileValue(b, 'steps')` 会：
1. 查找 `<value name="steps">` 下的 `<block>` 或 `<shadow>`
2. 编译内嵌积木生成表达式代码
3. 如果没有找到，返回 `'0'`

因此，TurboNemo **不需要独立维护 XML**，但要确保：
- 所有 `input_value` 的 `name` 与 Nemo 官方 XML 中的一致
- 每种积木类型名的 XML 格式在两个系统中兼容

---

## 4. 第三层：Generator —— 代码生成器

### 签名

```javascript
/**
 * @param {Compiler} c     编译器实例
 * @param {Element}  b     当前积木的 DOM 元素（<block type="...">）
 * @returns {string}        生成的 JavaScript 代码字符串
 */
generator(c, b) { /* ... */ }
```

### Compiler 工具方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `compileValue` | `(b, name) => string` | 编译 `value[name]` 子节点，返回表达式代码 |
| `compileNext` | `(b) => string` | 编译 `next > block` 后继链 |
| `compileStatement` | `(b, name) => string` | 编译 `statement[name]` 内的积木 |
| `extractParams` | `(b) => object` | 提取所有 `field[name]` 的文本值 |

### 三种积木的 generator 模式

**指令积木**：必须调用 `c.compileNext(b)` 串联后继积木。

```javascript
{
  type: 'self_set_position_x',
  previousStatement: true,
  nextStatement: true,
  // ... 官方 JSON 字段
  generator(c, b) {
    const v = c.compileValue(b, 'value');
    return `    self.__setX(${v});\n` + c.compileNext(b);
  },
}
```

**表达式积木**：直接返回表达式代码，不调 `compileNext`。

```javascript
{
  type: 'math_arithmetic_common',
  output: 'Number',
  // ... 官方 JSON 字段
  generator(c, b) {
    const op = c.extractParams(b).OP;
    const a = c.compileValue(b, 'A'), b2 = c.compileValue(b, 'B');
    const ops = { ADD: `__calcAdd(${a}, ${b2})`, MINUS: `__calcSubtract(${a}, ${b2})` };
    return ops[op] || `__calcAdd(${a}, ${b2})`;
  },
}
```

**事件积木**：用 `yield { event: '...' }` 等待事件触发。

```javascript
{
  type: 'start_on_click',
  isHat: true,                    // ← 事件标记
  nextStatement: true,            // 无 previousStatement
  // ... 官方 JSON 字段
  generator(c, b) {
    return c.compileNext(b) || '';
  },
}
```

### 特殊变量（在生成代码的运行时环境中可用）

| 变量 | 说明 |
|------|------|
| `self` | 当前角色对象 |
| `__screen__` | 当前屏幕对象 |
| `__actors__` | 角色管理器 |
| `__screens__` | 屏幕管理器 |
| `__global__` | 全局钩子 |
| `__core__` | 引擎实例 |

---

## 5. 第四层：BlockEvent —— 事件触发

### 与 Nemo 的差异

| 维度 | Nemo | TurboNemo |
|------|------|-----------|
| 事件注册 | `ActionSpec` + `register_to_heart` | `isHat: true` 标记 |
| 事件等待 | Heart 调度 | `yield { _yieldType: "pause", event: "..." }` |
| 触发方式 | 运行时事件总线 | `core.eventBus.emit()` |

### TN 中的事件积木

用 `isHat: true` 标记，Generator 中用 `yield` 等待事件：

```javascript
{
  type: 'self_on_tap',
  isHat: true,
  nextStatement: true,
  message0: '%{BKY_SELF_ON_TAP}',
  args0: [
    { type: 'field_dropdown', name: 'type', options: [...] },
  ],
  colour: '%{BKY_EVENTS_HUE}',
  inputsInline: true,

  generator(c, b) {
    const body = c.compileNext(b);
    const type = c.extractParams(b).type || 'mouse_click';
    const event = type === 'mouse_up' ? 'pointerup' : 'pointertap';
    return `\
      while (true) {
        const __params = yield { _yieldType: "pause", event: \`actor:${event}:...\` };
      ${body} }`;
  },
}
```

### 事件列表

| 积木 type | 触发事件名 |
|-----------|-----------|
| `start_on_click` | 作品启动时自动触发 |
| `self_on_tap` | `actor:pointertap:{name}` / `actor:pointerdown:{name}` |
| `on_running_group_activated` | `screen:activated:{name}` |
| `self_listen` | `broadcast:{screen}:{msg}` |
| `on_swipe` | `stage:swipe:{dir}` |
| `on_phone_shake` | TN 暂不支持 |
| `on_phone_tilt` | TN 暂不支持 |

---

## 6. 扩展定义 Extension Pack

### 标准格式

```javascript
export default {
  /** 扩展包标识（对应 Nemo BlockPack.id） */
  name: 'motion',
  /** 版本号 */
  version: '1.0.0',

  /** 积木定义数组（每项 = 官方 JSON + TN generator） */
  blocks: [
    { type: 'self_go_forward', message0: '...', ..., generator(c, b) { } },
    { type: 'self_move_to',    message0: '...', ..., generator(c, b) { } },
  ],

  /** 从 BCM 提取初始化数据（可选） */
  initData: { key: 'bcm.path' },

  /** 初始化函数（加载 BCM 后调用，可选） */
  init(core, data) { },

  /** 安装函数（注册 hooks、事件监听等） */
  install(core) {
    core.selfHook('__moveTo', (actor) => (x, y) => { });
    core.globalHook('__sound__', () => ({ }));
    core.screenHook('broadcast', (screen) => ({ send(msg) { } }));
  },
};
```

### 注册到引擎

```javascript
// src/core/nemo-player.js
use(ext) {
  this._extensions.push(ext);
  const blockMap = {};
  for (const def of (ext.blocks || [])) {
    blockMap[def.type] = def;        // 只保留 type + generator + isHat
  }
  this.registry.registerAll(blockMap);
}
```

### Compiler 消费

```javascript
// src/core/compiler.js — 没有任何变化
const blockDef = this.registry.get(type);
if (blockDef.generator) {
  code = blockDef.generator(this, blockEl);
}
```

---

## 7. 与 Nemo 的互操作

### 7.1 积木定义双向兼容

TN 的 `blocks` 数组中的每一项，直接就是合法的 Nemo Blockly JSON。
在 Nemo 中可以这样用：

```javascript
// Nemo 中直接注册 TN 的积木定义
import { motionPack } from 'TurboNemo/src/extensions/motion/index.js';

// blocks 数组中的每项去掉 generator 后就是标准 JsonConfig
const configs = motionPack.blocks.map(({ generator, ...jsonConfig }) => jsonConfig);
blink.define_blocks_with_json_array(configs);
```

### 7.2 差异对照

| 维度 | Nemo | TurboNemo |
|------|------|-----------|
| 定义格式 | `BlockConfigDict` / `JsonConfig[]` | 官方 JSON + `generator` + `isHat` |
| 积木注册 | `define_blocks_with_json_array()` | `registry.registerAll()` |
| 运行时逻辑 | Domain Functions（异步函数） | Generator（代码字符串输出） |
| 事件机制 | `ActionSpec` + `register_to_heart` | `isHat: true` + `yield { event }` |
| 安装 Hook | `inject_*_functions(deps)` | `install(core)` + `selfHook/globalHook/screenHook` |
| BlockXML | 自己定义 | 直接消费 Nemo 的 XML |

### 7.3 共享积木类型名

以下 type 在两个系统中必须完全一致：

```
motion:    self_go_forward, self_move_to, self_rotate, self_glide_to,
           self_set_position_x, self_set_position_y, self_change_position_x,
           self_change_position_y, self_bounce_off_edge, self_point_towards,
           self_face_to, self_rotate_around, self_move_specify,
           self_set_rotation_type

looks:     self_appear, self_disappear, self_dialog, self_dialog_wait,
           set_scale, self_change_scale, self_set_effect_2,
           self_change_effect_2, self_clear_effects, set_costume_by_index,
           mobile_change_actor_layer, show_stage_dialog, self_gradually_appear,
           self_gradually_disappear, self_flip

sound:     sound_get, audio__play_audio, audio__play_audio_and_wait,
           audio__stop_all_audios

operators: math_arithmetic_common, math_arithmetic_power, math_trig_common,
           math_trig_arc, random, math_single, math_round, logic_compare,
           logic_operation, logic_boolean, logic_negate, text_length,
           text_contain, text_split, mobile__text

events:    start_on_click, self_on_tap, self_listen, self_broadcast,
           on_running_group_activated, on_swipe, stop, restart

control:   wait, repeat_forever, repeat_n_times, controls_if,
           controls_if_no_else, wait_until

data:      variables_get, variables_set, change_variable, list_get,
           lists_append, lists_length, lists_index_of

pen:       self_pen_down, self_pen_up, self_set_pen_size, self_set_pen_color,
           clear_drawing

clone:     mirror, dispose, start_as_a_mirror, get_current_clone_index,
           get_clone_num, get_clone_index_property

broadcast: self_listen, self_broadcast, self_broadcast_and_wait
```

---

## 8. 校验与 Tooling

### 8.1 积木定义校验

```javascript
function validateBlockDef(def) {
  // 必需字段
  if (!def.type) throw new Error('type required');
  if (!def.message0) throw new Error(`message0 required for ${def.type}`);
  if (!Array.isArray(def.args0)) throw new Error(`args0 required for ${def.type}`);
  if (!def.colour) throw new Error(`colour required for ${def.type}`);
  if (typeof def.generator !== 'function') throw new Error(`generator required for ${def.type}`);

  // 连接器规则
  const hasPrev = !!def.previousStatement;
  const hasNext = !!def.nextStatement;
  const hasOutput = !!def.output;
  const connectors = [hasPrev, hasNext, hasOutput].filter(Boolean).length;
  if (connectors === 0) throw new Error(`${def.type}: 缺少连接器字段`);

  // 事件积木：有 nextStatement 但没有 previousStatement
  if (def.isHat && hasPrev) throw new Error(`${def.type}: 事件积木不应有 previousStatement`);

  // 指令积木：previous + next 必须成对
  if (hasPrev && !hasNext && !def.isHat) {
    console.warn(`${def.type}: 有 previousStatement 但没有 nextStatement`);
  }
}
```

### 8.2 Nemo 覆盖度检查

```javascript
// 将 Nemo 侧导出的所有 type 与 TN 注册的 type 对比
async function auditCoverage() {
  const nemoTypes = await fetch('/nemo-block-types.json').then(r => r.json());
  const tnTypes = new Set();

  for (const ext of core._extensions) {
    for (const def of (ext.blocks || [])) {
      tnTypes.add(def.type);
    }
  }

  const missing = nemoTypes.filter(t => !tnTypes.has(t));
  if (missing.length > 0) {
    console.warn(`⚠ TN 缺少 ${missing.length} 个积木:`, missing);
  }
}
```

### 8.3 测试：官方 JSON 转 TN 积木

```javascript
// 测试积木的官方 JSON 是否能被 Nemo 的 define_blocks_with_json_array 消费
import { define_blocks_with_json_array } from '@crc/blink';

function testNemoCompatibility(blocks) {
  const configs = blocks.map(({ generator, isHat, ...json }) => json);
  // 如果 Nemo 能接受，这个调用不会报错
  define_blocks_with_json_array(configs);
  console.log(`✅ ${blocks.length} 个积木与 Nemo 兼容`);
}
```

---

## 9. 附录

### 9.1 关键文件

| 文件 | 内容 |
|------|------|
| `src/core/nemo-player.js` | 主引擎 + `use()` 扩展注册 |
| `src/core/registry.js` | 积木注册表 |
| `src/core/compiler.js` | XML → JS 编译器 |
| `src/core/scheduler.js` | 协程调度器 |
| `src/extensions/*/index.js` | 各分类积木定义（本标准格式） |
| `src/blocks/base.js` | 基础积木（`math_number`, `text`） |
| `src/blocks/events.js` | 事件积木 |
| `src/blocks/control.js` | 控制流积木 |
| `BLOCK_STANDARD.md` | 本文档 |

### 9.2 扩展一览

| name | 目录 | 类型 | blocks |
|------|------|------|--------|
| actor | `extensions/actor/` | 安装 | 0 |
| screen | `extensions/screen/` | 安装 + 积木 | 2 |
| motion | `extensions/motion/` | 积木 + hooks | ~12 |
| looks | `extensions/looks/` | 积木 + hooks | ~20 |
| sound | `extensions/sound/` | 积木 + hooks | ~6 |
| operators | `extensions/operators/` | 积木 + hooks | ~18 |
| data | `extensions/data/` | 积木 + hooks | ~8 |
| sensing | `extensions/sensing/` | 积木 + hooks | ~12 |
| pen | `extensions/pen/` | 积木 + hooks | ~8 |
| clone | `extensions/clone/` | 积木 + hooks | ~6 |
| broadcast | `extensions/broadcast/` | 积木 + hooks | ~3 |
| procedures | `extensions/procedures/` | 积木 | ~4 |
| — | `src/blocks/control.js` | 核心积木 | ~7 |
| — | `src/blocks/events.js` | 核心积木 | ~8 |
| — | `src/blocks/base.js` | 核心积木 | ~2 |
