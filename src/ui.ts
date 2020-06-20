import * as THREE from "three";
// THREE.Object3D.DefaultUp.set(0, 0, 1);
import * as CANNON from "cannon";
import {
    CSS3DRenderer,
    CSS3DObject,
} from "three/examples/jsm/renderers/CSS3DRenderer";
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

let world: CANNON.World;
let camera: THREE.OrthographicCamera;
let scene: THREE.Scene;
let renderer: THREE.Renderer;
// let scene2: THREE.Scene, renderer2: CSS3DRenderer;
const PLAYER_SPEED = 5.0;

const groundBody = new CANNON.Body({
    mass: 0, // mass == 0 makes the body static
});

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
                    player.body.position.x = pos[0];
                    player.body.position.y = pos[1];
                }

                const round = (num: number) => Math.round(num);
                const [oldX, oldY] = oldPos.map(round);
                let [x, y] = pos.map(round);
                if (oldX !== x || oldY !== y) {
                    oldPos = pos;
                    for (var i = 0; i < 1 * Math.random(); i++) {
                        this.particleSystem.spawnParticle(
                            Object.assign({}, defaultParticleOpts, {
                                color: new THREE.Color(player.node.getColor()),
                                position: new THREE.Vector3(
                                    player.body.position.x,
                                    player.body.position.y,
                                    0
                                ),
                            })
                        );
                    }
                }

                // player.position.setX(pos[0]);
                // player.position.setY(pos[1]);
                // player.position.set(pos[0], pos[1], 0);
            };
            updatePlayerColor(n.getColor());
            n.on("color", updatePlayerColor);
            // Is my player?
            n.on("position", updatePlayerPos);
            if (model.myId === n.Id()) {
                this.playerControl = new PlayerControls(player);
            }

            n.once("removed", () => {
                n.removeListener("color", updatePlayerColor);
                n.removeListener("position", updatePlayerPos);
                // delete the P5 player
                this.scene.remove(player);
                world.remove(player.body);

                if (model.myId === n.Id()) {
                    this.playerControl.dispose();
                    this.playerControl = undefined;
                }
            });
            scene.add(player);
            world.addBody(player.body);
            // var ballContact = new CANNON.ContactMaterial(
            //     groundBody as any,
            //     player.body as any,
            //     {
            //         friction:1
            //     }
            // );
            // world.addContactMaterial(ballContact);
        });
    }

    animate(time: number = 0) {
        requestAnimationFrame(this.animate.bind(this));
        const delta = this.clock.getDelta();
        // this.clock.elapsedTime;

        this.tick += delta;

        if (this.playerControl) {
            this.playerControl.update();
        }

        this.updatePhysics();

        this.particleSystem.update(this.clock.getElapsedTime());

        //render
        renderer.render(scene, camera);
        // renderer2.render(scene2, camera);
    }

    updatePhysics() {
        const timeStep = 1 / 60;
        // Step the physics world
        world.step(timeStep);

        this.scene.children.forEach((child) => {
            if (child instanceof Player) {
                const body = child.body;
                // Copy coordinates from Cannon.js to Three.js
                child.position.copy(body.position as any);
                child.quaternion.copy(body.quaternion as any);
                child.node.setPos([child.position.x, child.position.y]);
            }
        });

        // ground.position.copy(groundBody.position as any);
        // ground.quaternion.copy(groundBody.quaternion as any);
    }
}

class Player extends THREE.Group {
    private material!: THREE.MeshBasicMaterial;
    public body!: CANNON.Body;

    constructor(public node: ModelNode) {
        super();
        var mass = 5,
            radius = 5;
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        this.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        var circle = new THREE.Mesh(geometry, this.material);
        this.add(circle);

        const sphereShape = new CANNON.Sphere(radius);
        const sphereBody = new CANNON.Body({ mass: mass });
        sphereBody.velocity.x = 5;
        sphereBody.addShape(sphereShape);
        sphereBody.position.set(0, 0, 0);
        sphereBody.linearDamping = 0.9;

        this.position.copy(sphereBody.position as any);
        this.quaternion.copy(sphereBody.quaternion as any);

        this.body = sphereBody;
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

        // this.target.body.position.x = newX;
        // this.target.body.position.y = newY;

        // this.target.position.x = newX;
        // this.target.position.y = newY;
        // this.target.body.position.copy(this.target.position as any);
        // this.target.body.quaternion.copy(this.target.quaternion as any);
        this.target.body.velocity.x += deltaX * PLAYER_SPEED;
        this.target.body.velocity.y += deltaY * PLAYER_SPEED;

        camera.position.x = this.target.position.x;
        camera.position.y = this.target.position.y;

        camera.lookAt(
            new THREE.Vector3(camera.position.x, camera.position.y, 0)
        );
        camera.updateProjectionMatrix();

        // if (newPosition.length() < SPACE_RADIUS) {

        // }
        if (deltaX || deltaY) {
            // playerState.directionX = deltaX;
            // playerState.directionY = deltaY;
            this.target.rotation.z = Math.atan2(deltaY, deltaX) - Math.PI / 2;
        }
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
    // renderer2 = new CSS3DRenderer();

    const onWindowResize = () => {
        (renderer as any).setPixelRatio(window.devicePixelRatio);
        renderer.setSize(target.clientWidth, target.clientHeight);
        // renderer2.setSize(target.clientWidth, target.clientHeight);

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

    camera.position.set(0, 0, 400);

    // Setup our world
    world = new CANNON.World();
    // world.gravity.set(0, 0, 0); // m/s²
    world.gravity.set(0, 0, -30);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    (world.defaultContactMaterial as any).contactEquationRegularizationTime = 4;

    // // Create a slippery material (friction coefficient = 0.0)
    // const physicsMaterial = new CANNON.Material("slipperyMaterial");
    // var physicsContactMaterial = new CANNON.ContactMaterial(
    //     physicsMaterial,
    //     physicsMaterial,
    //     {
    //         friction: 0.9,
    //         restitution: 0.3, //
    //     }
    // );
    // // We must add the contact materials to the world
    // world.addContactMaterial(physicsContactMaterial);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000);
    // scene.background = new THREE.Color(0xfafaf5);

    // var lights = [];
    // lights[0] = new THREE.AmbientLight(0xffffff, 1);
    // scene.add(lights[0]);

    const light = new THREE.AmbientLight(0x404040);
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();

    scene.add(directionalLight);
    scene.add(light);

    // var geometry = new THREE.BoxBufferGeometry(300, 100, 1);
    // var material = new THREE.MeshBasicMaterial();
    // var mesh = new THREE.Mesh(geometry, material);
    // scene.add(mesh);

    // var geometry = new THREE.CircleGeometry(5, 32);
    // var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    // var circle = new THREE.Mesh(geometry, material);
    // scene.add(circle);

    var size = 1000;
    var divisions = 50;
    const ground = new THREE.GridHelper(size, divisions);
    ground.rotateX(THREE.MathUtils.degToRad(90));
    ground.position.set(0, 0, -1);
    scene.add(ground);

    // Create a plane
    var groundShape = new CANNON.Plane();
    // var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 0, 1),
        -Math.PI / 2
    );
    world.addBody(groundBody);

    // var groundGeometry = new THREE.BoxGeometry(100, 100, 1),
    //     groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    // ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // ground.receiveShadow = true;
    // scene.add(ground);

    target.appendChild(renderer.domElement);
    // renderer2.domElement.style.position = "absolute";
    // renderer2.domElement.style.top = "0";
    // target.appendChild(renderer2.domElement);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.minZoom = 0.5;
    // controls.maxZoom = 2;

    const vp = new Viewport(scene);
    vp.animate();

    return vp;
}

export const viewport = initUI(target);
