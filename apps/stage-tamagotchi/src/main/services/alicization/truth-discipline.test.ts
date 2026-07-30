import { describe, expect, it } from 'vitest'

import { deriveAlicizationTruthDiscipline } from './truth-discipline'

describe('truth-discipline', () => {
  it('treats dialogue-first turns as carry-blocking without exposing recall governance', () => {
    const flags = deriveAlicizationTruthDiscipline({
      answerSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      truthState: 'remembered',
      turnMode: 'answer',
      repairState: 'none',
      labelCarryAsMemory: true,
    })

    expect(flags.mode).toBe('dialogue-first')
    expect(flags.dialogueFirst).toBe(true)
    expect(flags.shouldBlockScreenCarry).toBe(true)
    expect(flags).not.toHaveProperty('shouldSuppressAssociativeRecall')
    expect(flags.reasonTags).not.toContain('suppress-associative-recall')
  })

  it('forces hypothesis and specificity discipline on coarse scene turns', () => {
    const flags = deriveAlicizationTruthDiscipline({
      answerSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      truthState: 'uncertain',
      turnMode: 'guide-current-knot',
      repairState: 'none',
      evidenceMode: 'coarse-held',
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'coarse-held',
        observedSurface: 'Git diff in Java editor',
        taskHypothesis: 'The host may be fixing a Java diff.',
        intentHypothesis: 'Separate observation from guess.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        updatedAt: 1,
      },
    })

    expect(flags.mode).toBe('observe-then-hypothesize')
    expect(flags.shouldLabelHypothesis).toBe(true)
    expect(flags.forbidUnsupportedSpecificity).toBe(true)
  })

  it('threads memory restraint into shared truth discipline flags', () => {
    const flags = deriveAlicizationTruthDiscipline({
      answerSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      truthState: 'remembered',
      turnMode: 'guide-current-knot',
      repairState: 'none',
      evidenceMode: 'continuity-carry',
      labelCarryAsMemory: true,
      memoryRestraint: {
        surfaceMode: 'inward-only',
        provenanceMode: 'reconstructed-memory',
        shouldStayInward: true,
        shouldOnlySurfaceStableCore: true,
        shouldLabelProvenance: true,
        shouldLabelHypothesis: true,
        shouldSuppressSpecificity: true,
        shouldDelayUntilAfterPayoff: true,
        withheldReasons: ['owner-inward-policy', 'payoff-required'],
      },
    })

    expect(flags.mode).toBe('memory-labeled')
    expect(flags.memorySurfaceMode).toBe('inward-only')
    expect(flags.memoryProvenanceMode).toBe('reconstructed-memory')
    expect(flags.shouldKeepMemoryInward).toBe(true)
    expect(flags.shouldOnlySurfaceMemoryStableCore).toBe(true)
    expect(flags.shouldLabelMemoryProvenance).toBe(true)
    expect(flags.shouldDelayMemoryUntilAfterPayoff).toBe(true)
    expect(flags.shouldLabelHypothesis).toBe(true)
    expect(flags.forbidUnsupportedSpecificity).toBe(true)
    expect(flags).not.toHaveProperty('shouldSuppressAssociativeRecall')
    expect(flags.reasonTags).not.toContain('suppress-associative-recall')
    expect(flags.memoryWithheldReasons).toEqual([
      'owner-inward-policy',
      'payoff-required',
    ])
    expect(flags.reasonTags).toEqual(expect.arrayContaining([
      'memory-surface:inward-only',
      'memory-provenance:reconstructed-memory',
      'memory-inward-only',
      'memory-stable-core-only',
      'memory-label-provenance',
      'memory-delay-until-payoff',
    ]))
  })
})
