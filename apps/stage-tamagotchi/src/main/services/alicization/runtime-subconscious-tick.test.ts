import { describe, expect, it } from 'vitest'

import {
  buildDeferredAutonomyContinuitySignalFallback,
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
  buildPresenceOnlyHoldInitiativeFallback,
  normalizeDeferredAutonomyContinuitySignal,
  stripPresenceOnlyLegacyProjectState,
} from './runtime-subconscious-tick'

const legacyGovernancePattern = /opening_policy|relationship_cadence|continuity_(?:hold|mode)|identity=runtime_personhood|same-her|same her|same living line|proactive-opening-guidance-carry|continuity-arc:|continuity-timing:|embodiment-carry:/iu

function expectNoLegacyGovernance(value: unknown) {
  expect(JSON.stringify(value ?? null)).not.toMatch(legacyGovernancePattern)
}

describe('presence-only subconscious continuity cleanup', () => {
  it('preserves existing remembered context without injecting hold prose into the projection', () => {
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
      openingGuidance: '',
      sameHerHoldDetail: null,
    }))
    expect(projection?.selfContinuityAuthority).toEqual(expect.objectContaining({
      sourceTags: ['long-term-memory-recall'],
    }))
    expect(projection?.selfContinuityAuthority?.inwardLine).toContain('用户昨晚谈到父亲时停顿了很久。')
    expect(projection?.selfContinuityAuthority?.inwardLine).not.toContain('用户刚重新打开了昨晚没有整理完的相册。')
    expect(projection?.selfContinuityAuthority?.inwardLine).not.toContain('先记得用户昨晚的停顿，不急着替他下结论。')
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
    expect(frame?.projectState).toEqual({})
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

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      deferredAt: 100,
      executionIntentSummary: null,
      failure: null,
    }))
    expect(signal.metadata).not.toHaveProperty('whyNow')
    expect(signal.metadata).not.toHaveProperty('projectIdentity')
    expect(signal.metadata).not.toHaveProperty('projectStatePreDialogueAwarenessLine')
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

  it('changes only structured hold fields without overwriting an existing initiative why', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        why: '真实模型摘要：用户刚刚说明了文件搜索失败的原因。',
        selectedAction: 'recheck',
        shouldSpeak: true,
        preferredStyle: 'warm',
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'Keep the opening lower-pressure while the same-her continuity settles.',
      },
      continuityRestraint: 'measured-return',
      projectContinuityCue: 'repair-before-closeness; same living line',
      privateThought: {
        thoughtText: '真实心智：先确认 Provider 的失败事实。',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      why: '真实模型摘要：用户刚刚说明了文件搜索失败的原因。',
      shouldSpeak: false,
      preferredStyle: 'silent-observe',
      selectedAction: 'recheck',
    }))
  })

  it('does not generate local thought text when a presence-only hold has no existing initiative', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: null,
      decision: {
        style: 'silent-observe',
        whyNow: 'Care is still present, but this presence-only hold is protecting rest first.',
      },
      continuityRestraint: 'rest-protective',
      projectContinuityCue: 'proactive_state=held_for_opening | phase=Phase 1',
      privateThought: {
        thoughtText: 'Keep the opening lower-pressure.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      why: null,
      shouldSpeak: false,
      preferredStyle: 'silent-observe',
      continuityRestraint: 'rest-protective',
    }))
  })

  it('does not replace conscious-frame prose while a hold changes structured state', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: '真实心智：用户在等待 Provider 的失败结果。',
        speakingIntention: '真实模型摘要：先说明失败，再决定是否继续。',
        reasonTags: ['working-memory'],
      },
      continuityRestraint: 'lower-pressure',
      holdDetail: 'Provider failed with HTTP 400.',
      projectStateCarry: {
        continuityCue: 'Keep the opening lower-pressure.',
      },
    })

    expect(frame).toEqual(expect.objectContaining({
      consciousNeed: '真实心智：用户在等待 Provider 的失败结果。',
      speakingIntention: '真实模型摘要：先说明失败，再决定是否继续。',
      reasonTags: ['working-memory'],
    }))
  })

  it('keeps deferred autonomy as structured metadata without local summary prose', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-deferred',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'unresolved=old governance carry',
        nextClosureTarget: 'next=keep the opening lower-pressure',
      },
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'Keep the opening lower-pressure while the same-her continuity settles.',
        sourceThreadId: 'thread-deferred',
        sourceThoughtThreadId: 'thought-deferred',
        sourceConcernId: 'concern-deferred',
        executionIntent: {
          kind: 'follow-through',
          summary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
          targetThreadId: 'thread-deferred',
        },
      },
    })

    expect(signal.summary).toBe('真实模型摘要：下次用户回来时继续检查 Provider 失败。')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      sourceThreadId: 'thread-deferred',
      sourceThoughtThreadId: 'thought-deferred',
      sourceConcernId: 'concern-deferred',
      intentId: 'follow-through',
      deferredAt: 100,
      deferReason: 'busy-host',
      executionIntentSummary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
    }))
    expect(signal.metadata).not.toHaveProperty('whyNow')
    expect(signal.metadata).not.toHaveProperty('projectPhase')
    expect(signal.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expect(signal.metadata).not.toHaveProperty('projectNextClosureTarget')
    expect(JSON.stringify(signal)).not.toMatch(/proactive_state=|phase=|unresolved=|Keep the opening lower-pressure|same-her/iu)
  })

  it('keeps provider failure facts in deferred metadata and summary', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 200,
      turnId: 'turn-provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'Provider failed with HTTP 503: upstream unavailable.',
      },
    })

    expect(signal.summary).toContain('Provider failed with HTTP 503: upstream unavailable.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      failure: 'Provider failed with HTTP 503: upstream unavailable.',
      deferredAt: 200,
    }))
  })

  it('normalizes an injected legacy deferred signal before it can reach session continuity', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'no mind-authored visible reply was available | Keep the opening lower-pressure | reason=provider-mind-unavailable-for-proactive-visible-utterance',
      signature: 'legacy-deferred',
      createdAt: 300,
      metadata: {
        source: 'proactive-deferred',
        turnId: 'turn-legacy',
        scenario: 'coding',
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        deferReason: 'busy-host',
        whyNow: 'Keep the opening lower-pressure.',
        sourceThreadId: 'thread-legacy',
        executionIntentKind: 'follow-through',
        executionIntentSummary: '真实模型摘要：回来后继续检查 Provider 失败。',
        projectPhase: 'Phase 1: Local Digital Life',
        projectPrimaryOpenLoop: 'unresolved=old governance carry',
      },
    })

    expect(signal).toEqual(expect.objectContaining({
      summary: '真实模型摘要：回来后继续检查 Provider 失败。',
      createdAt: 300,
    }))
    expect(signal?.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      threadId: 'thread-legacy',
      intentId: 'follow-through',
      deferredAt: 300,
      executionIntentSummary: '真实模型摘要：回来后继续检查 Provider 失败。',
    }))
    expect(signal?.metadata).not.toHaveProperty('whyNow')
    expect(signal?.metadata).not.toHaveProperty('projectPhase')
    expect(signal?.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expect(JSON.stringify(signal)).not.toMatch(/no mind-authored|Keep the opening lower-pressure|reason=|phase=|unresolved=/iu)
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
