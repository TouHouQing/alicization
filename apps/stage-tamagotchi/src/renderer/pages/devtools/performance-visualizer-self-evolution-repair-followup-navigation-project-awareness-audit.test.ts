import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-followup-navigation-body-rejoin-surface',
    file: './performance-visualizer-self-evolution-repair-followup-navigation.test.ts',
    snippets: [
      'keeps body continuity follow-up on the overridden trace timeline surface while still scrolling to the concrete evidence panel',
      'activeSurfaceKey: \'authority:renderer-rejoin:live2d\'',
      'scrollTargetId: \'self-evolution-authority:live2d-comparison\'',
    ],
  },
  {
    entry: 'self-evolution-repair-followup-navigation-project-identity-evidence',
    file: './performance-visualizer-self-evolution-repair-followup-navigation.test.ts',
    snippets: [
      'relands project-identity carry on candidate-trajectory evidence so same-her project-state repair does not fall back to generic runtime continuity',
      'activeSurfaceKey: \'evidence:candidate-trajectory-summary\'',
      'scrollTargetId: \'self-evolution-evidence:candidate-trajectory-summary\'',
    ],
  },
  {
    entry: 'self-evolution-repair-followup-navigation-current-phase-governance-evidence',
    file: './performance-visualizer-self-evolution-repair-followup-navigation.test.ts',
    snippets: [
      'relands current-phase carry on identity-governance evidence so Phase 1 route drift stays on a concrete project-state panel',
      'activeSurfaceKey: \'evidence:identity-drift-governance-summary\'',
      'scrollTargetId: \'self-evolution-evidence:identity-drift-governance-summary\'',
    ],
  },
  {
    entry: 'self-evolution-repair-followup-navigation-speech-rejoin-surface',
    file: './performance-visualizer-self-evolution-repair-followup-navigation.test.ts',
    snippets: [
      'keeps speech renderer rejoin follow-up on the authority surface while scrolling to the concrete speech hotspots panel',
      'activeSurfaceKey: \'authority:renderer-rejoin:speech\'',
      'scrollTargetId: \'self-evolution-authority:speech-hotspots\'',
    ],
  },
] as const

describe('performance visualizer self evolution repair followup navigation project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair followup navigation preserves same-her project-state and embodiment routing on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-followup-navigation-body-rejoin-surface' }),
      expect.objectContaining({ entry: 'self-evolution-repair-followup-navigation-project-identity-evidence' }),
      expect.objectContaining({ entry: 'self-evolution-repair-followup-navigation-current-phase-governance-evidence' }),
      expect.objectContaining({ entry: 'self-evolution-repair-followup-navigation-speech-rejoin-surface' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair followup navigation claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair followup navigation now needs dedicated same-her routing proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const followupSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-followup-navigation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair followup navigation')
    expect(matrixSource).toContain('candidate-trajectory-summary')
    expect(matrixSource).toContain('identity-drift-governance-summary')
    expect(matrixSource).toContain('authority:renderer-rejoin:speech')
    expect(matrixSource).toContain('speech-hotspots')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair followup navigation')
    expect(auditSource).toContain('candidate-trajectory-summary')
    expect(auditSource).toContain('identity-drift-governance-summary')
    expect(auditSource).toContain('authority:renderer-rejoin:speech')
    expect(auditSource).toContain('speech-hotspots')
    expect(followupSource).toContain(
      'relands project-identity carry on candidate-trajectory evidence so same-her project-state repair does not fall back to generic runtime continuity',
    )
    expect(followupSource).toContain(
      'keeps speech renderer rejoin follow-up on the authority surface while scrolling to the concrete speech hotspots panel',
    )
  })
})
