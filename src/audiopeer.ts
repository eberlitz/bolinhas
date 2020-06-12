import 'webrtc-adapter';
import * as Peer from 'peerjs';
import { Model, ModelNode } from './model';
import p5 = require('p5');

import * as d3 from 'd3-scale';

export async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices
        .getUserMedia({
            video: false,
            audio: true,
        })
    return localAudioStream;
}


import EventEmitter = require('events');


const enum OperationType {
    ADD_TO_NETWORK,
    LOAD,
    DATA,
    DELETE_TEXT,
    INSERT_TEXT,
    UPDATE_CURSOR_OFFSET,
    UPDATE_SELECTION
}

export interface LoadOperation {
    type: OperationType.LOAD;
}

export interface DataOperation {
    type: OperationType.DATA;
    data: any;
    net: string[];
}

export interface AddToNetworkOperation {
    type: OperationType.ADD_TO_NETWORK;
    peer: string;
}

type Operation = LoadOperation | DataOperation | AddToNetworkOperation;


export declare interface ModelP2P<T> {
    on(event: 'data', listener: (n: any) => void): this;
    on(event: string, listener: Function): this;
}

export class ModelP2P<T> extends EventEmitter {
    state: T;
    private networkMap: { [peerID: string]: Peer.DataConnection } = {};

    constructor(
        private peer: Peer
    ) {
        super();
        // peer.on('open', function (id) {})
        peer.on('connection', (conn) => {
            console.log(`<== receive data connection stream from ${conn.peer}`);
            this.attachOnData(conn)
        })
    }

    broadcast(data: any) {
        for (const k in this.networkMap) {
            this.networkMap[k].send(data)
        }
    }

    connectTo(peerID: string) {
        const conn = this.peer.connect(peerID);
        this.attachOnData(conn)
    }

    private attachOnData(conn: Peer.DataConnection) {
        // add the connection to the network
        this.networkMap[conn.peer] = conn;
        // conn.on('open', () => { });
        conn.on('data', (data) => this.onData(data))
        conn.on('error', (err) => {
            console.error(`error from data connection of ${conn.peer}`, err);
        })
        conn.on('close', () => {
            // Remove DataConnection from network
            delete this.networkMap[conn.peer]
        });
    }

    private onData(d: Operation | Operation[]) {
        console.log(`received data:`, d);
        var ops = Array.isArray(d) ? d : [d];
        for (const operation of ops) {
            switch (operation) {
                default:
                    this.emit('data', operation);
                    break
            }
        }
    }
}




export function setupPeerjs(iceServers: any[], localStrem: MediaStream, model: Model): Promise<AudioBroker> {
    return new Promise((resolve, reject) => {
        const peer = new (Peer as any).default({
            host: location.hostname,
            port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
            path: '/peerjs',
            config: {
                iceServers: [{ url: 'stun:stun1.l.google.com:19302' }].concat(iceServers || [])
            },
            debug: 1,
        } as Peer.PeerConnectOption) as Peer;
        peer.on('open', function (id) {
            model.myId = id;
            resolve(new AudioBroker(peer, localStrem, model))
        });
        peer.on('error', function (err) { console.log(err) });
        peer.on('close', function () { console.log('closed') });
        peer.on('disconnected', function () { console.log('disconnected') });
    })
}

export class AudioBroker {
    public peerID: string;

    constructor(private peer: Peer, public localStrem: MediaStream, private model: Model) {
        peer.on('call', async (call) => {
            console.log('receiving call from ', call.peer)
            // Answer the call, providing our mediaStream
            call.answer(this.localStrem);
            // get the media stream of the other peer 
            this.attachOnStream(call)
        });
        this.peerID = peer.id
    }

    public async makeAudioCall(peer_id: string) {
        const call = this.peer.call(peer_id, this.localStrem);
        this.attachOnStream(call)
        return call
    }




    private attachOnStream(call: Peer.MediaConnection) {
        // get the media stream of the other peer 
        call.on('stream', (stream) => {
            console.log('receiving stream from ', call.peer)
            const peer_audio = document.createElement("audio") as HTMLAudioElement;
            // Older browsers may not have srcObject
            if ("srcObject" in peer_audio as any) {
                peer_audio.srcObject = stream;
            } else {
                // Avoid using this in new browsers, as it is going away.
                peer_audio.src = window.URL.createObjectURL(stream);
            }
            peer_audio.onloadedmetadata = function (e) {
                console.log('now playing the audio');
                peer_audio.play();
            }
            document.body.appendChild(peer_audio)

            const me = this.model.GetNode(this.model.myId);
            me.on('position', ([myX, myY]) => {
                const ref = this.model.GetNode(call.peer);
                if (!ref) {
                    console.warn(`Could not find ${call.peer} in model `, this.model.nodes.map(a => a.Id()))
                    return
                }
                this.updateVolume(myX, myY, peer_audio, ref);
            })
            // remove the audio el from DOM and close the call.
            this.model.on('deleted', n => {
                if (n.Id() === call.peer) {
                    console.log("Closing call with", call.peer)
                    call.close();
                    peer_audio.parentElement && peer_audio.parentElement.removeChild(peer_audio)
                }
            })

            call.on('close', () => {
                console.log('call closed, removing audio el')
                const n = this.model.GetNode(call.peer)
                if (n) {
                    this.model.Delete(n);
                }
                peer_audio.parentElement && peer_audio.parentElement.removeChild(peer_audio)
            })

            const otherNode = this.model.GetNode(call.peer)
            if (!otherNode) {
                console.warn(`Could not find ${call.peer} in model `, this.model.nodes.map(a => a.Id()))
                return
            }
            otherNode.on('position', ([hisX, hisY]) => {
                if (!me) {
                    console.warn(`Could not find myself in model `, this.model.nodes.map(a => a.Id()))
                    return
                }
                this.updateVolume(hisX, hisY, peer_audio, me);
            })
        });

        call.on('error', function (err) { console.log(err) });
    }



    private updateVolume(x: number, y: number, peer_audio: HTMLAudioElement, ref: ModelNode) {
        const [refX, refY] = ref.getPos();

        let my = new p5.Vector();
        my.set(refX, refY);
        let his = new p5.Vector();
        his.set(x, y);

        const dist = my.dist(his);

        const scale = d3.scalePow().exponent(0.36).domain([0, 400]).range([1, 0]);
        peer_audio.volume = scale(Math.max(Math.min(dist, 400), 0));

        // peer_audio.volume = Math.max(Math.min(map(dist, 0, 400, 1, 0), 1), 0);
        console.log("volume", peer_audio.volume);
    }
}





function map(n: number,
    start1: number,
    stop1: number,
    start2: number,
    stop2: number,
) {
    return (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
}