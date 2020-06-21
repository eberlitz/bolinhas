import { Player } from "../player";
import THREE = require("three");
import { Accelerator } from "./accelerator";

export const PLAYER_SPEED = 1;
export const PLAYER_FORCE = 0.4;

export class PlayerControls extends Accelerator {
    state = {
        left: 0,
        right: 0,
        up: 0,
        down: 0,
        space: 0,
    };

    private _onKeyUp = this.onKeyUp.bind(this);
    private _onKeyDown = this.onKeyDown.bind(this);

    constructor(private target: Player) {
        super();
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

        // TO lock the camera as the user moves, without adding the camera to the player group
        // camera.position.x = newPosition.x;
        // camera.position.y = newPosition.y;
        // camera.lookAt(
        //     new THREE.Vector3(camera.position.x, camera.position.y, 0)
        // );
        // camera.updateProjectionMatrix();
        const force = new THREE.Vector3(deltaX, deltaY)
        force.setLength(PLAYER_FORCE)

        this.applyForce(force)
        super.update();
        this.target.position.copy(this.position);

        this.target.node.setPos([
            this.target.position.x,
            this.target.position.y,
        ]);

        // TO ROTATE THE USER
        // if (deltaX || deltaY) {
        //     this.target.rotation.z = Math.atan2(deltaY, deltaX) - Math.PI / 2;
        // }
    }

    onKeyDown(evt: KeyboardEvent) {
        let prevent = false;
        if(evt.target !== document.getElementById('viewport')){
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
