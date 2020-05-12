import * as React from 'react'
import { uid, debounce, memo, range } from '../utils/common'
import { Vec2 } from '../utils/vec2'
import { withMouseDown } from '../utils/dom'

class Base {
    id = uid()
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
    getPath() {
        const { from, to, breaks } = this,
            path = [{ dir: this.dir, x: from.x, y: from.y }]
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
    getPos(blocks: BlockData[]) {
        const { from, to } = this
        for (const at of [from, to]) {
            const block = at.block && blocks.find(block => block.id === at.block),
                pin = block && at.pin >= 0 && at.pin < block.pins.length && block.pins[at.pin]
            if (block && pin) {
                at.x = block.pos.x + pin.pos.x
                at.y = block.pos.y + pin.pos.y
            } else {
                at.block = ''
                at.pin = -1
            }
        }
        return { from, to }
    }
}

function Link(props: {
    data: LinkData
    blocks: BlockData[]
    selected: boolean
    onMouseDownOnLink: (evt: React.MouseEvent, link: LinkData, idx: number) => void
    onMouseDownOnPin: (evt: React.MouseEvent, link: LinkData, atKey: 'from' | 'to') => void
}) {
    const { data, blocks } = props,
        { from, to } = data.getPos(blocks),
        path = data.getPath(),
        nodes = range(path.length - 1).map(idx => ({ idx, start: path[idx], end: path[idx + 1] }))
    return <>
        { nodes.map(({ idx, start, end }) => <line key={ idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y }
            stroke={ from.block && to.block ? 'gray' : 'orange' } strokeWidth={ 1 } />) }
        { nodes.map(({ idx, start, end }) => <line key={ 'l' + idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y }
            onMouseDown={ evt => props.onMouseDownOnLink(evt, data, idx) }
            stroke="transparent" strokeWidth={ 4 } />) }
        <circle
            cx={ from.x } cy={ from.y } r={ 3 }
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'from') }
            fill={ from.block ? 'gray' : 'orange' } stroke="none" />
        <circle
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'to') }
            cx={ to.x } cy={ to.y } r={ 3 }
            fill={ to.block ? 'gray' : 'orange' } stroke="none" />
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
    selected: boolean
    onMouseDownOnBlock: (evt: React.MouseEvent, block: BlockData) => void
    onMouseDownOnPin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
    onMouseEnterPin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
    onMouseLeavePin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
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
        { pins.map(({ pos }, pin) => <circle key={ 'd' + pin } cx={ pos.x } cy={ pos.y } r={ 5 }
            onMouseDown={ evt => props.onMouseDownOnPin(evt, props.data, pin) }
            onMouseEnter={ evt => props.onMouseEnterPin(evt, props.data, pin) }
            onMouseLeave={ evt => props.onMouseLeavePin(evt, props.data, pin) }
            stroke="gray" fill="transparent" />) }
        <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
            onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
            stroke={ color } fill="white" />
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
        [selected, setSelected] = React.useState({ } as { [id: string]: boolean }),
        [hoverPin, setHoverPin] = React.useState({ block: '', pin: -1 })
    function getSvgBase(elem: SVGElement) {
        const svg = elem.closest('svg'),
            { left, top } = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 }
        return Vec2.from(left, top)
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
            link = new LinkData()
        Object.assign(link.from, { block: block.id, pin: pin, x: 0, y: 0 })
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base)
            console.log(hoverPin.block && hoverPin.pin >= 0,
                    !(hoverPin.block === block.id && hoverPin.pin === pin),
                    blocks.find(block => block.id === hoverPin.block && block.pins.length < hoverPin.pin))
            if (hoverPin.block && hoverPin.pin >= 0 &&
                    !(hoverPin.block === block.id && hoverPin.pin === pin) &&
                    blocks.find(block => block.id === hoverPin.block && block.pins.length < hoverPin.pin)) {
                link.to.block = hoverPin.block
                link.to.pin = hoverPin.pin
            } else {
                link.to.x = pos.x
                link.to.y = pos.y
            }
            setLinks(links.concat(link))
        }, evt => {
        })
    }
    function onMouseEnterBlockPin(evt: React.MouseEvent, block: BlockData, pin: number) {
        setHoverPin({ block: block.id, pin })
        console.log('enter')
    }
    function onMouseLeaveBlockPin(evt: React.MouseEvent, block: BlockData, pin: number) {
        setHoverPin({ block: '', pin: -1 })
        console.log('leave')
    }
    function onMouseDownOnLink(evt: React.MouseEvent, link: LinkData, idx: number) {
        const path = link.getPath(),
            node = path[idx + 1],
            last = path[path.length - 1],
            created = LinkData.fromJSON(link.toJSON())
        if (idx === 0) {
            created.dir = node.dir
            created.breaks.splice(0, 0, node[node.dir])
            idx += 1
        } else if (idx === path.length - 2) {
            created.breaks.push(last[node.dir])
        }
        const base = getSvgBase(evt.target as SVGCircleElement)
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base)
            created.breaks[idx - 1] = pos[node.dir]
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
            base = getSvgBase(evt.target as SVGCircleElement)
        withMouseDown(evt => {
            const pos = Vec2.from(evt.clientX, evt.clientY).sub(base)
            created[atKey].x = pos.x
            created[atKey].y = pos.y
            setLinks(links.map(item => item.id === created.id ? created : item))
        }, evt => {
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
    return <svg width={ width } height={ height }>
        { blocks.map(block => <Block key={ block.id } data={ block }
            selected={ selected[block.id] }
            onMouseDownOnBlock={ onMouseDownOnBlock }
            onMouseDownOnPin={ onMouseDownOnBlockPin }
            onMouseEnterPin={ onMouseEnterBlockPin }
            onMouseLeavePin={ onMouseLeaveBlockPin } />) }
        { links.map(link => <Link key={ link.id } data={ link } blocks={ blocks }
            onMouseDownOnLink={ onMouseDownOnLink }
            onMouseDownOnPin={ onMouseDownOnLinkPin }
            selected={ selected[link.id] } />) }
    </svg>
}
