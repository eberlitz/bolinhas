import * as p5 from "p5";
import { Physics } from "./physics";

export class CircularBody extends Physics {
    color: p5.Color;
    constructor(public p: p5, public radius: number, ...args: any[]) {
        super(p, ...args);
    }

    update() {
        super.update();
        this.draw();
    }

    collide(target: CircularBody) {
        const distanceVec = p5.Vector.sub(target.pos, this.pos);
        let distance = distanceVec.mag();
        const minDist = target.radius + this.radius;
        if (minDist > distance) {
            distance = distance || 1;
            console.log(minDist, distance);
            const collision = distanceVec.div(distance);
            const aci = this.vel.copy().dot(collision);
            const bci = target.vel.copy().dot(collision);
            const acf = bci;
            const bcf = aci;

            this.vel.add(collision.copy().mult(acf - aci));
            target.vel.add(collision.copy().mult(bcf - bci));
        }
    }

    draw() {
        this.p.fill(this.color);
        this.p.ellipse(
            this.pos.x,
            this.pos.y,
            this.radius * 2,
            this.radius * 2
        );

        if (this.options.debug) {
            const pos = this.pos.x.toFixed(2) + "; " + this.pos.y.toFixed(2);
            this.p.fill(50);
            this.p.text(
                pos,
                this.pos.x,
                this.pos.y,
                this.pos.x + 300,
                this.pos.y + 300
            );
        }
    }
}
