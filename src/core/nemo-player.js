// src/core/nemo-player.js
import { EventBus } from "./event-bus.js";
import { Registry } from "./registry.js";
import { Scheduler } from "./scheduler.js";
import { Compiler } from "./compiler.js";
import { AssetLoader } from "./asset-loader.js";
import { Stage } from "./stage.js";
import { ScreenManager } from "./screen-manager.js";
import { ActorManager } from "./actor-manager.js";
import { baseBlocks } from "../blocks/base.js";
import { eventBlocks } from "../blocks/events.js";
import { controlBlocks } from "../blocks/control.js";

class NemoPlayer {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.width = options.width || 562;
        this.height = options.height || 900;
        this.app = new PIXI.Application({
            width: this.width,
            height: this.height,
            backgroundColor: 0x000000,
            resolution: 1,
            autoDensity: true,
        });
        const el =
            typeof this.container === "string"
                ? document.querySelector(this.container)
                : this.container;
        if (el) el.appendChild(this.app.view);

        this.eventBus = new EventBus();
        this.registry = new Registry();
        this.scheduler = new Scheduler(this.eventBus);
        this.compiler = new Compiler(this.registry);
        this.assetLoader = new AssetLoader(this.eventBus);
        this.stage = new Stage(this.app);
        this.screenManager = new ScreenManager(this.stage);
        this.actorManager = new ActorManager();

        this._globalHooks = {};
        this._screenHooks = {};
        this._selfHooks = {};

        this.actorManager._selfHooks = this._selfHooks;
        this.screenManager._selfHooks = this._selfHooks;
        this.screenManager._screenHooks = this._screenHooks;

        this._extensions = [];
        this._bcm = null;

        this.registry.registerAll(baseBlocks);
        this.registry.registerAll(eventBlocks);
        this.registry.registerAll(controlBlocks);

        this._mouse = { x: 0, y: 0, down: false, click: false };
        this._swipe = { startX: 0, startY: 0, tracking: false };
        const SWIPE_THRESHOLD = 30;
        const updateMouse = (e) => {
            const rect = this.app.view.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            const scaleY = this.height / rect.height;
            this._mouse.x = (e.clientX - rect.left) * scaleX - this.width / 2;
            this._mouse.y = -(e.clientY - rect.top) * scaleY + this.height / 2;
        };
        this.app.view.addEventListener("pointerdown", (e) => {
            this._mouse.down = true;
            this._mouse.click = true;
            updateMouse(e);
            this._swipe.startX = this._mouse.x;
            this._swipe.startY = this._mouse.y;
            this._swipe.tracking = true;
        });
        this.app.view.addEventListener("pointerup", (e) => {
            this._mouse.down = false;
            if (this._swipe.tracking) {
                updateMouse(e);
                const dx = this._mouse.x - this._swipe.startX;
                const dy = this._mouse.y - this._swipe.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= SWIPE_THRESHOLD) {
                    let dir;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        dir = dx > 0 ? 'right' : 'left';
                    } else {
                        dir = dy > 0 ? 'down' : 'up';
                    }
                    this.eventBus.emit(`stage:swipe:${dir}`);
                }
                this._swipe.tracking = false;
            }
        });
        this.app.view.addEventListener("pointermove", updateMouse);
        this.app.view.addEventListener("contextmenu", (e) => e.preventDefault());

        this.globalHook("__mouse__", () => this._mouse);

        // Fixed timestep 16.67ms (60 FPS)
        this._TICK_MS = 1000 / 60;
        this._accumulator = 0;
        this._lastTickTime = performance.now();
        this._maxAccumulator = this._TICK_MS * 5; // 防止螺旋死亡

        this._fps = 0;
        this._frameCount = 0;
        this._lastTime = performance.now();
        const resize = () => this.stage.resize(this.width, this.height);
        window.addEventListener("resize", resize);
        resize();
        this.app.ticker.add(() => this._tick());
        this._YIELD_FRAME = { _yieldType: "frame" };
    }

    globalHook(name, factory) {
        this._globalHooks[name] = factory;
    }
    screenHook(name, factory) {
        this._screenHooks[name] = factory;
    }
    selfHook(name, factory) {
        this._selfHooks[name] = factory;
    }

    use(ext) {
        this._extensions.push(ext);
        this.registry.registerAll(ext.blocks || {});
    }

    async loadFromWorkId(workId) {
        const bcm = await this.assetLoader.loadFromWorkId(workId);
        this._bcm = bcm;
        this.width = this.assetLoader.designW;
        this.height = this.assetLoader.designH;
        this.stage.resize(this.width, this.height);
        for (const ext of this._extensions) {
            if (ext.init) {
                const data = {};
                if (ext.initData) {
                    for (const [key, path] of Object.entries(ext.initData)) {
                        data[key] = path
                            .split(".")
                            .reduce((o, k) => o?.[k], bcm);
                    }
                }
                ext.init(this, data);
            }
            if (ext.install) ext.install(this);
        }
        for (const [name, factory] of Object.entries(this._selfHooks)) {
            for (const a of this.actorManager.list)
                if (!a[name]) a[name] = factory(a);
            for (const s of this.screenManager.list)
                if (s.bg && !s.bg[name]) s.bg[name] = factory(s.bg);
        }
        this._compileAll(bcm);
    }

    _compileAll(bcm) {
        const globalObj = {};
        for (const [name, factory] of Object.entries(this._globalHooks))
            globalObj[name] = factory();

        const nameMap = {};
        if (bcm.variable?.variable_dict) {
            for (const [id, def] of Object.entries(bcm.variable.variable_dict)) {
                nameMap[id] = def.name;
            }
        }
        this._varNameMap = nameMap;

        // 编译角色脚本
        for (const actorData of Object.values(bcm.actors.actors_dict)) {
            if (!actorData.blocksXML) continue;
            const scripts = this.compiler.compile(
                actorData.blocksXML,
                actorData.name,
                "actor",
                nameMap,
            );
            if (!scripts || scripts.length === 0) continue;
            const actor = this.actorManager.getByName(actorData.name);
            const sceneData = bcm.scenes.scenes_dict[actorData.scene_id];
            const screen = sceneData
                ? this.screenManager.getByName(sceneData.name)
                : this.screenManager.getCurrent();
            if (!screen) continue;
            if (!screen.taskIds) screen.taskIds = [];
            screen.taskIds.push(actorData.name);
            scripts.forEach((script, i) => {
                console.log(`[actor:${actorData.name}]`, script.code);
                const fn = new Function(`return (${script.code})`)();
                const gen = fn(
                    actor,
                    screen,
                    this.actorManager,
                    this.screenManager,
                    globalObj,
                    this,
                );
                const taskId = `${actorData.name}_${i}`;
                const factory = (self, scr, am, sm, g, c) => {
                    const f = new Function(`return (${script.code})`)();
                    return f(self, scr, am, sm, g, c);
                };
                const restartInfo = {
                    factory,
                    entityName: actorData.name,
                    code: script.code,
                    hatType: script.hatType,
                    blockList: script.blockList || [],
                    blockTree: script.blockTree,
                };
                this.scheduler.createTask(taskId, actorData.name, restartInfo);
                const t = this.scheduler._all[taskId];
                t.gen = gen;
                t._genStack = [gen];
                t.entityName = actorData.name;
            });
        }

        // 编译场景脚本
        for (const sceneData of Object.values(bcm.scenes.scenes_dict)) {
            if (!sceneData.blocksXML) continue;
            const scripts = this.compiler.compile(
                sceneData.blocksXML,
                sceneData.name,
                "screen",
                nameMap,
            );
            if (!scripts || scripts.length === 0) continue;
            const screen = this.screenManager.getByName(sceneData.name);
            if (!screen) continue;
            scripts.forEach((script, i) => {
                const fn = new Function(`return (${script.code})`)();
                const gen = fn(
                    screen.bg,
                    screen,
                    this.actorManager,
                    this.screenManager,
                    globalObj,
                    this,
                );
                const taskId = `${sceneData.name}_${i}`;
                const factory = (self, scr, am, sm, g, c) => {
                    const f = new Function(`return (${script.code})`)();
                    return f(self, scr, am, sm, g, c);
                };
                const restartInfo = {
                    factory,
                    entityName: sceneData.name,
                    code: script.code,
                    hatType: script.hatType,
                    blockList: script.blockList || [],
                    blockTree: script.blockTree,
                };
                this.scheduler.createTask(taskId, sceneData.name, restartInfo);
                const t = this.scheduler._all[taskId];
                t.gen = gen;
                t._genStack = [gen];
                t.entityName = sceneData.name;
            });
        }
    }

    restart() {
        // 保留：app（PIXI Application）、assetLoader（已加载的纹理）、_bcm、_extensions
        const app = this.app;
        const loader = this.assetLoader;
        const bcm = this._bcm;
        const extensions = this._extensions;
        const registry = this.registry;
        const compiler = this.compiler;

        // 清空舞台上的屏幕容器
        this.stage.screensContainer.removeChildren()
            .forEach(c => c.destroy({ children: true, texture: false }));
        while (this.stage.screensHtmlContainer.firstChild)
            this.stage.screensHtmlContainer.removeChild(this.stage.screensHtmlContainer.firstChild);
        while (this.stage.globalHtmlLayer.firstChild)
            this.stage.globalHtmlLayer.removeChild(this.stage.globalHtmlLayer.firstChild);

        // 重建核心组件
        this.eventBus = new EventBus();
        this.scheduler = new Scheduler(this.eventBus);
        this.screenManager = new ScreenManager(this.stage);
        this.actorManager = new ActorManager();

        this._globalHooks = {};
        this._screenHooks = {};
        this._selfHooks = {};

        this.actorManager._selfHooks = this._selfHooks;
        this.screenManager._selfHooks = this._selfHooks;
        this.screenManager._screenHooks = this._screenHooks;
        this.actorManager._eventBus = this.eventBus;

        // 确保 loader 指向新 eventBus（后续不会再加载，但保持一致性）
        loader._eventBus = this.eventBus;

        // 重置鼠标状态（DOM 监听器在 app.view 上永久存在，只重置数据）
        this._mouse = { x: 0, y: 0, down: false, click: false };
        this._swipe = { startX: 0, startY: 0, tracking: false };
        this.globalHook("__mouse__", () => this._mouse);

        // 清空 app.ticker（扩展注册的 ticker 回调随 restart 废弃）
        let t = this.app.ticker._head;
        while (t) { const n = t.next; this.app.ticker.remove(t.fn); t = n; }
        this.app.ticker.add(() => this._tick());

        // 恢复舞台尺寸
        this.width = loader.designW || 562;
        this.height = loader.designH || 900;
        this.stage.resize(this.width, this.height);

        // 重新注册所有扩展
        for (const ext of extensions) {
            if (ext.init) {
                const data = {};
                if (ext.initData) {
                    for (const [key, path] of Object.entries(ext.initData)) {
                        data[key] = path.split('.').reduce((o, k) => o?.[k], bcm);
                    }
                }
                ext.init(this, data);
            }
            if (ext.install) ext.install(this);
        }

        // 重挂 selfHooks 到新角色/背景
        for (const [name, factory] of Object.entries(this._selfHooks)) {
            for (const a of this.actorManager.list)
                if (!a[name]) a[name] = factory(a);
            for (const s of this.screenManager.list)
                if (s.bg && !s.bg[name]) s.bg[name] = factory(s.bg);
        }

        // 重新编译脚本
        this._compileAll(bcm);
    }

    start() {
        for (const t of Object.values(this.scheduler._all)) {
            if (t.state === "pending" && t.gen) {
                t._genStack = [t.gen];
                this.scheduler.startTask(t.taskId, t.gen, t.entityName);
            }
        }
        // 在下一帧发出 screen:activated（等所有 task 先跑一个 tick 注册 pause listener）
        const firstScreen = this.screenManager.getCurrent();
        if (firstScreen) {
            const activate = () => {
                this.eventBus.emit(`screen:activated:${firstScreen.name}`);
                if (firstScreen.taskIds) {
                    for (const actorName of firstScreen.taskIds) {
                        this.eventBus.emit(`screen:activated:${actorName}`);
                    }
                }
                this.app.ticker.remove(activate);
            };
            this.app.ticker.add(activate);
        }
    }
    stop() {
        this.scheduler.stopAll();
    }
    getFPS() {
        return this._fps;
    }

    _tick() {
        const now = performance.now();
        let elapsed = now - this._lastTickTime;
        this._lastTickTime = now;

        // 防止长时间挂起后（tab切回）一次性追赶太多帧
        if (elapsed > this._maxAccumulator) {
            elapsed = this._maxAccumulator;
        }

        this._accumulator += elapsed;

        // 以固定 16.67ms 步长推进模拟，直到追平累积时间
        while (this._accumulator >= this._TICK_MS) {
            this.scheduler.tick();
            this._accumulator -= this._TICK_MS;
            this._frameCount++;
        }

        // FPS 统计
        if (now - this._lastTime >= 1000) {
            this._fps = Math.round(
                this._frameCount / ((now - this._lastTime) / 1000),
            );
            this._frameCount = 0;
            this._lastTime = now;
        }

        // 每显示帧清除一次点击状态（与模拟 tick 次数无关）
        this._mouse.click = false;
    }
}

export { NemoPlayer };
