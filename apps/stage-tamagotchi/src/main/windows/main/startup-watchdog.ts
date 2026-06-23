export type RendererStartupWatchdogDecision = 'ignore' | 'report-timeout' | 'wait-for-load'

export interface RendererStartupWatchdogState {
  elapsedMs: number
  rendererDidFinishLoad: boolean
  rendererIsLoading: boolean
  slowLoadingTimeoutMs: number
  webContentsDestroyed: boolean
  windowDestroyed: boolean
}

export function resolveRendererStartupWatchdogDecision(
  state: RendererStartupWatchdogState,
): RendererStartupWatchdogDecision {
  if (state.windowDestroyed || state.webContentsDestroyed || state.rendererDidFinishLoad)
    return 'ignore'

  if (state.rendererIsLoading && state.elapsedMs < state.slowLoadingTimeoutMs)
    return 'wait-for-load'

  return 'report-timeout'
}
