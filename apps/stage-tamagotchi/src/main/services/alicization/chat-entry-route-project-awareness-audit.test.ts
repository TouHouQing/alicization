import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'text-composer-explicit-send-identity',
    file: '../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts',
    snippets: [
      'passes pre-dialogue digital-life closure awareness into the send path before the turn is ingested',
      'summaryLine: \'Alicization is still in Phase 1 local digital life closure before this turn opens outward.\'',
      'awarenessLine: \'Before speaking, remember this is still the same digital life project before local fluency takes over.\'',
    ],
  },
  {
    entry: 'text-composer-visible-renderer-rejoin-without-body-send-identity',
    file: '../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts',
    snippets: [
      'transports the richer visible renderer-rejoin-without-body project brief through the real pre-dialogue send path when closure carry is the only source',
      'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the visible same-her line has already rejoined without body carry.',
    ],
  },
  {
    entry: 'composer-surface-reuses-text-composer-send-authority',
    file: './chat-entry-composer-surface-audit.test.ts',
    snippets: [
      'keeps UI composer surfaces on the shared text-composer send authority instead of fabricating separate pre-dialogue entrypoints',
      'expect.objectContaining({ entry: \'widget-chat-area-reuses-text-composer-send-authority\' })',
      'expect.objectContaining({ entry: \'mobile-interactive-area-reuses-text-composer-send-authority\' })',
      'expect.objectContaining({ entry: \'stage-quick-reply-reuses-text-composer-send-authority\' })',
      'expect.objectContaining({ entry: \'shared-composer-send-authority-still-injects-pre-dialogue-identity\' })',
    ],
  },
  {
    entry: 'cross-surface-voice-entry-send-identity',
    file: './chat-entry-voice-dispatch.test.ts',
    snippets: [
      'forwards the explicit pre-dialogue send identity through the primary desktop voice entry',
      'forwards the explicit pre-dialogue send identity through the primary web voice entry',
      'forwards the explicit pre-dialogue send identity through the primary pocket voice entry',
      'rejects the desktop voice entry when no explicit pre-dialogue send identity is available before opening outward',
      'rejects the web voice entry when no explicit pre-dialogue send identity is available before opening outward',
      'rejects the pocket voice entry when no explicit pre-dialogue send identity is available before opening outward',
    ],
  },
  {
    entry: 'context-bridge-explicit-send-identity-forwarding',
    file: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.test.ts',
    snippets: [
      'forwards pre-dialogue project awareness through outgoing tool-call, chat message, and complete server events',
      'injects explicit inspector-built pre-dialogue identity into raw context-recall input:text ingestion before the remote turn opens outward',
      'blocks raw context-recall input:text ingestion when no explicit pre-dialogue identity is available before the remote turn opens outward',
      'expect(messageEvent?.data?.[\'gen-ai:chat\']?.preDialogueSendIdentity).toEqual(context.preDialogueSendIdentity)',
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    ],
  },
  {
    entry: 'markdown-stress-explicit-send-identity',
    file: '../../../../../../packages/stage-ui/src/stores/markdown-stress.test.ts',
    snippets: [
      'injects explicit inspector-built pre-dialogue identity into markdown stress dialogue sends before the stress harness opens outward',
      'origin: \'system\'',
      'preDialogueSendIdentity: expect.objectContaining({',
      'blocks markdown stress dialogue sends when no explicit pre-dialogue identity is available before the harness opens outward',
    ],
  },
  {
    entry: 'desktop-main-chat-fallback-entry-keeps-shared-chat-store-path',
    file: './chat-entry-main-chat-fallback-dispatch.test.ts',
    snippets: [
      'routes the desktop main chat surface through shared chat-store fallback awareness instead of fabricating pre-dialogue identity',
      'expect(interactiveAreaSource).toContain(\'await ingest(textToSend, {\')',
      'expect(interactiveAreaSource).toContain(\'origin: \\\'ui-user\\\'\')',
      'expect(interactiveAreaSource).not.toContain(\'preDialogueSendIdentity\')',
    ],
  },
  {
    entry: 'devtools-explicit-send-identity',
    file: './chat-entry-devtools-fallback-dispatch.test.ts',
    snippets: [
      'forwards explicit pre-dialogue identity through the web performance playground entry before devtools dialogue opens outward',
      'forwards explicit pre-dialogue identity through the pocket performance playground entry before devtools dialogue opens outward',
      'rejects the web performance playground entry when no explicit pre-dialogue send identity is available before devtools dialogue opens outward',
      'rejects the pocket performance playground entry when no explicit pre-dialogue send identity is available before devtools dialogue opens outward',
    ],
  },
  {
    entry: 'fallback-authority-rebuilds-richer-awareness',
    file: '../../../../../../packages/stage-ui/src/stores/renderer-fallback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that renderer chat fallback restores same-her project awareness before both compose-time and send-time dialogue surfaces',
      'rebuilds actual before-send pre-dialogue identity from session fallback when inspector snapshots are missing',
      'prefers richer session fallback awareness over a narrower embodiment headline when before-compose rebuilds turn identity without inspector state',
    ],
  },
  {
    entry: 'direct-bridge-canonical-awareness-authority',
    file: '../../../../../../packages/stage-ui/src/stores/alicization-epoch1.test.ts',
    snippets: [
      'derives canonical Alicization project awareness for async extraction when no per-turn send identity survived into the direct bridge batch',
      'Keep direct bridge extraction on one same-her project-awareness line before memory summaries widen outward.',
      'preDialogueSendIdentity: undefined',
    ],
  },
] as const

describe('chat entry route project awareness audit', () => {
  it('keeps one explicit route-level proof that known renderer and bridge dialogue entry routes either inject explicit same-her identity or intentionally rely on canonical fallback authority', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'text-composer-explicit-send-identity' }),
      expect.objectContaining({ entry: 'text-composer-visible-renderer-rejoin-without-body-send-identity' }),
      expect.objectContaining({ entry: 'composer-surface-reuses-text-composer-send-authority' }),
      expect.objectContaining({ entry: 'cross-surface-voice-entry-send-identity' }),
      expect.objectContaining({ entry: 'context-bridge-explicit-send-identity-forwarding' }),
      expect.objectContaining({ entry: 'markdown-stress-explicit-send-identity' }),
      expect.objectContaining({ entry: 'desktop-main-chat-fallback-entry-keeps-shared-chat-store-path' }),
      expect.objectContaining({ entry: 'devtools-explicit-send-identity' }),
      expect.objectContaining({ entry: 'fallback-authority-rebuilds-richer-awareness' }),
      expect.objectContaining({ entry: 'direct-bridge-canonical-awareness-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the chat-entry claim to current behavior tests instead of only renderer entry registry classification', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current known chat-entry routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const voiceDispatchSource = readFileSync(new URL('./chat-entry-voice-dispatch.test.ts', import.meta.url), 'utf8')
    const mainChatFallbackSource = readFileSync(new URL('./chat-entry-main-chat-fallback-dispatch.test.ts', import.meta.url), 'utf8')
    const devtoolsDispatchSource = readFileSync(new URL('./chat-entry-devtools-fallback-dispatch.test.ts', import.meta.url), 'utf8')
    const composerSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts', import.meta.url), 'utf8')
    const markdownStressSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/markdown-stress.test.ts', import.meta.url), 'utf8')
    const epoch1Source = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/alicization-epoch1.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('chat-entry-route-project-awareness-audit.test.ts')
    expect(voiceDispatchSource).toContain(
      'forwards the explicit pre-dialogue send identity through the primary pocket voice entry',
    )
    expect(mainChatFallbackSource).toContain(
      'routes the desktop main chat surface through shared chat-store fallback awareness instead of fabricating pre-dialogue identity',
    )
    expect(devtoolsDispatchSource).toContain(
      'forwards explicit pre-dialogue identity through the web performance playground entry before devtools dialogue opens outward',
    )
    expect(composerSource).toContain(
      'passes pre-dialogue digital-life closure awareness into the send path before the turn is ingested',
    )
    expect(composerSource).toContain(
      'transports the richer visible renderer-rejoin-without-body project brief through the real pre-dialogue send path when closure carry is the only source',
    )
    expect(markdownStressSource).toContain(
      'injects explicit inspector-built pre-dialogue identity into markdown stress dialogue sends before the stress harness opens outward',
    )
    expect(epoch1Source).toContain(
      'derives canonical Alicization project awareness for async extraction when no per-turn send identity survived into the direct bridge batch',
    )
  })
})
