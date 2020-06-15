import *  as p5 from "p5";
import { Player } from "./player";
import { KeyboardController } from "./keyboard-control";
import { Model, Vec2 } from "../model";

export class World {
    mainPlayer: Player;
    size: number[];
    debug = true;
    mainController = new KeyboardController();
    players: Player[] = [];

    constructor(private p: p5, private playerProvider: Model) {

        playerProvider.on('added', (n) => {
            const player = this.createPlayer();
            player.node = n;

            const updatePlayerColor = (color: string) => player.color = p.color(color || '');
            const updatePlayerPos = (pos: Vec2) => player.pos.set(pos[0], pos[1]);
            updatePlayerColor(n.getColor())
            n.on('color', updatePlayerColor);
            // Is my player?
            if (playerProvider.myId === n.Id()) {
                this.mainPlayer = player;
                this.mainController.attach(player);
            } else {
                n.on('position', updatePlayerPos)
            }

            n.once('removed', () => {
                n.removeListener('color', updatePlayerColor);
                n.removeListener('position', updatePlayerPos)
                // delete the P5 player
                let idx = this.players.indexOf(player);
                if (idx != -1) {
                    this.players.splice(idx, 1);
                }
            })
            this.players.push(player);
        })
    }

    setup(size: number[]) {
        this.size = size;
    }

    private createPlayer() {
        const pos = this.p.createVector(0, 0);
        const radius = 6;
        const friction = 0.1;
        const maxSpeed = 4;
        return new Player(this.p, radius, pos, { debug: this.debug, friction, maxSpeed });
    }

    draw() {
        this.p.background(250, 250, 245);
        if (this.mainPlayer) {
            this.centerOn(this.mainPlayer.pos);
        }
        this.mainController.update();

        // draw background
        const size = 1000;
        const gridSize = 25;
        const lightBlue = this.p.color(30, 139, 195);
        this.p.noStroke();
        for (var i = -size; i <= size; i += gridSize) {
            this.p.stroke(lightBlue);
            this.p.line(i, -size, i, size);
            this.p.line(-size, i, size, i);
        }
        this.p.noStroke();

        for (const i in this.players) {
            this.players[i].update();
        }
    }

    private centerOn(object: p5.Vector) {
        this.p.translate(-object.x + this.size[0] / 2, -object.y + this.size[1] / 2);
    }
}