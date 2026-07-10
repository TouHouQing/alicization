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
  expect(String(value ?? '')).not.toMatch(/Right now|Same Phase 1|same-her|same digital life|one living her/iu)
}

function expectStructuredEmbodimentClosure(
  value: string,
  expected: {
    lane: string
    status?: 'pending-rejoin' | 'closed'
    pendingRejoin?: string
    perspective?: 'headline' | 'reminder'
    evidence?: string
  },
) {
  const status = expected.status ?? 'pending-rejoin'

  expect(value).toContain('continuity=embodiment')
  expect(value).toContain(`lane=${expected.lane}`)
  expect(value).toContain(`status=${status}`)
  expect(value).toContain(
    `closure=${status === 'closed' ? 'full-cross-modal-closed' : 'full-cross-modal-open'}`,
  )
  if (expected.pendingRejoin)
    expect(value).toContain(`pending_rejoin=${expected.pendingRejoin}`)
  if (expected.evidence)
    expect(value).toContain(`evidence=${expected.evidence}`)
  expect(value).toContain(expected.perspective === 'headline'
    ? 'visibility=renderer-internal'
    : 'surface=structured')
  expectNoFixedTemplateResidue(value)
}

describe('alicization embodiment closure', () => {
  it('returns structured reminder and headline facts from lane-shrinkage evidence', () => {
    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'continuity remains alive, but lane=lipsync-only under the current renderer authority.',
        currentBodyState: null,
      }),
      {
        lane: 'lipsync-only',
        pendingRejoin: 'body+face+motion+voice',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: null,
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      }),
      {
        lane: 'face+motion-only',
        pendingRejoin: 'body+lipsync+voice',
        perspective: 'headline',
      },
    )
  })

  it('keeps voice and audible-body lanes as structured embodiment facts', () => {
    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'continuity remains alive, but lane=voice-only under the current renderer authority.',
        currentBodyState: null,
      }),
      {
        lane: 'voice-only',
        pendingRejoin: 'body+face+motion+lipsync',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=body+voice-only | resident body and voice are still carrying the continuity line.',
        currentBodyState: 'body and voice are aligned while lipsync, face, and motion still need to catch up.',
      }),
      {
        lane: 'body+voice-only',
        pendingRejoin: 'face+motion+lipsync',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=body+lipsync+voice-only | living audio thread | pending-rejoin=face+motion',
        currentBodyState: 'resident body continuity and voice prosody stay aligned while lipsync carries the line.',
      }),
      {
        lane: 'body+lipsync+voice-only',
        pendingRejoin: 'face+motion',
      },
    )
  })

  it('keeps long-horizon emotional memory and runtime lane authority as structured evidence', () => {
    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=lipsync-only | convergence=emotion-memory-lipsync | long-horizon remembered emotional carry says lipsync is still carrying the continuity line.',
        currentBodyState: 'continuity line is still held through lipsync while body, face, motion, and voice catch up.',
      }),
      {
        lane: 'lipsync-only',
        pendingRejoin: 'body+face+motion+voice',
        evidence: 'long-horizon-emotion-memory',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
        currentBodyState: 'visible recovery without body carry remains explicit while body continuity still needs to catch back up.',
      }),
      {
        lane: 'face+motion+lipsync+voice-only',
        pendingRejoin: 'body',
        evidence: 'runtime-lane-authority',
      },
    )
  })

  it('keeps inward carry and full cross-modal lock as structured closure facts', () => {
    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-inward-carry | remaining-open=lipsync+voice | continuity-inward-carry | quiet-companionship',
        currentBodyState: 'lane=body+face+motion-only | continuity line stays inward before widening outward again.',
      }),
      {
        lane: 'body+face+motion-only',
        pendingRejoin: 'lipsync+voice',
        evidence: 'low-pressure-inward-carry+runtime-lane-authority',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together',
        currentBodyState: 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together',
      }),
      {
        lane: 'body+face+motion+lipsync+voice',
        status: 'closed',
        pendingRejoin: 'none',
        perspective: 'headline',
        evidence: 'full-cross-modal-lock',
      },
    )
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

  it('describes project/open-loop closure as structured facts only', () => {
    const briefing = describeAlicizationProjectClosureBriefing({
      identity: 'project_state_owner=ProjectStateGovernance',
      currentPhase: 'runtime_context=local_runtime',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure.',
    })

    expect(briefing).toContain('continuity=project-state')
    expect(briefing).toContain('identity=project_state_owner=ProjectStateGovernance')
    expect(briefing).toContain('phase=runtime_context=local_runtime')
    expect(briefing).toContain('open=Memory still needs stronger end-to-end closure.')
    expect(briefing).toContain('surface=structured')
    expectNoFixedTemplateResidue(briefing)

    expect(describeAlicizationProjectClosureBriefing({
      identity: null,
      currentPhase: null,
      primaryOpenLoop: null,
    })).toBe('')

    const nextClosure = describeAlicizationProjectNextClosure({
      nextClosureTarget: 'Keep every dialogue entry path aware of the same project closure target before speaking.',
    })
    expect(nextClosure).toBe('next=Keep every dialogue entry path aware of the same project closure target before speaking. | surface=structured')
    expectNoFixedTemplateResidue(nextClosure)

    expect(describeAlicizationProjectNextClosure({
      nextClosureTarget: null,
    })).toBe('')
  })
})
