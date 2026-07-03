// src/core/scheduler.js
class Scheduler {
    constructor(eventBus) {
        this._eventBus = eventBus;
        this._running = [];
        this._all = {};
        this._currentTaskId = null;
    }

    createTask(taskId, entityName, restartInfo) {
        const task = { taskId, entityName, gen: null, _genStack: [], state: 'pending', waitFrames: 0, _params: null, _restart: restartInfo || null, _eventWait: false };
        this._all[taskId] = task;
        return task;
    }

    startTask(taskId, gen, entityName) {
        let task = this._all[taskId];
        if (!task) task = this.createTask(taskId, entityName);
        if (gen) {
            task.gen = gen;
            task._genStack = [gen];
        }
        if (entityName) task.entityName = entityName;
        task.state = 'running';
        task.waitFrames = 0;
        task._params = null;
        task._eventWait = false;
        this._running.push(task);
        this._eventBus.emit('task:started', { taskId });
    }

    restartScript(taskId, self, screen, actors, screens, globalObj, core) {
        const task = this._all[taskId];
        if (!task || !task._restart) return null;
        const info = task._restart;
        this.stopTask(taskId);
        const entity = actors.getByName(info.entityName)
            || screens.getByName(info.entityName)?.bg
            || self;
        if (!entity) return null;
        const gen = info.factory(entity, screen, actors, screens, globalObj, core);
        this.startTask(taskId, gen, info.entityName);
        return gen;
    }

    stopTask(taskId) {
        const task = this._all[taskId];
        if (!task) return;
        task.state = 'stopped';
        this._running = this._running.filter(t => t.taskId !== taskId);
        this._eventBus.emit('task:stopped', { taskId });
    }

    stopAll() { for (const id of Object.keys(this._all)) this.stopTask(id); }

    pauseTask(taskId) {
        const task = this._all[taskId];
        if (!task || task.state !== 'running') return;
        task.state = 'paused';
        task._eventWait = false;
        this._running = this._running.filter(t => t.taskId !== taskId);
    }

    resumeTask(taskId) {
        const task = this._all[taskId];
        if (!task || task.state !== 'paused') return;
        task.state = 'running';
        this._running.push(task);
    }

    stopOtherTasks(entityName, excludeTaskId) {
        for (const task of this._running) {
            if (task.entityName === entityName && task.taskId !== excludeTaskId) task.state = 'stopped';
        }
        this._running = this._running.filter(t => t.state !== 'stopped');
    }

    stopOtherEntityTasks(entityName) {
        for (const task of Object.values(this._all)) {
            if (task.entityName !== entityName && task.state !== 'stopped' && task.state !== 'finished') {
                task.state = 'stopped';
            }
        }
        this._running = this._running.filter(t => t.state !== 'stopped');
    }

    pauseOtherEntityTasks(entityName) {
        for (const task of this._running) {
            if (task.entityName !== entityName) {
                task.state = 'paused';
                task._eventWait = false;
            }
        }
        this._running = this._running.filter(t => t.state !== 'paused');
    }

    resumeEntityTasks(entityName) {
        for (const task of Object.values(this._all)) {
            if (task.entityName === entityName && task.state === 'paused' && !task._eventWait) {
                task.state = 'running';
                this._running.push(task);
            }
        }
    }

    _processTask(task) {
        const genStack = task._genStack;
        while (genStack.length > 0) {
            const currentGen = genStack[genStack.length - 1];
            const result = currentGen.next(task._params);
            task._params = null;

            if (result.done) {
                genStack.pop();
                if (genStack.length > 0) {
                    const retVal = result.value;
                    // genFactory 是 function* 时，thunk 返回的可能是真正的过程 generator，推栈继续执行
                    if (retVal && typeof retVal.next === 'function') {
                        genStack.push(retVal);
                        continue;
                    }
                    task._params = retVal; // 传递返回值给调用方，立即恢复
                    continue;
                }
                task.state = 'finished';
                this._running = this._running.filter(t => t.taskId !== task.taskId);
                this._eventBus.emit('task:finished', { taskId: task.taskId, entityName: task.entityName });
                return;
            }

            const value = result.value;
            if (value?._yieldType === 'call') {
                const newGen = value.genFactory();
                if (newGen) {
                    genStack.push(newGen);
                    continue; // 立即执行被调用函数
                }
                task._params = undefined; // 过程不存在
                continue;
            }

            // frame / wait / pause 挂起回 tick 循环
            if (value?._yieldType === 'frame') return;
            if (value?._yieldType === 'wait') { task.waitFrames = Math.max(1, value.frames); return; }
            if (value?._yieldType === 'pause') {
                task.state = 'paused';
                this._running = this._running.filter(t => t.taskId !== task.taskId);
                if (value.event) {
                    task._eventWait = true;
                    this._eventBus.once(value.event, (params) => {
                        task._params = params;
                        task._eventWait = false;
                        task.state = 'running';
                        this._running.push(task);
                    });
                }
                return;
            }

            return; // 未知 yield 值，挂起
        }
    }

    tick() {
        for (const task of this._running) {
            if (task.state !== 'running') continue;
            if (task.waitFrames > 0) { task.waitFrames--; continue; }
            this._currentTaskId = task.taskId;
            this._processTask(task);
            this._currentTaskId = null;
        }
    }
}

export { Scheduler };
