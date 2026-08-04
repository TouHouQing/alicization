import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

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
})
