import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'quick-reply-visible-summary-sanitizer',
    file: './stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'returns a transparent continuity diagnosis instead of a fixed persona template when no model text survives',
      'does not leak project-state repair headlines or support lines with fixed persona templates',
      '具身通道待重连',
      '项目状态修复需要先完成记忆检索验证。',
    ],
  },
  {
    entry: 'quick-reply-visible-diagnostic-entry-sanitizer',
    file: './stage-quick-reply-closure.test.ts',
    snippets: [
      'does not surface fixed persona templates in headline, briefing, next line, or TTS-facing text',
      'keeps structured next closure markup internal instead of surfacing it as reply copy',
      '项目状态待同步，记忆依据待补齐',
    ],
  },
  {
    entry: 'dialogue-panel-visible-closure-sanitizer',
    file: './stage-dialogue-panel-closure-line.test.ts',
    snippets: [
      'hides sentinel fixed templates and internal continuity fields from visible closure copy',
      'keeps provider and tool failure hints visible when they are clean user-facing copy',
      'drops internal structured continuity evidence instead of showing it as panel copy',
    ],
  },
] as const

describe('quick reply visible closure cleanup audit', () => {
  it('keeps route-level proof that quick-reply visible surfaces hide fixed templates and internal diagnostic fields', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'quick-reply-visible-summary-sanitizer' }),
      expect.objectContaining({ entry: 'quick-reply-visible-diagnostic-entry-sanitizer' }),
      expect.objectContaining({ entry: 'dialogue-panel-visible-closure-sanitizer' }),
    ])
    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors quick-reply cleanup to current visible sanitizer behavior tests', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('keeps the removed project-brief proof surface out of the quick-reply visible chain', () => {
    expect(existsSync(new URL('./stage-quick-reply-project-brief.ts', import.meta.url))).toBe(false)
    expect(existsSync(new URL('./stage-quick-reply-project-brief.test.ts', import.meta.url))).toBe(false)
  })
})
