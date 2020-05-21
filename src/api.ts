import { spawn } from "./utils/node"
import { sleep } from "./utils/common"

export interface DataNode {
    title: string
    key: string
    children: DataNode[]
}

export default {
    notebook: {
        async list() {
            await sleep(500)
            return [] as string[]
        },
        async get(id: string) {
            return [{
                title: 'root',
                key: 'root',
                children: [{
                    title: 'default',
                    key: 'default',
                    children: [{
                    }]
                }]
            }] as DataNode[]
        },
    },
    async hello() {
        return 'ok'
    },
    async *start() {
        for await (const msg of spawn('ping localhost', { shell: true })) {
            yield msg
        }
    }
}
