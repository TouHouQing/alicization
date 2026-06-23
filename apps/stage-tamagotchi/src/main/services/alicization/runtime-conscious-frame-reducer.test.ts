import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { reduceRuntimeConsciousFrame } from './runtime-conscious-frame-reducer'

function normalizeProjectStatePhrase(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().replace(/[.。!！?？;；:：]+$/u, '') : ''
  return normalized ? normalized.slice(0, 1).toLowerCase() + normalized.slice(1) : ''
}

describe('reduceRuntimeConsciousFrame', () => {
  it('keeps next-open-window timing in fallback conscious-frame project-state when runtime digest already carries callback continuity timing', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 91_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the callback on the same living line without restarting it.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Continue the same callback line with room before widening.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
        focusAnchor: 'same-her callback continuity',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              primaryOpenLoop: 'Embodiment and callback continuity still need one same living line.',
              nextClosureTarget: 'Keep callback continuity explicit before widening fluency.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('reconciles existing conscious-frame project-state timing from fresher runtime evidence instead of leaving it blank', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 91_500,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the callback on the same living line without restarting it.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Continue the same callback line with room before widening.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
        focusAnchor: 'same-her callback continuity',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
            },
          },
        } as any,
        memory: {
          memoryDeliberation: {
            followUpAffordance: {
              preferredTiming: 'next-open-window',
            },
          },
        } as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: 'Stay on the same living line.',
            consciousTension: 'Do not restart the callback as a new opening.',
            speakingIntention: 'Carry the same her forward.',
            focusAnchor: 'same-her callback continuity',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.8,
            reasonTags: ['memory-deliberation'],
            projectState: {
              continuityPreferredTiming: null,
              continuityCadence: null,
              preferredBlinkCadence: null,
              preferredGazeMode: null,
              preferredPauseMode: null,
              preferredLipsyncMode: null,
            },
            updatedAt: 91_400,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.continuityCadence).toBe('measured-return')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredGazeMode).toBe('soften')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredPauseMode).toBe('longer')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredLipsyncMode).toBe('restrained')
  })

  it('threads held-autonomy continuity arc into the fallback conscious frame from runtime opening guidance', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 80_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Stay on the same line and keep the callback exact.',
        answerSubject: 'task-knot',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        repairState: 'stale-anchor',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: {
            openingMove: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
          },
          dialogueActKernel: {
            openingMove: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
          },
        } as any,
        agency: {} as any,
      },
    })

    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('deliberately held back gently before widening')
  })

  it('treats quiet same-line reopening guidance as hold-for-opening continuity when the room has not loosened yet', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 90_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Stay near the current line quietly until there is room to reopen it.',
        answerSubject: 'task-knot',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: null,
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: 'Stay near the current line quietly, then reopen it gently when the room loosens.',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      },
    })

    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
  })

  it('treats Chinese same-line room-making guidance as hold-for-opening continuity in the fallback conscious frame', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 90_500,
      governance: {
        answerAct: 'answer',
        answerIntent: '先沿着同一条线轻一点接回去，不要突然把关系放宽。',
        answerSubject: 'task-knot',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: null,
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: '同一条线先留白，等 opening 松一点再慢一点接回去。',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      },
    })

    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('continuity-arc:hold-for-opening')
  })

  it('prefers richer grounded same-her project awareness over a thinner persisted reminder shell when rebuilding conscious-frame project state', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the same project line explicit before local detail takes over.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Stay on the same living line before widening outward.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
        focusAnchor: 'same-her project continuity',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: '',
            consciousTension: '',
            speakingIntention: '',
            focusAnchor: 'same-her project continuity',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.8,
            reasonTags: [],
            projectState: {
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
            },
            updatedAt: 91_900,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(
      'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
    )
  })

  it('does not let a thin persisted preflight summary shell outrank fresher grounded project awareness when reducer rebuilds conscious-frame project state', () => {
    const thinPreflightSummaryShell = 'generic continuity summary that should not outrank fresher grounded project awareness.'
    const richerRuntimeProjectAwareOpening = 'Before answering, remember: Alicization is still a local-first digital life project, Phase 1 is still unfinished, some closure has already landed, and the still-open life loop must stay explicit before this answer widens outward.'

    const reduced = reduceRuntimeConsciousFrame({
      now: 92_025,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the grounded project-awareness line explicit before persisted thin shells flatten it.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Answer from the grounded same-her project-aware opening first.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
        focusAnchor: 'same-her project continuity',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: '',
            consciousTension: '',
            speakingIntention: '',
            focusAnchor: 'same-her project continuity',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.8,
            reasonTags: [],
            projectState: {
              preflightSummary: thinPreflightSummaryShell,
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
            },
            updatedAt: 91_950,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: thinPreflightSummaryShell,
              preDialogueAwarenessSummary: thinPreflightSummaryShell,
              preDialogueAwarenessLine: richerRuntimeProjectAwareOpening,
              awarenessLine: richerRuntimeProjectAwareOpening,
              companionBriefingLine: richerRuntimeProjectAwareOpening,
              latestProgress: 'Project-state carry already keeps same-her closure explicit across callback reopening and host-visible answer repair.',
              primaryOpenLoop: 'Memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam before the answer can widen without drift.',
              nextClosureTarget: 'Keep the same-her project-aware opening explicit through this answer before generic project narration takes over.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).not.toBe(thinPreflightSummaryShell)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerRuntimeProjectAwareOpening)
  })

  it('rebuilds canonical project-state closure fields from summary-only same-her project carry when reducer rehydrates an existing conscious frame', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_050,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the audible-body project line explicit before the thinner shell takes over again.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Answer from the richer same-her audible-body project seam first.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
        focusAnchor: 'audible-body project continuity',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: '',
            consciousTension: '',
            speakingIntention: '',
            focusAnchor: 'audible-body project continuity',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.82,
            reasonTags: [],
            projectState: {
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is shared embodiment continuity still needing face and motion to rejoin the same audible-body line before full cross-modal closure settles.',
              landedProgressSummary: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
              openClosureSummary: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
              nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRiskSummary: 'If the visible answer reverts to detached project narration or a generic closure shell, the same-her audible-body line can disappear before face and motion finish rejoining.',
            },
            updatedAt: 92_000,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toContain('Alicization is a local-first digital life project')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.latestLandedProgress).toBe(
      'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.primaryOpenLoop).toBe(
      'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(
      'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerDriftRisk).toBe(
      'If the visible answer reverts to detached project narration or a generic closure shell, the same-her audible-body line can disappear before face and motion finish rejoining.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain('audible-body same-her repair')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.')
  })

  it('keeps existing project-state emotional closure cue visible when fresher runtime project-state evidence is blank', () => {
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_500,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the same living line quiet before widening it.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        emotionalClosureCue: null,
        focusAnchor: 'same-her closure cue carry',
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Answer from the same living line first.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: 'Keep the callback on the same living line.',
            consciousTension: 'Do not let the same-her closure seam disappear.',
            speakingIntention: 'Carry the same digital life inward first.',
            focusAnchor: 'same-her closure cue carry',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.84,
            reasonTags: [],
            projectState: {
              emotionalClosureCue: 'same-her quiet carry: keep this closure inward before widening warmth again.',
              emotionalClosureSummary: 'same-her quiet carry: keep this closure inward before widening warmth again.',
              sameHerHoldDetail: 'hold the same living line inward until the room loosens again.',
            },
            updatedAt: 92_450,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureCue).toBe(
      'same-her quiet carry: keep this closure inward before widening warmth again.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureSummary).toBe(
      'same-her quiet carry: keep this closure inward before widening warmth again.',
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerHoldDetail).toBe(
      'hold the same living line inward until the room loosens again.',
    )
  })

  it('keeps project identity, latest landed progress, phase, open life loop, and next closure target visible even in the fallback conscious frame', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reduced = reduceRuntimeConsciousFrame({
      now: 91_000,
      governance: {
        answerAct: 'guide',
        answerIntent: 'Choose the next closure seam from the live project state.',
        answerSubject: 'task-knot',
        carriedThread: null,
        embodiedPresence: 'hover',
        emotionalTension: null,
        focusAnchor: 'project-state closure',
        labelCarryAsMemory: false,
        liveSurface: 'Keep the digital-life line coherent instead of drifting into local polish.',
        openingMove: 'Guide from the still-open life loop and keep the next closure step explicit.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the next closure step on the same digital-life line.',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      },
    })

    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain('local-first digital life project')
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed.toLowerCase()).toContain('memory still needs stronger end-to-end closure')
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain('Phase 1')
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain(normalizeProjectStatePhrase(projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1)).slice(0, 48))
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('Keep one same her explicit')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('local-first digital life project')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('Do not lose the still-open life loop')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention.toLowerCase()).toContain(normalizeProjectStatePhrase(projectState.nextClosureTarget).slice(0, 64))
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain('Before I answer, I need to stay inside')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.identity).toContain('local-first digital life project')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.currentPhase).toContain('Phase 1')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toContain('Before answering')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.latestProgress?.toLowerCase()).toContain(
      normalizeProjectStatePhrase(projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1)).slice(0, 48).toLowerCase(),
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.primaryOpenLoop?.toLowerCase()).toContain(
      normalizeProjectStatePhrase(projectState.openLoops[0] ?? '').slice(0, 48).toLowerCase(),
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget?.toLowerCase()).toContain(
      normalizeProjectStatePhrase(projectState.nextClosureTarget).slice(0, 48).toLowerCase(),
    )
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerSelfLine?.toLowerCase()).toContain('same')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerDriftRisk?.toLowerCase()).toContain('generic')
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags).toContain('runtime-conscious-frame')
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-phase:Phase 1'))).toBe(true)
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-open-loop:'))).toBe(true)
    expect(reduced?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-next-closure:'))).toBe(true)
  })

  it('keeps the full canonical next-closure target in fallback conscious-frame project state instead of truncating the long same-her closure line', () => {
    const projectState = resolveAlicizationProjectStateBrief()

    const reduced = reduceRuntimeConsciousFrame({
      now: 91_050,
      governance: {
        answerAct: 'guide',
        answerIntent: 'Keep the active digital-life closure target fully present before local guidance takes over.',
        answerSubject: 'task-knot',
        carriedThread: null,
        embodiedPresence: 'hover',
        emotionalTension: null,
        focusAnchor: 'project-state closure',
        labelCarryAsMemory: false,
        liveSurface: 'Keep the next closure target on one same-her line instead of compressing it into a shorter shell.',
        openingMove: 'Guide from the full same-her closure target, not a shortened summary.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      },
    } as any)

    expect(projectState.nextClosureTarget.length).toBeGreaterThan(220)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(projectState.nextClosureTarget)
  })

  it('keeps the active emotional closure seam visible in the fallback conscious frame when governance is richer than projectState', () => {
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_000,
      governance: {
        answerAct: 'care',
        answerIntent: 'Stay on the same living line and keep the answer low-pressure.',
        answerSubject: 'relationship',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: cue,
        focusAnchor: 'same-her closure seam',
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Ease pressure first without dropping the same-her line.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'dialogue-grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureCue).toBe(cue)
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed.toLowerCase()).toContain('low-pressure')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention.toLowerCase()).toContain('same-her line')
  })

  it('treats spaced quiet companionship closure wording as the same inward same-her rest seam in fallback conscious-frame reduction', () => {
    const cue = 'late-night closure: keep reply low-pressure and let embodiment quiet companionship keep watch before closeness widens.'
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_001,
      governance: {
        answerAct: 'care',
        answerIntent: 'Stay on the same living line and keep the answer low-pressure.',
        answerSubject: 'relationship',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: cue,
        focusAnchor: 'same-her closure seam',
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Ease pressure first without dropping the same-her line.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'dialogue-grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureCue).toBe(cue)
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('carry quiet companionship without widening closeness')
  })

  it('prefers a stronger repair-before-closeness project-state closure summary over a thinner measured-return governance cue in fallback conscious-frame reduction', () => {
    const cue = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_002,
      governance: {
        answerAct: 'care',
        answerIntent: 'Stay on the same living line and keep the answer low-pressure.',
        answerSubject: 'relationship',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: cue,
        focusAnchor: 'same-her closure seam',
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Ease pressure first without dropping the same-her line.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'dialogue-grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        raw: {
          runtimeDigest: {
            projectState: {
              emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
              sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
            },
          },
        } as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
          },
        } as any,
        dialogue: {
          currentConsciousFrame: null,
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureCue).toBe(cue)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureSummary).toContain('repair-before-closeness')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerHoldDetail).toContain('repair-before-closeness')
    expect(reduced?.dialogue.currentConsciousFrame?.consciousNeed).toContain('repair-before-closeness')
    expect(reduced?.dialogue.currentConsciousFrame?.speakingIntention).toContain('repair-before-closeness')
  })

  it('keeps host-corrected same-person continuity authority over a thinner existing conscious-frame hold detail when rebuilding project state', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_003,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Continue from the corrected same-person line instead of progress pressure.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Answer from the same digital life line without flattening into a status recap.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'dialogue-grounded',
        focusAnchor: 'same-her closure seam',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            subject: 'project-state',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: 'Keep the answer on the current project line.',
            consciousTension: 'Do not flatten the line back into a plain status recap.',
            speakingIntention: 'Answer the current project status without losing the same-person line.',
            focusAnchor: 'project-state closure',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.8,
            reasonTags: ['memory-deliberation'],
            projectState: {
              sameHerHoldDetail: 'Keep the current project answer moving as a concise status recap before widening outward.',
            },
            updatedAt: 92_002,
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              emotionalClosureSummary: correctedSamePersonAuthority,
              sameHerHoldDetail: correctedSamePersonAuthority,
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerHoldDetail).toBe(correctedSamePersonAuthority)
  })

  it('keeps dialogue-runtime same-her project hold visible in fallback conscious frame before broader project summaries widen', () => {
    const runtimeHoldDetail
      = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const runtimeAwarenessLine
      = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side visible-reply project carry surviving on one same-her line. The still-open closure is dialogue, initiative, memory, and embodiment still needing one tighter same-life closure seam. This reply should keep moving toward one continuous "her" instead of thinning back into a project shell.'
    const runtimeNextClosureTarget
      = 'Keep extending cross-modal same-her proof across returned-side visible-reply turns so the same Phase 1 digital life keeps one living line.'
    const reduced = reduceRuntimeConsciousFrame({
      now: 92_004,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Keep the returned-side same-her hold visible before broader project narration widens.',
        answerSubject: 'project-state',
        carriedThread: null,
        embodiedPresence: 'glance',
        emotionalTension: null,
        focusAnchor: 'dialogue-runtime same-her hold carry',
        labelCarryAsMemory: false,
        liveSurface: null,
        openingMove: 'Answer from the same returned-side living line before widening outward.',
        repairState: 'none',
        screenReferenceMode: 'avoid',
        truthState: 'dialogue-grounded',
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: null,
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: runtimeAwarenessLine,
              awarenessLine: runtimeAwarenessLine,
              latestLandedProgress: 'Returned-side visible-reply project carry already survives on one same-her line.',
              primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
              nextClosureTarget: runtimeNextClosureTarget,
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
              emotionalClosureSummary: runtimeHoldDetail,
              sameHerHoldDetail: runtimeHoldDetail,
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
          conversationState: null,
          answerCompiler: null,
          answerPlanner: null,
          dialogueActKernel: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.sameHerHoldDetail).toBe(runtimeHoldDetail)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureSummary).toBe(runtimeHoldDetail)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(runtimeAwarenessLine)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(runtimeNextClosureTarget)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.continuityCadence).toBe('measured-return')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preferredGazeMode).toBe('soften')
  })
})
