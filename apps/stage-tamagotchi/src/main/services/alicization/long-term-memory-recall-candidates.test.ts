import { describe, expect, it } from 'vitest'

import {
  memoryWorkbenchItemToEvidenceCandidate,
  persistentVectorRecordToEvidenceCandidate,
} from './long-term-memory-recall-candidates'

describe('long-term memory recall candidate projection', () => {
  it('projects database search documents into the shared evidence shape', () => {
    expect(memoryWorkbenchItemToEvidenceCandidate({
      id: 'reflection-1',
      kind: 'reflection',
      summary: '用户希望长期搜索可解释。',
      evidenceSnippets: ['来自确认反思。'],
      sourceIds: ['reflection-1'],
      confidence: 0.9,
      salience: 0.8,
      sensitivity: 'personal',
      visibility: 'explicit',
      training: 'blocked',
      source: 'memory_reflections',
      createdAt: 10,
      updatedAt: 20,
      lastAccessedAt: null,
      tombstoned: false,
    })).toMatchObject({
      id: 'reflection-1',
      kind: 'reflection',
      source: 'memory_reflections',
      confidence: 0.9,
      sensitivity: 'personal',
      updatedAt: 20,
    })
  })

  it('keeps internal source labels and duplicate summary text out of provider-facing evidence', () => {
    const candidate = memoryWorkbenchItemToEvidenceCandidate({
      id: 'fact-1',
      kind: 'fact',
      summary: '用户喜欢琥珀色。',
      evidenceSnippets: [
        '用户喜欢琥珀色。',
        'working-memory-owner:cleaned:queue-1',
        '用户希望在需要时使用这个偏好。',
      ],
      sourceIds: ['fact-1'],
      confidence: 0.9,
      salience: 0.7,
      sensitivity: 'personal',
      visibility: 'explicit',
      training: 'blocked',
      source: 'memory_facts',
      createdAt: 10,
      updatedAt: 20,
      lastAccessedAt: null,
      tombstoned: false,
    })

    expect(candidate.summary).toBe('用户喜欢琥珀色。 用户希望在需要时使用这个偏好。')
    expect(candidate.summary).not.toContain('working-memory-owner:cleaned:queue-1')
  })

  it('projects a semantic vector hit even when lexical search returned no candidate', () => {
    expect(persistentVectorRecordToEvidenceCandidate({
      id: 'vector-1',
      sourceId: 'reflection-remote',
      source: 'memory_reflections',
      text: '远期偏好：用户喜欢安静地听爵士。',
      vector: [1, 0, 0],
      modelId: 'embedding-a',
      dimensions: 3,
      updatedAt: 30,
      metadata: {
        workbenchItemId: 'reflection-remote',
        kind: 'reflection',
        sensitivity: 'personal',
        confidence: 0.88,
      },
    })).toMatchObject({
      id: 'reflection-remote',
      kind: 'reflection',
      source: 'memory_reflections',
      summary: '远期偏好：用户喜欢安静地听爵士。',
      confidence: 0.88,
      sensitivity: 'personal',
      updatedAt: 30,
    })
  })

  it('cleans governance suffixes from legacy vector text before provider projection', () => {
    const candidate = persistentVectorRecordToEvidenceCandidate({
      id: 'vector-legacy-1',
      sourceId: 'fact-legacy-1',
      source: 'memory_facts',
      text: 'user prefers 用户喜欢琥珀色。 relationship working-memory-owner:cleaned:queue-1',
      vector: [1, 0, 0],
      modelId: 'embedding-a',
      dimensions: 3,
      updatedAt: 30,
      metadata: {
        kind: 'fact',
        confidence: 0.88,
      },
    })

    expect(candidate.summary).toBe('用户喜欢琥珀色。')
    expect(candidate.summary).not.toContain('working-memory-owner:cleaned:queue-1')
  })

  it('does not truncate ordinary semantic text that mentions learning', () => {
    const candidate = persistentVectorRecordToEvidenceCandidate({
      id: 'vector-learning-1',
      sourceId: 'reflection-learning-1',
      source: 'memory_reflections',
      text: '用户正在 learning 新方法来整理长期记忆。',
      vector: [1, 0, 0],
      modelId: 'embedding-a',
      dimensions: 3,
      updatedAt: 30,
      metadata: {
        kind: 'reflection',
        confidence: 0.88,
      },
    })

    expect(candidate.summary).toBe('用户正在 learning 新方法来整理长期记忆。')
  })

  it('cleans learning governance labels without removing the surrounding memory', () => {
    const candidate = persistentVectorRecordToEvidenceCandidate({
      id: 'vector-learning-governance-1',
      sourceId: 'reflection-learning-governance-1',
      source: 'memory_reflections',
      text: '用户喜欢先验证再长期记住。 learning-internalized-relationship-cadence',
      vector: [1, 0, 0],
      modelId: 'embedding-a',
      dimensions: 3,
      updatedAt: 30,
      metadata: {
        kind: 'reflection',
        confidence: 0.88,
      },
    })

    expect(candidate.summary).toBe('用户喜欢先验证再长期记住。')
  })
})
