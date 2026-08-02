import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationCompanionshipReasonSummary } from './alicization-companionship-reason'

describe('alicization companionship reason', () => {
  it('returns no reason when no resident mode is active', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: null,
    })).toBeNull()
  })

  it('shows an existing persona reason without rewriting it', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            whySummary: 'The latest callback failed before the local action completed.',
          },
        },
      } as any,
    })).toBe('The latest callback failed before the local action completed.')
  })

  it('prefers an existing relationship lesson for repair-before-closeness', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Acknowledge the corrected fact before continuing.',
          },
        },
      } as any,
    })).toBe('Acknowledge the corrected fact before continuing.')
  })

  it('uses affective residue as a real remembered relationship fact', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'measured-return',
      digitalLifeSpineDigest: {
        memory: {
          affectiveResidue: {
            summary: 'The last correction still carries repair tension.',
          },
        },
      } as any,
    })).toBe('The last correction still carries repair tension.')
  })

  it('does not hide a transparent failure fact because it contains retired wording', () => {
    expect(resolveAlicizationCompanionshipReasonSummary({
      residentMode: 'repair-before-closeness',
      digitalLifeSpineDigest: {
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'The provider failed while the continuity migration was active.',
          },
        },
      } as any,
    })).toBe('The provider failed while the continuity migration was active.')
  })

  it('has no retired governance input or fixed-template filtering surface', () => {
    const source = readFileSync(new URL('./alicization-companionship-reason.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('reasonTags')
    expect(source).not.toContain('openingGuidance')
    expect(source).not.toContain('manifestationCadenceSummary')
    expect(source).not.toContain('relationshipCadenceSummary')
    expect(source).not.toContain('retiredCompanionshipTemplatePattern')
    expect(source).not.toContain('alicization-fixed-template-sanitizer')
  })
})
