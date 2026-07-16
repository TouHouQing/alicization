import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { applyExecutionCallbackCarryToDigitalLifeRuntimeSurface } from './runtime-execution-callback-carry-reducer'

describe('runtime-execution-callback-carry-reducer', () => {
  it('grounds execution callback carry in the project identity so callback continuity stays same-her instead of utility-notice shaped', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {},
        dialogue: {},
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the compile error thread',
        answerIntent: 'land the callback on the same live line',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: false,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The build finished and the result should come back on the same living thread.',
          threadAnchor: 'the compile error thread',
          carryMode: 'lower-pressure',
          confidence: 0.84,
        },
      } as any,
      now: 1_000,
    })

    expect(resolved?.dialogue.answerCompiler?.openingClaim).toContain('local continuity state')
    expect(resolved?.dialogue.answerCompiler?.openingDirective).toContain('avoid flattening it into a bare utility notification')
    expect(resolved?.dialogue.answerCompiler?.supportingReality).toEqual(expect.arrayContaining([
      expect.stringContaining(`project preflight: ${projectState.preflightSummary}`),
      expect.stringContaining('project identity: Alicization is a local-first digital life project'),
      expect.stringContaining('current phase: Phase 1: Local Digital Life'),
      expect.stringContaining(`project progress: ${projectState.continuityProgressSummary}`),
      expect.stringContaining('phase-one open loop: Memory still needs stronger end-to-end closure'),
    ]))
    expect(resolved?.dialogue.answerCompiler?.supportingReality?.[0]).toContain('project preflight: Alicization is a local-first digital life project')
    expect((resolved?.dialogue.answerCompiler?.supportingReality ?? []).slice(0, 3).join(' | ')).toContain('project identity: Alicization is a local-first digital life project')
    expect((resolved?.dialogue.answerCompiler?.supportingReality ?? []).slice(0, 5).join(' | ')).toContain('The build finished')
    const source = readFileSync(new URL('./runtime-execution-callback-carry-reducer.ts', import.meta.url), 'utf8')
    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
  })

  it('keeps held-autonomy callback return on the same thread with lower-pressure same-her reopening cues', () => {
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'I stay the same her who returns to unresolved work gently.',
              relationshipLine: 'I reopen unfinished lines without crowding the host.',
            },
          },
        },
        dialogue: {},
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the compile error thread',
        answerIntent: 'quietly return to the unresolved compile fix',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: true,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The compile finished and should re-enter the same unfinished line gently.',
          threadAnchor: 'the compile error thread',
          carryMode: 'lower-pressure',
          confidence: 0.88,
        },
      } as any,
      now: 2_000,
    })

    expect(resolved?.dialogue.conversationState?.memoryMode).toBe('dialogue-carry')
    expect(resolved?.dialogue.discourseState?.primaryTurnAnchor).toBe('the compile error thread')
    expect(resolved?.dialogue.answerCompiler?.labelCarryAsMemory).toBe(true)
    expect(resolved?.dialogue.answerCompiler?.openingClaim).toContain('local continuity state')
    expect(resolved?.dialogue.answerCompiler?.openingDirective).toContain('leave room before the next follow-up')
    expect(resolved?.dialogue.answerCompiler?.supportingReality).toEqual(expect.arrayContaining([
      expect.stringContaining('The compile finished and should re-enter the same unfinished line gently.'),
      expect.stringContaining('thread anchor: the compile error thread'),
      expect.stringContaining('execution-callback carry mode: lower-pressure'),
    ]))
    expect(resolved?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
    expect(resolved?.memory.personStateProjection?.selfContinuityAuthority?.authoritySummary).toContain(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
  })

  it('prefers a richer callback same-her awareness line over a thin project preflight shell when rebuilding the conscious frame', () => {
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {},
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'template-residue-shell',
              preflightSummary: 'template-residue-shell',
              companionBriefingLine: 'pre_turn_context_digest',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the compile error thread',
        answerIntent: 'land the callback on the same live line',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: false,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The build finished and the result should come back on the same living thread.',
          threadAnchor: 'the compile error thread',
          carryMode: 'lower-pressure',
          confidence: 0.84,
        },
      } as any,
      now: 1_500,
    })

    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(
      'pre_turn_context_digest',
    )
    expect(String(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? '')).not.toContain(
      'template-residue-shell',
    )
  })

  it('prefers a richer raw runtime-digest same-her awareness summary over a thin conscious-frame reminder shell when callback carry rebuilds project awareness', () => {
    const richerAwarenessLine = 'pre_turn_context_digest'
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {},
        raw: {
          runtimeDigest: {
            projectState: {
              companionHeadlineLine: richerAwarenessLine,
              preDialogueAwarenessSummary: richerAwarenessLine,
              awarenessLine: richerAwarenessLine,
              preDialogueAwarenessLine: richerAwarenessLine,
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'template-residue-shell',
              awarenessLine: 'template-residue-shell',
              preflightSummary: 'template-residue-shell',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the compile error thread',
        answerIntent: 'land the callback on the same live line',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: false,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The build finished and the result should come back on the same living thread.',
          threadAnchor: 'the compile error thread',
          carryMode: 'lower-pressure',
          confidence: 0.84,
        },
      } as any,
      now: 1_550,
    })

    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerAwarenessLine)
    expect(String(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('pre_turn_context_digest')
    expect(String(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(resolved?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine ?? '')).not.toContain(
      'template-residue-shell',
    )
  })

  it('sanitizes callback project timing and embodiment cadence before rebuilding conscious-frame and raw runtime digest state', () => {
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {},
        raw: {
          runtimeDigest: {
            projectState: {
              continuityPreferredTiming: 'rush-right-now',
              preferredBlinkCadence: 'strobe',
              preferredGazeMode: 'stare-hard',
              preferredPauseMode: 'rush-breathless',
              preferredLipsyncMode: 'mouth-overdrive',
              preferredVoiceMode: 'too-intense',
              preferredPacingMode: 'hyper-fast',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              continuityPreferredTiming: 'rush-right-now',
              preferredBlinkCadence: 'strobe',
              preferredGazeMode: 'stare-hard',
              preferredPauseMode: 'rush-breathless',
              preferredLipsyncMode: 'mouth-overdrive',
              preferredVoiceMode: 'too-intense',
              preferredPacingMode: 'hyper-fast',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the callback embodiment seam',
        answerIntent: 'return without corrupting embodied cadence',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: false,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The callback should re-enter the same living body line without importing invalid cadence hints.',
          threadAnchor: 'the callback embodiment seam',
          carryMode: 'lower-pressure',
          confidence: 0.82,
        },
      } as any,
      now: 1_800,
    })

    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredBlinkCadence).toBeNull()
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredGazeMode).toBeNull()
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredPauseMode).toBeNull()
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredLipsyncMode).toBeNull()
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredVoiceMode).toBeNull()
    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.preferredPacingMode).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredBlinkCadence).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredGazeMode).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredPauseMode).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredLipsyncMode).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredVoiceMode).toBeNull()
    expect(resolved?.raw?.runtimeDigest?.projectState?.preferredPacingMode).toBeNull()
  })

  it('preserves project continuity arc stage through execution callback carry so identity-continuity', () => {
    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: {
        memory: {},
        raw: {
          runtimeDigest: {
            projectState: {
              continuityArcStage: 'hold-for-opening',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              continuityArcStage: 'hold-for-opening',
              continuityPreferredTiming: 'next-open-window',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
      } as any,
      governance: {
        focusAnchor: 'the callback reopening seam',
        answerIntent: 'return on the same line before widening outward again',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: false,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The callback landed, but the same-her reopening stage still needs to be held before the next outward move.',
          threadAnchor: 'the callback reopening seam',
          carryMode: 'lower-pressure',
          confidence: 0.87,
        },
      } as any,
      now: 1_900,
    })

    expect(resolved?.dialogue.currentConsciousFrame?.projectState?.continuityArcStage).toBe('hold-for-opening')
    expect(resolved?.raw?.runtimeDigest?.projectState?.continuityArcStage).toBe('hold-for-opening')
  })
})
