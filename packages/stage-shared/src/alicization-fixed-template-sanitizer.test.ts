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

  it('removes mixed internal cue fragments while preserving the natural evidence around them', () => {
    const internalContext = { provenance: 'internal-structured-fact' as const }
    const mixed = [
      '用户明确喜欢白色樱花。 emotion:hesitant-curiosity',
      '这是一段真实事件。 autobiographical phase recollection:relationship-history:structured-state',
      '用户偏好中文。 visibility=redacted_internal cleaned:working-memory-long-term:turn-1',
      '用户希望继续当前任务。 opening_policy=none relationship_cadence=measured',
    ]

    for (const text of mixed) {
      expect(containsAlicizationFixedTemplateResidue(text, internalContext)).toBe(true)
      const sanitized = sanitizeAlicizationMemoryEvidenceText(text, 500, internalContext)
      expect(sanitized).not.toMatch(
        /autobiographical\s+phase|emotion:|recollection:|structured-state|opening_policy|relationship_cadence|visibility\s*=\s*redacted_internal|cleaned:working-memory-long-term/iu,
      )
      expect(sanitized.length).toBeGreaterThan(0)
    }
  })

  it('can drop only pure internal values while preserving mixed natural text', () => {
    const internalContext = {
      provenance: 'internal-structured-fact' as const,
      fragmentPolicy: 'drop-only' as const,
    }
    const naturalDiscussion = '用户正在讨论 opening_policy=legacy 这个代码字段。'

    expect(sanitizeAlicizationMemoryEvidenceText(
      'pre_turn_context_digest',
      500,
      internalContext,
    )).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText(
      naturalDiscussion,
      500,
      internalContext,
    )).toBe(naturalDiscussion)
  })

  it('drops an internal evidence item when cue stripping leaves no natural content', () => {
    const internalContext = { provenance: 'internal-structured-fact' as const }
    const text = '共同经历 autobiographical phase emotion:hesitant-curiosity'

    expect(containsAlicizationFixedTemplateResidue(text, internalContext)).toBe(true)
    expect(sanitizeAlicizationProviderFacingText(text, 360, '', internalContext)).toBe('')
    expect(sanitizeAlicizationMemoryEvidenceText(text, 360, internalContext)).toBe('')
  })

  it('does not strip the same words from user-authored evidence', () => {
    const text = '我们共同经历过一次很重要的修复过程。'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationMemoryEvidenceText(
      text,
      500,
      { origin: 'user-turn' },
    )).toBe(text)
  })

  it('preserves a natural shared-experience sentence even for internal structured provenance', () => {
    const text = '我们共同经历过一次很重要的修复过程。'
    const internalContext = { provenance: 'internal-structured-fact' as const }

    expect(containsAlicizationFixedTemplateResidue(text, internalContext)).toBe(false)
    expect(sanitizeAlicizationMemoryEvidenceText(text, 500, internalContext)).toBe(text)
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
