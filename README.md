# TurboNemo

轻量级 Nemo 编程作品播放器，基于 PixiJS v5 协程调度引擎。

目前支持克隆、变量、广播、画笔、自定义函数等部分积木，可直接运行编程猫 Nemo 作品。

## 在线体验

```
https://zhangzm0.github.io/TurboNemo?id=272459552
```

替换 `id` 参数即可加载不同作品。

## 本地运行

```bash
npx http-server . -p 8080 -c-1 --cors
```

浏览器打开 `http://localhost:8080?id=作品ID`。

## 项目结构

```
├── index.html              # 入口页面
├── src/
│   ├── main.js             # 主入口，加载扩展和作品
│   ├── core/               # 核心引擎
│   │   ├── nemo-player.js  # 主调度器，生命周期管理
│   │   ├── compiler.js     # XML → JS 生成器编译
│   │   ├── scheduler.js    # 协程任务调度
│   │   ├── actor.js        # 角色模型
│   │   ├── actor-manager.js# 角色管理 & 克隆系统
│   │   ├── screen.js       # 屏幕模型
│   │   ├── screen-manager.js
│   │   ├── background.js   # 背景模型
│   │   ├── stage.js        # 舞台 & PixiJS 绑定
│   │   ├── asset-loader.js # 远程资源加载器
│   │   ├── event-bus.js    # 事件总线
│   │   └── registry.js     # 积木注册表
│   ├── blocks/             # 内置积木
│   │   ├── base.js         # 基础值积木
│   │   ├── events.js       # 事件积木
│   │   └── control.js      # 控制流积木
│   └── extensions/         # 扩展模块
│       ├── screen/         # 屏幕/场景管理
│       ├── actor/          # 角色初始化
│       ├── motion/         # 运动积木
│       ├── looks/          # 外观积木
│       ├── operators/      # 运算积木
│       ├── variables/      # 变量系统 & 显示
│       ├── sensing/        # 侦测积木
│       ├── sound/          # 音频积木
│       ├── pen/            # 画笔积木
│       ├── clone/          # 克隆积木
│       ├── broadcast/      # 广播积木（按屏幕隔离）
│       └── procedures/     # 自定义函数
```

## 架构设计

- **协程调度**：所有脚本编译为 `function*` 生成器，Scheduler 统一调度，支持 `yield frame` / `wait` / `pause(event)`
- **扩展系统**：`core.use(ext)` 注册，支持 `blocks`（积木）`init(data)`（数据初始化）`install(core)`（钩子注入）三个阶段
- **变量系统**：`{ value }` 包装对象，全局变量共享引用，私有变量克隆时深拷贝。生成器直接操作 `self._vars[id].value`
- **广播系统**：按屏幕隔离，消息格式为 `broadcast:${screenName}:${msg}`
- **克隆系统**：上限 300，超出时销毁最早克隆体。克隆时私有变量深拷贝，全局变量保持共享引用

## 自定义扩展

```javascript
export default {
    name: 'my-ext',
    version: '1.0.0',
    initData: { myData: 'bcm路径' },
    blocks: {
        'my_block': {
            generator(c, b) { return '/* 生成 JS 代码 */'; }
        }
    },
    init(core, data) { /* 数据初始化 */ },
    install(core) {
        core.globalHook('__xxx__', () => api);
        core.actorHook('_xxx', (actor) => value);
        core.screenHook('xxx', (screen) => value);
    }
};
```

## 技术栈

- **PixiJS v5.3.12** — 2D 渲染
- **原生 ES Module** — 零构建工具
- **Generator Function** — 协程调度

## License

MIT

---

> Built with DeepSeek
