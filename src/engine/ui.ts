import * as THREE from "three";
import { Bodies, Engine, World, Runner } from "matter-js";

import "../lib/GPUParticleSystem";
import { Model, Vec2 } from "../model";
import particleUrl from "../textures/particle2.png";
import perlinUrl from "../textures/perlin-512.png";
import { Player, MainPlayer } from "./player";
import { PressControls } from "./controls/press-controls";
import { KeyboardControls } from "./controls/keyboard-controls";
import { GPUParticleSystem, ParticleOptions } from "../lib/GPUParticleSystem";
import { startContext } from "./helpers";

// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// create a Matter.js engine
const engine = Engine.create();
const runner = Runner.create({ isFixed: false });
engine.world.gravity.y = 0;
engine.world.gravity.x = 0;

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
} as ParticleOptions;

let camera: THREE.OrthographicCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

const target = document.getElementById("viewport");

export interface Updater {
    update(time: number): void;
}

export class Viewport {
    start() {
        this.animate();

        // This section allows the user to have its tab no visible, and
        // updates the audio gain accordingly to the other users positions.
        //
        // I didn't understood why, but even by moving the updateSoundVolume
        // from the render loop to inside the socket.io updates the audio doesn't
        // seems to update if the tab is not visible, although if we call the update
        // from inside this setInterval it works.
        setInterval(() => {
            this.scene.children
                .filter((a) => a instanceof Player)
                .forEach((p: Player) => p.updateSoundVolume());
        }, 1000);
    }
    private clock = new THREE.Clock();
    audioListener = new THREE.AudioListener();
    particleSystem: GPUParticleSystem;
    private controls: Updater[] = [];

    constructor(private scene: THREE.Scene) {
        var textureLoader = new THREE.TextureLoader();
        this.particleSystem = new GPUParticleSystem({
            maxParticles: 250000,
            particleNoiseTex: textureLoader.load(perlinUrl),
            particleSpriteTex: textureLoader.load(particleUrl),
        });
        this.scene.add(this.particleSystem);
        // startAudioContext(this.audioListener.context);
    }

    setModel(model: Model) {
        model.on("added", (n) => {
            const player = model.IsMainPlayer(n)
                ? new MainPlayer(n, this.audioListener)
                : new Player(n, this.audioListener);

            if (player instanceof MainPlayer) {
                World.add(engine.world, player.body);
                let control: Updater;
                if ("ontouchstart" in document.documentElement) {
                    control = new PressControls(
                        player,
                        camera,
                        this.audioListener
                    );
                } else {
                    control = new KeyboardControls(
                        player,
                        camera,
                        this.audioListener
                    );
                }
                this.controls.push(control);
                n.once("removed", () => {
                    let idx = this.controls.indexOf(control);
                    if (idx != -1) {
                        this.controls.splice(idx, 1);
                    }
                });
                player.add(camera);
                player.add(this.audioListener);
            }
            scene.add(player);

            const updatePlayerColor = (color: string) => {
                player.setColor(new THREE.Color(color));
            };

            const updatePlayerPos = (pos: Vec2) => {
                if (!(player instanceof MainPlayer)) {
                    player.updatePosition(pos);
                }
                this.drawParticles(player, pos);
            };
            n.on("color", updatePlayerColor);
            updatePlayerColor(n.getColor());
            n.on("position", updatePlayerPos);
            updatePlayerPos(n.getPos());

            n.once("removed", () => {
                n.removeListener("color", updatePlayerColor);
                n.removeListener("position", updatePlayerPos);
                // delete the P5 player
                this.scene.remove(player);
                player.dispose();
            });
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
                } as ParticleOptions)
            );
        }
    }

    animate(time: number = 0) {
        requestAnimationFrame(this.animate.bind(this));

        // Run the physics engine
        Runner.tick(runner, engine, time);

        this.controls.forEach((control) => control.update(time));

        this.particleSystem.update(this.clock.getElapsedTime());

        this.scene.children.forEach((obj) => {
            if (obj instanceof Player) {
                obj.update(time);
            }
        });

        //render
        // Engine.update(engine, time);
        renderer.render(scene, camera);
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

    var gridSize = 1000;
    var divisions = 50;
    const ground = new THREE.GridHelper(
        gridSize,
        divisions,
        new THREE.Color(0x14a0e6),
        new THREE.Color(0x1e8bc3)
    );
    ground.rotateX(THREE.MathUtils.degToRad(90));
    ground.position.set(0, 0, -1);
    scene.add(ground);

    const wallThickness = 20;
    // scene code
    World.add(engine.world, [
        Bodies.rectangle(
            0,
            gridSize / 2 + wallThickness / 2,
            gridSize,
            wallThickness,
            {
                isStatic: true,
            }
        ), // Top
        Bodies.rectangle(
            0,
            -(gridSize / 2) - wallThickness / 2,
            gridSize,
            wallThickness,
            {
                isStatic: true,
            }
        ), // Bottom
        Bodies.rectangle(
            -(gridSize / 2) - wallThickness / 2,
            0,
            wallThickness,
            gridSize,
            {
                isStatic: true,
            }
        ), // left
        Bodies.rectangle(
            gridSize / 2 + wallThickness / 2,
            0,
            wallThickness,
            gridSize,
            {
                isStatic: true,
            }
        ), // Right
    ]);

    target.appendChild(renderer.domElement);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.minZoom = 0.5;
    // controls.maxZoom = 2;

    const vp = new Viewport(scene);
    vp.start();

    return vp;
}

export const viewport = initUI(target);

function startAudioContext(context: AudioContext) {
    const overlayEl = document.getElementById("overlay");
    if (!overlayEl) {
        return;
    }
    let dragged = false;
    const ended = () => {
        if (!dragged) {
            overlayEl.removeEventListener("touchstart", ended);
            overlayEl.removeEventListener("touchmove", moved);
            overlayEl.removeEventListener("touchend", ended);
            overlayEl.removeEventListener("mouseup", ended);
            startContext(context);
        }
        dragged = false;
    };
    const moved = () => {
        dragged = true;
    };
    overlayEl.addEventListener("touchstart", ended);
    overlayEl.addEventListener("touchmove", moved);
    overlayEl.addEventListener("touchend", ended);
    overlayEl.addEventListener("mouseup", ended);
}
