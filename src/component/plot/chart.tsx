import React, { useEffect, useRef, useState } from 'react'
import { lerp, interp1 } from '../../utils/common'
import { withMouseDown } from '../../utils/dom'
import { Vec2 } from '../../utils/vec2'

export interface Mark {
    x: number
    y: number
    a: number
}

export interface PlotData {
    x: number[]
    y: number[]
    c?: string
    i?: number
    j?: number
    xtitle?: string
    ytitle?: string
    marks?: Mark[]
}

export interface PlotRange {
    xmin: number
    ymin: number
    xmax: number
    ymax: number
}

export interface PlotProps {
    plots: PlotData[]
    range: PlotRange
    onRangeChange: (range: PlotRange) => void
    onPlotsChange: (idx: number, plot: PlotData) => void
}

function binSearch(arr: number[], val: number) {
    let i = 0, j = arr.length - 1
    while (i <= j) {
        const n = (i + j) >> 1
        if (val === arr[n]) {
            return n
        } else if (val > arr[n]) {
            i = n + 1
        } else {
            j = n - 1
        }
    }
    return i - 1
}

function interp(xs: number[], ys: number[], x: number) {
    const i = binSearch(xs, x)
    if (i < 0) {
        return xs[0]
    } else if (i < xs.length - 1) {
        return interp1(xs[i], ys[i], xs[i + 1], ys[i + 1], x)
    } else {
        return xs[xs.length - 1]
    }
}

function getTicks(min: number, max: number, y0: number, y1: number) {
    const step = logFloor((max - min) / 2),
        [vmin, vmax] = [floorDiv(min, step), ceilDiv(max, step)],
        ticks = [] as { val: number, pos: number }[]
    for (let val = vmin; val <= vmax; val += step) {
        const pos = interp1(min, y0, max, y1, val)
        ticks.push({ val, pos })
    }
    return ticks
}

export function YAxis({ x, y, length, min, max }: {
    x: number
    y: number
    length: number
    min: number
    max: number
}) {
    const ticks = getTicks(min, max, y, y - length)
    return <g>
        <line x1={ x } y1={ y } x2={ x } y2={ y - length } stroke="gray" />
        {
            ticks.map(({ val, pos }) => <line key={ 'l' + val } stroke="gray"
                x1={ x - 5 } y1={ pos } x2={ x } y2={ pos } />)
        }
        {
            ticks.map(({ val, pos }) => <text key={ 't' + val }
                x={ x - 35 } y={ pos + 5 }>{ val.toFixed(2) }</text>)
        }
    </g>
}

export function XAxis({ x, y, length, min, max }: {
    x: number
    y: number
    length: number
    min: number
    max: number
}) {
    const ticks = getTicks(min, max, x, x + length)
    return <g>
        <line x1={ x } y1={ y } x2={ x + length } y2={ y } stroke="gray" />
        {
            ticks.map(({ val, pos }) => <line key={ 'l' + val } stroke="gray"
                x1={ pos } y1={ y } x2={ pos } y2={ y + 5 } />)
        }
        {
            ticks.map(({ val, pos }) => <text key={ 't' + val }
                x={ pos } y={ y + 20 }>{ val.toFixed(2) }</text>)
        }
    </g>
}

function logFloor(x: number, base = 10) {
    return base ** Math.floor(Math.log(x) * Math.LOG10E)
}

function floorDiv(a: number, b: number) {
    return Math.floor(a / b) * b
}

function ceilDiv(a: number, b: number) {
    return Math.ceil(a / b) * b
}

function getRange(plots: PlotData[]) {
    const range = { xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity }
    for (const { x, y } of plots) {
        range.xmin = Math.min(range.xmin, x[0])
        range.xmax = Math.max(range.xmax, x[x.length - 1])
        for (const v of y) {
            range.ymin = Math.min(range.ymin, v)
            range.ymax = Math.max(range.ymax, v)
        }
    }
    if (!plots.length) {
        range.xmin = 0
        range.xmax = 1
        range.ymin = 0
        range.ymax = 1
    }
    const xstep = logFloor(range.xmax - range.xmin),
        ystep = logFloor(range.ymax - range.ymin)
    range.xmin = Math.floor(range.xmin / xstep) * xstep
    range.ymin = Math.floor(range.ymin / ystep) * ystep
    range.xmax = Math.ceil(range.xmax / xstep) * xstep
    range.ymax = Math.ceil(range.ymax / ystep) * ystep
    return range
}

export default function Chart(props: PlotProps) {
    const svgRef = useRef(null as SVGSVGElement | null),
        svgBound = svgRef.current && svgRef.current.getBoundingClientRect(),
        svgBase = svgBound ? Vec2.from(svgBound.left, svgBound.top) : Vec2.from(0, 0),
        [size, setSize] = useState({ width: 0, height: 0 }),
        [data, setData] = useState({ range: { xmin: 0, xmax: 1, ymin: 0, ymax: 1 }, plots: [] as PlotData[] }),
        [selectBox, setSelectBox] = useState({ left: 0, top: 0, right: 0, bottom: 0 }),
        { range, plots } = data
    useEffect(() => {
        const plots = props.plots.slice().map(plot => ({ ...plot })),
            { xmin, ymin, xmax, ymax } = props.range,
            range = xmin < xmax && ymin < ymax ? props.range : getRange(plots)
        for (const plot of plots) {
            plot.i = binSearch(plot.x, range.xmin)
            plot.j = binSearch(plot.x, range.xmax) + 2
        }
        setData({ range, plots })
    }, [props.plots, props.range])
    useEffect(() => {
        if (svgRef.current) {
            setSize({ width: svgRef.current.scrollWidth, height: svgRef.current.scrollHeight })
        }
    }, [svgRef.current])

    const padding = Math.min(50, size.width * 0.1),
        region = { xmin: padding, xmax: size.width - padding, ymin: padding, ymax: size.height - padding }
    function regionX(rangeX: number) {
        return interp1(range.xmin, region.xmin, range.xmax, region.xmax, rangeX)
    }
    function regionY(rangeY: number) {
        // y axis is flipped
        return interp1(range.ymin, region.ymax, range.ymax, region.ymin, rangeY)
    }
    function pathData(x: number[], y: number[]) {
        return x.map((x, i) => (i === 0 ? 'M' : 'L') + regionX(x) + ' ' + regionY(y[i])).join(' ')
    }
    function rangeX(regionX: number) {
        return interp1(region.xmin, range.xmin, region.xmax, range.xmax, regionX)
    }
    function rangeY(regionY: number) {
        // y axis is flipped
        return interp1(region.ymin, range.ymax, region.ymax, range.ymin, regionY)
    }

    function posFromEvent(evt: { clientX: number, clientY: number }) {
        if (svgBound) {
            return Vec2.from(evt.clientX, evt.clientY).sub(svgBase)
        } else {
            throw Error('unreferenced svg')
        }
    }

    function OnMouseDownOnBackground(evt: React.MouseEvent) {
        const start = posFromEvent(evt)
        function getBound(evt: MouseEvent) {
            const current = posFromEvent(evt)
            return {
                left: Math.min(start.x, current.x),
                right: Math.max(start.x, current.x),
                top: Math.min(start.y, current.y),
                bottom: Math.max(start.y, current.y),
            }
        }
        if (evt.button === 0) {
            withMouseDown(evt => {
                setSelectBox(getBound(evt))
            }, evt => {
                const selectBox = getBound(evt)
                if (selectBox.right - selectBox.left > 2 && selectBox.bottom - selectBox.top > 2 && svgBound) {
                    const clip = {
                        xmin: rangeX(selectBox.left), xmax: rangeX(selectBox.right),
                        ymin: rangeY(selectBox.bottom), ymax: rangeY(selectBox.top)
                    }
                    props.onRangeChange(clip)
                }
                setSelectBox({ left: 0, top: 0, right: 0, bottom: 0 })
            })
        } else if (evt.button === 1) {
            const { xmin, xmax, ymin, ymax } = range
            withMouseDown(evt => {
                const current = posFromEvent(evt),
                    deltaX = (range.xmax - range.xmin) / (region.xmax - region.xmin),
                    deltaY = (range.ymax - range.ymin) / (region.ymax - region.ymin)
                props.onRangeChange({
                    xmin: xmin - (current.x - start.x) * deltaX,
                    xmax: xmax - (current.x - start.x) * deltaX,
                    ymin: ymin + (current.y - start.y) * deltaY,
                    ymax: ymax + (current.y - start.y) * deltaY,
                })
            })
        }
    }
    function onMouseWheelOnBackground(evt: React.WheelEvent) {
        const base = posFromEvent(evt),
            deltaX = evt.deltaY * 5e-4 * (range.xmax - range.xmin) / (region.xmax - region.xmin),
            deltaY = evt.deltaY * 5e-4 * (range.ymax - range.ymin) / (region.ymax - region.ymin),
            clip = {
                xmin: range.xmin + (base.x - region.xmin) * deltaX,
                xmax: range.xmax - (region.xmax - base.x) * deltaX,
                ymin: range.ymin + (region.ymax - base.y) * deltaY,
                ymax: range.ymax - (base.y - region.ymin) * deltaY,
            }
        props.onRangeChange(clip)
    }
    function onDoubleClickOnPlot(evt: React.MouseEvent, idx: number) {
        const { marks = [] } = plots[idx],
            base = posFromEvent(evt),
            x = rangeX(base.x)
        if (!marks.find(mark => Math.abs(x - mark.x) < 1e-9)) {
            props.onPlotsChange(idx, { ...plots[idx], marks: marks.concat({ x, y: 0, a: Math.PI * 0.25 }) })
        }
    }
    function onMouseDownOnMark(evt: React.MouseEvent, idx: number, mark: number) {
        const plot = plots[idx],
            oldMarks = plot.marks || [],
            { x, a } = oldMarks[mark],
            pivot = Vec2.from(regionX(x), 0),
            start = posFromEvent(evt)
        withMouseDown(evt => {
            const current = posFromEvent(evt).add(pivot).sub(start),
                x = rangeX(current.x),
                marks = oldMarks.map((item, idx) => idx === mark ? { x, a, y: 0 } : item)
            props.onPlotsChange(idx, { ...plot, marks })
        })
    }
    function onMouseDownOnMarkTip(evt: React.MouseEvent, idx: number, mark: number) {
        const plot = plots[idx],
            ms = plot.marks || [],
            { x, a } = ms[mark],
            y = interp(plot.x, plot.y, x),
            pivot = Vec2.from(regionX(x), regionY(y)),
            a0 = posFromEvent(evt).sub(pivot).angle()
        withMouseDown(evt => {
            const a1 = posFromEvent(evt).sub(pivot).angle(),
                marks = ms.map((item, idx) => idx === mark ? { x, y: 0, a: a + a1 - a0 } : item)
            props.onPlotsChange(idx, { ...plot, marks })
        })
    }

    const plotSlice = plots.map(({ x: nx, y: ny, i, j, c, marks: ms }) => {
        const x = nx.slice(Math.max(i || 0, 0), j),
            y = ny.slice(Math.max(i || 0, 0), j),
            marks = (ms || []).map(({ x, a }) => ({ x, a, y: interp(nx, ny, x) })),
            path = pathData(x, y)
        return { x, y, c, marks, path }
    })
    return <svg ref={ svgRef } style={{ width: '100%', height: '100%' }} onWheel={ onMouseWheelOnBackground }>
        <rect className="no-select" x={ 0 } y={ 0 } width={ size.width } height={ size.height }
            fill="#eee" onMouseDown={ OnMouseDownOnBackground } />
        {
            plotSlice.map(({ x, y, marks, path, c = 'gray' }, idx) => <g key={ idx }>
                {
                    x.length < 30 && x.map((x, i) =>
                        <circle key={ i } cx={ regionX(x) } cy={ regionY(y[i]) } r={ 5 } fill={ c }>
                            <title>{ x + ', ' + y[i] }</title>
                        </circle>)
                }
                <path d={ path } fill="none" stroke={ c } strokeWidth={ 2 } />
                <path d={ path } fill="none" stroke="transparent" strokeWidth={ 5 }
                    onDoubleClick={ evt => onDoubleClickOnPlot(evt, idx) } />
                {
                    marks && marks.map(({ x, y, a }, i) => <g key={ i }
                        transform={ `translate(${regionX(x)}, ${regionY(y)}) rotate(${a / Math.PI * 180})` }>
                        <circle key={ 'm' + i } cx={ 0 } cy={ 0 } r={ 4 }
                            fill="transparent" stroke={ c }
                            onMouseDown={ evt => onMouseDownOnMark(evt, idx, i) }>
                            <title>{ x + ', ' + y }</title>
                        </circle>
                        <polygon points="0 5 -10 30 10 30" fill={ c }
                            onMouseDown={ evt => onMouseDownOnMarkTip(evt, idx, i) } />
                    </g>)
                }
            </g>)
        }
        <YAxis x={ padding } y={ size.height - padding }
            length={ size.height - padding * 2 } min={ range.ymin } max={ range.ymax } />
        <XAxis x={ padding } y={ size.height - padding }
            length={ size.width - padding * 2 } min={ range.xmin } max={ range.xmax } />
        {
            selectBox.left < selectBox.right && selectBox.top < selectBox.bottom &&
            <rect x={ selectBox.left } y={ selectBox.top }
                width={ selectBox.right - selectBox.left } height={ selectBox.bottom - selectBox.top }
                stroke="blue" fill="rgba(100, 100, 200, 0.5)" />
        }
    </svg>
}
