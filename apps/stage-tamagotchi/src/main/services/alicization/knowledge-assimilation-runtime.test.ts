import { describe, expect, it } from 'vitest'

import { createAlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'

describe('knowledge assimilation runtime', () => {
  it('upgrades durable rule memories into validated knowledge automatically', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFacts({
      source: 'rule',
      existingFacts: [],
      facts: [{
        subject: 'relationship',
        predicate: 'boundary',
        object: 'focused windows call for lighter touch and more space',
        confidence: 0.82,
      }],
    })

    expect(result[0]).toEqual(expect.objectContaining({
      knowledgeStage: 'validated-knowledge',
      validationStatus: 'validated',
      sourceLabel: 'runtime-outcome-closure',
    }))
  })

  it('links conflicting older knowledge as superseded candidates', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-old',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report the runtime result immediately in the same style',
        confidence: 0.72,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|report the runtime result immediately in the same style',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        validationCount: 1,
        contradictionCount: 0,
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
      }],
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'wait for a fresher opening before reporting that runtime result style again',
        confidence: 0.81,
      }],
    })

    expect(result.facts[0]?.conflictsWith).toContain('fact-old')
    expect(result.facts[0]?.supersedes).toContain('fact-old')
    expect(result.facts[0]?.sourceLabel).toBe('async-memory-correction')
    expect(result.corrections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-old',
        nextValidationStatus: 'superseded',
      }),
    ]))
  })

  it('supersedes an older preference when an explicit user update changes the same slot without validating the replacement', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'rule',
      existingFacts: [{
        id: 'fact-preference-blue',
        subject: 'user',
        predicate: 'prefers',
        object: '用户喜欢蓝色。',
        confidence: 0.94,
        source: 'rule',
        dedupeKey: 'user|prefers|用户喜欢蓝色。',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 1,
        validationCount: 0,
        contradictionCount: 0,
        memoryDomain: 'relationship',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        sourceLabel: 'working-memory-owner:turn-blue',
      }],
      facts: [{
        subject: 'user',
        predicate: 'prefers',
        object: '用户喜欢琥珀色。',
        confidence: 0.94,
        memoryDomain: 'relationship',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        sourceLabel: 'working-memory-owner:turn-amber',
      }],
    })

    expect(result.facts[0]).toEqual(expect.objectContaining({
      object: '用户喜欢琥珀色。',
      knowledgeStage: 'working-understanding',
      validationStatus: 'provisional',
      conflictsWith: ['fact-preference-blue'],
      supersedes: ['fact-preference-blue'],
    }))
    expect(result.corrections).toEqual([
      expect.objectContaining({
        targetFactId: 'fact-preference-blue',
        nextValidationStatus: 'superseded',
        nextKnowledgeStage: 'working-understanding',
        appendConflictsWith: ['user|prefers|用户喜欢琥珀色。'],
      }),
    ])
  })

  it('promotes repeated validated procedural knowledge into internalized long-horizon knowledge', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-repeat',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'verify the result before sounding certain',
        confidence: 0.84,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|verify the result before sounding certain',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 6,
        validationCount: 3,
        contradictionCount: 0,
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
        sourceLabel: 'async-memory-reconfirmation',
      }],
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'verify the result before sounding certain',
        confidence: 0.86,
      }],
    })

    expect(result.facts[0]).toEqual(expect.objectContaining({
      knowledgeStage: 'internalized-long-horizon-knowledge',
      validationStatus: 'validated',
      sourceLabel: 'async-memory-reconfirmation',
    }))
  })

  it('demotes promotion pressure when the same fact has accumulated contradiction history', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-unstable',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report immediately',
        confidence: 0.84,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|report immediately',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 6,
        validationCount: 1,
        contradictionCount: 3,
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
      }],
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report immediately',
        confidence: 0.84,
      }],
    })

    expect(result.facts[0]).toEqual(expect.objectContaining({
      knowledgeStage: 'validated-knowledge',
      validationStatus: 'validated',
    }))
  })

  it('keeps relationship facts more conservative than procedural facts under the same promotion evidence', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const procedure = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-procedure',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'verify before sounding certain',
        confidence: 0.84,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|verify before sounding certain',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 6,
        validationCount: 3,
        contradictionCount: 0,
        memoryDomain: 'procedure',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
      }],
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'verify before sounding certain',
        confidence: 0.86,
        memoryDomain: 'procedure',
      }],
    })
    const relationship = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-relationship',
        subject: 'relationship',
        predicate: 'boundary',
        object: 'leave more room before closeness',
        confidence: 0.84,
        source: 'async-llm',
        dedupeKey: 'relationship|boundary|leave more room before closeness',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 6,
        validationCount: 3,
        contradictionCount: 0,
        memoryDomain: 'relationship',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
      }],
      facts: [{
        subject: 'relationship',
        predicate: 'boundary',
        object: 'leave more room before closeness',
        confidence: 0.86,
        memoryDomain: 'relationship',
      }],
    })

    expect(procedure.facts[0]?.knowledgeStage).toBe('internalized-long-horizon-knowledge')
    expect(relationship.facts[0]?.knowledgeStage).toBe('validated-knowledge')
  })

  it('reopens internalized knowledge by downgrading it when a conflicting replacement arrives', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-internalized-old',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report immediately after patch',
        confidence: 0.88,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|report immediately after patch',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 8,
        validationCount: 4,
        contradictionCount: 0,
        memoryDomain: 'procedure',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
      }],
      facts: [{
        subject: 'assistant',
        predicate: 'procedure',
        object: 'wait for verify before reporting after patch',
        confidence: 0.86,
        memoryDomain: 'procedure',
      }],
    })

    expect(result.corrections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-internalized-old',
        nextValidationStatus: 'provisional',
        nextKnowledgeStage: 'validated-knowledge',
        sourceLabel: expect.stringContaining('reopened-by:'),
      }),
    ]))
  })

  it('keeps world-model facts validated-only until source validation is strong enough', () => {
    const runtime = createAlicizationKnowledgeAssimilationRuntime()
    const result = runtime.assimilateMemoryFactsDetailed({
      source: 'async-llm',
      existingFacts: [{
        id: 'fact-world',
        subject: 'TypeScript',
        predicate: 'fact',
        object: 'AlicizationBridge.streamChat preserves meta events',
        confidence: 0.88,
        source: 'async-llm',
        dedupeKey: 'typescript|fact|alicizationbridge.streamchat preserves meta events',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 8,
        validationCount: 4,
        contradictionCount: 0,
        memoryDomain: 'world-model',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
      }],
      facts: [{
        subject: 'TypeScript',
        predicate: 'fact',
        object: 'AlicizationBridge.streamChat preserves meta events',
        confidence: 0.88,
        memoryDomain: 'world-model',
      }],
    })

    expect(result.facts[0]).toEqual(expect.objectContaining({
      memoryDomain: 'world-model',
      knowledgeStage: 'validated-knowledge',
      validationStatus: 'validated',
    }))
  })
})
