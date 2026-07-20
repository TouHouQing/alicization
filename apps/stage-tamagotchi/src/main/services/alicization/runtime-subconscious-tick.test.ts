import { describe, expect, it } from 'vitest'

import {
  buildDeferredAutonomyContinuitySignalFallback,
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
  buildPresenceOnlyHoldInitiativeFallback,
  stripPresenceOnlyLegacyProjectState,
} from './runtime-subconscious-tick'

const legacyGovernancePattern = /opening_policy|relationship_cadence|continuity_(?:hold|mode)|identity=runtime_personhood|same-her|same her|same living line|proactive-opening-guidance-carry|continuity-arc:|continuity-timing:|embodiment-carry:/iu

function expectNoLegacyGovernance(value: unknown) {
  expect(JSON.stringify(value ?? null)).not.toMatch(legacyGovernancePattern)
}

describe('presence-only subconscious continuity cleanup', () => {
  it('keeps natural remembered context without generating opening or continuity governance tags', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: {
        summary: '昨晚她答应今天继续陪用户整理照片。',
        manifestationCadenceSummary: null,
        openingGuidance: null,
        selfContinuityAuthority: {
          inwardLine: '用户昨晚谈到父亲时停顿了很久。',
          sourceTags: ['long-term-memory-recall'],
        },
      },
      continuityRestraint: 'measured-return',
      openingGuidance: '先记得用户昨晚的停顿，不急着替他下结论。',
      projectContinuityCue: null,
      initiativeWhy: '用户刚重新打开了昨晚没有整理完的相册。',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: '先记得用户昨晚的停顿，不急着替他下结论。',
      sameHerHoldDetail: null,
    }))
    expect(projection?.selfContinuityAuthority).toEqual(expect.objectContaining({
      sourceTags: ['long-term-memory-recall'],
    }))
    expect(projection?.selfContinuityAuthority?.inwardLine).toContain('用户昨晚谈到父亲时停顿了很久。')
    expect(projection?.selfContinuityAuthority?.inwardLine).toContain('用户刚重新打开了昨晚没有整理完的相册。')
    expectNoLegacyGovernance(projection)
  })

  it('does not synthesize project identity, closure, cadence, or reply intentions into a conscious frame', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['working-memory', 'long-term-memory-recall'],
        consciousNeed: '用户正在等待刚才文件搜索的结果。',
        speakingIntention: '拿到真实结果后再回答，不猜测。',
        projectState: {
          continuityCue: '用户上次希望按年份整理照片。',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: null,
      projectStateCarry: {
        continuityCue: '用户上次希望按年份整理照片。',
      },
    })

    expect(frame?.consciousNeed).toBe('用户正在等待刚才文件搜索的结果。')
    expect(frame?.speakingIntention).toBe('拿到真实结果后再回答，不猜测。')
    expect(frame?.reasonTags).toEqual(['working-memory', 'long-term-memory-recall'])
    expect(frame?.projectState).toEqual({
      continuityCue: '用户上次希望按年份整理照片。',
    })
    expectNoLegacyGovernance(frame)
  })

  it('drops historical governance pollution instead of converting it into a new carry', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-1',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        identity: 'identity=runtime_personhood',
        preDialogueAwarenessLine: 'opening_policy=continue_same_her',
        sameHerSelfLine: 'same-her project closure',
        sameHerHoldDetail: 'relationship_cadence=remembered_boundary',
        emotionalClosureCue: 'continuity_hold=measured_return',
      },
      autonomy: {
        whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
      },
    })

    expect(signal.summary).toContain('用户刚回到桌面，但没有需要主动打断的事情。')
    expect(signal.metadata).toEqual(expect.objectContaining({
      projectIdentity: null,
      projectStatePreDialogueAwarenessLine: null,
      projectStateSameHerSelfLine: null,
      projectStateSameHerHoldDetail: null,
      projectStateEmotionalClosureCue: null,
    }))
    expectNoLegacyGovernance(signal)
  })

  it('preserves a real provider failure while removing unrelated historical governance fields', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        identity: 'identity=runtime_personhood',
        sameHerHoldDetail: 'continuity_hold=measured_return',
      },
      autonomy: {
        executionIntent: {
          kind: 'report-failure',
          summary: 'Embedding provider failed with HTTP 400.',
        },
      },
    })

    expect(signal.summary).toContain('Embedding provider failed with HTTP 400.')
    expectNoLegacyGovernance(signal)
  })

  it('does not create an initiative from historical continuity cues alone', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: null,
      decision: null,
      continuityRestraint: null,
      projectContinuityCue: 'continuity_hold=repair_before_closeness; same-her project closure',
      privateThought: null,
    })

    expect(initiative).toBeNull()
  })

  it('removes legacy project governance before a presence-only runtime digest is persisted', () => {
    const projectState = stripPresenceOnlyLegacyProjectState({
      identity: 'identity=runtime_personhood',
      currentPhase: 'Phase 1: Local Digital Life',
      primaryOpenLoop: 'same-her project closure',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      runtimeFailure: 'Embedding provider failed with HTTP 400.',
    })

    expect(projectState).toEqual({
      runtimeFailure: 'Embedding provider failed with HTTP 400.',
    })
    expectNoLegacyGovernance(projectState)
  })
})
