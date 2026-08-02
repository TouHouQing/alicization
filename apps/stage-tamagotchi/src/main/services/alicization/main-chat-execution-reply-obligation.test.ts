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
    expect(JSON.parse(systemBlock)).toEqual({
      type: 'alicization-execution-reply-context',
      data: obligation,
    })
    expect(systemBlock).not.toMatch(/must do|must not do|Open with|WorkingMemory owns|LongTermMemoryRecall owns/iu)
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
    expect(JSON.parse(systemBlock)).toEqual({
      type: 'alicization-execution-reply-context',
      data: obligation,
    })
  })

  it('keeps only verifiable callback fields when an execution failure has no goal or summary', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '刚才那个命令失败了吗',
      } as Message],
      callbackContext: {
        actions: [],
        callbacks: [{
          channel: '',
          createdAt: 20,
          decisionTraceId: 'trace-failed',
          goal: '',
          outcome: 'executor timed out after 30000 ms',
          sessionId: 'session-1',
          status: 'failed',
          summary: '',
          threadId: 'thread-failed',
          turnId: 'turn-failed',
        }],
        continuitySignals: [],
        recallText: '',
        systemBlock: '',
      },
      ledgerContext: {
        entries: [],
        recallText: '',
        systemBlock: '',
      },
    })

    expect(obligation).toEqual({
      followUpQuestion: true,
      outcome: 'executor timed out after 30000 ms',
      source: 'fresh-callback',
      status: 'failed',
    })
  })

  it('keeps only verifiable ledger fields instead of filling missing execution narration', () => {
    const obligation = deriveMainChatExecutionReplyObligation({
      messages: [{
        role: 'user',
        content: '那个任务结果呢',
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
          channel: 'codex',
          eventKinds: ['result'],
          goal: '',
          outcome: 'provider returned HTTP 503',
          status: 'failed',
          summary: '',
        }],
        recallText: '',
        systemBlock: '',
      },
    })

    expect(obligation).toEqual({
      channel: 'codex',
      followUpQuestion: true,
      outcome: 'provider returned HTTP 503',
      source: 'ledger-follow-up',
      status: 'failed',
    })
  })

  it('does not create an execution reply fact when the selected record has no verifiable fields', () => {
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
          channel: '',
          eventKinds: [],
          goal: '',
          outcome: '',
          status: '',
          summary: '',
        }],
        recallText: '',
        systemBlock: '',
      },
    })

    expect(obligation).toBeNull()
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

  it('keeps execution follow-up facts from mutating mind governance', () => {
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
    expect(rules).toEqual({
      mustDo: [],
      mustNotDo: [],
    })

    const originalGovernance = {
      turnMode: 'care',
      truthState: 'live-grounded',
      groundedThisTurn: false,
      personaKernelMode: 'full',
      openingStyle: 'gentle-care',
      relationshipPosture: 'warm',
      repairState: 'none',
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 4,
      mustDo: ['Keep the reply current-turn-governed.'],
      mustNotDo: ['Do not drift into stale scene residue.'],
    } as any
    const governance = applyMainChatExecutionReplyObligationToGovernance(originalGovernance, obligation)

    expect(governance).toBe(originalGovernance)
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

    expect(rules).toEqual({
      mustDo: [],
      mustNotDo: [],
    })
    expect(JSON.parse(systemBlock)).toEqual({
      type: 'alicization-execution-reply-context',
      data: obligation,
    })
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

    const blockedSystemBlock = buildMainChatExecutionReplyObligationSystemBlock(blockedObligation)
    const cancelledSystemBlock = buildMainChatExecutionReplyObligationSystemBlock(cancelledObligation)

    expect(JSON.parse(blockedSystemBlock)).toEqual({
      type: 'alicization-execution-reply-context',
      data: blockedObligation,
    })
    expect(JSON.parse(cancelledSystemBlock)).toEqual({
      type: 'alicization-execution-reply-context',
      data: cancelledObligation,
    })
  })

  it('prefers a fresher ledger-backed active thread over an older completed callback so the latest continuity execution state is not hijacked by stale payoff carry', () => {
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
