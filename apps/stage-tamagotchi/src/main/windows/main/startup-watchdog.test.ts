import { describe, expect, it } from 'vitest'

import { resolveRendererStartupWatchdogDecision } from './startup-watchdog'

describe('resolveRendererStartupWatchdogDecision', () => {
  it('keeps waiting while the renderer is still loading below the slow-load limit', () => {
    expect(resolveRendererStartupWatchdogDecision({
      elapsedMs: 9000,
      rendererDidFinishLoad: false,
      rendererIsLoading: true,
      slowLoadingTimeoutMs: 30000,
      webContentsDestroyed: false,
      windowDestroyed: false,
    })).toBe('wait-for-load')
  })

  it('reports a timeout once loading stops without did-finish-load', () => {
    expect(resolveRendererStartupWatchdogDecision({
      elapsedMs: 9000,
      rendererDidFinishLoad: false,
      rendererIsLoading: false,
      slowLoadingTimeoutMs: 30000,
      webContentsDestroyed: false,
      windowDestroyed: false,
    })).toBe('report-timeout')
  })

  it('reports a timeout when loading exceeds the slow-load limit', () => {
    expect(resolveRendererStartupWatchdogDecision({
      elapsedMs: 30001,
      rendererDidFinishLoad: false,
      rendererIsLoading: true,
      slowLoadingTimeoutMs: 30000,
      webContentsDestroyed: false,
      windowDestroyed: false,
    })).toBe('report-timeout')
  })

  it('ignores already-finished or destroyed renderer states', () => {
    expect(resolveRendererStartupWatchdogDecision({
      elapsedMs: 9000,
      rendererDidFinishLoad: true,
      rendererIsLoading: true,
      slowLoadingTimeoutMs: 30000,
      webContentsDestroyed: false,
      windowDestroyed: false,
    })).toBe('ignore')

    expect(resolveRendererStartupWatchdogDecision({
      elapsedMs: 9000,
      rendererDidFinishLoad: false,
      rendererIsLoading: true,
      slowLoadingTimeoutMs: 30000,
      webContentsDestroyed: true,
      windowDestroyed: false,
    })).toBe('ignore')
  })
})
