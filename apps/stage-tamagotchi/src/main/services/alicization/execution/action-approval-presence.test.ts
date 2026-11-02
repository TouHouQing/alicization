import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { describe, expect, it, vi } from 'vitest'

import { createLifeExecutionPresenceObserver } from '../life-execution-presence'
import { isActionAwaitingHost, onActionApprovalWaitChanged, withActionApprovalWait } from './action-approval-presence'
import { withActionDispatch } from './action-dispatch-context'
import { deriveExecutionAttention } from './execution-attention'

function currentWork() {
  const thread = { id: 'thread', attemptId: 'attempt', status: 'running', metadata: null } as AlicizationTaskThreadRecord
  const view = { cardId: 'alice', obligations: [{ id: 'goal', threadId: thread.id, status: 'in-progress', generation: 1 }], execution: {
    plans: [{ id: 'plan', rootThreadId: thread.id, obligationGeneration: 1, revision: 1, steps: [{ id: 'click', capabilityId: 'tool.browser_click_element' }] }],
    slices: [{ id: 'slice', planId: 'plan', planRevision: 1, attemptId: 'attempt', ingressId: 'run', state: 'running' }],
    results: [{ planId: 'plan', planRevision: 1, attemptId: 'attempt', stepId: 'click', effectId: 'effect', state: 'running' }],
  }, effects: [{ id: 'effect', turnId: 'run', actionId: 'click', status: 'dispatched', payload: { capabilityId: 'tool.browser_click_element' } }] } as unknown as LifeStateView
  return { thread, view }
}

describe('actual approval wait and execution body', () => {
  it('projects waiting from the live permission promise, preserves gesture sequence, then resumes on actual permission settlement', async () => {
    const { thread, view } = currentWork()
    const publish = vi.fn()
    const onError = vi.fn()
    const read = async () => ({ thread, outcome: null, work: deriveExecutionAttention(view, thread) })
    const observer = createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: thread.id, attemptId: 'attempt', enabled: () => true, read, publish, onError, now: Date.now })
    const decision = Promise.withResolvers<boolean>()
    const opened = Promise.withResolvers<void>()
    const authority = async () => ({ expiresAt: Date.now() + 60000, cardId: 'alice', effectId: 'effect', turnId: 'run' })
    const unsubscribe = onActionApprovalWaitChanged(() => { throw new Error('a broken presentation subscriber') })
    try {
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.work.mode).toBe('acting')
      const pending = withActionDispatch(authority, () => withActionApprovalWait('alice', async () => { opened.resolve(); return decision.promise }))
      await opened.promise
      await observer.flush()
      const waiting = publish.mock.lastCall![0]
      expect(waiting.activity.work).toMatchObject({ mode: 'waiting', causeId: 'effect', source: 'execution-effect' })
      expect(waiting.reasonTags).toContain('execution:awaiting-host-approval')
      expect(waiting.embodiedPresence).toBe('hesitant')
      expect(isActionAwaitingHost('bob', 'effect')).toBe(false)
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.sequence).toBe(waiting.activity.sequence)
      decision.resolve(true)
      expect(await pending).toBe(true)
      await observer.flush()
      expect(publish.mock.lastCall?.[0].activity.work.mode).toBe('acting')
      expect(publish.mock.lastCall?.[0].reasonTags).not.toContain('execution:awaiting-host-approval')
      expect(isActionAwaitingHost('alice', 'effect')).toBe(false)
      await observer.finish()
      const before = publish.mock.calls.length
      await withActionDispatch(authority, () => withActionApprovalWait('alice', async () => true))
      await Promise.resolve()
      expect(publish).toHaveBeenCalledTimes(before)
      expect(onError).not.toHaveBeenCalled()
    }
    finally { decision.resolve(false); unsubscribe(); await observer.finish() }
  })

  it('clears nested waits only after the last promise, never turns manual host control into a life task, and refuses crossed or withdrawn owners', async () => {
    const listener = vi.fn()
    const unsubscribe = onActionApprovalWaitChanged(listener)
    const authority = async () => ({ expiresAt: null, cardId: 'alice', effectId: 'nested', turnId: 'run' })
    try {
      await withActionApprovalWait('alice', async () => expect(isActionAwaitingHost('alice', 'nested')).toBe(false))
      expect(listener).not.toHaveBeenCalled()
      await withActionDispatch(authority, () => withActionApprovalWait('alice', async () => {
        await expect(withActionApprovalWait('alice', async () => { throw new Error('aborted') })).rejects.toThrow('aborted')
        expect(isActionAwaitingHost('alice', 'nested')).toBe(true)
      }))
      expect(isActionAwaitingHost('alice', 'nested')).toBe(false)
      expect(listener).toHaveBeenCalledTimes(2)
      const task = vi.fn(async () => true)
      await expect(withActionDispatch(authority, () => withActionApprovalWait('bob', task))).rejects.toThrow('card')
      expect(task).not.toHaveBeenCalled()
      await expect(withActionDispatch(async () => { throw new Error('withdrawn') }, () => withActionApprovalWait('alice', task))).rejects.toThrow('withdrawn')
      expect(task).not.toHaveBeenCalled()
      expect(listener).toHaveBeenCalledTimes(2)
    }
    finally { unsubscribe() }
  })
})
