import "webrtc-adapter";
import * as Peer from "peerjs";
import { Model, ModelNode } from "./model";

export async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
    });
    return localAudioStream;
}

async function screenShare() {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
            cursor: "always",
        },
        audio: false,
    });
    return stream;
}

export class AudioBroker {
    private currentAudioCalls: Map<string, Peer.MediaConnection> = new Map();
    private currentLocalStream: MediaStream;
    private _ongoingPeerPromise?: Promise<Peer>;
    private _ensurePeer = async () => {
        if (this._ongoingPeerPromise) {
            return this._ongoingPeerPromise;
        }
        this._ongoingPeerPromise = this._connectToPeerJS();
        const peer = await this._ongoingPeerPromise;
        return peer;
    };

    constructor(
        public localStream: MediaStream,
        private model: Model,
        private iceServers: any[]
    ) {
        this.currentLocalStream = localStream;
    }

    init() {
        this._ongoingPeerPromise = null;
        this.closeAll();
        return this._ensurePeer();
    }

    private closeAll() {
        this.currentAudioCalls.forEach((call, pID) => {
            this.currentAudioCalls.delete(pID);
            call?.close();
        });
    }

    private _connectToPeerJS() {
        const p = new Promise((resolve, reject) => {
            const peer = new (Peer as any).default({
                host: location.hostname,
                port:
                    (location.port as any) ||
                    (location.protocol === "https:" ? 443 : 80),
                path: "/peerjs",
                config: {
                    iceServers: this.iceServers || [],
                },
                debug: 1,
            } as Peer.PeerConnectOption) as Peer;
            peer.on("open", () => {
                // if (this.model.myId && this.model.myId !== id) {
                //     console.warn("PeerID HAS CHANGED");
                // }
                // this.model.myId = id;
                resolve(peer);
            });
            peer.on("error", (err) => {
                console.log(err);
            });
            peer.on("close", () => {
                console.log("closed");
            });
            peer.on("disconnected", () => {
                console.log("peerjs disconnected");
            });
        });

        return p.then((peer: Peer) => {
            peer.on("call", async (call) => {
                const oldcall = this.currentAudioCalls.get(call.peer);
                if (!!oldcall) {
                    oldcall.close();
                    // // ignore if there is already a call to that peer;
                    // console.warn(
                    //     "There is already a audio call to peer " + call.peer
                    // );
                    // return;
                }
                this.currentAudioCalls.set(call.peer, call);

                console.log("receiving call from ", call.peer);
                // Answer the call, providing our mediaStream
                call.answer(this.currentLocalStream);
                // get the media stream of the other peer

                this.attachOnStream(call, "from_receiving_call");
            });

            (window as any).startScreenShare = async () => {
                const stream: MediaStream = await screenShare();
                stream.addTrack(this.localStream.getAudioTracks()[0]);
                this.currentLocalStream = stream;

                this.currentAudioCalls.forEach((call) => {
                    if (!call) return;
                    const pID = call.peer;
                    call.close();
                    const newCall = peer.call(pID, stream);
                    this.currentAudioCalls.set(pID, newCall);
                    this.attachOnStream(newCall, "from_make_screenshare_call");
                });
            };
            return peer;
        });
    }

    public async makeAudioCall(peer_id: string) {
        const peer = await this._ensurePeer();
        if (this.currentAudioCalls.has(peer_id)) {
            // ignore if there is already a call to that peer;
            console.warn("There is already a audio call to peer " + peer_id);
            return;
        }
        this.currentAudioCalls.set(peer_id, null);

        console.log(`calling ${peer_id}...`);

        const call = peer.call(peer_id, this.currentLocalStream);
        this.currentAudioCalls.set(peer_id, call);
        this.attachOnStream(call, "from_make_audio_call");
        return call;
    }

    private attachOnStream(call: Peer.MediaConnection, msg: string) {
        call.on("close", () => {
            console.log("call:close", call.peer);
            !call.open && this.currentAudioCalls.delete(call.peer);
        });

        let pstrem: MediaStream;
        // get the media stream of the other peer
        call.on("stream", (stream) => {
            // maybe a bug in PeerJS, but it receive this even twice, even thou its the exact same stream
            if (pstrem === stream) {
                return;
            }
            pstrem = stream;

            const otherNode = this.model.GetNode(call.peer);
            if (!otherNode) {
                console.warn(
                    `Could not find ${call.peer} in model `,
                    this.model.nodes.map((a) => a.Id())
                );
                return;
            }

            console.log(
                msg,
                "receiving stream from ",
                call.peer,
                stream.getTracks()
            );

            otherNode.mediaStream = stream;

            let video = document.getElementById("vi_" + call.peer) as
                | HTMLVideoElement
                | undefined;
            if (stream.getVideoTracks().length == 0) {
                video &&
                    video.parentElement &&
                    video.parentElement.removeChild(video);
            } else {
                if (!video) {
                    video = document.createElement("video") as HTMLVideoElement;
                    video.id = "vi_" + call.peer;
                    video.addEventListener("click", () =>
                        video.classList.toggle("small")
                    );
                    document.body.appendChild(video);
                }
                video.autoplay = true;
                // Older browsers may not have srcObject
                if (("srcObject" in video) as any) {
                    video.srcObject = stream;
                } else {
                    // Avoid using this in new browsers, as it is going away.
                    video.src = window.URL.createObjectURL(stream);
                }
                video.volume = 0;
            }

            const listeners: Array<() => void> = [];
            const dispose = () => listeners.splice(0).forEach((d) => d());

            const removeIfNodeDeleted = (n: ModelNode) => {
                if (n.Id() === call.peer) {
                    dispose();
                    console.log("Closing call with", call.peer);
                    call.close();
                    video &&
                        video.parentElement &&
                        video.parentElement.removeChild(video);
                }
            };

            // remove the audio el from DOM and close the call.
            this.model.addListener("deleted", removeIfNodeDeleted);
            listeners.push(() =>
                this.model.removeListener("deleted", removeIfNodeDeleted)
            );

            call.on("close", () => {
                otherNode.mediaStream = null;
                video?.parentElement?.removeChild(video);
            });
        });

        call.on("error", (err) => {
            console.log("call:error", call.peer, err);
        });
    }
}
