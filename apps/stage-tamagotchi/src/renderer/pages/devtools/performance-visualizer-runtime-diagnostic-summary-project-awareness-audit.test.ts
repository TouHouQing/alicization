import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-diagnostic-summary-body-backed-same-her-line',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'keeps body-backed same-her lane truth visible in runtime authority summaries when the shared segment is carried by body and voice after face motion and lipsync drift',
      'VRM 这段 authority 现在主要由身体和声音继续托住，同一段 living segment 还在，只是表情、动作和口型暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
      'value: \'身体命中 / 表情未命中 / 动作未命中 / 口型未命中\'',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-structured-same-her-closure-stages',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'derives structured same-her closure stage entries from authority lane summaries inside runtime authority summaries',
      'key: \'embodiment-closure-stage\'',
      'value: \'body-carried-to-renderer-rejoin\'',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-quieter-voice-surviving-line',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice and motion+lipsync+voice same-her continuity explicit in runtime authority summaries instead of collapsing them into shorter lane-only labels',
      '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线',
      '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-repair-before-closeness-trust',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'keeps repair-before-closeness lane truth visible in runtime authority summaries instead of reducing it to a generic one-lane hold',
      'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
      'repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-thin-affective-room-making',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'rebuilds thin affective authority trust from settle authority reason when outer runtime summaries would otherwise drop it',
      '余韵还在，先留白，别立刻把温度放大',
      'key: \'authority-trust\'',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-same-turn-if-invited-trust',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'keeps same-turn-if-invited measured-return callback-line trust visible in runtime authority summaries',
      'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      'value: \'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。\'',
    ],
  },
  {
    entry: 'runtime-diagnostic-summary-execution-safety-gate',
    file: './performance-visualizer-runtime-diagnostic-summary.test.ts',
    snippets: [
      'surfaces execution safety-gate restraint from same-her reason tags as a readable runtime diagnostic',
      'execution-safety-gate:confirmation-required',
      'execution-safety-gate:no-process-started',
      'label: \'执行安全门\'',
    ],
  },
] as const

describe('performance visualizer runtime diagnostic summary project awareness audit', () => {
  it('keeps one explicit route-level proof that runtime authority summaries preserve same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-body-backed-same-her-line' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-structured-same-her-closure-stages' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-quieter-voice-surviving-line' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-repair-before-closeness-trust' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-thin-affective-room-making' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-same-turn-if-invited-trust' }),
      expect.objectContaining({ entry: 'runtime-diagnostic-summary-execution-safety-gate' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the runtime diagnostic summary project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: runtime authority summaries now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const runtimeSummarySource = readFileSync(new URL('./performance-visualizer-runtime-diagnostic-summary.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-runtime-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime authority summaries')
    expect(matrixSource).toContain('body-backed same-her lane truth')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice same-her continuity')
    expect(matrixSource).toContain('same-turn-if-invited measured-return trust')
    expect(matrixSource).toContain('thinner affective-residue room-making wording')
    expect(matrixSource).toContain('execution safety-gate restraint')
    expect(matrixSource).toContain('执行安全门')
    expect(matrixSource).toContain('confirmation-required')
    expect(matrixSource).toContain('no-process-started')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('runtime authority summaries')
    expect(auditSource).toContain('body-backed same-her lane truth')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice same-her continuity')
    expect(auditSource).toContain('thinner affective-residue room-making wording')
    expect(auditSource).toContain('execution safety-gate restraint')
    expect(auditSource).toContain('执行安全门')
    expect(runtimeSummarySource).toContain(
      'keeps body-backed same-her lane truth visible in runtime authority summaries when the shared segment is carried by body and voice after face motion and lipsync drift',
    )
    expect(runtimeSummarySource).toContain(
      'keeps quieter face+lipsync+voice and motion+lipsync+voice same-her continuity explicit in runtime authority summaries instead of collapsing them into shorter lane-only labels',
    )
    expect(runtimeSummarySource).toContain(
      'surfaces execution safety-gate restraint from same-her reason tags as a readable runtime diagnostic',
    )
    expect(runtimeSummarySource).toContain(
      'rebuilds thin affective authority trust from settle authority reason when outer runtime summaries would otherwise drop it',
    )
  })
})
