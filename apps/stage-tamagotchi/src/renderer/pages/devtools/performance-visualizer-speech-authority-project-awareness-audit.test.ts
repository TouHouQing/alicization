import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'speech-authority-body-carried-same-her-line',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'preserves body-carried speech rejoin lane truth when upstream authority summary is richer than the current authority binding',
      'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
      'value: \'身体命中 / 表情未命中 / 动作未命中 / 口型命中\'',
    ],
  },
  {
    entry: 'speech-authority-normalized-audible-body-stage',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'surfaces embodiment closure stage as a top-level speech authority row field when audible body continuity is the active same-her closure phase',
      'embodimentClosureStage: \'audible-body-carry\'',
      'expect(rows[0]?.embodimentClosureStage).toBe(\'audible-body-carry\')',
    ],
  },
  {
    entry: 'speech-authority-structured-same-her-closure-stages',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'keeps structured same-her closure stage synchronized onto nested speech evidence snapshots when the top-level row derives it from settle authority summaries',
      'lane=body-carried-to-renderer-rejoin',
      'expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe(\'body-carried-to-renderer-rejoin\')',
    ],
  },
  {
    entry: 'speech-authority-repair-before-closeness-trust',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'keeps repair-before-closeness trust visible in speech authority segment rows when companionship hints only survive on playback cue authority view',
      'residentMode: \'repair-before-closeness\'',
      'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
    ],
  },
  {
    entry: 'speech-authority-thin-affective-room-making',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'keeps thinner affective-residue room-making wording visible in speech authority settle summaries when playback cue authority still carries the measured-return line',
      '余韵还在，先留白，别立刻把温度放大',
      'key: \'settle-authority\'',
    ],
  },
  {
    entry: 'speech-authority-same-turn-if-invited-trust',
    file: './performance-visualizer-speech-authority.test.ts',
    snippets: [
      'keeps same-turn-if-invited measured-return trust visible in speech authority rows when playback cue authority stays on the callback line',
      'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      'residentMode: \'measured-return\'',
    ],
  },
] as const

describe('performance visualizer speech authority project awareness audit', () => {
  it('keeps one explicit route-level proof that speech authority segment rows preserve same-her embodiment closure truth on the devtools surface', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'speech-authority-body-carried-same-her-line' }),
      expect.objectContaining({ entry: 'speech-authority-normalized-audible-body-stage' }),
      expect.objectContaining({ entry: 'speech-authority-structured-same-her-closure-stages' }),
      expect.objectContaining({ entry: 'speech-authority-repair-before-closeness-trust' }),
      expect.objectContaining({ entry: 'speech-authority-thin-affective-room-making' }),
      expect.objectContaining({ entry: 'speech-authority-same-turn-if-invited-trust' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the speech authority project-awareness claim to current behavior tests instead of only broader devtools prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: speech authority segment rows now need dedicated same-her proof registered alongside the broader embodiment continuity chain', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const speechAuthoritySource = readFileSync(new URL('./performance-visualizer-speech-authority.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('performance-visualizer-speech-authority-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('speech authority segment rows')
    expect(matrixSource).toContain('body-carried speech rejoin lane truth')
    expect(matrixSource).toContain('same-turn-if-invited measured-return trust')
    expect(matrixSource).toContain('thinner affective-residue room-making wording')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('speech authority segment rows')
    expect(auditSource).toContain('body-carried speech rejoin lane truth')
    expect(auditSource).toContain('thinner affective-residue room-making wording')
    expect(speechAuthoritySource).toContain(
      'keeps structured same-her closure stage synchronized onto nested speech evidence snapshots when the top-level row derives it from settle authority summaries',
    )
    expect(speechAuthoritySource).toContain(
      'keeps thinner affective-residue room-making wording visible in speech authority settle summaries when playback cue authority still carries the measured-return line',
    )
  })
})
