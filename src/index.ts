import "./style.scss";
import { requestAudio, AudioBroker } from "./audiopeer";
import { Model, ModelNode } from "./model";
import { viewport } from "./engine/ui";
import { checkRTCSupport } from "./notsupported";
import { generateName } from "./lib/name-generator";
import { initSocket } from "./socket-updater";
import { initPlayerList } from "./player-list";
import { getRoomName, randomColor } from "./lib/utils";

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
    console.log("Room: ", room);

    const localAudioStream = await requestAudio();

    const iceServers = await fetch("/ice").then((response) => response.json());

    var model = new Model();
    initPlayerList(model);
    viewport.setModel(model);

    // Create the Main player node
    createMainNode(model);

    const audioBroker = new AudioBroker(localAudioStream, model, iceServers);

    initControls(audioBroker);

    initSocket(model, audioBroker, room);
}

function initControls(audioBroker: AudioBroker) {
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

