import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationChatStartDeepHelperOwnerAuditFiles,
  resolveAlicizationChatStartDeepHelperOwnerAuditRegistry,
  resolveAlicizationChatStartDeepHelperOwnerAuditTargets,
  resolveAlicizationChatStartDeepHelperOwnerMode,
} from './chat-start-deep-helper-owner-audit'
import { collectAlicizationChatStartDeepHelperOwnerFiles } from './chat-start-entrypoint-audit'

describe('chat-start deep helper owner audit', () => {
  it('reuses the shared chat-start entrypoint scanner for deep-helper owner discovery instead of keeping a local helper-call scan copy', () => {
    const source = readFileSync(new URL('./chat-start-deep-helper-owner-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./chat-start-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationChatStartDeepHelperOwnerFiles(')
    expect(/^function collectDeepHelperOwnerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current direct external caller of deep chat-start and timeout-fallback helpers explicitly registered', () => {
    const discoveredFiles = collectAlicizationChatStartDeepHelperOwnerFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationChatStartDeepHelperOwnerAuditFiles().slice().sort())
    expect(resolveAlicizationChatStartDeepHelperOwnerAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('keeps the audited helper target list synchronized with the current owner registry', () => {
    expect(resolveAlicizationChatStartDeepHelperOwnerAuditTargets().slice().sort()).toEqual([
      'buildAlicizationMainGatewayTimeoutFallbackReply',
      'prepareMainChatExecution',
      'prepareMainChatPrelude',
    ])
  })

  it('requires prelude/preparation owners to normalize payload project awareness before calling deeper helpers', () => {
    for (const entry of resolveAlicizationChatStartDeepHelperOwnerAuditRegistry()) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      if (entry.mode !== 'prelude-preparation-owner')
        continue

      expect(resolveAlicizationChatStartDeepHelperOwnerMode(entry.relativePath)).toBe('prelude-preparation-owner')
      expect(source).toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity(')
      expect(source).toContain('prepareMainChatPrelude(')
      expect(source).toContain('prepareMainChatExecution(')
    }
  })

  it('requires timeout-fallback owners to route only the already-selected pre-dialogue identity fragment into local fallback generation', () => {
    for (const entry of resolveAlicizationChatStartDeepHelperOwnerAuditRegistry()) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      if (entry.mode !== 'timeout-fallback-owner')
        continue

      expect(resolveAlicizationChatStartDeepHelperOwnerMode(entry.relativePath)).toBe('timeout-fallback-owner')
      expect(source).toContain('buildAlicizationMainGatewayTimeoutFallbackReply({')
      expect(source).toContain('preDialogueSendIdentity: payload.preDialogueSendIdentity ?? null')
      expect(source).toContain('runtimeDigest: resolveRuntimeDigestFromPrepared()')
    }
  })
})
