import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { observeLifeInterfaceResult, readLifeInterfaceExpectation } from './life-interface-action-closure'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('observed interface goals', () => {
  it('closes a save of an observed existing value through its modal and independent file proof', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-observed-input-file-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    const file = join(root, 'saved.txt')
    const content = '雨声陪伴'
    const hash = createHash('sha256').update(content).digest('hex')
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => ++now, observeInterface: async () => null })
    const desktop = { channel: 'desktop', windowId: '10', processId: 22, desktop: 'owned-qa', status: 'completed', ok: true, finalStatus: 'completed' }
    const step = async (id: string, operation: string, output: Record<string, unknown>, parameters = {}) => {
      const effect = await life.beforeAction({ cardId: 'alice', turnId: 'save', actionId: id, capabilityId: operation, parameters }, signal)
      await life.afterAction({ cardId: 'alice', id: effect.id, outcome: 'success', output: { ...desktop, operation, ...output }, interrupted: false })
      return effect.id
    }
    try {
      await life.admit({ cardId: 'alice', turnId: 'save', conversationId: 'qa', messages: [{ role: 'user', content: '继续保存输入框里已有的内容，遇到冲突先观察再覆盖，最后读取文件核对。' }] }, signal)
      const observedInput = await step('observe-input', 'desktop_list_interactables', { elements: [{ runtimeId: 'input', role: 'input', value: content, password: false, enabled: true, readOnly: false }] })
      const ownerClick = await step('save-click', 'desktop_click_element', { target: 'save' })
      const modal = await step('observe-modal', 'desktop_list_interactables', { windowId: '11', ownerWindowId: '10', elements: [{ runtimeId: 'confirm' }] })
      await step('confirm', 'desktop_click_element', { windowId: '11', ownerWindowId: '10', target: 'confirm' })
      await writeFile(file, content)
      const read = async (id: string) => step(id, 'read_file', { content, contentHash: hash, truncated: false, path: file, verifiedPath: file }, { path: file })
      await read('read-saved')
      const goal = (await db.readLifeState()).obligations.find(item => item.proof.kind === 'file')!
      expect(goal).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied', evidence: { typedEffectId: null, observedInputEffectId: observedInput, ownerClickEffectId: ownerClick, modalObservationEffectId: modal } } })
      await writeFile(file, 'different actual bytes')
      await read('false-readback')
      const later = (await db.readLifeState()).obligations.find(item => item.id !== goal.id && item.proof.kind === 'file')!
      expect(later.verification?.verdict).toBe('not-satisfied')
      expect(later.status).not.toBe('fulfilled')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('requires an actual preceding action and an independent matching read, retaining changed targets as incomplete', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-interface-closure-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    let actual = { channel: 'browser', browser: 'alicization-managed', operation: 'browser_read_page', status: 'completed', ok: true, finalStatus: 'completed', url: 'http://owned-qa.invalid/result', text: '已保存\n雨声陪伴', elements: [] }
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now, observeInterface: async (proof) => {
      const expectation = readLifeInterfaceExpectation(proof)
      return observeLifeInterfaceResult(actual, expectation.elementIds, expectation.predicate)
    } })
    async function step(actionId: string, operation: string, output: unknown, parameters = {}) {
      const prepared = await life.beforeAction({ cardId: 'alice', turnId: 'ui', actionId, capabilityId: operation, parameters }, signal)
      await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'success', output, interrupted: false })
      return prepared.id
    }
    try {
      await life.admit({ cardId: 'alice', turnId: 'ui', conversationId: 'qa', messages: [{ role: 'user', content: '在测试表单保存雨声陪伴，确认页面结果' }] }, signal)
      await step('read-only', 'browser_read_page', actual)
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      await step('click', 'browser_click_element', { channel: 'browser', operation: 'browser_click_element', url: 'http://owned-qa.invalid/', ok: true, status: 'completed', finalStatus: 'completed', target: '#save' })
      await step('unplanned-read', 'browser_read_page', actual)
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      await step('verified-read', 'browser_read_page', actual, { expectedText: '已保存' })
      const fulfilled = (await db.readLifeState()).obligations[0]
      expect(fulfilled).toMatchObject({ status: 'fulfilled', proof: { kind: 'interface-state', channel: 'browser' }, verification: { independent: true, verdict: 'satisfied', evidence: { scope: 'displayed-interface-only' } } })
      expect(fulfilled.summary).toContain('external persistence')
      const old = { ...actual }
      actual = { ...actual, text: '尚未保存' }
      await step('changed-read', 'browser_read_page', old, { expectedText: '已保存' })
      expect((await db.readLifeState()).obligations.filter(goal => goal.status === 'fulfilled')).toHaveLength(1)
      expect((await db.readLifeState()).obligations.find(goal => goal.id !== fulfilled.id)?.verification?.verdict).toBe('not-satisfied')
      const failure = await step('guarded-rejection', 'browser_click_element', { channel: 'browser', operation: 'browser_click_element', status: 'failed', errorCode: 'LOCAL_BROWSER_STALE_TARGET', sideEffectState: 'none' })
      expect((await db.getLifeEffect(failure))?.receipt?.outcome).toBe('failure')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not accept an unowned page, missing controls or a spoofed native target', () => {
    expect(observeLifeInterfaceResult({ status: 'completed', channel: 'browser', operation: 'browser_read_page', url: 'http://unowned.invalid', elements: [] })).toBeNull()
    const observed = { status: 'completed', channel: 'browser', browser: 'alicization-managed', operation: 'browser_read_page', url: 'http://owned.invalid', elements: [{ selector: '#note', value: 'a', tag: 'input' }], text: '' }
    expect(observeLifeInterfaceResult(observed, ['#missing'])).toBeNull()
    expect(observeLifeInterfaceResult({ ...observed, url: 'http://other.invalid' })?.contentHash).not.toBe(observeLifeInterfaceResult(observed)?.contentHash)
    expect(observeLifeInterfaceResult({ status: 'completed', channel: 'desktop', operation: 'desktop_list_interactables', elements: [] })).toBeNull()
  })
})
