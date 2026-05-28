import { describe, expect, it } from 'vitest'

import { deriveAlicizationResidentPerformanceSnapshot } from './alicization-resident-performance'

describe('alicization resident performance', () => {
  it('lets quiet accompaniment authority keep published main-runtime resident performance in a calm nearby-attention band', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentInwardPreoccupation: 'host sustained focus while keeping room honest',
      currentScene: {
        confidence: 0.72,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Quietly staying with the host through deep focus.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.7,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: ['companionship'],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(['calm', 'gentle']).toContain(snapshot.performance.delivery)
    expect(snapshot.performance.emphasis).toBeLessThanOrEqual(1)
    expect(['observe_focus', 'steady_focus', 'idle_gentle_nod']).toContain(snapshot.performance.actionCue)
    expect(snapshot.reasonTags).toContain('body:accompanying')
    expect(snapshot.reasonTags).toContain('continuity:quiet-accompaniment')
    expect(snapshot.signature).toContain('|accompanying|')
    expect(snapshot.signature).toContain('|quiet-accompaniment|')
  })

  it('lets protective-watch authority keep published main-runtime resident performance in low-pressure recovery care', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'recovering',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 90_000,
      currentInwardPreoccupation: 'hold low-pressure care while the room regains shape',
      currentScene: {
        confidence: 0.65,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'Holding a gentle recovery watch without pushing.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.68,
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        rationaleTags: ['recovery'],
        stance: 'care',
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(['tired', 'concerned']).toContain(snapshot.performance.baseEmotion)
    expect(snapshot.performance.delivery).toBe('gentle')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(snapshot.performance.facialCue)
    expect(['idle_settle', 'comfort_sway', 'idle_gentle_nod']).toContain(snapshot.performance.actionCue)
    expect(snapshot.reasonTags).toContain('body:recovering')
    expect(snapshot.reasonTags).toContain('continuity:protective-watch')
    expect(snapshot.signature).toContain('|recovering|')
    expect(snapshot.signature).toContain('|protective-watch|')
  })

  it('softens silent resident manifestation when self-evolution keeps relationship timing lower-pressure', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 40_000,
      currentInwardPreoccupation: 'trace the visible knot without crowding the room',
      currentScene: {
        confidence: 0.91,
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspecting a concrete runtime diff while staying nearby.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.88,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: ['inspection'],
        stance: 'observe',
      },
      relationshipTimingBias: {
        relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
        latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
        burdenLine: 'Do not crowd the host with eager re-entry.',
        trustMeaning: 'Measured warmth is being trusted because the timing stays lower-pressure.',
        nextLearningAction: 'internalize',
        evolutionMomentum: 0.84,
        learningReadiness: 0.78,
      },
      updatedAt: 1_000,
    } as any, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.baseEmotion).toBe('thinking')
    expect(snapshot.performance.delivery).toBe('calm')
    expect(snapshot.performance.emphasis).toBe(1)
    expect(snapshot.reasonTags).toContain('timing:lower-pressure-opening')
    expect(snapshot.reasonTags).toContain('timing-source:self-evolution')
  })
})
