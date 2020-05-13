import { spawn } from "./utils/node"

export default {
    async hello() {
        return 'ok'
    },
    async *start() {
        for await (const msg of spawn('ping localhost', { shell: true })) {
            yield msg
        }
    }
}
