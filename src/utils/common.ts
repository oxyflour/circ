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

export function clamp(x: number, min: number, max: number) {
    return x < min ? min : x > max ? max : x;
}

export function binSearch(arr: number[], val: number) {
    let i = 0, j = arr.length - 1
    while (i <= j) {
        const n = (i + j) >> 1
        if (val === arr[n]) {
            return n
        } else if (val > arr[n]) {
            i = n + 1
        } else {
            j = n - 1
        }
    }
    return i - 1
}

export function interp(xs: number[], ys: number[], x: number) {
    const i = binSearch(xs, x)
    if (i < 0) {
        return xs[0]
    } else if (i < xs.length - 1) {
        return interp1(xs[i], ys[i], xs[i + 1], ys[i + 1], x)
    } else {
        return ys[ys.length - 1]
    }
}

export function findMinIndex(arr: number[]) {
    let val = Infinity, idx = 0
    for (const [i, x] of arr.entries()) {
        if (x < val) {
            val = x
            idx = i
        }
    }
    return idx
}
