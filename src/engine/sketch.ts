// import { Circle } from "./circle.js";

import p5 = require("p5");
import { World } from "./world";
import { Model } from "../model";

export const p5init = (pp: Model) => {
    return new p5((p: p5) => {
        const world = new World(p, pp);
        p.setup = () => {
            const size = [800, 600];

            p.createCanvas(p.windowWidth, p.windowHeight);
            world.setup(size);
        };

        p.draw = () => {
            world.draw();
        };

        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };
    }, document.getElementById("p5-container"));
};
