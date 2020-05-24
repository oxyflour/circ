import React, { useRef, useState, useEffect } from 'react'

import Layout from 'antd/es/layout'

import { debounce } from '../utils/common'
import Circuit, { CircuitHandle } from './schematic/circuit'
import { withMouseDown, useAsyncEffect } from '../utils/dom'
import rpc from '../utils/rpc'

function BlockDevice(props: {
    children: JSX.Element | string
}) {
    function onMouseDown(evt: React.MouseEvent) {
        withMouseDown(evt => {
        })
    }
    return <div style={{ margin: 10, display: 'inline-block', width: 64, height: 64 }}
        onMouseDown={ onMouseDown }>{ props.children }</div>
}

const saveSiderWidth = debounce((val: number) => localStorage.setItem('saved-sider-width', val + ''), 100)
export default function Schematic(props: {
    file: string
}) {
    const circuit = useRef({ } as CircuitHandle),
        { file } = props,
        [siderWidth, setSiderWidth] = useState(parseInt(localStorage.getItem('saved-sider-width') || '250'))
    useAsyncEffect(async () => {
        const { blocks, links } = await rpc.schematic.get(file)
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
                        <BlockDevice>s2p</BlockDevice>
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
