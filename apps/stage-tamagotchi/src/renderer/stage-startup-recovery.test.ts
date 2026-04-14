import { describe, expect, it } from 'vitest'

import { resolveStageStartupRecoveryState } from './stage-startup-recovery'

describe('stage startup recovery', () => {
  it('keeps healthy stage startup click-through during the grace window', () => {
    expect(resolveStageStartupRecoveryState({
      routePath: '/',
      dismissed: false,
      stageMounted: false,
      recoveryGraceElapsed: false,
    })).toEqual({
      shouldShowEmergencyPanel: true,
      shouldEnableEmergencyMouseCapture: false,
      shouldRunAutoRescue: true,
      shouldReleaseMouseCapture: false,
    })
  })

  it('enables emergency mouse capture only after grace expires while stage is still not mounted', () => {
    expect(resolveStageStartupRecoveryState({
      routePath: '/',
      dismissed: false,
      stageMounted: false,
      recoveryGraceElapsed: true,
    })).toEqual({
      shouldShowEmergencyPanel: true,
      shouldEnableEmergencyMouseCapture: true,
      shouldRunAutoRescue: true,
      shouldReleaseMouseCapture: false,
    })
  })

  it('hides emergency recovery once the stage is mounted', () => {
    expect(resolveStageStartupRecoveryState({
      routePath: '/',
      dismissed: false,
      stageMounted: true,
      recoveryGraceElapsed: true,
    })).toEqual({
      shouldShowEmergencyPanel: false,
      shouldEnableEmergencyMouseCapture: false,
      shouldRunAutoRescue: false,
      shouldReleaseMouseCapture: false,
    })
  })

  it('releases mouse capture on non-stage routes', () => {
    expect(resolveStageStartupRecoveryState({
      routePath: '/settings/models',
      dismissed: false,
      stageMounted: false,
      recoveryGraceElapsed: true,
    })).toEqual({
      shouldShowEmergencyPanel: false,
      shouldEnableEmergencyMouseCapture: false,
      shouldRunAutoRescue: false,
      shouldReleaseMouseCapture: true,
    })
  })
})
