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
    expect(rules.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')

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
    expect(governance?.mustDo).toContain('Keep the reply current-turn-governed.')
    expect(governance?.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
    expect(governance?.mustNotDo).toContain('Do not drift into stale scene residue.')
  })
})
