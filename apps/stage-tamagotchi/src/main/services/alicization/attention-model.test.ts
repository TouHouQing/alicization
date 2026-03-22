import { describe, expect, it } from 'vitest'

import { updateVisualAttentionModel } from './attention-model'

describe('updateVisualAttentionModel', () => {
  it('invalidates old attention on durability pulse', () => {
    const attention = updateVisualAttentionModel({
      now: 5_000,
      scenario: 'coding',
      previousAttention: {
        target: {
          appName: 'Chrome',
          processName: 'Google Chrome',
          title: 'old tab',
          pid: 1,
        },
        source: 'old-anchor',
        confidence: 0.44,
        engagedAt: 1_000,
        lastConfirmedAt: 2_000,
        dwellMs: 1_000,
      },
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'diff -- app.ts',
        pid: 222,
      },
      currentScene: null,
      invitedInspectionActive: false,
      durabilityPulse: {
        kind: 'process-gone',
        source: 'foreground-app',
        detectedAt: 5_000,
        pid: 222,
        appName: 'Visual Studio Code',
      },
    })

    expect(attention?.source).toBe('durability-pulse')
    expect(attention?.invalidationReason).toBe('durability-pulse')
    expect(attention?.target?.appName).toBe('Visual Studio Code')
  })

  it('prefers current grounded scene over stale old anchor', () => {
    const attention = updateVisualAttentionModel({
      now: 10_000,
      scenario: 'coding',
      previousAttention: {
        target: {
          appName: 'Chrome',
          processName: 'Google Chrome',
          title: 'old browser',
          pid: 1,
        },
        source: 'old-anchor',
        confidence: 0.8,
        engagedAt: 1_000,
        lastConfirmedAt: 2_000,
        dwellMs: 1_000,
      },
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'traceback.log',
        pid: 9,
      },
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'Python traceback',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'traceback.log',
          pid: 9,
        },
        beganAt: 8_000,
        lastSeenAt: 10_000,
      },
      invitedInspectionActive: false,
    })

    expect(attention?.source).toBe('current-grounded-scene')
    expect(attention?.target?.title).toBe('traceback.log')
    expect(attention?.invalidationReason).toBe('scene-conflict')
  })

  it('forces recheck on invited inspection', () => {
    const attention = updateVisualAttentionModel({
      now: 10_000,
      scenario: 'coding',
      currentForeground: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'Changes',
        pid: 11,
      },
      currentScene: null,
      invitedInspectionActive: true,
    })

    expect(attention?.source).toBe('invited-inspection')
    expect(attention?.confidence).toBeGreaterThanOrEqual(0.9)
  })
})
