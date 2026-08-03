import { describe, expect, it } from 'vitest'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationMemoryEvidenceText,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from './alicization-fixed-template-sanitizer'

describe('alicization fixed template sanitizer', () => {
  const legitimateNaturalLanguage = [
    'The user is discussing a continuity design in ordinary prose.',
    'Alicization should keep memory facts traceable across sessions.',
    'Keep the user correction verbatim before replying.',
    'Do not let an unrelated style instruction lead the reply.',
    '请保留用户关于对话语气的自然语言说明。',
    '我们继续讨论本地记忆、人格事实和对话连续性。',
    '用户要求把 temperature=0.7 写进 Provider 配置说明。',
    'The memory says feature_flag=enabled was chosen by the user.',
  ]

  it.each(legitimateNaturalLanguage)('preserves natural language regardless of topic: %s', (text) => {
    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(text, 500)).toBe(text)
    expect(sanitizeAlicizationMemoryEvidenceText(text, 500)).toBe(text)
    expect(sanitizeAlicizationStructuredInternalText(text, 500)).toBe(text)
  })

  it('preserves bare key=value text unless the caller supplies internal provenance', () => {
    const text = 'mode=internal; lifecycle=held'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(text)).toBe(text)
    expect(sanitizeAlicizationMemoryEvidenceText(text)).toBe(text)
    expect(sanitizeAlicizationStructuredInternalText(text)).toBe(text)

    const internalContext = { origin: 'internal-structured-fact' as const }
    expect(containsAlicizationFixedTemplateResidue(text, internalContext)).toBe(true)
    expect(sanitizeAlicizationProviderFacingText(text, 360, '', internalContext)).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText(text, 360, internalContext)).toBe('')
    expect(sanitizeAlicizationStructuredInternalText(text, 360, '', internalContext)).toBe('')
  })

  it('requires explicit internal fact provenance before blocking multiline key=value facts', () => {
    const text = 'mode="internal state"\nvisibility=hidden'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(text)).toBe('mode="internal state" visibility=hidden')
    expect(sanitizeAlicizationMemoryEvidenceText(text)).toBe('mode="internal state" visibility=hidden')
    expect(sanitizeAlicizationStructuredInternalText(text)).toBe('mode="internal state" visibility=hidden')

    const legacyVisibility = ['redacted', 'internal'].join('_')
    expect(containsAlicizationFixedTemplateResidue(text, { visibility: legacyVisibility })).toBe(false)

    const internalContext = { origin: 'internal-structured-fact' as const }
    expect(containsAlicizationFixedTemplateResidue(text, internalContext)).toBe(true)
    expect(sanitizeAlicizationProviderFacingText(text, 360, '', internalContext)).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText(text, 360, internalContext)).toBe('')
    expect(sanitizeAlicizationStructuredInternalText(text, 360, '', internalContext)).toBe('')
  })

  it('requires explicit internal provenance before blocking legacy internal cue labels', () => {
    const cues = [
      'structured continuity digest.',
      'pre_turn_context_digest',
      'runtime_mind_state',
    ]

    for (const cue of cues) {
      expect(containsAlicizationFixedTemplateResidue(cue)).toBe(false)
      expect(sanitizeAlicizationProviderFacingText(cue, 360)).toBe(cue)
      expect(sanitizeAlicizationMemoryEvidenceText(cue, 360)).toBe(cue)

      const internalContext = { provenance: 'internal-structured-fact' as const }
      expect(containsAlicizationFixedTemplateResidue(cue, internalContext)).toBe(true)
      expect(sanitizeAlicizationProviderFacingText(cue, 360, '', internalContext)).toBe('')
      expect(sanitizeAlicizationMemoryEvidenceText(cue, 360, internalContext)).toBe('')
    }
  })

  it('does not scan serialized typed payload values as free-form control text', () => {
    const serialized = JSON.stringify({
      type: 'alicization-runtime-fact',
      data: {
        summary: 'host replied | scenario=coding | learning=verify',
      },
    })

    expect(containsAlicizationFixedTemplateResidue(serialized)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(serialized, 500)).toBe(serialized)
    expect(sanitizeAlicizationMemoryEvidenceText(serialized, 500)).toBe(serialized)
    expect(sanitizeAlicizationStructuredInternalText(serialized, 500)).toBe(serialized)
  })

  it('recognizes serialized typed payloads before applying the detector length budget', () => {
    const serialized = JSON.stringify({
      type: 'alicization-runtime-fact',
      data: {
        summary: 'host replied | scenario=coding | learning=verify',
        padding: 'x'.repeat(3000),
      },
    })

    expect(containsAlicizationFixedTemplateResidue(serialized)).toBe(false)
  })

  it('keeps empty, whitespace, and length normalization', () => {
    expect(sanitizeAlicizationProviderFacingText(undefined)).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText('   ')).toBe('')
    expect(sanitizeAlicizationStructuredInternalText(null)).toBe('')

    expect(sanitizeAlicizationProviderFacingText('  hello \n world  ', 8)).toBe('hello wo')
    expect(sanitizeAlicizationMemoryEvidenceText('  hello \n world  ', 8)).toBe('hello wo')
    expect(sanitizeAlicizationStructuredInternalText('  hello \n world  ', 8)).toBe('hello wo')
  })

  it('uses an empty replacement', () => {
    expect(alicizationFixedTemplateReplacement).toBe('')
  })
})
