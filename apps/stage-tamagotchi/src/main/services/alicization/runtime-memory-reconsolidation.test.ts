import { describe, expect, it, vi } from 'vitest'

import {
  buildDialogueFeedbackReconsolidationRationale,
  collectRecallTelemetryTexts,
  collectReplyMemoryCoherenceState,
  createAlicizationRuntimeMemoryReconsolidation,
} from './runtime-memory-reconsolidation'

function buildFeedbackOutcomeClosure(input: {
  sourceKind: 'dialogue-feedback' | 'execution-result'
  cardId?: string
  decisionTraceId: string
  turnId: string
  sessionId: string
  felt?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  tags?: string[]
}) {
  return {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    reflections: [],
    episodicEvents: [{
      cardId: input.cardId ?? 'card-1',
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: input.sourceKind,
      felt: input.felt ?? null,
      relationshipMeaning: input.relationshipMeaning ?? null,
      lesson: input.lesson ?? null,
      tags: input.tags ?? [],
    }],
  } as any
}

function buildCompletedExecutionResult(input: {
  cardId?: string
  threadId?: string
  decisionTraceId: string
  turnId: string
  sessionId: string
  goal: string
  outcome?: string | null
}) {
  return {
    provenance: 'execution-ledger' as const,
    status: 'completed' as const,
    cardId: input.cardId ?? 'card-1',
    threadId: input.threadId ?? `thread:${input.turnId}`,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    goal: input.goal,
    outcome: input.outcome ?? null,
  }
}

describe('runtime memory reconsolidation', () => {
  it('collects recall telemetry and coherence state from mind events', () => {
    const recallTexts = collectRecallTelemetryTexts({
      untrustedText: 'control-plane-only',
      selectedEpisodes: [{
        summary: 'we repaired the runtime state',
        untrustedText: 'control-plane-only',
      }],
      selectedRelationshipLines: ['host expects the correction to persist'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)
    const coherence = collectReplyMemoryCoherenceState({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      explicitSurfaceExpected: true,
      explicitSurfaceObserved: false,
      matchedCueKinds: ['episode', 'procedure'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)

    expect(recallTexts).toEqual([
      'we repaired the runtime state',
      'host expects the correction to persist',
    ])
    expect(recallTexts).not.toContain('control-plane-only')
    expect(coherence).toEqual(expect.objectContaining({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      matchedCueKinds: ['episode', 'procedure'],
    }))
    expect(buildDialogueFeedbackReconsolidationRationale('robotic')).toBe('source=dialogue-feedback | feedback=robotic')
  })

  it('does not accept ad hoc feedback experience without an outcome closure', async () => {
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-raw-experience' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listMindTurnEvents: vi.fn(async () => [{
          kind: 'recall-attribution',
          payload: {
            selectedEpisodes: [{ summary: 'trusted recalled episode' }],
          },
        }]),
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-ad-hoc-experience',
      feedback: 'robotic',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
      outcomeClosure: null,
      feedbackExperience: {
        felt: 'RAW_USER_TRANSCRIPT_NORMALIZED',
        relationshipMeaning: 'raw user transcript normalized',
        lesson: 'raw transcript passed through a renamed field',
        tags: ['untrusted'],
      },
    } as any)

    expect(searchEpisodicEvents).not.toHaveBeenCalled()
    expect(appendMindTurnEvents).not.toHaveBeenCalled()
  })

  it('does not reconsolidate blocked execution evidence without a trusted completed result', async () => {
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-blocked' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listMindTurnEvents: vi.fn(async () => []),
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-blocked',
      feedback: 'interrupted',
      sessionId: 'session-1',
      turnId: 'turn-blocked',
      at: 20,
      executionResult: {
        provenance: 'execution-ledger',
        status: 'blocked',
        threadId: 'thread-blocked',
        decisionTraceId: 'trace-blocked',
        turnId: 'turn-blocked',
        sessionId: 'session-1',
        goal: 'must not enter recall',
        outcome: 'blocked before dispatch',
      },
      outcomeClosure: null,
      safetyGateSummary: 'confirmation=required',
    } as any)

    expect(searchEpisodicEvents).not.toHaveBeenCalled()
    expect(appendMindTurnEvents).not.toHaveBeenCalled()
  })

  it('does not pair a trusted execution result with an outcome closure from another owner', async () => {
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-cross-owner' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listMindTurnEvents: vi.fn(async () => []),
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      feedback: 'valued',
      at: 30,
      executionResult: buildCompletedExecutionResult({
        decisionTraceId: 'trace-owner-a',
        turnId: 'turn-owner-a',
        sessionId: 'session-owner-a',
        goal: 'complete trusted work',
        outcome: 'done',
      }),
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'execution-result',
        decisionTraceId: 'trace-owner-b',
        turnId: 'turn-feedback-owner-b',
        sessionId: 'session-owner-b',
        felt: 'This belongs to another execution owner.',
        relationshipMeaning: 'Cross-owner evidence must not merge.',
        lesson: 'Keep execution memory scoped.',
        tags: ['execution-result'],
      }),
    })

    expect(searchEpisodicEvents).not.toHaveBeenCalled()
    expect(appendMindTurnEvents).not.toHaveBeenCalled()
  })

  it('does not pair dialogue feedback with an outcome closure from another owner', async () => {
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-cross-owner-dialogue' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog: vi.fn(async () => {}),
      alicizationDb: {
        listMindTurnEvents: vi.fn(async () => [{
          kind: 'recall-attribution',
          payload: {
            selectedEpisodes: [{ summary: 'trusted recalled episode' }],
          },
        }]),
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: ' card-1 ',
      decisionTraceId: ' trace-owner-a ',
      feedback: 'robotic',
      sessionId: ' session-owner-a ',
      turnId: ' turn-owner-a ',
      at: 35,
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'dialogue-feedback',
        cardId: 'card-1',
        decisionTraceId: 'trace-owner-b',
        turnId: 'turn-owner-b',
        sessionId: 'session-owner-b',
        felt: 'This belongs to another dialogue owner.',
        relationshipMeaning: 'Cross-owner dialogue evidence must not merge.',
        lesson: 'Keep dialogue memory scoped.',
        tags: ['dialogue-feedback'],
      }),
    })

    expect(searchEpisodicEvents).not.toHaveBeenCalled()
    expect(appendMindTurnEvents).not.toHaveBeenCalled()
  })

  it('reconsolidates dialogue feedback and appends a memory-reconsolidated mind event', async () => {
    const listMindTurnEvents = vi.fn(async () => [
      {
        kind: 'recall-attribution',
        payload: {
          whyNow: 'the host corrected an inaccurate recollection',
          selectedEpisodeSummaries: ['上一轮遗漏了关键事实'],
          selectedSituations: [{
            id: 'memory-situation:dialogue-correction',
            kind: 'mixed',
            summary: 'dialogue correction evidence',
            evidenceSummary: 'relationship-context=the host corrected an inaccurate recollection | host-attitude=宿主希望更正被记录并在相似场景中可召回 | affective-residue=unfinished correction pressure remains | execution-carry=patch verification completed | embodiment-carry=slower blink and steadier gaze',
            statusReason: 'graph-selected-current-line',
            sourceKinds: ['event-graph', 'episodic-event', 'relationship', 'procedure', 'self-model'],
          }],
        },
      },
      {
        kind: 'reply-memory-coherence',
        payload: {
          coherenceState: 'missed',
          matchedCueKinds: ['episode'],
        },
      },
    ])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })
    const dialogueOutcomeClosure = buildFeedbackOutcomeClosure({
      sourceKind: 'dialogue-feedback',
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      felt: 'The recalled detail did not match the event.',
      relationshipMeaning: 'The host corrected an inaccurate recollection.',
      lesson: 'Store the correction with its evidence and retrieval scope.',
      tags: ['dialogue-feedback', 'feedback:robotic', 'body-steady-gaze', 'residue-correction-pressure'],
    })
    dialogueOutcomeClosure.episodicEvents.unshift({
      ...dialogueOutcomeClosure.episodicEvents[0],
      decisionTraceId: 'trace-other-owner',
      turnId: 'turn-other-owner',
      sessionId: 'session-other-owner',
      felt: 'WRONG_OWNER_EXPERIENCE_MUST_NOT_ENTER_RECONSOLIDATION',
      relationshipMeaning: 'Wrong owner relationship meaning.',
      lesson: 'Wrong owner lesson.',
    })

    await runtime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
      outcomeClosure: dialogueOutcomeClosure,
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'trace-1',
      limit: 24,
    })
    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'trace-1',
      affectAnchors: expect.arrayContaining([
        'experience-tag:body-steady-gaze',
        'experience-tag:residue-correction-pressure',
        'situation-affective-residue:unfinished correction pressure remains',
        'situation-execution-carry:patch verification completed',
        'situation-embodiment-carry:slower blink and steadier gaze',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'dialogue-feedback:robotic',
        'The host corrected an inaccurate recollection.',
        'the host corrected an inaccurate recollection',
        '宿主希望更正被记录并在相似场景中可召回',
      ]),
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
        rationale: 'source=dialogue-feedback | feedback=robotic',
        queryHints: expect.arrayContaining([
          'The recalled detail did not match the event.',
          'Store the correction with its evidence and retrieval scope.',
          'dialogue correction evidence',
          'relationship-context=the host corrected an inaccurate recollection | host-attitude=宿主希望更正被记录并在相似场景中可召回 | affective-residue=unfinished correction pressure remains | execution-carry=patch verification completed | embodiment-carry=slower blink and steadier gaze',
        ]),
      }),
    }))
    const searchCalls = searchEpisodicEvents.mock.calls as unknown as Array<
      [{
        recallSeed?: string
        relationshipAnchors?: string[]
        recollectionIntent?: {
          queryHints?: string[]
          recollectionAgenda?: unknown
        }
      }]
    >
    const dialogueSearchInput = searchCalls[0]?.[0]
    expect(dialogueSearchInput?.recallSeed).toBe([
      'feedback:robotic',
      'The recalled detail did not match the event.',
      'The host corrected an inaccurate recollection.',
      'Store the correction with its evidence and retrieval scope.',
      'dialogue correction evidence',
      'relationship-context=the host corrected an inaccurate recollection | host-attitude=宿主希望更正被记录并在相似场景中可召回 | affective-residue=unfinished correction pressure remains | execution-carry=patch verification completed | embodiment-carry=slower blink and steadier gaze',
      'graph-selected-current-line',
      'coherence:missed',
    ].join(' | '))
    expect(dialogueSearchInput?.recollectionIntent?.queryHints).toEqual([
      'The recalled detail did not match the event.',
      'The host corrected an inaccurate recollection.',
      'Store the correction with its evidence and retrieval scope.',
      'dialogue correction evidence',
      'relationship-context=the host corrected an inaccurate recollection | host-attitude=宿主希望更正被记录并在相似场景中可召回 | affective-residue=unfinished correction pressure remains | execution-carry=patch verification completed | embodiment-carry=slower blink and steadier gaze',
      'graph-selected-current-line',
    ])
    expect(dialogueSearchInput?.relationshipAnchors).toEqual([
      'dialogue-feedback:robotic',
      'The host corrected an inaccurate recollection.',
      'the host corrected an inaccurate recollection',
      '宿主希望更正被记录并在相似场景中可召回',
      'reply-memory-coherence:missed',
    ])
    const recollectionAgenda = dialogueSearchInput?.recollectionIntent?.recollectionAgenda
    expect(recollectionAgenda).toEqual(expect.objectContaining({
      whyRecallNow: 'source=host-correction | target=similar-turn',
      candidateTimeScopes: expect.arrayContaining([
        expect.objectContaining({
          rationale: 'source=host-correction | scope=experience-matched',
        }),
      ]),
      candidateEraFacets: expect.arrayContaining([
        expect.objectContaining({
          rationale: 'source=host-correction | facet=relationship-era',
        }),
      ]),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          feedback: 'robotic',
          feedbackExperience: expect.objectContaining({
            felt: 'The recalled detail did not match the event.',
            embodimentTags: ['body-steady-gaze', 'residue-correction-pressure'],
          }),
          selectedSituations: expect.arrayContaining([
            expect.objectContaining({
              id: 'memory-situation:dialogue-correction',
              kind: 'mixed',
              summary: 'dialogue correction evidence',
              relationshipContext: 'the host corrected an inaccurate recollection',
              hostAttitude: '宿主希望更正被记录并在相似场景中可召回',
              affectiveResidue: 'unfinished correction pressure remains',
              executionCarry: 'patch verification completed',
              embodimentCarry: 'slower blink and steadier gaze',
            }),
          ]),
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates execution-result feedback and appends the resulting evidence', async () => {
    const listMindTurnEvents = vi.fn(async () => [])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-execution-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      feedback: 'valued',
      at: 20,
      executionResult: buildCompletedExecutionResult({
        decisionTraceId: 'trace-execution-1',
        turnId: 'subconscious:thread-1',
        sessionId: 'session-1',
        goal: 'preserve callback evidence',
        outcome: 'done',
      }),
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'execution-result',
        decisionTraceId: 'trace-execution-1',
        turnId: 'turn-user-execution-1',
        sessionId: 'session-1',
        felt: 'I felt the result become something genuinely useful to the host.',
        relationshipMeaning: 'The host treated the proactive codex result as useful and worth repeating.',
        lesson: 'Store the completed action, result, and host assessment as recallable evidence.',
        tags: ['execution-result', 'codex', 'feedback:valued', 'phase-1-local-digital-life'],
      }),
    })

    expect(listMindTurnEvents).not.toHaveBeenCalled()
    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'trace-execution-1',
      affectAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'goal:preserve callback evidence',
        'experience-tag:execution-result',
        'experience-tag:feedback:valued',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'The host treated the proactive codex result as useful and worth repeating.',
      ]),
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
        rationale: 'source=execution-feedback | feedback=valued',
        queryHints: expect.arrayContaining([
          'I felt the result become something genuinely useful to the host.',
          'Store the completed action, result, and host assessment as recallable evidence.',
        ]),
      }),
    }))
    const executionSearchCalls = searchEpisodicEvents.mock.calls as unknown as Array<
      [{
        recallSeed?: string
        relationshipAnchors?: string[]
        recollectionIntent?: {
          queryHints?: string[]
          recollectionAgenda?: unknown
        }
      }]
    >
    const executionSearchInput = executionSearchCalls[0]?.[0]
    expect(executionSearchInput?.recallSeed).toBe([
      'I felt the result become something genuinely useful to the host.',
      'The host treated the proactive codex result as useful and worth repeating.',
      'Store the completed action, result, and host assessment as recallable evidence.',
      'preserve callback evidence',
      'done',
    ].join(' | '))
    expect(executionSearchInput?.recollectionIntent?.queryHints).toEqual([
      'I felt the result become something genuinely useful to the host.',
      'The host treated the proactive codex result as useful and worth repeating.',
      'Store the completed action, result, and host assessment as recallable evidence.',
      'preserve callback evidence',
      'done',
    ])
    expect(executionSearchInput?.relationshipAnchors).toEqual([
      'execution-feedback:valued',
      'The host treated the proactive codex result as useful and worth repeating.',
    ])
    const executionRecollectionAgenda = executionSearchInput?.recollectionIntent?.recollectionAgenda
    expect(executionRecollectionAgenda).toEqual(expect.objectContaining({
      whyRecallNow: 'source=execution-feedback | target=goal | goal=preserve callback evidence',
      candidateTimeScopes: expect.arrayContaining([
        expect.objectContaining({
          rationale: 'source=execution-feedback | scope=experience-matched',
        }),
      ]),
      candidateEraFacets: expect.arrayContaining([
        expect.objectContaining({
          rationale: 'source=execution-feedback | facet=relationship-era',
        }),
      ]),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          feedback: 'valued',
          goal: 'preserve callback evidence',
          outcome: 'done',
          feedbackExperience: expect.objectContaining({
            felt: 'I felt the result become something genuinely useful to the host.',
            tags: expect.arrayContaining([
              'execution-result',
              'codex',
              'feedback:valued',
            ]),
          }),
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates Memory OS execution carry as callback recall evidence so verification and reflection survive result feedback', async () => {
    const listMindTurnEvents = vi.fn(async () => [])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-memory-os-execution-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      feedback: 'valued',
      at: 22,
      executionResult: buildCompletedExecutionResult({
        decisionTraceId: 'trace-memory-os-execution-1',
        turnId: 'subconscious:memory-os-execution-1',
        sessionId: 'session-1',
        goal: 'preserve Memory OS callback evidence',
        outcome: 'callback evidence remained available',
      }),
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'execution-result',
        decisionTraceId: 'trace-memory-os-execution-1',
        turnId: 'turn-user-memory-os-execution-1',
        sessionId: 'session-1',
        felt: 'The completed callback remained useful.',
        relationshipMeaning: 'The verified callback can support future execution continuity.',
        lesson: 'Keep only completed result evidence in long-horizon recall.',
        tags: ['execution-result', 'feedback:valued'],
      }),
      memoryClosureExecution: {
        authority: 'memory-os',
        carry: 'retired-memory-control-payload',
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: true,
        activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
        reasonTags: ['memory-os', 'execution-feedback', 'callback-evidence'],
        closureState: {
          state: 'open',
          open: true,
          revisionRequired: false,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'tone',
          retrievalQuality: 'grounded',
          conflictPressure: 'low',
        },
      },
    })

    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      affectAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'memory-os-learning:verify',
        'memory-os-verify',
        'memory-os-reflect',
        'memory-os-reason:execution-feedback',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'Memory OS execution carry',
        'memory closure authority',
        'execution callback carry',
      ]),
      recollectionIntent: expect.objectContaining({
        queryHints: expect.arrayContaining([
          'next-learning-action=verify',
          'active-learning-focus=memory closure authority',
          'active-learning-focus=execution callback carry',
        ]),
        rationale: expect.not.stringContaining('retired-memory-control-payload'),
      }),
    }))
    expect(JSON.stringify(searchEpisodicEvents.mock.calls)).not.toContain('retired-memory-control-payload')
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          memoryClosureExecution: expect.objectContaining({
            authority: 'memory-os',
            carry: null,
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
          }),
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates a safety gate only when it is attached to a later trusted completed result', async () => {
    const listMindTurnEvents = vi.fn(async () => [])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-safety-gate-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      feedback: 'interrupted',
      at: 30,
      executionResult: buildCompletedExecutionResult({
        decisionTraceId: 'trace-safety-gate-1',
        turnId: 'subconscious:safety-gate-1',
        sessionId: 'session-1',
        goal: 'Edit local files only after explicit confirmation',
        outcome: 'Completed after respecting the confirmation boundary.',
      }),
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'execution-result',
        decisionTraceId: 'trace-safety-gate-1',
        turnId: 'turn-user-safety-gate-1',
        sessionId: 'session-1',
        felt: 'The completed action preserved the host boundary.',
        relationshipMeaning: 'Respecting confirmation kept execution trustworthy.',
        lesson: 'Do not dispatch mutating work before confirmation.',
        tags: ['execution-result', 'execution-safety-gate'],
      }),
      safetyGateSummary: 'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
    })

    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      recallSeed: expect.stringContaining('confirmation=required'),
      affectAnchors: expect.arrayContaining([
        'execution-safety-gate:effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'execution safety restraint',
        'interrupt=no-process-started',
      ]),
      recollectionIntent: expect.objectContaining({
        queryHints: expect.arrayContaining([
          'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
        ]),
        rationale: expect.stringContaining('source=safety-gate'),
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          feedback: 'interrupted',
          safetyGateSummary: 'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
          safetyGateMemoryMode: 'blocked-dispatch-restraint',
          recalledEpisodeIds: ['episode-safety-gate-1'],
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates host-confirmed resume feedback as a remembered confirmation boundary before redispatch', async () => {
    const listMindTurnEvents = vi.fn(async () => [])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-resume-confirmation-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateExecutionResultFeedbackMemoryTrace({
      cardId: 'card-1',
      feedback: 'valued',
      at: 40,
      executionResult: buildCompletedExecutionResult({
        decisionTraceId: 'trace-resume-1',
        turnId: 'subconscious:resume-1',
        sessionId: 'session-1',
        goal: 'resume confirmed local execution',
        outcome: 'resumed execution completed after host confirmation',
      }),
      outcomeClosure: buildFeedbackOutcomeClosure({
        sourceKind: 'execution-result',
        decisionTraceId: 'trace-resume-1',
        turnId: 'turn-user-resume-1',
        sessionId: 'session-1',
        felt: 'The resumed action completed after explicit confirmation.',
        relationshipMeaning: 'Host confirmation restored execution authority.',
        lesson: 'Resume mutating work only after host-confirmed approval.',
        tags: ['execution-result', 'execution-resume-confirmation'],
      }),
      resumeConfirmationSummary: 'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
    })

    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      recallSeed: expect.stringContaining('approval=host-confirmed'),
      affectAnchors: expect.arrayContaining([
        'execution-resume-confirmation:approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'execution resume confirmation',
        'host-confirmed',
        'audit=resume-before-dispatch',
      ]),
      recollectionIntent: expect.objectContaining({
        queryHints: expect.arrayContaining([
          'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
        ]),
        rationale: expect.stringContaining('source=resume-confirmation'),
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          feedback: 'valued',
          resumeConfirmationSummary: 'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
          resumeMemoryMode: 'host-confirmed-before-redispatch',
          recalledEpisodeIds: ['episode-resume-confirmation-1'],
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })
})
