import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-focus-history-drilldown-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-focus-history-drilldown.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body explicit in drilldown lead lines instead of narrating it as body-led rejoin',
      '身体连续性：当前已进入显形回接失身态，VRM 显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，不应把这次可见恢复误写成同一条身体线上的可信补回。',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-drilldown-quieter-motion-lipsync-voice',
    file: './performance-visualizer-self-evolution-focus-history-drilldown.test.ts',
    snippets: [
      'keeps quieter motion+lipsync+voice same-her carry explicit in drilldown lead lines instead of flattening it into generic body-loss wording',
      '身体连续性：当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线，不应把这次 quieter carry 误写成同一条身体线上的可信补回。',
      'bodyContinuityGovernanceNote: \'当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-drilldown-structured-surviving-visible-lane',
    file: './performance-visualizer-self-evolution-focus-history-drilldown.test.ts',
    snippets: [
      'prefers structured surviving visible lane metadata in drilldown lead lines even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording',
      'survivingVisibleLane: \'face+lipsync+voice-only\'',
      'bodyContinuityGovernanceNote: \'显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment。\'',
    ],
  },
  {
    entry: 'self-evolution-focus-history-drilldown-project-state-continuity-replay',
    file: './performance-visualizer-self-evolution-focus-history-drilldown.test.ts',
    snippets: [
      'keeps project-state continuity explicit in drilldown lead lines when a transition re-anchors history replay on first-check project carry instead of flattening it into generic same-her drift',
      'selectedCardId: \'first-check\'',
      'candidate-trajectory-summary',
      'identity-drift-governance-summary',
      '项目状态连续性：当前仍在首查 Project identity carry -> Phase 1 route carry -> Unresolved closure carry，不应把这次转移误写成普通 same-her 漂移。',
    ],
  },
] as const

describe('performance visualizer self evolution focus history drilldown project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution focus history drilldown preserves same-her embodiment replay diagnostics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-focus-history-drilldown-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-drilldown-quieter-motion-lipsync-voice' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-drilldown-structured-surviving-visible-lane' }),
      expect.objectContaining({ entry: 'self-evolution-focus-history-drilldown-project-state-continuity-replay' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution focus history drilldown claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution focus history drilldown now needs dedicated same-her replay proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const drilldownSource = readFileSync(new URL('./performance-visualizer-self-evolution-focus-history-drilldown.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution focus history drilldown')
    expect(matrixSource).toContain('quieter motion+lipsync+voice history drilldown')
    expect(matrixSource).toContain('structured surviving visible lane metadata history drilldown')
    expect(matrixSource).toContain('project-state continuity history drilldown')
    expect(matrixSource).toContain('first-check')
    expect(matrixSource).toContain('candidate-trajectory-summary')
    expect(matrixSource).toContain('identity-drift-governance-summary')
    expect(matrixSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution focus history drilldown')
    expect(auditSource).toContain('quieter motion+lipsync+voice history drilldown')
    expect(auditSource).toContain('structured surviving visible lane metadata history drilldown')
    expect(auditSource).toContain('project-state continuity history drilldown')
    expect(auditSource).toContain('first-check')
    expect(auditSource).toContain('candidate-trajectory-summary')
    expect(auditSource).toContain('identity-drift-governance-summary')
    expect(auditSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(drilldownSource).toContain(
      'prefers structured surviving visible lane metadata in drilldown lead lines even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording',
    )
    expect(drilldownSource).toContain(
      'keeps quieter motion+lipsync+voice same-her carry explicit in drilldown lead lines instead of flattening it into generic body-loss wording',
    )
    expect(drilldownSource).toContain(
      'keeps project-state continuity explicit in drilldown lead lines when a transition re-anchors history replay on first-check project carry instead of flattening it into generic same-her drift',
    )
  })
})
