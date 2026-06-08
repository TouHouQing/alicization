import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationPreDialogueTransportAuditFiles,
} from './pre-dialogue-transport-audit'
import {
  resolveAlicizationProjectStateAnswerGovernanceAuditedFiles,
} from './project-state-answer-governance-audit'
import {
  resolveAlicizationReturnSideProjectAwarenessAuditFiles,
} from './return-side-project-awareness-audit'
import {
  resolveAlicizationRuntimeDialogueNormalizationAuditedFiles,
} from './runtime-dialogue-normalization-audit'
import {
  resolveAlicizationRuntimeTurnPersistenceAuditedFiles,
} from './runtime-turn-persistence-audit'

import * as projectStateBrief from './project-state-brief'

describe('route authority boundary registry audit', () => {
  it('exposes a single repo-level route-authority registry that covers pre-dialogue transport, return-side project-awareness rebuild, runtime dialogue normalization, guarded turn persistence, and project-state answer governance boundaries', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const resolveFiles = projectStateBrief.resolveAlicizationProjectRouteAuthorityFiles
    const resolveAllowedOverlaps = projectStateBrief.resolveAlicizationProjectRouteAuthorityAllowedOverlaps

    expect(typeof resolveRegistry).toBe('function')
    expect(typeof resolveFiles).toBe('function')
    expect(typeof resolveAllowedOverlaps).toBe('function')

    const registry = resolveRegistry?.() ?? []
    const files = resolveFiles?.() ?? []
    const allowedOverlaps = resolveAllowedOverlaps?.() ?? []
    const expectedFiles = [...new Set([
      ...resolveAlicizationPreDialogueTransportAuditFiles(),
      ...resolveAlicizationReturnSideProjectAwarenessAuditFiles(),
      ...resolveAlicizationRuntimeDialogueNormalizationAuditedFiles(),
      ...resolveAlicizationRuntimeTurnPersistenceAuditedFiles(),
      ...resolveAlicizationProjectStateAnswerGovernanceAuditedFiles(),
    ])].sort()

    expect(new Set(registry.map(entry => entry.domain))).toEqual(new Set([
      'pre-dialogue-transport',
      'return-side-project-awareness',
      'runtime-dialogue-normalization',
      'runtime-turn-persistence',
      'project-state-answer-governance',
    ]))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'pre-dialogue-transport',
      relativePath: '../../../renderer/App.vue',
      mode: 'transport-sanitization',
    }))
    expect(files).toEqual(expectedFiles)
    expect([...new Set(registry.map(entry => entry.relativePath))].slice().sort()).toEqual(expectedFiles)

    expect(allowedOverlaps).toEqual([
      expect.objectContaining({
        relativePath: '../../../renderer/App.vue',
        domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
      }),
      expect.objectContaining({
        relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
        domains: ['pre-dialogue-transport', 'return-side-project-awareness'],
      }),
      expect.objectContaining({
        relativePath: 'main-chat-background-run.ts',
        domains: ['project-state-answer-governance', 'runtime-dialogue-normalization'],
      }),
      expect.objectContaining({
        relativePath: 'runtime-delivery-reminders.ts',
        domains: ['project-state-answer-governance', 'runtime-turn-persistence'],
      }),
      expect.objectContaining({
        relativePath: 'runtime-subconscious-tick.ts',
        domains: ['runtime-dialogue-normalization', 'runtime-turn-persistence'],
      }),
      expect.objectContaining({
        relativePath: 'runtime.ts',
        domains: ['project-state-answer-governance', 'runtime-dialogue-normalization', 'runtime-turn-persistence'],
      }),
    ])
  })

  it('keeps explicit allowed-overlap registration synchronized with every current multi-domain route-authority file instead of relying on manual overlap prose staying complete', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const resolveAllowedOverlaps = projectStateBrief.resolveAlicizationProjectRouteAuthorityAllowedOverlaps

    const registry = resolveRegistry?.() ?? []
    const allowedOverlaps = resolveAllowedOverlaps?.() ?? []
    const domainsByRelativePath = new Map<string, Set<string>>()

    for (const entry of registry) {
      const domains = domainsByRelativePath.get(entry.relativePath) ?? new Set<string>()
      domains.add(entry.domain)
      domainsByRelativePath.set(entry.relativePath, domains)
    }

    const overlapEntriesFromRegistry = [...domainsByRelativePath.entries()]
      .map(([relativePath, domains]) => ({
        relativePath,
        domains: [...domains].slice().sort(),
      }))
      .filter(entry => entry.domains.length > 1)
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    const normalizedAllowedOverlaps = allowedOverlaps
      .map(entry => ({
        relativePath: entry.relativePath,
        domains: [...new Set(entry.domains)].slice().sort(),
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

    expect(normalizedAllowedOverlaps).toEqual(overlapEntriesFromRegistry)
  })

  it('keeps the desktop renderer App.vue structured-clone handoff explicit inside the shared route-authority registry instead of leaving the concrete same-her seam implied only by domain membership', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const transportAuditSource = readFileSync(new URL('./pre-dialogue-transport-audit.test.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'pre-dialogue-transport',
      relativePath: '../../../renderer/App.vue',
      mode: 'transport-sanitization',
    }))
    expect(transportAuditSource).toContain(
      'requires the desktop renderer transport-sanitization seam to remain explicitly shared with renderer chat-entry governance instead of drifting into a transport-only registration island',
    )
  })

  it('keeps the desktop renderer App.vue overlap concrete by anchoring outbound transport sanitization and return-side observation continuity rebuilding in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const appSource = readFileSync(new URL('../../../renderer/App.vue', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'pre-dialogue-transport',
      relativePath: '../../../renderer/App.vue',
      mode: 'transport-sanitization',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../renderer/App.vue',
      mode: 'renderer-observation-bridge',
    }))
    expect(appSource).toContain('readConversationTurnProjectStateObservation({')
    expect(appSource).toContain('getProjectStateContinuitySnapshot: async () => projectStateObservationToContinuitySnapshot(')
  })

  it('keeps packages/stage-ui/src/stores/chat.ts overlap concrete by anchoring outbound pre-dialogue identity construction and return-side stream ingest in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const chatStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'pre-dialogue-transport',
      relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
      mode: 'identity-construction',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../../../../packages/stage-ui/src/stores/chat.ts',
      mode: 'chat-stream-ingest',
    }))
    expect(chatStoreSource).toContain('toAlicizationChatStartPreDialogueSendIdentity(')
    expect(chatStoreSource).toContain('turnProjectState = normalizeStructuredProjectStatePayload(')
    expect(chatStoreSource).toContain('turnPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(')
  })

  it('keeps packages/stage-ui/src/stores/mods/api/context-bridge.ts concrete by anchoring pre-dialogue send-identity bridge forwarding in one shared route-authority audit instead of leaving remote transport continuity implied only by narrower transport registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const contextBridgeSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'pre-dialogue-transport',
      relativePath: '../../../../../../packages/stage-ui/src/stores/mods/api/context-bridge.ts',
      mode: 'bridge-forwarding',
    }))
    expect(contextBridgeSource).toContain('context.preDialogueSendIdentity')
    expect(contextBridgeSource).toContain('? { preDialogueSendIdentity: context.preDialogueSendIdentity ?? null }')
  })

  it('keeps project-state-answer-governance.ts concrete by anchoring the canonical project-state answer-governance authority in one shared route-authority audit instead of leaving the same-her status contract itself implied only by narrower governance-owner registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const governanceAuthoritySource = readFileSync(new URL('./project-state-answer-governance.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'project-state-answer-governance.ts',
      mode: 'governance-authority',
    }))
    expect(governanceAuthoritySource).toContain('alicizationProjectStateAnswerMustDo')
    expect(governanceAuthoritySource).toContain('enrichProjectStateAnswerGovernanceIfNeeded')
  })

  it('keeps runtime-governance.ts concrete by anchoring the canonical host-visible dialogue normalization authority in one shared route-authority audit instead of leaving same-her payload normalization implied only by narrower normalization-owner registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const normalizationAuthoritySource = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-dialogue-normalization',
      relativePath: 'runtime-governance.ts',
      mode: 'normalization-authority',
    }))
    expect(normalizationAuthoritySource).toContain('export function normalizeDialogueRespondedPayload(')
  })

  it('keeps main-chat-stream-runner.ts concrete by anchoring repaired stream-finish normalization in one shared route-authority audit instead of leaving same-her final-surface repair implied only by narrower normalization-consumer registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const streamRunnerSource = readFileSync(new URL('./main-chat-stream-runner.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-dialogue-normalization',
      relativePath: 'main-chat-stream-runner.ts',
      mode: 'stream-finish-fallback',
    }))
    expect(streamRunnerSource).toContain('normalizeDialogueRespondedPayload({')
  })

  it('keeps main-chat-background-run.ts overlap concrete by anchoring host-visible normalization and project-state answer-governance enrichment in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const backgroundRunSource = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-dialogue-normalization',
      relativePath: 'main-chat-background-run.ts',
      mode: 'background-normalize-before-deliver',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'main-chat-background-run.ts',
      mode: 'answer-governance-enricher',
    }))
    expect(backgroundRunSource).toContain('normalizeDialogueRespondedPayload(')
    expect(backgroundRunSource).toContain('enrichProjectStateAnswerGovernanceIfNeeded(')
  })

  it('keeps main-chat-session-runtime.ts concrete by anchoring provider-facing project-state answer-governance re-enrichment in one shared route-authority audit instead of leaving session-runtime status replies implied only by broader preparation coverage prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'main-chat-session-runtime.ts',
      mode: 'answer-governance-enricher',
    }))
    expect(sessionRuntimeSource).toContain('enrichProjectStateAnswerGovernanceIfNeeded(')
    expect(sessionRuntimeSource).toContain('answerSubject: \'project-state\' as const')
  })

  it('keeps runtime-main-gateway-one-shot.ts concrete by anchoring one-shot project-state answer-contract injection in one shared route-authority audit instead of leaving scene-appraisal status answers implied only by deeper provider coverage prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'runtime-main-gateway-one-shot.ts',
      mode: 'answer-contract-surface',
    }))
    expect(oneShotSource).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(oneShotSource).toContain('...alicizationProjectStateAnswerMustDo,')
  })

  it('keeps executive-answer-brief.ts concrete by anchoring direct project-state answer-contract injection in one shared route-authority audit instead of leaving executive brief status rules implied only by narrower contract-surface registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const executiveBriefSource = readFileSync(new URL('./executive-answer-brief.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'executive-answer-brief.ts',
      mode: 'answer-contract-surface',
    }))
    expect(executiveBriefSource).toContain('looksLikeProjectStateDirectAnswerTurn({')
    expect(executiveBriefSource).toContain('for (const rule of alicizationProjectStateAnswerMustDo)')
  })

  it('keeps main-chat-active-dialogue-loop.ts concrete by anchoring compact active-dialogue project-state answer-contract emission in one shared route-authority audit instead of leaving fast-path status replies implied only by narrower contract-surface registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const activeDialogueSource = readFileSync(new URL('./main-chat-active-dialogue-loop.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'main-chat-active-dialogue-loop.ts',
      mode: 'answer-contract-surface',
    }))
    expect(activeDialogueSource).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(activeDialogueSource).toContain('...alicizationProjectStateAnswerContractLines,')
  })

  it('keeps renderer/alicization-chat-stream-bridge.ts concrete by anchoring renderer meta project-awareness normalization in one shared route-authority audit instead of leaving return-side continuity rebuilding implied only by narrower return-side registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const rendererBridgeSource = readFileSync(new URL('../../../renderer/alicization-chat-stream-bridge.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../renderer/alicization-chat-stream-bridge.ts',
      mode: 'renderer-meta-bridge',
    }))
    expect(rendererBridgeSource).toContain('normalizeStructuredProjectStatePayload(')
    expect(rendererBridgeSource).toContain('normalizeStructuredPreDialogueAwarenessPayload(')
    expect(rendererBridgeSource).toContain('normalizeStructuredPreDialogueClosurePayload(')
    expect(rendererBridgeSource).toContain('projectState: bridgedProjectState')
    expect(rendererBridgeSource).toContain('preDialogueAwareness: bridgedPreDialogueAwareness ?? null')
    expect(rendererBridgeSource).toContain('preDialogueClosure: normalizedPreDialogueClosure ?? null')
  })

  it('keeps packages/stage-ui/src/composables/alicization-structured-output.ts concrete by anchoring canonical return-side project-awareness normalization in one shared route-authority audit instead of leaving shape repair continuity implied only by narrower return-side registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const structuredOutputSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts',
      mode: 'structured-normalization',
    }))
    expect(structuredOutputSource).toContain('export function normalizeStructuredProjectStatePayload(')
    expect(structuredOutputSource).toContain('export function normalizeStructuredPreDialogueAwarenessPayload(')
    expect(structuredOutputSource).toContain('export function normalizeStructuredPreDialogueClosurePayload(')
  })

  it('keeps packages/stage-ui/src/stores/project-state-observation.ts concrete by anchoring return-side continuity observation reduction in one shared route-authority audit instead of leaving reopen-time same-her carry implied only by narrower return-side registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const observationSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/project-state-observation.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../../../../packages/stage-ui/src/stores/project-state-observation.ts',
      mode: 'project-state-observation-reducer',
    }))
    expect(observationSource).toContain('export function readConversationTurnProjectStateObservation(')
    expect(observationSource).toContain('normalizeStructuredProjectStatePayload(projectState)')
    expect(observationSource).toContain('normalizeStructuredPreDialogueAwarenessPayload(preDialogueAwareness)')
    expect(observationSource).toContain('projectStateAudit?.preDialogueAwarenessSummary')
    expect(observationSource).toContain('projectStateAudit?.continuitySummary')
    expect(observationSource).toContain('const strongerPreDialogueAwarenessSummary')
    expect(observationSource).toContain('const strongerContinuitySummary')
    expect(observationSource).toContain('const summaryLine = shouldPreferRicherProjectAwareSummary')
    expect(observationSource).toContain('export function projectStateObservationToContinuitySnapshot(')
  })

  it('keeps packages/stage-ui/src/stores/chat/session-store.ts concrete by anchoring rebuilt assistant-history project-awareness sanitization in one shared route-authority audit instead of leaving reopen-time same-her carry implied only by narrower return-side registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const sessionStoreSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/chat/session-store.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../../../../packages/stage-ui/src/stores/chat/session-store.ts',
      mode: 'session-sanitization',
    }))
    expect(sessionStoreSource).toContain('normalizeStructuredProjectStatePayload(')
    expect(sessionStoreSource).toContain('normalizeStructuredPreDialogueAwarenessPayload(')
    expect(sessionStoreSource).toContain('maybeBackfillRestoredPreDialogueAwareness(')
    expect(sessionStoreSource).toContain('projectState: restoredProjectState')
    expect(sessionStoreSource).toContain('preDialogueAwareness: restoredPreDialogueAwareness')
  })

  it('keeps packages/stage-ui/src/stores/alicization-browser-bridge.ts concrete by anchoring browser-side project-awareness observation persistence in one shared route-authority audit instead of leaving reopen-time same-her continuity carry implied only by narrower return-side registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const browserBridgeSource = readFileSync(new URL('../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'return-side-project-awareness',
      relativePath: '../../../../../../packages/stage-ui/src/stores/alicization-browser-bridge.ts',
      mode: 'browser-observation-persistence',
    }))
    expect(browserBridgeSource).toContain('readConversationTurnProjectStateObservation(')
    expect(browserBridgeSource).toContain('projectStateObservationToContinuitySnapshot(')
    expect(browserBridgeSource).toContain('projectState: normalizeStructuredProjectStatePayload(')
    expect(browserBridgeSource).toContain('preDialogueAwareness: normalizeStructuredPreDialogueAwarenessPayload(')
  })

  it('keeps visible-reply/facade.ts concrete by anchoring reply-surface preflight project-state resolution in one shared route-authority audit instead of leaving executive answer briefing implied only by broader coverage prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const facadeSource = readFileSync(new URL('./visible-reply/facade.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'visible-reply/facade.ts',
      mode: 'reply-surface-preflight',
    }))
    expect(facadeSource).toContain('const projectState = resolveVisibleReplyProjectState({')
    expect(facadeSource).toContain('const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({')
    expect(facadeSource).toContain('const responseSurfaceContract = buildAlicizationResponseSurfaceContract({')
  })

  it('keeps response-surface-contract.ts concrete by anchoring shared project-state same-her continuity carry in one shared route-authority audit instead of leaving visible reply status posture implied only by narrower continuity-surface registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const responseSurfaceSource = readFileSync(new URL('./response-surface-contract.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'response-surface-contract.ts',
      mode: 'visible-reply-continuity-surface',
    }))
    expect(responseSurfaceSource).toContain('alicizationProjectStateSameHerContinuityReminder')
    expect(responseSurfaceSource).toContain('alicizationProjectStateVisibleReplySameHerReminder.replace(\'questions\', \'status\')')
  })

  it('keeps visible-reply/semantic-judge.ts concrete by anchoring final same-her / open-closure / next-closure project-state judging in one shared route-authority audit instead of leaving the last visible gate implied only by narrower continuity-surface registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const semanticJudgeSource = readFileSync(new URL('./visible-reply/semantic-judge.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'visible-reply/semantic-judge.ts',
      mode: 'visible-reply-continuity-surface',
    }))
    expect(semanticJudgeSource).toContain('alicizationProjectStateVisibleReplyOpenClosureReminder')
    expect(semanticJudgeSource).toContain('alicizationProjectStateVisibleReplyNextClosureReminder')
  })

  it('keeps visible-reply/critic.ts concrete by anchoring rewritten same-her project-state continuity preservation in one shared route-authority audit instead of leaving repair-time status carry implied only by narrower continuity-surface registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const criticSource = readFileSync(new URL('./visible-reply/critic.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'visible-reply/critic.ts',
      mode: 'visible-reply-continuity-surface',
    }))
    expect(criticSource).toContain('pushUnique(mustPreserve, alicizationProjectStateSameHerContinuityReminder)')
    expect(criticSource).toContain('pushUnique(mustPreserve, alicizationProjectStateVisibleReplySameHerReminder)')
  })

  it('keeps runtime-delivery-reminders.ts overlap concrete by anchoring guarded persistence entry and reminder answer-governance carry in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const reminderSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-turn-persistence',
      relativePath: 'runtime-delivery-reminders.ts',
      mode: 'reminder-turn-entry',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'runtime-delivery-reminders.ts',
      mode: 'visible-reply-continuity-surface',
    }))
    expect(reminderSource).toContain('appendConversationTurnWithGuards({')
    expect(reminderSource).toContain('alicizationProjectStatePersistenceLandedReminder')
    expect(reminderSource).toContain('alicizationProjectStateVisibleReplySameHerReminder')
    expect(reminderSource).toContain('continuitySummary:')
  })

  it('keeps runtime-subconscious-tick.ts overlap concrete by anchoring proactive normalization and guarded turn entry in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-dialogue-normalization',
      relativePath: 'runtime-subconscious-tick.ts',
      mode: 'proactive-normalize-before-persist',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-turn-persistence',
      relativePath: 'runtime-subconscious-tick.ts',
      mode: 'proactive-turn-entry',
    }))
    expect(subconsciousSource).toContain('normalizeDialogueRespondedPayload({')
    expect(subconsciousSource).toContain('appendConversationTurnWithGuards({')
    expect(subconsciousSource).toContain('projectState: projectStatePersistence,')
  })

  it('keeps runtime.ts overlap concrete by anchoring persistence-time normalization, guarded turn authority, and persisted project-state continuity fallback in one shared route-authority audit instead of relying only on overlap reason prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-dialogue-normalization',
      relativePath: 'runtime.ts',
      mode: 'persistence-emission-normalize-before-deliver',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-turn-persistence',
      relativePath: 'runtime.ts',
      mode: 'persistence-authority',
    }))
    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'project-state-answer-governance',
      relativePath: 'runtime.ts',
      mode: 'visible-reply-continuity-surface',
    }))
    expect(runtimeSource).toContain('async function appendConversationTurnWithGuards(')
    expect(runtimeSource).toContain('structured: normalizePersistedProjectStateForConversationTurn({')
    expect(runtimeSource).toContain('const dialoguePayload = normalizeDialogueRespondedPayload(')
    expect(runtimeSource).toContain('alicizationProjectStatePersistenceLandedReminder')
    expect(runtimeSource).toContain('alicizationProjectStatePersistenceNextClosureReminder')
    expect(runtimeSource).toContain('continuitySummary:')
  })

  it('keeps runtime-invoke-handlers-dialogue.ts concrete by anchoring renderer dialogue append entry in one shared route-authority audit instead of leaving guarded persistence implied only by narrower persistence-consumer registration prose', () => {
    const resolveRegistry = projectStateBrief.resolveAlicizationProjectRouteAuthorityRegistry
    const dialogueInvokeSource = readFileSync(new URL('./runtime-invoke-handlers-dialogue.ts', import.meta.url), 'utf8')

    const registry = resolveRegistry?.() ?? []

    expect(registry).toContainEqual(expect.objectContaining({
      domain: 'runtime-turn-persistence',
      relativePath: 'runtime-invoke-handlers-dialogue.ts',
      mode: 'renderer-dialogue-entry',
    }))
    expect(dialogueInvokeSource).toContain('await appendConversationTurnWithGuards(payload)')
  })

  it('keeps adjacent authority audit registries sourced from the shared route-authority helper instead of parallel local arrays', () => {
    const transportSource = readFileSync(new URL('./pre-dialogue-transport-audit.ts', import.meta.url), 'utf8')
    const returnSideSource = readFileSync(new URL('./return-side-project-awareness-audit.ts', import.meta.url), 'utf8')
    const normalizationSource = readFileSync(new URL('./runtime-dialogue-normalization-audit.ts', import.meta.url), 'utf8')
    const persistenceSource = readFileSync(new URL('./runtime-turn-persistence-audit.ts', import.meta.url), 'utf8')
    const answerGovernanceSource = readFileSync(new URL('./project-state-answer-governance-audit.ts', import.meta.url), 'utf8')

    for (const source of [
      transportSource,
      returnSideSource,
      normalizationSource,
      persistenceSource,
      answerGovernanceSource,
    ]) {
      expect(source).toContain('from \'./project-state-brief\'')
      expect(source).toContain('resolveAlicizationProjectRouteAuthorityRegistry()')
    }

    expect(transportSource).not.toContain('const alicizationPreDialogueTransportAuditRegistry = [')
    expect(returnSideSource).not.toContain('const alicizationReturnSideProjectAwarenessAuditRegistry = [')
    expect(normalizationSource).not.toContain('const alicizationRuntimeDialogueNormalizationAuditRegistry = [')
    expect(persistenceSource).not.toContain('const alicizationRuntimeTurnPersistenceAuditRegistry = [')
    expect(answerGovernanceSource).not.toContain('const alicizationProjectStateAnswerGovernanceAuditRegistry = [')
  })
})
