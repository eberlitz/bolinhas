/**
 * Plays a silent sound and also invoke the "resume" method
 * @param {AudioContext} context
 * @private
 */
export function startContext(context: AudioContext) {
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
