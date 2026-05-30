# Nemo Player

轻量级 Nemo/Scratch 编程作品运行时，基于 PixiJS v5 的协程调度引擎。

## 快速开始

```bash
# 启动本地服务器
npx http-server . -p 8080 -c-1 --cors
```

浏览器打开 `http://localhost:8080`，加载 `src/main.js` 中指定的作品 ID。

## 项目结构

```
├── index.html              # 入口页面
├── src/
│   ├── main.js             # 主入口，加载扩展和作品
│   ├── core/               # 核心引擎
│   │   ├── nemo-player.js  # 主调度器
│   │   ├── compiler.js     # XML → JS 生成器编译
│   │   ├── scheduler.js    # 协程任务调度
│   │   ├── actor.js        # 角色模型
│   │   ├── actor-manager.js# 角色管理（含克隆）
│   │   ├── screen.js       # 屏幕模型
│   │   ├── screen-manager.js
│   │   ├── background.js   # 背景模型
│   │   ├── stage.js        # 舞台/PixiJS 绑定
│   │   ├── asset-loader.js # 远程资源加载
│   │   ├── event-bus.js    # 事件总线
│   │   └── registry.js     # 积木注册表
│   ├── blocks/             # 内置积木
│   │   ├── base.js         # 基础值积木
│   │   ├── events.js       # 事件积木
│   │   └── control.js      # 控制流积木
│   └── extensions/         # 扩展模块
│       ├── screen/         # 屏幕/场景
│       ├── actor/          # 角色初始化
│       ├── motion/         # 运动积木
│       ├── looks/          # 外观积木
│       ├── operators/      # 运算积木
│       ├── variables/      # 变量积木
│       ├── sensing/        # 侦测积木
│       ├── sound/          # 音频积木
│       ├── pen/            # 画笔积木
│       ├── clone/          # 克隆积木
│       ├── broadcast/      # 广播积木
│       └── procedures/     # 自定义函数
```

## 架构设计

- **协程调度**：所有脚本编译为 `function*` 生成器，由 Scheduler 统一调度，支持 `yield frame/wait/pause`
- **扩展系统**：通过 `core.use(ext)` 注册，支持 `blocks`、`init(data)`、`install(core)` 钩子
- **变量系统**：全局变量共享引用，私有变量克隆时深拷贝，通过包装对象实现
- **多屏幕**：支持场景切换，广播按屏幕隔离

## API

### 作品加载

```javascript
const core = new NemoPlayer({ container: 'body', width: 562, height: 900 });
core.use(扩展模块);
await core.loadFromWorkId(作品ID);
```

### 自定义扩展

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
    install(core) { /* 安装钩子 */ }
};
```

## 技术栈

- PixiJS v5.3.12
- 原生 ES Module
- 协程调度（Generator Function）

## License

MIT
