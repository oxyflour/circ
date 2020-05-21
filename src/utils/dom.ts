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
