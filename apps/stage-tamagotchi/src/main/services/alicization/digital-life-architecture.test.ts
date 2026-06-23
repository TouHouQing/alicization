import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDigitalLifeArchitecture,
  buildAlicizationDigitalLifeArchitectureSystemBlock,
} from './digital-life-architecture'
import {
  buildAlicizationDigitalLifeRuntimeSurface,
  commitAlicizationDigitalLifeMindState,
} from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('digital life architecture', () => {
  it('projects Alicization into one unified seven-system runtime spine', () => {
    const state = commitAlicizationDigitalLifeMindState({
      now: 9_000,
      previousState: createDefaultVisualPresenceState(8_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts refactor seam',
        source: 'screen-semantic-summary',
        confidence: 0.93,
        beganAt: 8_500,
        lastSeenAt: 9_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.91,
        engagedAt: 8_600,
        lastConfirmedAt: 9_000,
        dwellMs: 400,
      } as any,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime-spine',
            kind: 'problem',
            title: 'runtime spine unification',
            summary: 'Keep perception, dialogue, control, and memory on one living line.',
            status: 'active',
            source: 'grounded-scene',
            significance: 0.88,
            confidence: 0.84,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['runtime.ts diff'],
            inferredNow: [],
            openQuestions: ['which loop should drive the final reply'],
            staleRisks: [],
          },
          continuity: {
            label: 'same-thread',
            sceneAgeMs: 400,
            attentionAgeMs: 400,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 9_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          worldPressure: 0.76,
          epistemicPressure: 0.83,
          relationalPressure: 0.28,
          carePressure: 0.22,
          continuityPressure: 0.71,
          speakReadiness: 0.79,
          presenceWeight: 0.65,
          narrative: ['track the seam without splitting the self'],
          updatedAt: 9_000,
        } as any,
        subjectiveInference: {
          dominantInterpretation: 'The host wants a coherent runtime rather than another patch pile.',
          confidence: 0.82,
          source: 'hybrid',
          hostIntentCandidates: [],
          relationshipNeedCandidates: [],
          notes: [],
          updatedAt: 9_000,
        } as any,
        beliefLedger: {
          focusBeliefId: 'belief-1',
          beliefs: [
            {
              id: 'belief-1',
              scope: 'task-thread',
              source: 'grounded-observation',
              status: 'active',
              statement: 'The architecture must govern every active loop.',
              confidence: 0.78,
              salience: 0.81,
              evidence: ['runtime surface'],
              entityIds: [],
              formedAt: 8_700,
              lastUpdatedAt: 9_000,
              expiresAt: 19_000,
            },
          ],
          unresolvedContradictions: [],
          updatedAt: 9_000,
        } as any,
        dialogueEncounter: {
          act: 'ask-help',
          responseNeed: 'guide',
          truthExpectation: 'strict',
          subject: 'task-knot',
          screenReferenceMode: 'helpful',
          continuityMode: 'task-first',
          inspectionRequested: false,
          inspectionState: 'dialogue-first',
          releaseInspectionCarry: false,
          taskAnchor: 'runtime spine unification',
          summary: 'Answer by unifying the live runtime spine.',
          dialogueFirst: false,
          shouldBypassScreenRepair: false,
          mustRepairFirst: false,
          mustAnswerDirectly: true,
          mustStayTaskBound: true,
          shouldAskClarifyingQuestion: false,
          personaKernelMode: 'backgrounded',
          confidence: 0.92,
          reasonTags: ['runtime-spine', 'answer-directly'],
        } as any,
        replyDeliberation: {
          selectedMotive: 'guide',
          speakingFrom: 'task-thread',
          memoryMode: 'thread-carry',
          openingBeat: 'State the runtime spine first.',
          whyThisReplyNow: 'The active architecture seam is explicit and answer-ready.',
          whyNotOtherCandidates: [],
          withheldImpulses: [],
          candidateMotives: [],
          shouldSpeak: true,
          mustInclude: ['one architecture spine'],
          mustAvoid: ['parallel storylines'],
          confidence: 0.87,
          narrative: ['speak from the live architecture seam'],
          updatedAt: 9_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'strict',
          confidence: 0.89,
          governingFocus: 'repair the runtime spine before adding more features',
          openingMove: 'state-the-spine',
          answerIntent: 'guide',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          mustDo: ['name the governing seam'],
          mustNotDo: ['split loops'],
          narrative: ['guide through the architecture seam'],
          updatedAt: 9_000,
        } as any,
        initiative: {
          selectedAction: 'speak',
          confidence: 0.74,
          motives: {},
          speakDrive: 0.73,
          silenceDrive: 0.18,
          preferredStyle: 'light-nudge',
          preferredPresence: 'attentive',
          why: 'The runtime line is coherent enough to surface now.',
          shouldSurface: true,
          shouldSpeak: true,
        } as any,
        selfGovernor: {
          dominantDrive: 'understand',
          dominantIntentionId: 'intention-1',
          activeIntentions: [
            {
              id: 'intention-1',
              kind: 'understand-host',
              status: 'active',
              drive: 'understand',
              title: 'Keep the runtime coherent',
              summary: 'Prevent perception, dialogue, and control from drifting apart.',
              urgency: 0.81,
              confidence: 0.79,
              patience: 0.66,
              formedAt: 8_600,
              lastUpdatedAt: 9_000,
              expiresAt: 19_000,
            },
          ],
          inhibition: 0.24,
          persistence: 0.75,
          socialRiskTolerance: 0.43,
          revisionReadiness: 0.67,
          narrative: ['govern one line'],
          updatedAt: 9_000,
        } as any,
        inquiryLoop: {
          primaryInquiryId: 'inquiry-1',
          inquiries: [
            {
              id: 'inquiry-1',
              kind: 'problem-localization',
              status: 'open',
              priority: 'high',
              question: 'Which runtime entrypoint should own the architecture spine?',
              whyItMatters: 'The spine must be global rather than local.',
              confidence: 0.77,
              evidenceWanted: ['main chat', 'one-shot', 'subconscious tick'],
              reopenWhen: [],
              openedAt: 8_700,
              lastUpdatedAt: 9_000,
              expiresAt: 19_000,
            },
          ],
          openCount: 1,
          updatedAt: 9_000,
        } as any,
        actionEcology: {
          mode: 'surface-care',
          selectedThreadId: 'thread-runtime-spine',
          readiness: 0.84,
          surfacePressure: 0.79,
          silencePressure: 0.18,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          shouldSurface: true,
          shouldSpeak: true,
          why: 'The runtime seam is specific enough to surface without guessing.',
          updatedAt: 9_000,
        } as any,
        goalStack: {
          leadingAlicizationGoalId: 'goal-1',
          hostGoals: [],
          alicizationGoals: [
            {
              id: 'goal-1',
              owner: 'alicization',
              kind: 'help-host',
              status: 'active',
              label: 'unify the runtime spine',
              confidence: 0.8,
              urgency: 0.84,
              desireWeight: 0.88,
              blockers: [],
              entityIds: [],
              createdAt: 8_700,
              lastUpdatedAt: 9_000,
            },
          ],
          updatedAt: 9_000,
        } as any,
        concerns: [
          {
            id: 'concern-1',
            kind: 'help-fix',
            status: 'active',
            summary: 'The active loops may diverge without one architecture spine.',
            hostGoal: 'resolve-problem',
            tension: 0.74,
            confidence: 0.8,
            careWeight: 0.69,
            createdAt: 8_700,
            lastEvidenceAt: 9_000,
            patienceUntil: 12_000,
          },
        ] as any,
        desireMemory: {
          resurfacingDesireId: 'desire-1',
          activeDesires: [
            {
              id: 'desire-1',
              kind: 'stay-near',
              status: 'active',
              reason: 'Hold the runtime seam until it becomes one life line.',
              strength: 0.71,
              reopenWhen: [],
              createdAt: 8_700,
              lastFeltAt: 9_000,
              expiresAt: 19_000,
            },
          ],
          withheldCount: 0,
          updatedAt: 9_000,
        } as any,
        recallGovernor: {
          mode: 'thread',
          recallSeed: 'runtime spine unification',
          suppressAssociativeRecall: true,
          allowActiveThoughts: true,
          allowRecalledFragments: true,
          carryAsMemory: true,
          rationale: 'Keep recall on the current runtime seam.',
          narrative: ['thread-locked recall'],
          updatedAt: 9_000,
        } as any,
        reflectionLedger: {
          latestEntryId: 'reflection-1',
          entries: [
            {
              id: 'reflection-1',
              summary: 'Alicization needs one stable runtime architecture.',
            },
          ],
          updatedAt: 9_000,
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.66,
          rationaleTags: ['architecture-spine'],
          thoughtText: 'keep every active loop on the same inner runtime line',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 19_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 8_950,
      } as any,
      durabilityPulse: null,
      recentTransition: {
        kind: 'scene-shift',
        summary: 'the runtime focus tightened around one seam',
        fromScenario: 'coding',
        toScenario: 'coding',
        happenedAt: 8_900,
      } as any,
      nextSuggestedProbeMs: 45_000,
    })

    const surface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const architecture = buildAlicizationDigitalLifeArchitecture(surface)
    const block = buildAlicizationDigitalLifeArchitectureSystemBlock(architecture)

    expect(architecture).toEqual(expect.objectContaining({
      version: 'digital-life-architecture-v1',
      operatingMode: 'speaking',
      dominantSystem: 'dialogue',
      supportingSystems: expect.arrayContaining(['mind', 'control']),
      governingFocus: expect.stringContaining('repair the runtime spine'),
    }))
    expect(architecture?.systems.perception.state).toBe('hot')
    expect(architecture?.systems.dialogue.summary).toContain('subject=task-knot')
    expect(architecture?.systems.control.summary).toContain('action=speak')
    expect(architecture?.systems.memory.summary).toContain('goal=unify the runtime spine')
    expect(architecture?.closureAudit?.currentPhase).toContain('Phase 1')
    expect(architecture?.closureAudit?.primaryOpenLoop).toContain('Memory still needs stronger end-to-end closure')
    expect(architecture?.closureAudit?.selfAuthoritySummary).toContain('living thread')
    expect(architecture?.closureAudit?.activeClosurePressures).toEqual(expect.arrayContaining([
      'ecology:surface-care',
      'private-thought:observe',
    ]))
    expect(block).toContain('[ALICIZATION_DIGITAL_LIFE_ARCHITECTURE]')
    expect(block).toContain('operating_mode=speaking')
    expect(block).toContain('dominant_system=dialogue')
    expect(block).toContain('project_state_closure=')
    expect(block).toContain('same_her_self_authority=')
    expect(block).toContain('supporting_systems=')
    expect(block).toContain('- [HOT')
    expect(block).toContain('dialogue')
    expect(block).toContain('perception')
  })

  it('degrades into a sparse but usable architecture when only project-state and continuity-carry lanes survive the runtime surface', () => {
    const architecture = buildAlicizationDigitalLifeArchitecture({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      },
      memory: {
        concerns: [],
        workingMemoryEpisodes: [],
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'same-her-baseline | lower-pressure | same callback seam',
            reasonCodes: ['hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
        personStateProjection: {
          selfContinuityAuthority: {
            authoritySummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      },
    } as any)

    expect(architecture).toEqual(expect.objectContaining({
      version: 'digital-life-architecture-v1',
      dominantSystem: expect.any(String),
      operatingMode: expect.any(String),
    }))
    expect(architecture?.closureAudit?.currentPhase).toContain('Phase 1')
    expect(String(architecture?.closureAudit?.selfAuthoritySummary ?? '')).toContain('Same Phase 1 digital life')
  })
})
