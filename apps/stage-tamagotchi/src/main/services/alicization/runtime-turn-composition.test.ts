import { describe, expect, it } from 'vitest'

import {
  buildSessionContinuityRecallSeed,
  buildSessionMirrorRecollectionAfterthoughtSeed,
  buildSessionMirrorRuntimeContinuitySeed,
  deriveOrganicMemoryBudgetClass,
  filterMainGatewayToolsForRoutingIntent,
} from './runtime-turn-composition'

describe('runtime turn composition helpers', () => {
  it('derives deep recall budgets only for long-horizon temporal focus', () => {
    expect(deriveOrganicMemoryBudgetClass(null)).toBe('realtime-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'cross-session',
      },
    } as any)).toBe('deep-recall-reply')
    expect(deriveOrganicMemoryBudgetClass({
      recollectionIntent: {
        temporalFocus: 'experience-matched',
      },
    } as any)).toBe('deep-recall-reply')
  })

  it('builds afterglow recall seeds only from ripe continuity signals', () => {
    expect(buildSessionMirrorRecollectionAfterthoughtSeed({
      recollectionSummary: 'old seam',
      recollectionSurfaceSummary: 'afterthought=ripe room-first',
    } as any)).toContain('mirror_recollection_afterthought')
    expect(buildSessionMirrorRecollectionAfterthoughtSeed({
      recollectionSummary: 'old seam',
      recollectionSurfaceSummary: 'afterthought=not-yet',
    } as any)).toBe('')
    expect(buildSessionMirrorRuntimeContinuitySeed({
      runtimeChannelSummary: 'dominant=dialogue | phase=dialogue | handoff=dialogue',
      runtimeTransitionSummary: 'from=symbiotic-vision | to=recovering | scenario=coding | reason=host fatigue detected',
    } as any)).toContain('mirror_runtime_continuity:')
    expect(buildSessionContinuityRecallSeed([
      {
        label: 'ordinary',
        summary: 'ignored',
        metadata: {},
      },
      {
        label: 'afterglow:repair-window',
        summary: 'repair first',
        metadata: {
          threadAnchor: 'thread-a',
          afterglowTag: 'repair',
        },
      },
    ] as any)).toContain('continuity_afterglow:')
  })

  it('filters tools to required routing names without dropping fallback tools when no match exists', () => {
    const tools = [
      { function: { name: 'search_memory' } },
      { function: { name: 'execute_task' } },
    ]
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['execute_task'],
    } as any)).toEqual([
      { function: { name: 'execute_task' } },
    ])
    expect(filterMainGatewayToolsForRoutingIntent(tools, {
      requiredToolNames: ['missing_tool'],
    } as any)).toBe(tools)
  })
})
