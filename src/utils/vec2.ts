export interface IVec2 {
    x: number
    y: number
}

export class Vec2 {
    x = 0
    y = 0
    constructor(data?: IVec2) {
        if (data) {
            Object.assign(this, data)
        }
    }
    static from(val: IVec2 | number, y?: number) {
        return new Vec2(typeof val === 'number' ? { x: val, y: y === undefined ? val : y } : val)
    }
    map(vec: IVec2, fn: (a: number, b: number) => number) {
        return new Vec2({ x: fn(this.x, vec.x), y: fn(this.y, vec.y) })
    }
    add(vec: IVec2 | number) {
        return this.map(Vec2.from(vec), (a, b) => a + b)
    }
    sub(vec: IVec2 | number) {
        return this.map(Vec2.from(vec), (a, b) => a - b)
    }
    dot(vec: IVec2) {
        return this.x * vec.x + this.y * vec.y
    }
    len() {
        return Math.sqrt(this.dot(this))
    }
    mul(val: number) {
        return this.map(this, a => a * val)
    }
    rot(angle: number) {
        const a = Math.atan2(this.y, this.x) + angle,
            r = this.len()
        return new Vec2({ x: r * Math.cos(a), y: r * Math.sin(a), })
    }
    lerp(b: IVec2, f: number) {
        return Vec2.from(b).mul(f).add(this.mul(1 - f))
    }
    set(x: number, y: number) {
        this.x = x
        this.y = y
    }
}
