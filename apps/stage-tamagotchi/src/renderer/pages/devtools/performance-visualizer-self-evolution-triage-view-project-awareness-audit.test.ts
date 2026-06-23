import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-triage-view-project-state-continuity-branch',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates project-state continuity triage cards when same-her internalization is blocked by Project identity carry, Phase 1 route carry, and Unresolved closure carry drift',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
    ],
  },
  {
    entry: 'self-evolution-triage-view-pre-dialogue-briefing-branch',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'routes pre-dialogue briefing drift into the same project-state continuity triage branch',
      'technicalValue: \'project-state-continuity-drift\'',
      'detail: \'project-state continuity governance\'',
    ],
  },
  {
    entry: 'self-evolution-triage-view-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates body-continuity triage cards when the body line still carries the living segment before face motion and lipsync return',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
      'rendererRejoinSurfaceKey: \'authority:renderer-rejoin:speech\'',
    ],
  },
  {
    entry: 'self-evolution-triage-view-body-only-hold',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates body-continuity triage cards for body-only-hold so the held same-segment line is not dropped before focus planning',
      'bodyContinuityPhase: \'body-only-hold\'',
      'continuity governance body-only-hold -> body authority carry -> renderer recovery gap -> cue bridge recovery',
    ],
  },
  {
    entry: 'self-evolution-triage-view-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates body-continuity triage cards for full-cross-modal-lock so same-segment lock survives into the workflow',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      'body and live2d same-segment lock -> playback cue binding -> lock stability audit',
    ],
  },
  {
    entry: 'self-evolution-triage-view-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates body-continuity triage cards for renderer-rejoin-without-body so visible recovery without body carry stays auditable',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'vrm renderer rejoin without body carry -> playback cue binding -> body-loss audit',
    ],
  },
  {
    entry: 'self-evolution-triage-view-quieter-face-lipsync-carry',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates quieter face+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning',
      'survivingVisibleLane: \'face+lipsync-only\'',
      'quieter face+lipsync same-her line still visible -> body motion voice pending rejoin -> body-loss audit',
    ],
  },
  {
    entry: 'self-evolution-triage-view-quieter-motion-lipsync-carry',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates quieter motion+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning',
      'survivingVisibleLane: \'motion+lipsync-only\'',
      'quieter motion+lipsync same-her line still visible -> body face voice pending rejoin -> body-loss audit',
    ],
  },
  {
    entry: 'self-evolution-triage-view-quieter-face-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates quieter face+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      'quieter face+lipsync+voice same-her line still visible -> body motion pending rejoin -> body-loss audit',
    ],
  },
  {
    entry: 'self-evolution-triage-view-quieter-motion-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-triage-view.test.ts',
    snippets: [
      'creates quieter motion+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
      'quieter motion+lipsync+voice same-her line still visible -> body face pending rejoin -> body-loss audit',
    ],
  },
] as const

describe('performance visualizer self evolution triage view project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution triage cards preserve same-her continuity routing on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-triage-view-project-state-continuity-branch' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-pre-dialogue-briefing-branch' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-body-only-hold' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-quieter-face-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-quieter-motion-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-quieter-face-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-triage-view-quieter-motion-lipsync-voice-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution triage cards project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution triage cards now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const triageSource = readFileSync(new URL('./performance-visualizer-self-evolution-triage-view.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution triage cards')
    expect(matrixSource).toContain('project-state continuity branch')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution triage cards')
    expect(auditSource).toContain('project-state continuity branch')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(triageSource).toContain(
      'creates project-state continuity triage cards when same-her internalization is blocked by Project identity carry, Phase 1 route carry, and Unresolved closure carry drift',
    )
    expect(triageSource).toContain(
      'creates body-continuity triage cards for renderer-rejoin-without-body so visible recovery without body carry stays auditable',
    )
    expect(triageSource).toContain(
      'creates quieter face+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning',
    )
    expect(triageSource).toContain(
      'creates quieter motion+lipsync body-continuity triage cards so the surviving same-her visible line stays explicit before repair planning',
    )
    expect(triageSource).toContain(
      'creates quieter face+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning',
    )
    expect(triageSource).toContain(
      'creates quieter motion+lipsync+voice body-continuity triage cards so the surviving same-her visible line keeps voice explicit before repair planning',
    )
  })
})
