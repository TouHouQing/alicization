import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseSurfaceRelationshipRules } from './response-surface-relationship-rules'

describe('response-surface-relationship-rules', () => {
  it('keeps execution callbacks bounded and room-aware', () => {
    const result = buildAlicizationResponseSurfaceRelationshipRules({
      briefTurnMode: 'guide-current-knot',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      personStateProjection: {
        contexts: ['execution-callback'],
        personalityContinuityState: {} as any,
        selfContinuityAuthority: null,
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        closenessLadder: [],
        relationshipPosture: 'warm',
        openingGuidance: null,
        preferredProactiveStyle: null,
        manifestationCadenceSummary: null,
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: false,
        summary: 'execution callback bounded',
      },
    })

    expect(result.mustDo).toContain('Keep the visible closeness inside this ladder: execution-callback/measured-room.')
    expect(result.mustDo).toContain('Keep callback delivery thread-faithful and bounded to the same result line.')
    expect(result.mustNotDo).toContain('Do not let visible warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
    expect(result.mustNotDo).toContain('Do not widen a bounded execution callback into generic companionship tone.')
  })
})
