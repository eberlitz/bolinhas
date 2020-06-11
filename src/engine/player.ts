import { CircularBody } from "./circle";


export class Player extends CircularBody {
    updateRemote?: () => void;
    peerId: string;

    update() {
        super.update()
        this.updateRemote && this.updateRemote();
    }
}