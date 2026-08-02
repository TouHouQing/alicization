import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'

import { describe, expect, it } from 'vitest'

import {
  resolvePreferredRuntimeSurface,
  resolveRuntimeSurfaceContinuityEvidenceScore,
} from './runtime-surface-continuity-selection'

type RuntimeSurfaceContinuitySelectionTestShape = RuntimeSurfaceContinuityEvidenceShape & {
  dialogue?: RuntimeSurfaceContinuityEvidenceShape['dialogue'] & {
    answerPlanner?: {
      answerIntent?: string | null
    } | null
  }
}

describe('runtime surface continuity selection', () => {
  it('scores typed source presence without inspecting prose contents', () => {
    const surface: RuntimeSurfaceContinuitySelectionTestShape = {
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-source'],
        },
      },
      memory: {
        affectiveResidue: {
          dominantResidueKind: 'afterglow',
        },
        personStateProjection: {
          selfContinuityAuthority: {
            authoritySummary: 'neutral authority',
            inwardLine: 'neutral inward line',
            sourceTags: ['memory-source'],
          },
        },
      },
    }

    expect(resolveRuntimeSurfaceContinuityEvidenceScore(surface)).toBe(6)
  })

  it('prefers a fresher surface when structured evidence is otherwise equal', () => {
    const olderSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 120 },
    }
    const fresherSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface: olderSurface,
      preparedRuntimeSurface: fresherSurface,
    })).toBe(fresherSurface)
  })

  it('uses structured source completeness to break equal-timestamp ties', () => {
    const incompleteSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
    }
    const sourcedSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-source'],
        },
      },
      memory: {
        personStateProjection: {
          selfContinuityAuthority: {
            sourceTags: ['memory-source'],
          },
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface: incompleteSurface,
      preparedRuntimeSurface: sourcedSurface,
    })).toBe(sourcedSurface)
  })

  it('allows an explicit caller-owned structured score to break otherwise equal ties', () => {
    const spineRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
    }
    const preparedRuntimeSurface: RuntimeSurfaceContinuitySelectionTestShape = {
      perception: { updatedAt: 132 },
      dialogue: {
        answerPlanner: {
          answerIntent: 'provider-derived',
        },
      },
    }

    expect(resolvePreferredRuntimeSurface({
      spineRuntimeSurface,
      preparedRuntimeSurface,
      extraEvidenceScore: surface => surface?.dialogue?.answerPlanner?.answerIntent ? 1 : 0,
    })).toBe(preparedRuntimeSurface)
  })
})
