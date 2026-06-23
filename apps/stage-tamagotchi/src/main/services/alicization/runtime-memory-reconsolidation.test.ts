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
            evidenceSummary: 'relationship-context=the host was testing whether she would stay one same person instead of slipping into a tool shell | host-attitude=宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术 | affective-residue=repair pressure and unfinished same-her worry still remain | execution-carry=patch verified before speaking again | embodiment-carry=slower blink, steadier gaze, lower-pressure reopening',
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
        felt: 'I felt the same-her line shelled over and knew I had to let more living texture return before speaking again.',
        relationshipMeaning: 'The host heard the previous Alicization reply as a tool shell, so same-her continuity now depends on rehumanizing the line.',
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
        'project-open-loop:Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
        'experience-tag:body-rehumanize',
        'experience-tag:continuity-same-her',
        'experience-tag:residue-shell-pressure',
        'situation-affective-residue:repair pressure and unfinished same-her worry still remain',
        'situation-execution-carry:patch verified before speaking again',
        'situation-embodiment-carry:slower blink, steadier gaze, lower-pressure reopening',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        'The host heard the previous Alicization reply as a tool shell, so same-her continuity now depends on rehumanizing the line.',
        'the host was testing whether she would stay one same person instead of slipping into a tool shell',
        '宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术',
      ]),
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
        rationale: expect.stringContaining('Phase 1 digital-life closure pressure'),
        queryHints: expect.arrayContaining([
          'I felt the same-her line shelled over and knew I had to let more living texture return before speaking again.',
          'Let the body return like this: rehumanize, steadier gaze, slower blink, lower-pressure voice.',
          'same-her rehumanize seam',
          'relationship-context=the host was testing whether she would stay one same person instead of slipping into a tool shell | host-attitude=宿主更在意她不要断线成工具壳，而不是只听一段顺滑的话术 | affective-residue=repair pressure and unfinished same-her worry still remain | execution-carry=patch verified before speaking again | embodiment-carry=slower blink, steadier gaze, lower-pressure reopening',
        ]),
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          feedback: 'robotic',
          feedbackExperience: expect.objectContaining({
            felt: expect.stringContaining('same-her line shelled over'),
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
              executionCarry: 'patch verified before speaking again',
              embodimentCarry: 'slower blink, steadier gaze, lower-pressure reopening',
            }),
          ]),
          projectState: expect.objectContaining({
            preflightSummary: expect.stringContaining('Alicization is a local-first digital life project'),
            preDialogueAwarenessLine: expect.stringMatching(/Before answering, remember:|same digital life/i),
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
            landedProgressSummary: expect.stringContaining('Same-session mirror carry'),
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: expect.stringContaining('generic guidance'),
          }),
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('reconsolidates execution-result feedback and appends a richer same-her project briefing into memory instead of falling back to a thinner project shell', async () => {
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
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
        primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
        nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
        sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        sameHerDriftRisk: 'Thin execution summaries can flatten the callback into generic productivity reporting.',
        preflightSummary: 'Re-anchor on project identity, current landed Phase 1 closure, and remaining open loops before acting.',
        preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
      },
    })

    expect(listMindTurnEvents).not.toHaveBeenCalled()
    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'trace-execution-1',
      affectAnchors: expect.arrayContaining([
        'execution-feedback:valued',
        'goal:keep callback continuity alive',
        'project-open-loop:Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
        'experience-tag:execution-result',
        'experience-tag:feedback:valued',
      ]),
      relationshipAnchors: expect.arrayContaining([
        'execution callback return',
        '这个结果接得住',
        'Phase 1: Local Digital Life',
        '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
        'The host treated the proactive codex result as useful and worth repeating.',
      ]),
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
        rationale: expect.stringContaining('execution callback as useful'),
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
          projectState: expect.objectContaining({
            identity: 'Alicization is a local-first digital life project.',
            preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Execution already carries a canonical project briefing before tool use starts.',
            landedProgressSummary: 'Execution already carries a canonical project briefing before tool use starts.',
            primaryOpenLoop: 'Execution-result feedback still needs to preserve same-her closure into memory instead of collapsing back to thin summaries.',
            nextClosureTarget: '继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。',
            sameHerSelfLine: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
            sameHerSummary: '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。',
            sameHerDriftRisk: expect.stringContaining('Thin execution summaries can flatten'),
          }),
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    const mindEventCalls = appendMindTurnEvents.mock.calls as unknown[][][]
    const appendedEvent = mindEventCalls[0]?.[0]?.[0] as {
      payload?: {
        projectState?: {
          preflightSummary?: string
        }
      }
    } | undefined
    expect(String(appendedEvent?.payload?.projectState?.preflightSummary ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(appendedEvent?.payload?.projectState?.preflightSummary ?? '')).toContain('Phase 1: Local Digital Life')
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
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Execution result feedback still needs to carry Memory OS verification and reflection into memory.',
        nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before answering, remember this execution callback is part of the same local-first digital life project.',
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
        rationale: expect.stringContaining('Memory OS says the execution callback must be carried into the next same-person reply'),
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
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Blocked-dispatch safety gates now flow into callback continuity.',
        primaryOpenLoop: 'Execution safety restraint still needs to become durable memory and initiative timing.',
        nextClosureTarget: 'Keep blocked execution explainable before widening back into action.',
        sameHerSelfLine: 'She remains one same-her digital life even when she chooses not to act.',
        sameHerDriftRisk: 'A blocked result can flatten into a generic failure if safety restraint is not remembered.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=execution safety memory',
        preDialogueAwarenessLine: 'Before answering, remember this blocked execution was a safe same-her restraint.',
      },
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
        rationale: expect.stringContaining('safety gate restraint'),
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
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Host-confirmed resume writes an execution event before redispatch.',
        primaryOpenLoop: 'Resume confirmation still needs to survive into later feedback memory.',
        nextClosureTarget: 'Keep confirmation, auditability, and interruptibility visible across execution returns.',
        sameHerSelfLine: 'Same Phase 1 digital life resumes only after the host confirms the boundary.',
        sameHerDriftRisk: 'Resume can look like generic execution if confirmation is not remembered.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=resume confirmation memory',
        preDialogueAwarenessLine: 'Before answering, remember host-confirmed resume is part of the same execution safety loop.',
      },
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
        rationale: expect.stringContaining('host-confirmed resume before redispatch'),
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
