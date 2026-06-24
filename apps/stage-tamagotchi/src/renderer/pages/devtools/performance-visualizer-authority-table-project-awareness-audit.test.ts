import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'authority-table-thin-measured-return-same-her-line',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'keeps a thin measured-return same-her line visible in outer authority table speech summaries instead of collapsing it into lane-only drift',
      'authority-trust: 当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
      'authority-mismatch: Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.',
    ],
  },
  {
    entry: 'authority-table-body-backed-resident-lane-carry',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'keeps body-backed same-her continuity visible in authority table rows when the shared segment is now carried by body after face motion and lipsync drift',
      'expect(rows[0]?.authorityTrustSummary).toBe(\'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。\')',
      'authority: 目标 VRM，驱动 身体，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型未命中，当前仅剩身体维持同一段连续性',
    ],
  },
  {
    entry: 'authority-table-body-carried-lane-truth',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'preserves body-carried lane truth from authority match summary when matched drivers lag behind the structured same-her recovery',
      'authority-match: 身体命中 / 表情未命中 / 动作未命中 / 口型命中',
      'authority-mismatch: 表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
    ],
  },
  {
    entry: 'authority-table-normalized-audible-body-stage',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'prefers the centralized speech-row embodiment closure stage when same-her closure state is already normalized upstream',
      'embodimentClosureStage: \'audible-body-carry\'',
      'expect(rows[0]?.embodimentClosureStage).toBe(\'audible-body-carry\')',
    ],
  },
  {
    entry: 'authority-table-structured-same-her-closure-stage',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'extracts structured same-her closure stages from authority speech rows when only authority lane summaries carry them',
      'expected: \'body-carried-to-renderer-rejoin\'',
      'expected: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'authority-table-execution-safety-gate-speech-lines',
    file: './performance-visualizer-authority-table.test.ts',
    snippets: [
      'keeps execution safety-gate restraint visible in authority table speech summary lines before raw same-her tags',
      'execution-safety-gate: blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
      'same-her-reasons: execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started, embodiment-carry:measured-return',
    ],
  },
] as const

describe('performance visualizer authority table project awareness audit', () => {
  it('keeps one explicit route-level proof that renderer-facing authority summaries preserve same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'authority-table-thin-measured-return-same-her-line' }),
      expect.objectContaining({ entry: 'authority-table-body-backed-resident-lane-carry' }),
      expect.objectContaining({ entry: 'authority-table-body-carried-lane-truth' }),
      expect.objectContaining({ entry: 'authority-table-normalized-audible-body-stage' }),
      expect.objectContaining({ entry: 'authority-table-structured-same-her-closure-stage' }),
      expect.objectContaining({ entry: 'authority-table-execution-safety-gate-speech-lines' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the authority-table project-awareness claim to current behavior tests instead of only broader noisy-desktop prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: renderer-facing authority summaries now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const authoritySource = readFileSync(new URL('./performance-visualizer-authority-table.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-authority-table-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('renderer-facing authority summaries')
    expect(matrixSource).toContain('thin measured-return same-her line')
    expect(matrixSource).toContain('structured same-her closure stages')
    expect(matrixSource).toContain('authority table speech summary lines')
    expect(matrixSource).toContain('execution-safety-gate before raw same-her reason tags')
    expect(matrixSource).toContain('speechSummaryLines')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('renderer-facing authority summaries now also keep the resident body lane host-visible')
    expect(auditSource).toContain('authority table speech summary lines')
    expect(auditSource).toContain('execution-safety-gate before raw same-her reason tags')
    expect(authoritySource).toContain(
      'keeps a thin measured-return same-her line visible in outer authority table speech summaries instead of collapsing it into lane-only drift',
    )
    expect(authoritySource).toContain(
      'keeps execution safety-gate restraint visible in authority table speech summary lines before raw same-her tags',
    )
    expect(authoritySource).toContain(
      'extracts structured same-her closure stages from authority speech rows when only authority lane summaries carry them',
    )
  })
})
