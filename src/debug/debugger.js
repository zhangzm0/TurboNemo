// src/debug/debugger.js
class Debugger {
    constructor(core) {
        this.core = core;
        this._mode = 'monitor';
        this._lastStep = null;
        this._lastValue = null;
        this._listeners = [];
    }

    onUpdate(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    _notify() {
        for (const fn of this._listeners) fn();
    }

    step(ctx) {
        this._lastStep = ctx;
        this._notify();
        if (this._mode === 'step') {
            return { _yieldType: 'pause', event: 'debug:resume' };
        }
        return null;
    }

    value(type, val, entity) {
        this._lastValue = { type, value: val, entity };
        return val;
    }

    stepOver() {
        if (this._mode !== 'step') this._mode = 'step';
        this.core.eventBus.emit('debug:resume');
    }

    continue() {
        this._mode = 'monitor';
        this.core.eventBus.emit('debug:resume');
        this._notify();
    }

    pause() {
        this._mode = 'step';
        this._notify();
    }

    getLastStep() {
        return this._lastStep;
    }

    getLastValue() {
        return this._lastValue;
    }

    getMode() {
        return this._mode;
    }

    getAllTasks() {
        return Object.values(this.core.scheduler._all);
    }
}

export { Debugger };
