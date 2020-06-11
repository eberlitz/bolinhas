
import * as p5 from "p5";
import { Physics } from "./physics";



export class CircularBody extends Physics {
	color: { r: number; g: number; b: number; a?: number; } = {
		r: 255,
		g: 255,
		b: 255,
	};
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
		const minDist = (target.radius + this.radius);
		if (minDist > distance) {
			distance = distance || 1;
			console.log(minDist, distance)
			const collision = distanceVec.div(distance);
			const aci = this.vel.copy().dot(collision);
			const bci = target.vel.copy().dot(collision);
			const acf = bci;
			const bcf = aci;

			this.vel.add(collision.copy().mult(acf - aci));
			target.vel.add(collision.copy().mult(bcf - bci));
		}
	}

	setColor(color: { r: number, g: number, b: number, a?: number }) {
		this.color = color;
	}

	draw() {
		this.p.fill(this.color.r, this.color.g, this.color.b, this.color.a);
		this.p.ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);

        if(this.options.debug){
            let vel = this.vel.x + '; ' + this.vel.y
            this.p.fill(50);
            this.p.text(vel, 10, 10, 70, 80);

        }
	}
}