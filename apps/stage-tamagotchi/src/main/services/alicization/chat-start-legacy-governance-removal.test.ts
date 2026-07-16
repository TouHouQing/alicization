import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../../../../..')

function readRepositoryFile(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

describe('chat-start legacy governance removal', () => {
  it('removes pre-dialogue identity governance from current chat-start contracts and runtime', () => {
    const productionFiles = [
      'apps/stage-tamagotchi/src/shared/eventa.ts',
      'apps/stage-tamagotchi/src/shared/alicization-chat-transport.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.ts',
      'packages/stage-ui/src/stores/alicization-bridge.ts',
      'packages/stage-ui/src/types/chat.ts',
      'packages/stage-shared/src/alicization-chat-entry-dispatch.ts',
      'packages/plugin-protocol/src/types/events.ts',
      'apps/server/src/services/chats.ts',
      'apps/server/src/api/chats.schema.ts',
    ] as const

    for (const path of productionFiles) {
      const source = readRepositoryFile(path)
      expect(source, path).not.toContain('preDialogueSendIdentity')
      expect(source, path).not.toContain('AlicizationPreDialogueSendIdentity')
    }
  })

  it('constructs only current chat-start fields before the renderer transport whitelist', () => {
    const source = readRepositoryFile('apps/stage-tamagotchi/src/renderer/App.vue')
    const start = source.indexOf('function sanitizeRendererAlicizationChatStartPayload(')
    const end = source.indexOf('\n}\n', start)
    const helper = source.slice(start, end)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(helper).not.toContain('...payload')
    expect(helper).toContain('cardId,')
    expect(helper).toContain('messages: payload.messages')
  })

  it('routes the direct renderer chat-start bridge through the same whitelist', () => {
    const source = readRepositoryFile('apps/stage-tamagotchi/src/renderer/App.vue')
    const directStart = source.indexOf('  chatStart: async payload =>')
    const directEnd = source.indexOf('\n  chatAbort:', directStart)
    const directBlock = source.slice(directStart, directEnd)
    const streamStart = source.indexOf('  streamChat: async (payload, options) =>')
    const streamEnd = source.indexOf('\n  clearAllConversations:', streamStart)
    const streamBlock = source.slice(streamStart, streamEnd)

    expect(directStart).toBeGreaterThanOrEqual(0)
    expect(directBlock).toContain('sanitizeRendererAlicizationChatStartPayload(')
    expect(directBlock).not.toContain('...payload')
    expect(streamStart).toBeGreaterThanOrEqual(0)
    expect(streamBlock).toContain(
      'const transportPayloadResult = sanitizeRendererAlicizationChatStartPayload(',
    )
    expect(streamBlock).not.toMatch(
      /sanitizeAlicizationChatStartPayloadForTransport\(\{\s*\.\.\./u,
    )
  })

  it('removes the deleted chat-entry context generic instead of preserving a compatibility slot', () => {
    const source = readRepositoryFile(
      'packages/stage-shared/src/alicization-chat-entry-dispatch.ts',
    )

    expect(source).not.toContain('_TContext')
  })

  it('keeps the typed runtime digest on the stage-ui accepted-start result contract', () => {
    const source = readRepositoryFile(
      'packages/stage-ui/src/stores/alicization-bridge.ts',
    )
    const start = source.indexOf('export interface AlicizationChatStartResult {')
    const end = source.indexOf('\n}\n', start)
    const resultContract = source.slice(start, end)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(resultContract).toContain('runtimeDigest?: AlicizationRuntimeDigest | null')
    expect(resultContract).not.toContain('projectState?:')
    expect(resultContract).not.toContain('preDialogueAwareness?:')
  })
})
