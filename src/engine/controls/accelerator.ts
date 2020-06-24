import THREE = require("three");

export const PLAYER_SPEED = 1;

export class Accelerator {
    public position = new THREE.Vector3();
    public velocity = new THREE.Vector3();
    public acceleration = new THREE.Vector3();
    private friction = 0.06;

    update() {
        this.applyFriction();
        this.velocity.add(this.acceleration);
        this.position.add(this.velocity);
        this.limitSpeed();

        this.acceleration.multiplyScalar(0);
    }

    private limitSpeed() {
        if (this.velocity.length() > PLAYER_SPEED) {
            this.velocity.setLength(PLAYER_SPEED);
        }
    }

    applyForce(force: THREE.Vector3) {
        this.acceleration.add(force);
    }

    applyFriction() {
        let friction = this.velocity.clone().multiplyScalar(-this.friction);
        let precision = 0.005;
        let force =
            friction.length() < precision
                ? this.velocity.clone().multiplyScalar(-1)
                : friction;
        this.applyForce(force);
    }
}
