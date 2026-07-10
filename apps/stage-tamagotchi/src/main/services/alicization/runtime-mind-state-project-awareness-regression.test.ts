import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createAlicizationMindStateRuntime } from './runtime-mind-state'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('runtime-mind-state project awareness regression', () => {
  it('routes upstream mind project-state consumers through the shared preferred live project-state snapshot before canonical fallback', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const seedMotiveEngineStart = source.indexOf('const seedMotiveEngine = buildMotiveEngine({')
    const seedHabitPolicyStart = source.indexOf('const seedHabitPolicy = buildHabitPolicy({')
    const seedMotiveEngineBlock = seedMotiveEngineStart >= 0 && seedHabitPolicyStart > seedMotiveEngineStart
      ? source.slice(seedMotiveEngineStart, seedHabitPolicyStart)
      : ''

    expect(source).toContain('function resolvePreferredMindProjectStateSnapshot(input: {')
    expect(source).toContain('const previousProjectState = input.previousVisualPresenceState?.currentConsciousFrame?.projectState')
    expect(source).toContain('const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({')
    expect(source).toContain('runtimeProjectState: previousProjectState')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('const nextClosureTarget = compactPromptText(')
    expect(source).toContain('looksLikeThinMindProjectStateNextClosureTarget(projectStateSnapshot.nextClosureTarget)')
    expect(source).toContain('const preferredMindProjectState = resolvePreferredMindProjectStateSnapshot({')
    expect(source).toContain('const mindProjectStatePromptSnapshot = buildMindProjectStatePromptSnapshot({')
    expect(source).toContain('const mindProjectStateRuntimeSnapshot = buildMindProjectStateRuntimeSnapshot({')
    expect(seedMotiveEngineBlock).toContain('const seedMotiveEngine = buildMotiveEngine({')
    expect(seedMotiveEngineBlock).toContain('projectState: mindProjectStatePromptSnapshot')
    expect(source).toContain('projectState: mindProjectStatePromptSnapshot')
    expect(source).toContain('projectState: mindProjectStateRuntimeSnapshot')
    expect(source).toContain('projectStatePreDialogueAwarenessLine: preferredMindProjectState.preDialogueAwarenessLine')
    expect(source).toContain('projectStatePreflightSummary: preferredMindProjectState.preflightSummary')
    expect(source).toContain('projectStateEmotionalClosureCue: preferredMindProjectState.emotionalClosureCue')
    expect(source).toContain('function buildMindProjectStatePromptSnapshot(input: {')
    expect(source).toContain('function buildMindProjectStateRuntimeSnapshot(input: {')
    expect(source).toContain('identity: input.preferredMindProjectState.identity || undefined')
    expect(source).toContain('currentPhase: input.preferredMindProjectState.currentPhase || undefined')
    expect(source).toContain('preDialogueAwarenessLine: input.preferredMindProjectState.preDialogueAwarenessLine || undefined')
    expect(source).toContain('companionHeadlineLine: input.preferredMindProjectState.companionHeadlineLine || undefined')
    expect(source).toContain('latestLandedProgress: input.preferredMindProjectState.latestLandedProgress || undefined')
    expect(source).toContain('emotionalClosureCue: input.preferredMindProjectState.emotionalClosureCue || undefined')
    expect(source).toContain('emotionalClosureSummary: input.preferredMindProjectState.emotionalClosureSummary || undefined')
    expect(source).toContain('primaryOpenLoop: input.preferredMindProjectState.primaryOpenLoop || undefined')
    expect(source).toContain('preferredVoiceMode: input.preferredMindProjectState.snapshot.preferredVoiceMode || undefined')
    expect(source).toContain('preferredPacingMode: input.preferredMindProjectState.snapshot.preferredPacingMode || undefined')
    expect(source).toContain('nextClosureTarget: input.preferredMindProjectState.nextClosureTarget || undefined')
    expect(source).toContain('sameHerSelfLine: input.preferredMindProjectState.sameHerSelfLine || undefined')
    expect(source).toContain('sameHerHoldDetail: input.preferredMindProjectState.sameHerHoldDetail || undefined')
    expect(source).toContain('sameHerDriftRisk: input.preferredMindProjectState.sameHerDriftRisk || undefined')
    expect(source).toContain('projectStatePreferredVoiceMode: preferredMindProjectState.snapshot.preferredVoiceMode')
    expect(source).toContain('projectStatePreferredPacingMode: preferredMindProjectState.snapshot.preferredPacingMode')
    expect(source).toContain('const initiativeBase = buildInitiativeSnapshot({')
    expect(source).toContain('const autonomy = buildAutonomySnapshot({')
  })

  it('recomputes preferred mind pre-dialogue awareness through the shared resolver instead of trusting only a raw preDialogueAwarenessLine field', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({')
    expect(source).toContain('const selectedPreDialogueAwarenessLine = compactPromptText(')
    expect(source).toContain('const preDialogueAwarenessLine = selectedPreDialogueAwarenessLine')
    expect(source).toContain('summary: selectedPreDialogueAwarenessLine,')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('runtimeProjectState: projectStateSnapshot')
    expect(source).toContain('fallbackProjectState: projectStateBrief')
  })

  it('keeps compact thin closure shells out of the mind-state pre-dialogue awareness path by routing prompt awareness through the shared resolver output', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('const selectedPreDialogueAwarenessLine = compactPromptText(')
    expect(source).toContain('const preDialogueAwarenessLine = selectedPreDialogueAwarenessLine')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).toContain('runtimeProjectState: projectStateSnapshot')
    expect(source).toContain('preDialogueAwarenessLine: input.preferredMindProjectState.preDialogueAwarenessLine || undefined')
    expect(source).toContain('function buildMindGovernanceTailAwarePreDialogueAwarenessLine(input: {')
    expect(source).toContain('formatAlicizationProjectStateAwarenessFields({')
    expect(source).toContain('sameHerSelfLine,')
    expect(source).not.toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_SELF_BRIEF]')
    expect(source).not.toContain('`same_her_line=${projectState.sameHerSelfLine ?? \'none\'}`')
  })

  it('does not let fixed same-her template residue become embodiment continuity evidence by string match alone', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')
    const evidenceStart = source.indexOf('function buildMindStateEmbodimentLaneEvidence(')
    const runtimeStart = source.indexOf('export function createAlicizationMindStateRuntime(')
    const evidenceBlock = evidenceStart >= 0 && runtimeStart > evidenceStart
      ? source.slice(evidenceStart, runtimeStart)
      : ''

    expect(evidenceBlock).toContain('const carriesStructuredContinuity')
    expect(evidenceBlock).toContain('const carriesSameHer = carriesStructuredContinuity')
    expect(evidenceBlock).not.toContain('/same-her|same her|same living line|same digital life|continuous her|phase 1 digital life|one lifeform/')
  })

  it('keeps mind-state awareness formatting structured instead of reintroducing companion reminder prose', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildMindGovernanceTailAwarePreDialogueAwarenessLine(input: {')
    expect(source).toContain('identity: string | null')
    expect(source).toContain('currentPhase: string | null')
    expect(source).toContain('latestLandedProgress: string | null')
    expect(source).toContain('sameHerSelfLine: string | null')
    expect(source).toContain('const companionBriefingLine = compactPromptText(projectStateSnapshot.companionBriefingLine, 320) || null')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
    expect(source).not.toContain('Before answering, remember:')
    expect(source).not.toContain('Pre-dialogue same-her strategy before this turn')
  })

  it('does not reintroduce provider-facing project-state self-brief prose for mind-state cognition', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_OWNER_BOUNDARY]')
    expect(source).toContain('[ALICIZATION_SUBJECTIVE_INFERENCE_OWNER_BOUNDARY]')
    expect(source).toContain('short_term_owner=WorkingMemory')
    expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(source).toContain('project_state_policy=withheld_for_turn_semantics_unless_explicitly_requested')
    expect(source).toContain('project_state_policy=withheld_for_subjective_inference_unless_explicitly_requested')
    expect(source).not.toContain('Dialogue-turn semantics must stay inside the same digital life project line')
    expect(source).not.toContain('Subjective inference must stay inside the same digital life project line')
  })

  it('re-expands thin landed-progress, next-closure, same-her, and drift cues through the canonical project-state brief before mind-state prompts are built', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function looksLikeThinMindProjectStateLatestLandedProgress(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateNextClosureTarget(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateSameHerSelfLine(value: unknown)')
    expect(source).toContain('function looksLikeThinMindProjectStateSameHerDriftRisk(value: unknown)')
    expect(source).toContain('looksLikeThinMindProjectStateLatestLandedProgress(projectStateSnapshot.latestLandedProgress)')
    expect(source).toContain('? projectStateBrief.continuityProgressSummary')
    expect(source).toContain('looksLikeThinMindProjectStateNextClosureTarget(projectStateSnapshot.nextClosureTarget)')
    expect(source).toContain('? projectStateBrief.nextClosureTarget')
    expect(source).toContain('looksLikeThinMindProjectStateSameHerSelfLine(projectStateSnapshot.sameHerSelfLine)')
    expect(source).toContain('? projectStateBrief.sameHerSelfLine')
    expect(source).toContain('const emotionalClosureSummary = compactPromptText(projectStateSnapshot.emotionalClosureSummary, 220)')
    expect(source).toContain('const sameHerHoldDetail = compactProjectStatePromptTextFailClosed({')
    expect(source).toContain('raw: rawProjectState?.sameHerHoldDetail')
    expect(source).toContain('looksLikeThinMindProjectStateSameHerDriftRisk(projectStateSnapshot.sameHerDriftRisk)')
    expect(source).toContain('? projectStateBrief.sameHerDriftRisk')
    expect(source).toContain('sanitizeAlicizationProviderFacingText(compacted, maxChars)')
  })

  it('injects scene-specific owner boundaries into mind-state provider prompts so memory owners keep authority', () => {
    const source = readFileSync(new URL('./runtime-mind-state.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildDialogueTurnSemanticsProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_DIALOGUE_TURN_SEMANTICS_OWNER_BOUNDARY]')
    expect(source).toContain('personhood_owner=runtime-self-core')
    expect(source).toContain('short_term_owner=WorkingMemory')
    expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(source).toContain('project_state_policy=withheld_for_turn_semantics_unless_explicitly_requested')
    expect(source).toContain('Do not let turn interpretation collapse into a generic task router')
    expect(source).toContain('buildDialogueTurnSemanticsProjectSelfBriefSystemBlock(),')

    expect(source).toContain('function buildSubjectiveInferenceProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_SUBJECTIVE_INFERENCE_OWNER_BOUNDARY]')
    expect(source).toContain('personhood_owner=runtime-self-core')
    expect(source).toContain('short_term_owner=WorkingMemory')
    expect(source).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(source).toContain('project_state_policy=withheld_for_subjective_inference_unless_explicitly_requested')
    expect(source).toContain('Do not let scene appraisal collapse into generic productivity guessing')
    expect(source).toContain('buildSubjectiveInferenceProjectSelfBriefSystemBlock(),')
  })

  it('re-expands a thin runtime project-state shell into canonical same-her Phase 1 closure cues before mind-state gateway prompts are generated', async () => {
    const gatewayCalls: Array<{
      source: string
      system: string
      user: string
      extraSystemBlocks?: string[]
    }> = []

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState: {
        ...createDefaultVisualPresenceState(50_000),
        updatedAt: 50_000,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Tightening project-awareness continuity through runtime cognition.',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          beganAt: 49_000,
          lastSeenAt: 50_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          source: 'current-grounded-scene',
          confidence: 0.88,
          engagedAt: 49_500,
          lastConfirmedAt: 50_000,
          dwellMs: 500,
        } as any,
        runtimeDigest: {
          projectState: {
            identity: 'same digital life',
            latestLandedProgress: 'landed',
            primaryOpenLoop: 'open closure',
          },
        } as any,
      } as any,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-01T12:00:00+08:00',
          system: {
            cpuUsage: 0.18,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 7,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Reviewing Alicization project-awareness continuity seams.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.2,
            minutesSinceLastUserTurn: 1,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Reviewing Alicization project-awareness continuity seams.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-project-awareness',
            kind: 'problem',
            title: 'Project awareness continuity',
            summary: 'Keep every reply path grounded in the same local digital life.',
            confidence: 0.82,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Which reply-shaping paths still need canonical fallback proof?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async (input) => {
        gatewayCalls.push({
          source: input.source,
          system: input.system,
          user: String(input.user),
          extraSystemBlocks: input.extraSystemBlocks,
        })

        if (input.source === 'dialogue-turn-semantics') {
          return JSON.stringify({
            act: 'ask-help',
            responseNeed: 'answer',
            truthExpectation: 'normal',
            affectiveTone: 'neutral',
            subjectPreference: 'task-knot',
            sharedAttentionDemand: 0.5,
            personaSuppression: 0.1,
            confidence: 0.7,
            summary: 'Keep the reply on the active project-awareness repair seam.',
            reasonTags: ['project-awareness'],
          })
        }

        return JSON.stringify({
          dominantInterpretation: 'The host is tightening project-awareness continuity inside the Phase 1 desktop proving ground.',
          situatedMeaning: 'This scene is about preserving one same-her line before reply shaping widens.',
          selfQuestion: 'Which prompt path still risks thinning the same-her carry?',
          uncertainty: 'Exact uncovered seam is still being verified.',
          hostIntentCandidates: [
            {
              goal: 'resolve-problem',
              confidence: 0.82,
              why: 'The visible editor and current thread both point at runtime continuity work.',
            },
          ],
          relationshipNeedCandidates: [
            {
              need: 'guidance',
              confidence: 0.58,
              why: 'The host is steering the repair line and expects grounded follow-through.',
            },
          ],
          confidence: 0.72,
          notes: ['same-her-project-awareness'],
        })
      },
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    await runtime.buildDigitalLifeMindState({
      cardId: 'card-project-awareness',
      now: 60_000,
      context: {
        localTime: '2026-06-01T12:00:00+08:00',
        system: {
          cpuUsage: 0.18,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Reviewing Alicization project-awareness continuity seams.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.2,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      userText: 'Before every reply path, make sure Alicization already knows what the project is, what Phase 1 landed, and what is still open.',
      recentMessages: [
        {
          role: 'assistant',
          content: 'I am keeping the same active repair line in view.',
        } as any,
      ],
      previousVisualPresenceState: {
        ...createDefaultVisualPresenceState(50_000),
        updatedAt: 50_000,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Tightening project-awareness continuity through runtime cognition.',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          beganAt: 49_000,
          lastSeenAt: 50_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        } as any,
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
          source: 'current-grounded-scene',
          confidence: 0.88,
          engagedAt: 49_500,
          lastConfirmedAt: 50_000,
          dwellMs: 500,
        } as any,
        runtimeDigest: {
          projectState: {
            identity: 'same digital life',
            latestLandedProgress: 'landed',
            primaryOpenLoop: 'open closure',
          },
        } as any,
      } as any,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Reviewing Alicization project-awareness continuity seams.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 59_000,
          lastSeenAt: 60_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 7,
          },
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 7,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 59_500,
        lastConfirmedAt: 60_000,
        dwellMs: 500,
      } as any,
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 7,
      } as any,
      cognitionMode: 'interactive',
    })

    const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === 'dialogue-turn-semantics')
    const subjectiveInferenceCall = gatewayCalls.find(call => call.source === 'subjective-inference')

    expect(dialogueTurnSemanticsCall).toBeTruthy()
    expect(subjectiveInferenceCall).toBeTruthy()

    for (const call of [dialogueTurnSemanticsCall, subjectiveInferenceCall]) {
      const projectStateJson = String(call?.user).match(/"projectState":(\{.*?\})/s)?.[1]
      expect(projectStateJson).toBeTruthy()

      const projectState = JSON.parse(projectStateJson ?? '{}') as Record<string, string>
      const projectStateText = JSON.stringify(projectState)
      const selfBrief = call?.extraSystemBlocks?.find(block => block.includes('OWNER_BOUNDARY')) ?? ''

      expect(projectState.identity).toContain('local_desktop_life_loop')
      expect(projectState.currentPhase).toContain('local_desktop_life_loop')
      expect(projectState.preDialogueAwarenessLine).toContain('identity=')
      expect(projectState.preDialogueAwarenessLine).toContain('phase=local_desktop_life_loop')
      expect(projectState.preDialogueAwarenessLine).toContain('visibility=internal-structured')
      expect(projectState.latestLandedProgress.length).toBeGreaterThan(80)
      expect(projectState.latestLandedProgress).not.toContain('landed progress')
      expect(projectState.latestLandedProgress).not.toContain('project shell')
      expect(projectState.primaryOpenLoop).not.toBe('open closure')
      expect(projectState.primaryOpenLoop.toLowerCase()).toContain('memory_dialogue_embodiment_closure')
      expect(projectState.nextClosureTarget.length).toBeGreaterThan(20)

      expect(projectStateText).not.toMatch(/Before answering|Same Phase 1 digital life|same living line|same-her hold:/i)
      expect(selfBrief).toContain('OWNER_BOUNDARY')
      expect(selfBrief).toContain('short_term_owner=WorkingMemory')
      expect(selfBrief).toContain('long_term_recall_owner=LongTermMemoryRecall')
      expect(selfBrief).not.toMatch(/Before answering|same_her_line=|same digital life project line|same Phase 1 proving ground/i)
    }
  })

  it('keeps richer project-aware companion briefing alive in mind-state self-briefs when a stronger embodiment headline would otherwise thin the pre-dialogue carry', async () => {
    const gatewayCalls: Array<{
      source: string
      system: string
      user: string
      extraSystemBlocks?: string[]
    }> = []

    const richerProjectBriefing
      = 'Before answering, remember: Alicization is still the same local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is callback continuity now survives across reply shaping. The still-open closure is voice, face, and motion still needing one same-her line before this turn widens outward.'
    const strongerEmbodimentHeadline
      = 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
    const previousVisualPresenceState = {
      ...createDefaultVisualPresenceState(70_000),
      updatedAt: 70_000,
      currentScene: {
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
        summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 69_000,
        lastSeenAt: 70_000,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
        source: 'current-grounded-scene',
        confidence: 0.88,
        engagedAt: 69_500,
        lastConfirmedAt: 70_000,
        dwellMs: 500,
      } as any,
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          companionHeadlineLine: strongerEmbodimentHeadline,
          companionBriefingLine: richerProjectBriefing,
          preDialogueAwarenessLine: strongerEmbodimentHeadline,
          awarenessLine: strongerEmbodimentHeadline,
          latestLandedProgress: 'Callback continuity now survives across reply shaping.',
          primaryOpenLoop: 'Voice, face, and motion still need one same-her line before this turn widens outward.',
          nextClosureTarget: 'Keep the project-aware carry explicit before the next host-visible answer opens outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the self-brief falls back to embodiment-only awareness, project identity, landed progress, and the still-open life loop disappear before the turn is interpreted.',
        },
      } as any,
    } as any

    const runtime = createAlicizationMindStateRuntime({
      previousVisualPresenceState,
      buildDialogueIngressContext: () => ({
        context: {
          localTime: '2026-06-07T12:00:00+08:00',
          system: {
            cpuUsage: 0.16,
            idleSeconds: 0,
            inputActivity: 'active',
            fullscreenLikely: false,
            foregroundWindow: {
              appName: 'Visual Studio Code',
              processName: 'Code',
              title: 'runtime-mind-state.ts',
              pid: 9,
            },
            degradedSignals: [],
          },
          workload: {
            kind: 'coding',
            confidence: 0.9,
            source: 'screen-semantic-summary',
            matchedLabels: ['coding'],
          },
          content: {
            kind: 'diff',
            confidence: 0.86,
            source: 'screen-semantic-summary',
            summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
            matchedLabels: ['diff'],
          },
          relationship: {
            hostAttitude: 'focused',
            fatigue: 0.18,
            minutesSinceLastUserTurn: 1,
            reminderBacklog: 0,
            lateNightActiveMinutes: 0,
            recentProactiveOutcomes: [],
          },
        } as any,
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
        } as any,
        worldModel: {
          activeThread: {
            id: 'thread-mind-project-briefing',
            kind: 'problem',
            title: 'Mind self-brief project carry',
            summary: 'Keep project identity, landed progress, and open closure explicit before interpretation.',
            confidence: 0.84,
            unresolved: true,
            source: 'dialogue-ingress',
          },
          lingeringThreads: [],
          focusTarget: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            openQuestions: ['Does the self-brief still remember project identity and open closure before interpretation?'],
            staleRisks: [],
          },
          hostState: {
            availability: 'focused',
          },
        } as any,
      }),
      generateMainGatewayText: async (input) => {
        gatewayCalls.push({
          source: input.source,
          system: input.system,
          user: String(input.user),
          extraSystemBlocks: input.extraSystemBlocks,
        })

        if (input.source === 'dialogue-turn-semantics') {
          return JSON.stringify({
            act: 'ask-help',
            responseNeed: 'answer',
            truthExpectation: 'normal',
            affectiveTone: 'neutral',
            subjectPreference: 'task-knot',
            sharedAttentionDemand: 0.52,
            personaSuppression: 0.1,
            confidence: 0.74,
            summary: 'Keep the turn on the richer project-aware same-her line.',
            reasonTags: ['project-awareness'],
          })
        }

        return JSON.stringify({
          dominantInterpretation: 'The host is checking whether project-aware same-her carry survives before interpretation.',
          situatedMeaning: 'This scene is about keeping project identity, landed progress, and open closure explicit before reply shaping widens.',
          selfQuestion: 'Did the richer project-aware carry survive into the self-brief?',
          uncertainty: 'Need to verify the self-brief does not thin back to embodiment-only carry.',
          hostIntentCandidates: [
            {
              goal: 'resolve-problem',
              confidence: 0.83,
              why: 'The host is validating prompt-time project awareness continuity.',
            },
          ],
          relationshipNeedCandidates: [
            {
              need: 'guidance',
              confidence: 0.56,
              why: 'The host expects grounded follow-through on the same digital life line.',
            },
          ],
          confidence: 0.73,
          notes: ['richer-project-aware-self-brief'],
        })
      },
      buildMainGatewayAgentTurnId: (...segments) => segments.join(':'),
      readLatestAssistantMessageText: messages => messages.filter(message => message.role === 'assistant').map(message => String(message.content ?? '')).at(-1) ?? '',
      readTransportContentAsText: content => typeof content === 'string' ? content : JSON.stringify(content),
      retrieveMemoryFacts: async () => [],
      listRelationshipOutcomes: async () => [],
      listPersonaReinforcementEvents: async () => [],
      listMemoryReflections: async () => [],
      listMemoryConsolidations: async () => [],
      getPersonStateEvolutionSummary: async () => null,
      readMindHead: async () => null,
    })

    await runtime.buildDigitalLifeMindState({
      cardId: 'card-mind-project-briefing',
      now: 80_000,
      context: {
        localTime: '2026-06-07T12:00:00+08:00',
        system: {
          cpuUsage: 0.16,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
          degradedSignals: [],
        },
        workload: {
          kind: 'coding',
          confidence: 0.9,
          source: 'screen-semantic-summary',
          matchedLabels: ['coding'],
        },
        content: {
          kind: 'diff',
          confidence: 0.86,
          source: 'screen-semantic-summary',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
          matchedLabels: ['diff'],
        },
        relationship: {
          hostAttitude: 'focused',
          fatigue: 0.18,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
      } as any,
      userText: 'Before every reply path, make sure Alicization already knows what the project is, what Phase 1 landed, and what is still open.',
      recentMessages: [
        {
          role: 'assistant',
          content: '我还在守住同一个数字生命主线。',
        } as any,
      ],
      previousVisualPresenceState,
      visualHeartbeat: {
        watchMode: 'symbiotic-vision',
        scene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
          summary: 'Verifying that project-aware self-briefing stays richer than embodiment-only carry.',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 79_000,
          lastSeenAt: 80_000,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'runtime-mind-state.ts',
            pid: 9,
          },
        },
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
      } as any,
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime-mind-state.ts',
          pid: 9,
        },
        source: 'current-grounded-scene',
        confidence: 0.9,
        engagedAt: 79_500,
        lastConfirmedAt: 80_000,
        dwellMs: 500,
      } as any,
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-mind-state.ts',
        pid: 9,
      } as any,
      cognitionMode: 'interactive',
    })

    const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === 'dialogue-turn-semantics')
    const subjectiveInferenceCall = gatewayCalls.find(call => call.source === 'subjective-inference')

    expect(dialogueTurnSemanticsCall).toBeTruthy()
    expect(subjectiveInferenceCall).toBeTruthy()

    for (const call of [dialogueTurnSemanticsCall, subjectiveInferenceCall]) {
      const projectStateJson = String(call?.user).match(/"projectState":(\{.*?\})/s)?.[1]
      expect(projectStateJson).toBeTruthy()

      const projectState = JSON.parse(projectStateJson ?? '{}') as Record<string, string>
      const selfBrief = call?.extraSystemBlocks?.find(block => block.includes('OWNER_BOUNDARY')) ?? ''

      expect(projectState.preDialogueAwarenessLine).toContain('identity=local_desktop_life_loop')
      expect(projectState.preDialogueAwarenessLine).toContain('phase=local_desktop_life_loop')
      expect(projectState.preDialogueAwarenessLine).toContain('visibility=internal-structured')
      expect(projectState.preDialogueAwarenessLine).toContain('Callback continuity now survives across reply shaping')
      expect(projectState.preDialogueAwarenessLine).toContain('project-aware carry')
      expect(projectState.preDialogueAwarenessLine).not.toBe(strongerEmbodimentHeadline)
      expect(projectState.preDialogueAwarenessLine).not.toMatch(/Before answering|Same Phase 1 digital life|same-her|same living line/i)

      expect(selfBrief).toContain('OWNER_BOUNDARY')
      expect(selfBrief).toContain('short_term_owner=WorkingMemory')
      expect(selfBrief).toContain('long_term_recall_owner=LongTermMemoryRecall')
      expect(selfBrief).not.toContain(`pre_dialogue_awareness=${strongerEmbodimentHeadline}`)
      expect(selfBrief).not.toMatch(/Before answering|Same Phase 1 digital life|same-her|same living line/i)
    }
  })
})
