import type { PerfTracer } from './tracer'

interface LagEnabled {
  fps: boolean
  frameDuration: boolean
  longtask: boolean
  memory: boolean
}

interface AnimationFrameScope {
  requestAnimationFrame?: (callback: (ts: number) => void) => number
  cancelAnimationFrame?: (id: number) => void
}

interface LongTaskEntryLike {
  startTime: number
  duration: number
}

interface PerformanceObserverEntryListLike {
  getEntries: () => LongTaskEntryLike[]
}

interface PerformanceObserverLike {
  disconnect: () => void
  observe: (options?: unknown) => void
}

interface PerformanceObserverConstructorLike {
  new (callback: (list: PerformanceObserverEntryListLike) => void): PerformanceObserverLike
}

interface PerformanceMemoryLike {
  usedJSHeapSize: number
}

interface PerformanceLike {
  now: () => number
  memory?: PerformanceMemoryLike
}

export function createLagSampler(tracer: PerfTracer) {
  const browserScope = globalThis as typeof globalThis & AnimationFrameScope & {
    PerformanceObserver?: PerformanceObserverConstructorLike
    performance?: PerformanceLike
  }
  let rafId: number | undefined
  let lastTs: number | undefined
  let longTaskObserver: PerformanceObserverLike | undefined
  let memoryTimer: ReturnType<typeof setInterval> | undefined

  function stopRaf() {
    if (rafId !== undefined) {
      browserScope.cancelAnimationFrame?.(rafId)
      rafId = undefined
    }
    lastTs = undefined
  }

  function startRaf() {
    const requestFrame = browserScope.requestAnimationFrame
    if (!requestFrame)
      return

    stopRaf()

    const loop = (ts: number) => {
      if (lastTs !== undefined) {
        const delta = ts - lastTs
        const fps = delta > 0 ? 1000 / delta : 0

        tracer.emit({
          tracerId: 'lag',
          name: 'fps',
          ts,
          duration: fps,
        })

        tracer.emit({
          tracerId: 'lag',
          name: 'frameDuration',
          ts,
          duration: delta,
        })
      }

      lastTs = ts
      rafId = requestFrame(loop)
    }

    rafId = requestFrame(loop)
  }

  function stopLongTaskObserver() {
    longTaskObserver?.disconnect()
    longTaskObserver = undefined
  }

  function startLongTaskObserver() {
    stopLongTaskObserver()
    const PerformanceObserverCtor = browserScope.PerformanceObserver as PerformanceObserverConstructorLike | undefined
    if (!PerformanceObserverCtor)
      return

    try {
      const observer: PerformanceObserverLike = new PerformanceObserverCtor((list) => {
        for (const entry of list.getEntries()) {
          tracer.emit({
            tracerId: 'lag',
            name: 'longtask',
            ts: entry.startTime,
            duration: entry.duration,
          })
        }
      })
      observer.observe({ type: 'longtask', buffered: true } as unknown)
      longTaskObserver = observer
    }
    catch (error) {
      console.warn('[LagSampler] Failed to start longtask observer', error)
    }
  }

  function stopMemoryTimer() {
    if (memoryTimer) {
      clearInterval(memoryTimer)
      memoryTimer = undefined
    }
  }

  function startMemoryTimer() {
    stopMemoryTimer()
    const perfWithMemory = browserScope.performance
    if (!perfWithMemory.memory)
      return

    memoryTimer = setInterval(() => {
      tracer.emit({
        tracerId: 'lag',
        name: 'memory',
        ts: perfWithMemory.now(),
        duration: perfWithMemory.memory?.usedJSHeapSize ?? 0,
      })
    }, 1000)
  }

  function start(enabled: LagEnabled) {
    stop()

    if (enabled.fps || enabled.frameDuration)
      startRaf()

    if (enabled.longtask)
      startLongTaskObserver()

    if (enabled.memory)
      startMemoryTimer()
  }

  function stop() {
    stopRaf()
    stopLongTaskObserver()
    stopMemoryTimer()
  }

  return {
    start,
    stop,
  }
}
