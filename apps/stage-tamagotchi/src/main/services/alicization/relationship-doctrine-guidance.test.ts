import { describe, expect, it } from 'vitest'

import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'

describe('relationship doctrine guidance', () => {
  it('uses autobiographical state instead of parsing doctrine prose', () => {
    const create = (doctrineText: string) => buildRelationshipDoctrineGuidance({
      doctrineText,
      conflictStyle: 'repair-first',
      quietObservation: 0.74,
      autonomyRespect: 0.82,
      truthfulGrounding: 0.76,
      contexts: ['focused-work'],
    })

    const first = create('first owner-authored doctrine')
    const second = create('different owner-authored doctrine')

    expect(first.repairBeforeCloseness).toBe(true)
    expect(first.leaveRoom).toBe(true)
    expect(first.restrained).toBe(true)
    expect(first.preferredProactiveStyle).toBe('light-nudge')
    expect({
      ...first,
      doctrineSummary: '',
    }).toEqual({
      ...second,
      doctrineSummary: '',
    })
  })

  it('uses structured quiet preference for late-night care', () => {
    const guidance = buildRelationshipDoctrineGuidance({
      doctrineText: 'owner-authored doctrine',
      conflictStyle: 'soften-first',
      quietObservation: 0.82,
      autonomyRespect: 0.74,
      truthfulGrounding: 0.68,
      contexts: ['late-night'],
    })

    expect(guidance.restIntervention).toBe(true)
    expect(guidance.preferredProactiveStyle).toBe('gentle-care')
  })
})
