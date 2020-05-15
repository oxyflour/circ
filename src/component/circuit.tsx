import * as React from 'react'
import { uid, debounce, memo, range, lerp } from '../utils/common'
import { Vec2 } from '../utils/vec2'
import { withMouseDown } from '../utils/dom'

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

export class LinkData extends Base {
    from = { block: '', pin: -1, x: 0, y: 0 }
    to   = { block: '', pin: -1, x: 0, y: 0 }
    dir = 'x' as 'x' | 'y'
    breaks = [] as number[]
    toJSON() {
        const { id, dir } = this,
            breaks = this.breaks.slice(),
            from = Object.assign({ }, this.from),
            to = Object.assign({ }, this.to)
        return { id, from, to, dir, breaks }
    }
    static fromJSON(json: any) {
        const link = new LinkData()
        Object.assign(link, json)
        return link
    }
    static hoverOn = { } as { [link: string]: number }
    static fromPath(path: LinkPath[],
            from = null as any, to = null as any) {
        const link = new LinkData(),
            [begin, end] = [path[0], path[path.length - 1]]
        link.dir = begin.dir
        link.from.x = begin.x
        link.from.y = begin.y
        Object.assign(link.from, from)
        for (const i of range(path.length - 2)) {
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

function Link(props: {
    data: LinkData
    edges: LinkEdge[]
    selected: number
    onMouseDownOnPin: (evt: React.MouseEvent, link: LinkData, atKey: 'from' | 'to') => void
}) {
    const { data: { from, to }, data, edges } = props
    return <>
        { edges.map(({ idx, start, end }) => <line key={ idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y }
            stroke={ from.block && to.block ? 'gray' : 'orange' } strokeWidth={ 2 } />) }
        <circle
            cx={ from.x } cy={ from.y } r={ 4 } className="link-pin"
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'from') }
            fill={ from.block ? 'gray' : 'orange' } stroke="none" />
        <circle
            cx={ to.x } cy={ to.y } r={ 4 } className="link-pin"
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'to') }
            fill={ to.block ? 'gray' : 'orange' } stroke="none" />
    </>
}

function LinkEdges(props: {
    data: LinkData
    edges: LinkEdge[]
    onMouseDownOnLink: (evt: React.MouseEvent, link: LinkData, idx: number) => void
}) {
    const { data: { id }, edges, data } = props
    return <>
        { edges.map(({ idx, start, end }) => <line key={ 'l' + idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y } className={ 'link-' + start.dir }
            onMouseDown={ evt => props.onMouseDownOnLink(evt, data, idx) }
            onMouseOver={ () => LinkData.hoverOn[id] = idx }
            onMouseOut={ () => delete LinkData.hoverOn[id] }
            stroke="transparent" strokeWidth={ 6 } />) }
    </>
}

export interface BlockPin {
    pos: Vec2
    end: Vec2
}

export class BlockData extends Base {
    type = 'nil.s5p'
    pos = new Vec2()
    toJSON() {
        const { id, type, pos: { x, y } } = this
        return { id, type, pos: { x, y } }
    }
    static fromJSON(json: any) {
        const { id, type, pos: { x, y } } = json,
            pos = Vec2.from(x, y),
            block = new BlockData()
        Object.assign(block, { id, type, pos })
        return block
    }
    static hoverOn = { } as { [block: string]: number }
    private static getShape = memo((type: string) => {
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
                    pos: Vec2.from(d * 35, y - height * 0.5),
                    end: Vec2.from(d * 25, y - height * 0.5),
                })
            }
            return { width, height, pins }
        } else {
            throw Error(`unknown block type ${type}`)
        }
    })
    get width() {
        return BlockData.getShape(this.type).width
    }
    get height() {
        return BlockData.getShape(this.type).height
    }
    get pins() {
        return BlockData.getShape(this.type).pins
    }
}

function Block(props: {
    data: BlockData
    selected: number
    onMouseDownOnBlock: (evt: React.MouseEvent, block: BlockData) => void
}) {
    const { selected, data: { pos, width, height, pins } } = props,
        color = selected ? 'blue' : 'gray'
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { pins.map(({ pos, end }, pin) => <line key={ 'b' + pin }
            x1={ pos.x } y1={ pos.y } x2={ end.x } y2={ end.y }
            stroke="gray" />) }
        { pins.map(({ pos }, pin) => <circle key={ 'c' + pin }
            cx={ pos.x } cy={ pos.y } r={ 5 }
            stroke="none" fill="white" />) }
        <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
            onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
            stroke={ color } fill="white" />
    </g>
}

function BlockPins(props: {
    data: BlockData
    onMouseDownOnPin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
}) {
    const { id, pos, pins } = props.data
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { pins.map(({ pos }, pin) => <circle key={ 'd' + pin } cx={ pos.x } cy={ pos.y } r={ 6 }
            onMouseDown={ evt => props.onMouseDownOnPin(evt, props.data, pin) }
            onMouseOver={ () => BlockData.hoverOn[id] = pin }
            onMouseOut={ () => delete BlockData.hoverOn[id] }
            stroke="gray" fill="transparent" />) }
    </g>
}

export interface CircuitHandle {
    addBlock(): void
}

export default function Circuit(props: {
    handle: React.MutableRefObject<CircuitHandle>
    width: number
    height: number
}) {
    const { width, height } = props,
        [blocks, setBlocks] = React.useState([] as BlockData[]),
        [links, setLinks] = React.useState([] as LinkData[]),
        [selected, setSelected] = React.useState({ } as { [id: string]: number })
    function getSvgBase(elem: SVGElement) {
        const svg = elem.closest('svg'),
            { left, top } = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 }
        return Vec2.from(left, top)
    }
    function getHoverLink(pos: Vec2) {
        const entries = Object.entries(LinkData.hoverOn),
            [id, idx] = entries[entries.length - 1] || ['', -1],
            link = id ? links.find(item => item.id === id) : undefined,
            path = link && link.getPath() || [],
            at = Vec2.from(pos)
        if (path[idx]) {
            const dir = path[idx].dir === 'x' ? 'y' : 'x'
            at[dir] = path[idx][dir]
        }
        return { link, idx, at }
    }
    function setLinksAndBlocks(links: LinkData[], blocks: BlockData[]) {
        // TODO
    }

    function onMouseDownOnBlock(evt: React.MouseEvent, block: BlockData) {
        const start = Vec2.from(evt.clientX, evt.clientY),
            base = new Vec2(block.pos)
        withMouseDown(evt => {
            const current = Vec2.from(evt.clientX, evt.clientY),
                moving = BlockData.fromJSON(block.toJSON())
            moving.pos = base.add(current).sub(start)
            setBlocks(blocks.map(item => item.id === moving.id ? moving : item))
        }, evt => {
        })
    }
    function onMouseDownOnBlockPin(evt: React.MouseEvent, block: BlockData, pin: number) {
        const base = getSvgBase(evt.target as SVGCircleElement),
            created = new LinkData()
        Object.assign(created.from, { block: block.id, pin: pin, x: 0, y: 0 })
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base)
            Object.assign(created.to, getHoverLink(pos).at)
            const [block, pin] = Object.entries(BlockData.hoverOn)[0] || ['', -1]
            Object.assign(created.to, { block, pin })
            setLinks(links.concat(created))
        }, evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base),
                { at, link, idx } = getHoverLink(pos)
            if (link) {
                const [left, right] = link.split(at, idx)
                left.id = link.id
                setLinks(links
                    .filter(item => item.id !== link.id && item.id != created.id)
                    .concat([left, right, created]))
            }
        })
    }
    function onMouseDownOnLink(evt: React.MouseEvent, link: LinkData, idx: number) {
        const path = link.getPath()
        if (idx === 0) {
            const first = path[0]
            path.unshift({ dir: path[1].dir, x: first.x, y: first.y })
            idx += 1
        } else if (idx === path.length - 2) {
            const last = path[path.length - 1]
            path.push({ dir: path[idx].dir, x: last.x, y: last.y })
        }
        const base = getSvgBase(evt.target as SVGCircleElement)
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base),
                { dir } = path[idx + 1]
            path[idx][dir] = pos[dir]
            path[idx + 1][dir] = pos[dir]
            const created = LinkData.fromPath(path, link.from, link.to)
            created.id = link.id
            setLinks(links.map(item => item.id === created.id ? created : item))
        }, evt => {
        })
    }
    function onMouseDownOnLinkPin(evt: React.MouseEvent, link: LinkData, atKey: 'from' | 'to') {
        const at = link[atKey],
            block = at.block && blocks.find(block => block.id === at.block),
            pos = block && block.pins[at.pin]
        if (block && pos) {
            return onMouseDownOnBlockPin(evt, block, at.pin)
        }
        const created = LinkData.fromJSON(link.toJSON()),
            base = getSvgBase(evt.target as SVGCircleElement),
            selectedStatus = selected[created.id]
        setSelected({ ...selected, [link.id]: -1 })
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base)
            Object.assign(created[atKey], getHoverLink(pos).at)
            const [block, pin] = Object.entries(BlockData.hoverOn)[0] || ['', -1]
            Object.assign(created[atKey], { block, pin })
            setLinks(links.map(item => item.id === created.id ? created : item))
        }, evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base),
                { at, link, idx } = getHoverLink(pos)
            if (link) {
                const [left, right] = link.split(at, idx)
                left.id = link.id
                setLinks(links
                    .filter(item => item.id !== link.id && item.id != created.id)
                    .concat([left, right, created]))
            }
            setSelected({ ...selected, [created.id]: selectedStatus })
        })
    }

    React.useEffect(() => {
        props.handle.current = { addBlock }
    }, [blocks])
    function addBlock() {
        const block = new BlockData()
        block.pos = Vec2.from(width / 2, height / 2)
        setBlocks(blocks.concat(block))
    }

    const blockMap = { } as { [id: string]: BlockData }
    for (const block of blocks) {
        blockMap[block.id] = block
    }
    const linkEdges = [] as { link: LinkData, edges: LinkEdge[] }[]
    for (const link of links) {
        link.updatePos(blockMap)
        const path = link.getPath(),
            edges = range(path.length - 1).map(idx => ({ idx, start: path[idx], end: path[idx + 1] }))
        linkEdges.push({ link, edges })
    }
    return <svg width={ width } height={ height }>
        { blocks.map(block => <Block key={ block.id } data={ block }
            selected={ selected[block.id] }
            onMouseDownOnBlock={ onMouseDownOnBlock } />) }
        { linkEdges.map(({ link, edges }) => <Link key={ link.id } data={ link } edges={ edges }
            onMouseDownOnPin={ onMouseDownOnLinkPin }
            selected={ selected[link.id] } />) }
        { blocks.map(block => <BlockPins key={ 'p' + block.id } data={ block }
            onMouseDownOnPin={ onMouseDownOnBlockPin } />) }
        { linkEdges.map(({ link, edges }) => selected[link.id] !== -1 && <LinkEdges key={ 'l' + link.id }
            data={ link } edges={ edges }
            onMouseDownOnLink={ onMouseDownOnLink } />) }
    </svg>
}
