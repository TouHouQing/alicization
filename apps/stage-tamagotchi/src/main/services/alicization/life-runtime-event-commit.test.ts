import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createAlicizationRuntimeEvent } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { createAlicizationRuntimeReplyArtifact, createAlicizationRuntimeReplyDeliveryIntent } from './turn-os/reply-artifact'

describe('runtime event, life read set and checkpoint commit', () => {
  it('rolls back a stale action atomically, then dispatches only the freshly adopted proposal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-action-owner-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'write', conversationId: 'session', messages: [{ role: 'user', content: '写入指定测试文件。' }] }, signal)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'habit-one', changes: [{ owner: 'habit', key: 'mind-head:alice:habit-policy', value: '{"version":1}' }] })
      const adopted = (await db.readLifeState()).owners
      await db.commitLifeState({ cardId: 'alice', operationKey: 'habit-two', changes: [{ owner: 'habit', key: 'mind-head:alice:habit-policy', value: '{"version":2}' }] })
      const input = { cardId: 'alice', turnId: 'write', actionId: 'old', capabilityId: 'tool.filesystem_write_file', parameters: { path: join(root, 'proof.txt'), content: 'rain' }, owners: adopted }
      await expect(life.beforeAction(input, signal)).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
      expect((await db.readLifeState()).effects).toEqual([])
      const current = (await db.readLifeState()).owners
      const dispatched = await life.beforeAction({ ...input, actionId: 'fresh', owners: current }, signal)
      expect((await db.readLifeState()).effects).toEqual([expect.objectContaining({ id: dispatched.id, status: 'dispatched' })])
      await expect(life.beforeAction({ ...input, actionId: 'fresh', owners: current }, signal)).rejects.toThrow('verification is required')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('records the exact already-reviewed delivery after outcome owners advance, while rejecting a different hash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-published-event-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const scope = { cardId: 'alice', turnId: 'published', userId: 'host', conversationId: 'conversation' }
    try {
      await db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'user', eventType: 'turn.accepted', payload: { deliveryOwner: 'inline' } }))
      await db.commitLifeState({ cardId: 'alice', operationKey: 'initial', changes: [{ owner: 'memory', key: 'life:memory-head', value: '{"version":1}' }] })
      const owners = (await db.readLifeState()).owners
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
      const signal = new AbortController().signal
      await life.recordContextUse({ cardId: 'alice', turnId: scope.turnId, requestHash: 'actual-request', evidenceIds: [], owners }, signal)
      const text = '你好。'
      const artifact = createAlicizationRuntimeReplyArtifact({ artifactVersion: 1, visibleText: text, fullText: text, finishReason: 'stop', visibleReplyExecution: { mode: 'provider-stream', expectedVisibleReplyAuthority: 'llm-mind', actualVisibleReplyAuthority: 'llm-mind', providerMindExecuted: true, reason: 'protocol-qa' }, realization: { version: 'visible-reply-realization-v1', expectedAuthority: 'llm-mind', actualAuthority: 'llm-mind', providerMindExecuted: true, mode: 'provider-stream', visibleText: text, visibleReplyValidationStatus: 'approved', nonHumanAuthoredStatus: null, blockedReasons: [], reason: 'protocol-qa', critic: { version: 'visible-reply-critic-public-summary-v1', status: 'pass', providerMindRequired: true, reasonCodes: [] }, closure: { version: 'visible-reply-closure-public-summary-v1', status: 'approved', reasonCodes: [], initialCriticStatus: 'pass', finalCriticStatus: 'pass' } } })
      const intent = createAlicizationRuntimeReplyDeliveryIntent(scope, 'inline', artifact)
      await db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'model', eventType: 'model.step.completed', payload: { stepIndex: 1, outcome: 'reply', ...intent } }))
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, readMemoryEvidence: () => db.readLifeFactVersions({ cardId: 'alice' }), read: db.readLifeState, commit: db.commitLifeState, now: Date.now, generate: async () => '{"claims":[]}' })
      const accepted = await review({ cardId: 'alice', turnId: scope.turnId, text, owners, signal })
      await db.appendConversationTurn({ sessionId: 'conversation', turnId: scope.turnId, assistantText: text, lifeReplyFence: { owners, reviewId: accepted.reviewId! } })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'outcome', changes: [{ owner: 'memory', key: 'life:memory-head', value: '{"version":2}' }] })
      const { artifact: _artifact, ...identity } = intent
      await expect(db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'model', eventType: 'assistant.reply.committed', payload: { ...identity, contentHash: `sha256:${'0'.repeat(64)}` } }))).rejects.toThrow('stale')
      await db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'model', eventType: 'assistant.reply.committed', payload: identity }))
      expect((await db.loadRuntimeCheckpoint(scope))?.sequence).toBe(3)
      expect((await db.listRuntimeEvents(scope)).map(event => event.eventType)).toEqual(['turn.accepted', 'model.step.completed', 'assistant.reply.committed'])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('atomically advances the cursor and rejects an obsolete reply without an event or checkpoint tail', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-event-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const scope = { cardId: 'alice', turnId: 'turn', userId: 'host', conversationId: 'conversation' }
    try {
      await db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'user', eventType: 'turn.accepted', payload: { deliveryOwner: 'inline' } }))
      expect((await db.loadRuntimeCheckpoint(scope))?.sequence).toBe(1)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'memory-base', changes: [{ owner: 'memory', key: 'life:memory-head', value: '{"version":1}' }] })
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
      await life.recordContextUse({ cardId: 'alice', turnId: 'turn', requestHash: 'provider-request', evidenceIds: [], owners: (await life.context('alice')).owners }, new AbortController().signal)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'memory-correction', changes: [{ owner: 'memory', key: 'life:memory-head', value: '{"version":2}' }] })
      const before = await db.readLifeState()
      await expect(db.appendRuntimeEvent(scope, createAlicizationRuntimeEvent({ ...scope, source: 'model', eventType: 'assistant.reply.committed', payload: {} }))).rejects.toThrow('stale')
      expect((await db.listRuntimeEvents(scope)).map(event => event.eventType)).toEqual(['turn.accepted'])
      expect((await db.loadRuntimeCheckpoint(scope))?.sequence).toBe(1)
      expect((await db.readLifeState()).revision).toBe(before.revision)
    }
    finally {
      await db.close()
    }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      expect((await restarted.loadRuntimeCheckpoint(scope))?.sequence).toBe(1)
      expect((await restarted.listRuntimeEvents(scope))).toHaveLength(1)
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
