import { CircularBody } from "./circle";


export class Player extends CircularBody {
    updateRemote?: () => void;
    peerId: string;
    oldPos: number[] = [];

    update() {
        super.update()

        const [oldX, oldY] = this.oldPos;
        let [x, y] = this.pos.array();
        if (oldX !== x || oldY !== y) {
            this.oldPos = [x, y];
            this.updateRemote && this.updateRemote();
        }

    }
}