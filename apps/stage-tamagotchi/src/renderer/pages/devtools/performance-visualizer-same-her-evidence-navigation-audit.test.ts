import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'devtools-body-only-runtime-evidence-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes body-only same-her continuity diagnostics into concrete body-held runtime evidence before stopping at the broader runtime continuity panel',
      'sameHerClosureStage: \'body-only-hold\'',
      'preferredScrollTargetId: \'self-evolution-evidence:runtime-continuity-body-only-hold\'',
    ],
  },
  {
    entry: 'devtools-audible-body-speech-evidence-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes audible-body same-her continuity diagnostics into concrete speech observability evidence before stopping at abstract runtime continuity panels',
      'sameHerClosureStage: \'audible-body-carry\'',
      'preferredScrollTargetId: \'self-evolution-speech:observability-summary\'',
    ],
  },
  {
    entry: 'devtools-body-carried-runtime-evidence-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes body-led renderer-rejoin same-her continuity diagnostics into concrete runtime continuity evidence before stopping at the broader runtime continuity panel',
      'sameHerClosureStage: \'body-carried-to-renderer-rejoin\'',
      'preferredScrollTargetId: \'self-evolution-evidence:runtime-continuity-body-carried-to-renderer-rejoin\'',
    ],
  },
  {
    entry: 'devtools-full-cross-modal-lock-runtime-evidence-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes full-cross-modal-lock same-her continuity diagnostics into concrete runtime continuity lock evidence before stopping at the broader runtime continuity panel',
      'sameHerClosureStage: \'full-cross-modal-lock\'',
      'preferredScrollTargetId: \'self-evolution-evidence:runtime-continuity-full-cross-modal-lock\'',
    ],
  },
  {
    entry: 'devtools-voice-lipsync-speech-authority-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes voice-lipsync same-her continuity diagnostics into concrete speech authority evidence before stopping at abstract renderer authority panels',
      'sameHerClosureStage: \'voice-lipsync-carry\'',
      'preferredScrollTargetId: \'self-evolution-authority:speech-hotspots\'',
    ],
  },
  {
    entry: 'devtools-voice-only-speech-observability-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes voice-only same-her continuity diagnostics into concrete speech observability evidence before stopping at abstract renderer authority panels',
      'sameHerClosureStage: \'voice-only-carry\'',
      'preferredScrollTargetId: \'self-evolution-speech:observability-summary\'',
    ],
  },
  {
    entry: 'devtools-renderer-rejoin-without-body-runtime-evidence-navigation',
    file: './performance-visualizer-closure-navigation.test.ts',
    snippets: [
      'routes renderer-rejoin-without-body same-her continuity diagnostics into concrete runtime continuity audit evidence before stopping at abstract renderer authority panels',
      'sameHerClosureStage: \'renderer-rejoin-without-body\'',
      'preferredScrollTargetId: \'self-evolution-evidence:runtime-continuity-renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'devtools-full-cross-modal-lock-scroll-target',
    file: './performance-visualizer-evidence-scroll-target.test.ts',
    snippets: [
      'returns a concrete cross-modal-lock runtime evidence target for the full lock continuity phase line',
      'line: \'bodyContinuityPhase: full-cross-modal-lock\'',
      'toBe(\'self-evolution-evidence:runtime-continuity-full-cross-modal-lock\')',
    ],
  },
] as const

describe('performance visualizer same-her evidence navigation audit', () => {
  it('keeps one explicit route-level proof that devtools same-her closure navigation lands on concrete evidence instead of stopping at generic panels', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'devtools-body-only-runtime-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-audible-body-speech-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-body-carried-runtime-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-full-cross-modal-lock-runtime-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-voice-lipsync-speech-authority-navigation' }),
      expect.objectContaining({ entry: 'devtools-voice-only-speech-observability-navigation' }),
      expect.objectContaining({ entry: 'devtools-renderer-rejoin-without-body-runtime-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-full-cross-modal-lock-scroll-target' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the devtools same-her navigation claim to current behavior tests instead of only broader embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: devtools now needs dedicated same-her evidence navigation proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const closureNavigationSource = readFileSync(new URL('./performance-visualizer-closure-navigation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Cross-modal embodiment-facing proof is still weaker than the core text/runtime proof under long-run noisy use')
    expect(matrixSource).toContain('performance-visualizer-same-her-evidence-navigation-audit.test.ts')
    expect(matrixSource).toContain('full-cross-modal-lock runtime continuity lock evidence')
    expect(matrixSource).toContain('audible-body speech observability evidence')
    expect(matrixSource).toContain('voice-lipsync speech authority evidence')
    expect(matrixSource).toContain('voice-only speech observability evidence')
    expect(matrixSource).toContain('renderer-rejoin-without-body runtime continuity audit evidence')
    expect(matrixSource).toContain('It still needs stronger sustained proof across longer-lived desktop runs and more organic cross-modal drift.')
    expect(closureNavigationSource).toContain(
      'routes full-cross-modal-lock same-her continuity diagnostics into concrete runtime continuity lock evidence before stopping at the broader runtime continuity panel',
    )
    expect(closureNavigationSource).toContain(
      'routes voice-lipsync same-her continuity diagnostics into concrete speech authority evidence before stopping at abstract renderer authority panels',
    )
    expect(closureNavigationSource).toContain(
      'routes voice-only same-her continuity diagnostics into concrete speech observability evidence before stopping at abstract renderer authority panels',
    )
    expect(closureNavigationSource).toContain(
      'routes renderer-rejoin-without-body same-her continuity diagnostics into concrete runtime continuity audit evidence before stopping at abstract renderer authority panels',
    )
  })
})
