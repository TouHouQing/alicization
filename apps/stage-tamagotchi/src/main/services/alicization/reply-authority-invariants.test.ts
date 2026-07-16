import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { selectAlicizationExecutionDeliveryReply } from './execution-delivery-surface'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'

describe('reply authority invariants', () => {
  it('keeps normal reply contracts on provider-mind authority instead of a later local wording layer', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: null,
        truthState: 'live-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'grounded-live',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the current host turn directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        activeClosenessContext: null,
        activeClosenessRung: null,
        relationshipPosture: 'warm',
      },
    })

    expect(result.contract.replyRealizationMode).toBe('provider-mind-required')
    expect(result.contract.expectedVisibleReplyAuthority).toBe('llm-mind')
  })

  it('keeps inward-only recollection out of the visible reply contract', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'runtime seam',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Let remembered continuity shape the answer without opening a retrospective shell.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        activeClosenessContext: null,
        activeClosenessRung: null,
        relationshipPosture: 'warm',
      },
      recollectionSpeechPlan: {
        shouldSurface: false,
        surfaceMode: 'internal-only',
        placement: 'internal-only',
        certainty: 'approximate',
        rationale: 'The answer should stay present-facing.',
        confidence: 0.81,
      },
    })

    expect(Object.keys(result.contract).some(key => key.toLowerCase().includes('recollection'))).toBe(false)
  })

  it('keeps execution payoff pending until the Provider settles visible text', () => {
    const pending = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '',
    })
    const settled = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: 'The runtime line is patched.',
    })

    expect(pending).toEqual({
      status: 'pending-provider-settlement',
      reason: 'missing-provider-reply',
    })
    expect(settled).toEqual({
      status: 'settled',
      source: 'llm',
      visibleReply: 'The runtime line is patched.',
    })
  })

  it('keeps settlement validation-only without a second Provider authorship path', () => {
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')
    const settlementSource = readFileSync(new URL('./visible-reply/settlement.ts', import.meta.url), 'utf8')

    expect(backgroundSource).not.toContain('forceMustPreserve')
    expect(backgroundSource).not.toContain('rewriteAlicizationVisibleReplySecondPass')
    expect(backgroundSource).not.toContain('rewriteSecondPass')
    expect(settlementSource).not.toContain('forceMustPreserve')
    expect(settlementSource).not.toContain('rewriteSecondPass')
    expect(settlementSource).toContain('provider-settlement-invalid:')
  })
})
