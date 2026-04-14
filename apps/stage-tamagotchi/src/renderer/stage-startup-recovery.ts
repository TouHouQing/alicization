export interface StageStartupRecoveryStateInput {
  routePath: string
  dismissed: boolean
  stageMounted: boolean
  recoveryGraceElapsed: boolean
}

export interface StageStartupRecoveryState {
  shouldShowEmergencyPanel: boolean
  shouldEnableEmergencyMouseCapture: boolean
  shouldRunAutoRescue: boolean
  shouldReleaseMouseCapture: boolean
}

export function resolveStageStartupRecoveryState(input: StageStartupRecoveryStateInput): StageStartupRecoveryState {
  const isStageRoute = input.routePath === '/'
  const shouldShowEmergencyPanel = isStageRoute && !input.dismissed && !input.stageMounted

  return {
    shouldShowEmergencyPanel,
    shouldEnableEmergencyMouseCapture: shouldShowEmergencyPanel && input.recoveryGraceElapsed,
    shouldRunAutoRescue: shouldShowEmergencyPanel,
    shouldReleaseMouseCapture: !isStageRoute,
  }
}
