import { describe, expect, it } from 'vitest'

import { deriveAlicizationTruthDiscipline } from './truth-discipline'

describe('truth-discipline', () => {
  it('treats dialogue-first turns as carry-blocking without forcing recall suppression', () => {
    const flags = deriveAlicizationTruthDiscipline({
      answerSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      truthState: 'remembered',
      turnMode: 'answer',
      repairState: 'none',
      labelCarryAsMemory: true,
      suppressAssociativeRecall: false,
    })

    expect(flags.mode).toBe('dialogue-first')
    expect(flags.dialogueFirst).toBe(true)
    expect(flags.shouldBlockScreenCarry).toBe(true)
    expect(flags.shouldSuppressAssociativeRecall).toBe(false)
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
})
