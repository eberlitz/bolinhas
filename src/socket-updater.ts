import * as io from "socket.io-client";

import { Model, ModelNode, ModelNodeJSON } from "./model";
import { AudioBroker } from "./audiopeer";

export function initSocket(
    model: Model,
    audioBroker: AudioBroker,
    room: string
) {
    var socket = io({
        host: location.hostname,
        port:
            (location.port as any) ||
            (location.protocol === "https:" ? 443 : 80),
        path: "/socket",
        upgrade: false,
        transports: ["websocket"],
    });
    const me = model.me;
    model.disconnected = true;
    me.on(
        "updated",
        throttle((n: ModelNode) => {
            const data = n.toJSON();
            if (model.disconnected) {
                return;
            }
            // emit updates to the socket.io for any updates on my node.
            // console.log(`sending update`, data)
            socket.emit("update", room, data);
        }, 33)
    );
    socket.on("connect", async () => {
        // This event can happen multiple times, in the beginning or if the network disconnects the user momentarily
        // In the second case, the audioBroker has to be reinitialized.
        const { id: peerId } = await audioBroker.init();
        console.log("My peer ID is: " + peerId);
        me.setID(peerId);
        model.disconnected = false;
        removeLoadingSpinner();

        console.log(`Joining room "${room} ..."`);
        socket.emit("join", room, me.toJSON());
    });

    const updatePlayer = (p: ModelNodeJSON) => {
        let n = model.GetNode(p.id);
        if (!n) {
            n = new ModelNode(p.id);
            console.log("receiving other node", p.id);
            n.apply(p);
            model.Add(n);
        } else {
            n.apply(p);
        }
    };

    socket.on("init", (data: { [id: string]: ModelNodeJSON }) => {
        console.log('received "init"');

        // If we reconnect we need to cleanup the nodes that are not in the server anymore, as they will get added later
        model.nodes
            .filter((n) => n != model.me && !data[n.Id()])
            .forEach((n) => model.Delete(n));

        Object.values(data)
            .filter((a) => a.id !== model.me.Id())
            .forEach((p) => {
                updatePlayer(p);
                // Only the ones that joins a room, will do calls to other.
                // This way we avoid collisions where one peer tries to call
                // another at exact same time.
                audioBroker.makeAudioCall(p.id);
            });
    });

    socket.on("update", (p: any) => {
        // console.log('received "update", updating player ' + p.id);
        updatePlayer(p);
    });

    socket.on("peer_left", (id: string) => {
        console.log("left", id);
        const n = model.GetNode(id);
        model.Delete(n);
    });

    socket.on("disconnect", () => {
        model.disconnected = true;
    });
}

export function throttle(func: Function, limit: number) {
    let inThrottle = false;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

function removeLoadingSpinner() {
    const spinner = document.getElementById("overlay");
    // const spinner = document.getElementById("spinner");
    spinner?.parentElement?.removeChild(spinner);
}
