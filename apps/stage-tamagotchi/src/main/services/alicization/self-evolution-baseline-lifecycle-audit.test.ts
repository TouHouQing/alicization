import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'repair-session-project-aware-checkpoint',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair session preserves same-her project-state and embodiment repair semantics on the devtools surface',
      'project identity, Phase 1 route, and unresolved open loops',
      'renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'repair-outcome-closure-result-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair outcome preserves same-her project-state and embodiment closure-result semantics on the devtools surface',
      'project-state continuity governance',
      'relationship cadence callback-line 闭环已确认。',
      'speech authority rejoin',
    ],
  },
  {
    entry: 'baseline-quality-trust-boundary',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline quality preserves same-her project-state and embodiment baseline-trust semantics on the devtools surface',
      'same-turn-if-invited measured-return',
      'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可作为更克制的关系节律基线的一部分。',
      'renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'repair-next-action-followup-boundary',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair next action preserves same-her project-state and embodiment follow-up semantics on the devtools surface',
      'takeover-audit',
      'relationship cadence 治理已经再次得到验证，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上。请抓取新的基线快照，让下一次连续性会话从这次更克制的关系节律承接重新开始，而不是把它当成一段重新外放的靠近。',
      'body-only-hold',
    ],
  },
  {
    entry: 'baseline-adoption-long-term-anchor',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline adoption preserves same-her project-state relationship cadence and embodiment baseline-adoption semantics on the devtools surface',
      'same-her continuity baseline',
      'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      'renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'baseline-record-life-history-writeback',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline adoption record preserves same-her project-state relationship cadence and embodiment baseline record semantics on the devtools surface',
      'captures a restrained callback-line cadence note when the adopted baseline stays on same-turn-if-invited measured-return',
      'same-her continuity governance note',
      'renderer-rejoin-without-body',
    ],
  },
] as const

describe('self evolution baseline lifecycle audit', () => {
  it('keeps one explicit same-her proof chain that self-evolution baseline lifecycle stays on one project-aware line from repair session through baseline record writeback', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'repair-session-project-aware-checkpoint' }),
      expect.objectContaining({ entry: 'repair-outcome-closure-result-carry' }),
      expect.objectContaining({ entry: 'baseline-quality-trust-boundary' }),
      expect.objectContaining({ entry: 'repair-next-action-followup-boundary' }),
      expect.objectContaining({ entry: 'baseline-adoption-long-term-anchor' }),
      expect.objectContaining({ entry: 'baseline-record-life-history-writeback' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution baseline lifecycle claim to current cold audits instead of only broader devtools convergence prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution baseline lifecycle is now compressed into one project-aware same-her line, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution baseline lifecycle chain')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution baseline lifecycle chain now also keeps restrained callback-line cadence carry explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution baseline lifecycle chain')
    expect(auditSource).toContain('self-evolution baseline lifecycle chain now also keeps restrained callback-line cadence carry explicit')
    expect(auditSource).toContain('repair-session carry, closure-result settlement, baseline-trust judgment, next-action guidance, baseline adoption, and baseline-record writeback')
  })
})
