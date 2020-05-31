import React, { useState } from 'react'

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
    return <>
        <Chart plots={ plots } range={ range } />
    </>
}
