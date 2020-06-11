import { Player } from "./engine/player";
import * as io from 'socket.io-client';

export class PlayerProvider {
    players: { [id: string]: Player } = {};

    public onNewPlayer: (peerId: string) => Player;

    public updateMainPlayer: (peerId: string) => PlayerData;

    public updateRemotePlayer: (p: Player) => void;

    constructor(private socket: typeof io.Socket) {
        this.updateRemotePlayer = throttle((p: Player) => {
            this.socket.emit('update', {
                peerId: p.peerId,
                pos: p.pos.array(),
            } as PlayerData)
        }, 33)
    }

    public updateLocalPlayer(p: PlayerData) {
        let p5Player = this.players[p.peerId];
        if (!p5Player) {
            this.players[p.peerId] = p5Player = this.onNewPlayer(p.peerId)
        }
        p5Player.pos.set(p.pos[0], p.pos[1]);
    }
}

function throttle(func: any, limit: number) {
    let inThrottle = false;
    return function () {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

export interface PlayerData {
    peerId: string;
    nickname: string;
    pos: [number, number];
}


