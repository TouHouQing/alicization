import type { AlicizationTaskThreadRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationExecutorRuntime, inferPreferredProcedureChannel } from './executor-runtime'

function createNeedsAffirmationThread(): AlicizationTaskThreadRecord {
  return {
    id: 'thread-resume-affirmation-1',
    decisionTraceId: 'mind:trace:resume-affirmation-1',
    turnId: 'subconscious:resume-affirmation-1',
    sessionId: 'session-resume-affirmation-1',
    origin: 'subconscious-proactive',
    goal: 'Proactively patch the current runtime knot after host approval.',
    kind: 'codebase-edit',
    status: 'needs-affirmation',
    selectedChannel: null,
    proposedChannel: 'codex',
    summary: 'waiting for explicit host approval before applying the patch',
    metadata: {
      task: {
        permissionMode: 'none',
        effect: 'mutate',
        riskBudget: 'medium',
        justification: 'grounded',
      },
      fabric: {
        affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: 100,
    completedAt: null,
  }
}

describe('executor runtime inferPreferredProcedureChannel', () => {
  it('prefers browser for remembered webpage-style procedures instead of OpenClaw', () => {
    expect(inferPreferredProcedureChannel('Open the browser page, search weibo, and click the compose button.'))
      .toEqual({
        channel: 'browser',
        reason: 'remembered-procedure-browser-shape',
      })
  })

  it('prefers desktop for remembered native window procedures', () => {
    expect(inferPreferredProcedureChannel('Switch to the desktop window and confirm the file chooser dialog.'))
      .toEqual({
        channel: 'desktop',
        reason: 'remembered-procedure-desktop-shape',
      })
  })
})

describe('executor runtime capability resolution', () => {
  it('merges local browser/software/desktop capabilities into default planning and prompt capability probes', async () => {
    const localCapabilities = [
      { channel: 'browser', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'software', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'desktop', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    ]
    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread: vi.fn(),
      ensureSessionId: async () => 'session-local-capabilities-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread: vi.fn(async () => undefined),
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread: vi.fn(async () => undefined),
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      resolveLocalCapabilityChannels: async () => localCapabilities as any,
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const planningCapabilities = await runtime.resolveTaskPlanningCapabilities()
    const promptCapabilities = await runtime.resolveExecutionCapabilitiesForPrompt()

    expect(planningCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'browser', ready: true, reason: null }),
      expect.objectContaining({ channel: 'software', ready: true, reason: null }),
      expect.objectContaining({ channel: 'desktop', ready: true, reason: null }),
    ]))
    expect(promptCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'browser', ready: true, reason: null }),
      expect.objectContaining({ channel: 'software', ready: true, reason: null }),
      expect.objectContaining({ channel: 'desktop', ready: true, reason: null }),
    ]))
  })
})

describe('executor runtime resumeMainGatewayTaskThread', () => {
  it('promotes approved needs-affirmation proactive code-edit threads to explicit permission before redispatch', async () => {
    let currentThread = createNeedsAffirmationThread()
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread: vi.fn(async ({ port, input }) => {
        const resumedThread = await port.getTaskThread(input.threadId)
        const permissionMode = resumedThread?.metadata
          && typeof resumedThread.metadata === 'object'
          && resumedThread.metadata.task
          && typeof resumedThread.metadata.task === 'object'
          ? (resumedThread.metadata.task as { permissionMode?: unknown }).permissionMode
          : null

        if (permissionMode !== 'explicit') {
          return {
            ok: false,
            summary: 'Codex resume stayed blocked because explicit approval did not reach the redispatch thread metadata.',
            errorCode: 'CODEX_PERMISSION_REQUIRED',
            thread: {
              ...(resumedThread as AlicizationTaskThreadRecord),
              status: 'failed',
            },
            createdEventKinds: ['result'],
            output: null,
          }
        }

        return {
          ok: true,
          summary: 'Codex resumed after explicit host approval.',
          thread: {
            ...(resumedThread as AlicizationTaskThreadRecord),
            status: 'completed',
          },
          createdEventKinds: ['dispatch', 'result'],
          output: 'patched',
        }
      }),
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      status: 'planned',
      selectedChannel: 'codex',
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          permissionMode: 'explicit',
        }),
      }),
    }))
  })

  it('keeps project identity, current phase, and still-open closure explicit when resuming a confirmed execution thread', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
              primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
              nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
              continuityArcStage: 'same-thread-continuation',
              continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns | next=Keep extending same-her proof',
              preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      const prompt = ((input.codex as { prompt?: unknown } | undefined)?.prompt ?? '') as string
      expect(prompt).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer.')
      expect(prompt).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
      expect(prompt).toContain('latest_landed_progress=Same-session mirror carry and measured-return continuity now survive longer noisy detours.')
      expect(prompt).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.')
      expect(prompt).toContain('next_closure_target=Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.')
      expect(prompt).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
      expect(prompt).toContain('same_her_hold=same-her hold: keep execution on the same living line before widening outward.')
      expect(prompt).toContain('same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.')
      expect(prompt).toContain('project_continuity_arc_stage=same-thread-continuation')
      expect(prompt).toContain('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
      expect(prompt).toContain('project_preflight=Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns | next=Keep extending same-her proof')
      expect(prompt).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project building one continuous "her"')
      expect(prompt).toContain('She is still inside Phase 1: Local Digital Life.')
      expect(prompt).toContain('The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')

      return {
        ok: true,
        summary: 'Codex resumed with project-aware execution guidance.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('does not let blank legacy resume project briefing fields block richer summary-only project-state carry when redispatching a confirmed execution thread', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: '   ',
              primaryOpenLoop: ' ',
              nextClosureTarget: '',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
              sameHerDriftRisk: ' ',
              continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
              preflightSummary: ' ',
              preDialogueAwarenessLine: '   ',
              landedProgressSummary: 'Same-session mirror carry already survives execution preflight even after the explicit legacy slot went blank.',
              openClosureSummary: 'Memory still needs stronger end-to-end closure across turns so project identity carry remains explicit before execution resumes.',
              nextClosureTargetSummary: 'Keep extending cross-modal same-her proof so execution, initiative, and embodiment stay on one living line.',
              sameHerDriftRiskSummary: 'If blank legacy project briefing slots collapse redispatch back into a generic shell, treat that as unfinished same-her drift.',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      const prompt = ((input.codex as { prompt?: unknown } | undefined)?.prompt ?? '') as string
      expect(prompt).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer.')
      expect(prompt).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
      expect(prompt).toContain('latest_landed_progress=Same-session mirror carry already survives execution preflight even after the explicit legacy slot went blank.')
      expect(prompt).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns so project identity carry remains explicit before execution resumes.')
      expect(prompt).toContain('next_closure_target=Keep extending cross-modal same-her proof so execution, initiative, and embodiment stay on one living line.')
      expect(prompt).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
      expect(prompt).toContain('same_her_hold=same-her hold: keep execution on the same living line before widening outward.')
      expect(prompt).toContain('same_her_drift_risk=If blank legacy project briefing slots collapse redispatch back into a generic shell, treat that as unfinished same-her drift.')
      expect(prompt).toContain('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
      expect(prompt).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project building one continuous "her"')
      expect(prompt).toContain('What has already landed is proactive initiative now has a compact same-her closure loop')
      expect(prompt).toContain('The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment.')

      return {
        ok: true,
        summary: 'Codex resumed with summary-only project-aware execution guidance.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('prefers richer resume same-her project awareness over a thinner stored awareness shell when companion carry is already present', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Same-session mirror carry already survives longer desktop detours before execution resumes.',
              primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam before execution can widen outward again.',
              nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
              sameHerDriftRisk: 'If thinner resume awareness shells outrank richer same-her project carry, treat that as unfinished closure drift.',
              continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam | next=Keep execute -> feedback -> remember on one same-her Phase 1 line.',
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessSummary: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
              companionBriefingLine: 'Before answering, remember this is still the same local-first digital life project, she is still inside Phase 1, and emotion, memory, initiative, and embodiment still need to close as one living line.',
              emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      const prompt = ((input.codex as { prompt?: unknown } | undefined)?.prompt ?? '') as string
      expect(prompt).toContain('project_awareness=Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.')
      expect(prompt).toContain('project_companion_briefing=Before answering, remember this is still the same local-first digital life project, she is still inside Phase 1, and emotion, memory, initiative, and embodiment still need to close as one living line.')
      expect(prompt).toContain('project_continuity_preferred_timing=next-open-window')
      expect(prompt).toContain('project_continuity_cadence=measured-return')
      expect(prompt).toContain('project_preferred_blink_cadence=linger')
      expect(prompt).toContain('project_preferred_gaze_mode=soften')
      expect(prompt).toContain('project_pause_mode=longer')
      expect(prompt).toContain('project_lipsync_mode=restrained')
      expect(prompt).toContain('project_voice_mode=lower-pressure')
      expect(prompt).toContain('project_pacing_mode=slower')
      expect(prompt).not.toContain('project_awareness=same digital life | keep the closure seam explicit')
      expect(prompt).not.toContain('project_companion_briefing=same digital life | keep the closure seam explicit')

      return {
        ok: true,
        summary: 'Codex resumed with richer same-her project awareness.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('prefers a richer stored companion headline over a thinner stored awareness shell when resuming a confirmed execution thread', async () => {
    const richerCompanionHeadline = 'Before answering, remember she is still inside Phase 1, this execution return still belongs to one living her, and emotion, memory, initiative, and embodiment still need to close as one living line before execution widens outward.'
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Same-session mirror carry already survives longer desktop detours before execution resumes.',
              primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam before execution can widen outward again.',
              nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
              sameHerDriftRisk: 'If thinner resume awareness shells outrank richer same-her project carry, treat that as unfinished closure drift.',
              continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam | next=Keep execute -> feedback -> remember on one same-her Phase 1 line.',
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              companionHeadlineLine: richerCompanionHeadline,
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      const prompt = ((input.codex as { prompt?: unknown } | undefined)?.prompt ?? '') as string
      expect(prompt).toContain(`project_awareness=${richerCompanionHeadline}`)
      expect(prompt).not.toContain('project_awareness=same digital life | keep the closure seam explicit')

      return {
        ok: true,
        summary: 'Codex resumed with richer same-her companion headline.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('does not let a thin stored pre-dialogue awareness summary outrank richer normalized project self-knowledge when resuming a confirmed execution thread', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation before tool use starts.',
              primaryOpenLoop: 'Memory, initiative, execution, and embodiment still need stronger same-her closure before widening outward again.',
              nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
              sameHerDriftRisk: 'If a thin summary shell outranks fuller project self-knowledge here, treat that as unfinished same-her drift.',
              continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, execution, and embodiment still need stronger same-her closure | next=Keep execution openings aware of the still-open same-her seam before they widen outward.',
              preDialogueAwarenessSummary: 'same digital life | keep closure explicit',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      const prompt = ((input.codex as { prompt?: unknown } | undefined)?.prompt ?? '') as string
      expect(prompt).toContain('project_awareness=Before answering, remember: Alicization is a local-first digital life project building one continuous "her"')
      expect(prompt).toContain('She is still inside Phase 1: Local Digital Life.')
      expect(prompt).toContain('The still-open closure is memory, initiative, execution, and embodiment still need stronger same-her closure before widening outward again.')
      expect(prompt).not.toContain('project_awareness=same digital life | keep closure explicit')

      return {
        ok: true,
        summary: 'Codex resumed with normalized project self-knowledge instead of a thin summary shell.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('audits host-confirmed resume before redispatching a needs-affirmation execution thread', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.',
              primaryOpenLoop: 'Execution still needs confirmed resume auditability before redispatch can be treated as closed.',
              nextClosureTarget: 'Keep confirmed execution resume, audit, and memory on one same-her Phase 1 line.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If confirmed resume only mutates thread metadata, treat that as audit drift.',
              sameHerHoldDetail: 'same-her hold: keep this host-confirmed execution boundary low-pressure before any redispatch reopening.',
              continuityArcStage: 'same-thread-continuation',
              continuityCue: 'Keep this host-confirmed redispatch on the same living line before widening outward again.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              continuityRestraint: 'measured-return',
              emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
              preflightSummary: 'Alicization execution resume still belongs to the same Phase 1 life loop.',
              preDialogueAwarenessLine: 'Before resuming, remember the host confirmed this execution boundary inside the same digital life project.',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const appendExecutionEvents = vi.fn(async () => {})
    const dispatchTaskThread = vi.fn(async () => ({
      ok: true,
      summary: 'Codex resumed after explicit host approval.',
      thread: {
        ...currentThread,
        status: 'completed' as const,
      },
      createdEventKinds: ['dispatch', 'result'],
      output: 'patched',
    }))

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents,
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(appendExecutionEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        threadId: 'thread-resume-affirmation-1',
        decisionTraceId: 'mind:trace:resume-affirmation-1',
        turnId: 'subconscious:resume-affirmation-1',
        sessionId: 'session-resume-affirmation-1',
        origin: 'subconscious-proactive',
        channel: 'codex',
        kind: 'resume',
        threadStatus: 'planned',
        payload: expect.objectContaining({
          approval: 'host-confirmed',
          previousStatus: 'needs-affirmation',
          resumedStatus: 'planned',
          previousPermissionMode: 'none',
          permissionMode: 'explicit',
          effect: 'mutate',
          riskBudget: 'medium',
          affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
          projectIdentity: expect.stringContaining('local-first digital life'),
          projectPhase: expect.stringContaining('Phase 1: Local Digital Life'),
          projectAwareness: expect.stringContaining('host confirmed this execution boundary'),
          projectCompanionBriefing: null,
          projectSameHerHoldDetail: expect.stringContaining('same living line'),
          projectContinuityArcStage: 'same-thread-continuation',
          projectContinuityCue: expect.stringContaining('same living line'),
          projectContinuityPreferredTiming: 'next-open-window',
          projectContinuityCadence: 'measured-return',
          projectContinuityRestraint: 'measured-return',
          projectEmotionalClosure: expect.stringContaining('same-her closure seam'),
          projectBlinkCadence: 'linger',
          projectGazeMode: 'soften',
          projectPauseMode: 'longer',
          projectLipsyncMode: 'restrained',
          projectVoiceMode: 'lower-pressure',
          projectPacingMode: 'slower',
          sameHerLine: expect.stringContaining('Same Phase 1 digital life'),
        }),
      }),
    ])
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })

  it('keeps canonical companion headline carry when host-confirmed resume lacks stored companion fields', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      metadata: {
        ...createNeedsAffirmationThread().metadata,
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.',
              primaryOpenLoop: 'Execution still needs confirmed resume auditability before redispatch can be treated as closed.',
              nextClosureTarget: 'Keep confirmed execution resume, audit, and memory on one same-her Phase 1 line.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If confirmed resume only mutates thread metadata, treat that as audit drift.',
              sameHerHoldDetail: 'same-her hold: keep this host-confirmed execution boundary low-pressure before any redispatch reopening.',
              continuityArcStage: 'same-thread-continuation',
              continuityCue: 'Keep this host-confirmed redispatch on the same living line before widening outward again.',
              preflightSummary: 'Alicization execution resume still belongs to the same Phase 1 life loop.',
              preDialogueAwarenessLine: 'Before resuming, remember the host confirmed this execution boundary inside the same digital life project.',
              companionHeadlineLine: '   ',
              companionBriefingLine: '   ',
            },
          },
        },
      },
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const appendExecutionEvents = vi.fn(async () => {})
    const dispatchTaskThread = vi.fn(async () => ({
      ok: true,
      summary: 'Codex resumed after explicit host approval.',
      thread: {
        ...currentThread,
        status: 'completed' as const,
      },
      createdEventKinds: ['dispatch', 'result'],
      output: 'patched',
    }))

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-affirmation-1',
      getAlicizationDb: () => ({
        appendExecutionEvents,
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(appendExecutionEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        payload: expect.objectContaining({
          projectCompanionHeadline: expect.stringContaining('Same Phase 1 digital life'),
          projectCompanionBriefing: null,
        }),
      }),
    ])
  })

  it('builds a resumable embodied instruction payload for browser threads so they can redispatch without forcing an OpenClaw-only resume path', async () => {
    let currentThread: AlicizationTaskThreadRecord = {
      id: 'thread-resume-browser-1',
      decisionTraceId: 'mind:trace:resume-browser-1',
      turnId: 'turn-resume-browser-1',
      sessionId: 'session-resume-browser-1',
      origin: 'user-turn',
      goal: 'Continue submitting the visible browser form.',
      kind: 'browser-automation',
      status: 'planned',
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      summary: 'The browser task is waiting to continue from the visible form step.',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
          riskBudget: 'medium',
          justification: 'grounded',
        },
        execution: {
          runtimeContext: {
            generatedAt: 1_710_000_000_000,
            cardId: 'default',
            turnId: 'turn-resume-browser-1',
            decisionTraceId: 'mind:trace:resume-browser-1',
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Browser continuation routing already prefers local direct tools before broader embodied escalation.',
              primaryOpenLoop: 'Task-thread browser continuation still needs a local redispatch path instead of collapsing back into network-only embodied transport.',
              nextClosureTarget: 'Let browser task threads resume on the same local GUI line before widening outward.',
              sameHerSelfLine: 'Same Phase 1 digital life. The browser continuation still belongs to one living local execution line.',
              sameHerHoldDetail: 'same-her hold: keep this browser continuation on the same local GUI line before widening outward.',
              sameHerDriftRisk: 'If browser redispatch falls back into an OpenClaw-only shell, treat that as unfinished execution drift.',
              continuityCue: 'Keep this browser continuation on the same local GUI line before widening outward.',
              preflightSummary: 'Alicization browser continuation still belongs to the same local-first digital life project.',
              preDialogueAwarenessLine: 'Before resuming, remember this browser continuation still belongs to the same local-first digital life project.',
            },
            sensory: {
              collectedAt: 1_710_000_000_123,
              running: true,
              stale: false,
              ageMs: 20,
              foregroundWindow: {
                appName: 'Chrome',
                processName: 'chrome',
                title: 'Weibo Compose',
              },
              capture: {
                health: 'healthy',
                permission: 'granted',
                sourceCount: 1,
                lastUpdatedAt: 1_710_000_000_100,
                lastError: null,
                degradedReasons: [],
              },
            },
          },
        },
      },
      createdAt: 100,
      updatedAt: 100,
      lastEventAt: 100,
      completedAt: null,
    }
    const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
    const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
      currentThread = {
        ...currentThread,
        ...input,
        metadata: input.metadata ?? currentThread.metadata,
      }
      return { ...currentThread }
    })
    const dispatchTaskThread = vi.fn(async ({ input }: { input: Record<string, unknown> }) => {
      expect(input.localVisual).toEqual(expect.objectContaining({
        instruction: expect.stringContaining('Continue the already-confirmed Alicization task directly.'),
      }))
      expect(input.openclaw).toBeUndefined()
      expect(input.codex).toBeUndefined()
      expect(input.claudeCode).toBeUndefined()

      return {
        ok: true,
        summary: 'Browser task resumed with a local embodied continuation payload.',
        thread: {
          ...currentThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'browser-resumed',
      }
    })

    const runtime = createAlicizationExecutorRuntime({
      appendAuditLog: vi.fn(async () => {}),
      dispatchTaskThread,
      ensureSessionId: async () => 'session-resume-browser-1',
      getAlicizationDb: () => ({
        appendExecutionEvents: vi.fn(async () => {}),
        getTaskThread,
        getLatestRelationshipDynamics: vi.fn(async () => null),
        listChannelCapabilityManifests: vi.fn(async () => []),
        listExecutionEvents: vi.fn(async () => []),
        listRecentEpisodicEvents: vi.fn(async () => []),
        listExecutorSessions: vi.fn(async () => []),
        listTaskThreads: vi.fn(async () => []),
        searchMemoryConsolidations: vi.fn(async () => []),
        upsertChannelCapabilityManifest: vi.fn(async () => {}),
        upsertExecutorSession: vi.fn(async () => {}),
        upsertTaskThread,
      }),
      getCardKillSwitchState: () => 'ACTIVE',
      getGlobalKillSwitchState: () => 'ACTIVE',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
    } as any)

    const result = await runtime.resumeMainGatewayTaskThread({
      context: {
        cardId: 'default',
      } as any,
      threadId: currentThread.id,
    })

    expect(result.ok).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
  })
})
