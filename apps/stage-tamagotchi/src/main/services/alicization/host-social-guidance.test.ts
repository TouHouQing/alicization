import { describe, expect, it } from 'vitest'

import { adjustProactiveStyleFromHostPersonModel, buildHostSocialGuidance, inferHostSocialContextsFromText } from './host-social-guidance'

const hostPersonModel = {
  summary: 'Focused work windows need more room before closeness.',
  routines: ['Focused work windows usually need space first, then precise follow-up.'],
  sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
  repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
  trustLadder: {
    stage: 'cautious-open' as const,
    score: 0.48,
    rationale: 'Trust is warming, but the host still needs clear room while focused.',
  },
  preferredClosenessByContext: [{
    context: 'focused-work',
    preference: 'Lighter touch, more room, less interruption pressure.',
    confidence: 0.86,
  }],
  recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
  narrative: [],
  updatedAt: 1,
}

describe('host social guidance', () => {
  it('extracts cautious focused-work social guidance from host person model', () => {
    const contexts = inferHostSocialContextsFromText('runtime diff fix in cursor terminal')
    const guidance = buildHostSocialGuidance({
      hostPersonModel,
      contexts,
    })

    expect(guidance.cautious).toBe(true)
    expect(guidance.restrained).toBe(true)
    expect(guidance.preferenceText).toContain('Lighter touch')
    expect(guidance.sensitivityText).toContain('intrusive')
  })

  it('tilts proactive style lighter for focused-work cautious contexts', () => {
    const contexts = inferHostSocialContextsFromText('runtime diff fix in cursor terminal')
    const style = adjustProactiveStyleFromHostPersonModel({
      currentStyle: 'gentle-care',
      hostPersonModel,
      contexts,
    })

    expect(style).toBe('light-nudge')
  })
})
