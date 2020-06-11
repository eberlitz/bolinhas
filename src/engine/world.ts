import *  as p5 from "p5";
import { Player } from "./player";
import { KeyboardController } from "./keyboard-control";
import { PlayerData } from "../player_provider";
import { Model } from "../model";

export class World {
    mainPlayer: Player;
    size: number[];
    debug = false;
    staticObjs: p5.Vector[];
    mainController = new KeyboardController();
    players: Player[] = [];

    constructor(private p: p5, private playerProvider: Model) {
        this.staticObjs = []
        this.createBackgroundObjects();




        // let p5Player = this.players[p.peerId];
        // if (!p5Player) {
        //     this.players[p.peerId] = p5Player = this.onNewPlayer(p.peerId)
        // }
        // p5Player.pos.set(p.pos[0], p.pos[1]);

        playerProvider.on('added', (n) => {
            const player = this.createPlayer();
            player.node = n;

            // Is my player?
            if (playerProvider.myId === n.Id()) {
                this.mainPlayer = player;
                this.mainController.attach(player);
            } else {
                n.on('position', pos => {
                    player.pos.set(pos[0], pos[1])
                })
                // TODO: needs to remove this listened on removal
            }

            this.players.push(player);
        })

        playerProvider.on('deleted', (n) => {
            const player = this.players.filter(a => a.node.Id() === n.Id())[0]
            let idx = this.players.indexOf(player);
            if (idx != -1) {
                this.players.slice(idx, 1);
            }
        })

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
        if (this.mainPlayer){
            this.centerOn(this.mainPlayer.pos);
        }
        this.mainController.update();
        this.staticObjs.forEach(obj => {
            this.p.square(obj.x, obj.y, 10)
        })
        for (const i in this.players) {
            this.players[i].update();
        }
    }

    private centerOn(object: p5.Vector) {
        this.p.translate(-object.x + this.size[0] / 2, -object.y + this.size[1] / 2);
    }
}
