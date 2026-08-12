import type {
  AlicizationRuntimeEventEnvelope,
} from '@proj-alicization/stage-shared'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import {
  createAlicizationRuntimeEvent,
} from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createAlicizationRuntimeCheckpointStore } from './checkpoint-store'
import {
  createAlicizationRuntimeReplyArtifact,
  createAlicizationRuntimeReplyDeliveryIntent,
} from './reply-artifact'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-checkpoint-store-test-'))
  sandboxDirs.push(dir)
  return dir
}

function openSqlite(filepath: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    let database: sqlite3.Database | null = null
    database = new sqlite3.Database(filepath, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(database!)
    })
  })
}

function runSqlite(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve())
  })
}

function getSqlite<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error, row) => error ? reject(error) : resolve(row as T | undefined))
  })
}

function allSqlite<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve((rows ?? []) as T[]))
  })
}

function closeSqlite(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve())
  })
}

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

afterEach(async () => {
  await Promise.all(sandboxDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

function runtimeScope(overrides: Partial<{
  turnId: string
  cardId: string
  userId: string
  conversationId: string
}> = {}) {
  return {
    turnId: 'turn-1',
    cardId: 'card-1',
    userId: 'user-1',
    conversationId: 'conversation-1',
    ...overrides,
  }
}

function runtimeEvent(
  eventId: string,
  eventType: AlicizationRuntimeEventEnvelope['eventType'],
  scope = runtimeScope(),
) {
  return createAlicizationRuntimeEvent({
    eventId,
    eventType,
    turnId: scope.turnId,
    cardId: scope.cardId,
    userId: scope.userId,
    conversationId: scope.conversationId,
    source: 'runtime',
    occurredAt: 1_000,
    payload: { eventId },
  })
}

function checkpointProjection(activeActionIds: string[] = []) {
  return {
    actions: Object.fromEntries(activeActionIds.map(actionId => [
      actionId,
      {
        actionId,
        toolCallId: `${actionId}:tool-call`,
        status: 'active' as const,
        terminalObservationId: null,
        lastObservation: null,
        outcome: null,
        pendingTerminalStatus: null,
        completionPendingObservation: false,
        lateEventCount: 0,
        lastSequence: 0,
      },
    ])),
    pendingActionSettlements: {},
    replyCommitted: false,
    pendingDelivery: null,
    committedDelivery: null,
    terminalEventType: null,
    issues: [],
  }
}

function replyDeliveryIntent(
  turnId: string,
  visibleText = 'Visible reply',
  fullText = '  {"reply":"Visible reply","trace":"preserved"}  ',
) {
  const artifact = createAlicizationRuntimeReplyArtifact({
    artifactVersion: 1,
    visibleText,
    fullText,
    finishReason: 'stop',
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'turn-event-loop',
    },
    realization: {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText,
      visibleReplyValidationStatus: 'approved',
      nonHumanAuthoredStatus: null,
      blockedReasons: [],
      reason: 'turn-event-loop',
      critic: {
        version: 'visible-reply-critic-public-summary-v1',
        status: 'pass',
        providerMindRequired: true,
        reasonCodes: [],
      },
      closure: {
        version: 'visible-reply-closure-public-summary-v1',
        status: 'approved',
        reasonCodes: [],
        initialCriticStatus: 'pass',
        finalCriticStatus: 'pass',
      },
    },
  })
  return createAlicizationRuntimeReplyDeliveryIntent(
    { turnId },
    'inline',
    artifact,
  )
}

function completedActionProjection(overrides: Record<string, unknown> = {}) {
  return {
    actionId: 'action-1',
    toolCallId: 'tool-call-1',
    status: 'completed',
    terminalObservationId: 'observation-1',
    lastObservation: {
      actionId: 'action-1',
      observationId: 'observation-1',
      toolCallId: 'tool-call-1',
      terminal: true,
      outcome: 'success',
    },
    outcome: 'success',
    pendingTerminalStatus: null,
    completionPendingObservation: false,
    lateEventCount: 0,
    lastSequence: 1,
    ...overrides,
  }
}

describe('alicization runtime checkpoint store', () => {
  it('saves, loads, and upserts a recoverable checkpoint', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: checkpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 1_000,
      abortSignal: AbortSignal.abort(),
      activeActions: new Map([['action-1', { status: 'running' }]]),
      resume: () => {},
    } as any)
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1', 'action-2'],
      deliveryOwner: 'callback',
      projection: checkpointProjection(['action-1', 'action-2']),
      schemaVersion: 3,
      updatedAt: 2_000,
    })

    const loaded = await db.loadRuntimeCheckpoint(scope)

    expect(loaded).toEqual({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1', 'action-2'],
      deliveryOwner: 'callback',
      projection: checkpointProjection(['action-1', 'action-2']),
      schemaVersion: 3,
      updatedAt: 2_000,
    })
    expect(loaded).not.toHaveProperty('abortSignal')
    expect(loaded).not.toHaveProperty('activeActions')
    expect(loaded).not.toHaveProperty('resume')

    await db.close()
  })

  it('persists pending action settlements outside the executable action projection', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope({ turnId: 'turn-pending-settlement-checkpoint' })
    await db.appendRuntimeEvent(scope, runtimeEvent(
      'event-pending-settlement',
      'turn.accepted',
      scope,
    ))
    const pendingActionSettlements = {
      'settlement-1': {
        settlementId: 'settlement-1',
        actionId: 'action-1',
        toolCallId: 'action-1:tool-call',
        observationId: 'observation-1',
      },
    }
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: {
        ...checkpointProjection(['action-1']),
        pendingActionSettlements,
      },
      schemaVersion: 3,
      updatedAt: 1_000,
    } as any)

    const loaded = await db.loadRuntimeCheckpoint(scope)

    expect(loaded?.projection.pendingActionSettlements).toEqual(
      pendingActionSettlements,
    )
    expect(loaded?.activeActionIds).toEqual(['action-1'])
    expect(Object.keys(loaded?.projection.actions ?? {})).toEqual(['action-1'])
    await db.close()
  })

  it('isolates checkpoint save and load by the full turn scope', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 0,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })

    const foreignScope = runtimeScope({
      userId: 'user-2',
      conversationId: 'conversation-2',
    })
    await expect(db.loadRuntimeCheckpoint(foreignScope)).rejects.toThrow(/scope/i)
    await expect(db.saveRuntimeCheckpoint({
      ...foreignScope,
      sequence: 0,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 2_000,
    })).rejects.toThrow(/scope/i)

    await db.close()
  })

  it('rejects stale checkpoint sequences and older same-sequence updates', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: checkpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 2_000,
    })

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'waiting',
      activeActionIds: [],
      deliveryOwner: 'callback',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 3_000,
    }))
      .rejects
      .toThrow(/stale checkpoint sequence/i)
    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: [],
      deliveryOwner: 'callback',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_999,
    }))
      .rejects
      .toThrow(/checkpoint updatedAt/i)

    expect(await db.loadRuntimeCheckpoint(scope)).toMatchObject({
      sequence: 2,
      status: 'running',
      updatedAt: 2_000,
    })
    await db.close()
  })

  it('rejects checkpoints beyond the event cursor and allows valid cursor advances', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 3,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    }))
      .rejects
      .toThrow(/event cursor/i)

    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: checkpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 1_500,
    })
    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'waiting',
      activeActionIds: ['action-1'],
      deliveryOwner: 'callback',
      projection: checkpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 2_000,
    }))
      .rejects
      .toThrow(/same sequence|semantic/i)

    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: ['action-1'],
      deliveryOwner: 'inline',
      projection: checkpointProjection(['action-1']),
      schemaVersion: 3,
      updatedAt: 2_000,
    })

    expect(await db.loadRuntimeCheckpoint(scope)).toMatchObject({
      sequence: 2,
      status: 'running',
      deliveryOwner: 'inline',
      updatedAt: 2_000,
    })
    await db.close()
  })

  it.each([
    ['status', {
      status: 'waiting',
    }],
    ['delivery owner', {
      deliveryOwner: 'callback',
    }],
    ['projection', {
      projection: {
        ...checkpointProjection(),
        replyCommitted: true,
        committedDelivery: replyDeliveryIntent('turn-same-sequence-projection'),
      },
    }],
    ['active action ids', {
      activeActionIds: ['action-2'],
      projection: checkpointProjection(['action-2']),
    }],
  ])('rejects a different %s projection at the same sequence', async (_label, overrides) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope({ turnId: `turn-same-sequence-${_label.replaceAll(' ', '-')}` })
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted', scope))
    const checkpoint = {
      ...scope,
      sequence: 1,
      status: 'running' as const,
      activeActionIds: [],
      deliveryOwner: 'inline' as const,
      projection: checkpointProjection(),
      schemaVersion: 3 as const,
      updatedAt: 1_000,
    }
    await db.saveRuntimeCheckpoint(checkpoint)

    await expect(db.saveRuntimeCheckpoint({
      ...checkpoint,
      ...overrides,
      updatedAt: 2_000,
    } as any))
      .rejects
      .toThrow(/same sequence|semantic/i)

    expect(await db.loadRuntimeCheckpoint(scope)).toEqual(checkpoint)
    await db.close()
  })

  it('rejects a foreign checkpoint when events already own the turn', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const eventScope = runtimeScope()
    await db.appendRuntimeEvent(eventScope, runtimeEvent('event-1', 'turn.accepted', eventScope))
    const foreignScope = runtimeScope({
      cardId: 'card-foreign',
      userId: 'user-foreign',
      conversationId: 'conversation-foreign',
    })

    await expect(db.saveRuntimeCheckpoint({
      ...foreignScope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    }))
      .rejects
      .toThrow(/scope/i)
    await expect(db.loadRuntimeCheckpoint(foreignScope))
      .rejects
      .toThrow(/scope/i)

    await db.close()
  })

  it.each([
    ['unknown status', {
      status: 'unknown-status',
      schemaVersion: 3,
    }],
    ['unsupported schema version', {
      status: 'running',
      schemaVersion: 2,
    }],
  ])('rejects an %s checkpoint contract', async (_label, overrides) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 0,
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      updatedAt: 1_000,
      ...overrides,
    } as any))
      .rejects
      .toThrow(/checkpoint (status|schemaVersion)/i)

    await db.close()
  })

  it.each([
    ['a non-terminal event type as terminalEventType', () => ({
      projection: {
        ...checkpointProjection(),
        terminalEventType: 'model.step.completed',
      },
    })],
    ['a completed status without turn.completed', () => ({
      status: 'completed',
    })],
    ['turn.completed on a running status', () => ({
      projection: {
        ...checkpointProjection(),
        terminalEventType: 'turn.completed',
      },
    })],
    ['turn.completed without a committed reply', () => ({
      status: 'completed',
      projection: {
        ...checkpointProjection(),
        terminalEventType: 'turn.completed',
      },
    })],
    ['a committed reply without committed delivery identity', () => ({
      projection: {
        ...checkpointProjection(),
        replyCommitted: true,
      },
    })],
    ['active as a pending terminal status', () => {
      const projection = checkpointProjection(['action-1'])
      projection.actions['action-1']!.pendingTerminalStatus = 'active' as any
      return {
        activeActionIds: ['action-1'],
        projection,
      }
    }],
    ['an observation from another action', () => ({
      projection: {
        ...checkpointProjection(),
        actions: {
          'action-1': completedActionProjection({
            lastObservation: {
              ...completedActionProjection().lastObservation,
              actionId: 'action-other',
            },
          }),
        },
      },
    })],
    ['an observation from another tool call', () => ({
      projection: {
        ...checkpointProjection(),
        actions: {
          'action-1': completedActionProjection({
            lastObservation: {
              ...completedActionProjection().lastObservation,
              toolCallId: 'tool-call-other',
            },
          }),
        },
      },
    })],
    ['a non-terminal observation on a terminal action', () => ({
      projection: {
        ...checkpointProjection(),
        actions: {
          'action-1': completedActionProjection({
            lastObservation: {
              ...completedActionProjection().lastObservation,
              terminal: false,
            },
          }),
        },
      },
    })],
    ['an outcome that disagrees with the action status', () => ({
      projection: {
        ...checkpointProjection(),
        actions: {
          'action-1': completedActionProjection({
            outcome: 'failure',
            lastObservation: {
              ...completedActionProjection().lastObservation,
              outcome: 'failure',
            },
          }),
        },
      },
    })],
    ['an action cursor beyond the checkpoint cursor', () => ({
      projection: {
        ...checkpointProjection(),
        actions: {
          'action-1': completedActionProjection({
            lastSequence: 2,
          }),
        },
      },
    })],
    ['an undefined runtime issue code', () => ({
      projection: {
        ...checkpointProjection(),
        issues: [{
          code: 'not-a-runtime-issue',
          sequence: 1,
        }],
      },
    })],
    ['an issue cursor beyond the checkpoint cursor', () => ({
      projection: {
        ...checkpointProjection(),
        issues: [{
          code: 'late-action-event',
          sequence: 2,
        }],
      },
    })],
    ['a committed reply with a pending delivery', () => ({
      projection: {
        ...checkpointProjection(),
        replyCommitted: true,
        pendingDelivery: replyDeliveryIntent(
          'turn-invalid-projection',
          'Pending reply',
          '  {"reply":"Pending reply","trace":"preserved"}  ',
        ),
        committedDelivery: replyDeliveryIntent(
          'turn-invalid-projection',
          'Committed reply',
          '  {"reply":"Committed reply","trace":"preserved"}  ',
        ),
      },
    })],
  ])('rejects checkpoint projection with %s on save', async (_label, buildOverrides) => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope({ turnId: 'turn-invalid-projection' })
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted', scope))

    await expect(db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
      ...buildOverrides(),
    } as any))
      .rejects
      .toThrow(/checkpoint|projection|terminal|sequence|issue|observation/i)

    await db.close()
  })

  it('restores the complete committed reply artifact from a completed checkpoint', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope({ turnId: 'turn-completed-delivery-artifact' })
    const fullText = '  {"reply":"Recovered reply","trace":"raw provider bytes"}  '
    const committedDelivery = replyDeliveryIntent(
      scope.turnId,
      'Recovered reply',
      fullText,
    )
    await db.appendRuntimeEvent(
      scope,
      runtimeEvent('event-turn-completed', 'turn.completed', scope),
    )
    const checkpoint = {
      ...scope,
      sequence: 1,
      status: 'completed' as const,
      activeActionIds: [],
      deliveryOwner: 'inline' as const,
      projection: {
        ...checkpointProjection(),
        replyCommitted: true,
        committedDelivery,
        terminalEventType: 'turn.completed' as const,
      },
      schemaVersion: 3 as const,
      updatedAt: 1_000,
    }

    await db.saveRuntimeCheckpoint(checkpoint)

    const restored = await db.loadRuntimeCheckpoint(scope)
    expect(restored).toEqual(checkpoint)
    expect(restored?.projection.committedDelivery).toMatchObject({
      replyId: `${scope.turnId}:reply`,
      deliveryId: `${scope.turnId}:delivery:inline`,
      contentHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      artifactHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      artifact: {
        visibleText: 'Recovered reply',
        fullText,
      },
    })
    await db.close()
  })

  it('rejects a corrupted checkpoint projection on load', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const scope = runtimeScope({ turnId: 'turn-corrupted-checkpoint' })
    const db = await setupAlicizationDb(userDataPath, {
      allowUnboundScope: true,
    })
    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted', scope))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 1,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 1_000,
    })
    const databasePath = db.dbPath
    await db.close()

    const database = await openSqlite(databasePath)
    await runSqlite(
      database,
      `
      UPDATE alicization_runtime_checkpoints
      SET projection_json = ?
      WHERE turn_id = ?
      `,
      [
        JSON.stringify({
          ...checkpointProjection(),
          issues: [{
            code: 'injected-issue-code',
            sequence: 1,
          }],
        }),
        scope.turnId,
      ],
    )
    await closeSqlite(database)

    const reopened = await setupAlicizationDb(userDataPath, {
      allowUnboundScope: true,
    })
    await expect(reopened.loadRuntimeCheckpoint(scope))
      .rejects
      .toThrow(/issue code|checkpoint projection/i)
    await reopened.close()
  })

  it('recovers by loading checkpoint before listing tail events', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      allowUnboundScope: true,
    })
    const scope = runtimeScope()

    await db.appendRuntimeEvent(scope, runtimeEvent('event-1', 'turn.accepted'))
    await db.appendRuntimeEvent(scope, runtimeEvent('event-2', 'context.assembly.started'))
    await db.saveRuntimeCheckpoint({
      ...scope,
      sequence: 2,
      status: 'running',
      activeActionIds: [],
      deliveryOwner: 'inline',
      projection: checkpointProjection(),
      schemaVersion: 3,
      updatedAt: 2_000,
    })
    await db.appendRuntimeEvent(scope, runtimeEvent('event-3', 'context.assembly.completed'))

    const checkpoint = await db.loadRuntimeCheckpoint(scope)
    const tail = await db.listRuntimeEvents(scope, {
      afterSequence: checkpoint?.sequence ?? 0,
    })

    expect(checkpoint?.sequence).toBe(2)
    expect(tail.map(event => [event.eventId, event.sequence])).toEqual([
      ['event-3', 3],
    ])

    await db.close()
  })

  it('loads checkpoint and event cursor from one SQLite read snapshot during a concurrent commit', async () => {
    const dir = await createSandboxUserDataPath()
    const databasePath = join(dir, 'checkpoint-load-snapshot.sqlite')
    const reader = await openSqlite(databasePath)
    const writer = await openSqlite(databasePath)
    const firstReadFinished = createDeferred()
    const writerCommitted = createDeferred()
    let barrierReached = false

    const readWithBarrier = async <T>(
      sql: string,
      read: () => Promise<T>,
    ) => {
      const readsEvents = sql.includes('alicization_runtime_events')
      const readsCheckpoints = sql.includes('alicization_runtime_checkpoints')
      if (!readsEvents && !readsCheckpoints)
        return await read()

      if (readsEvents && readsCheckpoints) {
        if (!barrierReached) {
          barrierReached = true
          firstReadFinished.resolve()
        }
        await writerCommitted.promise
        return await read()
      }

      const result = await read()
      if (!barrierReached) {
        barrierReached = true
        firstReadFinished.resolve()
        await writerCommitted.promise
      }
      return result
    }

    try {
      await runSqlite(reader, 'PRAGMA journal_mode = WAL')
      await runSqlite(writer, 'PRAGMA journal_mode = WAL')
      await runSqlite(reader, `
        CREATE TABLE alicization_runtime_events (
          turn_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          sequence INTEGER NOT NULL
        )
      `)
      await runSqlite(reader, `
        CREATE TABLE alicization_runtime_checkpoints (
          turn_id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          runtime_status TEXT NOT NULL,
          active_action_ids_json TEXT NOT NULL,
          delivery_owner TEXT NOT NULL,
          projection_json TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)

      const store = createAlicizationRuntimeCheckpointStore({
        database: reader,
        run: async (database, sql, params = []) => await runSqlite(database, sql, params),
        get: async <T>(database: sqlite3.Database, sql: string, params: unknown[] = []) => {
          return await readWithBarrier(sql, async () => await getSqlite<T>(database, sql, params))
        },
        all: async <T>(database: sqlite3.Database, sql: string, params: unknown[] = []) => {
          return await readWithBarrier(sql, async () => await allSqlite<T>(database, sql, params))
        },
        runInTransaction: async <T>(
          _database: sqlite3.Database,
          task: () => Promise<T>,
        ) => await task(),
        enqueueWrite: async <T>(task: () => Promise<T>) => await task(),
      })
      const scope = runtimeScope()
      const loading = store.load(scope)

      await firstReadFinished.promise
      await runSqlite(writer, 'BEGIN IMMEDIATE')
      await runSqlite(
        writer,
        `
        INSERT INTO alicization_runtime_events (
          turn_id, card_id, user_id, conversation_id, sequence
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [scope.turnId, scope.cardId, scope.userId, scope.conversationId, 1],
      )
      await runSqlite(
        writer,
        `
        INSERT INTO alicization_runtime_checkpoints (
          turn_id,
          card_id,
          user_id,
          conversation_id,
          sequence,
          runtime_status,
          active_action_ids_json,
          delivery_owner,
          projection_json,
          schema_version,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          scope.turnId,
          scope.cardId,
          scope.userId,
          scope.conversationId,
          1,
          'running',
          '["action-1"]',
          'inline',
          JSON.stringify(checkpointProjection(['action-1'])),
          3,
          1_000,
        ],
      )
      await runSqlite(writer, 'COMMIT')
      writerCommitted.resolve()

      await expect(loading).resolves.toEqual({
        ...scope,
        sequence: 1,
        status: 'running',
        activeActionIds: ['action-1'],
        deliveryOwner: 'inline',
        projection: checkpointProjection(['action-1']),
        schemaVersion: 3,
        updatedAt: 1_000,
      })
    }
    finally {
      writerCommitted.resolve()
      await Promise.all([closeSqlite(reader), closeSqlite(writer)])
    }
  })
})
