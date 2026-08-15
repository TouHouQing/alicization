import type { ChatHistoryItem } from '@proj-alicization/stage-ui/types/chat'

import { describe, expect, it } from 'vitest'

import {
  clearAlicizationSessionRecoveryFailure,
  projectAlicizationSessionRecoveryFailure,
} from './alicization-session-recovery-projection'

describe('alicization session recovery projection', () => {
  it('projects an outer session recovery failure as idempotent infrastructure state', () => {
    const messages: ChatHistoryItem[] = []

    expect(projectAlicizationSessionRecoveryFailure(messages, {
      sessionId: 'session-1',
      error: new Error('message merge failed'),
    })).toBe(true)
    expect(projectAlicizationSessionRecoveryFailure(messages, {
      sessionId: 'session-1',
      error: new Error('message merge failed'),
    })).toBe(false)
    expect(messages).toEqual([{
      id: 'session-1:session-reconcile-error',
      role: 'error',
      content: '会话恢复失败（SESSION_RECONCILE_FAILED）：message merge failed',
    }])
  })

  it('clears the stale outer recovery failure after a successful reconciliation', () => {
    const messages: ChatHistoryItem[] = []
    projectAlicizationSessionRecoveryFailure(messages, {
      sessionId: 'session-1',
      error: 'temporary failure',
    })

    expect(clearAlicizationSessionRecoveryFailure(messages, 'session-1')).toBe(true)
    expect(messages).toEqual([])
  })
})
