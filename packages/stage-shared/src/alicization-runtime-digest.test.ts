import { describe, expect, it } from 'vitest'

import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'
import { normalizeAlicizationRuntimeDigest } from './alicization-transport-contracts'

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(item => collectStringValues(item))

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(item => collectStringValues(item))

  return []
}

function expectNoFixedTemplateResidue(value: unknown) {
  for (const text of collectStringValues(value))
    expect(containsAlicizationFixedTemplateResidue(text), text).toBe(false)
}

describe('alicization-runtime-digest transport normalization', () => {
  it('preserves active-loop core fields while ignoring unknown sidecars', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'integrate',
        dominantChannel: 'active-memory',
        handoffTarget: 'active-memory',
        unknownDirective: 'unrecognized nested input',
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.68,
        coherence: 0.74,
        summary: 'integrating active memory handoff',
      },
      unknownSidecar: {
        instruction: 'unrecognized top-level input',
      },
      summary: 'active memory digest',
    })

    expect(digest?.activeLoop).toMatchObject({
      phase: 'integrate',
      dominantChannel: 'active-memory',
      handoffTarget: 'active-memory',
      dialogueReady: true,
      controlReady: false,
      memoryCarry: true,
      companionshipReady: true,
      observationHeavy: false,
      initiativeBudget: 0.68,
      coherence: 0.74,
      summary: 'integrating active memory handoff',
    })
    expect((digest?.activeLoop as Record<string, unknown> | undefined)?.unknownDirective).toBeUndefined()
    expect((digest as Record<string, unknown> | null)?.unknownSidecar).toBeUndefined()
    expectNoFixedTemplateResidue(digest)
  })

  it('drops unknown input while preserving runtime pressure fields', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      unknownSidecar: {
        instruction: 'unrecognized runtime input',
      },
      unknownDirective: 'unrecognized directive',
      continuityPressure: 1.2,
      companionshipPressure: 0.63,
      rulingMotive: 'memory-review',
      habitMode: 'quiet-return',
      truthDisciplinePressure: 0.8,
      boundaryPressure: -1,
      summary: 'active memory restraint evidence',
    })

    expect((digest as Record<string, unknown> | null)?.unknownSidecar).toBeUndefined()
    expect((digest as Record<string, unknown> | null)?.unknownDirective).toBeUndefined()
    expect(digest?.continuityPressure).toBe(1)
    expect(digest?.companionshipPressure).toBe(0.63)
    expect(digest?.rulingMotive).toBe('memory-review')
    expect(digest?.habitMode).toBe('quiet-return')
    expect(digest?.truthDisciplinePressure).toBe(0.8)
    expect(digest?.boundaryPressure).toBe(0)
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves current-conscious-frame transport fields that are not provider-facing templates', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'memory-grounded'],
        signature: 'embodiment:audible-continuity-line',
        focusAnchor: 'callback line after noisy detours',
        unknownDirective: 'unrecognized nested input',
      },
      summary: 'active memory digest',
    })

    expect(digest?.currentConsciousFrame?.reasonTags).toEqual([
      'runtime-conscious-frame',
      'memory-grounded',
    ])
    expect(digest?.currentConsciousFrame?.signature).toBe('embodiment:audible-continuity-line')
    expect(digest?.currentConsciousFrame?.focusAnchor).toBe('callback line after noisy detours')
    expect((digest?.currentConsciousFrame as Record<string, unknown> | undefined)?.unknownDirective).toBeUndefined()
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves emotional-kernel authority in runtime digest as structured emotional carry', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.48,
        arousal: 0.18,
        guardedness: 0.82,
        closenessDrive: 0.22,
        repairNeed: 0.41,
        initiativePressure: 0.16,
        reasonTags: [' late-night-drain ', ' continuity-review '],
        why: ' keep initiative, memory, and embodiment on one rest-protective reviewed line until the host settles ',
      },
      summary: 'active memory rest protective carry',
    })

    expect(digest?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['late-night-drain', 'continuity-review'],
      why: 'keep initiative, memory, and embodiment on one rest-protective reviewed line until the host settles',
    })
    expectNoFixedTemplateResidue(digest)
  })

  it('preserves affective residue and derived-mind-state affective residue together', () => {
    const digest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 33_333,
        residues: [
          {
            kind: 'afterglow',
            intensity: 0.73,
            persistence: 0.81,
            confidence: 0.88,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'quiet afterglow still prefers a measured return',
            sourceSignals: ['callback-afterglow', 'same-thread'],
            lastUpdatedAt: 33_333,
          },
        ],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.74,
        repairPressure: 0.17,
        burdenPressure: 0.08,
        trustPressure: 0.57,
        restProtectivePressure: 0.23,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.62,
          repairRecovery: 0.41,
          overreachRisk: 0.24,
          fatigueGuard: 0.29,
          afterglowCarry: 0.77,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-thread-continuation', 'callback-afterglow'],
          summary: 'measured-return until the callback afterglow settles',
        },
        sourceSignals: ['callback-afterglow', 'quiet-carry'],
        summary: 'afterglow still favors a measured return on the callback line',
      },
      derivedMindStateBundle: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 44_444,
          residues: [
            {
              kind: 'repair',
              intensity: 0.69,
              persistence: 0.79,
              confidence: 0.85,
              polarity: 'protective',
              releaseMode: 'delay-until-open-window',
              summary: 'repair residue still wants to keep the line quiet',
              sourceSignals: ['repair-before-closeness', 'same-thread'],
              lastUpdatedAt: 44_444,
            },
          ],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.18,
          repairPressure: 0.81,
          burdenPressure: 0.13,
          trustPressure: 0.45,
          restProtectivePressure: 0.27,
          relationshipCadence: {
            cadenceMode: 'repair',
            distancePosture: 'protect-space',
            companionshipDensity: 0.46,
            repairRecovery: 0.71,
            overreachRisk: 0.37,
            fatigueGuard: 0.33,
            afterglowCarry: 0.49,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
            summary: 'repair cadence still needs the line to stay quiet',
          },
          sourceSignals: ['repair-before-closeness', 'quiet-carry'],
          summary: 'repair residue still holds the callback line inward',
        },
      },
      summary: 'active memory affective residue',
    })

    expect(digest?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.affectiveResidue?.summary).toContain('callback line')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('callback line inward')
    expectNoFixedTemplateResidue(digest)
  })
})
