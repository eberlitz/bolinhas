import THREE = require("three");
import { ModelNode, Vec2 } from "../model";
import * as d3 from "d3-scale";
// import { PositionalAudioHelper } from "three/examples/jsm/helpers/PositionalAudioHelper";

export class Player extends THREE.Group {
    private material!: THREE.MeshBasicMaterial;
    public oldPos: Vec2 = [0, 0];
    analyser: THREE.AudioAnalyser;

    _onMediaStream = this.onMediaStream.bind(this);
    ripple: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;

    constructor(
        public node: ModelNode,
        private audioListener: THREE.AudioListener
    ) {
        super();

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

    onMediaStream(stream: MediaStream) {
        const audioEl = new Audio();
        // audioEl.autoplay = true;
        audioEl.srcObject = stream;

        var sound = new THREE.PositionalAudio(this.audioListener);
        sound.setVolume( 1 );
        sound.setDistanceModel("exponential");
        sound.setRolloffFactor(15);
        // O Audio será ouvido em 100% se estiver a uma distancia de X
        sound.setRefDistance(150);
        // MaxDistance indica o ponto aonde o audio não será mais reduzido. Portando n˜åo devemos setar.
        // sound.setMaxDistance(10000);



       
        


        // for debugging sounds
        const sounds = (window as any).sounds = (window as any).sounds || [];
        sounds.push(sound);
        
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
        if (this.analyser) {
            let avg = this.analyser.getAverageFrequency();
            // console.log(avg);

            const scale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
            avg = scale(Math.max(Math.min(avg, 100), 0));

            this.ripple.scale.x = 4 * avg;
            this.ripple.scale.y = 4 * avg;
        }
    }

    dispose() {
        this.node.removeListener("stream", this._onMediaStream);
    }
}
