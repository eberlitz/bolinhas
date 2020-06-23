import THREE = require("three");
import { ModelNode, Vec2 } from "../model";
import * as d3 from "d3-scale";
import { Bodies } from "matter-js";

const audioDistanceModel = {
    maxDistance: 400,
    radius: 150,
    volume: 1,
};
// TODO: Remove later, debug only
(window as any).audioDistanceModel = audioDistanceModel;

export class Player extends THREE.Group {
    private material!: THREE.MeshBasicMaterial;
    public oldPos: Vec2 = [0, 0];
    analyser: THREE.AudioAnalyser;

    _onMediaStream = this.onMediaStream.bind(this);
    ripple: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
    sound: THREE.Audio<GainNode>;
    body: Matter.Body;

    constructor(
        public node: ModelNode,
        private audioListener: THREE.AudioListener
    ) {
        super();

        const [x, y] = node.getPos();
        this.body = Bodies.circle(x, y, 5, {
            friction: 0.001,
            frictionAir: 0.005,
            restitution: 0.5,
            density: 0.001,
        });

        const color = new THREE.Color(node.getColor());
        const radius = 5;
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        this.material = new THREE.MeshBasicMaterial({ color });
        var circle = new THREE.Mesh(geometry, this.material);
        this.add(circle);

        this.ripple = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.5,
            })
        );
        this.add(this.ripple);
        this.ripple.position.y -= 0.001;

        this.node.addListener("stream", this._onMediaStream);
        if (this.node.mediaStream) {
            this.onMediaStream(this.node.mediaStream);
        }
    }

    onMediaStream(stream?: MediaStream) {
        if (!stream) {
            this.analyser = null;
            return;
        }
        const audioEl = new Audio();
        // audioEl.autoplay = true;
        // Older browsers may not have srcObject
        if (("srcObject" in audioEl) as any) {
            audioEl.srcObject = stream;
        } else {
            // Avoid using this in new browsers, as it is going away.
            audioEl.src = window.URL.createObjectURL(stream);
        }

        var sound = (this.sound = new THREE.Audio(this.audioListener));
        sound.setVolume(1);

        // var helper = new PositionalAudioHelper(sound, 10);
        // sound.add(helper);

        // to use sine generator
        // var oscillator = this.audioListener.context.createOscillator();
        // oscillator.type = 'sine';
        // oscillator.frequency.setValueAtTime( 144, sound.context.currentTime );
        // oscillator.start( 0 );
        // sound.setNodeSource( oscillator as any );
        // TO use stream from other user
        var context = this.audioListener.context;
        var source = context.createMediaStreamSource(stream);
        sound.setNodeSource(source as any);

        // var oscGain = (this.oscGain = context.createGain());
        // source.connect(oscGain);
        // source.connect(context.destination);
        // oscGain.connect(context.destination);
        // oscGain.gain.value = 0;

        sound.autoplay = true;
        // sound.setMediaStreamSource(stream);
        // sound.setRefDistance(20);
        sound.play();
        sound.rotateX(THREE.MathUtils.degToRad(90));
        this.add(sound);
        this.analyser = new THREE.AudioAnalyser(sound, 32);
        // this.analyser.getAverageFrequency();
    }

    updatePos(pos: Vec2, mainId: string) {
        if (mainId !== this.node.Id()) {
            this.position.x = pos[0];
            this.position.y = pos[1];
        }
    }

    setColor(color: THREE.Color) {
        this.material.color = color;
        this.ripple.material.color = color;
    }

    update(time: number) {
        const { x, y } = this.body.position;
        this.position.set(x, y, 0);
        console.log(this.position)
       
        if (this.analyser) {
            let avg = this.analyser.getAverageFrequency();
            // console.log(avg);

            const scale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
            avg = scale(Math.max(Math.min(avg, 100), 0));

            this.ripple.scale.x = 4 * avg;
            this.ripple.scale.y = 4 * avg;
        }

        if (this.sound) {
            var distance = this.getWorldPosition(
                new THREE.Vector3()
            ).distanceTo(
                this.audioListener.getWorldPosition(new THREE.Vector3())
            );
            let gain = 0;
            if (distance <= audioDistanceModel.maxDistance) {
                gain =
                    audioDistanceModel.volume *
                    (1 - distance / audioDistanceModel.radius);
            }

            //     const scale = d3
            //         .scalePow()
            //         .exponent(0.36)
            //         .domain([0, 400])
            //         .range([1, 0]);
            //     peer_audio.volume = scale(Math.max(Math.min(dist, 400), 0));
            // }
            this.sound.getOutput().gain.value = Math.max(gain, 0);
            // this.sound.setVolume(Math.max(gain, 0));
        }
    }

    dispose() {
        this.node.removeListener("stream", this._onMediaStream);
    }
}
