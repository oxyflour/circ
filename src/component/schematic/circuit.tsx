import React, { useState, useRef } from 'react'
import { range } from '../../utils/common'
import { Vec2 } from '../../utils/vec2'
import { withMouseDown } from '../../utils/dom'
import { LinkData, BlockData, cleanupCircuit } from '../../utils/circuit'

function Link(props: {
    data: LinkData
    selected: boolean
    onMouseDownOnPin: (evt: React.MouseEvent, link: LinkData, atKey: 'from' | 'to') => void
    onMouseDownOnLink: (evt: React.MouseEvent, link: LinkData, idx: number) => void
}) {
    const { data: { id, from, to }, data, selected } = props,
        path = data.getPath(),
        edges = range(path.length - 1).map(idx => ({ idx, start: path[idx], end: path[idx + 1] }))
    return <>
        { edges.map(({ idx, start, end }) => <line key={ idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y }
            stroke={ selected ? 'blue' : from.block && to.block ? 'gray' : 'orange' } strokeWidth={ 2 } />) }
        { edges.map(({ idx, start, end }) => <line key={ 'l' + idx }
            x1={ start.x } y1={ start.y } x2={ end.x } y2={ end.y } className={ 'link-' + start.dir }
            onMouseDown={ evt => props.onMouseDownOnLink(evt, data, idx) }
            onMouseOver={ () => LinkData.hoverOn[id] = idx }
            onMouseOut={ () => delete LinkData.hoverOn[id] }
            stroke="transparent" strokeWidth={ 6 } />) }
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

function Block(props: {
    data: BlockData
    selected: boolean
    onMouseDownOnBlock: (evt: React.MouseEvent, block: BlockData) => void
}) {
    const { selected, data: { pos, rot, width, height, pins, type } } = props,
        color = selected ? 'blue' : type === 'joint' ? 'transparent' : 'gray'
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { pins.map(({ pos, end }, pin) => <line key={ 'b' + pin }
            x1={ pos.x } y1={ pos.y } x2={ end.x } y2={ end.y }
            stroke="gray" />) }
        { pins.map(({ pos }, pin) => <circle key={ 'c' + pin }
            cx={ pos.x } cy={ pos.y } r={ 5 }
            stroke="gray" fill="white" />) }
        <g transform={ `rotate(${rot / Math.PI * 180})` }>
            <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
                onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
                stroke={ color } fill="white" strokeWidth={ 2 } />
        </g>
    </g>
}

function BlockPins(props: {
    data: BlockData
    onMouseDownOnPin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
}) {
    const { id, pos, pins, type } = props.data
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { type !== 'joint' && pins.map(({ pos }, pin) => <circle key={ 'd' + pin } cx={ pos.x } cy={ pos.y } r={ 6 }
            onMouseDown={ evt => props.onMouseDownOnPin(evt, props.data, pin) }
            onMouseOver={ () => BlockData.hoverOn[id] = pin }
            onMouseOut={ () => delete BlockData.hoverOn[id] }
            fill="transparent" />) }
    </g>
}

export interface CircuitHandle {
    load(data: { blocks: any[], links: any[] }): void
    get(): { blocks: BlockData[], links: LinkData[] }
    bound(): DOMRect | null
}

export default function Circuit(props: {
    handle: React.MutableRefObject<CircuitHandle>
}) {
    const [blocks, setBlocks] = useState([] as BlockData[]),
        [links, setLinks] = useState([] as LinkData[]),
        [selected, setSelected] = useState({ } as { [id: string]: boolean }),
        [offset, setOffset] = useState(Vec2.from(0, 0)),
        [scale, setScale] = useState(1),
        svgRef = useRef(null as SVGSVGElement | null),
        svgBound = svgRef.current && svgRef.current.getBoundingClientRect(),
        svgBase = svgBound ? Vec2.from(svgBound.left, svgBound.top) : Vec2.from(0, 0)

    const blockMap = { } as { [id: string]: BlockData }
    for (const block of blocks) {
        blockMap[block.id] = block
    }
    const linkMap = { } as { [id: string]: LinkData }
    for (const link of links) {
        linkMap[link.id] = link
        link.updatePos(blockMap)
    }

    function posFromEvent(evt: { clientX: number, clientY: number }) {
        if (svgBound) {
            return Vec2.from(evt.clientX, evt.clientY).sub(svgBase).sub(offset).div(scale)
        } else {
            throw Error('unreferenced svg')
        }
    }
    function getHoverLink(pos: Vec2) {
        const entries = Object.entries(LinkData.hoverOn),
            [id, idx] = entries[entries.length - 1] || ['', -1],
            link = linkMap[id],
            path = link && link.getPath() || [],
            at = Vec2.from(pos)
        if (path[idx]) {
            const dir = path[idx].dir === 'x' ? 'y' : 'x'
            at[dir] = path[idx][dir]
        }
        return { link, idx, at }
    }

    function onMouseDownOnBlock(evt: React.MouseEvent, block: BlockData) {
        const start = posFromEvent(evt),
            base = new Vec2(block.pos)
        withMouseDown(evt => {
            const current = posFromEvent(evt),
                moving = block.copy({ pos: base.add(current).sub(start) })
            setBlocks(blocks.map(item => item.id === moving.id ? moving : item))
        }, evt => {
            if (posFromEvent(evt).sub(start).len() < 1) {
                const prev = evt.ctrlKey ? selected : { }
                setSelected({ ...prev, [block.id]: !selected[block.id] })
            }
        })
    }
    function onMouseDownOnBlockPin(evt: React.MouseEvent, block: BlockData, pin: number) {
        const created = new LinkData()
        Object.assign(created.from, { block: block.id, pin: pin, x: 0, y: 0 })
        const { pos, end } = block.pins[pin]
        created.dir = Math.abs(pos.sub(end).norm().x) > 0.5 ? 'x' : 'y'
        withMouseDown(evt => {
            const pos = posFromEvent(evt)
            Object.assign(created.to, getHoverLink(pos).at)
            const [block, pin] = Object.entries(BlockData.hoverOn)[0] || ['', -1]
            Object.assign(created.to, { block, pin })
            setLinks([created].concat(links))
        }, evt => {
            const pos = posFromEvent(evt),
                { at, link, idx } = getHoverLink(pos)
            if (link) {
                const [left, right] = link.split(at, idx),
                    joint = new BlockData()
                joint.type = 'joint'
                joint.pos = Vec2.from(left.to.x, left.to.y)
                const ret = { block: joint.id, pin: 0 }
                Object.assign(left.to, ret)
                Object.assign(right.from, ret)
                Object.assign(created.to, ret)
                left.id = link.id
                setBlocks(blocks.concat(joint))
                setLinks(links
                    .filter(item => item.id !== link.id && item.id != created.id)
                    .concat([left, right, created]))
            }
        })
    }
    function onMouseDownOnLink(evt: React.MouseEvent, link: LinkData, idx: number) {
        const path = link.getPath(),
            start = posFromEvent(evt)
        if (idx === 0) {
            const first = path[0]
            path.unshift({ dir: path[1].dir, x: first.x, y: first.y })
            idx += 1
        } else if (idx === path.length - 2) {
            const last = path[path.length - 1]
            path.push({ dir: path[idx].dir, x: last.x, y: last.y })
        }
        withMouseDown(evt => {
            const pos = posFromEvent(evt),
                { dir } = path[idx + 1]
            path[idx][dir] = pos[dir]
            path[idx + 1][dir] = pos[dir]
            const created = LinkData.fromPath(path, link.from, link.to)
            created.id = link.id
            setLinks(links.map(item => item.id === created.id ? created : item))
        }, evt => {
            if (posFromEvent(evt).sub(start).len() < 1) {
                const prev = evt.ctrlKey ? selected : { }
                setSelected({ ...prev, [link.id]: !selected[link.id] })
            }
        })
    }
    function onMouseDownOnLinkPin(evt: React.MouseEvent, link: LinkData, atKey: 'from' | 'to') {
        const at = link[atKey],
            block = at.block && blocks.find(block => block.id === at.block),
            pos = block && block.pins[at.pin]
        if (block && pos) {
            return onMouseDownOnBlockPin(evt, block, at.pin)
        }
        const created = link.copy()
        withMouseDown(evt => {
            const pos = posFromEvent(evt)
            Object.assign(created[atKey], getHoverLink(pos).at)
            const [block, pin] = Object.entries(BlockData.hoverOn)[0] || ['', -1]
            Object.assign(created[atKey], { block, pin })
            setLinks([created].concat(links.filter(item => item.id !== created.id)))
        }, evt => {
            const pos = posFromEvent(evt),
                { at, link, idx } = getHoverLink(pos)
            if (link) {
                const [left, right] = link.split(at, idx),
                    joint = new BlockData()
                joint.type = 'joint'
                joint.pos = Vec2.from(left.to.x, left.to.y)
                const ret = { block: joint.id, pin: 0 }
                Object.assign(left.to, ret)
                Object.assign(right.from, ret)
                Object.assign(created[atKey], ret)
                left.id = link.id
                setBlocks(blocks.concat(joint))
                setLinks(links
                    .filter(item => item.id !== link.id && item.id != created.id)
                    .concat([left, right, created]))
            }
        })
    }
    function onMouseDownOnBackground(evt: React.MouseEvent) {
        const start = posFromEvent(evt),
            base = Vec2.from(offset.x - evt.clientX, offset.y - evt.clientY)
        if (evt.button === 0) {
            withMouseDown(evt => {
            }, evt => {
                if (posFromEvent(evt).sub(start).len() < 1) {
                    setSelected({ })
                }
            })
        } else if (evt.button === 1) {
            withMouseDown(evt => {
                setOffset(Vec2.from(evt.clientX, evt.clientY).add(base))
            })
        }
    }
    function onMouseWheelOnBackground(evt: React.WheelEvent) {
        const base = posFromEvent(evt),
            newScale = scale * (1 + evt.deltaY * 2e-4),
            newOffset = base.mul(scale - newScale).add(offset)
        setScale(newScale)
        setOffset(newOffset)
    }
    function onKeyUp(evt: React.KeyboardEvent) {
        if (evt.which === 'R'.charCodeAt(0)) {
            setBlocks(blocks.map(block => selected[block.id] ? block.copy({ rot: block.rot + Math.PI / 2 }) : block))
        } else if (evt.which === '.'.charCodeAt(0)) {
            const ret = cleanupCircuit(
                blocks.filter(block => !selected[block.id]),
                links.filter(link => !selected[link.id]))
            setBlocks(ret.blocks)
            setLinks(ret.links)
        } else if (evt.which === ' '.charCodeAt(0)) {
            setOffset(Vec2.from(0, 0))
            setScale(1)
        }
    }

    props.handle.current = {
        load(data: { blocks: any[], links: any[] }) {
            const blocks = data.blocks.map(block => BlockData.fromJSON(block)),
                links = data.links.map(link => LinkData.fromJSON(link)),
                svg = svgRef.current
            if (svg) {
                const { width, height } = svg.getBoundingClientRect()
                for (const block of blocks) {
                    block.pos.x = Math.max(0, Math.min(block.pos.x, width))
                    block.pos.y = Math.max(0, Math.min(block.pos.y, height))
                }
            }
            setBlocks(blocks)
            setLinks(links)
        },
        get() {
            return { links, blocks }
        },
        bound() {
            return svgBound
        }
    }
    const { width, height } = svgRef.current ? svgRef.current.getBoundingClientRect() : { width: 0, height: 0 }
    return <svg ref={ svgRef } width="100%" height="100%" tabIndex={ -1 }
            onKeyUp={ onKeyUp }
            onWheel={ onMouseWheelOnBackground }>
        <g transform={ `translate(${offset.x} ${offset.y}) scale(${scale})` }>
            <rect width={ width } height={ height } fill="white"
                onMouseDown={ onMouseDownOnBackground } />
            { blocks.map(block => <Block key={ block.id } data={ block }
                selected={ selected[block.id] }
                onMouseDownOnBlock={ onMouseDownOnBlock } />) }
            { links.map(link => <Link key={ link.id } data={ link }
                selected={ selected[link.id] }
                onMouseDownOnPin={ onMouseDownOnLinkPin }
                onMouseDownOnLink={ onMouseDownOnLink } />) }
            { blocks.map(block => <BlockPins key={ 'p' + block.id } data={ block }
                onMouseDownOnPin={ onMouseDownOnBlockPin } />) }
        </g>
    </svg>
}
