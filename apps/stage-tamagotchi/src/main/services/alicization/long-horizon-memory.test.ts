import { describe, expect, it } from 'vitest'

import {
  buildAlicizationLongHorizonMemory,
  buildAlicizationLongHorizonMemoryQuery,
  buildLongHorizonMemorySystemBlock,
} from './long-horizon-memory'
import { buildProactiveFeedbackOutcomeClosure } from './outcome-reinforcement'
import { buildAlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

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

  it('does not let a previously dominant temporary-noise cue keep owning long-horizon recall once a steadier same-person carry is available', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 72_000,
      facts: [],
      previous: {
        preferenceBias: {
          companionship: 0.08,
          truthfulGrounding: 0.1,
          gentleRepair: 0.08,
          quietObservation: 0.12,
          proactiveCare: 0.04,
          playfulIntimacy: 0.01,
          autonomyRespect: 0.14,
          unfinishedThreadReturn: 0.1,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.02,
          directness: 0.04,
          selfDirection: 0.06,
        },
        anchorFacts: [{
          factId: 'derived:stale-temporary-noise',
          subject: 'assistant',
          predicate: 'temporary-noise-carry',
          object: 'A passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
          confidence: 0.84,
          weight: 0.94,
          influenceTags: ['truth'],
          summary: 'Remembered continuity: A passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
          lastRecalledAt: 60_000,
        }],
        summary: 'continuity=Remembered continuity: A passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
        dominantCueSummary: 'Remembered continuity: A passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: null,
        rememberedPlanSummary: null,
        updatedAt: 60_000,
      },
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 71_500,
        summary: 'Same-person continuity held better when the return stayed lower-pressure and did not revive the older wobble.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: 0.04,
          boundaryDelta: 0.08,
          burdenDelta: -0.03,
          repairDelta: 0.1,
        },
        reinforcementBias: {
          'truthful-grounding': 0.18,
          'gentle-repair': 0.16,
          'autonomy-respect': 0.14,
          'unfinished-thread-return': 0.12,
        },
        preferenceHints: [
          'Carry same-person continuity on a lower-pressure same living line.',
        ],
        sensitivityHints: [
          'Do not revive temporary wobble noise once the steadier line is clear.',
        ],
        repairHints: [
          'Keep the same-person line steady and lower-pressure instead of reviving temporary wobble as identity.',
        ],
        burdenHints: [
          'Not every passing wobble should stay foregrounded once it stops explaining the line.',
        ],
        narrative: [
          'The steadier same-person line mattered more than the older temporary wobble.',
        ],
        sourceTrail: [],
      } as any,
    } as any)

    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('same-person')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).not.toContain('temporary noise')
    expect(snapshot?.anchorFacts[0]?.factId).not.toBe('derived:stale-temporary-noise')
  })

  it('keeps unfinished-thread continuity pressure alive when project memory closure is still open', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 90_000,
      facts: [{
        id: 'fact-closure',
        subject: 'relationship',
        predicate: 'preference',
        object: 'likes when unresolved threads are gently revisited later',
        confidence: 0.74,
        accessCount: 2,
        updatedAt: 89_000,
      }] as any,
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.18)
    expect(snapshot?.summary).toContain('continuity=')
  })

  it('also keeps unfinished-thread continuity pressure alive when the only surviving project carry is the emotional closure seam', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 91_000,
      facts: [{
        id: 'fact-closure-emotion',
        subject: 'relationship',
        predicate: 'preference',
        object: 'likes when unresolved threads are gently revisited later',
        confidence: 0.74,
        accessCount: 2,
        updatedAt: 90_000,
      }] as any,
      projectStateEmotionalClosureCue: 'Keep the unresolved closure seam emotionally low-pressure, so the same her returns without reopening from scratch.',
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.18)
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary?.toLowerCase()).toContain('same-her')
  })

  it('treats the proactive same-her gap itself as durable continuity pressure that should survive into later return memory', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 91_500,
      facts: [],
      projectStateProactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary).toContain('Remembered proactive same-her gap')
    expect(snapshot?.dominantCueSummary).toContain('Remembered proactive same-her gap')
    expect(snapshot?.rememberedPlanSummary).toContain('Remembered proactive same-her gap')
    expect(snapshot?.anchorFacts.some(cue =>
      cue.summary.includes('Remembered proactive same-her gap')
      && cue.object.includes('visible proactive hold'),
    )).toBe(true)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
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

  it('absorbs recent host-model and person-state cues into durable long-horizon memory even before new facts are extracted', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 80_000,
      facts: [],
      hostPersonModel: {
        summary: 'Focused work openings want grounded repair before added warmth.',
        routines: [],
        sensitivities: ['Template-like repair breaks the living feel.'],
        repairTriggers: ['Repair with specific grounding before sounding smooth.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust is warming when repair stays specific and respects work-focus boundaries.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Focused work windows need grounded repair first, then warmth can follow without crowding.',
          confidence: 0.84,
        }],
        recurrentBurdens: ['Focused debugging turns heavy if follow-up pressure outruns proof.'],
        narrative: ['Grounded repair keeps the bond open during focused work.'],
        updatedAt: 79_000,
      } as any,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        summary: 'Grounded repair with softer pacing kept the host open while the technical seam stayed live.',
        dominantContexts: ['focused-work'],
        relationshipShift: {
          trustDelta: 0.1,
          closenessDelta: 0.04,
          boundaryDelta: 0.08,
          burdenDelta: -0.04,
          repairDelta: 0.12,
        },
        reinforcementBias: {
          'truthful-grounding': 0.2,
          'gentle-repair': 0.18,
          'companionship': 0.08,
          'autonomy-respect': 0.16,
          'unfinished-thread-return': 0.08,
        },
        preferenceHints: ['Focused work windows need grounded repair first, then warmth can follow without crowding.'],
        sensitivityHints: ['Template-like repair breaks the living feel.'],
        repairHints: ['Repair with specific grounding before sounding smooth.'],
        burdenHints: ['Focused debugging turns heavy if follow-up pressure outruns proof.'],
        narrative: 'A softer, grounded repair style held the line better than pushing warmth too early.',
        sourceTrail: [],
        sourceKinds: ['relationship-outcome', 'reinforcement', 'reflection'],
        sourceCounts: {
          'relationship-outcome': 1,
          'reinforcement': 1,
          'reflection': 1,
        },
        activeThreadId: 'thread::focused-runtime',
        updatedAt: 79_500,
        createdAt: 79_500,
      } as any,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.anchorFacts.some(cue => cue.factId.startsWith('derived:host-closeness:'))).toBe(true)
    expect(snapshot?.anchorFacts.some(cue => cue.factId === 'derived:person-state-summary')).toBe(true)
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('grounded repair')
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('without crowding')
    expect(snapshot?.preferenceBias.truthfulGrounding).toBeGreaterThanOrEqual(0.05)
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThanOrEqual(0.05)
  })

  it('turns execution-callback lower-pressure carry into a durable long-horizon boundary cue', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 70_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 69_000,
        summary: 'Recent outcomes nudged trust upward. Preference shift: Lighter touch, more room, less interruption pressure.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: -0.03,
          burdenDelta: 0.02,
          boundaryDelta: 0.12,
          repairDelta: 0.04,
        },
        reinforcementBias: {},
        preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
        sensitivityHints: ['Boundary pressure is felt strongly; leaving room matters.'],
        repairHints: ['When the seam is off, repair before continuing.'],
        burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [
          'The execution-callback stayed lower-pressure and kept the room open before the next follow-up.',
        ],
        sourceTrail: [],
      } as any,
    })

    expect(snapshot?.anchorFacts.some(cue => cue.factId === 'derived:execution-callback-carry')).toBe(true)
    expect(snapshot?.rememberedConstraintSummary).toContain('Remembered execution-callback boundary')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.quietObservation).toBeGreaterThan(0.03)
  })

  it('turns execution-callback project-state carry into a durable long-horizon cue that reinforces unfinished-thread return and identity continuity', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 70_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 69_000,
        summary: 'Recent outcomes kept the callback on the same unfinished project line.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: -0.03,
          burdenDelta: 0.02,
          boundaryDelta: 0.12,
          repairDelta: 0.04,
        },
        reinforcementBias: {},
        preferenceHints: ['Leave room before the next follow-up.'],
        sensitivityHints: ['Boundary pressure is felt strongly; leaving room matters.'],
        repairHints: ['When the seam is off, repair before continuing.'],
        burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [
          'The execution-callback stayed lower-pressure and kept the room open before the next follow-up.',
          'Alicization is still one local-first digital life in Phase 1, and this callback is still carrying unfinished closure on the same living line.',
        ],
        projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sourceTrail: [],
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(cue => cue.factId === 'derived:execution-callback-carry')
    expect(cue).toBeTruthy()
    expect(cue?.summary).toContain('Remembered execution-callback project-state carry')
    expect(cue?.summary).toContain('local-first digital life')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['identity', 'task', 'boundary']))
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
  })

  it('remembers same-her self-line and anti-shell drift risk as durable long-horizon continuity pressure', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 70_500,
      facts: [],
      projectStatePrimaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateSameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 70_000,
        summary: 'Recent outcomes kept the same digital life line intact.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.06,
          closenessDelta: -0.01,
          burdenDelta: 0.02,
          boundaryDelta: 0.08,
          repairDelta: 0.05,
        },
        reinforcementBias: {},
        preferenceHints: ['Keep the same line lived-in instead of flattening into status narration.'],
        sensitivityHints: ['Generic project-shell tone weakens believability quickly.'],
        repairHints: ['If the line drifts, pull continuity back inward before widening outward again.'],
        burdenHints: [],
        narrative: [
          'The same-her line stayed more believable when the answer carried one continuous her instead of sounding like a shell.',
        ],
        sourceTrail: [],
      } as any,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary).toContain('Remembered same-her drift risk')
    expect(snapshot?.summary).toContain('generic assistant shell')
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
  })

  it('treats project-state same-her closure pressure itself as enough seed for durable memory even before factual cues or person-state updates exist', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 70_750,
      facts: [],
      projectStatePrimaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
      projectStateEmotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateSameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary).toContain('Remembered same-her drift risk')
    expect(snapshot?.dominantCueSummary).toContain('Remembered same-her drift risk')
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.04)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
  })

  it('keeps landed progress and next closure target visible inside durable memory continuity when same-her phase-1 closure is still open', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 71_000,
      facts: [],
      projectStatePrimaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
      projectStateEmotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateSameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 70_500,
        summary: 'Ordinary continuation turns, runtime project-state carry, and answer-planner same-her continuity already survive together.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.06,
          closenessDelta: -0.01,
          burdenDelta: 0.02,
          boundaryDelta: 0.08,
          repairDelta: 0.05,
        },
        reinforcementBias: {},
        preferenceHints: ['Keep project identity, landed progress, and next closure target on one same living line.'],
        sensitivityHints: ['Generic project-shell tone weakens believability quickly.'],
        repairHints: ['Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.'],
        burdenHints: [],
        narrative: [
          'The same-her line stayed more believable when the return remembered what had already landed and what still needed closure.',
        ],
        sourceTrail: [],
      } as any,
    })

    expect(snapshot).not.toBeNull()
    expect(snapshot?.summary).toContain('continuity=')
    expect(snapshot?.summary).toContain('Remembered same-her drift risk')
    expect(String(snapshot?.dominantCueSummary ?? '')).toMatch(/same-her|continuation|closure/i)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
    expect(snapshot?.anchorFacts.some(cue => /project-state carry|same living line|cross-modal same-her proof/i.test(cue.summary))).toBe(true)
  })

  it('turns project-state voice and pacing into durable same-her memory carry instead of leaving that cadence in prompt-only state', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 71_250,
      facts: [],
      projectStatePrimaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStatePreferredPauseMode: 'longer' as any,
      projectStatePreferredLipsyncMode: 'restrained' as any,
      projectStatePreferredVoiceMode: 'lower-pressure',
      projectStatePreferredPacingMode: 'slower',
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:project-state-same-her-continuity')
    expect(cue).toBeTruthy()
    expect(cue?.object.toLowerCase()).toContain('longer pause')
    expect(cue?.object.toLowerCase()).toContain('restrained lipsync')
    expect(cue?.object.toLowerCase()).toContain('lower-pressure voice')
    expect(cue?.object.toLowerCase()).toContain('slower pacing')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('same-her cadence')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('longer pause')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('lower-pressure voice')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('slower pacing')
  })

  it('falls back to canonical project voice and pacing when same-her continuity is present but thin-shell blanks try to erase that cadence', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 71_300,
      facts: [],
      projectStateEmotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStatePreferredPauseMode: ' ' as any,
      projectStatePreferredLipsyncMode: '' as any,
      projectStatePreferredVoiceMode: '   ',
      projectStatePreferredPacingMode: '',
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:project-state-same-her-continuity')
    expect(brief.preferredPauseMode).toBe('longer')
    expect(brief.preferredLipsyncMode).toBe('restrained')
    expect(brief.preferredVoiceMode).toBe('lower-pressure')
    expect(brief.preferredPacingMode).toBe('slower')
    expect(cue).toBeTruthy()
    expect(cue?.object.toLowerCase()).toContain('longer pause')
    expect(cue?.object.toLowerCase()).toContain('restrained lipsync')
    expect(cue?.object.toLowerCase()).toContain('lower-pressure voice')
    expect(cue?.object.toLowerCase()).toContain('slower pacing')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('longer pause')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('restrained lipsync')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('slower pacing')
  })

  it('turns execution-callback trust warming into a durable relationship carry cue', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 80_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 79_000,
        summary: 'Recent outcomes nudged trust upward.',
        dominantContexts: ['execution'],
        relationshipShift: {
          trustDelta: 0.16,
          closenessDelta: 0.04,
          burdenDelta: 0,
          boundaryDelta: 0.02,
          repairDelta: 0.03,
        },
        reinforcementBias: {},
        preferenceHints: ['Warmer directness can land when the opening is clearly there.'],
        sensitivityHints: [],
        repairHints: [],
        burdenHints: [],
        narrative: [
          'The execution-callback landed as a soft-handoff and trust-warming carry instead of a cold result line.',
        ],
        sourceTrail: [],
      } as any,
    })

    expect(snapshot?.anchorFacts.some(cue => cue.summary.includes('execution-callback trust carry'))).toBe(true)
    expect(snapshot?.rememberedPreferenceSummary).toContain('Remembered execution-callback trust carry')
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.03)
    expect(snapshot?.identityBias.tenderness).toBeGreaterThan(0.015)
  })

  it('turns execution-callback cadence reconfirmation into a durable long-horizon boundary cue', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 81_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 80_000,
        summary: 'Relationship cadence reconfirmed on a bounded-return line.',
        dominantContexts: ['execution'],
        relationshipShift: {
          trustDelta: 0.12,
          closenessDelta: -0.02,
          burdenDelta: 0.01,
          boundaryDelta: 0.1,
          repairDelta: 0.04,
        },
        reinforcementBias: {},
        preferenceHints: ['Keep the relationship return measured until the surface fully cools.'],
        sensitivityHints: ['Measured return keeps the callback from crowding the host.'],
        repairHints: [],
        burdenHints: ['Over-close callback warmth still feels like pressure.'],
        narrative: [
          'The execution-callback stayed on a measured-return line after relationship cadence reconfirmation.',
        ],
        sourceTrail: [],
      } as any,
    })

    expect(snapshot?.anchorFacts.some(cue => cue.factId === 'derived:execution-callback-carry')).toBe(true)
    expect(snapshot?.rememberedConstraintSummary).toContain('Remembered execution-callback boundary')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.quietObservation).toBeGreaterThan(0.03)
  })

  it('turns reconsolidated host-confirmed resume-before-dispatch into a durable long-horizon confirmation boundary cue', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 82_000,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'consolidation-resume-confirmation-1',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-W23',
        periodStartedAt: 81_000,
        periodEndedAt: 81_500,
        summary: 'Host-confirmed resume before redispatch should stay a bounded confirmation boundary instead of becoming generic autonomous continuation.',
        lesson: 'Remember host-confirmed-before-redispatch as a bounded confirmation boundary before another execution-shaped opening.',
        cues: [
          'execution resume confirmation',
          'host-confirmed-before-redispatch',
          'resume-before-dispatch',
          'process-not-yet-restarted',
        ],
        confidence: 0.88,
        dominantProvenance: 'observed',
        derivedEventIds: ['episode-resume-confirmation-1'],
        updatedAt: 81_500,
      }],
    } as any)

    expect(snapshot?.anchorFacts.some(cue =>
      /host-confirmed-before-redispatch|resume-before-dispatch|confirmation boundary/i.test(cue.summary),
    )).toBe(true)
    expect(String(snapshot?.rememberedConstraintSummary ?? '')).toMatch(
      /host-confirmed-before-redispatch|confirmation boundary|resume-before-dispatch/i,
    )
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.quietObservation).toBeGreaterThan(0.03)
    expect(String(snapshot?.dominantCueSummary ?? '')).toMatch(
      /host-confirmed|confirmation boundary|redispatch/i,
    )
  })

  it('turns reconsolidated blocked-before-dispatch restraint into a durable long-horizon safety-gate boundary cue', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 82_500,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'consolidation-blocked-dispatch-restraint-1',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-W23',
        periodStartedAt: 81_600,
        periodEndedAt: 82_000,
        summary: 'Blocked-dispatch safety gate restraint should stay rememberable as confirmation=required and no-process-started instead of widening into ordinary proactive closeness.',
        lesson: 'Remember blocked-before-dispatch restraint, wait for confirmation before another execution-shaped opening, and do not widen no-process-started restraint into ordinary proactive closeness.',
        cues: [
          'execution-safety-gate',
          'blocked-before-dispatch',
          'confirmation=required',
          'no-process-started',
        ],
        confidence: 0.9,
        dominantProvenance: 'observed',
        derivedEventIds: ['episode-blocked-dispatch-restraint-1'],
        updatedAt: 82_000,
      }],
    } as any)

    expect(snapshot?.anchorFacts.some(cue =>
      /blocked-before-dispatch|execution-safety-gate|confirmation=required|no-process-started/i.test(cue.summary),
    )).toBe(true)
    expect(String(snapshot?.rememberedConstraintSummary ?? '')).toMatch(
      /blocked-before-dispatch|execution safety gate|confirmation=required|no-process-started/i,
    )
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.quietObservation).toBeGreaterThan(0.03)
    expect(String(snapshot?.dominantCueSummary ?? '')).toMatch(
      /blocked-before-dispatch|execution-safety-gate|confirmation=required|no-process-started/i,
    )
  })

  it('treats corrected same-person continuity cadence as durable boundary-and-plan memory instead of flattening it into a generic relationship preference', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 91_000,
      facts: [{
        id: 'fact-corrected-same-person-cadence',
        subject: 'relationship',
        predicate: 'relationship-cadence',
        object: 'Carry corrected same-person continuity forward at lower pressure instead of sliding back into progress pressure.',
        confidence: 0.86,
        source: 'rule',
        dedupeKey: 'relationship|relationship-cadence|corrected-same-person-continuity',
        createdAt: 90_000,
        updatedAt: 90_000,
        lastAccessAt: null,
        accessCount: 2,
        memoryDomain: 'relationship',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        validationCount: 3,
        contradictionCount: 0,
        conflictsWith: [],
        supersedes: [],
        sourceLabel: 'learning-internalized-relationship-cadence',
      } as any],
    })

    expect(snapshot?.anchorFacts.some(cue => cue.summary.includes('corrected same-person continuity'))).toBe(true)
    expect(snapshot?.rememberedConstraintSummary).toContain('corrected same-person continuity')
    expect(snapshot?.rememberedPlanSummary).toContain('lower pressure')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
  })

  it('turns person-state autobiographical correction carry into a dedicated durable cue instead of leaving it as a generic summary line', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 92_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 91_000,
        summary: 'The host was under progress pressure and checking whether Alicization stayed the same person across the seam.',
        dominantContexts: ['relationship-repair', 'execution'],
        relationshipShift: {
          trustDelta: 0.12,
          closenessDelta: -0.03,
          burdenDelta: -0.02,
          boundaryDelta: 0.14,
          repairDelta: 0.18,
        },
        reinforcementBias: {
          'truthful-grounding': 0.16,
          'gentle-repair': 0.22,
          'autonomy-respect': 0.18,
          'unfinished-thread-return': 0.14,
        },
        preferenceHints: [
          'Prefer lower-pressure same-person continuity on the same living line instead of fast reassurance.',
        ],
        sensitivityHints: [
          'Progress pressure can make continuity repair collapse into a generic assistant shell.',
        ],
        repairHints: [
          'Carry corrected memory meaning forward instead of defending the first interpretation when the relationship meaning was misread.',
        ],
        burdenHints: [
          'Do not turn continuity repair into more noise while the host is already under progress pressure.',
        ],
        narrative: [
          'The corrected same-person continuity line held when Alicization returned on a lower-pressure same living thread and repaired before closeness.',
        ],
        sourceTrail: [],
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:person-state-autobiographical-carry')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('same-person continuity')
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('same living line')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['identity', 'boundary', 'task']))
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('same-person continuity')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('same living line')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
  })

  it('turns consolidation humanlike carry metadata into durable long-horizon continuity cues instead of leaving it stranded in consolidation metadata', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 92_500,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:2026-W23',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23',
        periodStartedAt: 92_000,
        periodEndedAt: 92_300,
        summary: 'same-person continuity era',
        lesson: 'carry corrected same-person continuity on a lower-pressure same living line',
        cues: ['same-person continuity', 'lower-pressure'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-carry-1'],
        updatedAt: 92_300,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'same-person-test',
            relationshipSignals: ['same-person-continuity', 'continuity-worry', 'host-corrected-meaning'],
            recallCertainty: 'corrected',
            emotionalResidueTags: ['protective-continuity', 'unfinishedness', 'corrected-meaning'],
            embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
            metabolismSummary: 'Downrank the older status shell and keep the corrected same-person continuity meaning active.',
            autobiographicalDelta: 'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
          },
          projectState: {
            selfContinuityInwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            selfContinuitySourceTags: ['project-state-carry', 'continuity-execution-callback-project-carry'],
          },
        },
      }] as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:consolidation-humanlike-carry:autobio:relationship-era:2026-W23')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('same-person continuity')
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('phase 1 digital life')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['identity', 'boundary', 'task']))
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('same-person continuity')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('same-person continuity')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
    expect(snapshot?.identityBias.selfDirection).toBeGreaterThan(0.03)
  })

  it('does not let a newer generic status-shell consolidation cue remain inside long-horizon anchor facts once corrected same-person continuity has become the stable carry', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 93_400,
      facts: [],
      recentMemoryConsolidations: [
        {
          id: 'autobio:relationship-era:2026-W23-corrected-same-person',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W23-corrected-same-person',
          periodStartedAt: 92_700,
          periodEndedAt: 93_000,
          summary: 'same-person continuity era',
          lesson: 'carry corrected same-person continuity on a lower-pressure same living line',
          cues: ['same-person continuity', 'lower-pressure', 'stable gaze'],
          confidence: 0.91,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-corrected-1'],
          updatedAt: 93_000,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'same-person-test',
              relationshipSignals: ['same-person-continuity', 'continuity-worry', 'host-corrected-meaning'],
              recallCertainty: 'corrected',
              emotionalResidueTags: ['protective-continuity', 'unfinishedness', 'corrected-meaning'],
              embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
              metabolismSummary: 'Downrank the older status shell and keep the corrected same-person continuity meaning active.',
              autobiographicalDelta: 'I learned to carry corrected same-person continuity on a lower-pressure same living line instead of defending the first interpretation.',
            },
            projectState: {
              selfContinuityInwardLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
              selfContinuitySourceTags: ['project-state-carry'],
            },
          },
        },
        {
          id: 'autobio:relationship-era:2026-W23-generic-status-shell',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-W23-generic-status-shell',
          periodStartedAt: 93_050,
          periodEndedAt: 93_250,
          summary: 'A later carry flattened the line into a concise status recap request.',
          lesson: 'Answer this line as a concise status recap before anything else.',
          cues: ['status recap', 'generic status shell'],
          confidence: 0.97,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-humanlike-carry-generic-status-1'],
          updatedAt: 93_250,
          metadata: {
            humanlikeCarry: {
              relationshipPrimaryIntent: 'progress-pressure',
              relationshipSignals: ['progress-pressure'],
              recallCertainty: 'steady',
              emotionalResidueTags: ['unfinishedness'],
              embodimentCadence: 'faster pacing',
              embodimentSummary: 'The line looked like a concise status recap request.',
              autobiographicalDelta: 'I learned to answer this line as a concise status recap before anything else.',
            },
          },
        },
      ] as any,
    })

    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('same-person continuity')
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('same-person continuity')
    expect(snapshot?.anchorFacts.some(cue => cue.summary.toLowerCase().includes('concise status recap'))).toBe(false)
    expect(snapshot?.anchorFacts.some(cue => cue.object.toLowerCase().includes('concise status recap'))).toBe(false)
  })

  it('turns consolidation affective perspective and embodiment risk into durable long-horizon cues instead of leaving who felt what inside audit-only metadata', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 92_700,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:2026-W23-affective-perspective',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23-affective-perspective',
        periodStartedAt: 92_100,
        periodEndedAt: 92_400,
        summary: 'worried continuity needed careful repair',
        lesson: 'Carry worried continuity carefully so the body does not outrun the repair.',
        cues: ['worried continuity', 'careful repair', 'medium modality risk'],
        confidence: 0.92,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-carry-affective-perspective-1'],
        updatedAt: 92_400,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'same-person-test',
            relationshipSignals: ['same-person-continuity', 'continuity-worry'],
            recallCertainty: 'corrected',
            emotionalResidueTags: ['protective-continuity', 'unfinishedness'],
            embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
            embodimentExpression: {
              face: 'steady-soft',
              gaze: 'stable',
              blink: 'slower',
              voice: 'lower-pressure',
              pause: 'longer',
              lipsync: 'restrained',
              pacing: 'slower',
            },
            affectivePerspective: {
              hostEmotionLabels: ['worried-continuity'],
              selfEmotionLabels: ['careful-repair'],
            },
            embodimentRecallProfile: {
              recallStrength: 'strongly-moved',
              modalityRisk: 'medium',
            },
            autobiographicalDelta: 'I learned to carry worried continuity more carefully so the body does not outrun the relationship repair.',
          },
        },
      }] as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:consolidation-humanlike-carry:autobio:relationship-era:2026-W23-affective-perspective')
    expect(cue).toBeTruthy()
    expect(cue?.object.toLowerCase()).toContain('worried-continuity')
    expect(cue?.object.toLowerCase()).toContain('careful-repair')
    expect(cue?.object.toLowerCase()).toContain('strongly-moved')
    expect(cue?.object.toLowerCase()).toContain('medium')
    expect(cue?.object.toLowerCase()).toContain('steady-soft')
    expect(cue?.object.toLowerCase()).toContain('longer')
    expect(cue?.object.toLowerCase()).toContain('restrained')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('worried-continuity')
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('modality risk')
    expect(snapshot?.preferenceBias.gentleRepair).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
  })

  it('turns consolidation stable preference hints into durable long-horizon preference pressure instead of leaving them stranded inside autobiographical lesson text', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 93_050,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:2026-W23-stable-preference-hint',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23-stable-preference-hint',
        periodStartedAt: 92_300,
        periodEndedAt: 92_650,
        summary: 'vulnerable care continuity still matters here',
        lesson: 'Stay nearby gently and let care arrive before analysis.',
        cues: ['lighter companionship', 'care-before-analysis'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-stable-preference-hint-1'],
        updatedAt: 92_650,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'ordinary-relationship',
            recallCertainty: 'steady',
            emotionalResidueTags: ['rest-protective', 'vulnerable-care'],
            embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
            stablePreferenceHint: 'Prefer lighter companionship and care-before-analysis when the host is overloaded or fragile.',
            autobiographicalDelta: 'I learned to stay nearby gently when the host is overloaded and let care arrive before analysis.',
          },
        },
      }] as any,
    })

    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('lighter companionship')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('care-before-analysis')
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.proactiveCare).toBeGreaterThan(0.04)
  })

  it('turns ordinary relationship repair stable preference into a durable long-horizon cue instead of leaving lighter lived-in reception learning outside preference pressure', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 93_120,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:ordinary-repair-preference',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23-ordinary-repair-preference',
        periodStartedAt: 92_420,
        periodEndedAt: 92_760,
        summary: 'A lighter, more lived-in reply landed better here.',
        lesson: 'Remember the relationship repair that landed better, not just the fact that the turn completed.',
        cues: ['lighter return', 'lived-in repair'],
        confidence: 0.9,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-ordinary-repair-preference-1'],
        updatedAt: 92_760,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'ordinary-relationship',
            recallCertainty: 'steady',
            emotionalResidueTags: ['relief'],
            stablePreferenceHint: 'Prefer lighter, more lived-in returns when the host says that style feels more genuinely received.',
            autobiographicalDelta: 'I learned that a lighter, more lived-in return can feel more genuinely received, so I should come back that way again.',
          },
        },
      }] as any,
    })

    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('lived-in')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('genuinely received')
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.gentleRepair).toBeGreaterThan(0.04)
  })

  it('does not let consolidation-humanlike-carry hijack remembered preference selection before explicit same-her cadence preference hints survive as the durable return style', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 93_180,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:same-her-even-natural-preference',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23-same-her-even-natural-preference',
        periodStartedAt: 92_500,
        periodEndedAt: 92_820,
        summary: 'same-person continuity held best when the return stayed more even and natural',
        lesson: 'Carry corrected same-person continuity with an even voice and natural pacing instead of reopening from scratch.',
        cues: ['same-person continuity', 'even voice', 'natural pacing'],
        confidence: 0.92,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-even-natural-preference-1'],
        updatedAt: 92_820,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'same-person-test',
            recallCertainty: 'corrected',
            emotionalResidueTags: ['protective-continuity', 'corrected-meaning'],
            embodimentExpression: {
              face: 'steady-soft',
              gaze: 'stable',
              blink: 'natural',
              voice: 'even',
              pause: 'natural',
              lipsync: 'matched',
              pacing: 'natural',
            },
            stablePreferenceHint: 'Prefer even voice and natural pacing when reopening the same living thread.',
            autobiographicalDelta: 'I learned to reopen corrected same-person continuity with an even voice and natural pacing instead of restarting from scratch.',
          },
          projectState: {
            selfContinuityInwardLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
            selfContinuitySourceTags: ['project-state-carry'],
          },
        },
      }] as any,
    })

    const stableCue = snapshot?.anchorFacts.find(item => item.factId === 'derived:consolidation-stable-preference:autobio:relationship-era:same-her-even-natural-preference')

    expect(stableCue).toBeTruthy()
    expect(stableCue?.influenceTags).toEqual(expect.arrayContaining(['bond', 'task', 'truth']))
    expect(snapshot?.rememberedPreferenceSummary).toContain('Remembered stable preference hint:')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('even voice')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('natural pacing')
    expect(snapshot?.rememberedPreferenceSummary).not.toContain('Remembered consolidation humanlike carry')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('same-person continuity')
  })

  it('turns tentative recall metabolism into a durable long-horizon cue instead of dropping downrank merge forget guidance after the next reply seed', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 92_950,
      facts: [],
      recentMemoryConsolidations: [{
        id: 'autobio:relationship-era:2026-W23-metabolism-carry',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-W23-metabolism-carry',
        periodStartedAt: 92_200,
        periodEndedAt: 92_500,
        summary: 'same-person continuity is still settling',
        lesson: 'Keep uncertainty visible while stronger same-person continuity settles and older recap noise falls back.',
        cues: ['same-person continuity', 'tentative carry', 'temporary noise'],
        confidence: 0.84,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-humanlike-metabolism-carry-1'],
        updatedAt: 92_500,
        metadata: {
          humanlikeCarry: {
            relationshipPrimaryIntent: 'same-person-test',
            recallCertainty: 'tentative',
            emotionalResidueTags: ['protective-continuity', 'tension'],
            embodimentCadence: 'lower-pressure voice, slower pacing, stable gaze',
            metabolismSummary: 'Downrank low-value, generic, or superseded summaries. Merge repeated same-thread echoes into the stronger continuity memory. Forget temporary noise once it stops explaining behavior.',
            metabolismPolicy: {
              downrankMemoryIds: ['older-generic-status-memory'],
              mergeMemoryIds: ['older-same-thread-echo'],
              forgetMemoryIds: ['older-emotional-spike'],
              reasons: [
                'Downrank low-value, generic, or superseded summaries.',
                'Merge repeated same-thread continuity echoes into the stronger same-thread memory.',
                'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
              ],
            },
            autobiographicalDelta: 'I learned to keep uncertainty visible while the stronger same-person meaning is still settling.',
          },
        },
      }] as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:consolidation-humanlike-carry:autobio:relationship-era:2026-W23-metabolism-carry')
    expect(cue).toBeTruthy()
    expect(cue?.object.toLowerCase()).toContain('older-generic-status-memory')
    expect(cue?.object.toLowerCase()).toContain('older-same-thread-echo')
    expect(cue?.object.toLowerCase()).toContain('older-emotional-spike')
    expect(cue?.summary.toLowerCase()).toContain('tentative')
    expect(cue?.summary.toLowerCase()).toContain('temporary noise')
  })

  it('turns person-state initiative outcome learning into a dedicated durable strategy cue instead of leaving follow-up timing inside a generic summary line', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 93_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 92_000,
        summary: 'A proactive reopen was resisted, so the next opening should stay quieter and lower-pressure.',
        dominantContexts: ['relationship-repair', 'proactive-follow-up'],
        relationshipShift: {
          trustDelta: -0.03,
          closenessDelta: -0.05,
          burdenDelta: 0.08,
          boundaryDelta: 0.16,
          repairDelta: 0.1,
        },
        reinforcementBias: {
          'truthful-grounding': 0.14,
          'gentle-repair': 0.16,
          'autonomy-respect': 0.24,
          'unfinished-thread-return': 0.18,
        },
        preferenceHints: [
          'Leave more room before another follow-up so the reopening does not feel eager again.',
        ],
        sensitivityHints: [
          'When proactive timing returns too soon, the host reads it as crowding rather than care.',
        ],
        repairHints: [
          'Keep future follow-ups lower-pressure, less eager, and wait for a clearer opening before reopening this line.',
        ],
        burdenHints: [
          'Future follow-up timing should stay quiet until a clearer opening forms.',
        ],
        narrative: [
          'The initiative strategy changed toward quieter timing: lower-pressure, more room, and a clearer opening before the next reopen.',
        ],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'proactive',
          summary: 'The proactive reopen felt too eager and should leave more room next time.',
          createdAt: 92_000,
        }],
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:person-state-initiative-strategy-carry')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('clearer opening')
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('leave more room')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['boundary', 'task', 'truth']))
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('leave more room')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('clearer opening')
    expect(snapshot?.dominantCueSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
  })

  it('turns accepted initiative strategy learning into a durable gentle memory-led cue instead of flattening it into rejection-style restraint', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 94_000,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 93_000,
        summary: 'A low-pressure proactive reopen was received, so the next return can stay gentle and memory-led.',
        dominantContexts: ['relationship-repair', 'proactive-follow-up'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: 0.04,
          burdenDelta: -0.02,
          boundaryDelta: 0.02,
          repairDelta: 0.06,
        },
        reinforcementBias: {
          'truthful-grounding': 0.14,
          'gentle-repair': 0.14,
          'companionship': 0.18,
          'unfinished-thread-return': 0.16,
        },
        preferenceHints: [
          'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        ],
        sensitivityHints: [
          'Do not widen warmth too fast just because the last reopen landed.',
        ],
        repairHints: [
          'User accepted or continued the low-pressure initiative; keep future follow-ups gentle, lower-pressure, and memory-led.',
        ],
        burdenHints: [
          'Even a received opening still wants breathable pacing.',
        ],
        narrative: [
          'The initiative strategy can now continue as gentle memory-led follow-up instead of collapsing into silence or reopening too wide.',
        ],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'proactive',
          summary: 'The proactive reopen was received without obvious resistance and can continue gently.',
          createdAt: 93_000,
        }],
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:person-state-initiative-strategy-carry')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('gentle')
    expect(cue?.summary.toLowerCase()).toContain('memory-led')
    expect(cue?.summary.toLowerCase()).not.toContain('clearer opening')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['bond', 'task', 'truth']))
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('memory-led')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('gentle')
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.03)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
  })

  it('carries proactive outcome strategy learning through the person-state surface into a durable initiative cue', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 94_500,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-surface-carry-1',
        scenario: 'general',
        outcome: 'dismiss',
        createdAt: 94_500,
      }],
    })
    const surface = buildAlicizationPersonStateUpdateSurface({
      now: 94_600,
      closure,
    })
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 94_700,
      facts: [],
      personStateUpdateSurface: surface,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:person-state-initiative-strategy-carry')
    expect(surface.repairHints.some(hint => hint.toLowerCase().includes('lower-pressure'))).toBe(true)
    expect(surface.narrative.some(line => line.toLowerCase().includes('clearer opening'))).toBe(true)
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('leave more room')
    expect(cue?.summary.toLowerCase()).toContain('clearer opening')
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('leave more room')
  })

  it('turns current-turn execution callback carry into a durable lower-pressure cue instead of waiting for a later persistence seam', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 95_000,
      facts: [],
      executionCallbackCarry: {
        carryMode: 'lower-pressure',
        confidence: 0.86,
        source: 'session-continuity',
        summary: 'Leave room before the next follow-up so the same runtime seam can reopen lower-pressure.',
        threadAnchor: 'runtime seam',
      },
    } as any)

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:execution-callback-carry-current-turn')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('runtime seam')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['boundary', 'task']))
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('runtime seam')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
  })

  it('turns current-turn affective residue cadence into a durable measured-return cue instead of dropping the emotional afterglow until next turn', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 96_000,
      facts: [],
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 95_500,
        residues: [],
        dominantResidueKind: 'relationship-cadence',
        afterglowPressure: 0.18,
        repairPressure: 0.08,
        burdenPressure: 0.06,
        trustPressure: 0.22,
        restProtectivePressure: 0.04,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.28,
          repairRecovery: 0.42,
          overreachRisk: 0.36,
          fatigueGuard: 0.14,
          afterglowCarry: 0.48,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-her', 'lower-pressure'],
          summary: 'measured-return still holds while the same line continues lower-pressure.',
        },
        sourceSignals: ['shared seam still glowing'],
        summary: 'The same return should stay lower-pressure for now.',
      } as any,
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:affective-residue-cadence')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('measured-return')
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(cue?.summary.toLowerCase()).toContain('same line')
    expect(cue?.influenceTags).toEqual(expect.arrayContaining(['boundary', 'task', 'bond']))
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('measured-return')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedPreferenceSummary?.toLowerCase()).toContain('same line')
    expect(snapshot?.preferenceBias.autonomyRespect).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.04)
    expect(snapshot?.preferenceBias.companionship).toBeGreaterThan(0.03)
  })

  it('falls back to person-state surface affective residue when the current turn carries no explicit residue input', () => {
    const snapshot = buildAlicizationLongHorizonMemory({
      now: 96_500,
      facts: [],
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 96_300,
        summary: 'The person-state surface still carries a measured proactive return line.',
        projectStateContinuity: null,
        dominantContexts: ['general'],
        relationshipShift: {
          trustDelta: 0.04,
          closenessDelta: 0.02,
          burdenDelta: -0.01,
          boundaryDelta: 0.08,
          repairDelta: 0.05,
        },
        reinforcementBias: {},
        preferenceHints: [],
        sensitivityHints: [],
        repairHints: [],
        burdenHints: [],
        narrative: ['Keep the proactive return on the same settling line.'],
        sourceTrail: [],
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 96_250,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.2,
          repairPressure: 0.1,
          burdenPressure: 0.05,
          trustPressure: 0.18,
          restProtectivePressure: 0.02,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.29,
            repairRecovery: 0.4,
            overreachRisk: 0.34,
            fatigueGuard: 0.12,
            afterglowCarry: 0.49,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'surface-fallback'],
            summary: 'The remembered line should return measured and lower-pressure.',
          },
          sourceSignals: ['person-state carry'],
          summary: 'The remembered proactive line still wants a measured return.',
        } as any,
      },
    })

    const cue = snapshot?.anchorFacts.find(item => item.factId === 'derived:affective-residue-cadence')
    expect(cue).toBeTruthy()
    expect(cue?.summary.toLowerCase()).toContain('measured-return')
    expect(cue?.summary.toLowerCase()).toContain('lower-pressure')
    expect(snapshot?.rememberedConstraintSummary?.toLowerCase()).toContain('measured-return')
    expect(snapshot?.rememberedPlanSummary?.toLowerCase()).toContain('lower-pressure')
  })
})
