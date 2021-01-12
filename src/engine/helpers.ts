import THREE = require("three");
import { isMobile } from "is-mobile";

/**
 * Plays a silent sound and also invoke the "resume" method
 * @param {AudioContext} context
 * @private
 */
export function startContext(audioListener: THREE.AudioListener) {
    const context = audioListener.context;
    if (context?.state !== "running") {
        // this accomplishes the iOS specific requirement
        var buffer = context.createBuffer(1, 1, context.sampleRate);
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        // resume the audio context
        if (context.resume) {
            console.log("Resuming audioContext");
            context.resume();
            setTimeout(function () {
                if (context.state === "running") {
                    if (!isMobile() && /chrome/i.test(navigator.userAgent)) {
                        enableChromeAEC(audioListener);
                    }
                }
            }, 0);
        }
    }

    // const overlayEl = document.getElementById("overlay");
    // if (overlayEl?.parentElement) {
    //     overlayEl.parentElement.removeChild(overlayEl);
    //     const viewport = document.getElementById("viewport");
    //     viewport?.focus();
    // }
}

async function enableChromeAEC(audioListener: THREE.AudioListener) {
    console.log("enableChromeAEC");
    /**
     *  workaround for: https://bugs.chromium.org/p/chromium/issues/detail?id=687574
     *  1. grab the GainNode from the scene's THREE.AudioListener
     *  2. disconnect the GainNode from the AudioDestinationNode (basically the audio out), this prevents hearing the audio twice.
     *  3. create a local webrtc connection between two RTCPeerConnections (see this example: https://webrtc.github.io/samples/src/content/peerconnection/pc1/)
     *  4. create a new MediaStreamDestination from the scene's THREE.AudioContext and connect the GainNode to it.
     *  5. add the MediaStreamDestination's track  to one of those RTCPeerConnections
     *  6. connect the other RTCPeerConnection's stream to a new audio element.
     *  All audio is now routed through Chrome's audio mixer, thus enabling AEC, while preserving all the audio processing that was performed via the WebAudio API.
     */

    const audioEl = new Audio();
    audioEl.setAttribute("autoplay", "autoplay");
    audioEl.setAttribute("playsinline", "playsinline");

    const context = audioListener.context;
    const loopbackDestination = context.createMediaStreamDestination();
    const outboundPeerConnection = new RTCPeerConnection();
    const inboundPeerConnection = new RTCPeerConnection();

    const onError = (e: any) => {
        console.error("RTCPeerConnection loopback initialization error", e);
    };

    outboundPeerConnection.addEventListener("icecandidate", (e) => {
        inboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener("icecandidate", (e) => {
        outboundPeerConnection.addIceCandidate(e.candidate).catch(onError);
    });

    inboundPeerConnection.addEventListener("track", (e) => {
        audioEl.srcObject = e.streams[0];
    });
    const gainNode = audioListener.gain;

    gainNode.disconnect();
    gainNode.connect(loopbackDestination);

    loopbackDestination.stream.getTracks().forEach((track) => {
        outboundPeerConnection.addTrack(track, loopbackDestination.stream);
    });

    const offer = await outboundPeerConnection.createOffer().catch(onError);
    if (offer) {
        outboundPeerConnection.setLocalDescription(offer).catch(onError);
        await inboundPeerConnection.setRemoteDescription(offer).catch(onError);

        const answer = await inboundPeerConnection.createAnswer();
        inboundPeerConnection.setLocalDescription(answer).catch(onError);
        outboundPeerConnection.setRemoteDescription(answer).catch(onError);
    }
}
