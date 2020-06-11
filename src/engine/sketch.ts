// import { Circle } from "./circle.js";

import p5 = require("p5");
import { KeyboardController } from "./keyboard-control";
import { World } from "./world";

const s = (p: p5) => {
    const controller = new KeyboardController();
    const world = new World(p, controller);
    p.setup = () => {
        const size = [800, 600]
        p.createCanvas(size[0], size[1]);
        world.setup(size);
    }

    p.draw = () => {
        world.draw();
    }
}
 export const p5init = () => {
     return new p5(s, document.getElementById("p5-container"));
 }
