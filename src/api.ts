import fs from 'mz/fs'
import os from 'os'
import path from 'path'

import { spawn } from './utils/node'
import { BlockData, LinkData } from './utils/circuit'

export interface DataNode {
    title: string
    key: string
    children: DataNode[]
}

const root = path.join(os.homedir(), 'notebook')
async function listdir(dir: string, sub = '', depth = 3): Promise<DataNode[]> {
    const items = await fs.readdir(path.join(dir, sub))
    return await Promise.all(items.map(async title => {
        const key = sub + '/' + title,
            stat = await fs.stat(path.join(dir, key)),
            children = depth > 0 && stat.isDirectory() ? await listdir(dir, key, depth - 1) : []
        return { title, key, children }
    }))
}

export default {
    notebook: {
        async list() {
            return await fs.readdir(root)
        },
        async get(id: string) {
            return await listdir(path.join(root, id))
        },
    },
    schematic: {
        async get(id: string) {
            const blocks = [] as BlockData[], links = [] as LinkData[]
            if (id.endsWith('.schematic')) {
                const block = new BlockData<{ name: string }>()
                block.type = '.s5p'
                block.attrs.name = 'nil.s5p'
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
