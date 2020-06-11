import { CircularBody } from "./circle";


export class Player extends CircularBody {
    updateRemote?: () => void;
    peerId: string;
}