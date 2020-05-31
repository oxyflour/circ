import { useEffect } from 'react'

export function withMouseDown(onMouseMove: (evt: MouseEvent) => void, onMouseUp?: (evt: MouseEvent) => void) {
    const move = (evt: MouseEvent) => {
        onMouseMove(evt)
    }
    const up = (evt: MouseEvent) => {
        onMouseUp && onMouseUp(evt)
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
}

export function useAsyncEffect(effect: () => Promise<any>, deps?: React.DependencyList) {
    useEffect(() => {
        effect()
    }, deps)
}

export interface Point {
    x: number
    y: number
}

export interface Rect {
    left: number
    right: number
    top: number
    bottom: number
}

export function inside({ x, y }: Point, { left, right, top, bottom }: Rect) {
    return left <= x && x <= right && top <= y && y <= bottom
}

export function intersect(rt1: Rect, rt2: Rect) {
    return rt1.right >= rt2.left && rt2.right >= rt1.left && rt1.bottom >= rt2.top && rt2.bottom >= rt1.top
}

export function setSvgRect(rect: SVGRect, bound: Rect) {
    Object.assign(rect, bound)
    rect.x = rect.width
    rect.y = rect.height
    rect.width = bound.right - bound.left
    rect.height = bound.bottom - bound.top
    return rect
}
