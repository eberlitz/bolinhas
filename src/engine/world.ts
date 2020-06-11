import *  as p5 from "p5";
import { Player } from "./player";
import { Controller } from "./controller";
import { KeyboardController } from "./keyboard-control";
import { PlayerProvider, PlayerData } from "../player_provider";

export class World {
    mainPlayer: Player;
    size: number[];
    debug = false;
    staticObjs: p5.Vector[];
    mainController = new KeyboardController();

    constructor(private p: p5, private playerProvider: PlayerProvider) {
        this.staticObjs = []
        this.createBackgroundObjects();
        this.mainPlayer = this.createPlayer();
        this.mainPlayer.updateRemote = () => {
            this.playerProvider.updateRemotePlayer(this.mainPlayer);
        }
        playerProvider.updateMainPlayer = (peerId: string) => {
            this.mainPlayer.peerId = peerId;
            return {
                peerId,
                pos: this.mainPlayer.pos.array()
            } as PlayerData;
        }

        playerProvider.onNewPlayer = (peerId: string) => {
            const player = this.createPlayer();
            player.peerId = peerId;
            return player;
        }
    }

    private createBackgroundObjects() {
        for (let i = 0; i < 1000; i++) {
            this.staticObjs.push(
                this.p.createVector(this.p.random(-5000, 5000), this.p.random(-1000, 1000))
            );
        }
    }



    setup(size: number[]) {
        this.size = size;
        
        this.mainController.attach(this.mainPlayer);
    }

    private createPlayer() {
        const pos = this.p.createVector(200, 200);
        const radius = 20;
        const friction = 0.1;
        const maxSpeed = 10;
        return new Player(this.p, radius, pos, { debug: this.debug, friction, maxSpeed });
    }

    draw() {
        this.p.background(0, 0, 200);

        this.centerOn(this.mainPlayer.pos);
        this.mainController.update();
        this.staticObjs.forEach(obj => {
            this.p.square(obj.x, obj.y, 10)
        })
        this.mainPlayer.update();
        for (const i in this.playerProvider.players) {
            this.playerProvider.players[i].update();
        }
    }

    private centerOn(object: p5.Vector) {
        this.p.translate(-object.x + this.size[0] / 2, -object.y + this.size[1] / 2);
    }
}
