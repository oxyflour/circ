import React, { useState, useRef } from 'react'
import { range } from '../../utils/common'
import { Vec2 } from '../../utils/vec2'
import { withMouseDown, inside, intersect } from '../../utils/dom'
import { LinkData, BlockData, cleanupCircuit } from '../../utils/circuit'

export interface CircuitHandle {
    load(data: { blocks: any[], links: any[] }): void
    beginAdd(data: Partial<BlockData>, cb: () => void): void
}

const hoverOnLink = { } as { [id: string]: number }
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
            onMouseOver={ () => hoverOnLink[id] = idx }
            onMouseOut={ () => delete hoverOnLink[id] }
            stroke="transparent" strokeWidth={ 6 } />) }
        <circle
            cx={ from.x } cy={ from.y } r={ 4 } className="link-pin"
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'from') }
            onMouseOver={ () => hoverOnLink[id] = 0 }
            onMouseOut={ () => delete hoverOnLink[id] }
            fill={ from.block ? 'gray' : 'orange' } stroke="none" />
        <circle
            cx={ to.x } cy={ to.y } r={ 4 } className="link-pin"
            onMouseDown={ evt => props.onMouseDownOnPin(evt, data, 'to') }
            onMouseOver={ () => hoverOnLink[id] = edges.length }
            onMouseOut={ () => delete hoverOnLink[id] }
            fill={ to.block ? 'gray' : 'orange' } stroke="none" />
    </>
}

function BlockAttr(props: {
    idx: number
    block: BlockData
    name: string
    val: any
}) {
    const { idx, block, name, val } = props
    if (name === 'name') {
        return <text x={ 0 } y={ block.height / 2 + 20 + idx * 20 } textAnchor="middle">{ val }</text>
    }
    return <>
    </>
}

const hoverOnBlock = { } as { [id: string]: number }
function Block(props: {
    data: BlockData
    selected: boolean
    onMouseDownOnBlock: (evt: React.MouseEvent, block: BlockData) => void
}) {
    const { selected, data, data: { pos, rot, width, height, pins, labels, type, attrs } } = props,
        color = selected ? 'blue' : 'gray'
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { pins.map(({ pos, end }, pin) => <line key={ 'b' + pin }
            x1={ pos.x } y1={ pos.y } x2={ end.x } y2={ end.y }
            stroke="gray" />) }
        { pins.map(({ pos }, pin) => <circle key={ 'c' + pin }
            cx={ pos.x } cy={ pos.y } r={ 5 }
            stroke="gray" fill="white" />) }
        <g transform={ `rotate(${rot / Math.PI * 180})` }>
            {
                type === 'gnd' ? <>
                    <line x1={ -25 } y1={  0 } x2={ 25 } y2={  0 } stroke={ color }></line>
                    <line x1={ -20 } y1={  5 } x2={ 20 } y2={  5 } stroke={ color }></line>
                    <line x1={ -15 } y1={ 10 } x2={ 15 } y2={ 10 } stroke={ color }></line>
                    <line x1={ -10 } y1={ 15 } x2={ 10 } y2={ 15 } stroke={ color }></line>
                    <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
                        onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
                        fill="transparent" />
                </> :
                type === 'joint' ?
                    <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
                        onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
                        fill="transparent" /> :
                    <rect x={ -width/2 } y={ -height/2 } width={ width } height={ height }
                        onMouseDown={ evt => props.onMouseDownOnBlock(evt, props.data) }
                        stroke={ color } fill="white" strokeWidth={ 2 } />
            }
        </g>
        {
            labels.map(({ pos, val }, idx) => <text key={ idx }
                x={ pos.x } y={ pos.y } textAnchor="middle" alignmentBaseline="central">{ val }</text>)
        }
        {
            Object.keys(attrs).filter(key => !key.startsWith('.')).map((key, idx) => <BlockAttr key={ key }
                idx={ idx } block={ data } name={ key } val={ attrs[key] } />)
        }
    </g>
}

function BlockPins(props: {
    data: BlockData
    onMouseDownOnPin: (evt: React.MouseEvent, block: BlockData, pin: number) => void
}) {
    const { id, pos, pins, type } = props.data
    return <g transform={ `translate(${pos.x}, ${pos.y})` }>
        { pins.map(({ pos }, pin) => <circle key={ 'd' + pin } className="block-pin"
            cx={ pos.x } cy={ pos.y } r={ 6 }
            onMouseDown={ evt => props.onMouseDownOnPin(evt, props.data, pin) }
            onMouseOver={ () => hoverOnBlock[id] = pin }
            onMouseOut={ () => delete hoverOnBlock[id] }
            fill="transparent" />) }
    </g>
}

export default function Circuit(props: {
    handle: React.MutableRefObject<CircuitHandle>
}) {
    const [blocks, setBlocks] = useState([] as BlockData[]),
        [links, setLinks] = useState([] as LinkData[]),
        [selected, setSelected] = useState({ } as { [id: string]: boolean }),
        [offset, setOffset] = useState(Vec2.from(0, 0)),
        [scale, setScale] = useState(1),
        [selectBox, setSelectBox] = useState({ left: 0, top: 0, right: 0, bottom: 0 }),
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
    function getHoverLink(pos: Vec2, exclude: string) {
        const [id, idx] = Object.entries(hoverOnLink).filter(([id]) => id !== exclude).pop() || ['', -1],
            link = linkMap[id],
            path = link && link.getPath() || [],
            at = Vec2.from(pos)
        if (idx === path.length - 1) {
            Object.assign(at, path[idx])
        } else if (path[idx]) {
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
        const created = new LinkData(),
            pt = posFromEvent(evt),
            { pos, end } = block.pins[pin]
        created.dir = Math.abs(pos.sub(end).norm().x) > 0.5 ? 'x' : 'y'
        Object.assign(created.from, { block: block.id, pin, ...pt })
        Object.assign(created.to, pt)
        onMouseDownOnLinkPin(evt, created, 'to')
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
        const created = link.copy()
        withMouseDown(evt => {
            const pos = posFromEvent(evt)
            Object.assign(created[atKey], getHoverLink(pos, created.id).at)
            const [block, pin] = Object.entries(hoverOnBlock).pop() || ['', -1]
            Object.assign(created[atKey], { block, pin })
            setLinks([created].concat(links.filter(item => item.id !== created.id)))
        }, evt => {
            const pos = posFromEvent(evt),
                { at, link, idx } = getHoverLink(pos, created.id)
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
                setBlocksAndLinks(
                    blocks.concat(joint),
                    links.filter(item => item.id !== link.id && item.id != created.id)
                        .concat([left, right, created])
                        .filter(item => (item.from.block && item.to.block) || (Vec2.from(item.from).sub(item.to).len() > 2)))
            }
        })
    }
    function onMouseDownOnBackground(evt: React.MouseEvent) {
        if (evt.button === 0) {
            function getBound(evt: MouseEvent) {
                const end = posFromEvent(evt),
                    [left, right] = [Math.min(start.x, end.x), Math.max(start.x, end.x)],
                    [top, bottom] = [Math.min(start.y, end.y), Math.max(start.y, end.y)]
                return { left, right, top, bottom }
            }
            const start = posFromEvent(evt)
            withMouseDown(evt => {
                setSelectBox(getBound(evt))
            }, evt => {
                if (posFromEvent(evt).sub(start).len() < 1) {
                    setSelected({ })
                } else {
                    const selectBox = getBound(evt),
                        selected = { } as { [id: string]: boolean }
                    for (const { width, height, pos, id } of blocks) {
                        // TODO: take care of rotated blocks
                        const [hw, hh] = [width / 2, height / 2],
                            bound = { left: pos.x - hw, right: pos.x + hw, top: pos.y - hh, bottom: pos.y + hh }
                        selected[id] = intersect(bound, selectBox)
                    }
                    for (const { id, from, to } of links) {
                        selected[id] = inside(from, selectBox) || inside(to, selectBox)
                    }
                    setSelected(selected)
                    setSelectBox({ left: 0, right: 0, top: 0, bottom: 0 })
                }
            })
        } else if (evt.button === 1) {
            const base = Vec2.from(offset.x - evt.clientX, offset.y - evt.clientY)
            withMouseDown(evt => {
                setOffset(Vec2.from(evt.clientX, evt.clientY).add(base))
            })
        }
    }
    function onMouseWheelOnBackground(evt: React.WheelEvent) {
        const base = posFromEvent(evt),
            newScale = scale * (1 + evt.deltaY * 5e-4),
            newOffset = base.mul(scale - newScale).add(offset)
        setScale(newScale)
        setOffset(newOffset)
    }
    function onKeyUp(evt: React.KeyboardEvent) {
        if (evt.which === 'R'.charCodeAt(0)) {
            setBlocks(blocks.map(block => selected[block.id] ? block.copy({ rot: block.rot + Math.PI / 2 }) : block))
        } else if (evt.which === '.'.charCodeAt(0)) {
            setBlocksAndLinks(
                blocks.filter(block => !selected[block.id]),
                links.filter(link => !selected[link.id]))
        } else if (evt.which === ' '.charCodeAt(0)) {
            setOffset(Vec2.from(0, 0))
            setScale(1)
        }
    }

    function setBlocksAndLinks(blocks: BlockData[], links: LinkData[]) {
        const ret = cleanupCircuit(blocks, links)
        setBlocks(ret.blocks)
        setLinks(ret.links)
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
            setBlocksAndLinks(blocks, links)
        },
        beginAdd(data: Partial<BlockData>, cb: () => void) {
            const bound = svgBound || document.body.getBoundingClientRect(),
                created = new BlockData()
            Object.assign(created, data)
            withMouseDown(evt => {
                created.pos = posFromEvent(evt)
                setBlocks(inside({ x: evt.clientX, y: evt.clientY }, bound) ? blocks.concat(created) : blocks)
            }, evt => {
                cb()
            })
        },
    }
    const { width, height } = svgRef.current ? svgRef.current.getBoundingClientRect() : { width: 0, height: 0 }
    return <svg ref={ svgRef } width="100%" height="100%" tabIndex={ -1 }
            onKeyUp={ onKeyUp }
            onWheel={ onMouseWheelOnBackground }>
        <g transform={ `translate(${offset.x} ${offset.y}) scale(${scale})` }>
            <rect className="circuit-bg" width={ width } height={ height } fill="white"
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
            {
                selectBox.left < selectBox.right && selectBox.top < selectBox.bottom &&
                <rect x={ selectBox.left } y={ selectBox.top }
                    width={ selectBox.right - selectBox.left } height={ selectBox.bottom - selectBox.top }
                    stroke="blue" fill="rgba(100, 100, 200, 0.5)" />
            }
        </g>
    </svg>
}
