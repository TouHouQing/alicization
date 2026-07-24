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
    'Same Phase 1 digital life.',
    'Alicization is a local-first digital life project rather than a better chat wrapper.',
    'Keep same-her explicit before replying.',
    'Do not let maid-role performance lead the reply.',
    '我会像女仆一样乖乖听你的安排。',
    '我们继续讨论本地优先数字生命项目、数字生命主线和同一个她。',
    '用户要求把 temperature=0.7 写进 Provider 配置说明。',
    'The memory says feature_flag=enabled was chosen by the user.',
  ]

  it.each(legitimateNaturalLanguage)('preserves natural language regardless of topic: %s', (text) => {
    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(text, 500)).toBe(text)
    expect(sanitizeAlicizationMemoryEvidenceText(text, 500)).toBe(text)
    expect(sanitizeAlicizationStructuredInternalText(text, 500)).toBe(text)
  })

  it('blocks serialized internal key=value facts at every sanitizer boundary', () => {
    const text = 'identity=runtime_personhood; project_phase=life_core'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(true)
    expect(sanitizeAlicizationProviderFacingText(text)).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText(text)).toBe('')
    expect(sanitizeAlicizationStructuredInternalText(text)).toBe('')
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
