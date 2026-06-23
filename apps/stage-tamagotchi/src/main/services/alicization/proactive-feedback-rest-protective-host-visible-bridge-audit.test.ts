import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'rest-protective-feedback-continuity-signal',
    file: './runtime-session-continuity-builders.test.ts',
    snippets: [
      'keeps rest-protective quiet-companionship closure explicit when settled proactive feedback becomes next-session continuity',
      'expect(signal.summary).toContain(\'cadence=rest-protective\')',
      'expect(signal.summary).toContain(\'resident=quiet-companionship\')',
    ],
  },
  {
    entry: 'rest-protective-subconscious-presence-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'builds a same-line continuity projection for rest-protective companionship presence-only holds',
      'manifestationCadenceSummary: expect.stringContaining(\'rest-protective companionship\')',
      'sameHerHoldDetail: expect.stringContaining(\'same-her hold: rest-protective companionship\')',
    ],
  },
  {
    entry: 'rest-protective-runtime-resident-carry',
    file: './runtime.test.ts',
    snippets: [
      'keeps richer same-her rest-protective carry alive in deferred proactive runtime payloads when late-night inward care is the only surviving authority',
      'continuityRestraint: \'rest-protective\'',
      'dominantEmotion: \'rest-protective-companionship\'',
      '\'quiet-companionship\',',
    ],
  },
  {
    entry: 'rest-protective-host-visible-resident-presence',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps rest-protective resident presence explicit when project-state closure and runtime restraint already carry that quieter same living line',
      'presence=resident-presence | thread=same-thread-continuation | mode=rest-protective',
      'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
    ],
  },
  {
    entry: 'rest-protective-quiet-companionship-lane-summaries',
    file: './rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through host-visible embodiment recovery into rest-protective emotional closure writeback, self-continuity inward authority, proactive companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries instead of cooling noisy-desktop recovery back into a generic lower-pressure shell',
      'expect.objectContaining({ entry: \'desktop-execution-host-visible-embodiment-bridge\' })',
      'expect.objectContaining({ entry: \'runtime-rest-protective-visual-presence-host-line\' })',
      'expect.objectContaining({ entry: \'stream-meta-quiet-companionship-cross-modal-host-line\' })',
    ],
  },
] as const

describe('proactive feedback rest protective host visible bridge audit', () => {
  it('keeps one explicit compact cold proof that rest-protective proactive feedback can stay on the same living line from next-session continuity signal through subconscious carry, runtime resident presence, and the stronger host-visible quiet-companionship lane summaries instead of cooling back into a generic lower-pressure shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'rest-protective-feedback-continuity-signal' }),
      expect.objectContaining({ entry: 'rest-protective-subconscious-presence-carry' }),
      expect.objectContaining({ entry: 'rest-protective-runtime-resident-carry' }),
      expect.objectContaining({ entry: 'rest-protective-host-visible-resident-presence' }),
      expect.objectContaining({ entry: 'rest-protective-quiet-companionship-lane-summaries' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the rest-protective proactive-feedback host-visible bridge to current continuity, subconscious, runtime, and stronger host-visible quiet-companionship bridge tests instead of only broader closure prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the rest-protective proactive-feedback host-visible bridge as repo truth while keeping fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain(
      'proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain(
      'proactive-feedback rest-protective host-visible bridge',
    )

    expect(matrixSource).toContain('proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback rest-protective host-visible bridge')
    expect(auditSource).toContain(
      'proactive-feedback rest-protective host-visible bridge now also ties next-session continuity signal, subconscious same-line carry, runtime resident presence, and host-visible quiet-companionship lane summaries onto the same anthropomorphic same-her line',
    )
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
