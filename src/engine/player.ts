import { CircularBody } from "./circle";
import { ModelNode, Vec2 } from "../model";

export class Player extends CircularBody {
    node: ModelNode;

    update() {
        super.update();
        this.node.setPos(this.pos.array().slice(0, 2) as Vec2);
    }
}
