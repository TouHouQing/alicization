import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { deriveLifePracticeLessons } from './life-personal-continuity'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('host contact and experience continuity', () => {
  it('records contact once on admission, retains uncertain effects and learns from actual failure receipts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-contact-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const contact = vi.fn(async () => {})
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now, onHostInteraction: contact })
    const signal = new AbortController().signal
    const input = { cardId: 'alice', turnId: 'real-input', conversationId: 'qa', messages: [{ role: 'user', content: '请帮我保存这份笔记' }] }
    try {
      await life.admit(input, signal)
      await life.admit(input, signal)
      expect(contact).toHaveBeenCalledExactlyOnceWith('alice')
      await expect(life.admit({ ...input, messages: [{ role: 'user', content: '换了内容' }] }, signal)).rejects.toThrow('reused')
      expect(contact).toHaveBeenCalledTimes(1)

      const pending = await life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: 'save', capabilityId: 'desktop_click_element', parameters: { text: '保存' } }, signal)
      await life.afterAction({ cardId: 'alice', id: pending.id, outcome: 'failure', output: { effectMayHaveOccurred: true, errorCode: 'WINDOWS_UIA_OPERATION_FAILED' }, interrupted: false })
      expect((await db.getLifeEffect(pending.id))?.status).toBe('uncertain')
      await expect(life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: 'save', capabilityId: 'desktop_click_element', parameters: { text: '保存' } }, signal)).rejects.toThrow('verification')
      await expect(life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: 'another-call-id', capabilityId: 'desktop_click_element', parameters: { text: '保存' } }, signal)).rejects.toThrow('verification')

      const success = await life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: 'read', capabilityId: 'browser_read_page', parameters: {} }, signal)
      await life.afterAction({ cardId: 'alice', id: success.id, outcome: 'success', output: { status: 'completed' }, interrupted: false })
      const denied = await life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: 'send', capabilityId: 'browser_click_element', parameters: { text: '发送' } }, signal)
      await life.afterAction({ cardId: 'alice', id: denied.id, outcome: 'failure', output: { errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST' }, interrupted: false })
      // Unrelated successes must not push the relevant error out of the lesson budget.
      for (let index = 0; index < 16; index++) {
        const observed = await life.beforeAction({ cardId: 'alice', turnId: input.turnId, actionId: `later-read-${index}`, capabilityId: 'browser_read_page', parameters: {} }, signal)
        await life.afterAction({ cardId: 'alice', id: observed.id, outcome: 'success', output: { status: 'completed' }, interrupted: false })
      }
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const nextLife = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => Date.now() + 86_400_000 })
      await nextLife.admit({ ...input, turnId: 'next-day-new-task', messages: [{ role: 'user', content: '先查看当前笔记状态，再决定是否继续' }] }, signal)
      const context = JSON.parse((await nextLife.context('alice')).text)
      expect(context.practiceLessons).toHaveLength(2)
      expect(context.practiceLessons).toEqual(expect.arrayContaining([
        expect.objectContaining({ reason: 'uncertain-effect', skillMastered: false }),
        expect.objectContaining({ reason: 'host-denied', scope: { turnId: input.turnId, actionId: 'send' }, nextAttempt: expect.stringContaining('later explicit authorization') }),
      ]))
      expect(deriveLifePracticeLessons(await db.readLifeState()).some(item => item.capability === 'browser_read_page')).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
