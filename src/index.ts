import "./style.scss";
import * as io from 'socket.io-client';
import { getLocationHash } from './helpers';
import { requestAudio, setupPeerjs } from "./audiopeer";

import { p5init } from "./engine/sketch";
import { Model, ModelNode, ModelNodeJSON } from "./model";




document.addEventListener("DOMContentLoaded", function (event) {
    init().catch(err => console.error(err))
}, false);




async function init() {
    var { room } = getLocationHash();
    console.log("Room: ", room);

    const localAudioStream = await requestAudio()
    // const iceServers: any[] = [];
    const iceServers = await fetch('/ice').then(response => response.json())


    var model = new Model();

    const audioBroker = await setupPeerjs(iceServers, localAudioStream, model)
    console.log('starting')



    var socket = io({
        host: location.hostname,
        port: location.port as any || (location.protocol === 'https:' ? 443 : 80),
        path: '/socket',
        upgrade: false,
        transports: ['websocket'],
    });


    p5init(model);

    model.on('added', (n) => {
        // Make audio call to anyone else other than me
        if (n.Id() != audioBroker.peerID) {
            audioBroker.makeAudioCall(n.Id())
        }
    })

    socket.on('connect', () => {
        const peerId = audioBroker.peerID;
        console.log('My peer ID is: ' + peerId);
        const myNode = new ModelNode(peerId);
        myNode.setColor(randomColor(100))
        myNode.on('updated', throttle((n: ModelNode) => {
            // emit updates to the socket.io for any updates on my node.
            socket.emit('update', room, n.toJSON())
        }, 33))
        model.Add(myNode)
        console.log(`Joining room "${room} ..."`);
        socket.emit('join', room, myNode.toJSON());
    })

    const updatePlayer = (p: ModelNodeJSON) => {
        // console.log('update', p)
        let n = model.GetNode(p.id);
        if (!n) {
            n = new ModelNode(p.id)
            console.log('receiving other node', p.id)
            model.Add(n)
        }
        n.apply(p);
    }

    socket.on('init', (data: any) => {
        for (const key in data) {
            if (data.hasOwnProperty(key) && key !== audioBroker.peerID) {
                const p = data[key] as ModelNodeJSON;
                updatePlayer(p)
            }
        }
    })

    socket.on('update', updatePlayer)

    socket.on('peer_left', (id: string) => {
        console.log('left', id);
        const n = model.GetNode(id);
        model.Delete(n)
    })
}

function randomColor(brightness: number) {
    function randomChannel(brightness: number) {
        var r = 255 - brightness;
        var n = 0 | ((Math.random() * r) + brightness);
        var s = n.toString(16);
        return (s.length == 1) ? '0' + s : s;
    }
    return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}

function throttle(func: Function, limit: number) {
    let inThrottle = false;
    return function () {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}