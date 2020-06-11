import * as p5 from "p5";
import "./style.scss";
import 'webrtc-adapter';
import * as Peer from 'peerjs';
import * as io from 'socket.io-client';
import { getLocationHash } from './helpers';
import { p5init } from "./engine/sketch";


export const sketch = p5init();
(async () => {
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

    socket.on('peer_joined', (peer_id: string) => {
        console.log('peer_joined: ' + peer_id);
    });

    var { room } = getLocationHash();
    const peer = new (Peer as any).default({
        host: location.hostname,
        port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        config: {
            iceServers: [{ url: 'stun:stun1.l.google.com:19302' }].concat(iceServers || [])
        },
        debug: 3
    }) as Peer;

    peer.on('open', function (id) {
        console.log('My peer ID is: ' + id);
        let myIdTxtEl = document.getElementById('myIdTxt');
        myIdTxtEl.innerText = `My peer ID is: ${id}`;
        room && socket.emit('join', { room, id });
    });
    peer.on('error', function (err) { console.log(err) });
    peer.on('close', function () { console.log('closed') });
    peer.on('disconnected', function () { console.log('disconnected') });

    async function requestAudio() {
        const localAudioStream = await navigator.mediaDevices
            .getUserMedia({
                video: false,
                audio: true,
            })
        return localAudioStream;
    }

    async function makeCall(peer_id: string) {
        const localAudioStream = await requestAudio();
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
        const localAudioStream = await requestAudio()
        // Answer the call, providing our mediaStream
        call.answer(localAudioStream);
        // get the media stream of the other peer 
        attachOnStream(call)
    });


    let callToButtonEl = document.getElementById('callToButton');
    callToButtonEl.onclick = function () {
        let callToInputEl = document.getElementById('callToInput') as HTMLInputElement;
        const target = callToInputEl.value;
        makeCall(target)
    }
    // document.addEventListener("DOMContentLoaded", function (event) {
    // }, false);

})();







