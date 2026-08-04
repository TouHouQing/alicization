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
})
