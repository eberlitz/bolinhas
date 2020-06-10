import "./style.scss";
import * as Peer from 'peerjs';
// import { getLocationHash } from './helpers';



(async () => {
    const iceServers = await fetch('/ice').then(response => response.json())


    // var { id: targetID } = getLocationHash();
    const peer = new (Peer as any).default({
        host: location.hostname,
        port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        config: {
            'iceServers': iceServers
            //     [
            //         { url: 'stun:stun1.l.google.com:19302' },
            //         {
            //             url: 'turn:numb.viagenie.ca',
            //             credential: 'credential',
            //             username: 'username'
            //         }
            //     ]
        },
        debug: 1
    }) as Peer;

    peer.on('open', function (id) {
        console.log('My peer ID is: ' + id);
    });


    // Start a call
    // Call a peer, providing our mediaStream
    // var call = peer.call('dest-peer-id', mediaStream);

    //Answer call
    // peer.on('call', function(call) {
    //     // Answer the call, providing our mediaStream
    //     call.answer(mediaStream);
    //   });

    // get the media stream of the other peer 
    // call.on('stream', function(stream) {
    //     // `stream` is the MediaStream of the remote peer.
    //     // Here you'd add it to an HTML video/canvas element.
    //   });



})()







