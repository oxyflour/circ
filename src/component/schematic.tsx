import React, { useRef, useState, useEffect } from 'react'

import Layout from 'antd/es/layout'
import Button from 'antd/es/button'

import { debounce } from '../utils/common'
import Circuit, { CircuitHandle } from './schematic/circuit'
import { withMouseDown, useAsyncEffect } from '../utils/dom'
import rpc from '../utils/rpc'

function BlockDevice(props: {
    type: string
    children: JSX.Element | string
    circuit: React.MutableRefObject<CircuitHandle>
}) {
    const [disabled, setDisabled] = useState(false)
    function onMouseDown(evt: React.MouseEvent) {
        setDisabled(true)
        props.circuit.current.beginAdd({ type: props.type }, () => setDisabled(false))
    }
    return <Button style={{ margin: 10 }} disabled={ disabled }
        onMouseDown={ onMouseDown }>{ props.children }</Button>
}

const saveSiderWidth = debounce((val: number) => localStorage.setItem('saved-sider-width', val + ''), 100)
export default function Schematic(props: {
    file: string
}) {
    const circuit = useRef({ } as CircuitHandle),
        { file } = props,
        [siderWidth, setSiderWidth] = useState(parseInt(localStorage.getItem('saved-sider-width') || '250'))
    useAsyncEffect(async () => {
        const { blocks, links } = await rpc.netlist.get(file)
        circuit.current.load({ blocks, links })
    }, [file])
    useEffect(() => {
        saveSiderWidth(siderWidth)
    }, [siderWidth])

    function onMouseDownOnYSplitter(evt: React.MouseEvent) {
        const start = siderWidth - evt.clientX
        withMouseDown(evt => setSiderWidth(evt.clientX + start))
    }
    return <Layout className="schematic" style={{ height: '100%' }}>
        <Layout.Header className="header">
        </Layout.Header>
        <Layout.Content>
            <Layout style={{ height: '100%' }}>
                <Layout.Sider className="sider" width={ siderWidth }>
                    <div className="content">
                        <BlockDevice type=".s2p" circuit={ circuit }>s2p</BlockDevice>
                        <BlockDevice type="gnd" circuit={ circuit }>gnd</BlockDevice>
                        <BlockDevice type="lc" circuit={ circuit }>lc</BlockDevice>
                    </div>
                    <div className="y-splitter" onMouseDown={ onMouseDownOnYSplitter }></div>
                </Layout.Sider>
                <Layout.Content>
                    <Circuit handle={ circuit } />
                </Layout.Content>
            </Layout>
        </Layout.Content>
    </Layout>
}
