import type { IpcMainEvent } from 'electron'

import type { LifeExpressionReceipt } from '../../../shared/life-contracts'

import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { electronLifeBodyHealth, electronLifeExpressionReceipt, electronLifeInputCommand, electronLifeInputPreview, electronLifeSurfaceSession } from '../../../shared/life-events'
import { setupAlicizationDb } from './db'
import { lifeRelationshipKey, readLifeConversationPreferences } from './life-conversation-preferences'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'
import { registerLifeInvokeHandlers } from './runtime-invoke-handlers-life'

function wire(database: Awaited<ReturnType<typeof setupAlicizationDb>>, senderId: number, visible = () => true, copyText = (_text: string) => {}, url = 'file:///app/renderer/index.html#/', secondDatabase?: Awaited<ReturnType<typeof setupAlicizationDb>>) {
  const handlers = new Map<unknown, (payload: unknown, metadata: { raw?: { ipcMainEvent?: IpcMainEvent } }) => Promise<unknown>>()
  const sender = Object.assign(new EventEmitter(), { id: senderId, isDestroyed: () => false, getURL: () => url })
  registerLifeInvokeHandlers({ register: (event, handler) => handlers.set(event, handler), withCardScope: async (cardId, task) => {
    if (cardId === 'bob' && secondDatabase) {
      const previous = database
      database = secondDatabase
      try { return await task() }
      finally { database = previous }
    }
    if (cardId !== 'alice')
      throw new Error('scope mismatch')
    return task()
  }, read: () => database.readLifeState(), readClosure: id => database.readLifeClosure(id), getIngress: id => database.getLifeIngress(id), getUserInput: id => database.getLifeUserInput(id), copyText, commit: input => database.commitLifeState(input), readSetting: key => database.getMetaValue(key), hasPublishedTurn: (cardId, turnId) => database.hasPublishedLifeTurn(cardId, turnId), getSurface: id => database.getLifeSurface(id), surfaceVisible: visible, rescheduleTimer: async () => {}, cancelExecution: () => {} })
  const metadata = { raw: { ipcMainEvent: { sender } as unknown as IpcMainEvent } }
  return (event: unknown, payload: unknown) => handlers.get(event)!(payload, metadata)
}

describe('desktop presentation recovery', () => {
  it('discards only requirements owned by the held input, preserving newer corrections and relationship state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-input-requirement-discard-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const ports = { getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput }
    const life = createLifeTurnRuntime({ ...ports, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'existing-relationship', changes: [{ owner: 'relationship', key: lifeRelationshipKey, value: JSON.stringify({ relationshipModel: { trust: 0.65 } }) }] })
      await life.admit({ cardId: 'alice', turnId: 'held-requirement', conversationId: 'qa', messages: [{ role: 'user', content: '今天不用给我安排计划，也不用每次都问我问题。' }] }, signal)
      await life.recover('alice')
      const source = (await db.getLifeIngress('user:held-requirement'))!
      await life.admit({ cardId: 'alice', turnId: 'newer-correction', conversationId: 'qa', messages: [{ role: 'user', content: '现在可以多问我几个问题。' }] }, signal)
      const invoke = wire(db, 1)
      await invoke(electronLifeInputCommand, { cardId: 'alice', ingressId: source.id, expectedPayloadHash: source.payloadHash, action: 'discard', operationId: 'discard-requirement' })
      const view = await db.readLifeState()
      expect((await db.getLifeIngress(source.id))?.status).toBe('failed')
      expect(JSON.parse(view.values[lifeRelationshipKey]).relationshipModel).toEqual({ trust: 0.65 })
      expect(await readLifeConversationPreferences(view, ports, Date.now(), 'qa')).toEqual([expect.objectContaining({ kind: 'fewer-questions', value: false, sourceId: 'user:newer-correction' })])
      expect(await db.getLifeUserInput(source.id)).toMatchObject({ role: 'user' })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('commits actual presentation callbacks while the same foreground turn is held without entering another card', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-present-scope-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let active = 'alice'
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({
      scopeLifecycleQueueState: { queue: Promise.resolve() },
      now: Date.now,
      getActiveCardId: () => active,
      normalizeCardId: String,
      sanitizeText: String,
      appendRuntimeDebugLine: async () => {},
      switchCardScopeInner: async (value) => { active = String(value) },
    })
    const handlers = new Map<unknown, (payload: unknown, metadata: any) => Promise<unknown>>()
    registerLifeInvokeHandlers({ register: (event, handler) => handlers.set(event, handler), withCardScope: (cardId, task, options) => orchestrator.withCardScope(cardId, task, options), read: db.readLifeState, readClosure: db.readLifeClosure, commit: db.commitLifeState, getIngress: db.getLifeIngress, getUserInput: db.getLifeUserInput, copyText: () => {}, readSetting: db.getMetaValue, hasPublishedTurn: db.hasPublishedLifeTurn, getSurface: db.getLifeSurface, surfaceVisible: () => true, rescheduleTimer: async () => {}, cancelExecution: () => {} })
    const sender = Object.assign(new EventEmitter(), { id: 8, isDestroyed: () => false, getURL: () => 'file:///app/index.html#/' })
    const metadata = { raw: { ipcMainEvent: { sender } } }
    const gate = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let held: Promise<unknown> | undefined
    let other: Promise<unknown> | undefined
    let recording: Promise<unknown> | undefined
    try {
      const surface = await handlers.get(electronLifeSurfaceSession)!({ cardId: 'alice' }, metadata) as { id: string }
      await db.appendConversationTurn({ cardId: 'alice', sessionId: 'session', turnId: 'spoken', assistantText: '实际回复。' })
      held = orchestrator.withCardScope('alice', async () => {
        started.resolve()
        await gate.promise
      }, { lane: 'foreground', label: 'current-dialogue' })
      await started.promise
      other = orchestrator.withCardScope('bob', async () => active, { lane: 'foreground', label: 'other-card' })
      let accepted = false
      recording = handlers.get(electronLifeExpressionReceipt)!({ cardId: 'alice', receiptId: 'started', deliveryId: 'spoken', turnId: 'spoken', utteranceId: 'voice', segmentId: 'utterance', playbackEpoch: 'voice', surfaceSessionId: surface.id, sequence: 0, state: 'audio-started', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: Date.now() }, metadata).then((result) => {
        accepted = (result as { presentationVerified: boolean }).presentationVerified
      })
      await vi.waitFor(() => expect(accepted).toBe(true), { timeout: 1000 })
      expect(active).toBe('alice')
      expect(JSON.parse((await db.readLifeState()).values['life:expression']).lastReceipt).toMatchObject({ turnId: 'spoken', state: 'audio-started', presentationVerified: true })
      await handlers.get(electronLifeExpressionReceipt)!({ cardId: 'alice', receiptId: 'shown', deliveryId: 'spoken', turnId: 'spoken', utteranceId: 'spoken', segmentId: 'text', playbackEpoch: surface.id, surfaceSessionId: surface.id, sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: Date.now() }, metadata)
      expect(await db.listPresentedLifeTurnIds('alice', ['spoken'])).toEqual(new Set(['spoken']))
      gate.resolve()
      await held
      expect(await other).toBe('bob')
    }
    finally {
      gate.resolve()
      await Promise.allSettled([held, other, recording].filter(Boolean))
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('retains the foreground character while a continued request is still generating', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-input-foreground-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let active = 'alice'
    const orchestrator = createAlicizationRuntimeCardScopeOrchestrator({ scopeLifecycleQueueState: { queue: Promise.resolve() }, now: Date.now, getActiveCardId: () => active, normalizeCardId: String, sanitizeText: value => String(value), appendRuntimeDebugLine: async () => {}, switchCardScopeInner: async (value) => { active = String(value) } })
    const handlers = new Map<unknown, (payload: unknown, metadata: any) => Promise<unknown>>()
    let release!: () => void
    registerLifeInvokeHandlers({ register: (event, handler) => handlers.set(event, handler), withCardScope: (cardId, task, options) => orchestrator.withCardScope(cardId, task, options), read: db.readLifeState, readClosure: db.readLifeClosure, commit: db.commitLifeState, getIngress: db.getLifeIngress, getUserInput: db.getLifeUserInput, copyText: () => {}, readSetting: db.getMetaValue, hasPublishedTurn: db.hasPublishedLifeTurn, getSurface: db.getLifeSurface, surfaceVisible: () => true, rescheduleTimer: async () => {}, cancelExecution: () => {}, resumeInput: async () => {
      release = orchestrator.retainCurrentForegroundScope()
      return { status: 'resumed', turnId: 'continued' }
    } })
    try {
      const sender = Object.assign(new EventEmitter(), { isDestroyed: () => false, getURL: () => 'file:///app/index.html#/settings/life' })
      expect(await handlers.get(electronLifeInputCommand)!({ cardId: 'alice', ingressId: 'original', expectedPayloadHash: 'a'.repeat(64), operationId: 'continue', action: 'resume' }, { raw: { ipcMainEvent: { sender } } })).toMatchObject({ status: 'resumed' })
      const next = orchestrator.withCardScope('bob', async () => active)
      await Promise.resolve()
      expect(active).toBe('alice')
      release()
      expect(await next).toBe('bob')
    }
    finally { release?.(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('does not certify the former character after a window switches to another character', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-surface-affinity-'))
    const alice = await setupAlicizationDb(join(root, 'alice'), { cardId: 'alice' })
    const bob = await setupAlicizationDb(join(root, 'bob'), { cardId: 'bob' })
    try {
      const invoke = wire(alice, 1, () => true, undefined, undefined, bob)
      const { id: sessionId } = await invoke(electronLifeSurfaceSession, { cardId: 'alice' }) as { id: string }
      await alice.appendConversationTurn({ cardId: 'alice', sessionId: 's', turnId: 'a-turn', assistantText: '旧角色的回复。' })
      await invoke(electronLifeSurfaceSession, { cardId: 'bob' })
      const receipt: LifeExpressionReceipt = { cardId: 'alice', receiptId: 'late-a', deliveryId: 'a-turn', turnId: 'a-turn', utteranceId: 'a-turn', segmentId: 'text', playbackEpoch: sessionId, surfaceSessionId: sessionId, sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: Date.now() }
      expect(await invoke(electronLifeExpressionReceipt, receipt)).toMatchObject({ presentationVerified: false })
      expect(await alice.listPresentedLifeTurnIds('alice', ['a-turn'])).toEqual(new Set())
      await expect(invoke(electronLifeBodyHealth, { cardId: 'alice', sessionId, health: { rendererState: 'mounted', renderer: 'live2d', modelSelected: true, canvasPresent: true, visiblePixels: 'visible', errorCode: null } })).rejects.toThrow('stale')
      const fresh = await invoke(electronLifeSurfaceSession, { cardId: 'alice' }) as { id: string }
      expect(await invoke(electronLifeExpressionReceipt, { ...receipt, receiptId: 'fresh-a', surfaceSessionId: fresh.id, playbackEpoch: fresh.id })).toMatchObject({ presentationVerified: true })
    }
    finally { await alice.close(); await bob.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('reviews and copies the durable full input, rejects stale discard and foreign scope, and preserves its archive', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-held-input-ui-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => 100 })
      const text = '原始输入'.repeat(1200)
      await life.admit({ cardId: 'alice', turnId: 'interrupted', conversationId: 'session', messages: [{ role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: 'data:image/png;base64,private-media' } }] }] }, new AbortController().signal)
      await life.recover('alice')
      const input = (await db.getLifeIngress('user:interrupted'))!
      let copied = ''
      const invoke = wire(db, 1, () => true, (text) => { copied = text })
      const scope = { cardId: 'alice', ingressId: input.id, expectedPayloadHash: input.payloadHash }
      const preview = await invoke(electronLifeInputPreview, scope)
      expect(preview).toMatchObject({ text: text.slice(0, 4000), truncated: true, hasAttachments: true })
      expect(JSON.stringify(preview)).not.toContain('private-media')
      expect(await invoke(electronLifeInputCommand, { ...scope, action: 'copy', operationId: 'copy' })).toEqual({ status: 'copied' })
      expect(copied).toBe(text)
      await expect(invoke(electronLifeInputPreview, { ...scope, cardId: 'bob' })).rejects.toThrow('scope mismatch')
      await expect(invoke(electronLifeInputPreview, { ...scope, expectedPayloadHash: '0'.repeat(64) })).rejects.toThrow('changed')
      await expect(wire(db, 2, () => true, () => {}, 'https://example.com/')(electronLifeInputPreview, scope)).rejects.toThrow('trusted local')
      await db.commitLifeState({ cardId: 'alice', operationKey: 'changed-input-phase', changes: [], mutations: [{ type: 'ingress-settle', id: input.id, status: 'processing' }] })
      await expect(invoke(electronLifeInputCommand, { ...scope, action: 'discard', operationId: 'stale-discard' })).rejects.toThrow('Input changed')
      await db.commitLifeState({ cardId: 'alice', operationKey: 'hold-again', changes: [], mutations: [{ type: 'ingress-settle', id: input.id, status: 'held' }] })
      expect(await invoke(electronLifeInputCommand, { ...scope, action: 'discard', operationId: 'discard' })).toEqual({ status: 'discarded' })
      expect((await db.getLifeIngress(input.id))?.status).toBe('failed')
      expect((await db.listConversationTurnsBySession('session'))[0].userText).toBe(text)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('recovers an issued offline receipt after restart, preserves body health, and rejects a fabricated session', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-surface-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let sessionId: string
    try {
      const invoke = wire(db, 1)
      const session = await invoke(electronLifeSurfaceSession, { cardId: 'alice' }) as { id: string }
      sessionId = session.id
      await db.appendConversationTurn({ cardId: 'alice', sessionId: 'conversation', turnId: 'shown-turn', assistantText: 'This was rendered before the process ended.' })
      await invoke(electronLifeBodyHealth, { cardId: 'alice', sessionId, health: { rendererState: 'mounted', renderer: 'live2d', modelSelected: true, canvasPresent: true, visiblePixels: 'unknown', errorCode: null } })
      for (let index = 0; index < 70; index += 1)
        await db.commitLifeState({ cardId: 'alice', operationKey: `later-surface:${index}`, changes: [], mutations: [{ type: 'surface-register', sessionId: `later:${index}`, surface: 'file:///app/renderer/index.html' }] })
      expect((await db.getLifeSurface(sessionId))?.id).toBe(sessionId)
    }
    finally {
      await db.close()
    }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const invoke = wire(restarted, 2)
      await invoke(electronLifeSurfaceSession, { cardId: 'alice' })
      const receipt: LifeExpressionReceipt = { cardId: 'alice', receiptId: 'offline-render', deliveryId: 'shown-turn', turnId: 'shown-turn', utteranceId: 'shown-turn', segmentId: 'text', playbackEpoch: sessionId!, surfaceSessionId: sessionId!, sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: Date.now() }
      await invoke(electronLifeExpressionReceipt, receipt)
      expect(await restarted.listPresentedLifeTurnIds('alice', ['shown-turn'])).toEqual(new Set())
      expect((await invoke(electronLifeExpressionReceipt, receipt) as { status: string }).status).toBe('duplicate')
      expect(JSON.parse((await restarted.readLifeState()).values['life:expression'])).toMatchObject({ body: { rendererState: 'mounted', canvasPresent: true }, lastReceipt: { state: 'rendered' } })
      await expect(invoke(electronLifeExpressionReceipt, { ...receipt, receiptId: 'forged', surfaceSessionId: 'never-issued' })).rejects.toThrow('issued surface')
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps a hidden DOM observation separate from delivery and accepts two later visible turns on one surface', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-native-visibility-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let visible = false
    try {
      const invoke = wire(db, 1, () => visible)
      const { id: surfaceSessionId } = await invoke(electronLifeSurfaceSession, { cardId: 'alice' }) as { id: string }
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '喝茶提醒' })
      await db.claimDueScheduledTasks(100, 1)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'generated', changes: [], mutations: [{ type: 'reminder-generated', taskId: 'tea', expectedGeneration: 1, turnId: 'tea-turn' }] })
      await db.appendConversationTurn({ sessionId: 'session', turnId: 'tea-turn', assistantText: '喝茶时间到了。' })
      const receipt: LifeExpressionReceipt = { cardId: 'alice', receiptId: 'hidden', deliveryId: 'tea-turn', turnId: 'tea-turn', utteranceId: 'tea-turn', segmentId: 'text', playbackEpoch: surfaceSessionId, surfaceSessionId, sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 200 }
      expect(await invoke(electronLifeExpressionReceipt, receipt)).toMatchObject({ presentationVerified: false })
      expect((await db.readLifeState()).obligations[0].status).toBe('verifying')
      expect(await db.listPresentedLifeTurnIds('alice', ['tea-turn'])).toEqual(new Set())
      visible = true
      await invoke(electronLifeExpressionReceipt, { ...receipt, receiptId: 'visible', sequence: 1 })
      expect((await db.readLifeState()).obligations[0].status).toBe('fulfilled')
      await db.appendConversationTurn({ sessionId: 'session', turnId: 'second-turn', assistantText: '接下来聊聊音乐。' })
      await invoke(electronLifeExpressionReceipt, { ...receipt, receiptId: 'second', deliveryId: 'second-turn', turnId: 'second-turn', utteranceId: 'second-turn', sequence: 2 })
      expect(await db.listPresentedLifeTurnIds('alice', ['tea-turn', 'second-turn'])).toEqual(new Set(['tea-turn', 'second-turn']))
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
