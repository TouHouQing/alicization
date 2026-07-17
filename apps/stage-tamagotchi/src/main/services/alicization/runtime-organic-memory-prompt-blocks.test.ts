import type { OrganicMemoryPromptContext } from './runtime-soul'

import { describe, expect, it } from 'vitest'

import { buildOrganicMemoryProviderFactBlocks } from './runtime-organic-memory-prompt-blocks'

function buildContext(overrides: Partial<OrganicMemoryPromptContext> = {}): OrganicMemoryPromptContext {
  return {
    hostAttitude: '',
    coreIncarnation: '',
    activeThoughts: [],
    retrievedFacts: [],
    recalledFragments: [],
    ...overrides,
  }
}

function parseFacts(blocks: string[]) {
  return blocks.map(block => JSON.parse(block) as {
    type: string
    data: Record<string, any>
  })
}

describe('runtime-organic-memory-prompt-blocks', () => {
  it('preserves descriptive continuity themes across long-term memory evidence', () => {
    const memory = '用户在 Phase 1 回顾 project-state、same-her、same her、identity-continuity、continuity state、host computer 和 better chat wrapper，也讨论了本地优先数字生命项目、数字生命主线、同一个她与 maid/女仆主题。'
    const memory100 = memory.slice(0, 100).trim()
    const memory120 = memory.slice(0, 120).trim()
    const memory140 = memory.slice(0, 140).trim()
    const recall = parseFacts(buildOrganicMemoryProviderFactBlocks(buildContext({
      retrievedFacts: [{
        id: 'fact-theme',
        subject: memory,
        predicate: memory,
        object: memory,
        confidence: 0.9,
        provenance: 'remembered',
        source: memory,
      } as any],
      recalledFragments: [{
        id: 'fragment-theme',
        text: memory,
        sourceKind: 'conversation-turn',
        provenance: 'remembered',
        createdAt: 1,
      } as any, {
        id: 'fragment-template',
        text: 'Same Phase 1 digital life.',
        sourceKind: 'conversation-turn',
        provenance: 'remembered',
        createdAt: 2,
      } as any],
      recalledEpisodes: [{
        id: 'episode-theme',
        occurredAt: 1,
        whatHappened: memory,
        felt: memory,
        whatChanged: memory,
        confidence: 0.8,
        provenance: 'remembered',
        sourceKind: 'conversation',
      } as any],
      consolidatedMemories: [{
        id: 'period-theme',
        kind: 'period',
        periodKey: 'period-1',
        summary: memory,
        lesson: memory,
        cues: [memory],
        confidence: 0.8,
        dominantProvenance: 'remembered',
      } as any],
      proceduralMemories: [{
        id: 'procedure-theme',
        label: memory,
        approach: memory,
        pitfalls: [memory],
        cues: [memory],
        confidence: 0.8,
      } as any],
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: ['era-theme'],
        selectedConsolidationIds: ['period-theme'],
        selectedWindowIds: [],
        selectedProcedureIds: ['procedure-theme'],
        selectedEpisodeIds: ['episode-theme'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        selectedEras: [{ id: 'era-theme', facet: 'relationship-era', summary: memory }],
        selectedPeriods: [{ id: 'period-theme', kind: 'consolidation', summary: memory }],
        selectedEpisodes: [{ id: 'episode-theme', summary: memory, provenance: 'remembered' }],
        selectedProcedures: [{ id: 'procedure-theme', label: memory, approach: memory }],
        selectedBundles: [{
          id: 'bundle-theme',
          summary: memory,
          confidence: 0.8,
        }],
        selectedChains: [{
          id: 'chain-theme',
          kind: 'task-procedure-relationship-stance',
          summary: memory,
          confidence: 0.8,
          taskCue: memory,
          periodSummary: memory,
          eventSummary: memory,
          procedureSummary: memory,
          relationshipMeaning: memory,
          lesson: memory,
        }],
        stableCore: [memory],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.8,
      } as any,
    }))).find(fact => fact.type === 'alicization-long-term-memory-recall')

    expect(recall?.data).toEqual(expect.objectContaining({
      owner: 'LongTermMemoryRecall',
      retrievedFacts: [expect.objectContaining({
        id: 'fact-theme',
        subject: memory120,
        predicate: memory120,
        object: memory,
        source: memory120,
      })],
      recalledFragments: [expect.objectContaining({
        id: 'fragment-theme',
        text: memory,
      })],
      recalledEpisodes: [expect.objectContaining({
        id: 'episode-theme',
        whatHappened: memory,
        felt: memory,
        whatChanged: memory,
      })],
      consolidatedMemories: [expect.objectContaining({
        id: 'period-theme',
        summary: memory,
        lesson: memory,
        cues: [memory100],
      })],
      proceduralMemories: [expect.objectContaining({
        id: 'procedure-theme',
        label: memory140,
        approach: memory,
        pitfalls: [memory140],
        cues: [memory100],
      })],
      selection: expect.objectContaining({
        deliberation: expect.objectContaining({
          selectedEras: [expect.objectContaining({ summary: memory })],
          selectedPeriods: [expect.objectContaining({ summary: memory })],
          selectedEpisodes: [expect.objectContaining({ summary: memory })],
          selectedProcedures: [expect.objectContaining({ label: memory140, approach: memory })],
          selectedBundles: [expect.objectContaining({ summary: memory })],
          selectedChains: [expect.objectContaining({
            summary: memory,
            taskCue: memory140,
            periodSummary: memory,
            eventSummary: memory,
            procedureSummary: memory,
            relationshipMeaning: memory,
            lesson: memory,
          })],
          stableCore: [memory],
        }),
      }),
    }))
    expect(JSON.stringify(recall)).not.toContain('fragment-template')
  })

  it('serializes organic self state and durable recall as typed provider facts', () => {
    const facts = parseFacts(buildOrganicMemoryProviderFactBlocks(buildContext({
      hostAttitude: '愿意信任，但希望回答保持克制。',
      coreIncarnation: '我会根据真实经历和可审计记忆逐步形成稳定自我。',
      activeThoughts: [{
        id: 'thought-1',
        text: '继续确认 main.ts 的判空问题是否真正解决。',
      } as any],
      recalledFragments: [{
        id: 'fragment-1',
        text: '上次 main.ts 报错来自遗漏判空。',
        sourceKind: 'dream-fragment',
        provenance: 'remembered',
        createdAt: 1,
        lastRecalledAt: null,
        recallCount: 0,
      } as any],
    })))
    const selfContext = facts.find(fact => fact.type === 'alicization-organic-self-context')
    const recallContext = facts.find(fact => fact.type === 'alicization-long-term-memory-recall')

    expect(selfContext?.data).toEqual(expect.objectContaining({
      hostAttitude: '愿意信任，但希望回答保持克制。',
      coreIncarnation: '我会根据真实经历和可审计记忆逐步形成稳定自我。',
      activeThoughts: ['继续确认 main.ts 的判空问题是否真正解决。'],
    }))
    expect(recallContext?.data).toEqual(expect.objectContaining({
      owner: 'LongTermMemoryRecall',
      recalledFragments: [
        expect.objectContaining({
          text: '上次 main.ts 报错来自遗漏判空。',
          provenance: 'remembered',
        }),
      ],
    }))
  })

  it('keeps recall selection structural without forwarding drafted wording candidates', () => {
    const sourceText = buildOrganicMemoryProviderFactBlocks(buildContext({
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['period-1'],
        selectedWindowIds: [],
        selectedProcedureIds: ['procedure-1'],
        selectedEpisodeIds: ['episode-1'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['先给对方一点空间。'],
        selectedEras: [{
          id: 'era-1',
          facet: 'relationship-era',
          summary: '这段时期更适合克制地靠近。',
        }],
        selectedPeriods: [{
          id: 'period-1',
          kind: 'consolidation',
          summary: '关系修复逐渐稳定。',
        }],
        selectedEpisodes: [{
          id: 'episode-1',
          summary: '对方曾明确要求降低回应压力。',
          provenance: 'remembered',
        }],
        selectedProcedures: [{
          id: 'procedure-1',
          label: '低压修复',
          approach: '先确认事实，再给出空间。',
        }],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.84,
        whyNow: '当前问题涉及过去的关系分寸。',
        inwardLine: 'drafted inward candidate',
        visibleLine: 'drafted visible candidate',
      },
      recollectionPlan: {
        selectedConsolidationIds: ['period-1'],
        selectedWindowIds: [],
        selectedProceduralIds: ['procedure-1'],
        selectedEpisodeIds: ['episode-1'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['先给对方一点空间。'],
        opening: 'drafted opening candidate',
        certainty: 'approximate',
        rationale: '关系记忆与当前问题相关。',
        confidence: 0.84,
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'approximate',
        rationale: '关系记忆与当前问题相关。',
        confidence: 0.84,
      },
    })).join('\n')
    const recallFact = parseFacts([sourceText])[0]

    expect(recallFact?.data.selection).toEqual(expect.objectContaining({
      deliberation: expect.objectContaining({
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedProcedureIds: ['procedure-1'],
        surfacePolicy: 'relationship-continuity',
      }),
      speech: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.84,
      },
    }))
    expect(sourceText).not.toMatch(/drafted (?:inward|visible|opening|internal|style)/u)
    expect(sourceText).not.toMatch(/"opening"/u)
    expect(sourceText).not.toMatch(/\[ALICIZATION_/u)
  })

  it('projects affective, relationship, and learning state as data instead of reply rules', () => {
    const facts = parseFacts(buildOrganicMemoryProviderFactBlocks(buildContext({
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 10,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.62,
        repairPressure: 0.28,
        burdenPressure: 0.36,
        trustPressure: 0.48,
        restProtectivePressure: 0.18,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.24,
          repairRecovery: 0.36,
          overreachRisk: 0.54,
          fatigueGuard: 0.18,
          afterglowCarry: 0.46,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['residue:afterglow'],
          summary: '余波仍在，但距离需要保持稳定。',
        },
        sourceSignals: [],
        summary: '情感余波仍然存在。',
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 10,
        evolutionMomentum: 0.44,
        learningReadiness: 0.52,
        contradictionPressure: 0.06,
        revisionPressure: 0.18,
        autobiographicalStability: 0.8,
        dominantTrajectory: null,
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'reflect',
        nextLearningReason: null,
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship-cadence'],
        sourceSignals: [],
        summary: '继续观察关系节律。',
      },
    })))
    const lifeState = facts.find(fact => fact.type === 'alicization-organic-life-state')

    expect(lifeState?.data).toEqual(expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          shouldDelayWarmth: true,
        }),
      }),
      selfEvolution: expect.objectContaining({
        nextLearningAction: 'reflect',
        activeLearningFocuses: ['relationship-cadence'],
      }),
    }))
    expect(JSON.stringify(lifeState)).not.toMatch(/mustDo|mustNotDo|replyTemplate|systemPrompt/u)
  })
})
