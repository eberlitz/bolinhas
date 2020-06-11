
import EventEmitter = require('events');

export declare interface Model {
    on(event: 'added', listener: (n: ModelNode) => void): this;
    on(event: 'deleted', listener: (n: ModelNode) => void): this;
    on(event: string, listener: Function): this;
}
export class Model extends EventEmitter {
    private nodesMap: { [id: string]: ModelNode } = {};
    public nodes: ModelNode[] = [];
    public me: ModelNode;

    public myId?: string;

    Add(n: ModelNode) {
        this.nodes.push(n)
        this.nodesMap[n.Id()] = n;
        this.emit('added', n)
    }

    Delete(n: ModelNode): boolean {
        const idx = this.nodes.indexOf(n);
        if (idx != -1) {
            this.nodes.splice(idx, 1)
            delete this.nodesMap[n.Id()];
            this.emit('deleted', n)
            // TODO: maybe remove this
            this.removeAllListeners();
            return true;
        }
        return false
    }

    HasNode(id: string) {
        return !!this.GetNode(id);
    }

    GetNode(id: string) {
        return this.nodesMap[id];
    }
}

export type Vec2 = [number, number];


export declare interface ModelNode {
    on(event: 'position', listener: (n: Vec2) => void): this;
    on(event: 'nickname', listener: (n: string) => void): this;
    on(event: 'color', listener: (n: number) => void): this;
    on(event: 'updated', listener: (n: ModelNode) => void): this;
    on(event: string, listener: Function): this;
}

export class ModelNode extends EventEmitter {
    private nickname: string;
    private color: number;
    private pos: Vec2 = [0, 0];

    constructor(private id: string) {
        super();
    }

    Id() {
        return this.id;
    }

    setPos(pos: Vec2) {
        const [oldX, oldY] = this.pos;
        let [x, y] = pos;
        if (oldX !== x || oldY !== y) {
            this.pos = pos;
            this.emit("position", this.pos)
            this.emit("updated", this)
        }
    }

    setNickname(nickname: any) {
        this.nickname = nickname;
        this.emit("nickname", this.pos)
        this.emit("updated", this)
    }

    setColor(color: any) {
        this.color = color;
        this.emit("color", this.pos)
        this.emit("updated", this)
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
        if (typeof obj.pos !== 'undefined') {
            this.setPos(obj.pos)
        }

        if (typeof obj.nickname !== 'undefined') {
            this.setNickname(obj.nickname)
        }

        if (typeof obj.color !== 'undefined') {
            this.setColor(obj.color)
        }
    }

    toJSON() {
        return {
            id: this.Id(),
            color: this.getColor(),
            nickname: this.getNickname(),
            pos: this.getPos(),
        };
    }
}