import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  classifyRendererChatEntryAwarenessMode,
  collectRendererChatEntryGovernedFiles,
  collectRendererChatIngestEntrypointFiles,
  collectRendererComposerSurfaceFiles,
  collectRendererDirectBridgeDialogueConsumerFiles,
  collectRendererVoiceDispatchCallerFiles,
  rendererChatEntryDirectBridgeCanonicalAwarenessFiles,
  rendererChatEntryExplicitPreDialogueIdentityFiles,
  rendererChatEntryReliesOnChatStoreFallbackFiles,
  rendererChatEntrySharedSendAuthorityFiles,
  resolveRendererChatEntryAwarenessAuditFiles,
  resolveRendererChatEntryAwarenessAuditRegistry,
  resolveRendererChatEntryAwarenessMode,
  resolveRendererChatEntryOnlyFallbackBoundaryFile,
} from './chat-entry-awareness-audit'

describe('chat entry awareness audit', () => {
  it('requires repo-level entrypoint governance proof to reuse the shared chat-entry scanner instead of maintaining a local rg-based duplicate', () => {
    const source = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/main/services/alicization/entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit\'')
    expect(source).toContain('collectRendererChatEntryGovernedFiles(')
    expect(source).not.toContain('function collectChatEntryGovernedFiles(')
  })

  it('keeps renderer voice-dispatch discovery broad enough to catch future TypeScript wrapper entrypoints instead of only .vue pages', () => {
    const source = readFileSync(new URL('./chat-entry-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('dispatch(Web|Pocket|Desktop)(VoiceTurn\\\\(|PerformancePlaygroundChatTurn\\\\()')
    expect(source).toContain('relativePath.endsWith(\'.vue\') || relativePath.endsWith(\'.ts\')')
  })

  it('keeps renderer ingest-entry discovery broad enough to catch destructured ingest callers in real Vue chat surfaces instead of only member-call shapes', () => {
    const source = readFileSync(new URL('./chat-entry-awareness-audit.ts', import.meta.url), 'utf8')
    const interactiveAreaSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue', import.meta.url), 'utf8')

    expect(interactiveAreaSource).toContain('await ingest(textToSend, {')
    expect(source).toContain('\\\\bingest\\\\(')
  })

  it('keeps renderer ingest-entry discovery broad enough to catch future package-level thin wrappers instead of only app surfaces and store-local seams', () => {
    const source = readFileSync(new URL('./chat-entry-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('\\\\.ingest\\\\(|\\\\bingest\\\\(')
    expect(source).toContain('\'apps\'')
    expect(source).toContain('\'packages\'')
  })

  it('keeps direct-bridge discovery broad enough to catch future package-level bridge wrappers instead of only stage-ui store-local seams', () => {
    const source = readFileSync(new URL('./chat-entry-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toMatch(/bridge\\\\\.streamChat\\\\\(\|bridge\\\\\.chatStart\\\\\(\|bridgeStreamChat\\\\\(\|bridgeChatStart\\\\\([\s\S]*'packages',/)
  })

  it('keeps shared-composer discovery broad enough to catch future TypeScript wrapper entrypoints instead of only Vue SFC chat shells', () => {
    const source = readFileSync(new URL('./chat-entry-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('useChatTextComposerStore\\\\(')
    expect(source).toContain('sendCurrentMessage\\\\(')
    expect(source).toContain('**/*.ts')
  })

  it('fails closed when a chat-entry governance row carries a mode that does not belong to renderer chat entry awareness mapping', () => {
    expect(() => classifyRendererChatEntryAwarenessMode({
      relativePath: './unexpected.ts',
      mode: 'dispatch-owner',
    })).toThrowError('Unexpected Alicization chat-entry governance mode')
  })

  it('requires the stage-web voice/page entry to inject explicit pre-dialogue identity before dispatch', () => {
    const dispatchSource = readFileSync(new URL('../../../../apps/stage-web/src/pages/index.voice.ts', import.meta.url), 'utf8')
    const pageSource = readFileSync(new URL('../../../../apps/stage-web/src/pages/index.vue', import.meta.url), 'utf8')

    expect(dispatchSource.includes('preDialogueSendIdentity')).toBe(true)
    expect(dispatchSource.includes('dispatchWebVoiceTurn')).toBe(true)
    expect(dispatchSource.includes('return input.ingest(input.text, {')).toBe(true)
    expect(pageSource.includes('buildPreDialogueSendIdentityFromInspectorSnapshots(')).toBe(true)
    expect(pageSource.includes('preDialogueSendIdentity: buildVoicePreDialogueSendIdentity()')).toBe(true)
    expect(pageSource.includes('dispatchWebVoiceTurn({')).toBe(true)
  })

  it('requires the stage-pocket voice/page entry to inject explicit pre-dialogue identity before dispatch', () => {
    const dispatchSource = readFileSync(new URL('../../../../apps/stage-pocket/src/pages/index.voice.ts', import.meta.url), 'utf8')
    const pageSource = readFileSync(new URL('../../../../apps/stage-pocket/src/pages/index.vue', import.meta.url), 'utf8')

    expect(dispatchSource.includes('preDialogueSendIdentity')).toBe(true)
    expect(dispatchSource.includes('dispatchPocketVoiceTurn')).toBe(true)
    expect(dispatchSource.includes('return input.ingest(input.text, {')).toBe(true)
    expect(pageSource.includes('buildPreDialogueSendIdentityFromInspectorSnapshots(')).toBe(true)
    expect(pageSource.includes('preDialogueSendIdentity: buildVoicePreDialogueSendIdentity()')).toBe(true)
    expect(pageSource.includes('dispatchPocketVoiceTurn({')).toBe(true)
  })

  it('requires the desktop renderer voice/page entry to inject explicit pre-dialogue identity before dispatch', () => {
    const dispatchSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts', import.meta.url), 'utf8')
    const pageSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/pages/index.vue', import.meta.url), 'utf8')

    expect(dispatchSource.includes('preDialogueSendIdentity')).toBe(true)
    expect(dispatchSource.includes('dispatchDesktopVoiceTurn')).toBe(true)
    expect(dispatchSource.includes('return input.ingest(input.text, {')).toBe(true)
    expect(pageSource.includes('buildPreDialogueSendIdentityFromInspectorSnapshots(')).toBe(true)
    expect(pageSource.includes('preDialogueSendIdentity: buildVoicePreDialogueSendIdentity()')).toBe(true)
    expect(pageSource.includes('dispatchDesktopVoiceTurn({')).toBe(true)
  })

  it('requires the stage-web performance playground entry to inject explicit pre-dialogue identity before dispatch', () => {
    const dispatchSource = readFileSync(new URL('../../../../apps/stage-web/src/pages/devtools/performance-playground.chat.ts', import.meta.url), 'utf8')
    const pageSource = readFileSync(new URL('../../../../apps/stage-web/src/pages/devtools/performance-playground.vue', import.meta.url), 'utf8')

    expect(dispatchSource.includes('preDialogueSendIdentity')).toBe(true)
    expect(dispatchSource.includes('dispatchWebPerformancePlaygroundChatTurn')).toBe(true)
    expect(dispatchSource.includes('return input.ingest(input.text, {')).toBe(true)
    expect(pageSource.includes('buildPreDialogueSendIdentityFromInspectorSnapshots(')).toBe(true)
    expect(pageSource.includes('preDialogueSendIdentity: buildPerformancePlaygroundPreDialogueSendIdentity()')).toBe(true)
    expect(pageSource.includes('dispatchWebPerformancePlaygroundChatTurn({')).toBe(true)
  })

  it('requires the stage-pocket performance playground entry to inject explicit pre-dialogue identity before dispatch', () => {
    const dispatchSource = readFileSync(new URL('../../../../apps/stage-pocket/src/pages/devtools/performance-playground.chat.ts', import.meta.url), 'utf8')
    const pageSource = readFileSync(new URL('../../../../apps/stage-pocket/src/pages/devtools/performance-playground.vue', import.meta.url), 'utf8')

    expect(dispatchSource.includes('preDialogueSendIdentity')).toBe(true)
    expect(dispatchSource.includes('dispatchPocketPerformancePlaygroundChatTurn')).toBe(true)
    expect(dispatchSource.includes('return input.ingest(input.text, {')).toBe(true)
    expect(pageSource.includes('buildPreDialogueSendIdentityFromInspectorSnapshots(')).toBe(true)
    expect(pageSource.includes('preDialogueSendIdentity: buildPerformancePlaygroundPreDialogueSendIdentity()')).toBe(true)
    expect(pageSource.includes('dispatchPocketPerformancePlaygroundChatTurn({')).toBe(true)
  })

  it('keeps every known renderer/chat ingest entrypoint explicitly registered', () => {
    const expectedFiles = [
      './alicization-epoch1.ts',
      './chat.ts',
      '../../../../packages/stage-layouts/src/components/Layouts/MobileInteractiveArea.vue',
      '../../../../packages/stage-layouts/src/components/Widgets/ChatArea.vue',
      '../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-composer.vue',
      '../../../../apps/stage-pocket/src/pages/devtools/performance-playground.vue',
      '../../../../apps/stage-pocket/src/pages/index.vue',
      '../../../../apps/stage-pocket/src/pages/devtools/performance-playground.chat.ts',
      '../../../../apps/stage-pocket/src/pages/index.voice.ts',
      '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
      '../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue',
      '../../../../apps/stage-tamagotchi/src/renderer/pages/index.vue',
      '../../../../apps/stage-tamagotchi/src/renderer/pages/index.desktop.ts',
      '../../../../apps/stage-web/src/pages/devtools/performance-playground.vue',
      '../../../../apps/stage-web/src/pages/devtools/performance-playground.chat.ts',
      '../../../../apps/stage-web/src/pages/index.vue',
      '../../../../apps/stage-web/src/pages/index.voice.ts',
      './markdown-stress.ts',
      './mods/api/context-bridge.ts',
      './chat/text-composer-store.ts',
    ].sort()

    expect([
      ...collectRendererComposerSurfaceFiles(),
      ...collectRendererChatIngestEntrypointFiles(),
      ...collectRendererDirectBridgeDialogueConsumerFiles(),
      ...collectRendererVoiceDispatchCallerFiles(),
    ].sort()).toEqual(expectedFiles)
    expect(collectRendererChatEntryGovernedFiles()).toEqual(expectedFiles)
    const registryFiles = resolveRendererChatEntryAwarenessAuditFiles().slice().sort()
    expect(resolveRendererChatEntryAwarenessAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(registryFiles)
    expect(registryFiles).toEqual(expectedFiles)
  })

  it('requires the desktop renderer transport handoff to stay explicitly classified so structured-clone sanitization cannot drop pre-dialogue awareness outside chat-entry governance', () => {
    const relativePath = '../../../../apps/stage-tamagotchi/src/renderer/App.vue'
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    const transportSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/shared/alicization-chat-transport.ts', import.meta.url), 'utf8')

    expect(resolveRendererChatEntryAwarenessMode(relativePath)).toBe('direct-bridge-canonical-awareness')
    expect(source).toContain('sanitizeAlicizationChatStartPayloadForTransport({')
    expect(source).toContain('summarizeAlicizationChatStartPayloadForTransport(transportPayload)')
    expect(source).toContain('transportPayloadSummary')
    expect(source).toContain('transportSanitization: transportPayloadResult.report.changed')
    expect(transportSource).toContain('hasPreDialogueSendIdentity')
    expect(transportSource).toContain('preDialogueSendIdentityStatus')
    expect(transportSource).toContain('hasPreDialogueSummaryLine')
    expect(transportSource).toContain('hasPreDialogueAwarenessLine')
    expect(transportSource).toContain('hasPreDialogueNextClosureLine')
    expect(transportSource).toContain('hasPreDialogueCompanionHeadlineLine')
    expect(transportSource).toContain('hasPreDialogueCompanionBriefingLine')
    expect(transportSource).toContain('hasPreDialogueEmotionalClosureCue')
    expect(transportSource).toContain('hasPreDialogueReasonPreview')
    expect(transportSource).toContain('hasPreDialogueProjectState')
    expect(transportSource).toContain('hasPreDialogueProjectIdentity')
    expect(transportSource).toContain('hasPreDialogueProjectPhase')
    expect(transportSource).toContain('hasPreDialogueLatestLandedProgress')
    expect(transportSource).toContain('hasPreDialoguePrimaryOpenLoop')
    expect(transportSource).toContain('hasPreDialogueNextClosureTarget')
    expect(transportSource).toContain('hasPreDialogueContinuitySummary')
    expect(transportSource).toContain('hasPreDialogueSameHerSelfLine')
    expect(transportSource).toContain('hasPreDialogueSameHerDriftRisk')
    expect(transportSource).toContain('hasPreDialogueSameHerHoldDetail')
    expect(transportSource).toContain('preDialogueSendIdentity?.projectState')
  })

  it('requires explicit-pre-dialogue entrypoints to build or forward project awareness intentionally', () => {
    for (const relativePath of rendererChatEntryExplicitPreDialogueIdentityFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveRendererChatEntryAwarenessMode(relativePath)).toBe('explicit-pre-dialogue-identity')
      expect(
        source.includes('preDialogueSendIdentity')
        || source.includes('buildPreDialogueSendIdentity(')
        || source.includes('context.preDialogueSendIdentity')
        || source.includes('toAlicizationChatStartPreDialogueSendIdentity('),
      ).toBe(true)
    }
  })

  it('requires fallback-based entrypoints to route through chatStore.ingest/chatOrchestrator.ingest without pretending to inject a separate identity', () => {
    for (const relativePath of rendererChatEntryReliesOnChatStoreFallbackFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveRendererChatEntryAwarenessMode(relativePath)).toBe('relies-on-chat-store-fallback')
      expect(
        source.includes('.ingest(')
        || source.includes('await ingest('),
      ).toBe(true)
      expect(source.includes('preDialogueSendIdentity')).toBe(false)
    }
  })

  it('keeps the current chat-entry fallback boundary explicit: only the desktop main chat surface may still rely on shared chat-store fallback awareness', () => {
    expect(rendererChatEntryReliesOnChatStoreFallbackFiles).toEqual([
      '../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue',
    ])
    expect(resolveRendererChatEntryOnlyFallbackBoundaryFile())
      .toBe('../../../../apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue')
  })

  it('requires shared-send-authority entrypoints to stay on the shared text-composer send path instead of forking their own pre-dialogue identity seam', () => {
    for (const relativePath of rendererChatEntrySharedSendAuthorityFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveRendererChatEntryAwarenessMode(relativePath)).toBe('shared-send-authority')
      expect(source.includes('useChatTextComposerStore(')).toBe(true)
      expect(source.includes('sendCurrentMessage(')).toBe(true)
      expect(source.includes('preDialogueSendIdentity')).toBe(false)
      expect(source.includes('.ingest(') || source.includes('await ingest(')).toBe(false)
    }
  })

  it('requires the chat-store fallback authority to preserve richer continuity snapshots before rebuilding pre-dialogue awareness for renderer-side sends', () => {
    const source = readFileSync(new URL('./chat.ts', import.meta.url), 'utf8')

    expect(source).toContain('const effectiveProjectStateContinuitySnapshot')
    expect(source).toContain('const effectivePreDialogueAwarenessSnapshot')
    expect(source).toContain('preDialogueAwarenessSnapshot')
    expect(source).toContain('projectStateContinuitySnapshot: effectiveProjectStateContinuitySnapshot')
    expect(source).toContain('preDialogueAwarenessSnapshot: effectivePreDialogueAwarenessSnapshot')
    expect(source).toContain('continuitySummary: normalizedContinuity?.continuitySummary ?? null')
    expect(source).toContain('latestProgress?: string | null')
    expect(source).toContain('landedProgressSummary?: string | null')
    expect(source).toContain('normalizedContinuity.landedProgressSummary')
    expect(source).toContain('.find(value => value.length > 0) ?? null')
    expect(source).toContain('sameHerDriftRisk?: string | null')
    expect(source).toContain('sameHerDriftRisk: effectiveProjectStateContinuitySnapshot.sameHerDriftRisk ?? null')
  })

  it('ties explicit pre-dialogue identity entrypoints to inspector-side thin-shell repair proof instead of only page wiring', () => {
    const webPageSource = readFileSync(new URL('../../../../apps/stage-web/src/pages/index.vue', import.meta.url), 'utf8')
    const pocketPageSource = readFileSync(new URL('../../../../apps/stage-pocket/src/pages/index.vue', import.meta.url), 'utf8')
    const desktopPageSource = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/pages/index.vue', import.meta.url), 'utf8')
    const inspectorSource = readFileSync(new URL('./alicization-self-evolution-inspector.test.ts', import.meta.url), 'utf8')
    const sendIdentitySource = readFileSync(new URL('./chat/pre-dialogue-send-identity.ts', import.meta.url), 'utf8')
    const sendIdentityTestSource = readFileSync(new URL('./chat/pre-dialogue-send-identity.test.ts', import.meta.url), 'utf8')

    expect(webPageSource).toContain('buildPreDialogueSendIdentityFromInspectorSnapshots(')
    expect(pocketPageSource).toContain('buildPreDialogueSendIdentityFromInspectorSnapshots(')
    expect(desktopPageSource).toContain('buildPreDialogueSendIdentityFromInspectorSnapshots(')
    expect(inspectorSource).toContain(
      'keeps explicit awareness fields while still enriching inspector pre-dialogue awareness summary and reasons from continuity',
    )
    expect(inspectorSource).toContain(
      'generic continuity reminder that should not override the richer same-her project brief.',
    )
    expect(inspectorSource).toContain(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
    expect(inspectorSource).toContain(
      'prefers a richer phase-aware project awareness line over a narrower embodiment headline when inspector rebuilds pre-dialogue awareness from continuity',
    )
    expect(sendIdentitySource).toContain('function resolveContinuityLatestLandedProgress(')
    expect(sendIdentitySource).toContain('latestProgress?.trim()')
    expect(sendIdentitySource).toContain('landedProgressSummary?.trim()')
    expect(sendIdentityTestSource).toContain(
      'keeps legacy latestProgress alive as landed progress when explicit renderer voice/page entries build send identity from inspector snapshots',
    )
    expect(sendIdentityTestSource).toContain(
      'keeps audit-style landedProgressSummary alive as landed progress when explicit renderer voice/page entries build send identity from inspector snapshots',
    )
    expect(sendIdentityTestSource).toContain(
      'Legacy inspector continuity progress already survives into explicit voice/page send identity.',
    )
    expect(sendIdentityTestSource).toContain(
      'Audit-style inspector continuity progress already survives into explicit voice/page send identity.',
    )
  })

  it('requires direct bridge dialogue consumers to stay explicitly classified instead of silently bypassing canonical awareness normalization', () => {
    for (const relativePath of rendererChatEntryDirectBridgeCanonicalAwarenessFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')

      expect(resolveRendererChatEntryAwarenessMode(relativePath)).toBe('direct-bridge-canonical-awareness')
      expect(source.length).toBeGreaterThan(0)
    }
  })
})
