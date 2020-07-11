import "./style.scss";
import { requestAudio, AudioBroker } from "./audiopeer";
import { Model, ModelNode } from "./model";
import { viewport } from "./engine/ui";
import { checkRTCSupport } from "./notsupported";
import { generateName } from "./lib/name-generator";
import { initSocket } from "./socket-updater";

document.addEventListener(
    "DOMContentLoaded",
    () => init().catch((err) => console.error(err)),
    false
);

async function init() {
    try {
        await checkRTCSupport();
    } catch (error) {
        window.location.href = "/not-supported";
        return;
    }

    const room = getRoomName();

    const localAudioStream = await requestAudio();
    new MediaStream()

    const iceServers = await fetch("/ice").then((response) => response.json());

    var model = new Model();
    initMenu(model);
    viewport.setModel(model);

    // Create the Main player node
    createMainNode(model);

    const audioBroker = new AudioBroker(localAudioStream, model, iceServers);

    const micBtn = document.getElementById("mic-btn");
    const updateMicBtn = () => micBtn.innerText = micBtn.textContent = audioBroker.myselfMuted ? "mic_off" : "mic";
    updateMicBtn();
    micBtn.onclick = () => {
        audioBroker.toggleMic();
        updateMicBtn();
    };
    const camBtn = document.getElementById("cam-btn");
    const updateCamBtn = () => camBtn.innerText = camBtn.textContent = audioBroker.isCamEnable ? "videocam" : "videocam_off";
    updateCamBtn();
    camBtn.onclick = () => {
        audioBroker.toggleCamera();
        updateCamBtn();
    };

    const screenShareBtn = document.getElementById("screen-share-btn");
    const updateScreenShareBtn = () => screenShareBtn.innerText = screenShareBtn.textContent = audioBroker.isSharingScreen
        ? "stop_screen_share"
        : "screen_share";
    updateScreenShareBtn();
    screenShareBtn.onclick = async () => {
        audioBroker.toggleScreenShare();;
        updateScreenShareBtn();
    };

    const viStack = document.getElementById("video-stack");

    const expandBtn = document.getElementById("expand-btn");
    expandBtn.onclick = async () => {
        viStack.classList.toggle("full");
        expandBtn.innerText = expandBtn.textContent = (viStack.classList.contains("full")
            ? "fullscreen_exit"
            : "fullscreen");
    };



    initSocket(model, audioBroker, room);
}

function createMainNode(model: Model) {
    const me = new ModelNode(generateName());
    model.me = me;
    me.setColor(randomColor(100));
    let nickname = localStorage.getItem("nickname");
    if (!nickname) {
        nickname = me.Id();
    }
    me.setNickname(nickname);
    model.Add(me);
}

function initMenu(model: Model) {
    model.on("added", (node) => {
        if (node === model.me) {
            addMeToMenu(node);
        } else {
            addOtherToMenu(node);
            node.on("updated", updateMenu);
        }
    });
    model.on("deleted", removeFromMenu);
}

function randomColor(brightness: number) {
    function randomChannel(brightness: number) {
        var r = 255 - brightness;
        var n = 0 | (Math.random() * r + brightness);
        var s = n.toString(16);
        return s.length == 1 ? "0" + s : s;
    }
    return (
        "#" +
        randomChannel(brightness) +
        randomChannel(brightness) +
        randomChannel(brightness)
    );
}

function addMeToMenu(node: ModelNode) {
    const htmlPlayersContainer = document.getElementById("me");
    const playerContainer = document.createElement("div");
    playerContainer.id = "pi-" + node.Id();
    playerContainer.classList.add("main-player-item");
    playerContainer.classList.add("player");
    const playerColor = document.createElement("span");
    playerColor.classList.add("color-indicator");
    const playerName = document.createElement("input");
    playerName.type = "text";
    playerName.value = node.getNickname();
    playerName.addEventListener("change", () => {
        const nickname = playerName.value;
        node.setNickname(nickname);
        localStorage.setItem("nickname", nickname);
    });
    playerName.classList.add("me-list-name");

    playerContainer.insertBefore(playerName, null);
    playerContainer.insertBefore(playerColor, playerName);
    htmlPlayersContainer.insertBefore(playerContainer, null);

    const colorEl = document.querySelector(
        `#pi-${node.Id()} .color-indicator`
    ) as HTMLSpanElement;
    colorEl.style.backgroundColor = node.getColor();
}
function addOtherToMenu(node: ModelNode) {
    const htmlPlayersContainer = document.getElementById("players");
    const playerContainer = document.createElement("div");
    playerContainer.id = "pi-" + node.Id();
    playerContainer.classList.add("player")
    const playerColor = document.createElement("span");
    playerColor.classList.add("color-indicator");
    const playerName = document.createElement("span");
    playerName.classList.add("player-list-name");

    playerContainer.insertBefore(playerName, null);
    playerContainer.insertBefore(playerColor, playerName);
    htmlPlayersContainer.insertBefore(playerContainer, null);

    updatePlayerIndicator(node.Id(), node.getNickname(), node.getColor());
}

function removeFromMenu(node: ModelNode) {
    const id = node.Id();
    const playerEl = document.getElementById("pi-" + id);
    playerEl.parentNode.removeChild(playerEl);
}

function updateMenu(node: ModelNode) {
    updatePlayerIndicator(node.Id(), node.getNickname(), node.getColor());
}

function updatePlayerIndicator(id: string, name: string, color: string) {
    document.getElementById("pi-" + id);
    const playerNameEl = document.querySelector(
        `#pi-${id} .player-list-name`
    ) as HTMLSpanElement;
    const colorEl = document.querySelector(
        `#pi-${id} .color-indicator`
    ) as HTMLSpanElement;
    playerNameEl.innerText = name;
    colorEl.style.backgroundColor = color;
}

function getRoomName() {
    const url = window.location.href;
    const room = url.substring(url.lastIndexOf("/") + 1).toLowerCase();
    console.log("Room: ", room);
    return room;
}
