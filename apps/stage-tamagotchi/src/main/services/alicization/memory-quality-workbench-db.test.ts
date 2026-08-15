import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryTurn,
} from './life-core/working-memory'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-quality-db-'))
  sandboxDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

describe('memory quality workbench DB loop', () => {
  it('persists beginner recall labels and exports a monthly regression pack', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const item = await db.recordMemoryQualityGoldLabel({
        cardId: 'default',
        month: '2026-08',
        label: 'wrong',
        reason: 'wrong-thread',
        query: '你还记得我现在的 embedding baseUrl 怎么填吗？',
        expectedMemoryIds: ['memory-current-baseurl'],
        retrievedCandidateIds: ['memory-current-baseurl', 'memory-old-baseurl'],
        surfacedMemoryIds: ['memory-old-baseurl'],
        wrongThreadIds: ['memory-old-baseurl'],
        turnId: 'turn-embedding-1',
        decisionTraceId: 'trace-embedding-1',
        note: '她提到了旧线程里的 baseUrl。',
        createdAt: Date.parse('2026-08-04T08:00:00.000Z'),
      })

      expect(item).toMatchObject({
        cardId: 'default',
        month: '2026-08',
        label: 'wrong',
        labelText: '记错了',
        reason: 'wrong-thread',
        evaluationClass: 'false-recall',
        benchmarkDimensions: ['multi-session-reasoning', 'knowledge-update'],
        expectedMemoryIds: ['memory-current-baseurl'],
        surfacedMemoryIds: ['memory-old-baseurl'],
        wrongThreadIds: ['memory-old-baseurl'],
      })

      const list = await db.listMemoryQualityGoldLabels({
        cardId: 'default',
        month: '2026-08',
      })
      expect(list.items.map(row => row.id)).toEqual([item.id])
      expect(list.nextCursor).toBeNull()

      const pack = await db.buildMonthlyGoldRegressionPack({
        cardId: 'default',
        month: '2026-08',
      })
      expect(pack).toMatchObject({
        version: 'memory-quality-monthly-gold-regression-pack-v1',
        cardId: 'default',
        month: '2026-08',
        itemCount: 1,
      })
      expect(pack.items[0]).toMatchObject({
        label: 'wrong',
        labelText: '记错了',
        reason: 'wrong-thread',
        query: '你还记得我现在的 embedding baseUrl 怎么填吗？',
        wrongThreadIds: ['memory-old-baseurl'],
      })
    }
    finally {
      await db.close()
    }
  })

  it('runs a production trial from persisted gold labels and real long-term recall', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-siliconflow-baseurl',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'task',
        summary: '用户纠正过：SiliconFlow embedding baseUrl 只填 https://api.siliconflow.cn，系统补 /v1/embeddings。',
        lesson: 'embedding provider 失败要直接暴露错误，不用固定人格模板遮盖。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: Date.parse('2026-08-04T08:05:00.000Z'),
        updatedAt: Date.parse('2026-08-04T08:05:00.000Z'),
      }])
      await db.recordMemoryQualityGoldLabel({
        cardId: 'default',
        month: '2026-08',
        label: 'right',
        query: '你还记得 SiliconFlow embedding baseUrl 应该怎么填吗？',
        expectedMemoryIds: ['reflection-siliconflow-baseurl'],
        surfacedMemoryIds: ['reflection-siliconflow-baseurl'],
        createdAt: Date.parse('2026-08-04T08:10:00.000Z'),
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })

      expect(report.version).toBe('memory-production-trial-runner-v1')
      expect(report.cardId).toBe('default')
      expect(report.summary.longTermFixtureCount).toBe(1)
      expect(report.quality.longTerm[0]?.fixtureId).toContain('reflection-siliconflow-baseurl')
      expect(report.quality.longTerm[0]?.topIds).toContain('reflection-siliconflow-baseurl')
      expect(report.stages.map(stage => stage.stage)).toContain('long-term-recall')
    }
    finally {
      await db.close()
    }
  })

  it('builds compression and next-turn recall fixtures from persisted WorkingMemory checkpoints', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const createdAt = Date.parse('2026-08-04T08:20:00.000Z')
      const snapshot = createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId: 'session-compression-trial',
        now: createdAt,
      })
      snapshot.recentRawTurns = [
        normalizeWorkingMemoryTurn({
          turnId: 'turn-compression-user',
          role: 'user',
          text: '记住，Provider 失败必须透明告诉我。',
          createdAt: createdAt - 2_000,
          source: 'conversation-turn',
          visibility: 'user-visible',
          importance: 0.96,
        }),
        normalizeWorkingMemoryTurn({
          turnId: 'turn-compression-provider-error',
          role: 'tool',
          text: 'embedding provider failed with HTTP 400',
          createdAt: createdAt - 1_000,
          source: 'runtime-event',
          visibility: 'internal',
          failureKind: 'provider-error',
          importance: 0.95,
        }),
      ]
      snapshot.currentThread = {
        title: 'Provider 失败透明链路',
        currentUserMove: '继续这个。',
        currentAliceMove: '继续检查 Provider 失败透明链路，并把真实错误保留在报告里。',
        primaryAnchor: null,
        mode: 'repair',
        shouldHold: true,
        confidence: 0.94,
      }
      snapshot.activeTask = {
        summary: '检查 Provider 失败透明链路',
        status: 'active',
        evidenceTurnIds: ['turn-compression-user'],
      }
      snapshot.commitments = [{
        text: 'Provider 失败必须透明告诉用户。',
        sourceTurnId: 'turn-compression-user',
      }]
      snapshot.userCorrections = [{
        text: '不要用固定人格回复遮盖 Provider 失败。',
        sourceTurnId: 'turn-compression-user',
        scope: 'reply',
      }]
      snapshot.memoryQueryHints = ['Provider 失败 透明']
      snapshot.audit = {
        failureTurnIds: ['turn-compression-provider-error'],
        excludedLongTermCandidateTurnIds: ['turn-compression-provider-error'],
        notes: ['provider-error-visible'],
      }
      await db.upsertWorkingMemoryCheckpoint(snapshot)
      await db.upsertMemoryReflections([{
        id: 'reflection-provider-failure-transparent',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'boundary',
        summary: '用户要求 Provider 失败必须透明说明。',
        lesson: '不要用固定人格回复遮盖真实错误。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt,
        updatedAt: createdAt,
      }])

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })

      expect(report.summary.workingMemoryFixtureCount).toBe(1)
      expect(report.summary.compressedContextBehaviorFixtureCount).toBe(1)
      expect(report.summary.experienceQualityFixtureCount).toBe(1)
      expect(report.stages.map(stage => stage.stage)).toEqual(expect.arrayContaining([
        'working-memory-compression',
        'compressed-context-behavior',
        'experience-quality',
      ]))
      expect(report.compressedContextBehavior?.summary.fixtureCount).toBe(1)
      expect(report.compressedContextBehavior?.results[0]?.compressed.topIds).toContain('reflection-provider-failure-transparent')
      expect(report.experienceQuality?.summary.fixtureCount).toBe(1)
    }
    finally {
      await db.close()
    }
  })

  it('runs the selected persisted conversation as a structured DB dialogue replay report', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const sessionId = 'session-production-replay'
      const createdAt = Date.parse('2026-08-04T08:30:00.000Z')
      const checkpoint = createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId,
        now: createdAt,
      })
      await db.upsertWorkingMemoryCheckpoint(checkpoint)
      const productionCheckpointBeforeTrial = await db.getWorkingMemoryCheckpoint('default', sessionId)
      await db.appendConversationTurn({
        turnId: 'turn-replay-1',
        sessionId,
        userText: '先记住这条真实回放。',
        assistantText: '我会把这条真实回放接住。',
        createdAt,
      })
      await db.appendConversationTurn({
        turnId: 'turn-replay-2',
        sessionId,
        userText: '继续验证回放报告。',
        assistantText: '回放报告已经沿着持久化记忆链路运行。',
        createdAt: createdAt + 1_000,
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        replayPackId: sessionId,
        month: '2026-08',
      })

      expect(report.passed).toBe(false)
      expect(report.summary.failingStageIds).toContain('runtime-health')
      expect(report.runtimeHealth?.embedding.providerConfigured).toBe(false)
      expect(report.summary.dialogueReplayCount).toBe(1)
      expect(report.dialogueReplay).toMatchObject({
        version: 'memory-db-dialogue-replay-report-v1',
        passed: true,
        summary: {
          turnCount: 2,
          succeededTurnCount: 2,
          failedTurnCount: 0,
          checkpointWriteCount: 2,
        },
      })
      expect(report.dialogueReplay?.turns.map(turn => turn.providerOutput)).toEqual([
        '我会把这条真实回放接住。',
        '回放报告已经沿着持久化记忆链路运行。',
      ])
      expect(report.dialogueReplay?.turns[0]?.stages.find(stage => stage.name === 'hydration')).toMatchObject({
        details: {
          found: false,
        },
      })
      expect(report.stages).toContainEqual(expect.objectContaining({
        stage: 'dialogue-replay',
        passed: true,
        itemCount: 2,
      }))
      expect(await db.getWorkingMemoryCheckpoint('default', sessionId)).toEqual(productionCheckpointBeforeTrial)
    }
    finally {
      await db.close()
    }
  })

  it('defaults to the latest WorkingMemory session for the current card', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const sessionId = 'session-default-replay'
      const createdAt = Date.parse('2026-08-04T08:40:00.000Z')
      await db.upsertWorkingMemoryCheckpoint(createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId,
        now: createdAt,
      }))
      await db.appendConversationTurn({
        turnId: 'turn-default-replay',
        sessionId,
        userText: '运行默认回放。',
        assistantText: '默认回放已读取当前机体的会话。',
        createdAt,
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })

      expect(report.summary.dialogueReplayCount).toBe(1)
      expect(report.dialogueReplay?.id).toContain(sessionId)
      expect(report.dialogueReplay?.summary.turnCount).toBe(1)
    }
    finally {
      await db.close()
    }
  })

  it('rejects an explicitly selected session outside the current card scope', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const foreignSessionId = 'session-foreign-card'
      await db.appendConversationTurn({
        turnId: 'turn-foreign',
        sessionId: foreignSessionId,
        userText: '这条会话不属于当前机体。',
        assistantText: '不应该被当前机体回放。',
        createdAt: Date.parse('2026-08-04T08:50:00.000Z'),
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        replayPackId: foreignSessionId,
        month: '2026-08',
      })

      expect(report.passed).toBe(false)
      expect(report.stages[0]).toMatchObject({
        stage: 'dialogue-replay',
        passed: false,
        error: `会话 ${foreignSessionId} 不属于当前机体的 WorkingMemory 范围，无法运行真实对话回放。`,
      })
      expect(report.dialogueReplay).toBeNull()
    }
    finally {
      await db.close()
    }
  })
})
