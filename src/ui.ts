import * as THREE from "three";
// import {
//     CSS3DRenderer,
//     CSS3DObject,
// } from "three/examples/jsm/renderers/CSS3DRenderer";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Model, ModelNode, Vec2 } from "./model";

import "./lib/GPUParticleSystem";
import * as d3 from "d3-scale";

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
let renderer: THREE.WebGLRenderer;
const PLAYER_SPEED = 1;
const PLAYER_FORCE = 0.4;

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
            if (model.myId === n.Id()) {
                this.playerControl = new PlayerControls(player);
                player.add(camera);
            }

            const updatePlayerColor = (color: string) => {
                player.setColor(new THREE.Color(color));
            };

            const updatePlayerPos = (pos: Vec2) => {
                player.updatePos(pos, model.myId);
                this.drawParticles(player, pos);
            };
            updatePlayerColor(n.getColor());
            n.on("color", updatePlayerColor);
            // Is my player?
            n.on("position", updatePlayerPos);

            n.once("removed", () => {
                n.removeListener("color", updatePlayerColor);
                n.removeListener("position", updatePlayerPos);
                // delete the P5 player
                this.scene.remove(player);
                player.dispose();

                if (model.myId === n.Id()) {
                    this.playerControl.dispose();
                    this.playerControl = undefined;
                }
            });
            scene.add(player);
        });
    }

    private drawParticles(player: Player, pos: Vec2) {
        const round = (num: number) => num;
        // const round = (num: number) => Math.round(num);
        const [oldX, oldY] = player.oldPos.map(round);
        let [x, y] = pos.map(round);
        if (oldX !== x || oldY !== y) {
            player.oldPos = pos;
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
    }

    animate(time: number = 0) {
        requestAnimationFrame(this.animate.bind(this));

        if (this.playerControl) {
            this.playerControl.update();
        }

        this.particleSystem.update(this.clock.getElapsedTime());

        this.scene.children.forEach((obj) => {
            if (obj instanceof Player) {
                obj.update(time);
            }
        });

        //render
        renderer.render(scene, camera);
        // renderer2.render(scene2, camera);
    }
}

class Player extends THREE.Group {
    private material!: THREE.MeshBasicMaterial;
    public oldPos: Vec2 = [0, 0];
    private vel: THREE.Vector3 = new THREE.Vector3(0, 0);
    private acc: THREE.Vector3 = new THREE.Vector3(0, 0);
    analyser: THREE.AudioAnalyser;

    _onMediaStream = this.onMediaStream.bind(this);
    ripple: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

    constructor(public node: ModelNode) {
        super();

        const color = new THREE.Color(node.getColor());
        const radius = 5;
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        this.material = new THREE.MeshBasicMaterial({ color });
        var circle = new THREE.Mesh(geometry, this.material);
        this.add(circle);

        this.ripple = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.5,
            })
        );
        this.add(this.ripple);
        this.ripple.position.y -= 0.001;

        this.node.addListener("stream", this._onMediaStream);
        if (this.node.mediaStream) {
            this.onMediaStream(this.node.mediaStream);
        }
    }

    onMediaStream(stream: MediaStream) {
        var listener = new THREE.AudioListener();
        var sound = new THREE.Audio(listener);
        sound.setMediaStreamSource(stream);
        this.analyser = new THREE.AudioAnalyser(sound, 32);
        // this.analyser.getAverageFrequency();
    }

    updatePos(pos: Vec2, mainId: string) {
        if (mainId !== this.node.Id()) {
            this.position.x = pos[0];
            this.position.y = pos[1];
        }
    }

    setColor(color: THREE.Color) {
        this.material.color = color;
        this.ripple.material.color = color;
    }

    update(time: number) {
        if (this.analyser) {
            let avg = this.analyser.getAverageFrequency();

            const scale = d3.scaleLinear().domain([0, 220]).range([0, 1]);

            avg=scale(Math.max(Math.min(avg, 220), 0));

            this.ripple.scale.x = 4 * avg;
            this.ripple.scale.y = 4 * avg;
        }
    }

    dispose() {
        this.node.removeListener("stream", this._onMediaStream);
    }
}

class Accelerator {
    public position = new THREE.Vector3();
    public velocity = new THREE.Vector3();
    public acceleration = new THREE.Vector3();
    private friction = 0.04;

    update() {
        this.applyFriction();
        this.velocity.add(this.acceleration);
        this.position.add(this.velocity);
        if (this.velocity.length() > PLAYER_SPEED) {
            this.velocity.setLength(PLAYER_SPEED);
        }
        this.acceleration.multiplyScalar(0);
    }

    applyForce(force: THREE.Vector3) {
        this.acceleration.add(force);
    }

    applyFriction() {
        let friction = this.velocity.clone().multiplyScalar(-this.friction);
        let precision = 0.005;
        let force =
            friction.length() < precision
                ? this.velocity.clone().multiplyScalar(-1)
                : friction;
        this.applyForce(force);
    }
}

class PlayerControls extends Accelerator {
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

        const force = new THREE.Vector3(deltaX, deltaY);
        force.setLength(PLAYER_FORCE);
        this.applyForce(force);
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
    scene.background = new THREE.Color(0xfafaf5);

    const light = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();

    scene.add(directionalLight);
    scene.add(light);

    var size = 1000;
    var divisions = 50;
    const ground = new THREE.GridHelper(
        size,
        divisions,
        new THREE.Color(0x14a0e6),
        new THREE.Color(0x1e8bc3)
    );
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
