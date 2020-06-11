import "./style.scss";
import 'webrtc-adapter';
import * as Peer from 'peerjs';
import * as io from 'socket.io-client';
import { getLocationHash } from './helpers';


async function requestAudio() {
    const localAudioStream = await navigator.mediaDevices
        .getUserMedia({
            video: false,
            audio: true,
        })
    return localAudioStream;
}



var { room } = getLocationHash();
console.log("Room: ", room);


(async () => {
    const localAudioStream = await requestAudio()
    // const iceServers: any[] = [];
    const iceServers = await fetch('/ice').then(response => response.json())

    console.log('starting')

    var socket = io({
        host: location.hostname,
        port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
        path: '/socket',
        upgrade: false,
        transports: ['websocket'],
    });
    socket.on('connect',()=>{
        console.log('connected')
    })

    socket.on('peer_joined', (peer_id: string) => {
        console.log('peer_joined: ' + peer_id);
        makeCall(peer_id)
    });

    
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
        console.log('My peer ID is: ' + id);
        console.log(`Joining room "${room} ..."`);
        socket.emit('join', { room, id });
    });
    peer.on('error', function (err) { console.log(err) });
    peer.on('close', function () { console.log('closed') });
    peer.on('disconnected', function () { console.log('disconnected') });

    
    async function makeCall(peer_id: string) {
        const call = peer.call(peer_id, localAudioStream);
        attachOnStream(call)
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
        });
        call.on('error', function (err) { console.log(err) });
    }

    //Answer call
    peer.on('call', async (call) => {
        console.log('receiving call from ', call.peer)
        // Answer the call, providing our mediaStream
        call.answer(localAudioStream);
        // get the media stream of the other peer 
        attachOnStream(call)
    });


    // document.addEventListener("DOMContentLoaded", function (event) {
    // }, false);

})();







