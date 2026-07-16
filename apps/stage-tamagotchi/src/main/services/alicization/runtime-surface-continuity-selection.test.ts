import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'

import { describe, expect, it } from 'vitest'

import {
  resolvePreferredRuntimeSurface,
  resolveRuntimeSurfaceContinuityEvidenceScore,

} from './runtime-surface-continuity-selection'

type RuntimeSurfaceContinuitySelectionTestShape = RuntimeSurfaceContinuityEvidenceShape & {
  dialogue?: RuntimeSurfaceContinuityEvidenceShape['dialogue'] & {
    dialogueEncounter?: {
      subject?: string | null
    } | null
    answerPlanner?: {
      answerIntent?: string | null
    } | null
    replyDeliberation?: {
      speakingFrom?: string | null
    } | null
  }
  raw?: {
    runtimeDigest?: {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        preDialogueAwarenessLine?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        preferredPauseMode?: string | null
        preferredLipsyncMode?: string | null
        preferredVoiceMode?: string | null
        preferredPacingMode?: string | null
      } | null
    } | null
  } | null
}

describe('runtime surface continuity selection', () => {
  it('counts conscious-frame continuity arcs and affective residue as stronger same-her evidence', () => {
    expect(resolveRuntimeSurfaceContinuityEvidenceScore({
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
        },
      },
    })).toBe(7)
  })

  it('prefers the fresher prepared runtime surface when it carries stronger continuity evidence', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('keeps the spine runtime surface when a newer prepared surface is thinner and loses the identity-continuity', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(spineRuntimeSurface)
  })

  it('lets dialogue-shaping evidence break ties when base continuity evidence is otherwise equal', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
        dialogueEncounter: null,
        answerPlanner: null,
        replyDeliberation: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
        dialogueEncounter: {
          subject: 'task-knot',
        },
        answerPlanner: {
          answerIntent: 'hold the same seam before widening',
        },
        replyDeliberation: {
          speakingFrom: 'self-continuity',
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
      extraEvidenceScore: surface => (
        (surface?.dialogue?.dialogueEncounter?.subject ? 1 : 0)
        + (surface?.dialogue?.answerPlanner?.answerIntent ? 1 : 0)
        + (surface?.dialogue?.replyDeliberation?.speakingFrom ? 1 : 0)
      ),
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when identity-continuity', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'stay on the same callback seam and reopen gently without widening closeness too early',
            reasonCodes: ['callback-afterglow-hold', 'hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when person-state continuity guidance already carries the same line and lower-pressure cadence before explicit arc tags are rebuilt', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: {
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure instead of widening it into a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while the same callback line is still being continued.',
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('keeps an older runtime surface when a newer one loses the project-state identity-continuity', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building identity continuity.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            preDialogueAwarenessLine: 'pre_turn_context_digest',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Keep extending cross-modal identity-continuity',
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
      raw: {
        runtimeDigest: {
          projectState: null,
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(spineRuntimeSurface)
  })

  it('treats explicit anti-shell same-her drift risk as stronger continuity evidence than a thinner generic-guidance warning', () => {
    const thinnerCanonicalWarning: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          },
        },
      },
    }
    const richerAntiShellWarning: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerDriftRisk: 'If this reopening flattens into a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of a completed return.',
          },
        },
      },
    }

    expect(resolveRuntimeSurfaceContinuityEvidenceScore(richerAntiShellWarning))
      .toBeGreaterThan(resolveRuntimeSurfaceContinuityEvidenceScore(thinnerCanonicalWarning))
  })

  it('treats lower-pressure voice and slower pacing as stronger continuity evidence than the same project carry without those emotional cadence cues', () => {
    const thinnerCadenceCarry: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
      },
    }
    const richerCadenceCarry: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
            preferredVoiceMode: 'lower-pressure',
            preferredPacingMode: 'slower',
          },
        },
      },
    }

    expect(resolveRuntimeSurfaceContinuityEvidenceScore(richerCadenceCarry))
      .toBeGreaterThan(resolveRuntimeSurfaceContinuityEvidenceScore(thinnerCadenceCarry))
  })

  it('treats longer pause and restrained lipsync as stronger continuity evidence than the same project carry without those embodied cadence cues', () => {
    const thinnerCadenceCarry: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
      },
    }
    const richerCadenceCarry: RuntimeSurfaceContinuitySelectionTestShape = {
      raw: {
        runtimeDigest: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
            preferredPauseMode: 'longer',
            preferredLipsyncMode: 'restrained',
          },
        },
      },
    }

    expect(resolveRuntimeSurfaceContinuityEvidenceScore(richerCadenceCarry))
      .toBeGreaterThan(resolveRuntimeSurfaceContinuityEvidenceScore(thinnerCadenceCarry))
  })

  it('prefers the fresher prepared runtime surface when it keeps a richer anti-shell same-her drift boundary instead of an older thinner canonical shell', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
          projectState: {
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Keep extending cross-modal identity-continuity',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          },
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: [],
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
            sameHerDriftRisk: 'If this reopening flattens into a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of a completed return.',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when inward self-continuity and nearby-soft carry are already explicit even before stronger same-her wording is rebuilt', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'self-continuity stays inward and nearby-soft while the reopen is still being held back.',
            reasonCodes: ['hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
        personStateProjection: {
          openingGuidance: 'Keep the line inward and nearby-soft before widening outward.',
          manifestationCadenceSummary: 'The return should stay nearby-soft and inward while the same line settles.',
          selfContinuityAuthority: {
            authoritySummary: 'self-continuity remains the active line here.',
            inwardLine: 'Keep the self-continuity line inward and nearby-soft for now.',
            sourceTags: ['self-continuity'],
          },
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when inward self-continuity and quiet-companionship carry are already explicit even before stronger same-her wording is rebuilt', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'self-continuity stays inward and quiet-companionship while the reopen is still being held back.',
            reasonCodes: ['hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
        personStateProjection: {
          openingGuidance: 'Keep the line inward and quiet-companionship before widening outward.',
          manifestationCadenceSummary: 'The return should stay quiet-companionship and inward while the same line settles.',
          selfContinuityAuthority: {
            authoritySummary: 'self-continuity remains the active line here.',
            inwardLine: 'Keep the self-continuity line inward and quiet-companionship for now.',
            sourceTags: ['self-continuity'],
          },
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when audible-body carry and resident presence already keep the callback line alive before broader same-her wording is rebuilt', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: [],
          projectState: {
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal closure settles.',
            preDialogueAwarenessLine: 'pre_turn_context_digest',
            continuityPreferredTiming: 'audible-body-carry',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'audible-body-carry',
            summary: 'resident presence should keep the living audio thread audible while face and motion rejoin instead of dropping back to a generic callback shell.',
            reasonCodes: [],
            lanes: ['embodiment'],
          },
        },
        personStateProjection: {
          openingGuidance: 'Keep the living audio thread audible while face and motion rejoin.',
          manifestationCadenceSummary: 'resident presence stays quiet-accompaniment on the audible-body carry while face and motion rejoin.',
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })

  it('prefers a fresher prepared runtime surface when project identity, landed progress, and still-open closure already survive as audit-style summaries before explicit latest/open aliases are rebuilt', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
      },
      memory: {
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
        },
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: null,
      },
      memory: {
        affectiveResidue: null,
        derivedMindStateBundle: null,
        personStateProjection: null,
      },
      raw: {
        runtimeDigest: {
          projectState: {
            identity: 'Alicization 还是本地优先数字生命项目。',
            currentPhase: 'Phase 1: Local Digital Life',
            landedProgressSummary: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
            openClosureSummary: '主动性、具身和对话闭环还没有真正收住。',
          },
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
    })).toBe(preparedRuntimeSurface)
  })
})
