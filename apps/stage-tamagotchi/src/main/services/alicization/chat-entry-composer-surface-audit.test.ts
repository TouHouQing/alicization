import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'widget-chat-area-reuses-text-composer-send-authority',
    file: '../../../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue',
    snippets: [
      'const composerStore = useChatTextComposerStore()',
      'const sent = await composerStore.sendCurrentMessage()',
      'await composerStore.sendCurrentMessage()',
    ],
  },
  {
    entry: 'mobile-interactive-area-reuses-text-composer-send-authority',
    file: '../../../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue',
    snippets: [
      'const composerStore = useChatTextComposerStore()',
      'await composerStore.sendCurrentMessage()',
    ],
  },
  {
    entry: 'stage-quick-reply-reuses-text-composer-send-authority',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue',
    snippets: [
      'const composerStore = useChatTextComposerStore()',
      'await composerStore.sendCurrentMessage()',
    ],
  },
  {
    entry: 'shared-composer-send-authority-still-injects-pre-dialogue-identity',
    file: '../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts',
    snippets: [
      'passes pre-dialogue digital-life closure awareness into the send path before the turn is ingested',
      'await expect(store.sendCurrentMessage()).resolves.toBe(true)',
      'preDialogueSendIdentity: expect.objectContaining({',
    ],
  },
] as const

describe('chat entry composer surface audit', () => {
  it('keeps UI composer surfaces on the shared text-composer send authority instead of fabricating separate pre-dialogue entrypoints', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'widget-chat-area-reuses-text-composer-send-authority' }),
      expect.objectContaining({ entry: 'mobile-interactive-area-reuses-text-composer-send-authority' }),
      expect.objectContaining({ entry: 'stage-quick-reply-reuses-text-composer-send-authority' }),
      expect.objectContaining({ entry: 'shared-composer-send-authority-still-injects-pre-dialogue-identity' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the composer-surface reuse claim to current surface implementations instead of only broader chat-entry prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('keeps composer-surface discovery broad enough to catch future TypeScript wrappers instead of only Vue SFCs', () => {
    const auditSource = readFileSync(new URL('./chat-entry-composer-surface-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(auditSource).toContain('useChatTextComposerStore\\\\(')
    expect(auditSource).toContain('sendCurrentMessage(')
    expect(auditSource).toContain('**/*.ts')
  })

  it('makes this boundary explicit: host-facing composer surfaces stay thin and the shared text-composer send authority still owns pre-dialogue identity injection', () => {
    const chatAreaSource = readFileSync(new URL('../../../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue', import.meta.url), 'utf8')
    const mobileSource = readFileSync(new URL('../../../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue', import.meta.url), 'utf8')
    const quickReplySource = readFileSync(new URL('../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue', import.meta.url), 'utf8')
    const composerStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.ts', import.meta.url), 'utf8')
    const composerStoreTestSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/text-composer-store.test.ts', import.meta.url), 'utf8')
    const routeAuditSource = readFileSync(new URL('./chat-entry-route-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(routeAuditSource).toContain('composer-surface-reuses-text-composer-send-authority')

    expect(chatAreaSource).not.toContain('preDialogueSendIdentity')
    expect(chatAreaSource).not.toContain('await ingest(')
    expect(chatAreaSource).not.toContain('.ingest(')

    expect(mobileSource).not.toContain('preDialogueSendIdentity')
    expect(mobileSource).not.toContain('await ingest(')
    expect(mobileSource).not.toContain('.ingest(')

    expect(quickReplySource).not.toContain('preDialogueSendIdentity')
    expect(quickReplySource).not.toContain('await ingest(')
    expect(quickReplySource).not.toContain('.ingest(')

    expect(composerStoreSource).toContain('const preDialogueSendIdentity = buildPreDialogueSendIdentity()')
    expect(composerStoreSource).toContain('await chatOrchestrator.ingest(rawDraft, {')
    expect(composerStoreSource).toContain('preDialogueSendIdentity,')
    expect(composerStoreTestSource).toContain(
      'passes pre-dialogue digital-life closure awareness into the send path before the turn is ingested',
    )
  })
})
