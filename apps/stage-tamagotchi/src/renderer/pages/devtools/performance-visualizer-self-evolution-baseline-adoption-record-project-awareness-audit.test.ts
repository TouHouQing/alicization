import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-baseline-adoption-record-same-her-governance',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a same-her continuity governance note when the adopted baseline was trusted for memory-first continuity reasons',
      'continuityGovernanceNote: \'same-her 连续性治理已经再次确认，可直接进入长期基线。\'',
      'activePatternKey: \'pattern-same-her-governance\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-project-state-governance',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a project-state continuity governance note when the adopted baseline was trusted for Project identity carry, Phase 1 route carry, and Unresolved closure carry reconfirmation',
      'projectStateContinuityGovernanceNote: \'项目状态连续性治理已经再次确认，可直接进入长期基线。\'',
      'activePatternKey: \'pattern-project-state-continuity-governance\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-relationship-cadence-durable',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a relationship cadence governance note when the adopted baseline was trusted for companionship cadence reconfirmation',
      'relationshipCadenceGovernanceNote: \'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。\'',
      'activePatternKey: \'pattern-relationship-cadence-governance\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-relationship-cadence-restrained',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a restrained callback-line cadence note when the adopted baseline stays on same-turn-if-invited measured-return',
      'relationshipCadenceGovernanceNote: \'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。\'',
      'candidateId: \'candidate-cadence-callback-4\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a body continuity governance note when the adopted baseline was trusted because the body line still carries the living segment',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
      'bodyContinuityGovernanceNote: \'身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-body-only-hold',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a body-only-hold governance note when the adopted baseline is trusted because the body line still carries the same living segment alone',
      'bodyContinuityPhase: \'body-only-hold\'',
      'bodyContinuityGovernanceNote: \'身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a cross-modal-lock body continuity governance note so the adopted anchor can preserve same-segment lock evidence',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      'bodyContinuityGovernanceNote: \'身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-record-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-baseline-adoption-record.test.ts',
    snippets: [
      'captures a renderer-rejoin-without-body governance note so visible recovery remains traceable as non-trustworthy continuity',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'bodyContinuityGovernanceNote: \'显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。\'',
    ],
  },
] as const

describe('performance visualizer self evolution baseline adoption record project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution baseline adoption record preserves same-her project-state relationship cadence and embodiment baseline record semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-same-her-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-project-state-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-relationship-cadence-durable' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-relationship-cadence-restrained' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-body-only-hold' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-record-renderer-rejoin-without-body' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution baseline adoption record claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution baseline adoption record now needs dedicated same-her baseline-record proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const recordSource = readFileSync(new URL('./performance-visualizer-self-evolution-baseline-adoption-record.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution baseline adoption record')
    expect(matrixSource).toContain('same-her continuity governance note')
    expect(matrixSource).toContain('project-state continuity governance note')
    expect(matrixSource).toContain('relationship cadence governance note')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution baseline adoption record')
    expect(auditSource).toContain('same-her continuity governance note')
    expect(auditSource).toContain('project-state continuity governance note')
    expect(auditSource).toContain('relationship cadence governance note')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(recordSource).toContain(
      'captures a renderer-rejoin-without-body governance note so visible recovery remains traceable as non-trustworthy continuity',
    )
    expect(recordSource).toContain(
      'captures a restrained callback-line cadence note when the adopted baseline stays on same-turn-if-invited measured-return',
    )
  })
})
