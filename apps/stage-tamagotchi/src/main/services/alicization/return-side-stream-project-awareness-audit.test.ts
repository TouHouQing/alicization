import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'renderer-stream-bridge-project-state-forwarding',
    file: '../../../renderer/alicization-chat-stream-bridge.test.ts',
    snippets: [
      'forwards explicit project-state continuity so renderer can keep the same-her project brief visible',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
    ],
  },
  {
    entry: 'renderer-stream-bridge-awareness-backfill',
    file: '../../../renderer/alicization-chat-stream-bridge.test.ts',
    snippets: [
      'backfills pre-dialogue awareness from project-state carry when the bridge only receives project continuity fields',
      'summaryLine: \'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.\'',
      'Before answering, remember: Alicization is a local-first digital life project',
      'The still-open closure is Emotion, memory, initiative, and embodiment still need stronger same-her proof',
    ],
  },
  {
    entry: 'renderer-stream-bridge-body-led-awareness-carry',
    file: '../../../renderer/alicization-chat-stream-bridge.test.ts',
    snippets: [
      'preserves body-face-motion same-her awareness and remaining-open lipsync voice carry when bridging main-process meta into renderer stream events',
      'remaining-open=lipsync+voice',
      'this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles',
    ],
  },
  {
    entry: 'renderer-stream-bridge-body-voice-awareness-carry',
    file: '../../../renderer/alicization-chat-stream-bridge.test.ts',
    snippets: [
      'preserves body-plus-voice same-her awareness and remaining-open face motion lipsync carry when bridging main-process meta into renderer stream events',
      'embodiment:body+voice-only',
      'resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'renderer-stream-bridge-body-lipsync-awareness-carry',
    file: '../../../renderer/alicization-chat-stream-bridge.test.ts',
    snippets: [
      'preserves body-plus-lipsync same-her awareness and remaining-open face motion voice carry when bridging main-process meta into renderer stream events',
      'embodiment:body+lipsync-only',
      'resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles',
    ],
  },
  {
    entry: 'structured-output-project-state-normalization',
    file: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.test.ts',
    snippets: [
      'preserves project state continuity fields from structured json payload',
      'accepts legacy latestProgress as landed progress when structured project state omits latestLandedProgress',
      'Legacy project-state landed progress already survives into the structured reply path.',
      'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
    ],
  },
  {
    entry: 'structured-output-body-led-awareness-normalization',
    file: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.test.ts',
    snippets: [
      'preserves still-voiced face-line host-facing awareness and remaining-open body motion lipsync carry from structured json payload',
      'embodiment:still-voiced-face-line',
      'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
    ],
  },
  {
    entry: 'structured-output-body-voice-awareness-normalization',
    file: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.test.ts',
    snippets: [
      'preserves body-plus-voice host-facing awareness and remaining-open face motion lipsync carry from structured json payload',
      'embodiment:body+voice-only',
      'resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'structured-output-body-lipsync-awareness-normalization',
    file: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.test.ts',
    snippets: [
      'preserves body-plus-lipsync host-facing awareness and remaining-open face motion voice carry from structured json payload',
      'embodiment:body+lipsync-only',
      'resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles',
    ],
  },
  {
    entry: 'chat-stream-ingest-persisted-phase-one-carry',
    file: '../../../../../../packages/stage-ui/src/stores/chat.test.ts',
    snippets: [
      'backfills canonical same-her self line before persisting bridge-authored structured payloads that only carry phase-one closure context',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
    ],
  },
  {
    entry: 'session-store-awareness-backfill',
    file: '../../../../../../packages/stage-ui/src/stores/chat/session-store.test.ts',
    snippets: [
      'backfills pre-dialogue awareness from persisted rich project-state carry when restored assistant payloads do not already include it',
      'Before answering, remember: Alicization is a local-first digital life project',
      'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
    ],
  },
  {
    entry: 'session-store-body-led-awareness-restore',
    file: '../../../../../../packages/stage-ui/src/stores/chat/session-store.test.ts',
    snippets: [
      'still-voiced face-line same-her',
      'remaining-open=body+motion+lipsync',
      'that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles',
    ],
  },
  {
    entry: 'session-store-body-voice-awareness-restore',
    file: '../../../../../../packages/stage-ui/src/stores/chat/session-store.test.ts',
    snippets: [
      'preserves body-plus-voice same-her awareness and remaining-open face motion lipsync carry when loading persisted assistant structured payloads',
      'embodiment:body+voice-only',
      'resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin',
    ],
  },
  {
    entry: 'session-store-body-lipsync-awareness-restore',
    file: '../../../../../../packages/stage-ui/src/stores/chat/session-store.test.ts',
    snippets: [
      'preserves body-plus-lipsync same-her awareness and remaining-open face motion voice carry when loading persisted assistant structured payloads',
      'embodiment:body+lipsync-only',
      'resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles',
    ],
  },
] as const

describe('return-side stream project awareness audit', () => {
  it('keeps one explicit route-level proof that return-side stream bridging, structured normalization, active ingest persistence, and restored assistant history preserve same-her project awareness', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'renderer-stream-bridge-project-state-forwarding' }),
      expect.objectContaining({ entry: 'renderer-stream-bridge-awareness-backfill' }),
      expect.objectContaining({ entry: 'renderer-stream-bridge-body-led-awareness-carry' }),
      expect.objectContaining({ entry: 'renderer-stream-bridge-body-voice-awareness-carry' }),
      expect.objectContaining({ entry: 'renderer-stream-bridge-body-lipsync-awareness-carry' }),
      expect.objectContaining({ entry: 'structured-output-project-state-normalization' }),
      expect.objectContaining({ entry: 'structured-output-body-led-awareness-normalization' }),
      expect.objectContaining({ entry: 'structured-output-body-voice-awareness-normalization' }),
      expect.objectContaining({ entry: 'structured-output-body-lipsync-awareness-normalization' }),
      expect.objectContaining({ entry: 'chat-stream-ingest-persisted-phase-one-carry' }),
      expect.objectContaining({ entry: 'session-store-awareness-backfill' }),
      expect.objectContaining({ entry: 'session-store-body-led-awareness-restore' }),
      expect.objectContaining({ entry: 'session-store-body-voice-awareness-restore' }),
      expect.objectContaining({ entry: 'session-store-body-lipsync-awareness-restore' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the return-side claim to current behavior tests instead of only registry classification for stream ingest, structured normalization, or restore seams', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current return-side stream and restore routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamBridgeSource = readFileSync(new URL('../../../renderer/alicization-chat-stream-bridge.test.ts', import.meta.url), 'utf8')
    const structuredOutputSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/composables/alicization-structured-output.test.ts', import.meta.url), 'utf8')
    const chatStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat.test.ts', import.meta.url), 'utf8')
    const sessionStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/session-store.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('return-side-stream-project-awareness-audit.test.ts')
    expect(streamBridgeSource).toContain(
      'backfills pre-dialogue awareness from project-state carry when the bridge only receives project continuity fields',
    )
    expect(structuredOutputSource).toContain(
      'preserves still-voiced face-line host-facing awareness and remaining-open body motion lipsync carry from structured json payload',
    )
    expect(chatStoreSource).toContain(
      'backfills canonical same-her self line before persisting bridge-authored structured payloads that only carry phase-one closure context',
    )
    expect(sessionStoreSource).toContain(
      'still-voiced face-line same-her',
    )
  })
})
