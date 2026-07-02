import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import {
  applyMainChatExecutionReplyObligationToGovernance,
  buildMainChatExecutionReplyObligationSystemBlock,
  buildMainChatExecutionReplyVisibleSurfaceRules,
  deriveMainChatExecutionReplyObligation,
} from './main-chat-execution-reply-obligation'

describe('main chat execution reply obligation', () => {
  it('elevates a fresh execution callback into a direct reply obligation for result follow-ups', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '刚才那个命令结果呢',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [{
          channel: 'cli',
          createdAt: 20,
          decisionTraceId: 'trace-1',
          goal: 'Run pnpm typecheck',
          outcome: 'typecheck passed',
          sessionId: 'session-1',
          status: 'completed',
          summary: 'Completed Run pnpm typecheck: typecheck passed',
          threadId: 'thread-1',
          turnId: 'turn-1',
        }],
        continuitySignals: [],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_CALLBACKS]',
      },
      ledgerContext: {
        entries: [],
        recallText: '',
        systemBlock: '',
      },
    })

    expect(obligation).toEqual({
      channel: 'cli',
      followUpQuestion: true,
      goal: 'Run pnpm typecheck',
      outcome: 'typecheck passed',
      source: 'fresh-callback',
      status: 'completed',
      summary: 'Completed Run pnpm typecheck: typecheck passed',
    })
    const systemBlock = buildMainChatExecutionReplyObligationSystemBlock(obligation!)
    expect(systemBlock).toContain('[ALICIZATION_EXECUTION_REPLY_OBLIGATION]')
    expect(systemBlock).toContain('Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.')
    expect(systemBlock).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(systemBlock).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(systemBlock).toContain('latest_landed_progress=')
    expect(systemBlock).toContain('primary_open_loop=')
    expect(systemBlock).toContain('next_closure_target=')
    expect(systemBlock).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(systemBlock).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(systemBlock).toContain('same_her_drift_risk=If project-state continuity survives only as generic guidance while first-person continuity disappears, treat that as unfinished closure drift rather than a successful turn.')
    expect(systemBlock).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(systemBlock).toContain('project_awareness=Before answering, remember:')
    expect(systemBlock).toContain('project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.')
    expect(systemBlock).toContain('Status: completed.')
    expect(systemBlock).toContain('Outcome: typecheck passed.')
    expect(systemBlock).toContain('Visible-surface must do:')
    expect(systemBlock).toContain('Visible-surface must not do:')
  })

  it('falls back to ledger-backed follow-up obligation when no fresh callback is pending', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '那个任务状态怎么样了',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      },
      ledgerContext: {
        entries: [{
          activityAt: 20,
          channel: 'claude-code',
          eventKinds: ['dispatch', 'result'],
          goal: 'Investigate the runtime regression',
          outcome: 'found the failing branch guard',
          status: 'completed',
          summary: 'Regression investigation completed',
        }],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
      },
    })

    expect(obligation).toEqual(expect.objectContaining({
      source: 'ledger-follow-up',
      channel: 'claude-code',
      status: 'completed',
    }))
    const systemBlock = buildMainChatExecutionReplyObligationSystemBlock(obligation!)
    expect(systemBlock).toContain('Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.')
    expect(systemBlock).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.')
    expect(systemBlock).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(systemBlock).toContain('same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".')
    expect(systemBlock).toContain('project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.')
    expect(systemBlock).toContain('project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.')
  })

  it('stays inactive when the current user turn is unrelated to execution results', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '你现在困吗',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [{
          channel: 'cli',
          createdAt: 20,
          decisionTraceId: 'trace-1',
          goal: 'Run pnpm typecheck',
          outcome: 'typecheck passed',
          sessionId: 'session-1',
          status: 'completed',
          summary: 'Completed Run pnpm typecheck: typecheck passed',
          threadId: 'thread-1',
          turnId: 'turn-1',
        }],
        continuitySignals: [],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_CALLBACKS]',
      },
      ledgerContext: {
        entries: [],
        recallText: '',
        systemBlock: '',
      },
    })

    expect(obligation).toBeNull()
  })

  it('derives reusable visible-surface rules and overlays them onto mind governance', () => {
    const obligation = {
      channel: 'cli',
      followUpQuestion: true,
      goal: 'Run pnpm typecheck',
      outcome: 'typecheck passed',
      source: 'fresh-callback',
      status: 'completed',
      summary: 'Completed Run pnpm typecheck: typecheck passed',
    } as const

    const rules = buildMainChatExecutionReplyVisibleSurfaceRules(obligation)
    expect(rules.mustDo).toContain('Use the first sentence to pay off the freshest executor result for the current follow-up.')
    expect(rules.mustDo).toContain('State plainly that the task already finished and surface the strongest outcome before any new planning.')
    expect(rules.mustDo).toContain('Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.')
    expect(rules.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
    expect(rules.mustNotDo).toContain('Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.')

    const governance = applyMainChatExecutionReplyObligationToGovernance({
      turnMode: 'care',
      truthState: 'live-grounded',
      groundedThisTurn: false,
      personaKernelMode: 'full',
      openingStyle: 'gentle-care',
      relationshipPosture: 'warm',
      repairState: 'none',
      suppressAssociativeRecall: false,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 4,
      mustDo: ['Keep the reply current-turn-governed.'],
      mustNotDo: ['Do not drift into stale scene residue.'],
    }, obligation)

    expect(governance?.openingStyle).toBe('direct-answer')
    expect(governance?.mustDo).toContain('Use the first sentence to pay off the freshest executor result for the current follow-up.')
    expect(governance?.mustDo).toContain('Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.')
    expect(governance?.mustDo).toContain('Keep the reply current-turn-governed.')
    expect(governance?.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
    expect(governance?.mustNotDo).toContain('Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.')
    expect(governance?.mustNotDo).toContain('Do not drift into stale scene residue.')
  })

  it('keeps affirmation-gated follow-ups explicit instead of flattening them into generic unfinished-task language', () => {
    const obligation = {
      channel: 'codex',
      followUpQuestion: true,
      goal: 'Patch the unresolved Alicization runtime seam',
      outcome: '',
      source: 'ledger-follow-up',
      status: 'needs-affirmation',
      summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
    } as const

    const rules = buildMainChatExecutionReplyVisibleSurfaceRules(obligation)
    const systemBlock = buildMainChatExecutionReplyObligationSystemBlock(obligation)

    expect(rules.mustDo).toContain('State plainly that the task is still waiting for the host\'s confirmation before it can continue.')
    expect(systemBlock).toContain('Status: needs-affirmation.')
    expect(systemBlock).toContain('State plainly that the task is still waiting for the host\'s confirmation before it can continue.')
  })

  it('keeps blocked and cancelled follow-ups distinct from generic failure narration', () => {
    const blockedObligation = {
      channel: 'cli',
      followUpQuestion: true,
      goal: 'Run blocked task.',
      outcome: 'permission required',
      source: 'fresh-callback',
      status: 'blocked',
      summary: 'Blocked Run blocked task.: permission required',
    } as const
    const cancelledObligation = {
      channel: 'cli',
      followUpQuestion: true,
      goal: 'Run cancelled task.',
      outcome: 'host cancelled it',
      source: 'fresh-callback',
      status: 'cancelled',
      summary: 'Cancelled Run cancelled task.: host cancelled it',
    } as const

    const blockedRules = buildMainChatExecutionReplyVisibleSurfaceRules(blockedObligation)
    const blockedSystemBlock = buildMainChatExecutionReplyObligationSystemBlock(blockedObligation)
    const cancelledRules = buildMainChatExecutionReplyVisibleSurfaceRules(cancelledObligation)
    const cancelledSystemBlock = buildMainChatExecutionReplyObligationSystemBlock(cancelledObligation)

    expect(blockedRules.mustDo).toContain('State plainly that the task is currently blocked and surface the blocking reason before any next-step advice.')
    expect(blockedSystemBlock).toContain('Status: blocked.')
    expect(blockedSystemBlock).toContain('State plainly that the task is currently blocked and surface the blocking reason before any next-step advice.')
    expect(cancelledRules.mustDo).toContain('State plainly that the task was cancelled or stopped and is no longer running before any next-step advice.')
    expect(cancelledSystemBlock).toContain('Status: cancelled.')
    expect(cancelledSystemBlock).toContain('State plainly that the task was cancelled or stopped and is no longer running before any next-step advice.')
  })

  it('prefers a fresher ledger-backed active thread over an older completed callback so the latest same-her execution state is not hijacked by stale payoff carry', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '那个任务状态怎么样了',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [{
          channel: 'cli',
          createdAt: 20,
          decisionTraceId: 'trace-old-completed',
          goal: 'Run pnpm typecheck',
          outcome: 'typecheck passed',
          sessionId: 'session-1',
          status: 'completed',
          summary: 'Completed Run pnpm typecheck: typecheck passed',
          threadId: 'thread-old-completed',
          turnId: 'turn-old-completed',
        }],
        continuitySignals: [],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_CALLBACKS]',
      },
      ledgerContext: {
        entries: [{
          activityAt: 40,
          channel: 'codex',
          eventKinds: ['plan'],
          goal: 'Patch the unresolved Alicization runtime seam',
          outcome: '',
          status: 'needs-affirmation',
          summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
        }],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
      },
    })

    expect(obligation).toEqual(expect.objectContaining({
      source: 'ledger-follow-up',
      channel: 'codex',
      status: 'needs-affirmation',
      goal: 'Patch the unresolved Alicization runtime seam',
    }))
  })

  it('treats affirmation-specific follow-up wording as an execution-result follow-up even when the host asks more naturally than using generic result or status words', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '还在等我确认吗',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      },
      ledgerContext: {
        entries: [{
          activityAt: 40,
          channel: 'codex',
          eventKinds: ['plan'],
          goal: 'Patch the unresolved Alicization runtime seam',
          outcome: '',
          status: 'needs-affirmation',
          summary: 'Execution is waiting for affirmation before codex can act on Patch the unresolved Alicization runtime seam.',
        }],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
      },
    })

    expect(obligation).toEqual(expect.objectContaining({
      source: 'ledger-follow-up',
      channel: 'codex',
      status: 'needs-affirmation',
    }))
  })

  it('treats blocked-specific follow-up wording as an execution-result follow-up even when the host asks whether the thread is stuck', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '是不是卡住了',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      },
      ledgerContext: {
        entries: [{
          activityAt: 40,
          channel: 'cli',
          eventKinds: ['dispatch', 'result'],
          goal: 'Run blocked task.',
          outcome: 'permission required',
          status: 'blocked',
          summary: 'Blocked Run blocked task.: permission required',
        }],
        recallText: '',
        systemBlock: '[ALICIZATION_EXECUTION_LEDGER]',
      },
    })

    expect(obligation).toEqual(expect.objectContaining({
      source: 'ledger-follow-up',
      channel: 'cli',
      status: 'blocked',
    }))
  })
})
