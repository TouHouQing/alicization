import { describe, expect, it } from 'vitest'

import {
  buildAlicizationLongHorizonMemory,
  buildAlicizationLongHorizonMemoryQuery,
  buildLongHorizonMemorySystemBlock,
} from './long-horizon-memory'

describe('long horizon memory', () => {
  it('condenses semantic facts into durable preference and identity pressure', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 20_000,
      facts: [
        {
          id: 'fact-1',
          subject: 'relationship',
          predicate: 'prefer',
          object: 'honest and direct answers',
          confidence: 0.82,
          accessCount: 4,
          updatedAt: 19_000,
        },
        {
          id: 'fact-2',
          subject: 'host',
          predicate: 'boundary',
          object: 'needs space while focused',
          confidence: 0.78,
          accessCount: 3,
          updatedAt: 18_000,
        },
        {
          id: 'fact-3',
          subject: 'assistant',
          predicate: 'remember',
          object: 'return to the unresolved runtime thread later',
          confidence: 0.8,
          accessCount: 5,
          updatedAt: 19_500,
        },
      ] as any,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.rememberedPreferenceSummary).toContain('Remembered preference')
    expect(snapshot?.rememberedConstraintSummary).toContain('Remembered boundary')
    expect(snapshot?.rememberedPlanSummary).toContain('Remembered open loop')
    expect(snapshot?.preferenceBias.truthfulGrounding).toBeGreaterThan(0.05)
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.05)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.identityBias.directness).toBeGreaterThan(0.05)
  })

  it('builds a recall query that includes the active knot and previous durable line', () => {
    const query = buildAlicizationLongHorizonMemoryQuery({
      userText: '继续看看这个 runtime knot',
      appraisal: {
        currentKnot: 'runtime knot',
        situatedMeaning: 'the diff still needs one more grounded pass',
      } as any,
      worldModel: {
        activeThread: {
          title: 'runtime diff',
          summary: 'keep the living runtime line coherent',
          unresolved: true,
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      previous: {
        preferenceBias: {
          companionship: 0,
          truthfulGrounding: 0,
          gentleRepair: 0,
          quietObservation: 0,
          proactiveCare: 0,
          playfulIntimacy: 0,
          autonomyRespect: 0,
          unfinishedThreadReturn: 0,
        },
        identityBias: {
          guardedness: 0,
          tenderness: 0,
          directness: 0,
          selfDirection: 0,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'Remembered open loop: return to the runtime diff',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: null,
        rememberedPlanSummary: 'Remembered open loop: return to the runtime diff',
        updatedAt: 10_000,
      },
    })

    expect(query).toContain('runtime knot')
    expect(query).toContain('runtime diff')
    expect(query).toContain('Remembered open loop: return to the runtime diff')
    expect(query).toContain('follow up unfinished continue return open loop')
  })

  it('renders a dedicated prompt block for durable memory pressure', () => {
    const block = buildLongHorizonMemorySystemBlock({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'mnemonic-passive',
        currentScene: null,
        attention: null,
        captureState: {
          permission: 'granted',
          lastGroundedAt: 20_000,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 20_000,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: null,
        beliefRevision: null,
        hypothesisGraph: null,
        mindDynamics: null,
        mindKernel: null,
        privateThought: null,
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
        concernContinuity: null,
        longHorizonMemory: {
          preferenceBias: {
            companionship: 0.72,
            truthfulGrounding: 0.82,
            gentleRepair: 0.7,
            quietObservation: 0.42,
            proactiveCare: 0.68,
            playfulIntimacy: 0.2,
            autonomyRespect: 0.62,
            unfinishedThreadReturn: 0.74,
          },
          identityBias: {
            guardedness: 0.34,
            tenderness: 0.7,
            directness: 0.76,
            selfDirection: 0.66,
          },
          anchorFacts: [{
            factId: 'fact-1',
            subject: 'assistant',
            predicate: 'remember',
            object: 'return to the runtime thread',
            confidence: 0.82,
            weight: 0.78,
            influenceTags: ['task', 'identity'],
            summary: 'Remembered open loop: assistant remember return to the runtime thread',
            lastRecalledAt: 20_000,
          }],
          summary: 'plan=Remembered open loop: assistant remember return to the runtime thread',
          dominantCueSummary: 'Remembered open loop: assistant remember return to the runtime thread',
          rememberedPreferenceSummary: 'Remembered preference: keep answers grounded and direct',
          rememberedConstraintSummary: 'Remembered boundary: do not crowd the host while focused',
          rememberedPlanSummary: 'Remembered open loop: assistant remember return to the runtime thread',
          updatedAt: 20_000,
        },
        selfContinuity: null,
        autobiographicalSelf: null,
        threadRuntime: null,
        commitmentLedger: null,
        inquiryPlanner: null,
        repairLedger: null,
        intentionStream: null,
        reflectionLedger: null,
        executiveCycle: null,
        thoughtThreads: null,
        desireMemory: null,
        recallGovernor: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
        replyDeliberation: null,
        answerPlanner: null,
      },
      agency: {
        selfState: null,
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
      },
    } as any)

    expect(block).toContain('[ALICIZATION_LONG_HORIZON_MEMORY]')
    expect(block).toContain('Remembered preference:')
    expect(block).toContain('Remembered boundary:')
    expect(block).toContain('Anchor memories:')
  })

  it('filters superseded facts and favors validated internalized knowledge in durable cues', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 50_000,
      facts: [
        {
          id: 'fact-superseded',
          subject: 'assistant',
          predicate: 'learned',
          object: 'an old brittle runtime shortcut',
          confidence: 0.92,
          accessCount: 6,
          updatedAt: 49_000,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'superseded',
        },
        {
          id: 'fact-durable',
          subject: 'assistant',
          predicate: 'learned',
          object: 'return to the same runtime seam before branching',
          confidence: 0.82,
          accessCount: 4,
          updatedAt: 49_500,
          knowledgeStage: 'internalized-long-horizon-knowledge',
          validationStatus: 'validated',
          supersedes: ['fact-superseded'],
        },
      ] as any,
    })

    expect(snapshot?.anchorFacts.some(cue => cue.factId === 'fact-superseded')).toBe(false)
    expect(snapshot?.anchorFacts.some(cue => cue.factId === 'fact-durable')).toBe(true)
    expect(snapshot?.summary).toContain('runtime seam')
  })

  it('prefers repeatedly validated durable cues over contradiction-heavy ones', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 60_000,
      facts: [
        {
          id: 'fact-stable',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify before sounding certain',
          confidence: 0.82,
          accessCount: 4,
          updatedAt: 59_500,
          validationCount: 3,
          contradictionCount: 0,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
        },
        {
          id: 'fact-unstable',
          subject: 'assistant',
          predicate: 'procedure',
          object: 'verify before sounding certain',
          confidence: 0.84,
          accessCount: 4,
          updatedAt: 59_500,
          validationCount: 1,
          contradictionCount: 3,
          knowledgeStage: 'validated-knowledge',
          validationStatus: 'validated',
        },
      ] as any,
    })

    expect(snapshot?.anchorFacts[0]?.factId).toBe('fact-stable')
  })
})
