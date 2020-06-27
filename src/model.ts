import EventEmitter = require("events");

export declare interface Model {
    on(event: "added", listener: (n: ModelNode) => void): this;
    on(event: "deleted", listener: (n: ModelNode) => void): this;
    on(event: string, listener: Function): this;
}
export class Model extends EventEmitter {
    public nodes: ModelNode[] = [];
    public me: ModelNode;
    disconnected: boolean;

    Add(n: ModelNode) {
        this.nodes.push(n);
        this.emit("added", n);
    }

    Delete(n: ModelNode): boolean {
        const idx = this.nodes.indexOf(n);
        if (idx != -1) {
            this.nodes.splice(idx, 1);
            n.emit("removed", n);
            this.emit("deleted", n);
            return true;
        }
        return false;
    }

    HasNode(id: string) {
        return !!this.GetNode(id);
    }

    GetNode(id: string) {
        return this.nodes.filter((n) => n.Id() === id)[0];
    }

    IsMainPlayer(n: ModelNode): boolean {
        return n === this.me;
    }
}

export type Vec2 = [number, number];

export declare interface ModelNode {
    on(event: "stream", listener: (n: MediaStream) => void): this;
    on(event: "position", listener: (n: Vec2) => void): this;
    on(event: "nickname", listener: (n: string) => void): this;
    on(event: "color", listener: (n: string) => void): this;
    on(event: "removed", listener: (n: ModelNode) => void): this;
    on(event: "updated", listener: (n: ModelNode) => void): this;
    on(event: string, listener: Function): this;
}

export class ModelNode extends EventEmitter {
    private nickname: string;
    private color: string;
    private pos: Vec2 = [0, 0];

    private _mediaStream?: MediaStream;
    set mediaStream(value: MediaStream) {
        this._mediaStream = value;
        this.emit("stream", value);
    }
    get mediaStream() {
        return this._mediaStream;
    }

    constructor(private id: string) {
        super();
    }

    Id() {
        return this.id;
    }

    setID(peerId: string) {
        this.id = peerId;
    }

    setPos(pos: Vec2) {
        const [oldX, oldY] = this.pos;
        let [x, y] = pos;
        if (oldX !== x || oldY !== y) {
            this.pos = pos;
            this.emit("position", this.pos);
            this.emit("updated", this);
        }
    }

    setNickname(nickname: string) {
        this.nickname = nickname;
        this.emit("nickname", this.nickname);
        this.emit("updated", this);
    }

    setColor(color: string) {
        this.color = color;
        this.emit("color", this.color);
        this.emit("updated", this);
    }

    getPos(): Vec2 {
        return (this.pos || []).slice(0) as Vec2;
    }

    getNickname() {
        return this.nickname;
    }

    getColor() {
        return this.color;
    }

    apply(obj: any) {
        if (typeof obj.pos !== "undefined") {
            this.setPos(obj.pos);
        }

        if (typeof obj.nickname !== "undefined") {
            this.setNickname(obj.nickname);
        }

        if (typeof obj.color !== "undefined") {
            this.setColor(obj.color);
        }
    }

    toJSON() {
        return {
            id: this.Id(),
            color: this.getColor(),
            nickname: this.getNickname(),
            pos: this.getPos(),
        } as ModelNodeJSON;
    }
}

export interface ModelNodeJSON {
    id: string;
    color: string;
    nickname: string;
    pos: Vec2;
}
