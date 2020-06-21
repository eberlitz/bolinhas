import * as THREE from "three";
import { Model, ModelNode, Vec2 } from "../model";

import "../lib/GPUParticleSystem";

declare module "three" {
    let GPUParticleSystem: any;
}

import particleUrl from "../textures/particle2.png";
import perlinUrl from "../textures/perlin-512.png";
import { PlayerControls } from "./controls/player-controls";
import { Player } from "./player";

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

const target = document.getElementById("viewport");

export class Viewport {
    private playerControl?: PlayerControls;
    private clock = new THREE.Clock();
    audioListener = new THREE.AudioListener();

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
            const player = new Player(n, this.audioListener);
            if (model.myId === n.Id()) {
                this.playerControl = new PlayerControls(player);
                player.add(camera);
                player.add(this.audioListener);
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
