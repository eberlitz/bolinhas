import { Player } from "./engine/player";
import * as io from 'socket.io-client';

export class PlayerProvider {
    players: { [id: string]: Player } = {};

    public onNewPlayer: (peerId: string) => Player;

    public updateMainPlayer: (peerId: string) => PlayerData;

    constructor(private socket: typeof io.Socket) { }

    public updateLocalPlayer(p: PlayerData) {
        let p5Player = this.players[p.peerId];
        if (!p5Player) {
            this.players[p.peerId] = p5Player = this.onNewPlayer(p.peerId)
        }
        p5Player.pos.set(p.pos[0], p.pos[1]);
    }

    public updateRemotePlayer(p: Player) {
        this.socket.emit('update', {
            peerId: p.peerId,
            pos: p.pos.array(),
        } as PlayerData)
    }
}


export interface PlayerData {
    peerId: string;
    nickname: string;
    pos: [number, number];
}


