import p5 = require("p5");
import { Physics } from "./physics";
import { Controller } from "./controller";
import { Player } from "./player";

interface IControllerSetup {
    UP: number;
    RIGHT: number;
    DOWN: number;
    LEFT: number;
}
enum keys {
    UP, LEFT, RIGHT, DOWN
}

const wasd = {
    UP: 87,
    RIGHT: 68,
    DOWN: 83,
    LEFT: 65
}

const arrows = {
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    LEFT: 37
}

export class KeyboardController {
    target?: Player;
    executionPipeline: Map<keys, () => void> = new Map();
    controllerSetup: IControllerSetup = wasd;
    attach(target: Player) {
        this.target = target;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    dettach() {
        this.target = undefined;
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    onKeyDown = (event: KeyboardEvent) => {
        switch (event.keyCode) {
            case this.controllerSetup.LEFT:
                this.executionPipeline.set(keys.LEFT, this.generateForceFn(-1, 0));
                break;
            case this.controllerSetup.UP:
                this.executionPipeline.set(keys.UP, this.generateForceFn(0, -1));
                break;
            case this.controllerSetup.RIGHT:
                this.executionPipeline.set(keys.RIGHT, this.generateForceFn(1, 0));
                break;
            case this.controllerSetup.DOWN:
                this.executionPipeline.set(keys.DOWN, this.generateForceFn(0, 1));
                break;
        }
        this.target.updateRemote && this.target.updateRemote();
    }

    onKeyUp = (event: KeyboardEvent) => {
        switch (event.keyCode) {
            case this.controllerSetup.LEFT:
                this.executionPipeline.delete(keys.LEFT);
                break;
            case this.controllerSetup.UP:
                this.executionPipeline.delete(keys.UP);
                break;
            case this.controllerSetup.RIGHT:
                this.executionPipeline.delete(keys.RIGHT);
                break;
            case this.controllerSetup.DOWN:
                this.executionPipeline.delete(keys.DOWN);
                break;
        }

        this.target.updateRemote && this.target.updateRemote();
    }
    generateForceFn(x: number, y: number) {
        return () => {
            const force = new p5.Vector()
            force.set(x, y)
            this.target.applyForce(force);
        }
    }


    update() {
        this.executionPipeline.forEach(fn => {
            fn();
        })
    }
}