
import * as p5 from "p5";

interface IPhysicsOptions {
    debug: boolean;
    bounds?: number[];
    friction?: number;
    maxSpeed?: number;
}
export class Physics {
    vel: p5.Vector;
    acc: p5.Vector;
    constructor(
        protected p:p5,
        // public mass: number,
        public pos = p.createVector(),
        protected options?: IPhysicsOptions
    ) {
        this.vel = p.createVector();
        this.acc = p.createVector();
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
        // this.checkEdges();
        this.applyFriction();
        if(this.options.maxSpeed){
            this.vel.limit(this.options.maxSpeed)
        }
    }


    applyForce(vec: p5.Vector) {
        this.acc.add(vec);
        // this.acc.add(vec.div(this.mass));
    }

    setPos(pos: p5.Vector) {
        this.pos = pos;
    }

    checkEdges() {
        if (!this.options.bounds) {
            return;
        }
        const bouncingRate = 0.2
        if (this.pos.x > this.options.bounds[0]) {
            this.pos.x = this.options.bounds[0];
            this.vel.x *= -bouncingRate;
        } else if (this.pos.x < 0) {
            this.vel.x *= -bouncingRate;
            this.pos.x = 0;
        }

        if (this.pos.y > this.options.bounds[1]) {
            this.vel.y *= -bouncingRate;
            this.pos.y = this.options.bounds[1];
        } else if (this.pos.y < 0) {
            this.vel.y *= -bouncingRate;
            this.pos.y = 0;
        }
    }

    applyFriction() {
        if (this.options.friction) {
            let friction = this.vel.copy().mult(-this.options.friction);
            let precision = 0.01
            let force = (friction.mag() < precision) ? this.vel.copy().mult(-1) : friction;
            this.applyForce(force);
        }
    }
}

function vecToFixed(vector: p5.Vector){
    let precision = 1;
    vector.set(+vector.x.toFixed(precision), +vector.y.toFixed(precision))
    return vector;
}