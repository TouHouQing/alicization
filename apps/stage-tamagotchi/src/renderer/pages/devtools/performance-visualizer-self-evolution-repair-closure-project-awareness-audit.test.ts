import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-closure-project-state-governance',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'treats project-state continuity governance as a closed validation loop when Project identity carry, Phase 1 route carry, and Unresolved closure carry are re-confirmed by a fresh snapshot',
      'activePatternKey: \'pattern-project-state-continuity-governance\'',
      '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-same-her-governance',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'treats same-her continuity governance as a closed validation loop when the memory-first pattern has been re-confirmed by a fresh snapshot',
      'activePatternKey: \'pattern-same-her-governance\'',
      'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-relationship-cadence-governance',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'treats relationship cadence governance as a closed validation loop when companionship re-entry is re-confirmed by a fresh snapshot',
      'activePatternKey: \'pattern-relationship-cadence-governance\'',
      'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-body-only-hold',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'keeps body-only-hold closure wording explicit so the validated baseline stays cautious about missing renderer rejoin',
      'bodyContinuityPhase: \'body-only-hold\'',
      '身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态：同一段 living segment 仍由身体线独自托住，但还不能把显形回接视为已经成立，可进入更谨慎的基线判断。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-full-cross-modal-lock',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'keeps full-cross-modal-lock closure wording explicit when body and renderer stay stably locked together',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      '身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（Live2D authority lock），身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-renderer-rejoin-without-body',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body closure wording explicit so visible recovery is not promoted to a trustworthy baseline',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
    ],
  },
  {
    entry: 'self-evolution-repair-closure-speech-body-rejoin',
    file: './performance-visualizer-self-evolution-repair-closure.test.ts',
    snippets: [
      'treats speech body rejoin as a closed validation loop when the same living segment is re-confirmed by a fresh snapshot',
      'rendererRejoinSurfaceKey: \'authority:renderer-rejoin:speech\'',
      '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
    ],
  },
] as const

describe('performance visualizer self evolution repair closure project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair closure preserves same-her project-state relationship cadence and embodiment baseline semantics on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-closure-project-state-governance' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-same-her-governance' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-relationship-cadence-governance' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-body-only-hold' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-full-cross-modal-lock' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'self-evolution-repair-closure-speech-body-rejoin' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair closure claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair closure now needs dedicated same-her baseline proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const closureSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-closure.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair closure')
    expect(matrixSource).toContain('project-state continuity governance')
    expect(matrixSource).toContain('relationship cadence governance')
    expect(matrixSource).toContain('body-only-hold')
    expect(matrixSource).toContain('full-cross-modal-lock')
    expect(matrixSource).toContain('renderer-rejoin-without-body')
    expect(matrixSource).toContain('speech authority rejoin')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair closure')
    expect(auditSource).toContain('project-state continuity governance')
    expect(auditSource).toContain('relationship cadence governance')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('speech authority rejoin')
    expect(closureSource).toContain(
      'keeps renderer-rejoin-without-body closure wording explicit so visible recovery is not promoted to a trustworthy baseline',
    )
    expect(closureSource).toContain(
      'treats speech body rejoin as a closed validation loop when the same living segment is re-confirmed by a fresh snapshot',
    )
  })
})
