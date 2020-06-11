import * as p5 from "p5";
import "./style.scss";
import * as Peer from 'peerjs';
import * as io from 'socket.io-client';
import { getLocationHash } from './helpers';
import { requestAudio, setupPeerjs } from "./audiopeer";

import { p5init } from "./engine/sketch";
import { Player } from "./engine/player";
import { PlayerProvider, PlayerData } from "./player_provider";
import EventEmitter = require('events');
import { mode } from "../webpack.common";
import { InteractionInstance } from "twilio/lib/rest/proxy/v1/service/session/interaction";




document.addEventListener("DOMContentLoaded", function (event) {
    init().catch(err => console.error(err))
}, false);




async function init() {
    var { room } = getLocationHash();
    console.log("Room: ", room);

    const localAudioStream = await requestAudio()
    // const iceServers: any[] = [];
    const iceServers = await fetch('/ice').then(response => response.json())

    const audioBroker = await setupPeerjs(iceServers, localAudioStream)

    const myPlayer = {} as PlayerData;
    (window as any).myPlayer = myPlayer;

    console.log('starting')



    var socket = io({
        host: location.hostname,
        port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
        path: '/socket',
        upgrade: false,
        transports: ['websocket'],
    });

    const playerProvider = new PlayerProvider(socket);

    p5init(playerProvider);

    var model = new Model();


    model.on('added', (n) => {
        // Make audio call to anyone else other than me
        if (n.Id() != audioBroker.peerID) {
            audioBroker.makeAudioCall(n.Id())
        }
    })

    socket.on('connect', () => {
        const peerId = audioBroker.peerID;
        console.log('My peer ID is: ' + peerId);
        const newNode = new Node(peerId);
        model.Add(newNode)
        console.log(`Joining room "${room} ..."`);
        socket.emit('join', room, newNode.toJSON());
    })

    socket.on('update', (p: PlayerData) => {
        console.log('update', p)
        let n = model.GetNode(p.peerId);
        if (!n) {
            n = new Node(p.peerId)
            model.Add(n)
        }
        n.apply(p);
    })
}


export declare interface Model {
    on(event: 'added', listener: (n: Node) => void): this;
    on(event: 'deleted', listener: (n: Node) => void): this;
    on(event: string, listener: Function): this;
}
export class Model extends EventEmitter {
    private nodesMap: { [id: string]: Node };
    public nodes: Node[];
    public me: Node;

    Add(n: Node) {
        this.nodes.push(n)
        this.nodesMap[n.Id()] = n;
        this.emit('added', n)
    }

    Delete(n: Node): boolean {
        const idx = this.nodes.indexOf(n);
        if (idx != -1) {
            this.nodes.splice(idx, 1)
            delete this.nodesMap[n.Id()];
            this.emit('deleted', n)
            return true;
        }
        return false
    }

    HasNode(id: string) {
        return !!this.GetNode(id);
    }

    GetNode(id: string) {
        return this.nodesMap[id];
    }
}

type vec2 = [number, number];


export declare interface Node {
    on(event: 'position', listener: (n: vec2) => void): this;
    on(event: 'nickname', listener: (n: string) => void): this;
    on(event: 'color', listener: (n: number) => void): this;
    on(event: 'updated', listener: (n: Node) => void): this;
    on(event: string, listener: Function): this;
}

export class Node extends EventEmitter {
    private nickname: string;
    private color: number;
    private pos: vec2;

    constructor(private id: string) {
        super();
    }

    Id() {
        return this.id;
    }

    setPos(pos: vec2) {
        this.pos = pos;
        this.emit("position", this.pos)
        this.emit("updated", this)
    }

    setNickname(nickname: any) {
        this.nickname = nickname;
        this.emit("nickname", this.pos)
        this.emit("updated", this)
    }

    setColor(color: any) {
        this.color = color;
        this.emit("color", this.pos)
        this.emit("updated", this)
    }

    getPos(): vec2 {
        return this.pos.slice(0) as vec2;
    }

    getNickname() {
        return this.nickname;
    }

    getColor() {
        return this.color;
    }

    apply(obj: any) {
        if (typeof obj.pos !== 'undefined') {
            this.setPos(obj.pos)
        }

        if (typeof obj.nickname !== 'undefined') {
            this.setNickname(obj.nickname)
        }

        if (typeof obj.color !== 'undefined') {
            this.setColor(obj.color)
        }
    }

    toJSON() {
        return {
            id: this.Id(),
            color: this.getColor(),
            nickname: this.getNickname(),
            pos: this.getPos(),
        };
    }
}