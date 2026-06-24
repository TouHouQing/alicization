import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'playback-cue-body-backed-same-her-line',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'preserves body-backed same-her authority when body and voice still carry the living segment after visible face motion and lipsync drift',
      'expect(view?.authorityTrustSummary).toBe(\'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。\')',
      'value: \'目标 VRM，驱动 身体，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型未命中，当前仅剩身体维持同一段连续性\'',
    ],
  },
  {
    entry: 'playback-cue-normalized-closure-stage',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'surfaces normalized embodiment closure stage on playback cue authority view when same-her closure is already carried structurally',
      'embodimentClosureStage: \'audible-body-carry\'',
      'expect(view?.embodimentClosureStage).toBe(\'audible-body-carry\')',
    ],
  },
  {
    entry: 'playback-cue-structured-same-her-closure-stages',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'extracts structured same-her closure stages from authority lane summaries on playback cue authority view',
      'expected: \'body-carried-to-renderer-rejoin\'',
      'expected: \'renderer-rejoin-without-body\'',
    ],
  },
  {
    entry: 'playback-cue-quieter-voice-surviving-line',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'keeps quieter face+lipsync+voice and motion+lipsync+voice same-her continuity explicit on playback cue authority view instead of collapsing them into shorter lane-only labels',
      '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线',
      '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线',
    ],
  },
  {
    entry: 'playback-cue-thin-affective-room-making',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'keeps thinner affective-residue room-making wording visible in playback cue settle authority when upstream authority already carries the measured-return line',
      '余韵还在，先留白，别立刻把温度放大',
      'key: \'settle-authority\'',
    ],
  },
  {
    entry: 'playback-cue-same-turn-if-invited-trust',
    file: './performance-visualizer-playback-cue.test.ts',
    snippets: [
      'keeps same-turn-if-invited measured-return trust on the same callback line instead of describing it like a fresh reopening',
      'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      'residentMode: \'measured-return\'',
    ],
  },
] as const

describe('performance visualizer playback cue project awareness audit', () => {
  it('keeps one explicit route-level proof that playback cue authority view preserves same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'playback-cue-body-backed-same-her-line' }),
      expect.objectContaining({ entry: 'playback-cue-normalized-closure-stage' }),
      expect.objectContaining({ entry: 'playback-cue-structured-same-her-closure-stages' }),
      expect.objectContaining({ entry: 'playback-cue-quieter-voice-surviving-line' }),
      expect.objectContaining({ entry: 'playback-cue-thin-affective-room-making' }),
      expect.objectContaining({ entry: 'playback-cue-same-turn-if-invited-trust' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the playback-cue project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: playback cue authority view now needs dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const playbackCueSource = readFileSync(new URL('./performance-visualizer-playback-cue.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-playback-cue-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('playback cue authority view')
    expect(matrixSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice same-her continuity')
    expect(matrixSource).toContain('same-turn-if-invited measured-return trust')
    expect(matrixSource).toContain('thinner affective-residue room-making wording')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('quieter face+lipsync+voice / motion+lipsync+voice same-her continuity')
    expect(playbackCueSource).toContain(
      'extracts structured same-her closure stages from authority lane summaries on playback cue authority view',
    )
    expect(playbackCueSource).toContain(
      'keeps quieter face+lipsync+voice and motion+lipsync+voice same-her continuity explicit on playback cue authority view instead of collapsing them into shorter lane-only labels',
    )
    expect(playbackCueSource).toContain(
      'keeps thinner affective-residue room-making wording visible in playback cue settle authority when upstream authority already carries the measured-return line',
    )
  })
})
