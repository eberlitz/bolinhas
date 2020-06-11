import p5 = require("p5");
import { Player } from "./player";
import { Controller } from "./controller";
import { sketch } from "..";

export class World {
    player: Player;
    size: number[];
    debug = false;
    staticObjs: p5.Vector[];
    constructor(private p: p5, private controller: Controller) {
        this.staticObjs = []
        
        for (let i = 0; i < 100; i++){
            this.staticObjs.push(
                p.createVector(this.p.random(-1000,1000), this.p.random(-1000, 1000))
            )
        }
    }
    setup(size: number[]) {
        this.size = size;
        this.createPlayer();
        this.controller.attach(this.player);
    }

    private createPlayer() {
        const pos = this.p.createVector(200,200);
        const radius = 20;
        const bounds = [800, 600];
        const friction = 0.1;
        const maxSpeed = 10;
        this.player = new Player(radius, pos, {debug: this.debug, bounds, friction, maxSpeed});
    }

    draw() { 
        this.p.background(0, 0, 200);

        this.p.translate(-this.player.pos.x + this.size[0]/2, -this.player.pos.y + this.size[1]/2)
        this.controller.update();
        this.staticObjs.forEach(obj => {
            sketch.square(obj.x, obj.y, 10)
        })
        this.player.update();
    }
}
