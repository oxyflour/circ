import React, { useRef, useState, useEffect } from 'react'

import Layout from 'antd/es/layout'
import Button from 'antd/es/button'

import { debounce } from '../utils/common'
import Circuit, { CircuitHandle } from './schematic/circuit'
import { withMouseDown, useAsyncEffect } from '../utils/dom'
import rpc from '../utils/rpc'

const saveSiderWidth = debounce((val: number) => localStorage.setItem('saved-sider-width', val + ''), 100)
export default function Schematic(props: {
    file: string
}) {
    const circuit = useRef({ } as CircuitHandle),
        { file } = props,
        [siderWidth, setSiderWidth] = useState(parseInt(localStorage.getItem('saved-sider-width') || '250')),
        [addingBlock, setAddingBlock] = useState(false)
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
    function onAddBlock(type: string) {
        setAddingBlock(true)
        circuit.current.beginAdd({ type }, () => setAddingBlock(false))
    }
    return <Layout className="schematic" style={{ height: '100%' }}>
        <Layout.Header className="header">
        </Layout.Header>
        <Layout.Content>
            <Layout style={{ height: '100%' }}>
                <Layout.Sider className="sider" width={ siderWidth }>
                    <div className="content">
                        <Button disabled={ addingBlock } onMouseDown={ () => onAddBlock('.s2p') }>s2p</Button>
                        <span> </span>
                        <Button disabled={ addingBlock } onMouseDown={ () => onAddBlock('gnd') }>gnd</Button>
                        <span> </span>
                        <Button disabled={ addingBlock } onMouseDown={ () => onAddBlock('lc') }>lc</Button>
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
