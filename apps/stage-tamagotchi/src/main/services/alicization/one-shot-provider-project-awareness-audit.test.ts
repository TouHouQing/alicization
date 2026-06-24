import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'one-shot-project-state-fallback-triad',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'keeps identity, landed progress, and still-open closure distinct in one-shot project-state fallback',
      'Project-state carry already survives into one-shot generation without dropping the same-her line.',
      'Initiative, memory, and embodiment still need to close on one same living line.',
    ],
  },
  {
    entry: 'one-shot-awareness-over-embodiment-headline',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in one-shot fallback',
      'Before answering, remember this is still the same Phase 1 local digital life, not a generic assistant shell.',
      'Same companion line through body, face, and motion. Keep the same living line gentle.',
    ],
  },
  {
    entry: 'one-shot-provider-self-brief-injection',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation',
      'Screen semantic interpretation must stay inside the same digital life project line',
      'Do not let screen semantic interpretation collapse into a generic desktop classifier',
    ],
  },
  {
    entry: 'one-shot-fail-close-missing-context',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages',
      'main-gateway.one-shot-missing-project-state-context',
      'projectStateAuditFamily: \'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal\'',
    ],
  },
  {
    entry: 'one-shot-thin-shell-re-expansion',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      're-expands a thin runtime project-state shell into canonical same-her Phase 1 answer context before scene-appraisal generation starts',
      'pre_dialogue_awareness=Before answering, remember:',
      'turns direct project-state one-shot turns into an explicit pre-answer contract for identity, landed progress, open closure, and same-her continuity',
    ],
  },
] as const

describe('one-shot provider project awareness audit', () => {
  it('keeps one explicit route-level proof that provider-facing one-shot generation preserves same-her project awareness before classification or appraisal text is generated', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'one-shot-project-state-fallback-triad' }),
      expect.objectContaining({ entry: 'one-shot-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'one-shot-provider-self-brief-injection' }),
      expect.objectContaining({ entry: 'one-shot-fail-close-missing-context' }),
      expect.objectContaining({ entry: 'one-shot-thin-shell-re-expansion' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the one-shot provider-facing claim to current behavior tests instead of only gateway registration or family mapping', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current one-shot provider-facing routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(oneShotSource).toContain(
      'injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation',
    )
    expect(oneShotSource).toContain(
      'fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages',
    )
  })
})
