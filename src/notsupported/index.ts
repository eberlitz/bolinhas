import "detectrtc";
import "webrtc-adapter";

export function checkRTCSupport() {
    return new Promise((resolve, reject) => {
        DetectRTC.load(() => {
            const assertions = [
                [
                    () => DetectRTC.isWebRTCSupported === false,
                    "Please use Chrome, Firefox or Safari App.",
                ],
                // [
                //     () => DetectRTC.hasWebcam === false,
                //     "Please install an external webcam device.",
                // ],
                [
                    () => DetectRTC.hasMicrophone === false,
                    "Please install an external microphone device.",
                ],
                [
                    () => DetectRTC.isWebSocketsSupported === false,
                    "Your browser does not supports WebSockets.",
                ],
                [
                    () => DetectRTC.isWebSocketsBlocked,
                    "Your have to unblock WebSockets.",
                ],
                [
                    () =>
                        DetectRTC.hasSpeakers === false &&
                        (DetectRTC.browser.name === "Chrome" ||
                            DetectRTC.browser.name === "Edge"),
                    "Your system can not play audios.",
                ],
            ] as Array<[() => boolean, string]>;

            for (const [assert, reason] of assertions) {
                if (assert()) {
                    reject(reason);
                    return;
                }
            }
            resolve(true);
        });
    });
}

checkRTCSupport().catch(addError);

function addError(msg: string) {
    const el = document.createElement("p");
    el.textContent = el.innerText = msg;
    document.body.append(el);
}
