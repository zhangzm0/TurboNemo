// src/core/screen.js
class Screen {
    constructor(name, container, bg, actorLayer, htmlDiv) {
        this.name = name;
        this.type = 'screen';
        this.container = container;
        this.bg = bg;
        this.actorLayer = actorLayer;
        this.htmlDiv = htmlDiv;
        this.layers = {};
        this.taskIds = [];
    }
}

export { Screen };