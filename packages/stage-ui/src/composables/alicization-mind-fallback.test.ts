import type { AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { buildMindGovernedFallbackSurface } from './alicization-mind-fallback'

function t(path: string, params?: Record<string, unknown>) {
  const map: Record<string, string> = {
    'mind-fallback.focus-default': 'the current thing',
    'mind-fallback.repair-stale-anchor': 'Let me correct that first: the previous read was stale.',
    'mind-fallback.repair-need-reground': 'Let me hold the truth boundary first: I need a fresh view.',
    'mind-fallback.guide-opening': `Guide: ${String(params?.focus ?? '')}`,
    'mind-fallback.care-opening': `Care: ${String(params?.focus ?? '')}`,
    'mind-fallback.accompany-opening': `Accompany: ${String(params?.focus ?? '')}`,
    'mind-fallback.observation-opening': `Observe: ${String(params?.focus ?? '')}`,
    'mind-fallback.answer-opening': `Answer: ${String(params?.focus ?? '')}`,
    'mind-fallback.carry-memory': `Carry: ${String(params?.carry ?? '')}`,
    'mind-fallback.reground-note': 'Reground on the fresh view.',
  }
  return map[path] ?? path
}

function createGovernance(overrides: Partial<AlicizationMindTurnGovernance> = {}): AlicizationMindTurnGovernance {
  return {
    turnMode: 'guide-current-knot',
    truthState: 'live-observed',
    personaKernelMode: 'backgrounded',
    openingStyle: 'direct-answer',
    relationshipPosture: 'warm',
    answerAct: 'guide',
    evidenceMode: 'coarse-held',
    repairState: 'none',
    liveSurface: 'VS Code | diff view',
    focusAnchor: 'the failing diff',
    answerIntent: 'Localize the failing change before editing.',
    openingMove: 'Open from the current failing diff.',
    carriedThread: null,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: false,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    maxSentences: 3,
    mindMode: 'tracking',
    embodiedPresence: 'attentive',
    emotionalTension: 'tense-debug',
    mustDo: [],
    mustNotDo: [],
    ...overrides,
  }
}

describe('buildMindGovernedFallbackSurface', () => {
  it('builds a repair-first surface for stale anchors', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'screen-repair',
        answerAct: 'correct-stale-anchor',
        repairState: 'stale-anchor',
      }),
      userText: 'describe my screen again',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.thought).toContain('obligation=repair')
    expect(result?.thought).toContain('truth=coarse')
    expect(result?.reply).toContain('stale')
    expect(result?.emotion).toBe('apologetic')
  })

  it('labels carried continuity instead of claiming it as current surface', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        carriedThread: 'previous browser tab',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
      }),
      userText: 'what is wrong here',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Carry: previous browser tab')
    expect(result?.reply).toContain('Reground on the fresh view.')
    expect(result?.reply.startsWith('Guide: the failing diff')).toBe(true)
  })
})
