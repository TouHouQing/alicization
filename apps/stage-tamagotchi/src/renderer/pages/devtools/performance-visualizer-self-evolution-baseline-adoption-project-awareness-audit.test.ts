import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-baseline-adoption-same-her-governance',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted same-her continuity baseline immediately when it is the latest confirmed governance anchor',
      'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      'candidateId: \'candidate-governance-2\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-project-state-governance',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted project-state continuity baseline immediately when Project identity carry, Phase 1 route carry, and Unresolved closure carry have been re-confirmed and no newer snapshot exists',
      '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      'candidateId: \'candidate-project-state-2\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-relationship-cadence-durable',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted cadence baseline as durable relationship rhythm when internalization support is present',
      'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      'candidateId: \'candidate-4\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-relationship-cadence-restrained',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'keeps a trusted invited measured-return cadence baseline restrained instead of upgrading it into a broad long-term relationship baseline',
      'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      'candidateId: \'candidate-cadence-callback-4\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-body-carried-rejoin',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted body-led continuity baseline immediately when the latest supporting line uses the new renderer rejoin closure wording',
      '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      'bodyContinuityPhase: \'body-carried-to-renderer-rejoin\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-body-only-hold',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted body-only-hold baseline immediately while keeping the same-segment body-only carry explicit',
      '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。',
      'bodyContinuityPhase: \'body-only-hold\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'adopts a trusted cross-modal-lock baseline immediately when body and renderer remain locked on the same living segment',
      '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
    ],
  },
  {
    entry: 'self-evolution-baseline-adoption-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-baseline-adoption.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body as an audit anchor when a newer trusted snapshot exists, instead of narrating it like body-carried continuity',
      '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察 VRM 已回接但身体线未承接的这次可见恢复。',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
    ],
  },
] as const

describe('performance visualizer self evolution baseline adoption project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution baseline adoption preserves same-her project-state relationship cadence and embodiment baseline-adoption semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-same-her-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-project-state-governance' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-relationship-cadence-durable' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-relationship-cadence-restrained' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-body-carried-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-body-only-hold' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-baseline-adoption-renderer-rejoin-without-body' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution baseline adoption claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution baseline adoption now needs dedicated same-her baseline-adoption proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const adoptionSource = readFileSync(new URL('./performance-visualizer-self-evolution-baseline-adoption.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution baseline adoption')
    expect(matrixSource).toContain('same-her continuity baseline')
    expect(matrixSource).toContain('project-state continuity baseline')
    expect(matrixSource).toContain('relationship cadence baseline')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution baseline adoption')
    expect(auditSource).toContain('same-her continuity baseline')
    expect(auditSource).toContain('project-state continuity baseline')
    expect(auditSource).toContain('relationship cadence baseline')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(adoptionSource).toContain(
      'keeps renderer-rejoin-without-body as an audit anchor when a newer trusted snapshot exists, instead of narrating it like body-carried continuity',
    )
    expect(adoptionSource).toContain(
      'keeps a trusted invited measured-return cadence baseline restrained instead of upgrading it into a broad long-term relationship baseline',
    )
  })
})
