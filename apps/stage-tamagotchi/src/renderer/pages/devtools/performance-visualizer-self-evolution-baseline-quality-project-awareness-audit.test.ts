import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-baseline-quality-provisional-unresolved-signal',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'flags the baseline as provisional when unresolved continuity signals remain',
      'verdict: \'provisional\'',
      '韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-stale-anchor',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'flags the baseline as stale when the latest snapshot does not move past the previous anchor',
      'verdict: \'stale\'',
      '请先抓取新的修复后快照，再替换连续性锚点。',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-same-her-governance',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'trusts a baseline when same-her continuity governance has been freshly re-confirmed without unresolved signals',
      'same-her 连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
      'candidateId: \'candidate-governance-2\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-project-state-governance',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'trusts a baseline when project-state continuity governance has been freshly re-confirmed without unresolved signals',
      '项目状态连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
      'candidateId: \'candidate-project-state-2\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-relationship-cadence-restrained',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'keeps invited measured-return cadence as a restrained baseline support line instead of broadening it into a generic long-term relationship baseline',
      'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可作为更克制的关系节律基线的一部分。',
      'candidateId: \'candidate-callback-5\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-speech-authority-rejoin',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'trusts a baseline when speech authority rejoin has been freshly re-confirmed without unresolved signals',
      '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可作为长期基线的一部分。',
      'candidateId: \'candidate-body-speech-2\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'trusts a baseline when cross-modal lock has been freshly re-confirmed without unresolved signals',
      '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-quality-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-baseline-quality.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body visible as an audit-only baseline support line instead of trusted body carry wording',
      '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
    ],
  },
] as const

describe('performance visualizer self evolution baseline quality project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution baseline quality preserves same-her project-state and embodiment baseline-trust semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-provisional-unresolved-signal' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-stale-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-same-her-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-project-state-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-relationship-cadence-restrained' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-speech-authority-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-quality-renderer-rejoin-without-body' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution baseline quality claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution baseline quality now needs dedicated same-her baseline-trust proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const qualitySource = readFileSync(new URL('./performance-visualizer-self-evolution-baseline-quality.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution baseline quality')
    expect(matrixSource).toContain('same-her continuity governance')
    expect(matrixSource).toContain('project-state continuity governance')
    expect(matrixSource).toContain('same-turn-if-invited measured-return')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('speech authority rejoin')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution baseline quality')
    expect(auditSource).toContain('same-her continuity governance')
    expect(auditSource).toContain('project-state continuity governance')
    expect(auditSource).toContain('same-turn-if-invited measured-return')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('speech authority rejoin')
    expect(qualitySource).toContain(
      'trusts a baseline when same-her continuity governance has been freshly re-confirmed without unresolved signals',
    )
    expect(qualitySource).toContain(
      'keeps renderer-rejoin-without-body visible as an audit-only baseline support line instead of trusted body carry wording',
    )
  })
})
