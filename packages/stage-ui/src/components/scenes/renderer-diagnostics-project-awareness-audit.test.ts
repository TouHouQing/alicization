import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'alerts-audible-body-partial-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds an audible-body partial-lane continuity reason summary when the surviving line is specifically the resident body plus audible continuity carry',
      'resident body、lipsync 和 voice 仍在同一段数字生命表达上',
      'face 和 motion 还没有重新接回这条活着的身体线',
    ],
  },
  {
    entry: 'alerts-host-facing-audible-continuity-wording',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      '当前 resident body 这条身体线仍和可听见的 continuity 生命线一起托住同一段数字生命表达，但 face 和 motion 还没有重新接回这条活着的身体线',
      'The resident body lane is still holding together with one audible continuity lane, but face and motion have not yet rejoined the same active segment.',
    ],
  },
  {
    entry: 'vrm-diagnostics-audible-continuity-recovery',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps body+lipsync+voice recovery visible on the renderer alignment surface summary when the audible-body line re-forms before face and motion return',
      'body+lipsync+voice recovery@segment-live2d-audible-body-first-return',
      'pending-rejoin=face+motion',
    ],
  },
  {
    entry: 'live2d-diagnostics-audible-continuity-recovery',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps lipsync+voice recovery visible on the renderer alignment surface summary when the audible continuity line re-forms before body face and motion return',
      'lipsync+voice recovery@segment-live2d-audible-voice-first-return',
      'pending-rejoin=body+face+motion',
    ],
  },
  {
    entry: 'overlay-body-only-hold-minimum-anchor',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'surfaces body-only hold when the living line is still only anchored through body',
      'segment-body-only-hold-1',
      'closure=body-only-hold',
    ],
  },
  {
    entry: 'overlay-body-carried-renderer-rejoin-anchor',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'surfaces body-carried renderer rejoin when body and voice survive together before lipsync returns',
      'segment-body-voice-closure-carry-1',
      'closure=body-carried-to-renderer-rejoin',
    ],
  },
  {
    entry: 'overlay-face-lipsync-quieter-lane-focus',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'builds a renderer lane focus summary when face and lipsync are the surviving quieter visible continuity carry before body motion and voice rejoin',
      'focus=face+lipsync | pending=body+motion+voice',
      'segment-live2d-visible-face-mouth-return',
    ],
  },
  {
    entry: 'overlay-motion-lipsync-quieter-lane-focus',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'builds a renderer lane focus summary when motion and lipsync are the surviving quieter visible continuity carry before body face and voice rejoin',
      'focus=motion+lipsync | pending=body+face+voice',
      'segment-live2d-visible-motion-mouth-return',
    ],
  },
  {
    entry: 'alerts-lipsync-voice-single-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds a lipsync+voice partial-lane continuity reason summary when the surviving continuity line is still audible through mouth and voice together',
      '当前只有 lipsync 和 voice 通道还与表达状态对齐',
      '实际执行落点是口型和语音',
    ],
  },
  {
    entry: 'alerts-face-voice-single-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds a face+voice partial-lane continuity reason summary when expression and voice are the only surviving continuity carry',
      '当前只有 face 和 voice 通道还与表达状态对齐',
      '实际执行落点是表情和语音',
    ],
  },
  {
    entry: 'alerts-motion-voice-single-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds a motion+voice partial-lane continuity reason summary when motion and voice are the only surviving continuity carry',
      '当前只有 motion 和 voice 通道还与表达状态对齐',
      '实际执行落点是动作和语音',
    ],
  },
  {
    entry: 'alerts-face-lipsync-quieter-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds a face+lipsync partial-lane continuity reason summary when expression and mouth are the quieter surviving continuity carry',
      '当前只有 face 和 lipsync 这条 continuity 生命线还和同一段数字生命表达对齐',
      'face+lipsync active | pending body+motion+voice',
    ],
  },
  {
    entry: 'alerts-motion-lipsync-quieter-lane-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'builds a motion+lipsync partial-lane continuity reason summary when motion and mouth are the quieter surviving continuity carry',
      '当前只有 motion 和 lipsync 这条 continuity 生命线还和同一段数字生命表达对齐',
      'motion+lipsync active | pending body+face+voice',
    ],
  },
  {
    entry: 'overlay-still-voiced-face-and-motion-proof',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps still-voiced face-and-motion continuity explicit on the renderer alignment surface summary when face motion and voice are the surviving carry before body and lipsync return',
      'continuity=embodiment:still-voiced-face-motion-line',
      'focus=face+motion+voice | pending=body+lipsync',
    ],
  },
  {
    entry: 'alerts-still-voiced-face-and-motion-summary',
    file: './stage-embodiment-diagnostics-alerts.test.ts',
    snippets: [
      'keeps still-voiced face-and-motion continuity explicit inside runtime-only renderer summaries instead of flattening it into separate face or motion drift notes',
      'same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1',
      'pending-rejoin=body+lipsync',
    ],
  },
  {
    entry: 'overlay-lipsync-voice-single-lane-proof',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps repair-before-closeness visible when only lipsync and voice are still carrying the same cautious line',
      'lane=lipsync+voice-only',
      'hold the same cautious line in voice and mouth before closeness widens again',
    ],
  },
  {
    entry: 'overlay-lipsync-voice-signature-only-continuity-source',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps signature-only quieter lipsync-and-voice continuity readable on diagnostics cards instead of dropping the surviving audible line to a generic lane label',
      'continuity=embodiment:lipsync+voice-only',
      'resident|main-runtime|accompanying|quiet-accompaniment|lipsync+voice-only',
    ],
  },
  {
    entry: 'overlay-body-lipsync-signature-only-continuity-source',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'keeps signature-only quieter body-and-lipsync continuity readable on diagnostics cards instead of dropping the surviving inward line to a generic lane label',
      'continuity=embodiment:body+lipsync-only',
      'resident|main-runtime|accompanying|quiet-accompaniment|body+lipsync-only',
    ],
  },
  {
    entry: 'overlay-body-lipsync-thin-voice-shell-rebuild',
    file: './stage-embodiment-diagnostics-overlay-summary.test.ts',
    snippets: [
      'rebuilds thin voice lane continuity from the current body+lipsync living line instead of leaving host-facing loop summaries with a thinner voiced shell',
      'zh-CN | closure=0.35 | precision=0.55 | companion=measured-return | timing=body-lipsync-carry',
      'timing=audible-body-carry',
    ],
  },
  {
    entry: 'overlay-memory-closure-identity-visible',
    file: './stage-embodiment-diagnostics-overlay.vue',
    snippets: [
      'memory: {{ diagnostics.visualPresence.runtimeMemoryClosureIdentityKey ?? \'none\' }}',
      'break-all text-white/62',
    ],
  },
] as const

describe('renderer diagnostics project awareness audit', () => {
  it('keeps one explicit route-level proof that renderer diagnostics still carry the continuity project line when embodiment narrows under noisy desktop drift', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'alerts-audible-body-partial-lane-summary' }),
      expect.objectContaining({ entry: 'alerts-host-facing-audible-continuity-wording' }),
      expect.objectContaining({ entry: 'vrm-diagnostics-audible-continuity-recovery' }),
      expect.objectContaining({ entry: 'live2d-diagnostics-audible-continuity-recovery' }),
      expect.objectContaining({ entry: 'overlay-body-only-hold-minimum-anchor' }),
      expect.objectContaining({ entry: 'overlay-body-carried-renderer-rejoin-anchor' }),
      expect.objectContaining({ entry: 'overlay-face-lipsync-quieter-lane-focus' }),
      expect.objectContaining({ entry: 'overlay-motion-lipsync-quieter-lane-focus' }),
      expect.objectContaining({ entry: 'alerts-lipsync-voice-single-lane-summary' }),
      expect.objectContaining({ entry: 'alerts-face-voice-single-lane-summary' }),
      expect.objectContaining({ entry: 'alerts-motion-voice-single-lane-summary' }),
      expect.objectContaining({ entry: 'alerts-face-lipsync-quieter-lane-summary' }),
      expect.objectContaining({ entry: 'alerts-motion-lipsync-quieter-lane-summary' }),
      expect.objectContaining({ entry: 'overlay-still-voiced-face-and-motion-proof' }),
      expect.objectContaining({ entry: 'alerts-still-voiced-face-and-motion-summary' }),
      expect.objectContaining({ entry: 'overlay-lipsync-voice-single-lane-proof' }),
      expect.objectContaining({ entry: 'overlay-lipsync-voice-signature-only-continuity-source' }),
      expect.objectContaining({ entry: 'overlay-body-lipsync-signature-only-continuity-source' }),
      expect.objectContaining({ entry: 'overlay-body-lipsync-thin-voice-shell-rebuild' }),
      expect.objectContaining({ entry: 'overlay-memory-closure-identity-visible' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the renderer-diagnostics project-awareness claim to current behavior tests instead of only broader embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: renderer diagnostics now have dedicated continuity project proof, while fully sustained noisy-desktop closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const overlaySource = readFileSync(new URL('./stage-embodiment-diagnostics-overlay-summary.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Embodiment-facing body/voice/face/motion continuity surfaces')
    expect(matrixSource).toContain('renderer-diagnostics-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('body-only-hold overlay anchor')
    expect(matrixSource).toContain('body-carried-to-renderer-rejoin overlay anchor')
    expect(matrixSource).toContain('face-and-lipsync quieter-lane alert anchor')
    expect(matrixSource).toContain('motion-and-lipsync quieter-lane alert anchor')
    expect(matrixSource).toContain('face-and-lipsync quieter-lane overlay anchor')
    expect(matrixSource).toContain('motion-and-lipsync quieter-lane overlay anchor')
    expect(matrixSource).toContain('body-and-lipsync thin-voice shell rebuild anchor')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(overlaySource).toContain(
      'surfaces body-only hold when the living line is still only anchored through body',
    )
    expect(overlaySource).toContain(
      'surfaces body-carried renderer rejoin when body and voice survive together before lipsync returns',
    )
    expect(overlaySource).toContain(
      'keeps body+lipsync+voice recovery visible on the renderer alignment surface summary when the audible-body line re-forms before face and motion return',
    )
    expect(overlaySource).toContain(
      'keeps lipsync+voice recovery visible on the renderer alignment surface summary when the audible continuity line re-forms before body face and motion return',
    )
    expect(overlaySource).toContain(
      'builds a renderer lane focus summary when face and lipsync are the surviving quieter visible continuity carry before body motion and voice rejoin',
    )
    expect(overlaySource).toContain(
      'builds a renderer lane focus summary when motion and lipsync are the surviving quieter visible continuity carry before body face and voice rejoin',
    )
    expect(overlaySource).toContain(
      'keeps still-voiced face-and-motion continuity explicit on the renderer alignment surface summary when face motion and voice are the surviving carry before body and lipsync return',
    )
    expect(overlaySource).toContain(
      'rebuilds thin voice lane continuity from the current body+lipsync living line instead of leaving host-facing loop summaries with a thinner voiced shell',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-overlay.vue', import.meta.url), 'utf8')).toContain(
      'memory: {{ diagnostics.visualPresence.runtimeMemoryClosureIdentityKey ?? \'none\' }}',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-alerts.test.ts', import.meta.url), 'utf8')).toContain(
      'builds a face+voice partial-lane continuity reason summary when expression and voice are the only surviving continuity carry',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-alerts.test.ts', import.meta.url), 'utf8')).toContain(
      'builds a motion+voice partial-lane continuity reason summary when motion and voice are the only surviving continuity carry',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-alerts.test.ts', import.meta.url), 'utf8')).toContain(
      'builds a face+lipsync partial-lane continuity reason summary when expression and mouth are the quieter surviving continuity carry',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-alerts.test.ts', import.meta.url), 'utf8')).toContain(
      'builds a motion+lipsync partial-lane continuity reason summary when motion and mouth are the quieter surviving continuity carry',
    )
    expect(readFileSync(new URL('./stage-embodiment-diagnostics-alerts.test.ts', import.meta.url), 'utf8')).toContain(
      'keeps still-voiced face-and-motion continuity explicit inside runtime-only renderer summaries instead of flattening it into separate face or motion drift notes',
    )
  })
})
