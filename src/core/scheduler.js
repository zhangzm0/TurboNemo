// src/core/scheduler.js
class Scheduler {
    constructor(eventBus) {
        this._eventBus = eventBus;
        this._running = [];
        this._all = {};
        this.MAX_STEPS = 10;
        eventBus.on('task:start', ({ taskId, gen, entityName }) => this.startTask(taskId, gen, entityName));
        eventBus.on('task:startAll', ({ tasks }) => { for (const t of tasks) this.startTask(t.taskId, t.gen, t.entityName); });
        eventBus.on('task:stop', ({ taskId }) => this.stopTask(taskId));
        eventBus.on('task:stopAll', () => this.stopAll());
    }

    createTask(taskId, entityName, restartInfo) {
        const task = { taskId, entityName, gen: null, state: 'pending', waitFrames: 0, _params: null, _restart: restartInfo || null };
        this._all[taskId] = task;
        return task;
    }

    startTask(taskId, gen, entityName) {
        let task = this._all[taskId];
        if (!task) task = this.createTask(taskId, entityName);
        if (gen) task.gen = gen;
        if (entityName) task.entityName = entityName;
        task.state = 'running';
        task.waitFrames = 0;
        task._params = null;
        this._running.push(task);
        this._eventBus.emit('task:started', { taskId });
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
        for (const task of this._running) {
            if (task.entityName !== entityName) task.state = 'stopped';
        }
        this._running = this._running.filter(t => t.state !== 'stopped');
    }

    pauseOtherEntityTasks(entityName) {
        for (const task of this._running) {
            if (task.entityName !== entityName) task.state = 'paused';
        }
        this._running = this._running.filter(t => t.state !== 'paused');
    }

    resumeEntityTasks(entityName) {
        for (const task of Object.values(this._all)) {
            if (task.entityName === entityName && task.state === 'paused') {
                task.state = 'running';
                this._running.push(task);
            }
        }
    }

    tick() {
        for (const task of this._running) {
            if (task.state !== 'running') continue;
            if (task.waitFrames > 0) { task.waitFrames--; continue; }
            const result = task.gen.next(task._params);
            task._params = null;
            if (result.done) {
                task.state = 'finished';
                this._running = this._running.filter(t => t.taskId !== task.taskId);
                this._eventBus.emit('task:finished', { taskId: task.taskId });
                continue;
            }
            const value = result.value;
            if (value?._yieldType === 'frame') continue;
            if (value?._yieldType === 'wait') { task.waitFrames = Math.max(1, value.frames); continue; }
            if (value?._yieldType === 'pause') {
                task.state = 'paused';
                this._running = this._running.filter(t => t.taskId !== task.taskId);
                if (value.event) {
                    this._eventBus.once(value.event, (params) => {
                        task._params = params;
                        task.state = 'running';
                        this._running.push(task);
                    });
                }
                continue;
            }
        }
    }
}

export { Scheduler };
