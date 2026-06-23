import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-active-workflow-focus-project-state-continuity',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps project-state continuity workflow focus explicit instead of flattening it into generic same-her drift wording',
      'repairOwnerHint: \'项目状态连续性治理\'',
      '\'identity-drift-governance-summary\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-body-carried-rejoin-phase',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps body-carried renderer rejoin workflow focus explicit so repair-session can stay on the same living segment instead of treating it as prosody-only drift',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
      'rendererRejoinSurfaceKey: \'authority:renderer-rejoin:speech\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-quieter-face-lipsync-carry',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her carry explicit in active workflow focus so repair-session can keep body motion and voice as pending rejoin lanes',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'survivingVisibleLane: \'face+lipsync-only\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-quieter-motion-lipsync-carry',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps quieter motion+lipsync same-her carry explicit in active workflow focus so repair-session can keep body face and voice as pending rejoin lanes',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'survivingVisibleLane: \'motion+lipsync-only\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-quieter-face-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and motion as pending rejoin lanes without dropping voice',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-quieter-motion-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and face as pending rejoin lanes without dropping voice',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
    ],
  },
  {
    entry: 'self-evolution-active-workflow-focus-full-cross-modal-lock-phase',
    file: './performance-visualizer-self-evolution-active-workflow-focus.test.ts',
    snippets: [
      'keeps full-cross-modal-lock workflow focus explicit so stable body plus renderer lock is not flattened into a generic renderer drift follow-up',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      'rendererTarget: \'live2d\'',
    ],
  },
] as const

describe('performance visualizer self evolution active workflow focus project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution active workflow focus preserves same-her project-state and body continuity focus on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-project-state-continuity' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-body-carried-rejoin-phase' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-quieter-face-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-quieter-motion-lipsync-carry' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-quieter-face-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-quieter-motion-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-active-workflow-focus-full-cross-modal-lock-phase' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution active workflow focus claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution active workflow focus now needs dedicated same-her routing proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const focusSource = readFileSync(new URL('./performance-visualizer-self-evolution-active-workflow-focus.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution active workflow focus')
    expect(matrixSource).toContain('project-state continuity workflow focus')
    expect(matrixSource).toContain('body-carried renderer rejoin')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution active workflow focus')
    expect(auditSource).toContain('project-state continuity workflow focus')
    expect(auditSource).toContain('body-carried renderer rejoin')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(focusSource).toContain(
      'keeps body-carried renderer rejoin workflow focus explicit so repair-session can stay on the same living segment instead of treating it as prosody-only drift',
    )
    expect(focusSource).toContain(
      'keeps quieter face+lipsync same-her carry explicit in active workflow focus so repair-session can keep body motion and voice as pending rejoin lanes',
    )
    expect(focusSource).toContain(
      'keeps quieter motion+lipsync same-her carry explicit in active workflow focus so repair-session can keep body face and voice as pending rejoin lanes',
    )
    expect(focusSource).toContain(
      'keeps quieter face+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and motion as pending rejoin lanes without dropping voice',
    )
    expect(focusSource).toContain(
      'keeps quieter motion+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and face as pending rejoin lanes without dropping voice',
    )
    expect(focusSource).toContain(
      'keeps full-cross-modal-lock workflow focus explicit so stable body plus renderer lock is not flattened into a generic renderer drift follow-up',
    )
  })
})
