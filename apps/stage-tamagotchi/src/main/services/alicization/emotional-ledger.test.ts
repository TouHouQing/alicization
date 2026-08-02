import type { AlicizationEmotionalKernelSnapshot } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationEmotionalTransitionLedger,
  resolveAlicizationEmotionalTransitionDecay,
} from './emotional-ledger'

function kernel(overrides: Partial<AlicizationEmotionalKernelSnapshot>): AlicizationEmotionalKernelSnapshot {
  return {
    version: 'emotional-kernel-v1',
    dominantEmotion: 'measured-companionship',
    initiativeMode: 'observe',
    memoryRecallMode: 'low-pressure-presence',
    embodimentTone: 'measured-return',
    valence: 0.52,
    arousal: 0.26,
    guardedness: 0.34,
    closenessDrive: 0.42,
    repairNeed: 0.16,
    initiativePressure: 0.2,
    reasonTags: ['measured-return'],
    why: 'A lower-pressure same-line return is still settling.',
    ...overrides,
  }
}

describe('buildAlicizationEmotionalTransitionLedger', () => {
  it('records why an emotion changes and which downstream life loops should react', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 42_000,
      previous: kernel({
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'nearby-soft',
        valence: 0.72,
        arousal: 0.34,
        guardedness: 0.18,
        closenessDrive: 0.68,
        repairNeed: 0.1,
        initiativePressure: 0.5,
        reasonTags: ['afterglow'],
        why: 'Warmth can approach gently.',
      }),
      next: kernel({
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.28,
        arousal: 0.62,
        guardedness: 0.71,
        closenessDrive: 0.22,
        repairNeed: 0.82,
        initiativePressure: 0.18,
        reasonTags: ['repair-before-closeness', 'confirmation-boundary'],
        why: 'Repair should settle before closeness widens again.',
      }),
      source: {
        turnId: 'turn-repair-1',
        sourceTags: ['private-thought', 'affective-residue'],
      },
    })

    expect(ledger).toMatchObject({
      version: 'emotional-transition-ledger-v1',
      createdAt: 42_000,
      turnId: 'turn-repair-1',
      previousEmotion: 'warm-attunement',
      nextEmotion: 'repair-tension',
      transitionKind: 'repair-shift',
      sourceTags: ['private-thought', 'affective-residue', 'repair-before-closeness', 'confirmation-boundary'],
      decayPolicy: {
        mode: 'hold-until-repair-cools',
        carryTtlMs: 1_800_000,
        reason: 'emotional-decay:repair-cooling',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'relationship-repair',
        reason: 'emotional-memory:relationship-repair',
      },
      initiativeSuppression: {
        shouldSuppress: true,
        mode: 'repair-first',
        reason: 'emotional-initiative:repair-first',
      },
      embodimentDrive: {
        shouldDrive: true,
        tone: 'repair-before-closeness',
        reason: 'emotional-embodiment:transition-drive',
      },
    })
    expect(ledger.axisDeltas).toEqual({
      valence: -0.44,
      arousal: 0.28,
      guardedness: 0.53,
      closenessDrive: -0.46,
      repairNeed: 0.72,
      initiativePressure: -0.32,
    })
    expect(ledger.changedAxes).toEqual(['valence', 'arousal', 'guardedness', 'closenessDrive', 'repairNeed', 'initiativePressure'])
    expect(ledger.traceSummary).toContain('warm-attunement -> repair-tension')
    expect(ledger.traceSummary).toContain('repair-before-closeness')
    expect(ledger.replayLine).toContain('turn-repair-1')
    expect(ledger.replayLine).toContain('repair-shift')
    expect(ledger).not.toHaveProperty('selfRevisionCandidate')
  })

  it('writes guarded confirmation-boundary transitions to emotional continuity even when numeric axis movement is modest', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 72_000,
      previous: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.52,
        arousal: 0.26,
        guardedness: 0.34,
        closenessDrive: 0.42,
        repairNeed: 0.16,
        initiativePressure: 0.2,
        reasonTags: ['measured-return'],
      }),
      next: kernel({
        dominantEmotion: 'guarded-care',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'protective-watch',
        valence: 0.46,
        arousal: 0.3,
        guardedness: 0.48,
        closenessDrive: 0.34,
        repairNeed: 0.2,
        initiativePressure: 0.14,
        reasonTags: ['confirmation-boundary'],
        why: 'A confirmed boundary should stay single-thread before closeness widens.',
      }),
      source: {
        turnId: 'turn-guarded-boundary-1',
        sourceTags: ['execution-safety-gate'],
      },
    })

    expect(ledger.transitionKind).toBe('guarded-shift')
    expect(ledger.memoryWriteback).toEqual({
      shouldWrite: true,
      lane: 'emotional-continuity',
      reason: 'emotional-memory:confirmation-boundary',
    })
    expect(ledger.initiativeSuppression).toEqual({
      shouldSuppress: true,
      mode: 'single-thread',
      reason: 'emotional-initiative:single-thread',
    })
    expect(ledger.embodimentDrive).toEqual({
      shouldDrive: true,
      tone: 'protective-watch',
      reason: 'emotional-embodiment:transition-drive',
    })
    expect(ledger).not.toHaveProperty('selfRevisionCandidate')
    expect(ledger.replayLine).toContain('guarded-shift')
  })

  it('turns repair decay policy into an auditable hold soften release lifecycle', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 100_000,
      previous: kernel({
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        embodimentTone: 'nearby-soft',
        valence: 0.72,
        arousal: 0.34,
        guardedness: 0.18,
        closenessDrive: 0.68,
        repairNeed: 0.1,
        initiativePressure: 0.5,
        reasonTags: ['afterglow'],
      }),
      next: kernel({
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.3,
        arousal: 0.62,
        guardedness: 0.7,
        closenessDrive: 0.22,
        repairNeed: 0.82,
        initiativePressure: 0.16,
        reasonTags: ['repair-before-closeness'],
        why: 'Repair should settle before closeness widens again.',
      }),
      source: {
        turnId: 'turn-repair-decay',
        sourceTags: ['private-thought'],
      },
    })

    const held = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 100_000 + 15 * 60_000,
      current: kernel({
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        repairNeed: 0.62,
        initiativePressure: 0.22,
        reasonTags: ['repair-before-closeness'],
      }),
    })
    const softened = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 100_000 + 31 * 60_000,
      current: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        repairNeed: 0.22,
        initiativePressure: 0.24,
        reasonTags: ['measured-return'],
      }),
    })
    const released = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 100_000 + 44 * 60_000,
      current: kernel({
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'nearby-soft',
        repairNeed: 0.08,
        initiativePressure: 0.44,
        reasonTags: ['warmth-returned'],
      }),
    })

    expect(held).toEqual(expect.objectContaining({
      phase: 'hold',
      shouldSuppressInitiative: true,
      shouldDriveEmbodiment: true,
      initiativeMode: 'repair-first',
      embodimentTone: 'repair-before-closeness',
      memoryWritebackLane: 'relationship-repair',
    }))
    expect(held.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:hold-until-repair-cools',
      'emotion-decay:within-window',
      'emotion-decay:repair-still-hot',
    ]))
    expect(held).not.toHaveProperty('summary')
    expect(held.expiresAt).toBe(1_900_000)

    expect(softened).toEqual(expect.objectContaining({
      phase: 'soften',
      shouldSuppressInitiative: true,
      shouldDriveEmbodiment: true,
      initiativeMode: 'measured-return',
      embodimentTone: 'measured-return',
      memoryWritebackLane: 'relationship-repair',
    }))
    expect(softened.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:expired',
      'emotion-decay:repair-cooling',
    ]))
    expect(softened).not.toHaveProperty('summary')

    expect(released).toEqual(expect.objectContaining({
      phase: 'release',
      shouldSuppressInitiative: false,
      shouldDriveEmbodiment: false,
      initiativeMode: 'none',
      embodimentTone: null,
      memoryWritebackLane: 'none',
    }))
    expect(released.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:expired',
      'emotion-decay:released',
    ]))
    expect(released).not.toHaveProperty('summary')
  })

  it('keeps rest-protective emotion held through its rest window before softening into measured return', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 200_000,
      previous: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        embodimentTone: 'measured-return',
      }),
      next: kernel({
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.44,
        arousal: 0.16,
        guardedness: 0.58,
        closenessDrive: 0.24,
        repairNeed: 0.1,
        initiativePressure: 0.08,
        reasonTags: ['rest-protective', 'quiet-companionship'],
        why: 'Rest protection should hold the line inward.',
      }),
    })

    const held = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 200_000 + 45 * 60_000,
      current: kernel({
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        reasonTags: ['rest-protective'],
      }),
    })
    const softened = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 200_000 + 61 * 60_000,
      current: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        embodimentTone: 'measured-return',
        reasonTags: ['measured-return'],
      }),
    })

    expect(ledger.decayPolicy.mode).toBe('protect-rest-window')
    expect(held).toEqual(expect.objectContaining({
      phase: 'hold',
      shouldSuppressInitiative: true,
      initiativeMode: 'rest-guard',
      shouldDriveEmbodiment: true,
      embodimentTone: 'rest-protective',
      memoryWritebackLane: 'rest-protection',
    }))
    expect(held.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:protect-rest-window',
      'emotion-decay:rest-window-active',
    ]))
    expect(softened).toEqual(expect.objectContaining({
      phase: 'soften',
      shouldSuppressInitiative: true,
      initiativeMode: 'measured-return',
      shouldDriveEmbodiment: true,
      embodimentTone: 'measured-return',
      memoryWritebackLane: 'rest-protection',
    }))
    expect(softened.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:expired',
      'emotion-decay:rest-softening',
    ]))
  })

  it('cools measured-return approach pressure before fully releasing the emotional carry', () => {
    const ledger = buildAlicizationEmotionalTransitionLedger({
      createdAt: 300_000,
      previous: kernel({
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        embodimentTone: 'nearby-soft',
        valence: 0.68,
        arousal: 0.34,
        guardedness: 0.18,
        closenessDrive: 0.64,
        initiativePressure: 0.48,
        reasonTags: ['warmth-returned'],
      }),
      next: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.28,
        guardedness: 0.4,
        closenessDrive: 0.42,
        repairNeed: 0.14,
        initiativePressure: 0.18,
        reasonTags: ['measured-return', 'quiet-companionship'],
        why: 'Measured return should keep pressure lower before warmth widens.',
      }),
    })

    const held = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 300_000 + 8 * 60_000,
      current: kernel({
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        embodimentTone: 'measured-return',
        reasonTags: ['measured-return'],
      }),
    })
    const released = resolveAlicizationEmotionalTransitionDecay({
      ledger,
      now: 300_000 + 18 * 60_000,
      current: kernel({
        dominantEmotion: 'warm-attunement',
        initiativeMode: 'approach',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'nearby-soft',
        repairNeed: 0.06,
        initiativePressure: 0.46,
        reasonTags: ['warmth-returned'],
      }),
    })

    expect(ledger.decayPolicy.mode).toBe('cool-approach-pressure')
    expect(held).toEqual(expect.objectContaining({
      phase: 'hold',
      shouldSuppressInitiative: true,
      initiativeMode: 'measured-return',
      shouldDriveEmbodiment: true,
      embodimentTone: 'measured-return',
    }))
    expect(held.reasonTags).toEqual(expect.arrayContaining([
      'emotion-decay:cool-approach-pressure',
      'emotion-decay:within-window',
    ]))
    expect(released).toEqual(expect.objectContaining({
      phase: 'release',
      shouldSuppressInitiative: false,
      initiativeMode: 'none',
      shouldDriveEmbodiment: false,
      embodimentTone: null,
      memoryWritebackLane: 'none',
    }))
  })
})
