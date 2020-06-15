import { Physics } from "./physics.js";

export abstract class Controller {
    abstract attach(player: Physics): void;
    abstract update(): void;
}
