import React, { useRef } from 'react'
import { render } from 'react-dom'

import Button from 'antd/es/button'

import Circuit, { CircuitHandle } from './component/circuit'

import 'antd/dist/antd.css'
import './www.less'
import { withMouseDown as withMouseDown } from './utils/dom'
import { Vec2 } from './utils/vec2'

function Main() {
    const toolTopHeight = 50,
        toolLeftWidth = 150,
        circuit = useRef({ } as CircuitHandle)
    return <>
        <div className="top" style={{ height: toolTopHeight }}></div>
        <div>
            <div className="left" style={{
                width: toolLeftWidth,
                height: window.innerHeight - toolTopHeight,
            }}>
                <Button onClick={ () => circuit.current.addBlock() }>Add Block</Button>
            </div>
            <div style={{ marginLeft: toolLeftWidth }}>
                <Circuit handle={ circuit }
                    width={ window.innerWidth - toolLeftWidth }
                    height={ window.innerHeight - toolTopHeight } />
            </div>
        </div>
    </>
}

render(<Main />, document.getElementById('app'))
