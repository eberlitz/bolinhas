import { MainPlayer } from "../player";
import THREE = require("three");
import { Body, Vector } from "matter-js";
import { startContext } from "../helpers";

export const controlsOpts = {
    playerForce: 0.005,
};

export class KeyboardControls {
    state = {
        left: 0,
        right: 0,
        up: 0,
        down: 0,
        space: 0,
    };

    private _onKeyUp = this.onKeyUp.bind(this);
    private _onKeyDown = this.onKeyDown.bind(this);

    constructor(
        private target: MainPlayer,
        private camera: THREE.OrthographicCamera,
        private audioListener: THREE.AudioListener
    ) {
        window.addEventListener("keyup", this._onKeyUp, false);
        window.addEventListener("keydown", this._onKeyDown, false);
    }

    dispose() {
        window.removeEventListener("keyup", this._onKeyUp, false);
        window.removeEventListener("keydown", this._onKeyDown, false);
        this.target = undefined;
    }

    update() {
        // Update Player position
        const deltaX = this.state.right - this.state.left;
        const deltaY = this.state.up - this.state.down;

        const v = Vector.mult(
            Vector.normalise(Vector.create(deltaX, deltaY)),
            controlsOpts.playerForce
        );

        Body.applyForce(
            this.target.body,
            Vector.clone(this.target.body.position),
            v
        );

        // const force = new THREE.Vector3(deltaX, deltaY);
        // force.setLength(PLAYER_FORCE);

        // this.applyForce(force);
        // super.update();
        // this.target.position.copy(this.position);

        // this.target.node.setPos([
        //     this.target.position.x,
        //     this.target.position.y,
        // ]);

        // this.camera.position.x = this.position.x;
        // this.camera.position.y = this.position.y;
        // this.camera.lookAt(
        //     new THREE.Vector3(this.position.x, this.position.y, 0)
        // );
        // this.camera.updateProjectionMatrix();

        // // TO ROTATE THE USER
        // if (deltaX || deltaY) {
        //     this.target.rotation.z = Math.atan2(deltaY, deltaX) - Math.PI / 2;
        // }
    }

    onKeyDown(evt: KeyboardEvent) {
        startContext(this.audioListener.context);
        let prevent = false;
        if (evt.target !== document.getElementById("viewport")) {
            return;
        }
        switch (evt.key) {
            case "d":
            case "ArrowRight":
                this.state.right = 1;
                break;
            case "a":
            case "ArrowLeft":
                this.state.left = 1;
                break;
            case "w":
            case "ArrowUp":
                this.state.up = 1;
                break;
            case "s":
            case "ArrowDown":
                this.state.down = 1;
                break;
            case " ":
                this.state.space = 1;
                break;
            default:
                prevent = false;
                break;
        }
        if (prevent) {
            evt.preventDefault();
        }
    }

    onKeyUp(evt: KeyboardEvent) {
        startContext(this.audioListener.context);
        let prevent = true;
        switch (evt.key) {
            case "d":
            case "ArrowRight":
                this.state.right = 0;
                break;
            case "a":
            case "ArrowLeft":
                this.state.left = 0;
                break;
            case "w":
            case "ArrowUp":
                this.state.up = 0;
                break;
            case "s":
            case "ArrowDown":
                this.state.down = 0;
                break;
            case " ":
                // shoot();
                this.state.space = 0;
                break;
            default:
                prevent = false;
                break;
        }
        if (prevent) {
            evt.preventDefault();
        }
    }
}
