import { Player } from "../player";
import THREE = require("three");
import { Accelerator } from "./accelerator";

export const PLAYER_SPEED = 1;
export const PLAYER_FORCE = 0.4;

export class PressControls extends Accelerator {
    private pos = new THREE.Vector3(); // create once and reuse
    private force?: THREE.Vector3;
    private raycaster = new THREE.Raycaster();
    private basePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    private pressed = false;
    constructor(private target: Player, private scene: THREE.Scene, private camera: THREE.Camera) {
        super();
        if('ontouchstart' in document.documentElement){
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
        this.pressed = true;
        this.updateForce(event.clientX, event.clientY);
    }
    onTouchStart = (event: TouchEvent) => {
        this.pressed = true;
        this.updateForce(event.touches[0].clientX, event.touches[0].clientY);
    }
    stopMove = () => {
        this.pressed = false;
        this.force = undefined;
    }

    onMouseMove = (event: MouseEvent) => {
        if(this.pressed){
            this.updateForce(event.clientX, event.clientY)
        }
    }

    onTouchMove = (event: TouchEvent) => {
        if(this.pressed){
            this.updateForce(event.touches[0].clientX, event.touches[0].clientY)
        }
    }

    private updateForce(x: number, y: number) {
        this.updateMousePos(x, y);
        this.force = this.pos.clone().sub(this.target.position);
        this.force.setLength(PLAYER_FORCE);
    }

    private updateMousePos(x: number, y: number) {
        var mv = new THREE.Vector3(
            (x / window.innerWidth) * 2 - 1,
            -(y / window.innerHeight) * 2 + 1,
            0.5);
        this.raycaster.setFromCamera(mv.clone(), this.camera);
        this.raycaster.ray.intersectPlane(this.basePlane, this.pos);
    }

    dispose() {
        window.removeEventListener("click", this.onMouseDown, false);
        this.target = undefined;
    }

    update() {
        // Update Player position

        if (this.force) {
            this.applyForce(this.force)
        }
        super.update();
        this.target.position.copy(this.position);

        this.target.node.setPos([
            this.target.position.x,
            this.target.position.y,
        ]);
    }

    onTouchEnd = (evt: KeyboardEvent) => {
        let prevent = true;
        if (prevent) {
            evt.preventDefault();
        }
    }
}
