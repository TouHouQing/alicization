import { describe, expect, it, vi } from 'vitest'

import {
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
} from './outcome-reinforcement'
import { createAlicizationRuntimeMemoryClosure } from './runtime-memory-closure'

interface MindTurnWriteback {
  payload?: Record<string, unknown>
  [key: string]: unknown
}

type JsonRecord = Record<string, unknown>

function createRuntimeFixture(input: {
  activeCardId?: string
  previousSurface?: unknown
} = {}) {
  const appendRelationshipOutcomes = vi.fn(async () => {})
  const appendEpisodicEvents = vi.fn(async (events: unknown[]) => events)
  const appendPersonaReinforcementEvents = vi.fn(async () => {})
  const appendPersonStateEvolutionEntries = vi.fn(async () => {})
  const upsertMemoryReflections = vi.fn(async () => {})
  const upsertMemoryFacts = vi.fn(async () => {})
  const applyMemoryFactCorrections = vi.fn(async () => {})
  const listMemoryFacts = vi.fn(async () => [])
  const readMindHead = vi.fn(
    async (_cardId: string, _key: 'person-state-update-surface') => input.previousSurface ?? null,
  ) as unknown as <T>(cardId: string, key: 'person-state-update-surface') => Promise<T | null>
  const upsertMindHead = vi.fn(async () => {})
  const appendMindTurnEvents = vi.fn(async (_events: MindTurnWriteback[]) => {})
  const appendAuditLog = vi.fn(async () => {})
  const withCardScope = vi.fn()

  const runWithCardScope = async <T>(
    cardId: unknown,
    task: () => Promise<T>,
    options?: unknown,
  ) => {
    withCardScope(cardId, options)
    return await task()
  }

  const runtime = createAlicizationRuntimeMemoryClosure({
    now: () => 50_000,
    normalizeCardId: raw => String(raw ?? '').trim() || 'default',
    getActiveCardId: () => input.activeCardId ?? 'default',
    withCardScope: runWithCardScope,
    errorMessageFrom: error => error instanceof Error ? error.message : String(error),
    ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:test:closure',
    knowledgeAssimilationRuntime: {
      assimilateMemoryFacts: factsInput => factsInput.facts,
      assimilateMemoryFactsDetailed: factsInput => ({
        facts: factsInput.facts.map(fact => ({
          ...fact,
          knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
          validationStatus: fact.validationStatus ?? 'unverified',
          sourceLabel: fact.sourceLabel ?? '',
          conflictsWith: fact.conflictsWith ?? [],
          supersedes: fact.supersedes ?? [],
        })),
        corrections: [],
      }),
    },
    appendAuditLog,
    alicizationDb: {
      appendRelationshipOutcomes,
      appendEpisodicEvents,
      appendPersonaReinforcementEvents,
      appendPersonStateEvolutionEntries,
      upsertMemoryReflections,
      upsertMemoryFacts,
      applyMemoryFactCorrections,
      listMemoryFacts,
      readMindHead,
      upsertMindHead,
      appendMindTurnEvents,
    },
  })

  return {
    runtime,
    appendRelationshipOutcomes,
    appendEpisodicEvents,
    appendPersonaReinforcementEvents,
    appendPersonStateEvolutionEntries,
    upsertMemoryReflections,
    upsertMemoryFacts,
    applyMemoryFactCorrections,
    listMemoryFacts,
    readMindHead,
    upsertMindHead,
    appendMindTurnEvents,
    appendAuditLog,
    withCardScope,
  }
}

function createReplySurface(extra: JsonRecord = {}) {
  return {
    world: {
      worldModel: {
        hostState: {
          availability: 'open',
        },
      },
    },
    dialogue: {
      answerPlanner: {
        answerIntent: 'answer the current message',
      },
    },
    ...extra,
  } as unknown as Parameters<typeof buildReplyOutcomeClosure>[0]['runtimeSurface']
}

function latestMindTurnPayloads(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls
    .flatMap(call => Array.isArray(call[0]) ? call[0] : [])
    .map(event => (event && typeof event === 'object' ? (event as MindTurnWriteback).payload : null))
    .filter((payload): payload is Record<string, unknown> => Boolean(payload))
}

function allWrittenValues(fixture: ReturnType<typeof createRuntimeFixture>) {
  return [
    fixture.appendRelationshipOutcomes.mock.calls,
    fixture.appendEpisodicEvents.mock.calls,
    fixture.appendPersonaReinforcementEvents.mock.calls,
    fixture.appendPersonStateEvolutionEntries.mock.calls,
    fixture.upsertMemoryReflections.mock.calls,
    fixture.upsertMemoryFacts.mock.calls,
    fixture.upsertMindHead.mock.calls,
    fixture.appendMindTurnEvents.mock.calls,
  ]
}

function memorySurfaceWrites(fixture: ReturnType<typeof createRuntimeFixture>) {
  return [
    fixture.appendEpisodicEvents.mock.calls,
    fixture.upsertMemoryReflections.mock.calls,
    fixture.upsertMindHead.mock.calls,
    fixture.appendMindTurnEvents.mock.calls,
  ]
}

function collectKeys(value: unknown, result: string[] = []) {
  if (Array.isArray(value)) {
    for (const item of value)
      collectKeys(item, result)
    return result
  }
  if (!value || typeof value !== 'object')
    return result

  for (const [key, nested] of Object.entries(value)) {
    result.push(key)
    collectKeys(nested, result)
  }
  return result
}

function expectNoRetiredSurfaceKeys(value: unknown) {
  const retiredPrefix = ['project', 'State'].join('')
  const retiredCadenceKey = ['project', 'Cadence'].join('')
  expect(collectKeys(value).filter(key =>
    key.startsWith(retiredPrefix)
    || key === retiredCadenceKey,
  )).toEqual([])
}

function expectNoValue(value: unknown, text: string) {
  expect(JSON.stringify(value)).not.toContain(text)
}

describe('runtime memory closure', () => {
  it('把真实对话与主人反馈写成可审计记忆和状态更新，不再生成本地人格候选', async () => {
    const fixture = createRuntimeFixture()
    const userText = '我刚才是在说这个具体问题。'
    const assistantText = '我先回应你真正指出的部分。'
    const feedbackText = '这次回答抓住了我的重点。'

    await fixture.runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 49_900,
      cardId: 'default',
      turnId: 'turn-reply',
      sessionId: 'session-dialogue',
      decisionTraceId: 'trace-reply',
      userText,
      assistantText,
      runtimeSurface: createReplySurface(),
    }))

    await fixture.runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 49_950,
      cardId: 'default',
      turnId: 'turn-feedback',
      sessionId: 'session-dialogue',
      decisionTraceId: 'trace-feedback',
      feedback: 'received',
      userText: feedbackText,
      previousAssistantText: assistantText,
    }))

    const memoryWrites = JSON.stringify([
      fixture.appendEpisodicEvents.mock.calls,
      fixture.upsertMemoryReflections.mock.calls,
      fixture.upsertMindHead.mock.calls,
    ])
    expect(memoryWrites).toContain(userText)
    expect(memoryWrites).toContain(assistantText)
    expect(memoryWrites).toContain(feedbackText)
    expect(latestMindTurnPayloads(fixture.appendMindTurnEvents)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          humanlikeMemoryCandidate: expect.anything(),
        }),
      ]),
    )
    expect(fixture.appendMindTurnEvents.mock.calls.flatMap(call => call[0] ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'person-state-updated',
      }),
    ]))
    expect(fixture.upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        version: 'person-state-update-surface-v1',
      }),
    )
  })

  it('把工具失败、安全拒绝和主人确认作为同一条执行记忆中的真实证据保留下来', async () => {
    const fixture = createRuntimeFixture()
    const providerFailure = 'tool failed:17'
    const deniedEvidence = 'safety:denied'
    const confirmationEvidence = 'resume:confirmed'
    const executionClosure = buildExecutionResultFeedbackOutcomeClosure({
      now: 49_700,
      cardId: 'default',
      turnId: 'turn-execution',
      sessionId: 'session-execution',
      decisionTraceId: 'trace-execution',
      feedback: 'doubted',
      thread: {
        threadId: 'thread-execution',
        goal: 'verify the local process',
        proposedChannel: 'executor',
        selectedChannel: 'executor',
        summary: providerFailure,
        outcome: providerFailure,
        userText: '先停下。',
        previousAssistantText: '工具返回失败。',
        safetyGateSummary: deniedEvidence,
        resumeConfirmationSummary: confirmationEvidence,
      } as Parameters<typeof buildExecutionResultFeedbackOutcomeClosure>[0]['thread'],
    })

    await fixture.runtime.persistOutcomeClosure('default', executionClosure)

    expect(JSON.stringify(fixture.appendEpisodicEvents.mock.calls)).toContain(providerFailure)
    expect(JSON.stringify(fixture.upsertMemoryFacts.mock.calls)).toContain(deniedEvidence)
    expect(JSON.stringify(fixture.upsertMemoryFacts.mock.calls)).toContain(confirmationEvidence)
    expect(JSON.stringify(fixture.appendPersonaReinforcementEvents.mock.calls)).not.toContain(providerFailure)
    expect(JSON.stringify(fixture.appendMindTurnEvents.mock.calls)).not.toContain('humanlikeMemoryCandidate')
  })

  it('只带中性旧噪音时不会生成旧字段、节奏状态、固定 lesson 或人格强化内容', async () => {
    const fixture = createRuntimeFixture()
    const marker = 'legacy-governance-payload-ignored'
    const retiredPrefix = ['project', 'State'].join('')
    const legacySurface = {
      raw: {
        legacyEnvelope: {
          marker,
          [`${retiredPrefix}Legacy`]: marker,
          nested: {
            noise: marker,
          },
        },
      },
      dialogue: {
        currentConsciousFrame: {
          marker,
        },
      },
    }

    await fixture.runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 49_500,
      cardId: 'default',
      turnId: 'turn-noise',
      sessionId: 'session-noise',
      decisionTraceId: 'trace-noise',
      userText: '请处理当前输入。',
      assistantText: '我只根据当前输入回应。',
      runtimeSurface: createReplySurface(legacySurface),
    }))

    for (const writes of allWrittenValues(fixture)) {
      expectNoValue(writes, marker)
      expectNoRetiredSurfaceKeys(writes)
    }

    const reinforcementWrites = fixture.appendPersonaReinforcementEvents.mock.calls.flat()
    expect(JSON.stringify(reinforcementWrites)).not.toContain(marker)
    expect(reinforcementWrites).not.toEqual(expect.arrayContaining([
      expect.arrayContaining([
        expect.objectContaining({
          summary: marker,
        }),
      ]),
    ]))
  })

  it('在 person-state、mind-turn、episode 和 reflection 四个写入面递归清除旧字段', async () => {
    const fixture = createRuntimeFixture()
    const retiredPrefix = ['project', 'State'].join('')
    const cadenceKey = ['project', 'Cadence'].join('')
    const closure = buildReplyOutcomeClosure({
      now: 49_300,
      cardId: 'default',
      turnId: 'turn-surface-sanitize',
      sessionId: 'session-surface-sanitize',
      decisionTraceId: 'trace-surface-sanitize',
      userText: '请记住这次真实反馈。',
      assistantText: '我会把这次真实反馈留在可追踪记忆里。',
      runtimeSurface: createReplySurface(),
    })
    const injectRetiredKeys = (value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return
      const record = value as JsonRecord
      record[`${retiredPrefix}Injected`] = 'must be removed'
      record[cadenceKey] = 'must be removed'
    }

    injectRetiredKeys(closure.relationshipOutcomes[0])
    injectRetiredKeys(closure.reinforcementEvents[0])
    injectRetiredKeys(closure.episodicEvents[0])
    closure.reflections.push({
      cardId: 'default',
      decisionTraceId: 'trace-surface-sanitize',
      turnId: 'turn-surface-sanitize',
      sessionId: 'session-surface-sanitize',
      sourceKind: 'reply',
      targetScope: 'relationship',
      summary: 'A real reflection remains inspectable.',
      lesson: 'Keep only evidence that came from this turn.',
      confidence: 0.8,
      [`${retiredPrefix}ReflectionInjected`]: 'must be removed',
      [cadenceKey]: 'must be removed',
    } as never)

    await fixture.runtime.persistOutcomeClosure('default', closure)

    expect(fixture.upsertMindHead).toHaveBeenCalled()
    expect(fixture.appendMindTurnEvents).toHaveBeenCalled()
    expect(fixture.appendEpisodicEvents).toHaveBeenCalled()
    expect(fixture.upsertMemoryReflections).toHaveBeenCalled()
    for (const writes of memorySurfaceWrites(fixture))
      expectNoRetiredSurfaceKeys(writes)
  })

  it('不把失败回退文本或原始转录复制进人格强化写入', async () => {
    const fixture = createRuntimeFixture()
    const failureText = 'provider timeout after 15000ms'
    const rawTranscript = 'raw transcript: user asked for a direct answer; no summary was approved'

    await fixture.runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 49_100,
      cardId: 'default',
      turnId: 'turn-failure-boundary',
      sessionId: 'session-failure-boundary',
      decisionTraceId: 'trace-failure-boundary',
      userText: rawTranscript,
      assistantText: failureText,
      runtimeSurface: createReplySurface({
        dialogue: {
          answerPlanner: {
            answerIntent: 'report the provider timeout',
          },
        },
      }),
    }))

    const reinforcementWrites = fixture.appendPersonaReinforcementEvents.mock.calls
    expect(reinforcementWrites).toEqual([])
    expect(JSON.stringify(reinforcementWrites)).not.toContain(failureText)
    expect(JSON.stringify(reinforcementWrites)).not.toContain(rawTranscript)
    expect(JSON.stringify(fixture.appendEpisodicEvents.mock.calls)).toContain(failureText)
  })

  it('不把情绪或具身 ledger 自动包装成长期事件和确认反思', async () => {
    const fixture = createRuntimeFixture()

    await fixture.runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
      emotionalTransitionLedger: {
        createdAt: 48_900,
        turnId: 'turn-ledger',
        previousEmotion: 'neutral',
        nextEmotion: 'focused',
        transitionKind: 'focus-shift',
        changedAxes: ['arousal'],
        decayPolicy: {
          mode: 'time-window',
          carryTtlMs: 60_000,
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'emotional-continuity',
          reason: 'runtime-ledger-evidence',
        },
        initiativeSuppression: {
          mode: 'none',
          reason: 'runtime-ledger-evidence',
        },
        embodimentDrive: {
          shouldDrive: false,
          tone: null,
          reason: 'runtime-ledger-evidence',
        },
        traceSummary: 'runtime-ledger-evidence',
        replayLine: 'runtime-ledger-evidence',
      },
      embodimentContinuityLedger: {
        createdAt: 48_900,
        turnId: 'turn-ledger',
        continuityPhase: 'partial-carry',
        carryingLanes: ['body'],
        droppedLanes: ['face'],
        pendingRejoinLanes: ['face'],
        rejoinedLanes: [],
        sourceTags: ['renderer-diagnostics'],
        memoryWriteback: {
          shouldWrite: true,
          lane: 'cross-modal-continuity',
          reason: 'runtime-ledger-evidence',
        },
        selfRevisionCandidate: {
          shouldPropose: true,
          reasonCodes: ['embodiment-lane-dropped:face'],
        },
        traceSummary: 'runtime-ledger-evidence',
        replayLine: 'runtime-ledger-evidence',
      },
    } as never)

    expect(fixture.appendEpisodicEvents).not.toHaveBeenCalled()
    expect(fixture.upsertMemoryReflections).not.toHaveBeenCalled()
    expect(fixture.appendPersonaReinforcementEvents).not.toHaveBeenCalled()
    expect(fixture.appendMindTurnEvents).not.toHaveBeenCalled()
  })

  it('非活动 card 的 autobiographical backfill 仍通过 card scope 持久化', async () => {
    const fixture = createRuntimeFixture({
      activeCardId: 'active-card',
    })

    await fixture.runtime.persistAutobiographicalEpisodes('other-card', {
      label: 'session-mirror.autobio',
      events: [{
        cardId: 'other-card',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: 49_000,
        withWhom: ['host'],
        threadAnchor: 'a real execution thread',
        whatHappened: 'The other card received a scoped autobiographical backfill.',
        confidence: 0.76,
      }],
    })

    expect(fixture.withCardScope).toHaveBeenCalledWith(
      'other-card',
      expect.objectContaining({
        label: 'session-mirror.autobio:other-card',
      }),
    )
    expect(fixture.appendEpisodicEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'other-card',
        sourceKind: 'maintenance',
      }),
    ]))
  })
})
