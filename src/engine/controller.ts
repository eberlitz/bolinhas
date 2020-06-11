import { Physics } from "./physics.js";

export abstract class Controller {
    abstract attach(target: Physics): void;
    abstract update(): void;
}