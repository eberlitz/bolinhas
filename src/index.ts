import "./style.scss";
import * as Peer from 'peerjs';
// import { getLocationHash } from './helpers';


// var { id: targetID } = getLocationHash();
const peer = new (Peer as any).default({
    host: location.hostname,
    port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
    path: '/peerjs',
    config: {
        // 'iceServers':
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
