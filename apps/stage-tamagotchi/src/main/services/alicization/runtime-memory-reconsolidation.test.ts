import { describe, expect, it, vi } from 'vitest'

import {
  buildDialogueFeedbackReconsolidationRationale,
  collectRecallTelemetryTexts,
  collectReplyMemoryCoherenceState,
  createAlicizationRuntimeMemoryReconsolidation,
} from './runtime-memory-reconsolidation'

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

    await runtime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      previousAssistantText: '上一句遗漏了关键事实。',
      userText: '你漏掉了关键事实',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
      feedbackExperience: {
        felt: 'The recalled detail did not match the event.',
        relationshipMeaning: 'The host corrected an inaccurate recollection.',
        lesson: 'Store the correction with its evidence and retrieval scope.',
        tags: ['dialogue-feedback', 'feedback:robotic', 'body-steady-gaze', 'residue-correction-pressure'],
      },
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
      [{ recollectionIntent?: { recollectionAgenda?: unknown } }]
    >
    const recollectionAgenda = searchCalls[0]?.[0]?.recollectionIntent?.recollectionAgenda
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
      decisionTraceId: 'trace-execution-1',
      feedback: 'valued',
      previousAssistantText: '结果已经回来',
      userText: '这个结果接得住',
      sessionId: 'session-1',
      turnId: 'subconscious:thread-1',
      at: 20,
      goal: 'preserve callback evidence',
      outcome: 'done',
      feedbackExperience: {
        felt: 'I felt the result become something genuinely useful to the host.',
        relationshipMeaning: 'The host treated the proactive codex result as useful and worth repeating.',
        lesson: 'Store the completed action, result, and host assessment as recallable evidence.',
        tags: ['execution-result', 'codex', 'feedback:valued', 'phase-1-local-digital-life'],
      },
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
        'execution callback return',
        '这个结果接得住',
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
      [{ recollectionIntent?: { recollectionAgenda?: unknown } }]
    >
    const executionRecollectionAgenda = executionSearchCalls[0]?.[0]?.recollectionIntent?.recollectionAgenda
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
      decisionTraceId: 'trace-memory-os-execution-1',
      feedback: 'valued',
      previousAssistantText: '结果已经回来',
      userText: '这个结果接得住，但下次要核一下',
      sessionId: 'session-1',
      turnId: 'subconscious:memory-os-execution-1',
      at: 22,
      goal: 'preserve Memory OS callback evidence',
      outcome: 'callback evidence remained available',
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
    } as any)

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

  it('reconsolidates blocked-dispatch safety gate feedback as a remembered restraint experience instead of a generic blocked result', async () => {
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
      decisionTraceId: 'trace-safety-gate-1',
      feedback: 'interrupted',
      previousAssistantText: '我先停住，没有启动进程。',
      userText: '对，先别动文件',
      sessionId: 'session-1',
      turnId: 'subconscious:safety-gate-1',
      at: 30,
      goal: 'Edit local files without explicit confirmation',
      outcome: 'Blocked before dispatch.',
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
      decisionTraceId: 'trace-resume-1',
      feedback: 'valued',
      previousAssistantText: '宿主确认后我恢复执行并完成了。',
      userText: '确认之后继续执行这点要记住',
      sessionId: 'session-1',
      turnId: 'subconscious:resume-1',
      at: 40,
      goal: 'resume confirmed local execution',
      outcome: 'resumed execution completed after host confirmation',
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
