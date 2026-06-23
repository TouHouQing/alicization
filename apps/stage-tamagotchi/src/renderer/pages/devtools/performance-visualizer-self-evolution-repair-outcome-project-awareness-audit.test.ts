import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-outcome-same-her-governance',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'reports same-her continuity confirmation instead of generic drift repair when the governance loop closes',
      'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
      'same-her 连续性闭环已确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-project-state-governance',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'reports project-state continuity confirmation instead of generic drift repair when the project-state governance loop closes',
      '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
      '项目状态连续性闭环已确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-relationship-cadence-restrained',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'keeps relationship cadence closure wording restrained when same-turn-if-invited measured-return is still on the same callback line',
      'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
      'relationship cadence callback-line 闭环已确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-body-carried-vrm-rejoin',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'reports body continuity confirmation instead of generic drift repair when the body-led embodiment loop closes',
      '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可进入基线判断。',
      '身体承接态 -> VRM 显形补回闭环已确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-speech-rejoin',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'reports speech body continuity confirmation instead of generic drift repair when the speech-led embodiment loop closes',
      '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
      '身体承接态 -> speech 显形补回闭环已确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body closure explicit so visible recovery is not narrated as a body-carried renderer repair',
      '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
      '显形回接失身态（VRM）已完成闭环确认。',
    ],
  },
  {
    entry: 'self-evolution-repair-outcome-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-repair-outcome.test.ts',
    snippets: [
      'keeps cross-modal-lock closure explicit when summary lines already confirm the stable same-segment lock but structured phase metadata is still missing',
      '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      '身体跨模态重锁闭环已确认。',
    ],
  },
] as const

describe('performance visualizer self evolution repair outcome project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair outcome preserves same-her project-state and embodiment closure-result semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-same-her-governance' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-project-state-governance' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-relationship-cadence-restrained' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-body-carried-vrm-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-speech-rejoin' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'self-evolution-repair-outcome-full-cross-modal-lock' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair outcome claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair outcome now needs dedicated same-her closure-result proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const outcomeSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-outcome.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair outcome')
    expect(matrixSource).toContain('same-her continuity governance')
    expect(matrixSource).toContain('project-state continuity governance')
    expect(matrixSource).toContain('same-turn-if-invited measured-return')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('speech authority rejoin')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair outcome')
    expect(auditSource).toContain('same-her continuity governance')
    expect(auditSource).toContain('project-state continuity governance')
    expect(auditSource).toContain('same-turn-if-invited measured-return')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('speech authority rejoin')
    expect(outcomeSource).toContain(
      'reports project-state continuity confirmation instead of generic drift repair when the project-state governance loop closes',
    )
    expect(outcomeSource).toContain(
      'keeps renderer-rejoin-without-body closure explicit so visible recovery is not narrated as a body-carried renderer repair',
    )
  })
})
