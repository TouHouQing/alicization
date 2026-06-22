import type { StageModelRenderer } from '../../stores/settings'

type StageComponentState = 'pending' | 'loading' | 'mounted'
type StageExecutionDiagnosticsRenderer = 'live2d' | 'vrm'

export interface GateStageExecutionDiagnosticsInput<T> {
  componentState: StageComponentState
  currentRenderer: StageModelRenderer
  diagnostics: T | null | undefined
  renderer: StageExecutionDiagnosticsRenderer
  showStage: boolean
}

export interface GateStageRuntimeCapabilitiesInput<T> {
  componentState: StageComponentState
  currentRenderer: StageModelRenderer
  renderer: StageExecutionDiagnosticsRenderer
  runtimeCapabilities: T | null | undefined
  showStage: boolean
}

function shouldExposeStageRendererPayload(input: {
  componentState: StageComponentState
  currentRenderer: StageModelRenderer
  renderer: StageExecutionDiagnosticsRenderer
  showStage: boolean
}) {
  if (!input.showStage || input.componentState !== 'mounted')
    return false

  return input.currentRenderer === input.renderer
}

export function gateStageExecutionDiagnostics<T>(
  input: GateStageExecutionDiagnosticsInput<T>,
) {
  if (!input.diagnostics)
    return null

  return shouldExposeStageRendererPayload(input)
    ? input.diagnostics
    : null
}

export function gateStageRuntimeCapabilities<T>(
  input: GateStageRuntimeCapabilitiesInput<T>,
) {
  if (!input.runtimeCapabilities)
    return null

  return shouldExposeStageRendererPayload(input)
    ? input.runtimeCapabilities
    : null
}
