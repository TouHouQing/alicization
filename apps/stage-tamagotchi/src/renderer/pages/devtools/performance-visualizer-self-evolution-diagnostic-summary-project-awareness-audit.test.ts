import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-diagnostic-summary-lane-level-renderer-authority-truth',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'surfaces lane-level renderer authority truth when the authority match summary is descriptive text',
      'value: \'VRM | 上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知\'',
      'surfaces voice as part of renderer authority truth in the top-level renderer summary',
      'value: \'VRM | 上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-thin-measured-return-same-her-line',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps a thin measured-return same-her line visible instead of collapsing it into lipsync-only drift when noisy-detour continuity is still explicit',
      'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.',
      'value: \'runtime-thread-thin-measured-return-1 | 主动对话 | 编码中 | 噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-repair-before-closeness-continuity',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps repair-before-closeness continuity visible instead of collapsing it into generic lipsync-only continuity',
      'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
      'value: \'runtime-thread-repair-before-closeness-1 | 主动对话 | 编码中 | repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-project-brief-continuity-line',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'surfaces project identity, Phase 1 route, and unresolved closure carry as one readable continuity line when pre-dialogue briefing drift is still open',
      'Primary open life loop still centers on renderer continuity observation 还没把项目身份、Phase 1 主线和未闭环项并成一条可读生命线',
      'Next closure target is still 把项目身份、Phase 1 主线和未闭环项一起挂到 pre-dialogue self brief 里',
      'value: \'runtime-thread-project-brief-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift | 当前未闭环项仍集中在 renderer continuity observation 还没把项目身份、Phase 1 主线和未闭环项并成一条可读生命线 | 下一步仍要继续收住 把项目身份、Phase 1 主线和未闭环项一起挂到 pre-dialogue self brief 里\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-full-cross-modal-lock-runtime-continuity',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps full-cross-modal-lock runtime continuity visible with the concrete renderer surface in the high-level diagnostic summary',
      'bodyContinuityPhase: \'full-cross-modal-lock\'',
      'value: \'runtime-thread-lock-summary-1 | 主动对话 | 编码中 | 身体线与 Live2D 显形权威已经共同锁回同一段 living segment\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-renderer-rejoin-without-body-drift-risk',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps renderer-rejoin-without-body runtime continuity visible with the concrete renderer surface in the high-level diagnostic summary',
      'bodyContinuityPhase: \'renderer-rejoin-without-body\'',
      'value: \'runtime-thread-body-loss-summary-1 | 主动对话 | 编码中 | VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-quieter-visible-same-her-lanes',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps quieter face+lipsync same-her continuity visible in the higher-level continuity summary instead of flattening it into renderer-rejoin-without-body drift',
      'value: \'runtime-thread-face-lipsync-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线\'',
      'keeps quieter motion+lipsync same-her continuity visible in the higher-level continuity summary instead of flattening it into renderer-rejoin-without-body drift',
      'value: \'runtime-thread-motion-lipsync-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-quieter-visible-same-her-voice-lanes',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice same-her continuity visible in the higher-level continuity summary instead of collapsing it into a shorter lane-only label',
      'value: \'runtime-thread-face-lipsync-voice-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线\'',
      'keeps quieter motion+lipsync+voice same-her continuity visible in the higher-level continuity summary instead of collapsing it into a shorter lane-only label',
      'value: \'runtime-thread-motion-lipsync-voice-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线\'',
    ],
  },
  {
    entry: 'self-evolution-diagnostic-summary-execution-safety-gate-restraint',
    file: './performance-visualizer-self-evolution-diagnostic-summary.test.ts',
    snippets: [
      'keeps execution safety-gate restraint visible in the top-level self-evolution diagnostic summary',
      'key: \'execution-safety-gate\'',
      'label: \'执行安全门\'',
      'execution-safety-gate: blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
    ],
  },
] as const

describe('performance visualizer self evolution diagnostic summary project awareness audit', () => {
  it('keeps one explicit route-level proof that top-level self-evolution diagnostic summaries preserve same-her continuity truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-lane-level-renderer-authority-truth' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-thin-measured-return-same-her-line' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-repair-before-closeness-continuity' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-project-brief-continuity-line' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-full-cross-modal-lock-runtime-continuity' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-renderer-rejoin-without-body-drift-risk' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-quieter-visible-same-her-lanes' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-quieter-visible-same-her-voice-lanes' }),
      expect.objectContaining({ entry: 'self-evolution-diagnostic-summary-execution-safety-gate-restraint' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the top-level self-evolution diagnostic summary project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: top-level self-evolution diagnostic summaries now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const summarySource = readFileSync(new URL('./performance-visualizer-self-evolution-diagnostic-summary.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('top-level self-evolution diagnostic summaries')
    expect(matrixSource).toContain('lane-level renderer authority truth')
    expect(matrixSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(matrixSource).toContain('project identity, Phase 1 route, and unresolved closure carry')
    expect(matrixSource).toContain('renderer-rejoin-without-body drift risk')
    expect(matrixSource).toContain('Top-level self-evolution diagnostic summaries now also keep execution safety-gate restraint visible as a dedicated `执行安全门` diagnostic')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('top-level self-evolution diagnostic summaries')
    expect(auditSource).toContain('lane-level renderer authority truth')
    expect(auditSource).toContain('quieter face+lipsync / motion+lipsync carry')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice carry')
    expect(auditSource).toContain('project identity, Phase 1 route, and unresolved closure carry')
    expect(auditSource).toContain('renderer-rejoin-without-body drift risk')
    expect(auditSource).toContain('top-level self-evolution diagnostic summaries keep execution safety-gate restraint visible as a dedicated `执行安全门` diagnostic')
    expect(summarySource).toContain(
      'surfaces project identity, Phase 1 route, and unresolved closure carry as one readable continuity line when pre-dialogue briefing drift is still open',
    )
    expect(summarySource).toContain(
      'keeps renderer-rejoin-without-body runtime continuity visible with the concrete renderer surface in the high-level diagnostic summary',
    )
    expect(summarySource).toContain(
      'keeps quieter face+lipsync+voice same-her continuity visible in the higher-level continuity summary instead of collapsing it into a shorter lane-only label',
    )
    expect(summarySource).toContain(
      'keeps quieter motion+lipsync+voice same-her continuity visible in the higher-level continuity summary instead of collapsing it into a shorter lane-only label',
    )
    expect(summarySource).toContain(
      'keeps execution safety-gate restraint visible in the top-level self-evolution diagnostic summary',
    )
  })
})
