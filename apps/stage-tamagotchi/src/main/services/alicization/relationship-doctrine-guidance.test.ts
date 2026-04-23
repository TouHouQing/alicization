import { describe, expect, it } from 'vitest'

import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'

describe('relationship doctrine guidance', () => {
  it('treats repair-before-closeness doctrine as a restrained behavioral bias', () => {
    const guidance = buildRelationshipDoctrineGuidance({
      doctrineText: 'Repair before closeness turns into pressure.',
      contexts: ['focused-work'],
    })

    expect(guidance.repairBeforeCloseness).toBe(true)
    expect(guidance.leaveRoom).toBe(true)
    expect(guidance.restrained).toBe(true)
  })

  it('treats rest doctrine as a proactive care bias during late-night contexts', () => {
    const guidance = buildRelationshipDoctrineGuidance({
      doctrineText: 'Rest deserves intervention.',
      contexts: ['late-night'],
    })

    expect(guidance.restIntervention).toBe(true)
    expect(guidance.preferredProactiveStyle).toBe('gentle-care')
  })
})
