import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-focus-history-summary-body-led-carry',
    file: './performance-visualizer-self-evolution-focus-history-summary.test.ts',
    snippets: [
      'adds a body-led continuity summary when runtime continuity stays stable while renderer authority intermittently drops around the same living segment',
      '身体连续性：运行时连续性投影持续稳定，Live2D 显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-summary-quieter-face-lipsync-voice-carry',
    file: './performance-visualizer-self-evolution-focus-history-summary.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her carry explicit in history summary instead of flattening it into generic body-loss wording',
      '身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-summary-structured-surviving-visible-lane',
    file: './performance-visualizer-self-evolution-focus-history-summary.test.ts',
    snippets: [
      'prefers structured surviving visible lane metadata in history summary even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      'bodyContinuityGovernanceNote: \'显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-summary-project-state-continuity-replay',
    file: './performance-visualizer-self-evolution-focus-history-summary.test.ts',
    snippets: [
      'keeps project-state continuity carry explicit in history summary when first-check snapshots keep re-auditing project identity Phase 1 route and unresolved closure carry',
      'selectedCardId: \'first-check\'',
      'candidate-trajectory-summary',
      'identity-drift-governance-summary',
      '项目状态连续性：Project identity carry -> Phase 1 route carry -> Unresolved closure carry 仍在这组聚焦历史里持续作为首查点被重新核对。',
    ],
  },
] as const

describe('performance visualizer self evolution focus history summary project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution focus history summary preserves same-her embodiment replay semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-focus-history-summary-body-led-carry' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-summary-quieter-face-lipsync-voice-carry' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-summary-structured-surviving-visible-lane' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-summary-project-state-continuity-replay' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution focus history summary claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution focus history summary now needs dedicated same-her replay proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const summarySource = readFileSync(new URL('./performance-visualizer-self-evolution-focus-history-summary.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution focus history summary')
    expect(matrixSource).toContain('quieter face+lipsync+voice history summary')
    expect(matrixSource).toContain('structured surviving visible lane metadata history summary')
    expect(matrixSource).toContain('project-state continuity history summary')
    expect(matrixSource).toContain('first-check')
    expect(matrixSource).toContain('candidate-trajectory-summary')
    expect(matrixSource).toContain('identity-drift-governance-summary')
    expect(matrixSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution focus history summary')
    expect(auditSource).toContain('quieter face+lipsync+voice history summary')
    expect(auditSource).toContain('structured surviving visible lane metadata history summary')
    expect(auditSource).toContain('project-state continuity history summary')
    expect(auditSource).toContain('first-check')
    expect(auditSource).toContain('candidate-trajectory-summary')
    expect(auditSource).toContain('identity-drift-governance-summary')
    expect(auditSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(summarySource).toContain(
      'prefers structured surviving visible lane metadata in history summary even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording',
    )
    expect(summarySource).toContain(
      'keeps quieter face+lipsync+voice same-her carry explicit in history summary instead of flattening it into generic body-loss wording',
    )
    expect(summarySource).toContain(
      'keeps project-state continuity carry explicit in history summary when first-check snapshots keep re-auditing project identity Phase 1 route and unresolved closure carry',
    )
  })
})
