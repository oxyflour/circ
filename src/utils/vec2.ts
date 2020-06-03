import { clamp } from "./common"

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
    min(vec: IVec2 | number) {
        return this.map(Vec2.from(vec), (a, b) => Math.min(a, b))
    }
    max(vec: IVec2 | number) {
        return this.map(Vec2.from(vec), (a, b) => Math.max(a, b))
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
    div(val: number) {
        return this.map(this, a => a / val)
    }
    rot(angle: number) {
        const a = Math.atan2(this.y, this.x) + angle,
            r = this.len()
        return new Vec2({ x: r * Math.cos(a), y: r * Math.sin(a), })
    }
    norm() {
        return this.div(this.len())
    }
    lerp(b: IVec2, f: number) {
        return Vec2.from(b.x * f + this.x * (1 - f), b.y * f + this.y * (1 - f))
    }
    angle() {
        return Math.atan2(this.y, this.x)
    }
    nearestFrom(p0: IVec2, p1: IVec2) {
        const len = (p0.x - p1.x) ** 2 + (p0.y - p1.y) ** 2,
            fac = ((this.x - p1.x) * (p0.x - p1.x) + (this.y - p1.y) * (p0.y - p1.y)) / len
        return fac < 0 ? p1 : fac > 1 ? p0 : Vec2.from(p1).lerp(p0, fac)
    }
    set(x: number, y: number) {
        this.x = x
        this.y = y
    }
}
