import React, { useEffect, useRef, useState } from 'react'

import confirm from 'antd/es/modal/confirm'
import Form from 'antd/es/form'
import Input from 'antd/es/input'

import { interp1, binSearch, interp, findMinIndex, uid } from '../../utils/common'
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
    d?: string
    w?: number
    n?: string
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

// https://matplotlib.org/3.2.1/users/dflt_style_changes.html
const plotColors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf',
]

function getTicks(min: number, max: number, y0: number, y1: number) {
    const step = logFloor((max - min) / 2),
        [vmin, vmax] = [floorDiv(min, step), ceilDiv(max, step)],
        ticks = [] as { val: number, pos: number }[]
    for (let val = vmin; val <= vmax; val += step) {
        if (min <= val && val <= max) {
            const pos = interp1(min, y0, max, y1, val)
            ticks.push({ val, pos })
        }
    }
    return ticks
}

export function YAxis({ x, y, width, height, min, max, onClickOnTick }: {
    x: number
    y: number
    width: number
    height: number
    min: number
    max: number
    onClickOnTick(): void
}) {
    const ticks = getTicks(min, max, y, y - height)
    return <g>
        <line x1={ x } y1={ y } x2={ x } y2={ y - height } stroke="gray" />
        {
            ticks.map(({ val, pos }) => <line key={ 'l' + val } stroke="gray"
                x1={ x - 5 } y1={ pos } x2={ x } y2={ pos } />)
        }
        {
            ticks.map(({ val, pos }) => <line key={ 'g' + val } stroke="gray" strokeDasharray="2"
                x1={ x } y1={ pos } x2={ x + width } y2={ pos } />)
        }
        {
            ticks.map(({ val, pos }) => <text key={ 't' + val } className="axis-label x"
                onClick={ onClickOnTick }
                x={ x - 35 } y={ pos + 5 }>{ val.toFixed(2) }</text>)
        }
        <line x1={ x + width } y1={ y } x2={ x + width } y2={ y - height } stroke="gray" />
    </g>
}

export function XAxis({ x, y, width, height, min, max, onClickOnTick }: {
    x: number
    y: number
    width: number
    height: number
    min: number
    max: number
    onClickOnTick(): void
}) {
    const ticks = getTicks(min, max, x, x + width)
    return <g>
        <line x1={ x } y1={ y } x2={ x + width } y2={ y } stroke="gray" />
        {
            ticks.map(({ val, pos }) => <line key={ 'l' + val } stroke="gray"
                x1={ pos } y1={ y } x2={ pos } y2={ y + 5 } />)
        }
        {
            ticks.map(({ val, pos }) => <line key={ 'g' + val } stroke="gray" strokeDasharray="2"
                x1={ pos } y1={ y } x2={ pos } y2={ y - height } />)
        }
        {
            ticks.map(({ val, pos }) => <text key={ 't' + val } className="axis-label x"
                onClick={ onClickOnTick }
                x={ pos } y={ y + 20 }>{ val.toFixed(2) }</text>)
        }
        <line x1={ x } y1={ y - height } x2={ x + width } y2={ y - height } stroke="gray" />
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
    }, [svgRef.current && svgRef.current.scrollWidth, svgRef.current && svgRef.current.scrollHeight])

    const padding = Math.min(50, size.width * 0.1),
        region = { xmin: padding, xmax: size.width - padding, ymin: padding, ymax: size.height - padding },
        [legendPos, setLegendPos] = useState({ x: 20, y: 20 }),
        [markPos, setMarkPos] = useState({ x: 20, y: 20 })
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
            return Vec2.from(evt.clientX - svgBase.x, evt.clientY - svgBase.y)
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
            props.onPlotsChange(idx, { ...plots[idx], marks: marks.concat({ x, y: 0, a: 0 }) })
        }
    }
    function onMouseDownOnMark(evt: React.MouseEvent, idx: number, mark: number) {
        const plot = plots[idx],
            plotMarks = plot.marks || [],
            { a } = plotMarks[mark]
        withMouseDown(evt => {
            const current = posFromEvent(evt),
                arr = plot.x.map((x, i) => ({ x: regionX(x), y: regionY(plot.y[i]) })),
                pts = arr.slice(0, -1).map((pt, i) => current.nearestFrom(pt, arr[i + 1])),
                pos = pts[findMinIndex(pts.map(pos => current.sub(pos).len()))],
                [x, y] = [rangeX(pos.x), rangeY(pos.y)],
                marks = plotMarks.map((item, idx) => idx === mark ? { x, y, a } : item)
            props.onPlotsChange(idx, { ...plot, marks })
        })
    }
    function onMouseDownOnMarkTip(evt: React.MouseEvent, idx: number, mark: number) {
        const plot = plots[idx],
            plotMarks = plot.marks || [],
            { x, a } = plotMarks[mark],
            y = interp(plot.x, plot.y, x),
            pivot = Vec2.from(regionX(x), regionY(y)),
            a0 = posFromEvent(evt).sub(pivot).angle()
        withMouseDown(evt => {
            const a1 = posFromEvent(evt).sub(pivot).angle(),
                marks = plotMarks.map((item, idx) => idx === mark ? { x, y: 0, a: a + a1 - a0 } : item)
            props.onPlotsChange(idx, { ...plot, marks })
        })
    }
    function onMouseDownOnLegends(evt: React.MouseEvent) {
        const base = Vec2.from(legendPos).sub(posFromEvent(evt))
        withMouseDown(evt => setLegendPos(posFromEvent(evt).add(base)))
    }
    function onMouseDownOnMarks(evt: React.MouseEvent) {
        const base = Vec2.from(markPos).sub(posFromEvent(evt))
        withMouseDown(evt => setMarkPos(posFromEvent(evt).add(base)))
    }
    function onClickOnMarkText(idx: number, i: number, x: number) {
        const id = uid()
        confirm({
            title: 'Update Mark Position',
            content: <>
                <div><Input id={ id } defaultValue={ x } placeholder="remove this mark" /></div>
                <p>empty string would clear this mark</p>
            </>,
            onOk() {
                const input = document.getElementById(id) as HTMLInputElement,
                    plot = plots[idx],
                    plotMarks = plot.marks || [],
                    marks = input.value ?
                        plotMarks.map((item, idx) => idx === i ? { ...item, x: parseFloat(input.value) } : item) :
                        plotMarks.filter((_, idx) => idx !== i)
                props.onPlotsChange(idx, { ...plot, marks })
            },
        })
    }
    const input = (id: string) => document.getElementById(id) as HTMLInputElement
    function onClickOnPlotLegend(idx: number) {
        const id = uid(),
            data = plotSlice[idx]
        confirm({
            title: `Update ${data.n}`,
            content: <Form labelCol={{ span: 8 }} wrapperCol={{ span: 8 }}>
                <Form.Item label="name"><Input id={ 'name-' + id } defaultValue={ data.n } /></Form.Item>
                <Form.Item label="color"><Input id={ 'color-' + id } defaultValue={ data.c } /></Form.Item>
                <Form.Item label="line width"><Input id={ 'line-' + id } defaultValue={ data.w } /></Form.Item>
                <Form.Item label="dash"><Input id={ 'dash-' + id } defaultValue={ data.d } placeholder="no dash" /></Form.Item>
            </Form>,
            onOk() {
                const n = input('name-' + id).value,
                    c = input('color-' + id).value,
                    w = parseFloat(input('line-' + id).value),
                    d = input('dash-' + id).value
                props.onPlotsChange(idx, { ...plots[idx], n, c, w, d })
            }
        })
    }
    function onClickOnTick() {
        const id = uid()
        confirm({
            title: `Update Range`,
            content: <Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
                <Form.Item label="X Range">
                    <Input.Group compact>
                        <Input style={{ width: '40%' }} id={ 'xmin-' + id } defaultValue={ range.xmin } />
                        <Input style={{ width: '20%', background: 'white' }} placeholder="~" disabled />
                        <Input style={{ width: '40%' }} id={ 'xmax-' + id } defaultValue={ range.xmax } />
                    </Input.Group>
                </Form.Item>
                <Form.Item label="Y Range">
                    <Input.Group compact>
                        <Input style={{ width: '40%' }} id={ 'ymin-' + id } defaultValue={ range.ymin } />
                        <Input style={{ width: '20%', background: 'white' }} placeholder="~" disabled />
                        <Input style={{ width: '40%' }} id={ 'ymax-' + id } defaultValue={ range.ymax } />
                    </Input.Group>
                </Form.Item>
            </Form>,
            onOk() {
                const xmin = parseFloat(input('xmin-' + id).value),
                    xmax = parseFloat(input('xmax-' + id).value),
                    ymin = parseFloat(input('ymin-' + id).value),
                    ymax = parseFloat(input('ymax-' + id).value)
                if (xmin < xmax && ymin < ymax) {
                    props.onRangeChange({ xmin, xmax, ymin, ymax })
                }
            }
        })
    }

    let usedColors = 0
    const plotMarks = [] as { c: string, n: string, p: number, i: number, x: number }[]
    const plotSlice = plots.map(({ i, j, w: width, c: color, n: name, d: dash, x: xs, y: ys, marks: ms }, idx) => {
        const x = xs.slice(Math.max(i || 0, 0), j),
            y = ys.slice(Math.max(i || 0, 0), j),
            c = color || plotColors[usedColors = (usedColors + 1) % plotColors.length],
            w = width || 1,
            n = name || 'plot ' + (idx + 1),
            d = dash,
            marks = (ms || []).map(({ x, a }) => ({ x, a, y: interp(xs, ys, x) })),
            path = pathData(x, y)
        for (const [i, { x, y }] of marks.entries()) {
            const n = `${i + 1} (${x.toFixed(4)}, ${y.toFixed(4)})`
            plotMarks.push({ c, n, i, x, p: idx })
        }
        return { x, y, c, w, n, d, marks, path }
    })

    const clipPathId = uid()
    return <svg ref={ svgRef } style={{ width: '100%', height: '100%' }} onWheel={ onMouseWheelOnBackground }>
        <rect className="no-select" x={ 0 } y={ 0 } width={ size.width } height={ size.height }
            fill="#eee" onMouseDown={ OnMouseDownOnBackground } />
        <clipPath id={ clipPathId }>
            <rect x={ region.xmin } width={ region.xmax - region.xmin }
                y={ region.ymin } height={ region.ymax - region.ymin } />
        </clipPath>
        <g clipPath={ `url(#${clipPathId})` }>
        {
            plotSlice.map(({ x, y, path, c, w, d }, idx) => <g key={ idx }>
                {
                    x.length < 30 && x.map((x, i) =>
                        <circle key={ i } cx={ regionX(x) } cy={ regionY(y[i]) } r={ 5 } fill={ c }>
                            <title>{ x + ', ' + y[i] }</title>
                        </circle>)
                }
                <path d={ path } fill="none" stroke={ c } strokeWidth={ w } strokeDasharray={ d } />
                <path d={ path } fill="none" stroke="transparent" className="chart-plot" strokeWidth={ 5 }
                    onDoubleClick={ evt => onDoubleClickOnPlot(evt, idx) } />
            </g>)
        }
        </g>
        {
            plotSlice.map(({ marks, c }, idx) => <g key={ idx }>
                {
                    marks && marks.map(({ x, y, a }, i) => <g key={ i }
                        transform={ `translate(${regionX(x)}, ${regionY(y)}) rotate(${a / Math.PI * 180})` }>
                        <circle className="mark-cursor" key={ 'm' + i } cx={ 0 } cy={ 0 } r={ 4 }
                            fill="transparent" stroke={ c }
                            onClick={ evt => onClickOnMarkText(idx, i, x) }
                            onMouseDown={ evt => onMouseDownOnMark(evt, idx, i) }>
                            <title>{ x + ', ' + y }</title>
                        </circle>
                        <text className="no-select" textAnchor="middle" x={ 0 } y={ 30 } fill={ c }>{ i + 1 }</text>
                        <polyline className="no-select" points="0 5 -12 40 12 40 0 5"
                            fill="transparent" stroke={ c } strokeWidth={ 2 }
                            onMouseDown={ evt => onMouseDownOnMarkTip(evt, idx, i) } />
                    </g>)
                }
            </g>)
        }
        <YAxis x={ padding } y={ size.height - padding }
            width={ size.width - padding * 2 } height={ size.height - padding * 2 }
            min={ range.ymin } max={ range.ymax } onClickOnTick={ onClickOnTick } />
        <XAxis x={ padding } y={ size.height - padding }
            width={ size.width - padding * 2 } height={ size.height - padding * 2 }
            min={ range.xmin } max={ range.xmax } onClickOnTick={ onClickOnTick } />
        <g className="legend" transform={ `translate(${legendPos.x + padding}, ${legendPos.y + padding})` }>
            <rect x={ 0 } y={ 0 } width={ 100 } height={ plotSlice.length * 30 }
                stroke="gray" fill="white" className="no-select"
                onMouseDown={ onMouseDownOnLegends } />
            {
                plotSlice.map(({ n }, idx) => <text className="plot-legend" key={ idx }
                    onClick={ () => onClickOnPlotLegend(idx) }
                    x={ 50 } y={ idx * 30 + 15 } alignmentBaseline="central">{ n }</text>)
            }
            {
                plotSlice.map(({ c, w }, idx) => <line key={ 'l' + idx } stroke={ c } strokeWidth={ w }
                    x1={ 10 } y1={ idx * 30 + 15 } x2={ 40 } y2={ idx * 30 + 15 } />)
            }
        </g>
        {
            plotMarks.length > 0 && <g className="marks"
                transform={ `translate(${markPos.x + region.xmax - padding - 150}, ${markPos.y + padding})` }>
                <rect x={ 0 } y={ 0 } width={ 150 } height={ plotMarks.length * 30 }
                    stroke="gray" fill="white" className="no-select"
                    onMouseDown={ onMouseDownOnMarks } />
                {
                    plotMarks.map(({ n, c, i, p, x }, idx) => <text className="mark-label" key={ idx } fill={ c }
                        onClick={ () => onClickOnMarkText(p, i, x) }
                        x={ 10 } y={ idx * 30 + 15 } alignmentBaseline="central">{ n }</text>)
                }
            </g>
        }
        {
            selectBox.left < selectBox.right && selectBox.top < selectBox.bottom &&
            <rect x={ selectBox.left } y={ selectBox.top }
                width={ selectBox.right - selectBox.left } height={ selectBox.bottom - selectBox.top }
                stroke="blue" fill="rgba(100, 100, 200, 0.5)" />
        }
    </svg>
}
