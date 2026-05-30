// src/core/event-bus.js
class EventBus {
    constructor() {
        this._listeners = {};
    }

    on(event, listener) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(listener);
        return () => this.off(event, listener);
    }

    off(event, listener) {
        const list = this._listeners[event];
        if (list) this._listeners[event] = list.filter(l => l !== listener);
    }

    once(event, listener) {
        const off = this.on(event, (...args) => { off(); listener(...args); });
    }

    emit(event, ...args) {
        const list = this._listeners[event];
        if (list) for (const l of list) l(...args);
    }

    removeAll() { this._listeners = {}; }
}

export { EventBus };