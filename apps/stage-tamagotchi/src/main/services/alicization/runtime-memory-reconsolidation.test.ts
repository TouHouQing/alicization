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
      whyNow: 'same seam again',
      inwardLine: 'return to the seam',
      visibleLine: 'stay on the same seam',
      selectedEpisodeSummaries: ['we repaired the runtime seam'],
      selectedRelationshipLines: ['leave more room'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)
    const coherence = collectReplyMemoryCoherenceState({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      explicitSurfaceExpected: true,
      explicitSurfaceObserved: false,
      matchedCueKinds: ['episode', 'procedure'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)

    expect(recallTexts).toEqual(expect.arrayContaining([
      'same seam again',
      'return to the seam',
    ]))
    expect(coherence).toEqual(expect.objectContaining({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      matchedCueKinds: ['episode', 'procedure'],
    }))
    expect(buildDialogueFeedbackReconsolidationRationale('robotic')).toContain('robotic')
  })

  it('reconsolidates dialogue feedback and appends a memory-reconsolidated mind event', async () => {
    const listMindTurnEvents = vi.fn(async () => [
      {
        kind: 'recall-attribution',
        payload: {
          whyNow: 'the host is reacting to the same seam',
          selectedEpisodeSummaries: ['上一轮像模板壳'],
          selectedSituations: [{
            id: 'memory-situation:reply-rehumanize',
            kind: 'mixed',
            summary: 'same-her rehumanize seam',
            evidenceSummary: 'relationship-context=the host was testing whether she would stay one same person instead of slipping into a tool shell | host-attitude=宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术 | affective-residue=repair pressure and unfinished same-her worry still remain | execution-carry=patch verified before outward reply again | embodiment-carry=slower blink, steadier gaze, lower-pressure reopening',
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
      previousAssistantText: '上一句像模板壳。',
      userText: '你这句太模板了',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
      feedbackExperience: {
        felt: 'I felt the identity-continuity',
        relationshipMeaning: 'The host heard the previous Alicization reply as a tool shell, so identity-continuity',
        lesson: 'Let the body return like this: rehumanize, steadier gaze, slower blink, lower-pressure voice.',
        tags: ['dialogue-feedback', 'feedback:robotic', 'body-rehumanize', 'continuity-same-her', 'residue-shell-pressure'],
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
        'experience-tag:body-rehumanize',
        'experience-tag:continuity-same-her',
        'experience-tag:residue-shell-pressure',
        'situation-affective-residue:repair pressure and unfinished same-her worry still remain',
        'situation-execution-carry:patch verified before outward reply again',
        'situation-embodiment-carry:slower blink, steadier gaze, lower-pressure reopening',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'The host heard the previous Alicization reply as a tool shell, so identity-continuity',
        'the host was testing whether she would stay one same person instead of slipping into a tool shell',
        '宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术',
      ]),
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
        rationale: 'Dialogue feedback: robotic.',
        queryHints: expect.arrayContaining([
          'I felt the identity-continuity',
          'Let the body return like this: rehumanize, steadier gaze, slower blink, lower-pressure voice.',
          'same-her rehumanize seam',
          'relationship-context=the host was testing whether she would stay one same person instead of slipping into a tool shell | host-attitude=宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术 | affective-residue=repair pressure and unfinished same-her worry still remain | execution-carry=patch verified before outward reply again | embodiment-carry=slower blink, steadier gaze, lower-pressure reopening',
        ]),
      }),
    }))
    const searchCalls = searchEpisodicEvents.mock.calls as unknown as Array<
      [{ recollectionIntent?: { recollectionAgenda?: unknown } }]
    >
    const recollectionIntent = searchCalls[0]?.[0]?.recollectionIntent
    expect(JSON.stringify(recollectionIntent?.recollectionAgenda)).toContain('source=host-correction')
    expect(JSON.stringify(recollectionIntent?.recollectionAgenda)).not.toMatch(
      /should be updated|Search the same remembered reply way|before generic history|reply posture/iu,
    )
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          feedback: 'robotic',
          feedbackExperience: expect.objectContaining({
            felt: expect.stringContaining('identity-continuity'),
            embodimentTags: ['body-rehumanize', 'continuity-same-her', 'residue-shell-pressure'],
          }),
          selectedSituations: expect.arrayContaining([
            expect.objectContaining({
              id: 'memory-situation:reply-rehumanize',
              kind: 'mixed',
              summary: 'same-her rehumanize seam',
              relationshipContext: 'the host was testing whether she would stay one same person instead of slipping into a tool shell',
              hostAttitude: '宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术',
              affectiveResidue: 'repair pressure and unfinished same-her worry still remain',
              executionCarry: 'patch verified before outward reply again',
              embodimentCarry: 'slower blink, steadier gaze, lower-pressure reopening',
            }),
          ]),
          selfContinuityInwardLine: null,
          selfContinuitySourceTags: [],
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates execution-result feedback and appends a richer identity-continuity', async () => {
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
      goal: 'keep callback continuity alive',
      outcome: 'done',
      feedbackExperience: {
        felt: 'I felt the result become something genuinely useful to the host.',
        relationshipMeaning: 'The host treated the proactive codex result as useful and worth repeating.',
        lesson: 'Keep the callback same-her, grounded, and quietly continuous instead of collapsing into a detached utility notice.',
        tags: ['execution-result', 'codex', 'feedback:valued', 'phase-1-local-digital-life'],
      },
    })

    expect(listMindTurnEvents).not.toHaveBeenCalled()
    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'trace-execution-1',
      affectAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'goal:keep callback continuity alive',
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
        rationale: 'Execution feedback: valued.',
        queryHints: expect.arrayContaining([
          'I felt the result become something genuinely useful to the host.',
          'Keep the callback same-her, grounded, and quietly continuous instead of collapsing into a detached utility notice.',
        ]),
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          feedback: 'valued',
          goal: 'keep callback continuity alive',
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
    const appendedEvents = (appendMindTurnEvents.mock.calls as unknown[][])[0]?.[0] as Array<{
      payload?: Record<string, unknown>
    }> | undefined
    const appendedEvent = appendedEvents?.[0]
    expect(appendedEvent?.payload).not.toHaveProperty('projectState')
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
      goal: 'keep Memory OS callback continuity alive',
      outcome: 'same-person callback carry stayed visible',
      memoryClosureExecution: {
        authority: 'memory-os',
        carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: true,
        activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
        reasonTags: ['memory-os', 'execution-feedback', 'same-person-callback'],
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
      recallSeed: expect.stringContaining('Carry the callback result into the next same-person reply'),
      affectAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'memory-os-learning:verify',
        'memory-os-verify',
        'memory-os-reflect',
        'memory-os-reason:execution-feedback',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'Memory OS execution carry',
        'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
        'memory closure authority',
        'execution callback carry',
      ]),
      recollectionIntent: expect.objectContaining({
        queryHints: expect.arrayContaining([
          'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
          'next-learning-action=verify',
          'active-learning-focus=memory closure authority',
          'active-learning-focus=execution callback carry',
        ]),
        rationale: expect.stringContaining('Memory OS carry:'),
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          source: 'execution-result-feedback',
          memoryClosureExecution: expect.objectContaining({
            authority: 'memory-os',
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
        rationale: expect.stringContaining('Safety gate:'),
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
        rationale: expect.stringContaining('Resume confirmation:'),
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
