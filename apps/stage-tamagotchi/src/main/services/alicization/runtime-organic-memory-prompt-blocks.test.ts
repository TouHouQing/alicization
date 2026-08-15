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

  it('keeps recall selection structural without forwarding drafted wording candidates', () => {
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
})
