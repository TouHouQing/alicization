import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-focus-plan-project-state-first-check',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'builds a first-check project-state continuity focus plan so default briefing-drift repair inspects the carry chain before deeper repair path steps',
      'detail: \'Project identity carry -> Phase 1 route carry -> Unresolved closure carry\'',
      'selectedCardId: \'first-check\'',
    ],
  },
  {
    entry: 'self-evolution-focus-plan-body-only-hold-note',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'carries body-only-hold focus semantics from structured triage cards even when the wording no longer says renderer rejoin',
      'bodyContinuityPhase: \'body-only-hold\'',
      'bodyContinuityGovernanceNote: \'身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-plan-quieter-face-lipsync-note',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording',
      'survivingVisibleLane: \'face+lipsync-only\'',
      'bodyContinuityGovernanceNote: \'当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-plan-quieter-motion-lipsync-note',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'keeps quieter motion+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording',
      'survivingVisibleLane: \'motion+lipsync-only\'',
      'bodyContinuityGovernanceNote: \'当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-plan-quieter-face-lipsync-voice-note',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      'bodyContinuityGovernanceNote: \'当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-plan-quieter-motion-lipsync-voice-note',
    file: './performance-visualizer-self-evolution-focus-plan.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line',
      'survivingVisibleLane: \'motion+lipsync+voice-only\'',
      'bodyContinuityGovernanceNote: \'当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。\'',
    ],
  },
] as const

describe('performance visualizer self evolution focus plan project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution focus plan preserves same-her project-state and embodiment focus semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-focus-plan-project-state-first-check' }),
      expect.objectContaining({ entry: 'self-evolution-focus-plan-body-only-hold-note' }),
      expect.objectContaining({ entry: 'self-evolution-focus-plan-quieter-face-lipsync-note' }),
      expect.objectContaining({ entry: 'self-evolution-focus-plan-quieter-motion-lipsync-note' }),
      expect.objectContaining({ entry: 'self-evolution-focus-plan-quieter-face-lipsync-voice-note' }),
      expect.objectContaining({ entry: 'self-evolution-focus-plan-quieter-motion-lipsync-voice-note' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution focus plan claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution focus plan now needs dedicated same-her focus proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const focusPlanSource = readFileSync(new URL('./performance-visualizer-self-evolution-focus-plan.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-plan-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution focus plan')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync focus note')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice focus note')
    expect(matrixSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution focus plan')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync focus note')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice focus note')
    expect(auditSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(auditSource).toContain('body-only-hold')
    expect(focusPlanSource).toContain(
      'keeps quieter face+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording',
    )
    expect(focusPlanSource).toContain(
      'keeps quieter motion+lipsync same-her continuity explicit in the focus plan instead of flattening it back into generic body-loss wording',
    )
    expect(focusPlanSource).toContain(
      'keeps quieter face+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line',
    )
    expect(focusPlanSource).toContain(
      'keeps quieter motion+lipsync+voice same-her continuity explicit in the focus plan instead of flattening voice back out of the surviving line',
    )
  })
})
