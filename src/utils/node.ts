import cp from 'child_process'

export async function *spawn(cmd: string, opts: cp.SpawnOptions) {
    const proc = cp.spawn(cmd, { stdio: 'pipe', ...opts }),
        buffer = [] as any[],
        queue = [] as Function[]
    function push(data: any) {
        const func = queue.shift()
        func ? func(data) : buffer.push(data)
    }
    async function pull() {
        const data = buffer.shift()
        return data || await new Promise(resolve => queue.push(resolve))
    }
    proc.stdout && proc.stdout.on('data', data => push({ stdout: data.toString() }))
    proc.stderr && proc.stderr.on('data', data => push({ stderr: data.toString() }))
    proc.on('exit', code => push({ done: true }))
    let data
    while (data = await pull()) {
        yield data as { stdout: string, stderr: string, done: boolean }
        if (data.done) {
            break
        }
    }
}
