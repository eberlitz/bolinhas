import "webrtc-adapter";
import * as Peer from "peerjs";
import { Model, ModelNode, Vec2 } from "./model";
import p5 = require("p5");

import * as d3 from "d3-scale";

export async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
    });
    return localAudioStream;
}

export function setupPeerjs(
    iceServers: any[],
    localStrem: MediaStream,
    model: Model
): Promise<AudioBroker> {
    return new Promise((resolve, reject) => {
        const peer = new (Peer as any).default({
            host: location.hostname,
            port:
                (location.port as any) ||
                (location.protocol === "https:" ? 443 : 80),
            path: "/peerjs",
            config: {
                iceServers: [{ url: "stun:stun1.l.google.com:19302" }].concat(
                    iceServers || []
                ),
            },
            debug: 1,
        } as Peer.PeerConnectOption) as Peer;
        peer.on("open", function (id) {
            model.myId = id;
            resolve(new AudioBroker(peer, localStrem, model));
        });
        peer.on("error", function (err) {
            console.log(err);
        });
        peer.on("close", function () {
            console.log("closed");
        });
        peer.on("disconnected", function () {
            console.log("disconnected");
        });
    });
}

export class AudioBroker {
    public peerID: string;
    private currentAudioCalls: Set<string> = new Set();

    constructor(
        private peer: Peer,
        public localStream: MediaStream,
        private model: Model
    ) {
        peer.on("call", async (call) => {
            if (this.currentAudioCalls.has(call.peer)) {
                // ignore if there is already a call to that peer;
                console.warn(
                    "There is already a audio call to peer " + call.peer
                );
                return;
            }
            this.currentAudioCalls.add(call.peer);

            console.log("receiving call from ", call.peer);
            // Answer the call, providing our mediaStream
            call.answer(this.localStream);
            // get the media stream of the other peer
            this.attachOnStream(call, "from_receiving_call");
        });
        this.peerID = peer.id;
    }

    public async makeAudioCall(peer_id: string) {
        if (this.currentAudioCalls.has(peer_id)) {
            // ignore if there is already a call to that peer;
            console.warn("There is already a audio call to peer " + peer_id);
            return;
        }
        this.currentAudioCalls.add(peer_id);

        console.log(`calling ${peer_id}...`);
        const call = this.peer.call(peer_id, this.localStream);
        this.attachOnStream(call, "from_make_audio_call");
        return call;
    }

    private attachOnStream(call: Peer.MediaConnection, msg: string) {
        call.on("close", () => {
            this.currentAudioCalls.delete(call.peer);
        });
        // get the media stream of the other peer
        call.on("stream", (stream) => {
            console.log(msg, "receiving stream from ", call.peer);
            const peer_audio = document.createElement(
                "audio"
            ) as HTMLAudioElement;
            // Older browsers may not have srcObject
            if (("srcObject" in peer_audio) as any) {
                peer_audio.srcObject = stream;
            } else {
                // Avoid using this in new browsers, as it is going away.
                peer_audio.src = window.URL.createObjectURL(stream);
            }
            peer_audio.onloadedmetadata = function (e) {
                console.log("now playing the audio");
                peer_audio.play();
            };
            document.body.appendChild(peer_audio);

            const me = this.model.GetNode(this.model.myId);

            const listeners: Array<() => void> = [];
            const dispose = () => listeners.splice(0).forEach((d) => d());

            const onMyPositionChange = ([myX, myY]: Vec2) => {
                const ref = this.model.GetNode(call.peer);
                if (!ref) {
                    console.warn(
                        `Could not find ${call.peer} in model `,
                        this.model.nodes.map((a) => a.Id())
                    );
                    return;
                }
                this.updateVolume(myX, myY, peer_audio, ref);
            };
            const removeIfNodeDeleted = (n: ModelNode) => {
                if (n.Id() === call.peer) {
                    dispose();
                    console.log("Closing call with", call.peer);
                    call.close();
                    peer_audio.parentElement &&
                        peer_audio.parentElement.removeChild(peer_audio);
                }
            };

            me.addListener("position", onMyPositionChange);
            listeners.push(() =>
                me.removeListener("position", onMyPositionChange)
            );

            // remove the audio el from DOM and close the call.
            this.model.addListener("deleted", removeIfNodeDeleted);
            listeners.push(() =>
                this.model.removeListener("deleted", removeIfNodeDeleted)
            );

            call.on("close", () => {
                console.log("call closed, removing audio el");
                const n = this.model.GetNode(call.peer);
                if (n) {
                    this.model.Delete(n);
                }
                peer_audio.parentElement &&
                    peer_audio.parentElement.removeChild(peer_audio);
                dispose();
            });

            const otherNode = this.model.GetNode(call.peer);
            if (!otherNode) {
                console.warn(
                    `Could not find ${call.peer} in model `,
                    this.model.nodes.map((a) => a.Id())
                );
                return;
            }
            const onOtherNodePositionChange = ([hisX, hisY]: Vec2) => {
                if (!me) {
                    console.warn(
                        `Could not find myself in model `,
                        this.model.nodes.map((a) => a.Id())
                    );
                    return;
                }
                this.updateVolume(hisX, hisY, peer_audio, me);
            };

            otherNode.addListener("position", onOtherNodePositionChange);
            listeners.push(() =>
                otherNode.removeListener("position", onOtherNodePositionChange)
            );
        });

        call.on("error", function (err) {
            console.log(err);
        });
    }

    private updateVolume(
        x: number,
        y: number,
        peer_audio: HTMLAudioElement,
        ref: ModelNode
    ) {
        const [refX, refY] = ref.getPos();

        let my = new p5.Vector();
        my.set(refX, refY);
        let his = new p5.Vector();
        his.set(x, y);

        const dist = my.dist(his);

        const scale = d3
            .scalePow()
            .exponent(0.36)
            .domain([0, 400])
            .range([1, 0]);
        peer_audio.volume = scale(Math.max(Math.min(dist, 400), 0));

        // peer_audio.volume = Math.max(Math.min(map(dist, 0, 400, 1, 0), 1), 0);
        // console.log("volume", peer_audio.volume);
    }
}

function map(
    n: number,
    start1: number,
    stop1: number,
    start2: number,
    stop2: number
) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}
