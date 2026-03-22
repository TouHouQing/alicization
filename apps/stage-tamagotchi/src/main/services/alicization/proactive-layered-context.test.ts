import { describe, expect, it } from 'vitest'

import { buildProactiveLayeredContext, inferForegroundWorkloadFromWindow } from './proactive-layered-context'

describe('proactive layered context heuristics', () => {
  it('classifies QQMusic foreground windows as media music', () => {
    const context = buildProactiveLayeredContext({
      now: new Date('2026-03-22T16:05:00+08:00').getTime(),
      probeSample: {
        collectedAt: Date.now(),
        time: {
          iso: '2026-03-22T08:05:00.000Z',
          local: '2026-03-22 16:05:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'QQMusic',
          processName: 'QQMusic',
          title: 'Melt - QQMusic',
        },
        battery: {
          percent: 88,
          charging: true,
          source: 'fallback',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
      interruptionContext: {
        idleSeconds: 0,
        inputActivity: 'active',
        fullscreenLikely: false,
        foregroundWindow: {
          appName: 'QQMusic',
          processName: 'QQMusic',
          title: 'Melt - QQMusic',
        },
        degraded: [],
      },
      subconsciousState: {
        boredom: 22,
        loneliness: 18,
        fatigue: 20,
        lastInteractionAt: new Date('2026-03-22T15:58:00+08:00').getTime(),
      },
      hostAttitude: 'curious',
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
      screenSemanticSummary: null,
    })

    expect(inferForegroundWorkloadFromWindow({
      appName: 'QQMusic',
      processName: 'QQMusic',
      title: 'Melt - QQMusic',
    })).toBe('media')
    expect(context.workload.kind).toBe('media')
    expect(context.content.kind).toBe('music')
    expect(context.workload.source).toBe('foreground-window-heuristic')
    expect(context.content.source).toBe('foreground-window-heuristic')
  })
})
