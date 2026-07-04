import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { mergePersonaCandidateReviewState } from './memory-workbench-persona-candidates'
import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-persona-candidates-'))
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

describe('memory workbench persona candidates', () => {
  it('keeps training blocked until candidate is explicitly approved', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: null,
      now: 10,
    })).toMatchObject({
      status: 'candidate',
      allowTraining: false,
    })
  })

  it('persists no-training as blocked candidate state', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: {
        candidateId: 'persona-candidate:reflection-1',
        status: 'no-training',
        allowTraining: false,
        reason: 'user blocked',
        updatedAt: 20,
      },
      now: 30,
    })).toMatchObject({
      status: 'no-training',
      allowTraining: false,
      rejectionReason: 'user blocked',
    })
  })

  it('lists candidates from cleaned long-term reflections and persists no-training decisions', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'reflection-1',
          cardId: 'card-1',
          sourceKind: 'reply',
          targetScope: 'truth',
          summary: '失败面要透明。',
          lesson: '不要用固定模板遮盖失败，要先说明超时或 provider 失败。',
          status: 'confirmed',
          confidence: 0.92,
          createdAt: 10,
          updatedAt: 20,
        },
        {
          id: 'reflection-low-confidence',
          cardId: 'card-1',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '低置信反思。',
          lesson: '这条还不该进入 persona 候选。',
          status: 'pending',
          confidence: 0.4,
          createdAt: 11,
          updatedAt: 21,
        },
      ])
      await db.appendPersonaReinforcementEvents([
        {
          id: 'reinforcement-1',
          cardId: 'card-1',
          sourceKind: 'reply',
          dimension: 'truthful-grounding',
          delta: 0.2,
          valence: 'reinforce',
          summary: '强化失败透明。',
          createdAt: 30,
        },
      ])

      const listed = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-1',
        limit: 10,
      })

      expect(listed.items).toHaveLength(1)
      expect(listed.items[0]).toMatchObject({
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1', 'reinforcement-1'],
        status: 'candidate',
        allowTraining: false,
      })

      await db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-1',
        candidateId: 'persona-candidate:reflection-1',
        decision: 'no-training',
        reason: 'user blocked training',
      })

      const blocked = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-1',
        status: 'no-training',
        limit: 10,
      })

      expect(blocked.items[0]).toMatchObject({
        id: 'persona-candidate:reflection-1',
        status: 'no-training',
        allowTraining: false,
        rejectionReason: 'user blocked training',
      })
    }
    finally {
      await db.close()
    }
  })
})
