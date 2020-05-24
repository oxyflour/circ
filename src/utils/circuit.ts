import { uid, range, memo } from "./common"
import { Vec2 } from "./vec2"

class Base {
    id = uid()
}

export interface LinkPath {
    dir: 'x' | 'y'
    x: number
    y: number
}

export interface LinkEdge {
    idx: number
    start: LinkPath
    end: LinkPath
}

function mergePath(path: LinkPath[], tol: number) {
    const ret = [path[0]] as LinkPath[]
    for (let i = 1; i < path.length - 2; i ++) {
        if (Vec2.from(path[i + 1]).sub(path[i]).len() < tol) {
            const { dir } = path[i]
            path[i + 2][dir] = path[i][dir]
            i += 2
        } else {
            ret.push(path[i])
        }
    }
    for (let i = path.length - 2; i < path.length; i ++) {
        ret.push(path[i])
    }
    return ret
}

export class LinkData extends Base {
    from = { block: '', pin: -1, x: 0, y: 0 }
    to   = { block: '', pin: -1, x: 0, y: 0 }
    dir = 'x' as 'x' | 'y'
    breaks = [] as number[]
    copy(update = { } as Partial<LinkData>) {
        return LinkData.fromJSON({ ...this.toJSON(), ...update })
    }
    toJSON() {
        const { id, dir } = this,
            breaks = this.breaks.slice(),
            from = Object.assign({ }, this.from),
            to = Object.assign({ }, this.to)
        return { id, from, to, dir: dir as string, breaks }
    }
    static fromJSON(json: any) {
        const link = new LinkData()
        Object.assign(link, json)
        return link
    }
    static hoverOn = { } as { [link: string]: number }
    static fromPath(path: LinkPath[],
            from = null as any, to = null as any) {
        path = mergePath(path, 2)
        const link = new LinkData(),
            [begin, end] = [path[0], path[path.length - 1]]
        link.dir = begin.dir
        link.from.x = begin.x
        link.from.y = begin.y
        Object.assign(link.from, from)
        for (let i = 0; i < path.length - 2; i ++) {
            const { dir } = path[i]
            link.breaks.push(path[i + 1][dir])
        }
        link.to.x = end.x
        link.to.y = end.y
        Object.assign(link.to, to)
        return link
    }
    getPath() {
        const { from, to, breaks } = this,
            path = [{ dir: this.dir, x: from.x, y: from.y }] as LinkPath[]
        let dir = this.dir,
            pos = path[path.length - 1]
        for (const value of breaks) {
            if (dir === 'x') {
                path.push({ dir: dir = 'y', x: value, y: pos.y })
            } else {
                path.push({ dir: dir = 'x', x: pos.x, y: value })
            }
            pos = path[path.length - 1]
        }
        if (dir === 'x') {
            path.push({ dir: 'y', x: to.x, y: pos.y }, { dir: 'x', x: to.x, y: to.y })
        } else {
            path.push({ dir: 'x', x: pos.x, y: to.y }, { dir: 'y', x: to.x, y: to.y })
        }
        return path
    }
    updatePos(blocks: { [id: string]: BlockData }) {
        const { from, to } = this
        for (const at of [from, to]) {
            const block = at.block && blocks[at.block],
                pin = block && at.pin >= 0 && at.pin < block.pins.length && block.pins[at.pin]
            if (block && pin) {
                at.x = block.pos.x + pin.pos.x
                at.y = block.pos.y + pin.pos.y
            } else {
                at.block = ''
                at.pin = -1
            }
        }
    }
    split(pos: Vec2, idx: number) {
        const path = this.getPath(),
            dir = path[idx].dir === 'x' ? 'y' : 'x'
        pos[dir] = path[idx][dir]
        const left = path.slice(0, idx + 1).concat({ dir: dir === 'x' ? 'y' : 'x', ...pos }),
            right = path.slice(0, 0).concat([{ dir, ...pos }]).concat(path.slice(idx + 1))
        return [LinkData.fromPath(left, this.from, null), LinkData.fromPath(right, null, this.to)]
    }
}

export interface BlockPin {
    pos: Vec2
    end: Vec2
}

export class BlockData extends Base {
    type = 'nil.s5p'
    pos = new Vec2()
    rot = 0
    copy(update = { } as Partial<BlockData>) {
        return BlockData.fromJSON({ ...this.toJSON(), ...update })
    }
    toJSON() {
        const { id, type, rot, pos: { x, y } } = this
        return { id, type, rot, pos: { x, y } }
    }
    static fromJSON(json: any) {
        const { id, type, rot, pos: { x, y } } = json,
            pos = Vec2.from(x, y),
            block = new BlockData()
        Object.assign(block, { id, type, rot, pos })
        return block
    }
    static hoverOn = { } as { [block: string]: number }
    private static getShape = memo((type: string, rot: number) => {
        const [, portNum] = type.match(/.*\.s(\d+)p/) || ['', '']
        if (portNum) {
            const ports = parseInt(portNum),
                width = 50,
                height = Math.ceil(ports / 2) * 30 + 20,
                pins = [] as BlockPin[]
            for (const i of range(ports)) {
                const d = i % 2 ? 1 : -1,
                    y = (Math.floor(i / 2) + 0.5) * 30 + 20 * 0.5
                pins.push({
                    pos: Vec2.from(d * 35, y - height * 0.5).rot(rot),
                    end: Vec2.from(d * 25, y - height * 0.5).rot(rot),
                })
            }
            return { width, height, pins }
        } else if (type === 'joint') {
            return { width: 16, height: 16, pins: [{ pos: Vec2.from(0, 0), end: Vec2.from(0, 0) }] }
        } else {
            throw Error(`unknown block type ${type}`)
        }
    })
    get width() {
        return BlockData.getShape(this.type, this.rot).width
    }
    get height() {
        return BlockData.getShape(this.type, this.rot).height
    }
    get pins() {
        return BlockData.getShape(this.type, this.rot).pins
    }
}
