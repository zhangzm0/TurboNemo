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

        this._fps = 0;
        this._frameCount = 0;
        this._lastTime = performance.now();
        const resize = () => this.stage.resize(this.width, this.height);
        window.addEventListener("resize", resize);
        resize();
        this.app.ticker.add(() => this._tick());
        this.app.ticker.add(() => {
            this._mouse.click = false;
        });
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
                this.scheduler.startTask(taskId, gen, actorData.name);
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
                this.scheduler.startTask(taskId, gen, sceneData.name);
            });
        }
    }

    restart() {
        this.scheduler.stopAll();
        this._mouse.down = false;
        this._mouse.click = false;

        const globalObj = {};
        for (const [name, factory] of Object.entries(this._globalHooks))
            globalObj[name] = factory();

        for (const task of Object.values(this.scheduler._all)) {
            if (task.state === 'stopped' && task._restart) {
                const info = task._restart;
                const self = this.actorManager.getByName(info.entityName)
                    || this.screenManager.getByName(info.entityName)?.bg;
                if (!self) continue;
                const screen = this.screenManager.list.find(s =>
                    s.name === info.entityName || s.taskIds?.includes(info.entityName)
                );
                if (!screen) continue;
                const gen = info.factory(self, screen, this.actorManager, this.screenManager, globalObj, this);
                this.scheduler.startTask(task.taskId, gen, info.entityName);
            }
        }
    }

    start() {
        for (const t of Object.values(this.scheduler._all)) {
            if (t.state === "pending" && t.gen)
                this.scheduler.startTask(t.taskId, t.gen, t.entityName);
        }
    }
    stop() {
        this.scheduler.stopAll();
    }
    getFPS() {
        return this._fps;
    }

    _tick() {
        this.scheduler.tick();
        this._frameCount++;
        const now = performance.now();
        if (now - this._lastTime >= 1000) {
            this._fps = Math.round(
                this._frameCount / ((now - this._lastTime) / 1000),
            );
            this._frameCount = 0;
            this._lastTime = now;
        }
    }
}

export { NemoPlayer };
