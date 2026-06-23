import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-repair-action-feedback-project-state-carry',
    file: './performance-visualizer-self-evolution-repair-action-feedback.test.ts',
    snippets: [
      'reports project-state continuity carry when the refreshed target is still checking whether the same her carried project identity, phase, and open loops forward',
      '已推进到下一项修复目标：项目状态连续性检查 / 事件 / 接管审计。',
      '工作台已推进到下一项项目状态连续性检查目标，继续确认项目身份、Phase 1 主线与未闭环任务承接是否仍被同一个她稳定带着。',
    ],
  },
  {
    entry: 'self-evolution-repair-action-feedback-body-led-carry',
    file: './performance-visualizer-self-evolution-repair-action-feedback.test.ts',
    snippets: [
      'reports body-led continuity carry when the refreshed target is still verifying that the body line holds the living segment first',
      '工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断显形权威是否已经补回同一条连续身体线。',
    ],
  },
  {
    entry: 'self-evolution-repair-action-feedback-speech-rejoin-carry',
    file: './performance-visualizer-self-evolution-repair-action-feedback.test.ts',
    snippets: [
      'reports speech body-led continuity carry when the refreshed target is still verifying speech authority rejoin on the same living segment',
      '工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断 speech 显形权威是否已经补回同一条连续身体线。',
      'rendererRejoinSurfaceKey: \'authority:renderer-rejoin:speech\'',
    ],
  },
  {
    entry: 'self-evolution-repair-action-feedback-project-state-closure',
    file: './performance-visualizer-self-evolution-repair-action-feedback.test.ts',
    snippets: [
      'reports project-state continuity confirmation when a repair action closes the project-state governance loop',
      '项目状态连续性闭环已确认。',
      '这次项目状态连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的项目身份、Phase 1 主线和未闭环任务承接重新开始。',
    ],
  },
  {
    entry: 'self-evolution-repair-action-feedback-body-led-closure',
    file: './performance-visualizer-self-evolution-repair-action-feedback.test.ts',
    snippets: [
      'reports body-led continuity confirmation when a repair action closes the loop with the body line still carrying the segment',
      '身体承接态 -> speech 显形补回闭环已确认。',
      '这次身体连续性已经再次得到验证，speech authority 已沿同一条连续身体线补回。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
    ],
  },
] as const

describe('performance visualizer self evolution repair action feedback project awareness audit', () => {
  it('keeps one explicit route-level proof that self-evolution repair action feedback preserves same-her project-state and embodiment carry on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-repair-action-feedback-project-state-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-action-feedback-body-led-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-action-feedback-speech-rejoin-carry' }),
      expect.objectContaining({ entry: 'self-evolution-repair-action-feedback-project-state-closure' }),
      expect.objectContaining({ entry: 'self-evolution-repair-action-feedback-body-led-closure' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-evolution repair action feedback claim to current behavior tests instead of only broader devtools continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-evolution repair action feedback now needs dedicated same-her follow-through proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const feedbackSource = readFileSync(new URL('./performance-visualizer-self-evolution-repair-action-feedback.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('self-evolution repair action feedback')
    expect(matrixSource).toContain('项目状态连续性检查目标')
    expect(matrixSource).toContain('身体线是否仍托住同一段 living segment')
    expect(matrixSource).toContain('speech 显形权威是否已经补回同一条连续身体线')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('self-evolution repair action feedback')
    expect(auditSource).toContain('项目状态连续性检查目标')
    expect(auditSource).toContain('身体线是否仍托住同一段 living segment')
    expect(auditSource).toContain('speech 显形权威是否已经补回同一条连续身体线')
    expect(auditSource).toContain('身体承接态 -> speech 显形补回闭环已确认')
    expect(feedbackSource).toContain(
      'reports project-state continuity carry when the refreshed target is still checking whether the same her carried project identity, phase, and open loops forward',
    )
    expect(feedbackSource).toContain(
      'reports body-led continuity confirmation when a repair action closes the loop with the body line still carrying the segment',
    )
  })
})
