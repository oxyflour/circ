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
    let idx = 1
    for (; idx < path.length - 2; idx ++) {
        if (Vec2.from(path[idx + 1]).sub(path[idx]).len() < tol) {
            const { dir } = path[idx]
            path[idx + 2][dir] = path[idx][dir]
            idx += 1
        } else {
            ret.push(path[idx])
        }
    }
    for (; idx < path.length; idx ++) {
        ret.push(path[idx])
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
    reverse() {
        const { from, to } = this.toJSON()
        return this.copy({ from: to, to: from })
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
    static join(left: LinkData, right: LinkData) {
        return this.joinPath(left.getPath(), right.getPath(), left, right)
    }
    private static joinPath(a: LinkPath[], b: LinkPath[], left: LinkData, right: LinkData, tol = 2): LinkData {
        const [a0, a1] = [a[0], a[a.length - 1]],
            [b0, b1] = [b[0], b[b.length - 1]]
        if (Vec2.from(a1).sub(b0).len() < tol) {
            return LinkData.fromPath((a1.dir === b0.dir ? a.slice(0, -1) : a).concat(b), left.from, right.to)
        } else if (Vec2.from(a1).sub(b1).len() < tol) {
            return this.joinPath(a, b.reverse(), left, right.reverse())
        } else if (Vec2.from(a0).sub(b0).len() < tol) {
            return this.joinPath(a.reverse(), b, left.reverse(), right)
        } else if (Vec2.from(a0).sub(b1).len() < tol) {
            return this.joinPath(a.reverse(), b.reverse(), left.reverse(), right.reverse())
        } else {
            throw Error('cannot joint two lnks')
        }
    }
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

export class BlockData<P = any> extends Base {
    type = 'nil.s5p'
    attrs = { } as P
    pos = new Vec2()
    rot = 0
    copy(update = { } as Partial<BlockData>) {
        return BlockData.fromJSON({ ...this.toJSON(), ...update })
    }
    toJSON() {
        const { id, type, rot, pos: { x, y }, attrs } = this
        return { id, type, rot, pos: { x, y }, attrs: JSON.stringify(attrs) }
    }
    static fromJSON(json: any) {
        const { id, type, rot, pos: { x, y }, attrs: attrsJson } = json,
            pos = Vec2.from(x, y),
            block = new BlockData(),
            attrs = JSON.parse(attrsJson)
        Object.assign(block, { id, type, rot, pos, attrs })
        return block
    }
    private static getShape = memo((type: string, rot: number) => {
        const [, portNum] = type.match(/.*\.s(\d+)p/) || ['', '']
        if (portNum) {
            const ports = parseInt(portNum),
                width = 50,
                height = Math.ceil(ports / 2) * 30 + 20,
                pins = [] as BlockPin[],
                labels = [] as { pos: Vec2, val: string }[]
            for (const i of range(ports)) {
                const d = i % 2 ? 1 : -1,
                    y = (Math.floor(i / 2) + 0.5) * 30 + 20 * 0.5
                pins.push({
                    pos: Vec2.from(d * 35, y - height * 0.5).rot(rot),
                    end: Vec2.from(d * 25, y - height * 0.5).rot(rot),
                })
                labels.push({
                    pos: Vec2.from(d * 15, y - height * 0.5).rot(rot),
                    val: `${i + 1}`
                })
            }
            return { width, height, pins, labels }
        } else if (type === 'lc') {
            const width = 50,
                height = 30,
                pins = [
                    { pos: Vec2.from(-35, 0).rot(rot), end: Vec2.from(-25, 0).rot(rot) },
                    { pos: Vec2.from( 35, 0).rot(rot), end: Vec2.from( 25, 0).rot(rot) },
                ],
                labels = [] as { pos: Vec2, val: string }[]
            return { width, height, pins, labels }
        } else if (type === 'gnd') {
            const width = 50,
                height = 50,
                pins = [{ pos: Vec2.from(0, 0).rot(rot), end: Vec2.from(0, 15) }],
                labels = [] as { pos: Vec2, val: string }[]
            return { width, height, pins, labels }
        } else if (type === 'joint') {
            const width = 16,
                height = 16,
                pins = [{ pos: Vec2.from(0, 0), end: Vec2.from(0, 0) }],
                labels = [] as { pos: Vec2, val: string }[]
            return { width, height, pins, labels }
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
    get labels() {
        return BlockData.getShape(this.type, this.rot).labels
    }
}

export function cleanup(blocks: BlockData[], links: LinkData[]) {
    const joints = { } as { [id: string]: { joint: BlockData, conns: LinkData[] } }
    for (const joint of blocks) {
        if (joint.type === 'joint') {
            joints[joint.id] = { joint, conns: [] }
        }
    }
    for (const link of links) {
        for (const end of [link.from, link.to]) {
            const joint = joints[end.block]
            if (joint) {
                joint.conns.push(link)
            }
        }
    }
    let next = false
    for (const { conns, joint } of Object.values(joints)) {
        if (conns.length === 2) {
            const [a, b] = conns
            links = links.filter(item => item.id !== a.id && item.id !== b.id).concat(LinkData.join(a, b))
            blocks = blocks.filter(item => item.id !== joint.id)
            next = true
            break
        } else if (links.length < 2) {
            blocks = blocks.filter(item => item.id !== joint.id)
            next = true
            break
        }
    }
    return { blocks, links, next }
}

export function cleanupCircuit(blocks: BlockData[], links: LinkData[]) {
    let ret = { blocks, links, next: true }
    for (let count = 0; count < 100 && ret.next; count ++) {
        ret = cleanup(blocks, links)
    }
    return ret
}
