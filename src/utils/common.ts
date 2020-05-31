export type Dict<V> = { [k: string]: V }

export function uid(len = 8) {
    return Math.random().toString(16).slice(2, len + 2)
}

export function memo<F extends Function>(fn: F) {
    const cache = { } as { [key: string]: any }
    return ((...args: any[]) => {
        const key = args.join('/')
        return cache[key] || (cache[key] = fn(...args))
    }) as any as F
}

export function debounce<F extends Function>(fn: F, delay: number) {
    let timeout = 0 as any
    return ((...args: any[]) => {
        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(() => {
            timeout = 0
            fn(...args)
        }, delay)
    }) as any as F
}

export function lerp(a: number, b: number, f: number) {
    return a * (1 - f) + b * f
}

export function interp1(x0: number, y0: number, x1: number, y1: number, x: number) {
    return lerp(y0, y1, (x - x0) / (x1 - x0))
}

export function range(count: number): number[]
export function range(start: number, end = NaN, step = 1) {
    const [a, b] = end === end ? [start, end] : [0, start],
        ret = []
    for (let x = a; x < b; x += step) {
        ret.push(x)
    }
    return ret
}

export function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time))
}
