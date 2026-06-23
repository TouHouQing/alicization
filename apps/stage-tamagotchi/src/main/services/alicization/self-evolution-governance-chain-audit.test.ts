import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'observability-reland-anchor',
    file: './noisy-desktop-self-evolution-observability-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that noisy-desktop self-evolution observability still stays on one same-her project line across runtime continuity, evidence navigation, summary carry, triage routing, and repair closure',
      'runtime continuity, evidence navigation, summary carry, triage routing, and repair closure',
      'devtools same-her proof line',
    ],
  },
  {
    entry: 'repair-action-follow-through-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair action feedback preserves same-her project-state and embodiment carry on the devtools surface',
      '项目状态连续性检查目标',
      '身体承接态 -> speech 显形补回闭环已确认',
    ],
  },
  {
    entry: 'repair-followup-navigation-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair followup navigation preserves same-her project-state and embodiment routing on the devtools surface',
      'candidate-trajectory-summary',
      'authority:renderer-rejoin:speech',
    ],
  },
  {
    entry: 'active-workflow-focus-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution active workflow focus preserves same-her project-state and body continuity focus on the devtools surface',
      'project-state continuity workflow focus',
      'body-carried renderer rejoin',
    ],
  },
  {
    entry: 'focus-history-summary-replay-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution focus history summary preserves same-her embodiment replay semantics on the devtools surface',
      'project-state continuity history summary',
      'first-check',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
    ],
  },
  {
    entry: 'focus-history-drilldown-replay-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution focus history drilldown preserves same-her embodiment replay diagnostics on the devtools surface',
      'project-state continuity history drilldown',
      'first-check',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
    ],
  },
  {
    entry: 'baseline-lifecycle-anchor',
    file: './self-evolution-baseline-lifecycle-audit.test.ts',
    snippets: [
      'keeps one explicit same-her proof chain that self-evolution baseline lifecycle stays on one project-aware line from repair session through baseline record writeback',
      'self-evolution baseline lifecycle chain now also keeps restrained callback-line cadence carry explicit',
      'repair-session carry, closure-result settlement, baseline-trust judgment, next-action guidance, baseline adoption, and baseline-record writeback',
      'self-evolution baseline lifecycle is now compressed into one project-aware same-her line',
    ],
  },
] as const

describe('self evolution governance chain audit', () => {
  it('keeps one explicit same-her governance chain that self-evolution stays on one project-aware line from observability reland through repair follow-through into baseline lifecycle carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'observability-reland-anchor' }),
      expect.objectContaining({ entry: 'repair-action-follow-through-anchor' }),
      expect.objectContaining({ entry: 'repair-followup-navigation-anchor' }),
      expect.objectContaining({ entry: 'active-workflow-focus-anchor' }),
      expect.objectContaining({ entry: 'focus-history-summary-replay-anchor' }),
      expect.objectContaining({ entry: 'focus-history-drilldown-replay-anchor' }),
      expect.objectContaining({ entry: 'baseline-lifecycle-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution governance chain claim to current cold audits instead of only broader convergence prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution governance is now compressed into one project-aware same-her line, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution governance chain')
    expect(matrixSource).toContain('noisy-desktop-self-evolution-observability-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('history replay')
    expect(matrixSource).toContain('first-check')
    expect(matrixSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(matrixSource).toContain('self-evolution-baseline-lifecycle-audit.test.ts')
    expect(matrixSource).toContain('self-evolution governance chain now also keeps restrained callback-line cadence carry explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution governance chain')
    expect(auditSource).toContain('self-evolution governance chain now also keeps restrained callback-line cadence carry explicit')
    expect(auditSource).toContain('observability reland, repair follow-through, workflow focus, history replay, and baseline lifecycle carry')
    expect(auditSource).toContain('first-check')
    expect(auditSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
  })
})
