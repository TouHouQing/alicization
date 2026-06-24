import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'speech-evidence-normalized-audible-body-stage',
    file: './performance-visualizer-speech-evidence.test.ts',
    snippets: [
      'preserves normalized embodiment closure stage in speech evidence snapshots so downstream same-her diagnostics do not need to re-parse raw strings',
      'embodimentClosureStage: \'audible-body-carry\'',
      'expect(snapshot.embodimentClosureStage).toBe(\'audible-body-carry\')',
    ],
  },
  {
    entry: 'speech-evidence-structured-body-carried-stage',
    file: './performance-visualizer-speech-evidence.test.ts',
    snippets: [
      'derives structured same-her closure stage in speech evidence snapshots when only authority lane summaries carry it',
      'lane=body-carried-to-renderer-rejoin',
      'expect(snapshot.embodimentClosureStage).toBe(testCase.expected)',
    ],
  },
  {
    entry: 'speech-evidence-stage-as-prosody-authority',
    file: './performance-visualizer-speech-evidence.test.ts',
    snippets: [
      'treats normalized embodiment closure stage as speech-side prosody evidence even when raw voice/body summaries are absent',
      'embodimentClosureStage: \'audible-body-carry\'',
      'toEqual([\'prosody\'])',
    ],
  },
] as const

describe('performance visualizer speech evidence project awareness audit', () => {
  it('keeps one explicit route-level proof that speech evidence snapshots preserve canonical same-her closure stages instead of forcing downstream reparsing', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'speech-evidence-normalized-audible-body-stage' }),
      expect.objectContaining({ entry: 'speech-evidence-structured-body-carried-stage' }),
      expect.objectContaining({ entry: 'speech-evidence-stage-as-prosody-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the speech evidence project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: speech evidence snapshots now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const speechEvidenceSource = readFileSync(new URL('./performance-visualizer-speech-evidence.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-speech-evidence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('normalized speech-side closure stage')
    expect(matrixSource).toContain('body-carried speech evidence stage')
    expect(matrixSource).toContain('speech-side prosody evidence')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(speechEvidenceSource).toContain(
      'preserves normalized embodiment closure stage in speech evidence snapshots so downstream same-her diagnostics do not need to re-parse raw strings',
    )
    expect(speechEvidenceSource).toContain(
      'derives structured same-her closure stage in speech evidence snapshots when only authority lane summaries carry it',
    )
  })
})
