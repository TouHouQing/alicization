import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryTurn,
} from './life-core/working-memory'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-quality-db-'))
  sandboxDirs.push(dir)
  return dir
}

function createSemanticScaleReport(corpusSize: number, id: string) {
  return runMemorySemanticScaleSoakHarness({
    id,
    createdAt: Date.parse('2026-08-15T00:00:00.000Z'),
    minimumCorpusSize: corpusSize,
    searches: [{
      id: `${id}:search`,
      corpusSize,
      indexMode: 'sqlite-vec',
      approximate: false,
      degraded: false,
      nativeIndexReady: true,
      coverageRatio: 1,
      queries: [{
        id: `${id}:query`,
        expectedTopIds: ['target'],
        returnedIds: ['target'],
        forbiddenIds: ['foreign'],
        latencyMs: 1,
      }],
    }],
  })
}

function createFailedSemanticScaleReport(corpusSize: number, id: string) {
  const report = createSemanticScaleReport(corpusSize, id)
  return {
    ...report,
    passed: false,
    summary: {
      ...report.summary,
      failingChecks: ['recall-at-k'],
    },
    recommendedNextActions: ['inspect semantic scale recall misses'],
  }
}

async function waitFor<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 2_000,
) {
  const startedAt = Date.now()
  while (true) {
    const value = await read()
    if (predicate(value))
      return value
    if (Date.now() - startedAt >= timeoutMs)
      throw new Error('timed out waiting for semantic scale job state')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
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
  it('controls card-scoped semantic scale jobs through start, status, list, cancel, and retry', async () => {
    let mode: 'block' | 'fail' | 'succeed' = 'block'
    let executionStarted: (() => void) | undefined
    const executionStartedPromise = new Promise<void>((resolve) => {
      executionStarted = resolve
    })
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      semanticScaleJobOptions: {
        maxAttempts: 1,
        retryBaseMs: 1,
        executeJob: async ({ corpusSize, signal }) => {
          executionStarted?.()
          if (mode === 'block') {
            await new Promise<void>((_resolve, reject) => {
              signal.addEventListener('abort', () => reject(signal.reason), { once: true })
            })
          }
          if (mode === 'fail')
            throw new Error('semantic scale test failure')
          return createSemanticScaleReport(corpusSize, 'semantic-scale-db-control')
        },
      },
    })
    try {
      const started = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'start',
        tier: '10k',
      })
      expect(started.job).toMatchObject({
        cardId: 'default',
        tier: '10k',
        corpusSize: 10_000,
      })
      await executionStartedPromise

      const running = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'status',
        jobId: started.job!.jobId,
      })
      expect(running.job?.status).toBe('running')

      const history = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'list',
      })
      expect(history.jobs.map(job => job.jobId)).toContain(started.job!.jobId)

      await expect(db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'other-card',
        action: 'status',
        jobId: started.job!.jobId,
      })).rejects.toThrow('does not belong to card')

      const cancelRequested = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'cancel',
        jobId: started.job!.jobId,
        reason: '用户取消 10k 语义规模压测',
      })
      expect(cancelRequested.job?.status).toBe('cancel_requested')
      const cancelled = await waitFor(
        async () => await db.manageMemoryWorkbenchSemanticScaleJobs({
          cardId: 'default',
          action: 'status',
          jobId: started.job!.jobId,
        }),
        result => result.job?.status === 'cancelled',
      )
      expect(cancelled.job?.lastError).toBe('用户取消 10k 语义规模压测')

      mode = 'fail'
      const failedStart = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'start',
        tier: '100k',
      })
      const failed = await waitFor(
        async () => await db.manageMemoryWorkbenchSemanticScaleJobs({
          cardId: 'default',
          action: 'status',
          jobId: failedStart.job!.jobId,
        }),
        result => result.job?.deadLettered === true,
      )
      expect(failed.job).toMatchObject({
        status: 'failed',
        deadLettered: true,
        attemptCount: 1,
        maxAttempts: 1,
        lastError: 'semantic scale test failure',
      })

      mode = 'succeed'
      const retried = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'retry',
        jobId: failedStart.job!.jobId,
      })
      expect(retried.job?.status).toBe('queued')
      const completed = await waitFor(
        async () => await db.manageMemoryWorkbenchSemanticScaleJobs({
          cardId: 'default',
          action: 'status',
          jobId: failedStart.job!.jobId,
        }),
        result => result.job?.status === 'completed',
      )
      expect(completed.job?.report?.id).toBe('semantic-scale-db-control')
    }
    finally {
      await db.close()
    }
  })

  it('feeds the latest completed semantic scale report into production trial without writing long-term memory', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      semanticScaleJobOptions: {
        executeJob: async ({ corpusSize }) =>
          createSemanticScaleReport(corpusSize, 'semantic-scale-production-report'),
      },
    })
    try {
      const started = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'start',
        tier: '10k',
      })
      await waitFor(
        async () => await db.manageMemoryWorkbenchSemanticScaleJobs({
          cardId: 'default',
          action: 'status',
          jobId: started.job!.jobId,
        }),
        result => result.job?.status === 'completed',
      )

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })
      const longTerm = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
      })

      expect(report.summary.semanticScaleSoakRunCount).toBe(1)
      expect(report.summary.notRunStageIds).not.toContain('semantic-scale-soak')
      expect(report.semanticScaleSoak?.id).toBe('semantic-scale-production-report')
      expect(longTerm.items).toEqual([])
    }
    finally {
      await db.close()
    }
  })

  it('feeds the latest failed semantic scale report into production trial transparently', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      semanticScaleJobOptions: {
        maxAttempts: 1,
        executeJob: async ({ corpusSize }) =>
          createFailedSemanticScaleReport(corpusSize, 'semantic-scale-production-failure'),
      },
    })
    try {
      const started = await db.manageMemoryWorkbenchSemanticScaleJobs({
        cardId: 'default',
        action: 'start',
        tier: '10k',
      })
      await waitFor(
        async () => await db.manageMemoryWorkbenchSemanticScaleJobs({
          cardId: 'default',
          action: 'status',
          jobId: started.job!.jobId,
        }),
        result => result.job?.deadLettered === true,
      )

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })

      expect(report.summary.semanticScaleSoakRunCount).toBe(1)
      expect(report.summary.notRunStageIds).not.toContain('semantic-scale-soak')
      expect(report.semanticScaleSoak).toMatchObject({
        id: 'semantic-scale-production-failure',
        passed: false,
        summary: {
          failingChecks: ['recall-at-k'],
        },
        recommendedNextActions: ['inspect semantic scale recall misses'],
      })
      expect(report.passed).toBe(false)
    }
    finally {
      await db.close()
    }
  })

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
      expect(report.summary.scopeFuzzCaseCount).toBeGreaterThan(0)
      expect(report.scopeFuzz?.passed, JSON.stringify(report.scopeFuzz?.violations)).toBe(true)
      expect(report.summary.notRunStageIds).toContain('semantic-scale-soak')
    }
    finally {
      await db.close()
    }
  })

  it('builds temporal conflict fixtures from expired labels and superseding facts', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryFacts([{
        subject: 'SiliconFlow embedding baseUrl',
        predicate: '填写方式',
        object: 'https://api.siliconflow.cn/v1/embeddings',
        confidence: 0.8,
        validationStatus: 'superseded',
      }], 'rule')
      const oldFact = (await db.listMemoryFacts())
        .find(item => item.object.includes('/v1/embeddings'))
      expect(oldFact).toBeDefined()
      await db.upsertMemoryFacts([{
        subject: 'SiliconFlow embedding baseUrl',
        predicate: '填写方式',
        object: 'https://api.siliconflow.cn',
        confidence: 0.98,
        validationStatus: 'validated',
        supersedes: [oldFact!.id],
      }], 'rule')
      const currentFact = (await db.listMemoryFacts())
        .find(item => item.object === 'https://api.siliconflow.cn')
      expect(currentFact).toBeDefined()
      await db.tombstoneLongTermMemorySources({
        sourceIds: [oldFact!.id],
        source: 'memory_facts',
        reason: '旧 baseUrl 已被用户纠正',
      })
      await db.recordMemoryQualityGoldLabel({
        cardId: 'default',
        month: '2026-08',
        label: 'wrong',
        reason: 'expired',
        query: '现在 SiliconFlow embedding baseUrl 应该怎么填？',
        expectedMemoryIds: [currentFact!.id],
        retrievedCandidateIds: [currentFact!.id, oldFact!.id],
        surfacedMemoryIds: [oldFact!.id],
        createdAt: Date.parse('2026-08-04T08:12:00.000Z'),
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        month: '2026-08',
      })

      expect(report.summary.temporalConflictFixtureCount).toBeGreaterThan(0)
      expect(report.temporalConflict?.results.some(result =>
        result.trace.scenario === 'knowledge-update'
        && result.trace.forbiddenIds.includes(oldFact!.id),
      )).toBe(true)
      expect(report.temporalConflict?.results.some(result =>
        result.trace.scenario === 'tombstone'
        && result.trace.blockedIds.includes(oldFact!.id),
      )).toBe(true)
      expect(report.summary.notRunStageIds).not.toContain('temporal-conflict')
    }
    finally {
      await db.close()
    }
  }, 60_000)

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
        sessionId,
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

  it('runs a configured live provider trial with read-only recall and no production writes', async () => {
    const provider = {
      generate: vi.fn(async (input: {
        messages: Array<{ role: string, content: string }>
      }) => ({
        text: `Provider 收到 ${input.messages.length} 条消息。`,
        providerId: 'provider-live',
        modelId: 'model-live',
        finishReason: 'stop',
        retryCount: 1,
        latencyMs: 12,
      })),
    }
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      memoryTrialProvider: provider,
    })
    try {
      const sessionId = 'session-live-provider-trial'
      const createdAt = Date.parse('2026-08-04T08:35:00.000Z')
      await db.upsertWorkingMemoryCheckpoint(createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId,
        now: createdAt,
      }))
      await db.appendConversationTurn({
        turnId: 'turn-live-provider',
        sessionId,
        userText: '你还记得白樱线吗？',
        assistantText: '历史回复不应作为本次真实 Provider 输出。',
        createdAt,
      })
      await db.appendEpisodicEvents([{
        cardId: 'default',
        turnId: 'turn-live-provider-memory',
        sessionId: 'session-memory-source',
        sourceKind: 'reply',
        provenance: 'observed',
        occurredAt: createdAt - 10_000,
        whereSummary: '桌面对话',
        withWhom: ['host'],
        threadAnchor: '白樱线',
        whatHappened: '用户要求白樱线保持在同一段真实桌面对话里。',
        felt: '认真',
        emotionTags: ['continuity'],
        whatChanged: '形成长期连续性约束。',
        relationshipMeaning: '应当记住用户在意的连续性。',
        lesson: '长期回想要尊重真实会话边界。',
        sourceSummary: '对白樱线的明确要求',
        confidence: 0.96,
        salience: 0.92,
        sceneAttachment: 0.7,
        consolidationPriority: 0.8,
        relationshipShift: {
          closenessDelta: 0,
          trustDelta: 0.02,
          burdenDelta: 0,
          boundaryDelta: 0.02,
          misreadDelta: 0,
          repairDelta: 0,
          openLoopDelta: 0,
        },
        tags: ['白樱线', 'continuity'],
      }])
      const episodicMemory = (await db.listRecentEpisodicEvents(10))
        .find(item => item.turnId === 'turn-live-provider-memory')
      expect(episodicMemory).toBeDefined()
      await db.recordMemoryQualityGoldLabel({
        cardId: 'default',
        month: '2026-08',
        label: 'right',
        query: '你还记得白樱线吗？',
        expectedMemoryIds: [episodicMemory!.id],
        surfacedMemoryIds: [episodicMemory!.id],
        createdAt,
      })
      const checkpointBefore = await db.getWorkingMemoryCheckpoint('default', sessionId)
      const recallHealthBefore = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      const episodicBefore = episodicMemory

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        mode: 'live-provider',
        sessionId,
        month: '2026-08',
      })

      expect(provider.generate).toHaveBeenCalledOnce()
      expect(provider.generate.mock.calls[0]?.[0].messages[0]?.content).toContain('alicization-turn-memory-context')
      expect(report.liveProviderTrial).toMatchObject({
        version: 'memory-live-provider-trial-v1',
        passed: true,
        productionWrites: [],
        summary: {
          providerCallCount: 1,
        },
      })
      expect(report.dialogueReplay?.turns[0]?.providerOutput).toBe('Provider 收到 2 条消息。')
      expect(await db.getWorkingMemoryCheckpoint('default', sessionId)).toEqual(checkpointBefore)
      expect(await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })).toEqual(recallHealthBefore)
      expect((await db.listRecentEpisodicEvents(10))
        .find(item => item.turnId === 'turn-live-provider-memory'))
        .toMatchObject({
          recallCount: episodicBefore?.recallCount,
          reconsolidationCount: episodicBefore?.reconsolidationCount,
          lastRecalledAt: episodicBefore?.lastRecalledAt,
          latestReconsolidation: episodicBefore?.latestReconsolidation,
        })
    }
    finally {
      await db.close()
    }
  })

  it('defaults to historical replay without calling a configured live Provider', async () => {
    const provider = {
      generate: vi.fn(async () => ({
        text: '不应调用真实 Provider。',
        providerId: 'provider-live',
        modelId: 'model-live',
        finishReason: 'stop',
        retryCount: 0,
        latencyMs: 1,
      })),
    }
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      memoryTrialProvider: provider,
    })
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
        sessionId,
        month: '2026-08',
      })

      expect(report.summary.dialogueReplayCount).toBe(1)
      expect(report.dialogueReplay?.id).toContain(sessionId)
      expect(report.dialogueReplay?.summary.turnCount).toBe(1)
      expect(report.liveProviderTrial).toBeNull()
      expect(provider.generate).not.toHaveBeenCalled()
    }
    finally {
      await db.close()
    }
  })

  it('does not infer the latest session or call the live Provider when sessionId is omitted', async () => {
    const provider = {
      generate: vi.fn(async () => ({
        text: '不应隐式调用真实 Provider。',
        providerId: 'provider-live',
        modelId: 'model-live',
        finishReason: 'stop',
        retryCount: 0,
        latencyMs: 1,
      })),
    }
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      memoryTrialProvider: provider,
    })
    try {
      const sessionId = 'session-explicit-only'
      await db.upsertWorkingMemoryCheckpoint(createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId,
        now: Date.parse('2026-08-04T08:45:00.000Z'),
      }))
      await db.appendConversationTurn({
        turnId: 'turn-explicit-only',
        sessionId,
        userText: '只有显式选择后才能回放。',
        assistantText: '不会自动使用最近会话。',
        createdAt: Date.parse('2026-08-04T08:45:00.000Z'),
      })

      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'default',
        mode: 'live-provider',
        month: '2026-08',
      })

      expect(report.summary.dialogueReplayCount).toBe(1)
      expect(report.dialogueReplay).toBeNull()
      expect(report.liveProviderTrial).toBeNull()
      expect(report.stages).toEqual(expect.arrayContaining([
        expect.objectContaining({
          stage: 'dialogue-replay',
          passed: false,
          error: expect.stringContaining('显式选择'),
        }),
      ]))
      expect(provider.generate).not.toHaveBeenCalled()
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
        sessionId: foreignSessionId,
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

  it('lists replay sessions with keyset pagination and keeps foreign card sessions out', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const sharedRootDir = join(userDataPath, 'shared-card-db')
    const db = await setupAlicizationDb(userDataPath, {
      cardId: 'card-a',
      rootDir: sharedRootDir,
    })
    const foreignDb = await setupAlicizationDb(userDataPath, {
      cardId: 'card-b',
      rootDir: sharedRootDir,
    })
    try {
      for (const [sessionId, updatedAt, title] of [
        ['session-a-new', 300, '新的记忆会话'],
        ['session-a-tie-z', 200, '同时间较新会话'],
        ['session-a-tie-a', 200, '同时间较旧会话'],
      ] as const) {
        const checkpoint = createEmptyWorkingMemorySnapshot({
          cardId: 'card-a',
          sessionId,
          now: updatedAt,
        })
        checkpoint.currentThread = {
          title,
          currentUserMove: `${title}用户消息`,
          currentAliceMove: `${title}助手回复`,
          primaryAnchor: sessionId,
          mode: 'casual',
          shouldHold: true,
          confidence: 0.9,
        }
        await db.upsertWorkingMemoryCheckpoint(checkpoint)
        await db.appendConversationTurn({
          cardId: 'card-a',
          turnId: `${sessionId}-turn`,
          sessionId,
          userText: `${title}用户消息`,
          assistantText: `${title}助手回复`,
          createdAt: updatedAt - 10,
        })
      }
      const sharedSessionId = 'session-shared-across-cards'
      const cardASharedCheckpoint = createEmptyWorkingMemorySnapshot({
        cardId: 'card-a',
        sessionId: sharedSessionId,
        now: 180,
      })
      cardASharedCheckpoint.currentThread = {
        title: '',
        currentUserMove: 'CARD_A_VISIBLE',
        currentAliceMove: 'CARD_A_REPLY',
        primaryAnchor: sharedSessionId,
        mode: 'casual',
        shouldHold: true,
        confidence: 0.9,
      }
      await db.upsertWorkingMemoryCheckpoint(cardASharedCheckpoint)
      await db.appendConversationTurn({
        cardId: 'card-a',
        turnId: 'shared-turn-card-a',
        sessionId: sharedSessionId,
        userText: 'CARD_A_VISIBLE',
        assistantText: 'CARD_A_REPLY',
        createdAt: 170,
      })
      await foreignDb.upsertWorkingMemoryCheckpoint(createEmptyWorkingMemorySnapshot({
        cardId: 'card-b',
        sessionId: sharedSessionId,
        now: 400,
      }))
      await foreignDb.appendConversationTurn({
        cardId: 'card-b',
        turnId: 'shared-turn-card-b',
        sessionId: sharedSessionId,
        userText: 'CARD_B_SECRET',
        assistantText: 'CARD_B_SECRET_REPLY',
        createdAt: 390,
      })

      const first = await db.listMemoryWorkbenchReplaySessions({
        cardId: 'card-a',
        limit: 2,
      })
      const second = await db.listMemoryWorkbenchReplaySessions({
        cardId: 'card-a',
        limit: 2,
        cursor: first.nextCursor,
      })
      const scopedTurns = await db.listConversationTurnsBySession(sharedSessionId, {
        cardId: 'card-a',
      })
      const report = await db.runMemoryWorkbenchProductionTrial({
        cardId: 'card-a',
        sessionId: sharedSessionId,
        month: '2026-08',
      })

      expect(first.items.map(item => item.sessionId)).toEqual([
        'session-a-new',
        'session-a-tie-z',
      ])
      expect(first.nextCursor).toBeTruthy()
      expect(second.items.map(item => item.sessionId)).toEqual([
        'session-a-tie-a',
        sharedSessionId,
      ])
      expect(second.nextCursor).toBeNull()
      expect(second.items.at(-1)).toMatchObject({
        sessionId: sharedSessionId,
        title: 'CARD_A_VISIBLE',
        userTurnCount: 1,
        assistantTurnCount: 1,
      })
      expect(scopedTurns).toHaveLength(1)
      expect(scopedTurns[0]).toMatchObject({
        userText: 'CARD_A_VISIBLE',
        assistantText: 'CARD_A_REPLY',
      })
      expect(JSON.stringify(scopedTurns)).not.toContain('CARD_B_SECRET')
      expect(report.dialogueReplay?.summary.turnCount).toBe(1)
      expect(JSON.stringify(report.dialogueReplay)).not.toContain('CARD_B_SECRET')
    }
    finally {
      await Promise.all([
        db.close(),
        foreignDb.close(),
      ])
    }
  })
})
