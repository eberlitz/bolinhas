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

    model.Add()
    model.Update()
    model.Remove()


    /*

    {
        me: {
            id:
            nickname:
            color:
            pos:[x,y]
        },
        nodes:[
            {},
        ]
    }



    */



    socket.on('connect', () => {
        console.log('My peer ID is: ' + audioBroker.peerID);
        console.log(`Joining room "${room} ..."`);

        const myPlayer = playerProvider.updateMainPlayer(audioBroker.peerID)
        Object.assign(myPlayer, myPlayer)
        socket.emit('join', room, myPlayer);
    })

    socket.on('peer_joined', (data: PlayerData) => {
        console.log('peer_joined: ', data);
        playerProvider.updateLocalPlayer(data)
        audioBroker.makeAudioCall(data.peerId)
    });

    socket.on('update', (p: PlayerData) => {
        console.log('update', p)
        playerProvider.updateLocalPlayer(p)
    })
}


export class Model extends EventEmitter {
    public nodes: Node[];
    public me: Node;
}

export class Node extends EventEmitter {
    private id: string;
    private nickname: string;
    private color: number;
    private pos: [number, number];
    
    constructor(private model: Model) {
        super();
    }

    

    setPos(x: number, y: number) {
        this.pos = [x, y]
        this.emit("position", this.pos)
        // this.model.emit("update", this)
    }
}