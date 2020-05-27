import React, { useState, useEffect } from 'react'
import { render } from 'react-dom'
import { HashRouter, Route, Switch, useParams, Redirect, useHistory } from 'react-router-dom'

import Tree from 'antd/es/tree'
import Spin from 'antd/es/spin'
import Layout from 'antd/es/layout'
import message from 'antd/es/message'
import { EventDataNode } from 'rc-tree/lib/interface'

import 'antd/dist/antd.css'
import './www.less'

import rpc from './utils/rpc'
import { useAsyncEffect, withMouseDown } from './utils/dom'
import { DataNode } from './api'
import { debounce } from './utils/common'

import Schematic from './component/schematic'

const saveNavWidth = debounce((val: number) => localStorage.setItem('saved-nav-width', val + ''), 100)
function Main() {
    const { id } = useParams() as { id: string },
        history = useHistory(),
        [navWidth, setNavWidth] = useState(parseInt(localStorage.getItem('saved-nav-width') || '250')),
        [navTree, setNavTree] = useState([] as DataNode[]),
        [isLoadingNavTree, setLoadingNavTree] = useState(true),
        [selectedKeys, setSelectedKeys] = useState([] as React.ReactText[])

    useAsyncEffect(async () => {
        setLoadingNavTree(true)
        try {
            setNavTree(await rpc.notebook.get(id))
        } catch (err) {
            message.error(`load notebook ${id} failed`)
            console.error(err)
        }
        setLoadingNavTree(false)
    }, [id])
    useEffect(() => {
        saveNavWidth(navWidth)
    }, [navWidth])

    function onMouseDownOnYSplitter(evt: React.MouseEvent) {
        const start = navWidth - evt.clientX
        withMouseDown(evt => setNavWidth(evt.clientX + start))
    }
    function onSelectTreeKeys(keys: React.ReactText[], { nativeEvent, node }: { nativeEvent: MouseEvent, node: EventDataNode }) {
        if (keys.length === 1) {
            history.push('/notebook/' + keys[0].toString())
        }
        // we have to check ctrl key here
        setSelectedKeys(nativeEvent.ctrlKey ? keys : [node.key])
    }
    return <Layout style={{ height: '100%' }}>
        <Layout.Sider className="nav" width={ navWidth }>
            <div className="content">
            {
                isLoadingNavTree ?
                <Spin /> :
                <Tree treeData={ navTree } multiple
                    selectedKeys={ selectedKeys } onSelect={ onSelectTreeKeys } />
            }
            </div>
            <div className="y-splitter" onMouseDown={ onMouseDownOnYSplitter }></div>
        </Layout.Sider>
        <Layout.Content className="main">
            {
                selectedKeys.length === 1 && selectedKeys[0].toString().endsWith('.schematic') &&
                <Schematic file={ selectedKeys[0].toString() } />
            }
        </Layout.Content>
    </Layout>
}

render(<HashRouter>
    <Switch>
        <Route path="/notebook/:id" component={ Main } />
        <Redirect to="/notebook/default" />
    </Switch>
</HashRouter>, document.getElementById('app'))
