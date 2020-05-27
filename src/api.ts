import fs from 'mz/fs'
import os from 'os'
import path from 'path'

import { spawn } from './utils/node'
import { sleep } from './utils/common'
import { BlockData, LinkData } from './utils/circuit'

export interface DataNode {
    title: string
    key: string
    children: DataNode[]
}

const root = path.join(os.homedir(), 'notebook')
async function listdir(dir: string, depth = 3): Promise<DataNode[]> {
    const items = await fs.readdir(path.join(root, dir))
    return await Promise.all(items.map(async title => {
        const key = dir + '/' + title,
            stat = await fs.stat(path.join(root, key)),
            children = depth > 0 && stat.isDirectory() ? await listdir(key, depth - 1) : []
        return { title, key, children }
    }))
}

export default {
    notebook: {
        async list() {
            return await fs.readdir(root)
        },
        async get(id: string) {
            return await listdir(id)
        },
    },
    schematic: {
        async get(id: string) {
            const blocks = [] as BlockData[], links = [] as LinkData[]
            if (id.endsWith('.schematic')) {
                const block = new BlockData()
                block.type = '.s5p'
                block.props.name = 'nil.s5p'
                block.rot = Math.PI / 2
                block.pos.set(100, 100)
                blocks.push(block)
            }
            return {
                blocks: blocks.map(block => block.toJSON()),
                links: links.map(link => link.toJSON()),
            }
        }
    },
    plot: {
        async get(id: string) {
        },
    },
    async *start() {
        for await (const msg of spawn('ping localhost', { shell: true })) {
            yield msg
        }
    }
}
