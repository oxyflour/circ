import React, { useState, useEffect } from 'react'

import Chart, { PlotData } from './plot/chart'
import rpc from '../utils/rpc'
import { useAsyncEffect } from '../utils/dom'

export default function Plot(props: {
    files: string[]
}) {
    const { files } = props,
        [range, setRange] = useState({ xmin: 0, ymin: 0, xmax: 0, ymax: 0 }),
        [plots, setPlots] = useState([] as PlotData[])
    useAsyncEffect(async () => {
        setPlots(await Promise.all(files.map(file => rpc.plot.get(file))))
    }, [files])
    useEffect(() => {
        function onKeyUp(evt: KeyboardEvent) {
            if (evt.which === ' '.charCodeAt(0)) {
                setRange({ xmin: 0, ymin: 0, xmax: 0, ymax: 0 })
            }
        }
        document.body.addEventListener('keyup', onKeyUp)
        return () => document.body.removeEventListener('keyup', onKeyUp)
    }, [])
    return <>
        <Chart plots={ plots } range={ range } onRangeChange={ range => setRange(range) } />
    </>
}
