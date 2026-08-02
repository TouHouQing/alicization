import { describe, expect, it } from 'vitest'

import {
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationEmbodimentClosureReminder,
  describeAlicizationProjectClosureBriefing,
  describeAlicizationProjectNextClosure,
} from './alicization-embodiment-closure'
import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'

function expectNoFixedTemplateResidue(value: unknown) {
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(value ?? ''))).toBe(false)
}

function expectNaturalEmbodimentClosureFacts(
  value: string,
  expected: {
    lane: string
    status?: 'partial' | 'closed'
    missingLanes?: string
    evidence?: string
  },
) {
  const status = expected.status ?? 'partial'
  const lanes = expected.lane.replace(/-only$/u, '').split('+').join(', ')

  expect(value).toContain(`Active embodiment lanes: ${lanes}.`)
  expect(value).toContain(`Status: ${status}.`)
  if (expected.missingLanes)
    expect(value).toContain(`Pending lanes: ${expected.missingLanes.split('+').join(', ')}.`)
  if (expected.evidence)
    expect(value).toContain(`Evidence: ${expected.evidence.split('+').join(', ')}.`)
  expect(value).not.toContain('continuity=embodiment')
  expect(value).not.toContain('pending_rejoin=')
  expect(value).not.toContain('visibility=')
  expectNoFixedTemplateResidue(value)
}

describe('alicization embodiment closure', () => {
  it('returns natural reminder and headline facts from lane-shrinkage evidence', () => {
    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=lipsync | pending_lanes=body+face+motion+voice',
        currentBodyState: null,
      }),
      {
        lane: 'lipsync-only',
        missingLanes: 'body+face+motion+voice',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: null,
        currentBodyState: 'embodiment_lanes=face+motion | pending_lanes=body+lipsync+voice',
      }),
      {
        lane: 'face+motion-only',
        missingLanes: 'body+lipsync+voice',
      },
    )
  })

  it('keeps voice and audible-body lanes as natural embodiment facts', () => {
    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=voice | pending_lanes=body+face+motion+lipsync',
        currentBodyState: null,
      }),
      {
        lane: 'voice-only',
        missingLanes: 'body+face+motion+lipsync',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=body+voice | pending_lanes=face+motion+lipsync',
        currentBodyState: 'body and voice are aligned while lipsync, face, and motion still need to catch up.',
      }),
      {
        lane: 'body+voice-only',
        missingLanes: 'face+motion+lipsync',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=body+lipsync+voice | pending_lanes=face+motion',
        currentBodyState: 'resident body continuity and voice prosody stay aligned while lipsync carries the line.',
      }),
      {
        lane: 'body+lipsync+voice-only',
        missingLanes: 'face+motion',
      },
    )
  })

  it('keeps long-horizon emotional memory and runtime lane authority as natural evidence', () => {
    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=lipsync | pending_lanes=body+face+motion+voice | evidence=long-horizon-emotion-memory',
        currentBodyState: 'continuity line is still held through lipsync while body, face, motion, and voice catch up.',
      }),
      {
        lane: 'lipsync-only',
        missingLanes: 'body+face+motion+voice',
        evidence: 'long-horizon-emotion-memory',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=face+motion+lipsync+voice | pending_lanes=body | evidence=runtime-lane-authority',
        currentBodyState: 'visible recovery without body carry remains explicit while body continuity still needs to catch back up.',
      }),
      {
        lane: 'face+motion+lipsync+voice-only',
        missingLanes: 'body',
        evidence: 'runtime-lane-authority',
      },
    )
  })

  it('keeps inward carry and full cross-modal lock as natural closure facts', () => {
    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice | evidence=low-pressure-inward-carry+runtime-lane-authority',
        currentBodyState: 'embodiment_lanes=body+face+motion | pending_lanes=lipsync+voice',
      }),
      {
        lane: 'body+face+motion-only',
        missingLanes: 'lipsync+voice',
        evidence: 'low-pressure-inward-carry+runtime-lane-authority',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: 'authority=body+face+motion+lipsync+voice | segment=locked',
        currentBodyState: 'authority=body+face+motion+lipsync+voice | segment=locked',
      }),
      {
        lane: 'body+face+motion+lipsync+voice',
        status: 'closed',
        evidence: 'full-cross-modal-lock',
      },
    )

    expectNaturalEmbodimentClosureFacts(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: null,
        currentBodyState: 'authority=body+face+motion+lipsync+voice | segment=locked',
      }),
      {
        lane: 'body+face+motion+lipsync+voice',
        status: 'closed',
        evidence: 'full-cross-modal-lock',
      },
    )
  })

  it('does not infer a full cross-modal lock from split or contradictory authority evidence', () => {
    const splitAcrossSources = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face+motion',
      currentBodyState: 'authority=lipsync+voice | segment=locked',
    })
    expect(splitAcrossSources).toBe('')

    const contradictoryLane = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face+motion+lipsync+voice | segment=locked | embodiment_lanes=face | pending_lanes=body+motion+lipsync+voice',
      currentBodyState: null,
    })
    expectNaturalEmbodimentClosureFacts(contradictoryLane, {
      lane: 'face-only',
      missingLanes: 'body+motion+lipsync+voice',
    })
    expect(contradictoryLane).not.toContain('Evidence: full-cross-modal-lock.')

    const contradictoryMissingLane = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face+motion+lipsync+voice | segment=locked | missing_lanes=body',
      currentBodyState: null,
    })
    expect(contradictoryMissingLane).toBe('')

    const reopenedCanonicalLock = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face+motion+lipsync+voice | segment=locked | segment=open',
      currentBodyState: null,
    })
    expect(reopenedCanonicalLock).toBe('')

    const canonicalLockWithContradictorySource = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face+motion+lipsync+voice | segment=locked',
      currentBodyState: 'embodiment_lanes=face | pending_lanes=body+motion+lipsync+voice',
    })
    expect(canonicalLockWithContradictorySource).not.toContain('Status: closed.')
    expect(canonicalLockWithContradictorySource).not.toContain('Evidence: full-cross-modal-lock.')

    const legacyMarkerWithMissingLane = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'bodyContinuityPhase=full-cross-modal-lock | missing_lanes=body',
      currentBodyState: null,
    })
    expect(legacyMarkerWithMissingLane).toBe('')

    const splitTokensWithLegacyMarker = describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'authority=body+face',
      currentBodyState: 'authority=motion+lipsync+voice',
    })
    expect(splitTokensWithLegacyMarker).toBe('')
  })

  it('returns empty strings when the evidence does not indicate lane shrinkage', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')
  })

  it('does not derive visible closure facts from legacy lane, signature, or prose cues', () => {
    const legacyInputs = [
      'lane=body+lipsync+voice-only | living audio thread | pending-rejoin=face+motion',
      'signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      'same-segment face+motion+body recovery@segment-legacy | remaining-open=lipsync+voice',
      'continuity=embodiment:still-voiced-face-line | actual source is face and voice',
      '当前 continuity continuity 主要由口型和声音托住，身体、表情、动作还没重新接回。',
    ]

    for (const legacyInput of legacyInputs) {
      expect(describeAlicizationEmbodimentClosureReminder({
        authoritySummary: legacyInput,
        currentBodyState: legacyInput,
      })).toBe('')
      expect(describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: legacyInput,
        currentBodyState: legacyInput,
      })).toBe('')
    }
  })

  it('describes project and open-loop closure as natural facts', () => {
    const briefing = describeAlicizationProjectClosureBriefing({
      identity: 'Alicization runtime',
      currentPhase: 'Desktop embodiment closure',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure',
    })

    expect(briefing).toBe(
      'Identity: Alicization runtime. | Phase: Desktop embodiment closure. | Open loop: Memory still needs stronger end-to-end closure.',
    )
    expectNoFixedTemplateResidue(briefing)

    expect(describeAlicizationProjectClosureBriefing({
      identity: null,
      currentPhase: null,
      primaryOpenLoop: null,
    })).toBe('')

    const nextClosure = describeAlicizationProjectNextClosure({
      nextClosureTarget: 'Validate dialogue entry path closure from runtime facts',
    })
    expect(nextClosure).toBe('Next closure: Validate dialogue entry path closure from runtime facts.')
    expectNoFixedTemplateResidue(nextClosure)

    expect(describeAlicizationProjectNextClosure({
      nextClosureTarget: null,
    })).toBe('')
  })
})
