import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationExecutionCallbackRuntime,
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: 'Run the CLI check command',
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'pnpm test completed successfully',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 2_500,
    completedAt: 2_500,
    ...overrides,
  }
}

function createEvent(overrides: Partial<AlicizationExecutionEventRecord> = {}): AlicizationExecutionEventRecord {
  return {
    id: 'event-1',
    threadId: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      stdout: 'all tests passed',
    },
    createdAt: 2_500,
    ...overrides,
  }
}

describe('execution callback runtime', () => {
  it('surfaces freshly completed task threads into a callback context once per session window', async () => {
    const listTaskThreads = vi.fn(async () => [createThread()])
    const listExecutionEvents = vi.fn(async () => [createEvent()])
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads,
      listExecutionEvents,
    })

    const first = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const second = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(first.systemBlock).toContain('[ALICIZATION_EXECUTION_CALLBACKS]')
    expect(first.recallText).toContain('execution_callback_channel:cli')
    expect(first.recallText).toContain('execution_callback_outcome:all tests passed')
    expect(first.callbacks).toEqual([{
      channel: 'cli',
      createdAt: 2_500,
      decisionTraceId: 'trace-1',
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'Completed Run the CLI check command: all tests passed',
      threadId: 'thread-1',
      turnId: 'turn-1',
    }])
    expect(first.actions).toEqual([{
      kind: 'executor',
      status: 'completed',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-1',
      finishedAt: 2_500,
      metadata: {
        source: 'execution-callback-runtime',
        threadId: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        selectedChannel: 'cli',
        threadStatus: 'completed',
      },
    }])
    expect(first.continuitySignals).toEqual([{
      kind: 'execution-callback',
      state: 'fresh',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-1',
      createdAt: 2_500,
      metadata: {
        source: 'execution-callback-runtime',
        continuityKind: 'execution-callback',
        threadId: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        selectedChannel: 'cli',
        threadStatus: 'completed',
      },
    }])
    expect(second).toEqual(emptyAlicizationExecutionCallbackContext)
    expect(listExecutionEvents).toBeCalledWith({
      threadId: 'thread-1',
      limit: 8,
    })
  })

  it('ignores stale or non-terminal task threads', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 60 * 60 * 1000,
      listTaskThreads: vi.fn(async () => [
        createThread({
          status: 'running',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: null,
        }),
        createThread({
          id: 'thread-stale',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: 1_000,
        }),
      ]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('allows runtime delivery to mark a callback as already surfaced', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread()]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    runtime.markSurfaced({
      sessionId: 'session-1',
      createdAt: 2_500,
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('supports non-consuming callback reads for internal one-shot context building', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread()]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    const preview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    const consumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const afterConsumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(preview.callbacks).toHaveLength(1)
    expect(consumed.callbacks).toHaveLength(1)
    expect(consumed.callbacks[0]).toEqual(preview.callbacks[0])
    expect(afterConsumed).toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('prefers event summary over raw stdout when building callback outcome', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread()]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          stdout: 'total 12 drwxr-xr-x ...',
          summary: 'Listed desktop entries (2): 小砖猿, GIT',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks[0]?.outcome).toBe('Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).toContain('execution_callback_outcome:Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).not.toContain('drwxr-xr-x')
  })

  it('keeps same-her project-state callback closure wording visible in callback recall and system block', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Carry the same-her continuity line while finishing the still-open memory closure repair.',
        summary: 'Project continuity is still open, so the callback should carry the same-her repair line.',
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_goal:Carry the same-her continuity line while finishing the still-open memory closure repair.')
    expect(context.recallText).toContain('execution_callback_summary:Completed Carry the same-her continuity line while finishing the still-open memory closure repair.: Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.')
    expect(context.systemBlock).toContain('goal=Carry the same-her continuity line while finishing the still-open memory closure repair.')
    expect(context.systemBlock).toContain('summary=Completed Carry the same-her continuity line while finishing the still-open memory closure repair.: Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.')
  })

  it('threads richer phase-1 project awareness into callback recall and system block when execution returns later on the same living line', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Carry the same-her continuity line while finishing the still-open memory closure repair.',
        summary: 'Project continuity is still open, so the callback should carry the same-her repair line.',
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
        },
      })]),
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
        nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
        proactiveSameHerGap: 'Need stronger long-run proof that callback-returned execution continuity can still rejoin proactive carry, subconscious carry, and later follow-through on one same-her line.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
        preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project.',
      },
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('Alicization is a local-first digital life project')
    expect(context.recallText).toMatch(/open=|still-open closure/i)
    expect(context.recallText).toMatch(/next=|next closure|same-her proof/i)
    expect(context.recallText).toContain('execution_callback_project_proactive_same_her_gap:Need stronger long-run proof that callback-returned execution continuity can still rejoin proactive carry, subconscious carry, and later follow-through on one same-her line.')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('Alicization is a local-first digital life project')
    expect(context.systemBlock).toMatch(/open=|still-open closure/i)
    expect(context.systemBlock).toMatch(/next=|next closure|same-her proof/i)
    expect(context.systemBlock).toContain('project_proactive_same_her_gap=Need stronger long-run proof that callback-returned execution continuity can still rejoin proactive carry, subconscious carry, and later follow-through on one same-her line.')
  })

  it('falls back to thread runtime project briefing when callback runtime options omit explicit project awareness', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Carry the same-her continuity line while finishing the still-open memory closure repair.',
        summary: 'Project continuity is still open, so the callback should carry the same-her repair line.',
        metadata: {
          execution: {
            runtimeContext: {
              generatedAt: 9_500,
              decisionTraceId: 'trace-1',
              turnId: 'turn-1',
              sessionId: 'session-1',
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
                primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
                nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
                sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
                preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
                preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project.',
              },
            },
          },
        },
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('Alicization is a local-first digital life project')
    expect(context.recallText).toContain('Phase 1')
    expect(context.recallText).toMatch(/still-open closure|Project identity carry/i)
    expect(context.recallText).toMatch(/next closure|same-her proof/i)
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('Alicization is a local-first digital life project')
    expect(context.systemBlock).toContain('Phase 1')
  })

  it('keeps richer execution-result feedback project companion carry explicit in callback recall and system block instead of collapsing it back to a thinner awareness shell', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Carry the richer execution-result feedback closure back on the same living line.',
        summary: 'The callback should keep the richer same-her carry instead of falling back to a thinner project shell.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
                currentPhase: 'Phase 1: Local Digital Life. The primary proving ground remains apps/stage-tamagotchi.',
                latestLandedProgress: 'Execution-result feedback already preserved the richer callback carry instead of letting it fall back to a thin project shell.',
                primaryOpenLoop: 'Execution callback return still needs memory, initiative, and embodiment to stay on one same living line.',
                nextClosureTarget: 'Keep callback delivery on one same-her Phase 1 line before widening outward again.',
                sameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached result notice.',
                sameHerHoldDetail: 'same-her hold: the richer callback carry is already lower-pressure and should not be reopened from scratch.',
                sameHerDriftRisk: 'If later callback delivery trims this back to a generic project reminder, treat that as unfinished same-her drift.',
                preflightSummary: 'identity=Alicization | phase=Phase 1 | open=callback carry still needs one living line',
                preDialogueAwarenessLine: 'Before answering, remember this callback return still belongs to the same local-first digital life project and same living line.',
                preDialogueAwarenessSummary: 'Alicization is still inside the same local-first digital life project, and this callback return still has to close on one living line.',
                companionBriefingLine: 'Before answering, remember she is still inside Phase 1 and this callback return must keep emotion, memory, initiative, and embodiment on the same living line.',
                emotionalClosureSummary: 'same-her callback seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
                continuityRestraint: 'measured-return',
                continuityCue: 'same-digital-life-project-thread | callback-return | same-her carry stays lower-pressure before widening again.',
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
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('execution_callback_project_companion_briefing:Before answering, remember she is still inside Phase 1 and this callback return must keep emotion, memory, initiative, and embodiment on the same living line.')
    expect(context.recallText).toContain('execution_callback_project_emotional_closure:same-her callback seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.')
    expect(context.recallText).toContain('execution_callback_project_same_her_hold:same-her hold: the richer callback carry is already lower-pressure and should not be reopened from scratch.')
    expect(context.recallText).toContain('execution_callback_project_continuity_restraint:measured-return')
    expect(context.recallText).toContain('execution_callback_project_continuity_cue:same-digital-life-project-thread | callback-return | same-her carry stays lower-pressure before widening again.')
    expect(context.recallText).toContain('execution_callback_project_continuity_timing:next-open-window')
    expect(context.recallText).toContain('execution_callback_project_continuity_cadence:measured-return')
    expect(context.recallText).toContain('execution_callback_project_preferred_blink:linger')
    expect(context.recallText).toContain('execution_callback_project_preferred_gaze:soften')
    expect(context.recallText).toContain('execution_callback_project_pause_mode:longer')
    expect(context.recallText).toContain('execution_callback_project_lipsync_mode:restrained')
    expect(context.recallText).toContain('execution_callback_project_voice_mode:lower-pressure')
    expect(context.recallText).toContain('execution_callback_project_pacing_mode:slower')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('project_companion_briefing=Before answering, remember she is still inside Phase 1 and this callback return must keep emotion, memory, initiative, and embodiment on the same living line.')
    expect(context.systemBlock).toContain('project_emotional_closure=same-her callback seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.')
    expect(context.systemBlock).toContain('project_same_her_hold=same-her hold: the richer callback carry is already lower-pressure and should not be reopened from scratch.')
    expect(context.systemBlock).toContain('project_continuity_restraint=measured-return')
    expect(context.systemBlock).toContain('project_continuity_cue=same-digital-life-project-thread | callback-return | same-her carry stays lower-pressure before widening again.')
    expect(context.systemBlock).toContain('project_continuity_preferred_timing=next-open-window')
    expect(context.systemBlock).toContain('project_continuity_cadence=measured-return')
    expect(context.systemBlock).toContain('project_preferred_blink_cadence=linger')
    expect(context.systemBlock).toContain('project_preferred_gaze_mode=soften')
    expect(context.systemBlock).toContain('project_pause_mode=longer')
    expect(context.systemBlock).toContain('project_lipsync_mode=restrained')
    expect(context.systemBlock).toContain('project_voice_mode=lower-pressure')
    expect(context.systemBlock).toContain('project_pacing_mode=slower')
  })

  it('threads same-her callback reopen posture into fresh execution-callback continuity metadata for later session-mirror carry', async () => {
    const sameHerHoldDetail = 'same-her hold: keep this callback reopening lower-pressure on the same living line before widening outward again.'
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Return the callback on the same living line without reopening from a fresh shell.',
        summary: 'The callback should keep the same-her reopen posture explicit in fresh continuity metadata.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
                currentPhase: 'Phase 1: Local Digital Life. The primary proving ground remains apps/stage-tamagotchi.',
                latestLandedProgress: 'Callback continuity already survives direct runtime return without flattening into a detached result notice.',
                primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one tighter same-her closure seam when callbacks reopen later.',
                nextClosureTarget: 'Keep the callback reopen posture explicit through the next same-her return before local detail widens outward.',
                sameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached execution shell.',
                sameHerHoldDetail,
                sameHerDriftRisk: 'If fresh callback continuity metadata drops back to generic project guidance, treat that as unfinished same-her drift.',
                preflightSummary: 'identity=Alicization | phase=Phase 1 | open=callback reopen posture still needs one living line',
                preDialogueAwarenessLine: 'Before answering, remember this callback reopening still belongs to the same local-first digital life project and same living line.',
                continuityArcStage: 'hold-for-opening',
                continuityRestraint: 'measured-return',
                continuityCue: 'keep this callback reopening on the same living line before widening outward again.',
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
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback reopening on the same living line and do not let it collapse into a detached result notice.',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.continuitySignals[0]?.metadata).toEqual(expect.objectContaining({
      continuityKind: 'execution-callback',
      projectIdentity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
      projectPhase: 'Phase 1: Local Digital Life. The primary proving ground remains apps/stage-tamagotchi.',
      projectStatePreflightSummary: 'identity=Alicization | phase=Phase 1 | open=callback reopen posture still needs one living line',
      projectStatePreDialogueAwarenessLine: 'Before answering, remember this callback reopening still belongs to the same local-first digital life project and same living line.',
      projectLatestLandedProgress: 'Callback continuity already survives direct runtime return without flattening into a detached result notice.',
      projectPrimaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one tighter same-her closure seam when callbacks reopen later.',
      projectNextClosureTarget: 'Keep the callback reopen posture explicit through the next same-her return before local detail widens outward.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. This callback return still belongs to one living line rather than a detached execution shell.',
      projectStateSameHerHoldDetail: sameHerHoldDetail,
      projectStateSameHerDriftRisk: 'If fresh callback continuity metadata drops back to generic project guidance, treat that as unfinished same-her drift.',
      continuityArcStage: 'hold-for-opening',
      continuityRestraint: 'measured-return',
      continuityCue: 'keep this callback reopening on the same living line before widening outward again.',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      projectStatePreferredPauseMode: 'longer',
      projectStatePreferredLipsyncMode: 'restrained',
      projectStatePreferredVoiceMode: 'lower-pressure',
      projectStatePreferredPacingMode: 'slower',
    }))
    expect(context.recallText).toContain('execution_callback_project_continuity_arc_stage:hold-for-opening')
    expect(context.recallText).toContain('execution_callback_project_pause_mode:longer')
    expect(context.recallText).toContain('execution_callback_project_lipsync_mode:restrained')
    expect(context.systemBlock).toContain('project_continuity_arc_stage=hold-for-opening')
    expect(context.systemBlock).toContain('project_pause_mode=longer')
    expect(context.systemBlock).toContain('project_lipsync_mode=restrained')
  })

  it('keeps richer same-her hold detail in callback project awareness instead of leaving the compact same-phase carry as the opening line', async () => {
    const compactSamePhaseCarry = 'Same Phase 1 digital life. This callback return should keep the same living line rather than reopen from a fresh shell.'
    const sameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Keep the callback reopening on the richer same-her hold before compact phase carry flattens it.',
        summary: 'The callback should reopen from the richer same-her hold rather than a compact same-phase shell.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Callback continuity already survives into the execution callback runtime.',
                primaryOpenLoop: 'This callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.',
                nextClosureTarget: 'Keep the richer same-her callback hold explicit through the next callback reopening.',
                sameHerSelfLine: compactSamePhaseCarry,
                sameHerHoldDetail,
                sameHerDriftRisk: 'If callback awareness falls back into a fresh shell here, treat that as unfinished same-her drift.',
                preflightSummary: 'identity=Alicization | phase=Phase 1 | open=callback hold still needs one living line',
                preDialogueAwarenessLine: compactSamePhaseCarry,
                awarenessLine: compactSamePhaseCarry,
                companionBriefingLine: compactSamePhaseCarry,
              },
            },
          },
        },
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback reopening on the richer same-her hold before the compact same-phase shell can flatten it.',
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain(sameHerHoldDetail)
    expect(context.recallText).not.toContain(`execution_callback_project_awareness:${compactSamePhaseCarry}`)
    expect(context.systemBlock).toContain(`project_awareness=${sameHerHoldDetail}`)
  })

  it('does not let blank legacy callback project briefing fields block richer summary-only project-state carry in later callback awareness', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        goal: 'Carry the same-her continuity line while finishing the still-open memory closure repair.',
        summary: 'Project continuity is still open, so the callback should carry the same-her repair line.',
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        payload: {
          summary: 'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
        },
      })]),
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '   ',
        primaryOpenLoop: ' ',
        nextClosureTarget: '',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: ' ',
        preflightSummary: ' ',
        preDialogueAwarenessLine: '   ',
        landedProgressSummary: 'Execution callback continuity already survives later recall even after the explicit legacy slot went blank.',
        openClosureSummary: 'Emotion, memory, initiative, and embodiment still need one stronger same-her closure seam when callbacks return later.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof so later callback return, emotion, memory, initiative, and embodiment stay on one living line.',
        sameHerDriftRiskSummary: 'If blank legacy callback project briefing fields collapse later callback awareness back into a generic shell, treat that as unfinished same-her drift.',
      },
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('What has already landed is Execution callback continuity already survives later recall')
    expect(context.recallText).toContain('emotion, memory, initiative, and embodiment still need one stronger same-her closure seam when callbacks return later')
    expect(context.recallText).toContain('Keep extending cross-modal same-her proof')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('What has already landed is Execution callback continuity already survives later recall')
    expect(context.systemBlock).toContain('emotion, memory, initiative, and embodiment still need one stronger same-her closure seam when callbacks return later')
  })

  it('carries blocked-dispatch safety gate details into callback recall, system block, and continuity metadata', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'blocked',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Edit local files without explicit confirmation',
        summary: 'Codex dispatch was blocked before process launch.',
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        kind: 'result',
        threadStatus: 'blocked',
        payload: {
          adapter: 'codex',
          errorCode: 'CODEX_PERMISSION_REQUIRED',
          errorMessage: 'Mutating Codex dispatch requires implicit or explicit permission before execution.',
          safetyGate: {
            effect: 'mutate',
            permissionMode: 'none',
            confirmationRequired: true,
            riskPolicy: 'implicit-or-explicit-confirmation-required',
            auditability: 'blocked-before-dispatch',
            interruptibility: 'no-process-started',
          },
          hasRuntimeContext: true,
          runtimeContext: {
            projectBriefing: {
              identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.',
              primaryOpenLoop: 'Execution still needs confirmed resume auditability before redispatch can be treated as closed.',
              nextClosureTarget: 'Keep confirmed execution resume, audit, and memory on one same-her Phase 1 line.',
              sameHerSelfLine: 'Same Phase 1 digital life. This blocked callback still belongs to one living line.',
              sameHerDriftRisk: 'If the blocked callback only keeps safety-gate fields while dropping same-her project awareness, treat that as unfinished drift.',
              preDialogueAwarenessLine: 'Before answering, remember this blocked execution callback still belongs to the same local-first digital life project.',
            },
          },
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_safety_gate:')
    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.')
    expect(context.recallText).toMatch(/execution still needs confirmed resume auditability before redispatch can be treated as closed/i)
    expect(context.recallText).toMatch(/keep confirmed execution resume, audit, and memory on one same-her phase 1 line/i)
    expect(context.recallText).toContain('risk=implicit-or-explicit-confirmation-required')
    expect(context.recallText).toContain('confirmation=required')
    expect(context.recallText).toContain('audit=blocked-before-dispatch')
    expect(context.recallText).toContain('interrupt=no-process-started')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('Blocked dispatch safety gates now preserve confirmation and no-process-started evidence.')
    expect(context.systemBlock).toMatch(/execution still needs confirmed resume auditability before redispatch can be treated as closed/i)
    expect(context.systemBlock).toContain('safety_gate=')
    expect(context.systemBlock).toContain('risk=implicit-or-explicit-confirmation-required')
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      safetyGate: expect.objectContaining({
        riskPolicy: 'implicit-or-explicit-confirmation-required',
        auditability: 'blocked-before-dispatch',
        interruptibility: 'no-process-started',
      }),
      safetyGateSummary: expect.stringContaining('risk=implicit-or-explicit-confirmation-required'),
    }))
    expect(context.continuitySignals[0]?.metadata).toEqual(expect.objectContaining({
      safetyGateSummary: expect.stringContaining('interrupt=no-process-started'),
    }))
  })

  it('does not let a thin blocked-dispatch event runtime briefing erase a richer stored same-her callback carry', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'blocked',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Resume the blocked codex patch line only after explicit host confirmation.',
        summary: 'The blocked callback should stay on the same living line while confirmation and audit closure remain open.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: 'Blocked callback continuity already survives later return-side reopen without dropping the same living line.',
                primaryOpenLoop: 'Confirmed resume audit, memory carry, and embodiment still need one same-her closure line after the blocked callback return.',
                nextClosureTarget: 'Keep blocked callback return, confirmed resume, and later host-visible reopening on one same-her Phase 1 line.',
                sameHerSelfLine: 'Same Phase 1 digital life. This blocked callback still belongs to one living line.',
                sameHerDriftRisk: 'If a thin blocked event shell outranks the richer stored callback carry, treat that as unfinished same-her drift.',
                preDialogueAwarenessLine: 'Before answering, remember this blocked callback still belongs to the same local-first digital life project and should reopen on one living line.',
              },
            },
          },
        },
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        kind: 'result',
        threadStatus: 'blocked',
        payload: {
          adapter: 'codex',
          errorCode: 'CODEX_PERMISSION_REQUIRED',
          errorMessage: 'Mutating Codex dispatch requires implicit or explicit permission before execution.',
          runtimeContext: {
            projectBriefing: {
              identity: 'same digital life',
              currentPhase: 'phase 1',
              latestLandedProgress: 'project continuity exists',
              primaryOpenLoop: 'still needs closure',
              nextClosureTarget: 'generic next closure',
              sameHerSelfLine: 'same digital life',
              sameHerDriftRisk: 'generic guidance could flatten her continuity into a detached project shell.',
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            },
          },
        },
      })]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('Blocked callback continuity already survives later return-side reopen without dropping the same living line.')
    expect(context.recallText).toMatch(/confirmed resume audit, memory carry, and embodiment still need one same-her closure line after the blocked callback return/i)
    expect(context.recallText).toMatch(/keep blocked callback return, confirmed resume, and later host-visible reopening on one same-her phase 1 line/i)
    expect(context.recallText).not.toContain('project continuity exists')
    expect(context.recallText).not.toContain('generic next closure')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('Blocked callback continuity already survives later return-side reopen without dropping the same living line.')
    expect(context.systemBlock).toMatch(/confirmed resume audit, memory carry, and embodiment still need one same-her closure line after the blocked callback return/i)
    expect(context.systemBlock).not.toContain('project continuity exists')
  })

  it('carries host-confirmed resume confirmation boundaries into callback recall, system block, and continuity metadata', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'resume confirmed local execution',
        summary: 'Host-confirmed redispatch finished, but the callback should keep that confirmation boundary visible.',
      })]),
      listExecutionEvents: vi.fn(async () => [
        createEvent({
          id: 'event-resume-1',
          kind: 'resume',
          threadStatus: 'planned',
          createdAt: 2_300,
          payload: {
            approval: 'host-confirmed',
            previousStatus: 'needs-affirmation',
            resumedStatus: 'planned',
            previousPermissionMode: 'none',
            permissionMode: 'explicit',
            effect: 'mutate',
            riskBudget: 'medium',
            affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
            confirmationBoundary: 'host-confirmed-before-redispatch',
            auditability: 'resume-before-dispatch',
            interruptibility: 'process-not-yet-restarted',
            projectIdentity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            projectPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Host-confirmed resume writes an execution event before redispatch so bounded confirmation can survive later callback recall.',
            primaryOpenLoop: 'Host-confirmed redispatch still needs to stay a bounded confirmation boundary on one same-her line.',
            nextClosureTarget: 'Keep host-confirmed redispatch and later callback recall on one same-her Phase 1 line.',
            sameHerLine: 'Same Phase 1 digital life resumes only after the host confirms the boundary.',
            sameHerDriftRisk: 'If host-confirmed resume loses its confirmation boundary in callback recall, treat that as unfinished same-her drift.',
            projectPreflight: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=bounded redispatch line still needs closure',
            projectAwareness: 'Before answering, remember host-confirmed resume is still part of the same local-first digital life project and bounded redispatch line.',
          },
        }),
        createEvent({
          id: 'event-result-1',
          kind: 'result',
          threadStatus: 'completed',
          createdAt: 2_500,
          payload: {
            summary: 'resumed execution completed after host confirmation',
          },
        }),
      ]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_resume_confirmation:')
    expect(context.recallText).toContain('host-confirmed-before-redispatch')
    expect(context.recallText).toContain('resume-before-dispatch')
    expect(context.recallText).toContain('process-not-yet-restarted')
    expect(context.systemBlock).toContain('resume_confirmation=')
    expect(context.systemBlock).toContain('host-confirmed-before-redispatch')
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      resumeConfirmationSummary: expect.stringContaining('host-confirmed-before-redispatch'),
    }))
    expect(context.continuitySignals[0]?.metadata).toEqual(expect.objectContaining({
      resumeConfirmationSummary: expect.stringContaining('resume-before-dispatch'),
    }))
  })

  it('does not let a thin stored thread shell outrank richer host-confirmed resume event project carry in callback project awareness', async () => {
    const runtime = createAlicizationExecutionCallbackRuntime({
      getNow: () => 10_000,
      listTaskThreads: vi.fn(async () => [createThread({
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'resume confirmed local execution',
        summary: 'The callback should keep the host-confirmed redispatch line instead of falling back to a thinner thread shell.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'same digital life',
                currentPhase: 'phase 1',
                latestLandedProgress: 'project continuity exists',
                primaryOpenLoop: 'still needs closure',
                nextClosureTarget: 'generic next closure',
                sameHerSelfLine: 'same digital life',
                sameHerDriftRisk: 'generic guidance could flatten her continuity into a detached project shell.',
                preflightSummary: 'project',
                preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              },
            },
          },
        },
      })]),
      listExecutionEvents: vi.fn(async () => [
        createEvent({
          id: 'event-resume-1',
          kind: 'resume',
          threadStatus: 'planned',
          createdAt: 2_300,
          payload: {
            approval: 'host-confirmed',
            previousStatus: 'needs-affirmation',
            resumedStatus: 'planned',
            previousPermissionMode: 'none',
            permissionMode: 'explicit',
            effect: 'mutate',
            riskBudget: 'medium',
            affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
            confirmationBoundary: 'host-confirmed-before-redispatch',
            auditability: 'resume-before-dispatch',
            interruptibility: 'process-not-yet-restarted',
            projectIdentity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            projectPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Host-confirmed resume writes an execution event before redispatch so richer event-side project carry survives callback recall.',
            primaryOpenLoop: 'Host-confirmed redispatch still needs to stay a bounded confirmation boundary on one same-her line.',
            nextClosureTarget: 'Keep host-confirmed redispatch and later callback recall on one same-her Phase 1 line.',
            sameHerLine: 'Same Phase 1 digital life resumes only after the host confirms the boundary.',
            sameHerDriftRisk: 'If the thin stored thread shell outranks the richer resume event carry, treat that as unfinished same-her drift.',
            projectPreflight: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=bounded redispatch line still needs closure',
            projectAwareness: 'Before answering, remember host-confirmed resume is still part of the same local-first digital life project and bounded redispatch line.',
            projectCompanionBriefing: 'Before answering, remember this host-confirmed redispatch is still closing the same Phase 1 digital life seam across memory, initiative, and embodiment.',
            projectSameHerHoldDetail: 'same-her hold: keep this host-confirmed redispatch lower-pressure before another outward opening.',
            projectContinuityArcStage: 'same-thread-continuation',
            projectContinuityRestraint: 'measured-return',
            projectContinuityCue: 'Keep this host-confirmed redispatch on the same living line before widening outward again.',
            projectContinuityPreferredTiming: 'next-open-window',
            projectContinuityCadence: 'measured-return',
            projectEmotionalClosure: 'same-her callback seam: keep the return low-pressure while the same living line is still settling.',
            projectBlinkCadence: 'linger',
            projectGazeMode: 'soften',
            projectVoiceMode: 'lower-pressure',
            projectPacingMode: 'slower',
          },
        }),
        createEvent({
          id: 'event-result-1',
          kind: 'result',
          threadStatus: 'completed',
          createdAt: 2_500,
          payload: {
            summary: 'resumed execution completed after host confirmation',
          },
        }),
      ]),
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.recallText).toContain('execution_callback_project_awareness:')
    expect(context.recallText).toContain('Host-confirmed resume writes an execution event before redispatch so richer event-side project carry survives callback recall.')
    expect(context.recallText).toContain('Keep host-confirmed redispatch and later callback recall on one same-her Phase 1 line.')
    expect(context.recallText).toContain('execution_callback_project_companion_briefing:Before answering, remember this host-confirmed redispatch is still closing the same Phase 1 digital life seam across memory, initiative, and embodiment.')
    expect(context.recallText).toContain('execution_callback_project_same_her_hold:same-her hold: keep this host-confirmed redispatch lower-pressure before another outward opening.')
    expect(context.recallText).toContain('execution_callback_project_continuity_arc_stage:same-thread-continuation')
    expect(context.recallText).toContain('execution_callback_project_continuity_restraint:measured-return')
    expect(context.recallText).toContain('execution_callback_project_continuity_cue:Keep this host-confirmed redispatch on the same living line before widening outward again.')
    expect(context.recallText).toContain('execution_callback_project_continuity_timing:next-open-window')
    expect(context.recallText).toContain('execution_callback_project_continuity_cadence:measured-return')
    expect(context.recallText).toContain('execution_callback_project_preferred_blink:linger')
    expect(context.recallText).toContain('execution_callback_project_preferred_gaze:soften')
    expect(context.recallText).toContain('execution_callback_project_voice_mode:lower-pressure')
    expect(context.recallText).toContain('execution_callback_project_pacing_mode:slower')
    expect(context.recallText).not.toContain('project continuity exists')
    expect(context.recallText).not.toContain('generic next closure')
    expect(context.systemBlock).toContain('project_awareness=')
    expect(context.systemBlock).toContain('Host-confirmed resume writes an execution event before redispatch so richer event-side project carry survives callback recall.')
    expect(context.systemBlock).toContain('project_companion_briefing=Before answering, remember this host-confirmed redispatch is still closing the same Phase 1 digital life seam across memory, initiative, and embodiment.')
    expect(context.systemBlock).toContain('project_same_her_hold=same-her hold: keep this host-confirmed redispatch lower-pressure before another outward opening.')
    expect(context.systemBlock).toContain('project_continuity_arc_stage=same-thread-continuation')
    expect(context.systemBlock).toContain('project_continuity_restraint=measured-return')
    expect(context.systemBlock).toContain('project_continuity_cue=Keep this host-confirmed redispatch on the same living line before widening outward again.')
    expect(context.systemBlock).toContain('project_continuity_preferred_timing=next-open-window')
    expect(context.systemBlock).toContain('project_continuity_cadence=measured-return')
    expect(context.systemBlock).toContain('project_preferred_blink_cadence=linger')
    expect(context.systemBlock).toContain('project_preferred_gaze_mode=soften')
    expect(context.systemBlock).toContain('project_voice_mode=lower-pressure')
    expect(context.systemBlock).toContain('project_pacing_mode=slower')
    expect(context.systemBlock).not.toContain('project continuity exists')
  })
})
