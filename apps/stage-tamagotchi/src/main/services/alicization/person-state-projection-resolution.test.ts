import { describe, expect, it } from 'vitest'

import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'

describe('resolvePreferredPersonStateProjection', () => {
  it('prefers the structurally richer projection without reading its prose', () => {
    const preferred = resolvePreferredPersonStateProjection({
      bundleProjection: {
        summary: 'bundle summary',
        openingGuidance: 'bundle opening',
      },
      runtimeProjection: {
        contexts: ['general', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'focused-work',
          repairPosture: 'repair-first',
        },
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        restrained: true,
        cautious: true,
        summary: 'arbitrary runtime summary',
      },
    } as any)

    expect(preferred?.summary).toBe('arbitrary runtime summary')
  })

  it('keeps selection stable when equally structured prose changes', () => {
    const select = (runtimeSummary: string) => resolvePreferredPersonStateProjection({
      bundleProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: 'bundle summary',
      },
      runtimeProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: runtimeSummary,
      },
    } as any)

    expect(select('longer runtime prose with arbitrary wording')?.summary).toBe('bundle summary')
    expect(select('unrelated model-authored sentence')?.summary).toBe('bundle summary')
  })

  it('does not use descriptive prose density to select a projection', () => {
    const preferred = resolvePreferredPersonStateProjection({
      bundleProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: 'bundle',
      },
      runtimeProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: 'runtime with more words',
        manifestationCadenceSummary: 'runtime cadence prose',
        preferenceText: 'runtime preference prose',
        sensitivityText: 'runtime sensitivity prose',
        relationshipDoctrine: 'runtime relationship prose',
      },
    } as any)

    expect(preferred?.summary).toBe('bundle')
  })
})

describe('self continuity authority resolution', () => {
  it('prefers stronger structured provenance without reading authority prose', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'bundle self',
        sourceTags: ['bundle'],
      },
      runtimeAuthority: {
        selfLine: 'runtime self',
        relationshipLine: 'runtime relationship',
        motiveLine: 'runtime motive',
        habitLine: 'runtime habit',
        inwardLine: 'runtime inward',
        authoritySummary: 'arbitrary runtime summary',
        closenessPosture: 'space-first',
        sourceTags: ['runtime', 'recent-snapshot'],
      },
    })

    expect(preferred?.authoritySummary).toBe('arbitrary runtime summary')
  })

  it('fills missing fields and merges source tags without parsing prose', () => {
    const merged = mergePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'bundle self',
        relationshipLine: 'bundle relationship',
        motiveLine: 'bundle motive',
        habitLine: 'bundle habit',
        inwardLine: 'bundle inward',
        authoritySummary: 'bundle summary',
        sourceTags: ['bundle'],
      },
      runtimeAuthority: {
        selfLine: 'runtime self',
        relationshipLine: null,
        motiveLine: null,
        habitLine: null,
        inwardLine: null,
        authoritySummary: null,
        sourceTags: ['runtime'],
      },
    })

    expect(merged).toEqual(expect.objectContaining({
      selfLine: 'bundle self',
      relationshipLine: 'bundle relationship',
      authoritySummary: 'bundle summary',
      sourceTags: ['bundle', 'runtime'],
    }))
  })

  it('does not use authority prose density to select a winner', () => {
    const preferred = resolvePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'bundle self',
        sourceTags: ['owner'],
      },
      runtimeAuthority: {
        selfLine: 'runtime self with more words',
        relationshipLine: 'runtime relationship',
        motiveLine: 'runtime motive',
        habitLine: 'runtime habit',
        inwardLine: 'runtime inward',
        authoritySummary: 'runtime summary',
        sourceTags: ['owner'],
      },
    })

    expect(preferred?.selfLine).toBe('bundle self')
  })

  it('filters project carry provenance from a complete preferred authority', () => {
    const merged = mergePreferredSelfContinuityAuthority({
      bundleAuthority: {
        selfLine: 'bundle self',
        sourceTags: ['bundle-owner'],
      },
      runtimeAuthority: {
        selfLine: 'runtime self',
        relationshipLine: 'runtime relationship',
        motiveLine: 'runtime motive',
        habitLine: 'runtime habit',
        inwardLine: 'runtime inward',
        authoritySummary: 'runtime summary',
        closenessPosture: 'space-first',
        sourceTags: [
          'runtime-owner',
          ['project', 'state', 'carry'].join('-'),
          ['execution', 'callback', 'project', 'carry'].join('-'),
        ],
      },
    })

    expect(merged?.sourceTags).toEqual(['runtime-owner', 'bundle-owner'])
  })
})
