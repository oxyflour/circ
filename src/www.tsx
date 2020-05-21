import React, { useRef, useState } from 'react'
import { render } from 'react-dom'
import { HashRouter, Route, Switch, useParams, Redirect } from 'react-router-dom'

import Button from 'antd/es/button'
import Tree from 'antd/es/tree'
import Spin from 'antd/es/spin'
import { DataNode } from 'rc-tree/es/interface'

import Circuit, { CircuitHandle } from './component/circuit'

import 'antd/dist/antd.css'
import './www.less'
import { useAsyncEffect } from './utils/dom'
import rpc from './utils/rpc'

function Schematic(props: {
    width: number
    height: number
}) {
    const toolTopHeight = 50,
        toolLeftWidth = 150,
        { width, height } = props,
        circuit = useRef({ } as CircuitHandle)
    return <>
        <div className="top" style={{ height: toolTopHeight }}></div>
        <div>
            <div className="left" style={{
                width: toolLeftWidth,
                height: height - toolTopHeight,
            }}>
                <div className="content">
                    <Button onClick={ () => circuit.current.addBlock() }>Add Block</Button>
                </div>
            </div>
            <div style={{ marginLeft: toolLeftWidth }}>
                <Circuit handle={ circuit }
                    width={ width - toolLeftWidth }
                    height={ height - toolTopHeight } />
            </div>
        </div>
    </>
}

function Main() {
    const navWidth = 150,
        { innerWidth, innerHeight } = window
    
    const { id } = useParams() as { id: string }
    
    const [navTree, setNavTree] = useState([] as DataNode[]),
        [isLoadingNavTree, setLoadingNavTree] = useState(true)
    useAsyncEffect(async () => {
        setLoadingNavTree(true)
        try {
            setNavTree(await rpc.notebook.get(id))
        } catch (err) {
            console.error(err)
        }
        setLoadingNavTree(false)
    }, [id])

    return <>
        <div className="nav" style={{ width: navWidth, height: innerHeight }}>
            <div className="content">
            {
                isLoadingNavTree ?
                <Spin /> :
                <Tree treeData={ navTree }></Tree>
            }
            </div>
        </div>
        <div className="main" style={{ marginLeft: navWidth }}>
            <Schematic width={ innerWidth - navWidth } height={ innerHeight } />
        </div>
    </>
}

render(<HashRouter>
    <Switch>
        <Route path="/notebook/:id" component={ Main } />
        <Redirect to="/notebook/default" />
    </Switch>
</HashRouter>, document.getElementById('app'))
