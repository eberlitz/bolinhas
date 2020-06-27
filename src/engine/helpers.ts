/**
 * Plays a silent sound and also invoke the "resume" method
 * @param {AudioContext} context
 * @private
 */
export function startContext(context: AudioContext) {
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
        }
    }

    // const overlayEl = document.getElementById("overlay");
    // if (overlayEl?.parentElement) {
    //     overlayEl.parentElement.removeChild(overlayEl);
    //     const viewport = document.getElementById("viewport");
    //     viewport?.focus();
    // }
}
