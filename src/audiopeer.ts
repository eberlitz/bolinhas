import "webrtc-adapter";
import * as Peer from "peerjs";
import { Model, ModelNode } from "./model";

const MAIN_PLAYER_VIDEO_ID = "main_player";

// Fix peerjs issue https://github.com/peers/peerjs/issues/147
var options = {
    'constraints': {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        },
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
    }
};
export async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
    });
    return localAudioStream;
}

async function requestAudioAndVideo() {
    const localAudioStream = await navigator.mediaDevices.getUserMedia({
        video: true,
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
    return stream as MediaStream;
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
    myselfMuted: boolean = false;
    isSharingScreen: boolean = false;
    isCamEnable = false;

    constructor(
        public localStream: MediaStream,
        private model: Model,
        private iceServers: any[]
    ) {
        this.currentLocalStream = localStream;

        this.isCamEnable = localStream.getVideoTracks().length > 0;
        this.myselfMuted = localStream.getAudioTracks().length == 0;
    }

    init() {
        this._ongoingPeerPromise = null;
        this.closeAll();
        return this._ensurePeer();
    }

    async toggleCamera() {
        this.isCamEnable = !this.isCamEnable;
        this.localStream.getVideoTracks().forEach(a => (a.enabled = this.isCamEnable))

        if (this.isCamEnable) {

            // If current local stream doesn't have video,
            // Then request it
            let videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) {
                this.localStream = await requestAudioAndVideo();
                videoTrack = this.localStream.getVideoTracks()[0];
            }
            // check whether calls already have a video track
            const needsRenegotiation = this.currentLocalStream.getVideoTracks().length == 0;

            if (this.isSharingScreen) {
                const ss_stream_track = this.currentLocalStream.getVideoTracks()[0];
                ss_stream_track?.stop()
                this.isSharingScreen = false;
            }

            this.currentLocalStream = this.localStream;

            if (needsRenegotiation) {
                this._forceRenegotiation();
            } else {
                this.currentAudioCalls.forEach((call) => {
                    if (!call) return;
                    const sender = call.peerConnection.getSenders().find(a => a.track.kind == videoTrack.kind);
                    sender.replaceTrack(videoTrack);
                });
            }
        } else {
            // To fully stop collecting camera
            const newStream = await requestAudio();
            this.localStream.getTracks().forEach(t => t.stop());
            // this.currentLocalStream.getTracks().forEach(t => t.stop());
            this.currentLocalStream = this.localStream = newStream;
            this._forceRenegotiation()

        }
        updateVideoStack(MAIN_PLAYER_VIDEO_ID, this.localStream);
    }

    private _forceRenegotiation() {
        this.currentAudioCalls.forEach(call => {
            if (!call) return;
            // // Add video
            // call.peerConnection.addTrack(videoTrack, this.localStream);
            // // Replace audio
            // const audioSender = call.peerConnection.getSenders().find(a => a.track.kind == audioTrack.kind);
            // audioSender.replaceTrack(audioTrack);

            // Close all calls without reconections
            closeWithoutReconnects(call);
            // Redo the call
            this.makeAudioCall(call.peer)
        });
    }

    public async toggleScreenShare() {
        this.isSharingScreen = !this.isSharingScreen;

        if (this.isSharingScreen) {
            const ss_stream = await screenShare()
            const videoTrack = ss_stream.getVideoTracks()[0];
            // Add listen for if the current track swaps, swap back
            videoTrack.onended = () => this.toggleScreenShare();


            // check whether calls already have a video track
            const needsRenegotiation = this.currentLocalStream.getVideoTracks().length == 0;

            // Update the current local stream for any new calls
            ss_stream.addTrack(this.localStream.getAudioTracks()[0]);
            this.currentLocalStream = ss_stream;
            // OR
            // this.currentLocalStream = new MediaStream([videoTrack, this.localStream.getAudioTracks()[0]]);

            if (needsRenegotiation) {
                this._forceRenegotiation();
            } else {
                this.currentAudioCalls.forEach((call) => {
                    if (!call) return;
                    const sender = call.peerConnection.getSenders().find(a => a.track.kind == videoTrack.kind);
                    sender.replaceTrack(videoTrack);
                });
            }
        } else {
            // Stops the screen sharing
            const ss_stream_track = this.currentLocalStream.getVideoTracks()[0];
            ss_stream_track?.stop()
            // To switch back to normal camera and audio
            // Revert to the old stream
            this.currentLocalStream = this.localStream;
            const originalVideoTrack = this.localStream.getVideoTracks()[0];

            if (!originalVideoTrack) {
                this._forceRenegotiation();
            } else {
                this.currentAudioCalls.forEach((call) => {
                    if (!call) return;
                    const sender = call.peerConnection.getSenders().find(a => a.track.kind == originalVideoTrack.kind);
                    sender.replaceTrack(originalVideoTrack);
                });
            }
        }
        updateVideoStack(MAIN_PLAYER_VIDEO_ID, this.localStream);
    }

    public toggleMic() {
        this.myselfMuted = !this.myselfMuted;
        this.currentLocalStream.getAudioTracks().forEach(a => (a.enabled = !this.myselfMuted))

        // Alternative is to not disable the localStream, but only the local end of the streaming peer calls. Althou if a user disconnect and reconnect, this also needs to be done.
        //     this.currentAudioCalls.forEach((call) =>
        //         call.peerConnection
        //             .getSenders()
        //             .filter((a) => a.track.kind == "audio")
        //             .forEach((c) => (c.track.enabled = !this.myselfMuted)));
    }

    private closeAll() {
        this.currentAudioCalls.forEach((call, pID) => {
            this.currentAudioCalls.delete(pID);
            closeWithoutReconnects(call);
        });
    }

    public closeCallWith(pid: string) {
        const call = this.currentAudioCalls.get(pid)
        this.currentAudioCalls.delete(pid);
        closeWithoutReconnects(call);
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
                    closeWithoutReconnects(oldcall)
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

            // (window as any).startScreenShare = async () => {
            //     const stream: MediaStream = await screenShare();
            //     stream.addTrack(this.localStream.getAudioTracks()[0]);
            //     this.currentLocalStream = stream;

            //     this.currentAudioCalls.forEach((call) => {
            //         if (!call) return;
            //         const pID = call.peer;
            //         call.close();
            //         const newCall = peer.call(pID, stream);
            //         this.currentAudioCalls.set(pID, newCall);
            //         this.attachOnStream(newCall, "from_make_screenshare_call");
            //     });
            // };
            return peer;
        });
    }

    public async makeAudioCall(peer_id: string, backoffTime = 100) {
        const peer = await this._ensurePeer();
        if (this.currentAudioCalls.has(peer_id)) {
            // ignore if there is already a call to that peer;
            console.warn("There is already a audio call to peer " + peer_id);
            return;
        }
        if (!this.model.HasNode(peer_id)) {
            console.warn(`Can't call ${peer_id}, because he is not in the model anymore!`);
            return;
        }

        this.currentAudioCalls.set(peer_id, null);

        console.log(`calling ${peer_id}...`);

        const call = peer.call(peer_id, this.currentLocalStream, options as any);
        this.currentAudioCalls.set(peer_id, call);
        this.attachOnStream(call, "from_make_audio_call");

        // This must be done only by the caller, otherwise calls will conflict from/to nodes
        const reconnect = (err?: any) => {
            if ((call as any).explicityClose) {
                return;
            }
            // If the call was closed, but the node is still in our model, so the connection was probably a network failure,
            if (!this.model.HasNode(call.peer)) {
                return;
            }
            if (err) {
                // If this came from the error event, make the backoff time at least 1sec.
                backoffTime = Math.min(1000, backoffTime);
            }
            // Tries to reconnect
            setTimeout(() => {
                console.log(`reconnecting to ${peer_id}...`);
                this.makeAudioCall(peer_id, backoffTime * 2);
            }, Math.min(backoffTime, 10000)); // Max back off of 10s
        };
        call.on("close", reconnect);
        call.on("error", reconnect);

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

            const video = updateVideoStack(call.peer, stream);

            const listeners: Array<() => void> = [];
            const dispose = () => listeners.splice(0).forEach((d) => d());

            const removeIfNodeDeleted = (n: ModelNode) => {
                if (n.Id() === call.peer) {
                    dispose();
                    console.log("Closing call with", call.peer);
                    call.close();
                    video?.parentElement?.removeChild(video);
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


function closeWithoutReconnects(call: Peer.MediaConnection) {
    if (call) {
        (call as any).explicityClose = true;
        call.close();
    }
}

function updateVideoStack(id: string, stream: MediaStream) {
    const viStack = document.getElementById("video-stack");

    let videoDiv = document.getElementById("vi_" + id) as
        | HTMLElement
        | undefined;
    if (stream.getVideoTracks().length == 0) {
        videoDiv?.parentElement?.removeChild(videoDiv);
    } else {
        // if (!videoDiv) {
        //     videoDiv = document.createElement("div") as HTMLElement;
        //     videoDiv.id = "vi_" + id;
        //     videoDiv.classList.add("video-wrapper");
        //     viStack.appendChild(videoDiv);
        // }
        // let video = videoDiv.getElementsByTagName("video")[0] as
        //     | HTMLVideoElement
        //     | undefined;
        // if (!video) {
        let video = videoDiv as HTMLVideoElement;
        if (!videoDiv) {
            video = document.createElement("video") as HTMLVideoElement;
            video.id = "vi_" + id;
            video.addEventListener("click", () => {
                if (viStack.classList.contains("full")) {
                    video.classList.toggle("pinned")
                }
            });
            // videoDiv.appendChild(video);
            videoDiv = video;
            viStack.appendChild(videoDiv);
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
    return videoDiv
}
