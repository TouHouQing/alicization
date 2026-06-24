import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationChatStartPayloadNormalizationAuthorityFiles,
  alicizationChatStartPayloadNormalizedConsumerFiles,
  classifyAlicizationChatStartPayloadConsumerMode,
  resolveAlicizationChatStartPayloadAuditedFiles,
  resolveAlicizationChatStartPayloadConsumerAuditRegistry,
  resolveAlicizationChatStartPayloadConsumerMode,
} from './chat-start-awareness-audit'
import { collectAlicizationChatStartPayloadTypeConsumerFiles } from './chat-start-entrypoint-audit'

describe('chat-start-awareness-audit', () => {
  it('reuses a shared chat-start payload scanner instead of maintaining a local payload type scan copy', () => {
    const source = readFileSync(new URL('./chat-start-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./chat-start-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationChatStartPayloadTypeConsumerFiles(')
    expect(/^function collectTypeUsingSourceFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current AlicizationChatStartPayload source file explicitly classified', () => {
    const discoveredFiles = collectAlicizationChatStartPayloadTypeConsumerFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationChatStartPayloadAuditedFiles().slice().sort())
    expect(resolveAlicizationChatStartPayloadConsumerAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('fails closed when a chat-start governance row carries a mode that does not belong to chat-start awareness mapping', () => {
    expect(() => classifyAlicizationChatStartPayloadConsumerMode({
      relativePath: 'unexpected.ts',
      mode: 'typed-consumer',
    })).toThrowError('Unexpected Alicization chat-start governance mode')
  })

  it('requires every normalize-before-use chat-start consumer to call the canonical pre-dialogue identity resolver', () => {
    for (const relativePath of alicizationChatStartPayloadNormalizedConsumerFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationChatStartPayloadConsumerMode(relativePath)).toBe('normalize-before-use')
      expect(source).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity(')
    }
  })

  it('keeps normalization authority files explicit and singularly responsible for the canonical resolver', () => {
    for (const relativePath of alicizationChatStartPayloadNormalizationAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationChatStartPayloadConsumerMode(relativePath)).toBe('normalization-authority')
      expect(source).toContain('export function resolveAlicizationChatStartPayloadPreDialogueSendIdentity(')
      expect(source).toContain('function buildCanonicalPreDialogueSendIdentity()')
    }
  })
})
