import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-authority-overview-structured-closure-stage',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'prefers normalized playback cue embodiment closure stage over re-parsing body continuity text when same-her closure is already structured upstream',
      'embodimentClosureStage: \'audible-body-carry\'',
      'expect(overview?.embodimentClosureStage).toBe(\'audible-body-carry\')',
    ],
  },
  {
    entry: 'runtime-authority-overview-renderer-rejoin-without-body',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'surfaces renderer-rejoin-without-body as the active embodiment closure stage when playback cue authority already carries the structured body-loss phase',
      'expect(overview?.embodimentClosureStage).toBe(\'renderer-rejoin-without-body\')',
      'value: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'runtime-authority-overview-thin-measured-return-line',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'keeps same-turn-if-invited measured-return trust visible when runtime authority overview reads playback cue callback-line guidance',
      'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      'key: \'authority-trust\'',
    ],
  },
  {
    entry: 'runtime-authority-overview-body-backed-line',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'keeps upstream body continuity visible on runtime authority overview when playback cue authority already carries the same-body-line evidence',
      'expect(overview?.authorityTrustSummary).toContain(\'身体线继续托住\')',
      'expect(overview?.bodyContinuitySummary).toBe(\'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-body-continuity-1\')',
    ],
  },
  {
    entry: 'runtime-authority-overview-top-level-same-her-continuity',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'key: \'same-her-continuity\'',
      'label: \'同一生命线总览\'',
      '当前 same-her continuity 主要由渲染帧线继续托住',
      '当前 same-her continuity 主要由执行线继续托住',
    ],
  },
  {
    entry: 'runtime-authority-overview-thin-affective-room-making',
    file: './performance-visualizer-runtime-authority-overview.test.ts',
    snippets: [
      'keeps thinner affective-residue room-making wording visible in runtime authority overview when driver summaries still carry the measured-return line',
      '余韵还在，先留白，别立刻把温度放大',
      'linger blink / soften gaze',
    ],
  },
] as const

describe('performance visualizer runtime authority overview project awareness audit', () => {
  it('keeps one explicit route-level proof that runtime authority overview preserves same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-authority-overview-structured-closure-stage' }),
      expect.objectContaining({ entry: 'runtime-authority-overview-renderer-rejoin-without-body' }),
      expect.objectContaining({ entry: 'runtime-authority-overview-thin-measured-return-line' }),
      expect.objectContaining({ entry: 'runtime-authority-overview-body-backed-line' }),
      expect.objectContaining({ entry: 'runtime-authority-overview-top-level-same-her-continuity' }),
      expect.objectContaining({ entry: 'runtime-authority-overview-thin-affective-room-making' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the runtime-authority-overview project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: runtime authority overview now needs dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const overviewSource = readFileSync(new URL('./performance-visualizer-runtime-authority-overview.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-runtime-authority-overview-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime authority overview')
    expect(matrixSource).toContain('structured body-loss phase')
    expect(matrixSource).toContain('same-turn-if-invited measured-return trust')
    expect(matrixSource).toContain('top-level same-her continuity summary')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('top-level same-her continuity summary')
    expect(overviewSource).toContain(
      'surfaces renderer-rejoin-without-body as the active embodiment closure stage when playback cue authority already carries the structured body-loss phase',
    )
    expect(overviewSource).toContain(
      'keeps thinner affective-residue room-making wording visible in runtime authority overview when driver summaries still carry the measured-return line',
    )
    expect(overviewSource).toContain('当前 same-her continuity 主要由渲染帧线继续托住')
  })
})
