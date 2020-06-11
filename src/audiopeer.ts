import 'webrtc-adapter';
import * as Peer from 'peerjs';


export async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices
        .getUserMedia({
            video: false,
            audio: true,
        })
    return localAudioStream;
}

export function setupPeerjs(iceServers: any[], localStrem: MediaStream): Promise<AudioBroker> {
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
        peer.on('open', function () {
            resolve(new AudioBroker(peer, localStrem))
        });
        peer.on('error', function (err) { console.log(err) });
        peer.on('close', function () { console.log('closed') });
        peer.on('disconnected', function () { console.log('disconnected') });
    })
}

export class AudioBroker {
    public peerID: string;

    constructor(private peer: Peer, public localStrem: MediaStream) {
        peer.on('call', async (call) => {
            console.log('receiving call from ', call.peer)
            // Answer the call, providing our mediaStream
            call.answer(this.localStrem);
            // get the media stream of the other peer 
            attachOnStream(call)
        });
        this.peerID = peer.id
    }

    public async makeAudioCall(peer_id: string) {
        const call = this.peer.call(peer_id, this.localStrem);
        attachOnStream(call)
        return call
    }

}


function attachOnStream(call: Peer.MediaConnection) {
    // get the media stream of the other peer 
    call.on('stream', function (stream) {
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
        call.on('close', function () {
            console.log('call closed, removing audio el')
            peer_audio.parentElement && peer_audio.parentElement.removeChild(peer_audio)
        })
    });

    call.on('error', function (err) { console.log(err) });
}


