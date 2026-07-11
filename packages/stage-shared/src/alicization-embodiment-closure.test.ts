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
    status?: 'partial' | 'closed'
    missingLanes?: string
    evidence?: string
  },
) {
  const status = expected.status ?? 'partial'
  const lane = expected.lane.replace(/-only$/u, '')

  expect(value).toContain(`embodiment_lanes=${lane}`)
  expect(value).toContain(`status=${status}`)
  if (expected.missingLanes)
    expect(value).toContain(`missing_lanes=${expected.missingLanes}`)
  if (expected.evidence)
    expect(value).toContain(`evidence=${expected.evidence}`)
  expect(value).not.toContain('continuity=embodiment')
  expect(value).not.toContain('pending_rejoin=')
  expect(value).not.toContain('visibility=')
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
        missingLanes: 'body+face+motion+voice',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureHeadline({
        authoritySummary: null,
        currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
      }),
      {
        lane: 'face+motion-only',
        missingLanes: 'body+lipsync+voice',
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
        missingLanes: 'body+face+motion+lipsync',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=body+voice-only | resident body and voice are still carrying the continuity line.',
        currentBodyState: 'body and voice are aligned while lipsync, face, and motion still need to catch up.',
      }),
      {
        lane: 'body+voice-only',
        missingLanes: 'face+motion+lipsync',
      },
    )

    expectStructuredEmbodimentClosure(
      describeAlicizationEmbodimentClosureReminder({
        authoritySummary: 'lane=body+lipsync+voice-only | living audio thread | pending-rejoin=face+motion',
        currentBodyState: 'resident body continuity and voice prosody stay aligned while lipsync carries the line.',
      }),
      {
        lane: 'body+lipsync+voice-only',
        missingLanes: 'face+motion',
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
        missingLanes: 'body+face+motion+voice',
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
        missingLanes: 'body',
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
        missingLanes: 'lipsync+voice',
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

    expect(briefing).toContain('identity=project_state_owner=ProjectStateGovernance')
    expect(briefing).toContain('phase=runtime_context=local_runtime')
    expect(briefing).toContain('open=Memory still needs stronger end-to-end closure.')
    expect(briefing).not.toContain('continuity=project-state')
    expect(briefing).not.toContain('surface=structured')
    expectNoFixedTemplateResidue(briefing)

    expect(describeAlicizationProjectClosureBriefing({
      identity: null,
      currentPhase: null,
      primaryOpenLoop: null,
    })).toBe('')

    const nextClosure = describeAlicizationProjectNextClosure({
      nextClosureTarget: 'Validate dialogue entry path closure from runtime facts.',
    })
    expect(nextClosure).toBe('next=Validate dialogue entry path closure from runtime facts.')
    expectNoFixedTemplateResidue(nextClosure)

    expect(describeAlicizationProjectNextClosure({
      nextClosureTarget: null,
    })).toBe('')
  })
})
