import { describe, expect, it } from 'vitest'

import { buildVisualHeartbeat } from './visual-heartbeat'

describe('buildVisualHeartbeat', () => {
  const baseContext = {
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 30,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'diff -- index.ts',
        pid: 123,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.88,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'diff' as const,
      confidence: 0.82,
      source: 'foreground-window-heuristic' as const,
      matchedLabels: ['diff'],
    },
  }

  it('stays passive when no boundary trigger exists', () => {
    const result = buildVisualHeartbeat({
      now: 30_000,
      scenario: 'general',
      context: {
        ...baseContext,
        workload: { ...baseContext.workload, kind: 'browser', matchedLabels: ['browser'] },
        content: { ...baseContext.content, kind: 'unknown', matchedLabels: [] },
      },
      invitedInspectionActive: false,
      groundedSummary: null,
      screenSemanticSummaryActive: false,
    })

    expect(result.watchMode).toBe('mnemonic-passive')
    expect(result.nextSuggestedProbeMs).toBe(45_000)
  })

  it('enters symbiotic vision for a stable coding friction scene', () => {
    const result = buildVisualHeartbeat({
      now: 45_000,
      scenario: 'coding',
      previousState: {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          summary: 'index.ts diff',
          source: 'foreground-window-heuristic',
          confidence: 0.72,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'diff -- index.ts',
            pid: 123,
          },
          beganAt: 0,
          lastSeenAt: 20_000,
        },
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        captureState: { permission: 'unknown', lastGroundedAt: null },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 45_000,
        updatedAt: 20_000,
      },
      context: baseContext,
      invitedInspectionActive: false,
      groundedSummary: 'current diff pane',
      screenSemanticSummaryActive: true,
    })

    expect(result.watchMode).toBe('symbiotic-vision')
    expect(result.recentTransition?.reason).toBe('symbiotic-entry')
    expect(result.scene?.source).toBe('screen-semantic-summary')
  })

  it('prioritizes invited inspection', () => {
    const result = buildVisualHeartbeat({
      now: 10_000,
      scenario: 'coding',
      context: baseContext,
      invitedInspectionActive: true,
      groundedSummary: 'focused diff',
      screenSemanticSummaryActive: true,
    })

    expect(result.watchMode).toBe('invited-inspection')
    expect(result.nextSuggestedProbeMs).toBe(6_000)
  })

  it('switches to recovering on durability pulse', () => {
    const result = buildVisualHeartbeat({
      now: 10_000,
      scenario: 'coding',
      context: baseContext,
      invitedInspectionActive: false,
      groundedSummary: null,
      screenSemanticSummaryActive: false,
      durabilityPulse: {
        kind: 'render-process-gone',
        source: 'electron-process',
        detectedAt: 10_000,
      },
    })

    expect(result.watchMode).toBe('recovering')
    expect(result.durabilityPulse?.kind).toBe('render-process-gone')
    expect(result.nextSuggestedProbeMs).toBe(5_000)
  })
})
