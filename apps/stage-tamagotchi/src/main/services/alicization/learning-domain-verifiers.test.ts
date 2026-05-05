import { describe, expect, it } from 'vitest'

import {
  buildDomainReflectionTargetScope,
  buildInternalizeFactInput,
  buildLearningEvidenceSnapshot,
  resolveDominantLearningDomain,
} from './learning-domain-verifiers'

describe('learning-domain-verifiers', () => {
  it('derives dominant domain and verification basis without executor side effects', () => {
    const task = {
      taskId: 'task-1',
      action: 'verify',
      message: 'verify relationship claim',
      payload: {
        conflictTargets: ['fact-relationship-1'],
      },
    } as any
    const snapshot = buildLearningEvidenceSnapshot({
      task,
      supportingFacts: [{
        id: 'fact-relationship-1',
        subject: 'host',
        predicate: 'boundary',
        object: 'needs room before warmth',
        confidence: 0.8,
        source: 'rule',
        dedupeKey: 'host|boundary|room',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        memoryDomain: 'relationship',
        validationStatus: 'validated',
        validationCount: 2,
        contradictionCount: 1,
        sourceLabel: 'trusted-dialogue',
      } as any],
      relatedReflections: [{
        id: 'reflection-1',
        summary: 'Need repair around timing.',
        lesson: 'Warmth should not outrun room.',
        status: 'pending',
        confidence: 0.7,
        updatedAt: 1,
      } as any],
      relatedOutcomes: [{
        id: 'outcome-1',
        summary: 'A boundary repair landed.',
        actionSummary: 'repair',
        createdAt: 1,
      } as any],
    })

    expect(resolveDominantLearningDomain(snapshot.domains.map(domain => ({
      memoryDomain: domain,
    })) as any)).toBe('relationship')
    expect(snapshot).toEqual(expect.objectContaining({
      domain: 'relationship',
      reflectionPressure: 1,
      effectiveSupportCount: 3,
      verificationBasis: expect.arrayContaining([
        'existing-memory',
        'trusted-source',
        'runtime-result',
        'conflict-review',
      ]),
    }))
  })

  it('maps domains to reflection scope and safe internalization facts', () => {
    expect(buildDomainReflectionTargetScope('procedure')).toBe('habit')
    expect(buildDomainReflectionTargetScope('relationship')).toBe('relationship')
    expect(buildDomainReflectionTargetScope('self-model')).toBe('self')
    expect(buildDomainReflectionTargetScope('world-model')).toBe('truth')

    expect(buildInternalizeFactInput({
      id: 'fact-world-1',
      subject: 'api',
      predicate: 'response shape',
      object: 'uses typed payloads',
      confidence: 0.7,
      conflictsWith: ['old-fact'],
      supersedes: ['older-fact'],
    } as any, 'world-model')).toEqual(expect.objectContaining({
      confidence: 0.84,
      knowledgeStage: 'validated-knowledge',
      validationStatus: 'validated',
      sourceLabel: 'learning-validated-world-model',
    }))

    expect(buildInternalizeFactInput({
      id: 'fact-relationship-1',
      subject: 'host',
      predicate: 'boundary',
      object: 'needs room',
      confidence: 0.72,
    } as any, 'relationship')).toEqual(expect.objectContaining({
      confidence: 0.8,
      knowledgeStage: 'internalized-long-horizon-knowledge',
      sourceLabel: 'learning-internalized-relationship',
    }))
  })
})
