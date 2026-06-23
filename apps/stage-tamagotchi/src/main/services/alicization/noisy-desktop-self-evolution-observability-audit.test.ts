import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-continuity-same-her-observability',
    file: '../../../renderer/pages/devtools/performance-visualizer-runtime-continuity-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime continuity projection preserves canonical same-her embodiment closure truth on the devtools surface',
      'runtime continuity projection same-her lock wording',
      'renderer-rejoin-without-body drift risk',
    ],
  },
  {
    entry: 'evidence-navigation-concrete-self-evolution-targets',
    file: '../../../renderer/pages/devtools/performance-visualizer-same-her-evidence-navigation-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that devtools same-her closure navigation lands on concrete evidence instead of stopping at generic panels',
      'full-cross-modal-lock runtime continuity lock evidence',
      'renderer-rejoin-without-body runtime continuity audit evidence',
    ],
  },
  {
    entry: 'diagnostic-summary-project-brief-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that top-level self-evolution diagnostic summaries preserve same-her continuity truth on the devtools surface',
      'project identity, Phase 1 route, and unresolved closure carry',
      'renderer-rejoin-without-body drift risk',
    ],
  },
  {
    entry: 'triage-routing-project-state-and-body-continuity',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution triage cards preserve same-her continuity routing on the devtools surface',
      'project-state continuity branch',
      'renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'focus-history-summary-project-state-replay',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution focus history summary preserves same-her embodiment replay semantics on the devtools surface',
      'project-state continuity history summary',
      'first-check',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
    ],
  },
  {
    entry: 'focus-history-drilldown-project-state-replay',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution focus history drilldown preserves same-her embodiment replay diagnostics on the devtools surface',
      'project-state continuity history drilldown',
      'first-check',
      'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
    ],
  },
  {
    entry: 'repair-closure-baseline-boundaries',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair closure preserves same-her project-state relationship cadence and embodiment baseline semantics on the devtools surface',
      'project-state continuity governance',
      'speech authority rejoin',
    ],
  },
] as const

describe('noisy desktop self-evolution observability audit', () => {
  it('keeps one explicit long-run proof fragment that noisy-desktop self-evolution observability still stays on one same-her project line across runtime continuity, evidence navigation, summary carry, triage routing, and repair closure', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-continuity-same-her-observability' }),
      expect.objectContaining({ entry: 'evidence-navigation-concrete-self-evolution-targets' }),
      expect.objectContaining({ entry: 'diagnostic-summary-project-brief-carry' }),
      expect.objectContaining({ entry: 'triage-routing-project-state-and-body-continuity' }),
      expect.objectContaining({ entry: 'focus-history-summary-project-state-replay' }),
      expect.objectContaining({ entry: 'focus-history-drilldown-project-state-replay' }),
      expect.objectContaining({ entry: 'repair-closure-baseline-boundaries' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the noisy-desktop self-evolution observability claim to current cold audits instead of only broader convergence prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: noisy-desktop self-evolution observability is now compressed into one devtools same-her proof line, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('noisy-desktop self-evolution observability chain')
    expect(matrixSource).toContain('performance-visualizer-runtime-continuity-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-same-her-evidence-navigation-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-focus-history-drilldown-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('history replay')
    expect(matrixSource).toContain('first-check')
    expect(matrixSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('noisy-desktop self-evolution observability chain')
    expect(auditSource).toContain('runtime continuity, evidence navigation, summary carry, history replay, triage routing, and repair closure')
    expect(auditSource).toContain('first-check')
    expect(auditSource).toContain('Project identity carry -> Phase 1 route carry -> Unresolved closure carry')
  })
})
