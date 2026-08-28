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

  it('preserves real memory wording instead of treating retired project terms as global residue', () => {
    const facts = parseFacts(buildOrganicMemoryProviderFactBlocks(buildContext({
      coreIncarnation: 'The host remembers Phase 1 as part of our identity continuity.',
      activeThoughts: [{
        id: 'thought-identity-memory',
        text: 'This remembered milestone belongs to the long-term story.',
      } as any],
    })))
    const selfContext = facts.find(fact => fact.type === 'alicization-organic-self-context')

    expect(selfContext?.data).toEqual(expect.objectContaining({
      coreIncarnation: 'The host remembers Phase 1 as part of our identity continuity.',
      activeThoughts: [
        'This remembered milestone belongs to the long-term story.',
      ],
    }))
  })

  it('does not forward recall planning output without actual memory evidence', () => {
    const sourceText = buildOrganicMemoryProviderFactBlocks(buildContext({
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['period-1'],
        selectedWindowIds: [],
        selectedProcedureIds: ['procedure-1'],
        selectedEpisodeIds: ['episode-1'],
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
    }))

    expect(sourceText).toEqual([])
  })

  it('does not forward derived affective or learning governance state to Provider', () => {
    const blocks = buildOrganicMemoryProviderFactBlocks(buildContext({
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
    }))

    expect(blocks.find(block => block.includes('"type":"alicization-organic-life-state"'))).toBeUndefined()
    expect(blocks.join('\n')).not.toMatch(
      /relationshipCadence|reasonTags|measured-return|relationship-cadence|mustDo|mustNotDo|replyTemplate|systemPrompt/u,
    )
  })

  it('isolates person-state governance while preserving real long-term memory evidence', () => {
    const blocks = buildOrganicMemoryProviderFactBlocks(buildContext({
      retrievedFacts: [{
        id: 'fact-real-memory',
        subject: '用户',
        predicate: '记得',
        object: '上次向量召回成功后，继续沿用了真实的修复上下文。',
        confidence: 0.94,
        provenance: 'remembered',
        source: 'long-term-memory-recall',
      } as any],
      recalledFragments: [{
        id: 'fragment-real-memory',
        text: '上次向量召回成功后，继续沿用了真实的修复上下文。',
        sourceKind: 'conversation-turn',
        provenance: 'remembered',
        createdAt: 1,
      } as any],
      personStateProjection: {
        contexts: [
          'internal-cadence',
          'internal-callback-hold',
        ],
        activeClosenessContext: 'general',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        preferredProactiveStyle: 'quiet',
        cautious: true,
        restrained: true,
        summary: 'internal_policy=legacy',
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.6,
        repairPressure: 0.2,
        burdenPressure: 0.1,
        trustPressure: 0.5,
        restProtectivePressure: 0.2,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.4,
          repairRecovery: 0.3,
          overreachRisk: 0.2,
          fatigueGuard: 0.1,
          afterglowCarry: 0.5,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: [
            'internal-cadence',
            'internal-repair',
            'internal-callback-hold',
          ],
        },
        summary: '内部治理状态不应进入 Provider。',
      } as any,
    }))
    const serialized = blocks.join('\n')

    expect(serialized).toContain('上次向量召回成功后，继续沿用了真实的修复上下文。')
    expect(serialized).not.toContain('"person"')
    expect(serialized).not.toContain('"relationshipCadence"')
    expect(serialized).not.toContain('"reasonTags"')
    expect(serialized).not.toMatch(
      /internal-cadence|internal-repair|internal-callback-hold|internal_policy=/u,
    )
  })

  it('keeps planner and surface governance out of the ordinary personality prompt', () => {
    const serialized = buildOrganicMemoryProviderFactBlocks(buildContext({
      retrievedFacts: [{
        id: 'fact-real-memory',
        subject: '用户',
        predicate: '希望',
        object: '失败时直接说明真实原因。',
        confidence: 0.94,
        provenance: 'remembered',
        source: 'long-term-memory-recall',
      } as any],
      recalledFragments: [{
        id: 'fragment-real-memory',
        text: '用户上次明确说过，希望我在失败时直接说明原因。',
        sourceKind: 'conversation-turn',
        provenance: 'remembered',
        createdAt: 1,
      } as any],
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: ['era-1'],
        selectedConsolidationIds: ['consolidation-1'],
        selectedWindowIds: [],
        selectedProcedureIds: ['procedure-1'],
        selectedEpisodeIds: ['episode-1'],
        selectedRelationshipLines: ['内部关系线索'],
        selectedEras: [{
          id: 'era-1',
          facet: 'relationship-era',
          summary: '真实的关系记忆摘要。',
        }],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.9,
        whyNow: '内部召回理由',
        inwardLine: '内部草稿',
        visibleLine: '内部可见草稿',
      },
      recollectionIntent: {
        mode: 'relationship',
        temporalFocus: 'recent',
        searchEpisodes: true,
        searchProceduralExperience: false,
        confidence: 0.9,
        recollectionAgenda: {
          goalSimilarity: 0.8,
          relationshipNeed: 0.8,
          affectivePull: 0.2,
          sceneFamiliarity: 0.4,
          candidateTimeScopes: [{ scope: 'recent', weight: 1 }],
          candidateEraFacets: [{ facet: 'relationship-era', weight: 1 }],
          uncertaintyTolerance: 0.2,
        },
      } as any,
      recollectionPlan: {
        selectedConsolidationIds: ['consolidation-1'],
        selectedWindowIds: [],
        selectedProceduralIds: ['procedure-1'],
        selectedEpisodeIds: ['episode-1'],
        selectedRelationshipLines: ['内部关系线索'],
        opening: '内部开场草稿',
        certainty: 'certain',
        rationale: '内部计划理由',
        confidence: 0.9,
      } as any,
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'certain',
        rationale: '内部表层理由',
        confidence: 0.9,
      } as any,
      memoryResolutionLedger: {
        retrievalQuality: 'high',
        visibleCarryMode: 'direct',
        surfaceConfidence: 0.9,
        conflictPressure: 0.1,
        shouldStayInward: true,
        shouldDelayUntilAfterPayoff: true,
        stableCoreOnly: true,
        shouldLabelUncertainty: true,
        suppressionTags: ['internal-cadence'],
      } as any,
    })).join('\n')

    expect(serialized).toContain('失败时直接说明真实原因。')
    expect(serialized).not.toMatch(
      /surfacePolicy|shouldStayInward|shouldDelayUntilAfterPayoff|stableCoreOnly|suppressionTags|recollectionIntent|recollectionAgenda|内部召回理由|内部计划理由|内部表层理由|内部开场草稿/u,
    )
  })
})
