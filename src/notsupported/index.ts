import "detectrtc";
import "webrtc-adapter";

export function checkRTCSupport() {
    if (DetectRTC.isWebRTCSupported === false) {
        return "Please use Chrome, Firefox or Safari App.";
    } else if (DetectRTC.hasWebcam === false) {
        return "Please install an external webcam device.";
    } else if (DetectRTC.hasMicrophone === false) {
        return "Please install an external microphone device.";
    } else if (
        DetectRTC.hasSpeakers === false &&
        (DetectRTC.browser.name === "Chrome" ||
            DetectRTC.browser.name === "Edge")
    ) {
        return "your system can not play audios.";
    }
    return "";
}

addError(checkRTCSupport());

function addError(msg: string) {
    const el = document.createElement("p");
    el.textContent = el.innerText = msg;
    document.body.append(el);
}
