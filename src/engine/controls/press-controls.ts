import THREE = require("three");
import { Vector, Body } from "matter-js";

import { MainPlayer } from "../player";
import { controlsOpts } from "./keyboard-controls";
import { startContext } from "../helpers";

export class PressControls {
    private pos = new THREE.Vector3(); // create once and reuse
    private force?: THREE.Vector3;
    private raycaster = new THREE.Raycaster();
    private basePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    private pressed = false;
    private originalOnContextMenu = document.oncontextmenu;
    private newOnContextMenu = new Function(
        "return false"
    ) as typeof document.oncontextmenu;
    private _dragged: boolean = false;

    constructor(
        private target: MainPlayer,
        private camera: THREE.Camera,
        private audioListener: THREE.AudioListener
    ) {
        if ("ontouchstart" in document.documentElement) {
            window.addEventListener("touchstart", this.onTouchStart);
            window.addEventListener("touchmove", this.onTouchMove);
            window.addEventListener("touchend", this.stopMove);
        } else {
            window.addEventListener("mousedown", this.onMouseDown);
            window.addEventListener("mouseup", this.stopMove);
            window.addEventListener("mousemove", this.onMouseMove);
        }
    }
    onMouseDown = (event: MouseEvent) => {
        this.dragEnd();
        this.pressed = true;
        this.updateForce(event.clientX, event.clientY);
    };

    onTouchStart = (event: TouchEvent) => {
        this.dragEnd();
        document.oncontextmenu = this.newOnContextMenu;
        this.pressed = true;
        this.updateForce(event.touches[0].clientX, event.touches[0].clientY);
    };

    stopMove = () => {
        this.dragEnd();
        document.oncontextmenu = this.originalOnContextMenu;
        this.pressed = false;
        this.force = undefined;
    };

    onMouseMove = (event: MouseEvent) => {
        this._dragged = true;

        if (this.pressed) {
            this.updateForce(event.clientX, event.clientY);
        }
    };

    onTouchMove = (event: TouchEvent) => {
        this._dragged = true;

        if (this.pressed) {
            this.updateForce(
                event.touches[0].clientX,
                event.touches[0].clientY
            );
        }
    };

    private updateForce(x: number, y: number) {
        this.updateMousePos(x, y);
        this.force = this.pos.clone().sub(this.target.position);
        this.force.setLength(controlsOpts.playerForce);
    }

    private updateMousePos(x: number, y: number) {
        var mv = new THREE.Vector3(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1,
            0.5
        );
        this.raycaster.setFromCamera(mv.clone(), this.camera);
        this.raycaster.ray.intersectPlane(this.basePlane, this.pos);
    }

    dispose() {
        window.removeEventListener("click", this.onMouseDown, false);
        this.target = undefined;
    }

    update() {
        if (this.force) {
            const v = Vector.create(this.force.x, this.force.y);
            Body.applyForce(
                this.target.body,
                Vector.clone(this.target.body.position),
                v
            );
        }
    }

    onTouchEnd = (evt: KeyboardEvent) => {
        let prevent = true;
        if (prevent) {
            evt.preventDefault();
        }
    };

    private dragEnd() {
        if (!this._dragged) {
            startContext(this.audioListener);
        }
        this._dragged = false;
    }
}
