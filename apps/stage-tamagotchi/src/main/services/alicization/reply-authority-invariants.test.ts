import { describe, expect, it } from 'vitest'

import { buildAlicizationExecutionPayoffDeterministicStructured, buildAlicizationExecutionPayoffStructuredReply, selectAlicizationExecutionDeliveryReply } from './execution-delivery-surface'
import { normalizeAlicizationActiveDialogueFastPathReplyOrEscalate } from './main-chat-active-dialogue-loop'
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
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'observed',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.replyRealizationMode).toBe('provider-mind-required')
    expect(result.contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(result.contract.mustDo).toContain('Fully realize the visible reply inside this provider-mind turn instead of leaving payoff wording for a later local fallback layer.')
    expect(result.contract.mustNotDo).toContain('Do not stop at a thin shell that assumes a local deterministic layer will finish the real visible reply for you.')
  })

  it('keeps inward-only recollection from stealing visible reply authority', () => {
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
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      recollectionSpeechPlan: {
        shouldSurface: false,
        surfaceMode: 'internal-only',
        placement: 'internal-only',
        certainty: 'approximate',
        internalLead: 'What comes back first is the seam we kept carrying.',
        visibleLead: null,
        styleNote: 'Keep the recall inward-only.',
        rationale: 'The answer should stay present-facing.',
        confidence: 0.81,
      },
    })

    expect(result.contract.recollectionLatentControls).toEqual(expect.arrayContaining([
      'recollection_surface_permission=inward-only',
    ]))
    expect(result.contract.mustNotDo).toContain('Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
  })

  it('keeps execution payoffs on normal reply authority for both llm and repaired paths', () => {
    const llmStructured = buildAlicizationExecutionPayoffStructuredReply({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
      emotion: 'thinking',
      delivery: 'calm',
      performance: {
        baseEmotion: 'thinking',
        facialCue: 'attentive',
        actionCue: 'focus',
        delivery: 'calm',
        emphasis: 0,
      },
    })
    const repairedStructured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'callback-delivery',
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
    })
    const selected = selectAlicizationExecutionDeliveryReply({
      channel: 'cli',
      goal: 'Patch the runtime line.',
      status: 'completed',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      llmReply: '',
    })

    expect((llmStructured as any).visibleReplyAuthority).toBe('llm-mind')
    expect((repairedStructured as any).visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(selected.source).toBe('llm-repaired')
    expect(selected.reason).toBe('missing-llm-reply')
  })

  it('escalates invalid utility-time compact replies instead of slipping into local deterministic wording', () => {
    expect(() => normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
      decision: {
        lane: 'utility-time',
        strategy: 'compact-one-shot',
        latestUserText: '后面按东京时间回答，现在几点了？',
        previousUserText: '',
        previousAssistantText: '',
        continuityAnchor: '',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        digitalLifeSpine: null,
        resolvedTimeZone: 'Asia/Tokyo',
        resolvedTimeZoneSource: 'user-directive',
        timeoutMs: 6500,
        reasonCodes: ['utility-time'],
      } as any,
      rawText: JSON.stringify({
        reply: '现在是 99:99，星期二。',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
      }),
    })).toThrow('active-dialogue-invalid-compact-reply:utility-time')
  })
})
