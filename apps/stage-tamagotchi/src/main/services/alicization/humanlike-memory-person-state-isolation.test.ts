import { describe, expect, it } from 'vitest'

import { buildHostPersonModelSnapshot } from './humanlike-memory'

describe('humanlike memory person-state isolation', () => {
  it('does not treat evidence references or legacy hints as semantic host preferences', () => {
    const marker = 'legacy-person-state-hint-must-not-enter-host-model'
    const evidenceRef = 'relationship-outcome:b3V0Y29tZS0x'
    const snapshot = buildHostPersonModelSnapshot({
      now: 45_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 44_000,
        summary: evidenceRef,
        dominantContexts: ['general'],
        relationshipShift: {
          trustDelta: 0.1,
          closenessDelta: 0.02,
          burdenDelta: 0,
          boundaryDelta: 0,
          repairDelta: 0,
        },
        reinforcementBias: {},
        preferenceHints: [marker],
        sensitivityHints: [marker],
        repairHints: [marker],
        burdenHints: [marker],
        narrative: [marker],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'reply',
          summary: evidenceRef,
          createdAt: 44_000,
        }],
        affectiveResidue: null,
      },
    })

    expect(JSON.stringify(snapshot)).not.toContain(evidenceRef)
    expect(JSON.stringify(snapshot)).not.toContain(marker)
    expect(snapshot.preferredClosenessByContext).toEqual([])
  })
})
