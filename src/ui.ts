import * as THREE from "three";
// import {
//     CSS3DRenderer,
//     CSS3DObject,
// } from "three/examples/jsm/renderers/CSS3DRenderer";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Model, ModelNode, Vec2 } from "./model";

import "./lib/GPUParticleSystem";

declare module "three" {
    let GPUParticleSystem: any;
}

import particleUrl from "./textures/particle2.png";
import perlinUrl from "./textures/perlin-512.png";

const defaultParticleOpts = {
    positionRandomness: 0.9,
    velocity: new THREE.Vector3(),
    velocityRandomness: 0.3,
    color: 0xaa88ff,
    colorRandomness: 0,
    turbulence: 0,
    lifetime: 4,
    size: 20,
    sizeRandomness: 0,
};

let camera: THREE.OrthographicCamera;
let scene: THREE.Scene;
let renderer: THREE.Renderer;
const PLAYER_SPEED = 1.0;

const target = document.getElementById("viewport");

export class Viewport {
    private playerControl?: PlayerControls;
    private clock = new THREE.Clock();

    particleSystem: any;
    tick: number = 0;
    constructor(private scene: THREE.Scene) {
        var textureLoader = new THREE.TextureLoader();
        this.particleSystem = new THREE.GPUParticleSystem({
            maxParticles: 250000,
            particleNoiseTex: textureLoader.load(perlinUrl),
            particleSpriteTex: textureLoader.load(particleUrl),
        });
        this.scene.add(this.particleSystem);
    }

    setModel(model: Model) {
        model.on("added", (n) => {
            const player = new Player(n);

            const updatePlayerColor = (color: string) => {
                player.setColor(new THREE.Color(color));
            };

            let oldPos = [0, 0];
            const updatePlayerPos = (pos: Vec2) => {
                if (model.myId !== n.Id()) {
                    player.position.x = pos[0];
                    player.position.y = pos[1];
                }

                const round = (num: number) => num;
                // const round = (num: number) => Math.round(num);
                const [oldX, oldY] = oldPos.map(round);
                let [x, y] = pos.map(round);
                if (oldX !== x || oldY !== y) {
                    oldPos = pos;
                    this.particleSystem.spawnParticle(
                        Object.assign({}, defaultParticleOpts, {
                            color: new THREE.Color(player.node.getColor()),
                            position: new THREE.Vector3(
                                player.position.x,
                                player.position.y,
                                0
                            ),
                        })
                    );
                }
            };
            updatePlayerColor(n.getColor());
            n.on("color", updatePlayerColor);
            // Is my player?
            n.on("position", updatePlayerPos);
            if (model.myId === n.Id()) {
                this.playerControl = new PlayerControls(player);
                player.add(camera);
            }

            n.once("removed", () => {
                n.removeListener("color", updatePlayerColor);
                n.removeListener("position", updatePlayerPos);
                // delete the P5 player
                this.scene.remove(player);

                if (model.myId === n.Id()) {
                    this.playerControl.dispose();
                    this.playerControl = undefined;
                }
            });
            scene.add(player);
        });
    }

    animate(time: number = 0) {
        requestAnimationFrame(this.animate.bind(this));


        if (this.playerControl) {
            this.playerControl.update();
        }

        
        this.particleSystem.update(this.clock.getElapsedTime());

        //render
        renderer.render(scene, camera);
        // renderer2.render(scene2, camera);
    }
}

class Player extends THREE.Group {
    private material!: THREE.MeshBasicMaterial;

    constructor(public node: ModelNode) {
        super();
        const radius = 5;
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        this.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        var circle = new THREE.Mesh(geometry, this.material);
        this.add(circle);
    }

    setColor(color: THREE.Color) {
        this.material.color = color;
    }
}

class PlayerControls {
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
        const newX = this.target.position.x + deltaX * PLAYER_SPEED;
        const newY = this.target.position.y + deltaY * PLAYER_SPEED;
        const newPosition = new THREE.Vector3(newX, newY, 0);

        // TO lock the camera as the user moves, without adding the camera to the player group
        // camera.position.x = newPosition.x;
        // camera.position.y = newPosition.y;
        // camera.lookAt(
        //     new THREE.Vector3(camera.position.x, camera.position.y, 0)
        // );
        // camera.updateProjectionMatrix();

        this.target.position.x = newX;
        this.target.position.y = newY;

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
        let prevent = true;
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
function initUI(target: HTMLElement) {
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1);
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });

    const onWindowResize = () => {
        (renderer as any).setPixelRatio(window.devicePixelRatio);
        renderer.setSize(target.clientWidth, target.clientHeight);

        var frustumSize = 500;
        const aspect = target.clientWidth / target.clientHeight;

        camera.left = (frustumSize * aspect) / -2;
        camera.right = (frustumSize * aspect) / 2;
        camera.top = frustumSize / 2;
        camera.bottom = frustumSize / -2;
        camera.near = 1;
        camera.far = 2000;
        camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onWindowResize);
    onWindowResize();

    camera.position.set(0, 0, 500);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111);

    const light = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();

    scene.add(directionalLight);
    scene.add(light);

    var size = 1000;
    var divisions = 50;
    const ground = new THREE.GridHelper(size, divisions, new THREE.Color(0xaaaa33), new THREE.Color(0xffffff));
    ground.rotateX(THREE.MathUtils.degToRad(90));
    ground.position.set(0, 0, -1);
    scene.add(ground);

    target.appendChild(renderer.domElement);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.minZoom = 0.5;
    // controls.maxZoom = 2;

    const vp = new Viewport(scene);
    vp.animate();

    return vp;
}

export const viewport = initUI(target);
