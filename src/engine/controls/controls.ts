import { Accelerator } from "./accelerator";

export abstract class PlayerControl extends Accelerator {
    abstract update: () => void;
    abstract dispose: () => void;
}
