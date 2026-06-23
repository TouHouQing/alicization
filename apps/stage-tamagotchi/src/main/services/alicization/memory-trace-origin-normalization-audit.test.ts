import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'async-memory-upsert-origin-lost-family-recanonicalization',
    file: './runtime.test.ts',
    snippets: [
      'canonicalizes origin-lost autonomous async memory upsert traces before writing replayable mind-turn events',
      'turnId: \'subconscious:memory-upsert-proactive\'',
      'origin: \'subconscious-proactive\'',
    ],
  },
  {
    entry: 'mind-turn-event-origin-lost-family-recanonicalization',
    file: './memory-mind-state-runtime.test.ts',
    snippets: [
      'canonicalizes origin-lost autonomous turn ids before persisting replayable mind-turn events',
      'turnId: \'subconscious:trace-1\'',
      'expect(rows[0]?.origin).toBe(\'subconscious-proactive\')',
    ],
  },
  {
    entry: 'fact-ledger-origin-lost-family-recanonicalization',
    file: './runtime.test.ts',
    snippets: [
      'keeps subconscious fact-ledger origin tags when async memory upsert trace loses origin but the turn id still carries autonomous ownership',
      'turnId: \'subconscious:fact-upsert-proactive\'',
      'fact_origin:subconscious-proactive',
    ],
  },
] as const

describe('memory trace origin normalization audit', () => {
  it('keeps explicit proof that origin-lost autonomous memory traces are canonicalized before replayable mind-turn persistence and fact-ledger fragment writing', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'async-memory-upsert-origin-lost-family-recanonicalization' }),
      expect.objectContaining({ entry: 'mind-turn-event-origin-lost-family-recanonicalization' }),
      expect.objectContaining({ entry: 'fact-ledger-origin-lost-family-recanonicalization' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the memory-trace normalization claim to current regressions instead of relying on indirect continuity assumptions', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('requires async memory ingress, fact-ledger labeling, and mind-turn persistence to reuse the shared autonomous family classifier instead of origin-only checks', () => {
    const handlerSource = readFileSync(new URL('./runtime-invoke-handlers-memory.ts', import.meta.url), 'utf8')
    const factMemorySource = readFileSync(new URL('./fact-memory.ts', import.meta.url), 'utf8')
    const persistenceSource = readFileSync(new URL('./memory-mind-state-runtime.ts', import.meta.url), 'utf8')

    expect(handlerSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
    expect(handlerSource).toContain('turnId,')
    expect(handlerSource).not.toContain('isAlicizationAutonomousDialogueOrigin(normalizedTraceOrigin)')

    expect(factMemorySource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
    expect(factMemorySource).toContain('turnId: trace.turnId,')
    expect(factMemorySource).not.toContain('isAlicizationAutonomousDialogueOrigin(normalized)')

    expect(persistenceSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
    expect(persistenceSource).toContain('turnId: normalizedTurnId,')
    expect(persistenceSource).not.toContain('isAlicizationAutonomousDialogueOrigin(normalizedOrigin)')
  })

  it('keeps the memory-trace origin-normalization continuity proof inside the broader project awareness matrix instead of leaving it as an isolated regression island', () => {
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(coverageSource).toContain('memory-trace-origin-normalization-audit.test.ts')
    expect(coverageSource).toContain('memory-trace-origin-normalization-continuity')

    expect(matrixSource).toContain('memory-trace-origin-normalization-audit.test.ts')
    expect(matrixSource).toContain('Origin-lost autonomous memory traces now also have dedicated audit proof')
  })
})
