import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveRendererChatEntryAwarenessAuditFiles,
  resolveRendererChatEntryAwarenessMode,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import {
  alicizationPreDialogueBridgeForwardingFiles,
  alicizationPreDialogueIdentityConstructionFiles,
  alicizationPreDialogueTransportSanitizationFiles,
  resolveAlicizationPreDialogueTransportAuditFiles,
  resolveAlicizationPreDialogueTransportAuditMode,
  resolveAlicizationPreDialogueTransportAuditRegistry,
  resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors,
} from './pre-dialogue-transport-audit'
import {
  collectAlicizationPreDialogueBridgeForwardingFiles,
  collectAlicizationPreDialogueIdentityConstructionFiles,
  collectAlicizationPreDialogueTransportGovernedFiles,
  collectAlicizationPreDialogueTransportSanitizationFiles,
} from './pre-dialogue-transport-entrypoint-audit'

describe('pre-dialogue-transport-audit', () => {
  it('keeps every audited outbound pre-dialogue transport boundary explicitly registered', () => {
    const expectedFiles = collectAlicizationPreDialogueTransportGovernedFiles()

    expect(resolveAlicizationPreDialogueTransportAuditFiles().slice().sort()).toEqual(expectedFiles)
    expect(resolveAlicizationPreDialogueTransportAuditRegistry().map(entry => entry.relativePath).sort()).toEqual(expectedFiles)
    expect(collectAlicizationPreDialogueIdentityConstructionFiles()).toEqual(alicizationPreDialogueIdentityConstructionFiles)
    expect(collectAlicizationPreDialogueTransportSanitizationFiles()).toEqual(alicizationPreDialogueTransportSanitizationFiles)
    expect(collectAlicizationPreDialogueBridgeForwardingFiles()).toEqual(alicizationPreDialogueBridgeForwardingFiles)
  }, 20_000)

  it('keeps pre-dialogue transport discovery sourced from the shared helper instead of a stale local file list or ad hoc scan copy', () => {
    const source = readFileSync(new URL('./pre-dialogue-transport-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./pre-dialogue-transport-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationPreDialogueTransportGovernedFiles()')
    expect(/^function collectPreDialogueTransportFiles\(/m.test(source)).toBe(false)
  })

  it('keeps identity-construction discovery broad enough to catch future package-level transport wrappers instead of only stage-ui store-local seams', () => {
    const source = readFileSync(new URL('./pre-dialogue-transport-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('toAlicizationChatStartPreDialogueSendIdentity\\\\(')
    expect(source).toContain('\'packages\'')
  })

  it('keeps bridge-forwarding discovery broad enough to catch future package-level transport wrappers instead of only stage-ui store-local seams', () => {
    const source = readFileSync(new URL('./pre-dialogue-transport-entrypoint-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('\\\\.\\\\.\\\\.\\\\(context\\\\.preDialogueSendIdentity !== undefined')
    expect(source).toContain('\'packages\'')
  })

  it('requires identity-construction boundaries to explicitly materialize outbound pre-dialogue send identity', () => {
    for (const relativePath of alicizationPreDialogueIdentityConstructionFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationPreDialogueTransportAuditMode(relativePath)).toBe('identity-construction')
      expect(source).toContain('toAlicizationChatStartPreDialogueSendIdentity(')
      expect(source).toContain('preDialogueSendIdentity:')
    }
  })

  it('requires transport-sanitization boundaries to preserve pre-dialogue send identity while sanitizing renderer payloads', () => {
    for (const relativePath of alicizationPreDialogueTransportSanitizationFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationPreDialogueTransportAuditMode(relativePath)).toBe('transport-sanitization')
      expect(source).toContain('sanitizeAlicizationChatStartPayloadForTransport({')
      expect(source).toContain('summarizeAlicizationChatStartPayloadForTransport(transportPayload)')
      expect(source).toContain('transportPayload: transportPayloadSummary')
      expect(source).toContain('...payload,')
    }
  })

  it('requires the desktop renderer transport-sanitization seam to remain explicitly shared with renderer chat-entry governance instead of drifting into a transport-only registration island', () => {
    const transportRelativePath = '../../../renderer/App.vue'
    const chatEntryRelativePath = '../../../../apps/stage-tamagotchi/src/renderer/App.vue'
    const source = readFileSync(new URL(transportRelativePath, import.meta.url), 'utf8')
    const transportSummarySource = readFileSync(new URL('../../../shared/alicization-chat-transport.ts', import.meta.url), 'utf8')

    expect(resolveAlicizationPreDialogueTransportAuditMode(transportRelativePath)).toBe('transport-sanitization')
    expect(resolveRendererChatEntryAwarenessMode(chatEntryRelativePath)).toBe('direct-bridge-canonical-awareness')
    expect(source).toContain('sanitizeAlicizationChatStartPayloadForTransport({')
    expect(source).toContain('transportPayload: transportPayloadSummary')
    expect(source).toContain('transportSanitization: transportPayloadResult.report.changed')
    expect(transportSummarySource).toContain('hasPreDialogueCompanionHeadlineLine')
    expect(transportSummarySource).toContain('hasPreDialogueCompanionBriefingLine')
    expect(transportSummarySource).toContain('hasPreDialogueEmotionalClosureCue')
    expect(transportSummarySource).toContain('hasPreDialogueReasonPreview')
    expect(transportSummarySource).toContain('hasPreDialogueContinuitySummary')
    expect(transportSummarySource).toContain('hasPreDialogueContinuityAnchor')
    expect(transportSummarySource).toContain('hasPreDialogueContinuityDriftRisk')
    expect(transportSummarySource).toContain('hasPreDialogueContinuityHoldDetail')
  })

  it('requires every current pre-dialogue transport boundary to stay explicitly mirrored into chat-entry governance so send-identity seams cannot drift into a side registry', () => {
    const chatEntryFiles = resolveRendererChatEntryAwarenessAuditFiles()
    const mirrors = resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors()

    expect(mirrors.map(entry => entry.transportRelativePath).slice().sort())
      .toEqual(resolveAlicizationPreDialogueTransportAuditFiles().slice().sort())
    expect(mirrors).toEqual([
      expect.objectContaining({
        transportRelativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
        chatEntryRelativePath: './chat.ts',
      }),
      expect.objectContaining({
        transportRelativePath: '../../../renderer/App.vue',
        chatEntryRelativePath: '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
      }),
      expect.objectContaining({
        transportRelativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
        chatEntryRelativePath: './mods/api/context-bridge.ts',
      }),
    ])

    for (const mirror of mirrors)
      expect(chatEntryFiles).toContain(mirror.chatEntryRelativePath)

    expect(resolveRendererChatEntryAwarenessMode('./chat.ts')).toBe('explicit-pre-dialogue-identity')
    expect(resolveRendererChatEntryAwarenessMode('../../../../apps/stage-tamagotchi/src/renderer/App.vue')).toBe('direct-bridge-canonical-awareness')
    expect(resolveRendererChatEntryAwarenessMode('./mods/api/context-bridge.ts')).toBe('explicit-pre-dialogue-identity')
  })

  it('requires bridge-forwarding boundaries to intentionally forward pre-dialogue send identity across remote chat channels', () => {
    for (const relativePath of alicizationPreDialogueBridgeForwardingFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveAlicizationPreDialogueTransportAuditMode(relativePath)).toBe('bridge-forwarding')
      expect(source).toContain('context.preDialogueSendIdentity')
      expect(source).toContain('? { preDialogueSendIdentity: context.preDialogueSendIdentity ?? null }')
    }
  })
})
