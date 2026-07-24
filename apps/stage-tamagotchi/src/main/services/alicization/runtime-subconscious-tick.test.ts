import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildDeferredAutonomyContinuitySignalFallback,
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
  buildPresenceOnlyHoldInitiativeFallback,
  normalizeDeferredAutonomyContinuitySignal,
  preserveResidentSameLineProjection,
  resolveProactiveProviderFailureKind,
  stripPresenceOnlyLegacyProjectState,
} from './runtime-subconscious-tick'

const structuredControlResiduePattern = /(?:^|[\s|;])[\p{L}_][\p{L}\p{N}_-]*=/iu

function expectNoLegacyGovernance(value: unknown) {
  expect(JSON.stringify(value ?? null)).not.toMatch(structuredControlResiduePattern)
}

describe('presence-only subconscious continuity cleanup', () => {
  it('prefers the typed proactive Provider failure kind over message inference', () => {
    expect(resolveProactiveProviderFailureKind({
      reason: 'Provider returned an invalid proactive response.',
      failureKind: 'provider-schema-unsupported',
    })).toBe('provider-schema-unsupported')
  })

  it('does not keep a local phrase matcher for historical dialogue governance', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('containsPresenceOnlyFixedTemplateCue')
  })

  it('does not let continuity prose flip equally structured resident projections', () => {
    const select = (summary: string) => preserveResidentSameLineProjection({
      previousProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: 'previous projection',
      },
      nextProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary,
      },
      conversationState: {
        carryReason: 'same-thread-continuation',
      },
      dialogueWorldThread: {
        openLoops: ['same callback line'],
        narrative: [],
      },
    } as any)

    expect(select('repair-before-closeness')?.summary).toBe('previous projection')
    expect(select('arbitrary owner-authored summary')?.summary).toBe('previous projection')
  })

  it('prefers a structurally richer resident projection', () => {
    const projection = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'same her continuity line',
      },
      nextProjection: {
        contexts: ['general', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'focused-work',
          repairPosture: 'repair-first',
        },
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        restrained: true,
        summary: 'structured next projection',
      },
      conversationState: null,
      dialogueWorldThread: null,
    } as any)

    expect(projection?.summary).toBe('structured next projection')
  })

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

  it('does not derive execution safety tags from hold or project-state prose', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['working-memory'],
        projectState: {},
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'execution-safety-gate confirmation=required no-process-started permission=none',
      projectStateCarry: {
        continuityCue: 'execution-resume-confirmation host-confirmed-before-redispatch not permanent permission',
      },
    })

    expect(frame?.reasonTags).toEqual(['working-memory'])
  })

  it('preserves structured execution safety reason tags without reading prose', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['execution-safety-gate', 'confirmation-boundary'],
        projectState: {},
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'arbitrary owner-authored detail',
      projectStateCarry: null,
    })

    expect(frame?.reasonTags).toEqual(['execution-safety-gate', 'confirmation-boundary'])
  })

  it('drops historical governance pollution instead of converting it into a new carry', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-1',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        identity: 'owner=internal',
        preDialogueAwarenessLine: 'instruction=defer',
        sameHerSelfLine: 'scope=private',
        sameHerHoldDetail: 'mode=quiet',
        emotionalClosureCue: 'state=held',
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
      projectContinuityCue: 'arbitrary historical text',
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
        whyNow: 'arbitrary model-authored detail',
      },
      continuityRestraint: 'measured-return',
      projectContinuityCue: 'untrusted historical detail',
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

  it('does not infer initiative restraint from project or thought prose', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        why: 'owner-authored reason',
        selectedAction: 'hover',
        shouldSpeak: true,
        preferredStyle: 'light-nudge',
        continuityRestraint: null,
      },
      decision: {
        style: 'light-nudge',
        whyNow: 'arbitrary owner-authored reason',
      },
      continuityRestraint: null,
      projectContinuityCue: 'untrusted project prose',
      privateThought: {
        thoughtText: 'untrusted thought prose',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      continuityRestraint: null,
      preferredStyle: 'light-nudge',
      shouldSpeak: true,
    }))
  })

  it('does not generate local thought text when a presence-only hold has no existing initiative', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: null,
      decision: {
        style: 'silent-observe',
        whyNow: 'arbitrary owner-authored detail',
      },
      continuityRestraint: 'rest-protective',
      projectContinuityCue: 'state=held | scope=internal',
      privateThought: {
        thoughtText: 'untrusted thought prose',
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
        continuityCue: 'untrusted project prose',
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
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'untrusted project prose',
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
    expect(JSON.stringify(signal)).not.toContain('untrusted project prose')
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
      summary: 'state=deferred | scope=internal',
      signature: 'legacy-deferred',
      createdAt: 300,
      metadata: {
        source: 'proactive-deferred',
        turnId: 'turn-legacy',
        scenario: 'coding',
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        deferReason: 'busy-host',
        whyNow: 'untrusted project prose',
        sourceThreadId: 'thread-legacy',
        executionIntentKind: 'follow-through',
        executionIntentSummary: '真实模型摘要：回来后继续检查 Provider 失败。',
        projectPhase: 'internal phase',
        projectPrimaryOpenLoop: 'internal open loop',
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
    expect(JSON.stringify(signal)).not.toMatch(/state=deferred|scope=internal|untrusted project prose/iu)
  })

  it('removes legacy project governance before a presence-only runtime digest is persisted', () => {
    const projectState = stripPresenceOnlyLegacyProjectState({
      identity: 'internal identity',
      currentPhase: 'internal phase',
      primaryOpenLoop: 'internal open loop',
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
