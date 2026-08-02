import { describe, expect, it } from 'vitest'

import { deriveAlicizationResidentPerformanceSnapshot } from './alicization-resident-performance'

describe('alicization resident performance', () => {
  it('derives quiet accompaniment from structured body and emotional state', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentScene: {
        confidence: 0.72,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'The host is focused on a document.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.7,
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        rationaleTags: [],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    }, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      residentMode: 'quiet-accompaniment',
    }))
    expect(snapshot.performance.face?.residentMode).toBe('quiet-accompaniment')
    expect(snapshot.performance.action?.residentMode).toBe('quiet-accompaniment')
    expect(snapshot.reasonTags).toContain('body:accompanying')
    expect(snapshot.reasonTags).toContain('continuity:quiet-accompaniment')
  })

  it('derives recovery care from structured protective-watch authority', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'recovering',
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 90_000,
      currentScene: {
        confidence: 0.65,
        contentKind: 'chat',
        scenario: 'late-night-care',
        summary: 'The session is recovering.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.68,
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        rationaleTags: [],
        stance: 'care',
      },
      updatedAt: 1_000,
    }, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance).toEqual(expect.objectContaining({
      baseEmotion: 'tired',
      delivery: 'gentle',
      emphasis: 1,
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      residentMode: 'idle-recovering',
    }))
    expect(snapshot.performance.face?.residentMode).toBe('idle-recovering')
    expect(snapshot.performance.action?.residentMode).toBe('idle-recovering')
    expect(snapshot.reasonTags).toContain('body:recovering')
    expect(snapshot.reasonTags).toContain('continuity:protective-watch')
  })

  it('uses structured affective pressures without reading cadence prose or tags', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'invited-inspection',
      currentBodyState: 'noticing',
      continuityMode: 'ambient-covision',
      quietLineMs: 40_000,
      currentScene: {
        confidence: 0.91,
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspecting a concrete runtime diff.',
        workloadKind: 'coding',
      },
      privateThought: {
        shouldSpeak: false,
        confidence: 0.88,
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        rationaleTags: [],
        stance: 'observe',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_000,
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.12,
        repairPressure: 0.72,
        burdenPressure: 0.2,
        trustPressure: 0.38,
        restProtectivePressure: 0.18,
        relationshipCadence: {
          cadenceMode: 'ready-return',
          distancePosture: 'nearby-soft',
          companionshipDensity: 0.4,
          repairRecovery: 0.68,
          overreachRisk: 0.32,
          fatigueGuard: 0.24,
          afterglowCarry: 0.16,
          shouldDelayWarmth: false,
          shouldProtectRest: false,
          reasonTags: ['ignored-audit-tag'],
          summary: 'This prose is audit-only.',
        },
        sourceSignals: ['structured repair pressure'],
        summary: 'A structured residue snapshot.',
      },
      updatedAt: 1_000,
    }, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 1,
      residentMode: null,
    }))
    expect(snapshot.reasonTags).toContain('affect:repair')
    expect(snapshot.reasonTags).toContain('affect:recovery')
    expect(snapshot.reasonTags).toContain('affect:softened')
    expect(snapshot.reasonTags).not.toContain('ignored-audit-tag')
  })

  it('publishes dialogue mode only from structured speaking state', () => {
    const snapshot = deriveAlicizationResidentPerformanceSnapshot({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'speaking',
      continuityMode: 'active-dialogue',
      currentScene: {
        confidence: 0.8,
        contentKind: 'chat',
        scenario: 'general',
        summary: 'An active dialogue turn.',
        workloadKind: 'chat',
      },
      privateThought: {
        shouldSpeak: true,
        confidence: 0.82,
        embodiedPresence: 'attentive',
        emotionalTension: 'calm-browse',
        rationaleTags: [],
        stance: 'accompany',
      },
      updatedAt: 1_000,
    }, {
      source: 'main-runtime',
      fallbackUpdatedAt: 1_000,
    })

    expect(snapshot.performance.residentMode).toBe('dialogue')
    expect(snapshot.performance.face?.residentMode).toBe('dialogue')
    expect(snapshot.performance.action?.residentMode).toBe('dialogue')
  })
})
