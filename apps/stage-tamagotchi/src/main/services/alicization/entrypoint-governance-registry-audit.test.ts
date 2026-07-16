import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectRendererChatEntryGovernedFiles,
  resolveRendererChatEntryOnlyFallbackBoundaryFile,
} from '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit'
import { collectAlicizationAutonomousDialogueGovernedFiles } from './autonomous-dialogue-entrypoint-audit'
import { collectAlicizationChatStartGovernedFiles } from './chat-start-entrypoint-audit'
import {
  resolveAlicizationAutonomousDialogueFamilySignals,
  resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps,
  resolveAlicizationProjectEntrypointGovernanceAllowedModes,
  resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries,
  resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles,
  resolveAlicizationProjectEntrypointGovernanceAuditRegistry,
} from './entrypoint-governance-registry-audit'
import { resolveAlicizationExecutionFollowUpContinuityAuditFiles } from './execution-follow-up-entrypoint-audit'
import { collectAlicizationExecutionPreflightGovernedFiles } from './execution-preflight-entrypoint-audit'
import { collectAlicizationPreDialogueTransportGovernedFiles } from './pre-dialogue-transport-entrypoint-audit'
import {
  assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain,
  resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors,
  resolveAlicizationProjectEntrypointGovernanceAllowedModes as resolveAlicizationProjectEntrypointGovernanceAllowedModesFromSource,
  resolveAlicizationProjectEntrypointGovernedFiles,
} from './project-state-brief'
import { collectAlicizationProviderConsumerGovernedFiles } from './provider-consumer-entrypoint-audit'
import { resolveAlicizationRecoveryReentryAuditedFiles } from './recovery-reentry-entrypoint-audit'
import {
  autonomousDialogueOrigins,
  autonomousDialogueStructuredFormats,
  autonomousDialogueTurnIdPrefixes,
} from './runtime-structured-format'
import { collectAlicizationExecutionDispatchOwnerFiles } from './task-thread-dispatch-owner-audit'

function collectAutonomousDialogueFamilySignals(rootDir: string) {
  const runtimeSource = readFileSync(join(rootDir, 'runtime.ts'), 'utf8')
  const feedbackSource = readFileSync(join(rootDir, 'runtime-dialogue-feedback.ts'), 'utf8')

  expect(runtimeSource).toContain('isAlicizationAutonomousDialogueFamily({')
  expect(feedbackSource).toContain('isAlicizationAutonomousDialogueFamily({')

  return [
    ...autonomousDialogueStructuredFormats.map(format => `structured-format:${format}`),
    ...autonomousDialogueTurnIdPrefixes.map(prefix => `turn-id-prefix:${prefix}`),
    ...autonomousDialogueOrigins.map(origin => `origin:${origin}`),
  ].sort()
}

function sliceByMarkers(source: string, startMarker: string, endMarker: string) {
  const startIndex = source.indexOf(startMarker)
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length)
  if (startIndex < 0 || endIndex < 0)
    return ''
  return source.slice(startIndex, endIndex)
}

describe('entrypoint governance registry audit', () => {
  it('keeps chat-entry discovery broad enough to catch a future desktop performance playground entrypoint', () => {
    const source = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('dispatch(Web|Pocket|Desktop)(VoiceTurn\\\\(|PerformancePlaygroundChatTurn\\\\()')
  })

  it('keeps chat-entry discovery sourced from a shared helper instead of a locally re-encoded rg scan', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit\'')
    expect(source).toContain('collectRendererChatEntryGovernedFiles(')
    expect(/^function collectChatEntryGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps chat-start discovery sourced from a shared helper instead of a locally re-encoded source scan', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./chat-start-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationChatStartGovernedFiles(')
    expect(/^function collectChatStartGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps pre-dialogue transport discovery sourced from a shared helper instead of a locally re-encoded source scan', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./pre-dialogue-transport-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationPreDialogueTransportGovernedFiles(')
    expect(/^function collectPreDialogueTransportGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps autonomous dialogue discovery sourced from a shared helper instead of a locally re-encoded shape scanner', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./autonomous-dialogue-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationAutonomousDialogueGovernedFiles(')
    expect(/^function collectAutonomousDialogueGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps provider-consumer discovery sourced from a shared helper instead of a locally re-encoded provider signature scan', () => {
    const source = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./provider-consumer-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProviderConsumerGovernedFiles(')
    expect(/^function collectProviderConsumerGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('fails closed at the registry layer when a governance row pairs a domain with a mode that does not belong to that domain', () => {
    expect(() => assertAlicizationProjectEntrypointGovernanceModeBelongsToDomain({
      domain: 'execution-dispatch',
      mode: 'authority',
      relativePath: 'unexpected.ts',
    })).toThrowError('Unexpected Alicization entrypoint governance mode for execution-dispatch')
  })

  it('keeps every current discovered dialogue/execution entrypoint seam mapped into one repo-level governance registry', () => {
    const servicesRoot = new URL('.', import.meta.url).pathname

    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-start'))
      .toEqual(collectAlicizationChatStartGovernedFiles(servicesRoot))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('pre-dialogue-transport'))
      .toEqual(collectAlicizationPreDialogueTransportGovernedFiles())
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-entry'))
      .toEqual(collectRendererChatEntryGovernedFiles())
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('provider-consumer'))
      .toEqual(collectAlicizationProviderConsumerGovernedFiles(servicesRoot))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('autonomous-dialogue'))
      .toEqual(collectAlicizationAutonomousDialogueGovernedFiles(servicesRoot))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-preflight'))
      .toEqual(collectAlicizationExecutionPreflightGovernedFiles(servicesRoot))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-dispatch'))
      .toEqual(collectAlicizationExecutionDispatchOwnerFiles(servicesRoot))
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('recovery-reentry'))
      .toEqual(resolveAlicizationRecoveryReentryAuditedFiles().slice().sort())
    expect(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('execution-follow-up-continuity'))
      .toEqual(resolveAlicizationExecutionFollowUpContinuityAuditFiles().slice().sort())

    const allRegistryFiles = resolveAlicizationProjectEntrypointGovernedFiles()
    const allDiscoveredFiles = [
      ...collectAlicizationChatStartGovernedFiles(servicesRoot),
      ...collectAlicizationPreDialogueTransportGovernedFiles(),
      ...collectRendererChatEntryGovernedFiles(),
      ...collectAlicizationProviderConsumerGovernedFiles(servicesRoot),
      ...collectAlicizationAutonomousDialogueGovernedFiles(servicesRoot),
      ...collectAlicizationExecutionPreflightGovernedFiles(servicesRoot),
      ...collectAlicizationExecutionDispatchOwnerFiles(servicesRoot),
      ...resolveAlicizationRecoveryReentryAuditedFiles(),
      ...resolveAlicizationExecutionFollowUpContinuityAuditFiles(),
    ].sort()

    expect(allDiscoveredFiles).toEqual(allRegistryFiles)
  }, 20_000)

  it('forces each governance domain to keep an explicit ownership shape instead of silently widening into unclassified entrypoints', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceAuditRegistry()

    for (const domain of ['chat-start', 'pre-dialogue-transport', 'chat-entry', 'provider-consumer', 'autonomous-dialogue', 'execution-preflight', 'execution-dispatch', 'recovery-reentry', 'execution-follow-up-continuity'] as const) {
      const domainEntries = resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries(domain)
      const allowedModes = new Set(resolveAlicizationProjectEntrypointGovernanceAllowedModes(domain))
      const sourceAllowedModes = new Set(resolveAlicizationProjectEntrypointGovernanceAllowedModesFromSource(domain))

      expect(domainEntries.length).toBeGreaterThan(0)
      expect(domainEntries.every(entry => allowedModes.has(entry.mode as never))).toBe(true)
      expect(allowedModes).toEqual(sourceAllowedModes)
    }

    expect(registry.filter(entry => entry.domain === 'chat-start' && entry.mode === 'authority')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'chat-start' && entry.mode === 'normalize-before-use')).toBe(true)
    expect(registry.some(entry => entry.domain === 'chat-start' && entry.mode === 'read-only-downstream')).toBe(true)

    expect(registry.some(entry => entry.domain === 'pre-dialogue-transport' && entry.mode === 'identity-construction')).toBe(true)
    expect(registry.some(entry => entry.domain === 'pre-dialogue-transport' && entry.mode === 'transport-sanitization')).toBe(true)
    expect(registry.some(entry => entry.domain === 'pre-dialogue-transport' && entry.mode === 'bridge-forwarding')).toBe(true)

    expect(registry.some(entry => entry.domain === 'chat-entry' && entry.mode === 'authority')).toBe(true)
    expect(registry.filter(entry => entry.domain === 'chat-entry' && entry.mode === 'normalize-before-use')).toEqual([
      expect.objectContaining({
        relativePath: resolveRendererChatEntryOnlyFallbackBoundaryFile(),
      }),
    ])
    expect(registry.some(entry => entry.domain === 'chat-entry' && entry.mode === 'shared-send-authority')).toBe(true)

    expect(registry.filter(entry => entry.domain === 'provider-consumer' && entry.mode === 'authority')).toHaveLength(1)
    expect(registry.filter(entry => entry.domain === 'provider-consumer' && entry.mode === 'dispatch-owner')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'provider-consumer' && entry.mode === 'typed-consumer')).toBe(true)

    expect(registry.filter(entry => entry.domain === 'autonomous-dialogue' && entry.mode === 'authority')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'autonomous-dialogue' && entry.mode === 'normalize-before-use')).toBe(true)
    expect(registry.some(entry => entry.domain === 'autonomous-dialogue' && entry.relativePath === 'runtime-subconscious-tick.ts')).toBe(true)

    expect(registry.filter(entry => entry.domain === 'execution-preflight' && entry.mode === 'execution-briefing-authority')).toHaveLength(1)
    expect(registry.filter(entry => entry.domain === 'execution-preflight' && entry.mode === 'runtime-context-authority')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'execution-preflight' && entry.mode === 'runtime-dispatch-execution-bridge')).toBe(true)
    expect(registry.some(entry => entry.domain === 'execution-preflight' && entry.mode === 'blocked-dispatch-safety-gate')).toBe(true)
    expect(registry.some(entry => entry.domain === 'execution-preflight' && entry.relativePath === 'runtime-subconscious-tick.ts')).toBe(true)

    expect(registry.every(entry => entry.domain !== 'execution-dispatch' || entry.mode === 'dispatch-owner')).toBe(true)

    expect(registry.filter(entry => entry.domain === 'recovery-reentry' && entry.mode === 'accepted-start-settlement')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'recovery-reentry' && entry.mode === 'timeout-fallback-reconstruction')).toBe(true)
    expect(registry.some(entry => entry.domain === 'recovery-reentry' && entry.mode === 'timeout-recovery-finish')).toBe(true)
    expect(registry.some(entry => entry.domain === 'recovery-reentry' && entry.mode === 'background-recovery-driver')).toBe(true)

    expect(registry.filter(entry => entry.domain === 'execution-follow-up-continuity' && entry.mode === 'callback-runtime-authority')).toHaveLength(1)
    expect(registry.some(entry => entry.domain === 'execution-follow-up-continuity' && entry.mode === 'follow-up-obligation-authority')).toBe(true)
    expect(registry.some(entry => entry.domain === 'execution-follow-up-continuity' && entry.mode === 'ledger-follow-up-recall')).toBe(true)
    expect(registry.some(entry => entry.domain === 'execution-follow-up-continuity' && entry.mode === 'callback-persistence-surface')).toBe(true)
  })

  it('keeps the registry source typed as a domain-specific entry union instead of one broad mode union', () => {
    const source = readFileSync(new URL('./project-state-brief.ts', import.meta.url), 'utf8')

    expect(source).toContain('export type AlicizationProjectEntrypointGovernanceEntry =')
    expect(source).toContain('domain: \'chat-start\'')
    expect(source).toContain('mode: \'authority\' | \'normalize-before-use\' | \'read-only-downstream\'')
    expect(source).toContain('domain: \'chat-entry\'')
    expect(source).toContain('mode: \'authority\' | \'normalize-before-use\' | \'read-only-downstream\' | \'shared-send-authority\'')
    expect(source).toContain('domain: \'pre-dialogue-transport\'')
    expect(source).toContain('mode: \'identity-construction\' | \'transport-sanitization\' | \'bridge-forwarding\'')
    expect(source).toContain('domain: \'provider-consumer\'')
    expect(source).toContain('mode: \'authority\' | \'dispatch-owner\' | \'typed-consumer\'')
    expect(source).toContain('domain: \'execution-preflight\'')
    expect(source).toContain('execution-briefing-authority')
    expect(source).toContain('blocked-dispatch-safety-gate')
    expect(source).toContain('domain: \'execution-dispatch\'')
    expect(source).toContain('mode: \'dispatch-owner\'')
    expect(source).toContain('domain: \'recovery-reentry\'')
    expect(source).toContain('accepted-start-settlement')
    expect(source).toContain('timeout-fallback-reconstruction')
    expect(source).toContain('timeout-recovery-finish')
    expect(source).toContain('background-recovery-driver')
    expect(source).toContain('domain: \'execution-follow-up-continuity\'')
    expect(source).toContain('callback-runtime-authority')
    expect(source).toContain('follow-up-obligation-authority')
    expect(source).toContain('ledger-follow-up-recall')
    expect(source).toContain('callback-persistence-surface')
    expect(source).not.toContain('export interface AlicizationProjectEntrypointGovernanceEntry')
  })

  it('keeps explicit pre-dialogue transport governance rows mirrored into chat-entry governance so the same send-identity seams cannot drift into a side registry', () => {
    const mirrors = resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors()
    const transportFiles = resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('pre-dialogue-transport')
    const chatEntryFiles = new Set(resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles('chat-entry'))

    expect(mirrors.map(entry => entry.transportRelativePath).slice().sort()).toEqual(transportFiles)
    for (const mirror of mirrors)
      expect(chatEntryFiles.has(mirror.chatEntryRelativePath)).toBe(true)
  })

  it('keeps mirrored pre-dialogue transport seams paired with the expected chat-entry ownership modes so neighboring registries cannot silently reclassify the same send-identity boundary', () => {
    const mirrors = resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors()
    const transportEntries = new Map(
      resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries('pre-dialogue-transport')
        .map(entry => [entry.relativePath, entry]),
    )
    const chatEntryEntries = new Map(
      resolveAlicizationProjectEntrypointGovernanceAuditDomainEntries('chat-entry')
        .map(entry => [entry.relativePath, entry]),
    )

    const expectedMirrors = [
      {
        transportRelativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
        transportMode: 'identity-construction',
        chatEntryRelativePath: './chat.ts',
        chatEntryMode: 'authority',
      },
      {
        transportRelativePath: '../../../renderer/App.vue',
        transportMode: 'transport-sanitization',
        chatEntryRelativePath: '../../../../apps/stage-tamagotchi/src/renderer/App.vue',
        chatEntryMode: 'read-only-downstream',
      },
      {
        transportRelativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
        transportMode: 'bridge-forwarding',
        chatEntryRelativePath: './mods/api/context-bridge.ts',
        chatEntryMode: 'authority',
      },
    ] as const

    expect(mirrors).toEqual(expect.arrayContaining(
      expectedMirrors.map(({ transportRelativePath, chatEntryRelativePath }) => expect.objectContaining({
        transportRelativePath,
        chatEntryRelativePath,
      })),
    ))

    for (const expectedMirror of expectedMirrors) {
      expect(transportEntries.get(expectedMirror.transportRelativePath)?.mode).toBe(expectedMirror.transportMode)
      expect(chatEntryEntries.get(expectedMirror.chatEntryRelativePath)?.mode).toBe(expectedMirror.chatEntryMode)
    }
  })

  it('keeps cross-domain entrypoint ownership explicit so multi-domain bridge files cannot silently multiply', () => {
    const registry = resolveAlicizationProjectEntrypointGovernanceAuditRegistry()
    const allowedOverlaps = resolveAlicizationProjectEntrypointGovernanceAllowedCrossDomainOverlaps()

    const discoveredOverlaps = [...registry
      .reduce((map, entry) => {
        const existing = map.get(entry.relativePath) ?? []
        existing.push(entry.domain)
        map.set(entry.relativePath, existing)
        return map
      }, new Map<string, string[]>())
      .entries()]
      .filter(([, domains]) => new Set(domains).size > 1)
      .map(([relativePath, domains]) => ({
        relativePath,
        domains: [...new Set(domains)].sort(),
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    expect(discoveredOverlaps).toEqual(
      allowedOverlaps.map(({ relativePath, domains }) => ({
        relativePath,
        domains: domains.slice().sort(),
      })),
    )
    expect(allowedOverlaps.every(entry => entry.reason.length > 0)).toBe(true)
  })

  it('keeps runtime.ts overlap concrete by anchoring chat-start normalization, main-gateway provider dispatch wiring, runtime-owned proactive/reminder entry markers, execution-preflight rebuild, and audited execution redispatch in one audit instead of relying only on the overlap reason prose', () => {
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(runtimeSource).toContain('const normalizedPayload = stripLegacyChatStartPayloadFields(payload)')
    expect(runtimeSource).not.toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity')
    expect(runtimeSource).toContain('resolveAlicizationMainChatStartResult({')
    expect(runtimeSource).toContain('const mainGatewayTextProvider: AlicizationMainGatewayTextProvider = generateMainGatewayText')
    expect(runtimeSource).toContain('generateMainGatewayText: mainGatewayTextProvider')
    expect(runtimeSource).toContain('async function generateProactiveStructuredWithGateway(')
    expect(runtimeSource).toContain('async function generateReminderStructuredWithGateway(')
    expect(runtimeSource).toContain('async function ensureDispatchInvocationRuntimeContext(')
    expect(runtimeSource).toContain('buildRuntimeOwnedExecutionRuntimeContext({')
    expect(runtimeSource).toContain('dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation)')
  })

  it('keeps main-chat-session-runtime overlap concrete by anchoring chat-start renormalization, session-bound execution runtime-context requests, and live execution follow-up assembly in one audit instead of relying only on the overlap reason prose', () => {
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    expect(sessionRuntimeSource).toContain('stripLegacyChatStartPayloadFields(')
    expect(sessionRuntimeSource).not.toContain('resolveAlicizationChatStartPayloadPreDialogueSendIdentity')
    expect(sessionRuntimeSource).toContain('buildExecutionRuntimeContext: async (toolContext) => {')
    expect(sessionRuntimeSource).toContain('return await agentTurn.buildExecutionRuntimeContext({')
    expect(sessionRuntimeSource).toContain('deriveMainChatExecutionReplyObligation({')
    expect(sessionRuntimeSource).toContain('freshExecutionReplyCallback')
  })

  it('keeps autonomous dialogue family signals explicit so new runtime-owned turn families cannot hide behind scattered format/origin/prefix strings', () => {
    const servicesRoot = new URL('.', import.meta.url).pathname
    const discoveredSignals = collectAutonomousDialogueFamilySignals(servicesRoot)
    const registeredSignals = resolveAlicizationAutonomousDialogueFamilySignals()
      .map(entry => `${entry.signalKind}:${entry.value}`)
      .slice()
      .sort()

    expect(discoveredSignals).toEqual(registeredSignals)
    expect(registeredSignals).toEqual([
      'origin:subconscious-proactive',
      'structured-format:subconscious-proactive-llm-v1',
      'structured-format:subconscious-proactive-v1',
      'structured-format:subconscious-reminder-v1',
      'turn-id-prefix:execution-callback:',
      'turn-id-prefix:reminder:',
      'turn-id-prefix:subconscious:',
    ])
  })

  it('requires current autonomous dialogue family classifiers to reuse the shared helper instead of re-encoding raw turn-id or format allowlists', () => {
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const feedbackSource = readFileSync(new URL('./runtime-dialogue-feedback.ts', import.meta.url), 'utf8')

    const runtimeReplayClassifierBlock = sliceByMarkers(
      runtimeSource,
      'function toReplayDialogueRespondedPayload(',
      'const normalized = normalizeDialogueRespondedPayload({',
    )
    const dialogueFeedbackClassifierBlock = sliceByMarkers(
      feedbackSource,
      'export function isOrdinaryDialogueConversationRow(',
      'export function buildDialogueReplyFeedbackAckKey(',
    )

    expect(runtimeReplayClassifierBlock).toContain('isAlicizationAutonomousDialogueFamily({')
    expect(runtimeReplayClassifierBlock).not.toContain('startsWith(\'reminder:\')')
    expect(runtimeReplayClassifierBlock).not.toContain('startsWith(\'subconscious:\')')
    expect(runtimeReplayClassifierBlock).not.toContain('startsWith(\'execution-callback:\')')
    expect(runtimeReplayClassifierBlock).not.toContain('structuredFormat === \'subconscious-proactive-v1\'')
    expect(runtimeReplayClassifierBlock).not.toContain('structuredFormat === \'subconscious-proactive-llm-v1\'')
    expect(runtimeReplayClassifierBlock).not.toContain('structuredFormat === \'subconscious-reminder-v1\'')

    expect(dialogueFeedbackClassifierBlock).toContain('isAlicizationAutonomousDialogueFamily({')
    expect(dialogueFeedbackClassifierBlock).not.toContain('startsWith(\'reminder:\')')
    expect(dialogueFeedbackClassifierBlock).not.toContain('startsWith(\'subconscious:\')')
    expect(dialogueFeedbackClassifierBlock).not.toContain('startsWith(\'execution-callback:\')')
    expect(dialogueFeedbackClassifierBlock).not.toContain('format !== \'subconscious-proactive-v1\'')
    expect(dialogueFeedbackClassifierBlock).not.toContain('format !== \'subconscious-proactive-llm-v1\'')
    expect(dialogueFeedbackClassifierBlock).not.toContain('format !== \'subconscious-reminder-v1\'')
  })

  it('requires current autonomous dialogue entry builders to reuse the shared turn-id and structured-format helpers instead of hardcoding runtime-owned family strings at the source', () => {
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const reminderSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    const proactiveGatewayBlock = sliceByMarkers(
      runtimeSource,
      'async function generateProactiveStructuredWithGateway(',
      'async function generateDreamMetabolismWithGateway(',
    )
    const reminderGatewayBlock = sliceByMarkers(
      runtimeSource,
      'async function generateReminderStructuredWithGateway(',
      'async function runReminderCompensationAcrossCards(',
    )
    const subconsciousEntryBlock = sliceByMarkers(
      subconsciousSource,
      'const turnId = buildAlicizationAutonomousDialogueTurnId({',
      'await appendAuditLog({',
    )

    expect(proactiveGatewayBlock).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-proactive-llm\')')
    expect(proactiveGatewayBlock).not.toContain('format: \'subconscious-proactive-llm-v1\'')

    expect(runtimeSource).not.toContain('function buildProactiveStructured(')

    expect(reminderGatewayBlock).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-reminder\')')
    expect(reminderGatewayBlock).not.toContain('format: \'subconscious-reminder-v1\'')

    expect(reminderSource).toContain('buildAlicizationAutonomousDialogueTurnId({')
    expect(reminderSource).toContain('kind: \'reminder\'')
    expect(reminderSource).toContain('kind: \'execution-callback\'')
    expect(reminderSource).not.toContain('const firedTurnId = `reminder:')
    expect(reminderSource).not.toContain('const firedTurnId = `execution-callback:')
    expect(reminderSource).toContain('resolveAlicizationAutonomousDialogueOrigin(\'proactive\')')
    expect(reminderSource).not.toContain('origin: \'subconscious-proactive\'')

    expect(subconsciousEntryBlock).toContain('buildAlicizationAutonomousDialogueTurnId({')
    expect(subconsciousEntryBlock).toContain('kind: \'subconscious\'')
    expect(subconsciousEntryBlock).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-proactive\')')
    expect(subconsciousEntryBlock).not.toContain('const turnId = `subconscious:')
    expect(subconsciousEntryBlock).not.toContain('format: \'subconscious-proactive-v1\'')
    expect(subconsciousEntryBlock).toContain('resolveAlicizationAutonomousDialogueOrigin(\'proactive\')')
    expect(subconsciousSource).not.toContain('origin: \'subconscious-proactive\'')
  })

  it('requires current autonomous dialogue governance and delivery seams to reuse the shared origin helper instead of hand-rolling proactive branching', () => {
    const governanceSource = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')
    const deliverySource = readFileSync(new URL('./runtime-dialogue-delivery.ts', import.meta.url), 'utf8')

    const governanceCoercionBlock = sliceByMarkers(
      governanceSource,
      'export function coerceConversationTurnToMindGovernedPayload(',
      '  const reply = readStringValue(structuredPayload.reply).trim()',
    )
    const governanceTraceBlock = sliceByMarkers(
      governanceSource,
      'export function buildMindTurnTraceEvents(',
      '  const events: AlicizationMindTurnEventInput[] = [{',
    )
    const governanceNormalizationBlock = sliceByMarkers(
      governanceSource,
      'export function normalizeDialogueRespondedPayload(',
      '  return {',
    )
    const deliveryProactiveSnapshotBlock = sliceByMarkers(
      deliverySource,
      'function readPendingProactiveSnapshotFromPayload(',
      '  const structured = payload.structured && typeof payload.structured === \'object\'',
    )

    expect(governanceSource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
    expect(governanceSource).toContain('resolveAlicizationAutonomousDialogueOrigin(\'proactive\')')
    expect(deliverySource).toContain('resolveAlicizationAutonomousDialogueFamilyClassification(')
    expect(deliverySource).toContain('if (!autonomousDialogueFamily.isAutonomous)')

    expect(governanceCoercionBlock).not.toContain('input.origin === \'subconscious-proactive\'')
    expect(governanceTraceBlock).not.toContain('input.payload.origin === \'subconscious-proactive\'')
    expect(governanceNormalizationBlock).not.toContain('input.origin === \'subconscious-proactive\'')
    expect(deliveryProactiveSnapshotBlock).not.toContain('payload.origin !== \'subconscious-proactive\'')
  })

  it('requires current runtime-core autonomous dialogue seams to reuse the shared origin helper before persistence, delivery registration, and replay recovery', () => {
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    const appendTurnNormalizationBlock = sliceByMarkers(
      runtimeSource,
      '    let normalizedPayload: AlicizationConversationTurnInput = {',
      '    const pendingMindTraceTelemetry = normalizedPayload.turnId',
    )
    const proactiveDeliveryRegistrationBlock = sliceByMarkers(
      runtimeSource,
      '        if (enrichedDialoguePayload.origin === \'subconscious-proactive\' && enrichedDialoguePayload.structured.proactive) {',
      '        emittedDialoguePayload = enrichedDialoguePayload',
    )
    const replayRecoveryBlock = sliceByMarkers(
      runtimeSource,
      '  function toReplayDialogueRespondedPayload(',
      '    return {',
    )

    expect(runtimeSource).toContain('isAlicizationAutonomousDialogueOrigin(')
    expect(runtimeSource).toContain('resolveAlicizationAutonomousDialogueOrigin(\'proactive\')')

    expect(appendTurnNormalizationBlock).not.toContain('origin: payload.origin === \'subconscious-proactive\' ? \'subconscious-proactive\' : \'user-turn\'')
    expect(proactiveDeliveryRegistrationBlock).not.toContain('enrichedDialoguePayload.origin === \'subconscious-proactive\'')
    expect(replayRecoveryBlock).not.toContain('? \'subconscious-proactive\'')
    expect(replayRecoveryBlock).not.toContain('normalized.origin !== \'subconscious-proactive\'')
  })

  it('requires proactive execution feedback follow-through to reuse the shared origin helper so identity-continuity', () => {
    const executionFeedbackSource = readFileSync(new URL('./runtime-execution-feedback.ts', import.meta.url), 'utf8')

    const resultFeedbackBlock = sliceByMarkers(
      executionFeedbackSource,
      '  const settleRecentExecutionResultFeedbackFromUserTurn = async (',
      '    if (!latest)',
    )

    expect(executionFeedbackSource).toContain('isAlicizationAutonomousDialogueOrigin(')
    expect(resultFeedbackBlock).not.toContain('thread.origin === \'subconscious-proactive\'')
  })
})
