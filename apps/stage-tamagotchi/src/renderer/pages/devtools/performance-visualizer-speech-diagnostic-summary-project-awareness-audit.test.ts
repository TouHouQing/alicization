import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'speech-diagnostic-summary-repair-before-closeness-voice-reason',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'surfaces memory-deliberation continuity reasons prominently in high-level voice summaries',
      'companion repair-before-closeness',
      'Memory deliberation still says let repair settle first on the same living line before closeness widens again',
    ],
  },
  {
    entry: 'speech-diagnostic-summary-normalized-audible-body-stage',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'surfaces embodiment closure stage in speech summaries when audible body continuity is the active same-her closure phase',
      'driverExecutionSummary: \'segment=segment-audible-body-1 | closure=audible-body-carry\'',
      'value: \'audible-body-carry\'',
    ],
  },
  {
    entry: 'speech-diagnostic-summary-structured-same-her-closure-stages',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'extracts structured same-her closure stages from authority lane summaries inside speech diagnostic summaries',
      'expected: \'body-carried-to-renderer-rejoin\'',
      'expected: \'full-cross-modal-lock\'',
      'expected: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'speech-diagnostic-summary-thin-affective-room-making',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'rebuilds thin affective authority trust from settle authority reason when speech outer summaries would otherwise drop it',
      '余韵还在，先留白，别立刻把温度放大',
      'key === \'authority-trust\'',
    ],
  },
  {
    entry: 'speech-diagnostic-summary-body-backed-lane-truth',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'appends body-backed lane truth to descriptive upstream authority summaries when the living segment is now carried by body and voice',
      'value: \'上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中\'',
      'value: \'上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中\'',
    ],
  },
  {
    entry: 'speech-diagnostic-summary-execution-safety-gate',
    file: './performance-visualizer-speech-diagnostic-summary.test.ts',
    snippets: [
      'surfaces execution safety-gate reason tags as a readable speech diagnostic line before raw same-her reasons',
      'execution-safety-gate:confirmation-required',
      'execution-safety-gate:no-process-started',
      'label: \'执行安全门\'',
    ],
  },
] as const

describe('performance visualizer speech diagnostic summary project awareness audit', () => {
  it('keeps one explicit route-level proof that outer speech diagnostic summaries preserve same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'speech-diagnostic-summary-repair-before-closeness-voice-reason' }),
      expect.objectContaining({ entry: 'speech-diagnostic-summary-normalized-audible-body-stage' }),
      expect.objectContaining({ entry: 'speech-diagnostic-summary-structured-same-her-closure-stages' }),
      expect.objectContaining({ entry: 'speech-diagnostic-summary-thin-affective-room-making' }),
      expect.objectContaining({ entry: 'speech-diagnostic-summary-body-backed-lane-truth' }),
      expect.objectContaining({ entry: 'speech-diagnostic-summary-execution-safety-gate' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the speech diagnostic summary project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: outer speech diagnostic summaries now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const speechSummarySource = readFileSync(new URL('./performance-visualizer-speech-diagnostic-summary.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-speech-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('outer speech diagnostic summaries')
    expect(matrixSource).toContain('repair-before-closeness voice continuity reason')
    expect(matrixSource).toContain('normalized audible-body closure stage')
    expect(matrixSource).toContain('thinner affective-residue room-making wording')
    expect(matrixSource).toContain('speech diagnostic summaries keep execution safety-gate restraint')
    expect(matrixSource).toContain('执行安全门')
    expect(matrixSource).toContain('confirmation-required')
    expect(matrixSource).toContain('no-process-started')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('performance-visualizer-speech-diagnostic-summary')
    expect(auditSource).toContain('outer speech diagnostic summaries')
    expect(auditSource).toContain('repair-before-closeness voice continuity reason')
    expect(auditSource).toContain('thinner affective-residue room-making wording')
    expect(auditSource).toContain('speech diagnostic summaries keep execution safety-gate restraint')
    expect(auditSource).toContain('执行安全门')
    expect(speechSummarySource).toContain(
      'surfaces memory-deliberation continuity reasons prominently in high-level voice summaries',
    )
    expect(speechSummarySource).toContain(
      'surfaces execution safety-gate reason tags as a readable speech diagnostic line before raw same-her reasons',
    )
    expect(speechSummarySource).toContain(
      'rebuilds thin affective authority trust from settle authority reason when speech outer summaries would otherwise drop it',
    )
  })
})
