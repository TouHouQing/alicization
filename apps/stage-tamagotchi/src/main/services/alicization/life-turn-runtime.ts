import type { BrowserWorkBinding } from '../../../shared/execution-contracts'
import type { LifeCapabilityEffects, LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeEvidenceRef, LifeIngress, LifeOwnerVersion, LifeStateView } from '../../../shared/life-contracts'
import type { FileMutationRecovery } from './execution/file-mutation-recovery'
import type { ExecutionResourceBroker, ResourceLease } from './execution/resource-broker'
import type { LifeInterfaceObservation } from './life-interface-action-closure'

import { createHash } from 'node:crypto'

import { executionDigest } from './execution/acceptance-compiler'
import { actionDidNotStart } from './execution/action-dispatch-context'
import { createActionDispatchGate } from './execution/action-dispatch-gate'
import { actionResponsibility } from './execution/action-responsibility'
import { isMainFilesystemMutation } from './execution/filesystem-mutation-input'
import { assertNoUncertainResourceConflict, executionOperationResources, recordedExecutionResources } from './execution/uncertain-resource-fence'
import { lifeVerifiedActivityChronology } from './life-activity-order'
import { lifeCompletionPeriod } from './life-completion-period'
import { conversationPreferenceChange, lifeRelationshipKey, readLifeConversationPreferences } from './life-conversation-preferences'
import { readLifeConversationRecallContext } from './life-conversation-recall-context'
import { readLifeDailyRhythm } from './life-daily-activity-runtime'
import { closeLifeFileAction } from './life-file-action-closure'
import { parseLifeGrowthSnapshot } from './life-growth-repository'
import { readLifeQuietBoundary, readLifeQuietInterval, requestsQuietCompanionship } from './life-interaction-boundary'
import { closeLifeInterfaceAction } from './life-interface-action-closure'
import { readLifePersonalArtifactContents } from './life-personal-artifact-content'
import { deriveLifePersonalInterests, deriveLifePracticeLessons } from './life-personal-continuity'
import { readLifePersonalProposals, recordLifePersonalChoice } from './life-personal-proposals'
import { lifeProviderStatePolicy } from './life-provider-state-policy'
import { createLifeDialogueReadSet } from './life-read-set'

const lifeMetadataReaders = new Set(['tool.life_list_learned_procedures', 'tool.life_list_execution_verifiers'])

interface LifeTurnRuntimeOptions {
  fileRecovery?: (owner: { cardId: string, effectId: string, turnId: string }) => FileMutationRecovery
  resourceBroker?: ExecutionResourceBroker
  commit: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>
  read: () => Promise<LifeStateView>
  getIngress: (id: string) => Promise<LifeIngress | null>
  readUserInput?: (id: string) => Promise<Record<string, unknown> | null>
  readConversationStatements?: (conversationId: string) => Promise<Array<{ turnId: string, text: string, occurredAt: number }>>
  getEffect: (id: string) => Promise<LifeEffect | null>
  now: () => number
  observeInterface?: (proof: import('../../../shared/life-contracts').LifeObligation['proof']) => Promise<LifeInterfaceObservation | null>
  onHostInteraction?: (cardId: string) => Promise<unknown>
}

export function createLifeTurnRuntime(options: LifeTurnRuntimeOptions) {
  const leases = new Map<string, ResourceLease>()
  async function admit(input: { cardId: string, turnId: string, conversationId: string, messages: unknown[] }, signal: AbortSignal) {
    const id = `user:${input.turnId}`
    // Store the current action atomically through ingress, not the whole history.
    // Its body is kept in the source payload table; views carry only a reference.
    const current = [...input.messages].reverse().find(message => message && typeof message === 'object' && (message as { role?: unknown }).role === 'user')
    if (!current)
      throw new TypeError('User turn has no current user input')
    const serialized = JSON.stringify(current)
    const inputHash = createHash('sha256').update(serialized).digest('hex')
    const existing = await options.getIngress(id)
    if (existing) {
      if (existing.payload.inputHash !== inputHash || existing.payload.conversationId !== input.conversationId)
        throw new Error('Turn identifier was reused with different input')
      return
    }
    const now = options.now()
    const preferenceInput = { cardId: input.cardId, conversationId: input.conversationId, sourceId: id, inputHash, message: current as Record<string, unknown>, now }
    // Lifecycle-only callers need no source-text resolver; dialogue callers wire
    // it explicitly so current requirements can be verified again after restart.
    const candidate = options.readUserInput ? conversationPreferenceChange(undefined, preferenceInput) : null
    const preference = candidate ? conversationPreferenceChange((await options.read()).values[lifeRelationshipKey], preferenceInput) : null
    await options.commit({ cardId: input.cardId, operationKey: `ingress:${id}`, changes: preference ? [preference] : [], mutations: [{ type: 'ingress-accept', ingress: { id, kind: 'user-turn', source: 'dialogue', sourceKey: input.turnId, occurredAt: now, payload: { conversationId: input.conversationId, turnId: input.turnId, currentMessage: current, inputHash } } }, { type: 'outreach-boundary', turnId: input.turnId, quiet: requestsQuietCompanionship(current) }] }, { signal })
    await options.onHostInteraction?.(input.cardId)
  }

  async function context(cardId: string) {
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Life view crossed the active card boundary')
    const soul = view.values['life:soul-active'] ? JSON.parse(view.values['life:soul-active']) : null
    const quietBoundary = readLifeQuietBoundary(view.values)
    const recentQuietInterval = readLifeQuietInterval(view.values)
    const conversationPreferences = options.readUserInput ? await readLifeConversationPreferences(view, { getIngress: options.getIngress, readUserInput: options.readUserInput }, options.now()) : []
    const conversationRecall = options.readUserInput ? await readLifeConversationRecallContext(view, { getIngress: options.getIngress, readUserInput: options.readUserInput, readConversationStatements: options.readConversationStatements }, options.now()) : null
    if (soul?.persona?.proposalId) {
      const proposal = await options.getEffect(soul.persona.proposalId)
      if (!proposal || proposal.status !== 'settled' || proposal.payload.targetHash !== soul.contentHash)
        throw new Error('Adopted persona source requires reconciliation before dialogue')
    }
    const personalArtifactContents = await readLifePersonalArtifactContents(view, options.getEffect)
    const obligations = view.obligations.filter(item => !['fulfilled', 'cancelled', 'superseded'].includes(item.status)).slice(0, 12)
    const growthOwner = view.owners.find(owner => owner.owner === 'growth')
    const growth = growthOwner ? parseLifeGrowthSnapshot(view.values[growthOwner.metaKey]) : null
    const growthCandidate = growth?.candidates.find(candidate => candidate.id === growth.activeCandidateId && candidate.status === 'active') ?? null
    const chronology = lifeVerifiedActivityChronology(view)
    const interval = conversationRecall?.requestedQuietInterval
    const completedDuring = interval ? chronology.filter(activity => activity.verifiedAt >= interval.beganAt && activity.verifiedAt < interval.endedAt) : null
    const requestedIntervalCompletions = completedDuring ? { count: completedDuring.length, activities: completedDuring.slice(-4).map(({ kind, binding, summary }) => ({ kind, id: binding.id, summary: summary.slice(0, 80) })), scope: 'Verified completions in the actual requested interval from the same local state view; not a global absence claim.' } : null
    return { revision: view.revision, owners: view.owners, growthCandidateId: growthCandidate?.id ?? null, text: JSON.stringify({ authority: 'local-life-state', requestedIntervalCompletions, actualActivityChronology: chronology.slice(-4).map(({ kind, binding, summary, verifiedAt }) => ({ kind, id: binding.id, summary: summary.slice(0, 80), verifiedAt })), personalArtifactContents, conversationPreferences, conversationRecall, dailyRhythm: readLifeDailyRhythm(view.values), personalProposals: readLifePersonalProposals(view).filter(item => item.expiresAt > options.now()), personalInterests: deriveLifePersonalInterests(view), practiceLessons: deriveLifePracticeLessons(view), now: options.now(), revision: view.revision, owners: view.owners, recentQuietInterval, interactionBoundaries: quietBoundary ? [{ binding: { kind: 'boundary', id: quietBoundary.id, version: quietBoundary.inputHash }, scope: quietBoundary.scope, release: quietBoundary.release }] : [], growth: growthCandidate ? { id: growthCandidate.id, patch: growthCandidate.patch, sourceEvidence: growthCandidate.sourceEvidence } : null, soul: view.values['life:soul-active'] ? JSON.parse(view.values['life:soul-active']) : null, obligations: obligations.map(item => ({ id: item.id, summary: item.summary.slice(0, 320), status: item.status, generation: item.generation, dueAt: item.dueAt, proof: item.proof.kind })), resolved: view.obligations.filter(item => ['fulfilled', 'cancelled'].includes(item.status)).slice(0, 6).map(item => ({ id: item.id, status: item.status, summary: item.summary.slice(0, 200), createdAt: item.createdAt, verifiedAt: item.verification?.verifiedAt ?? null, completionPeriod: lifeCompletionPeriod(item.verification?.verifiedAt, conversationRecall?.requestedQuietInterval ?? null), receiptId: item.receiptId })), uncertainActions: view.effects.filter(item => item.status === 'uncertain').map(item => ({ id: item.id, actionId: item.actionId })).slice(0, 8), instruction: lifeProviderStatePolicy }) }
  }

  async function beforeAction(input: { cardId: string, turnId: string, actionId: string, capabilityId: string, parameters: unknown, owners?: LifeOwnerVersion[], effectContract?: LifeCapabilityEffects, browserBinding?: BrowserWorkBinding }, signal: AbortSignal) {
    const id = `action:${input.turnId}:${input.actionId}`
    const existing = await options.getEffect(id)
    const requested = { capabilityId: input.capabilityId, parameters: input.parameters, ...(input.effectContract ? { effectContract: input.effectContract } : {}), ...(input.browserBinding ? { browserBinding: input.browserBinding } : {}) }
    const priorRequest = existing ? { capabilityId: existing.payload.capabilityId, parameters: existing.payload.parameters, ...(existing.payload.effectContract ? { effectContract: existing.payload.effectContract } : {}), ...(existing.payload.browserBinding ? { browserBinding: existing.payload.browserBinding } : {}) } : null
    if (existing && executionDigest(priorRequest) !== executionDigest(requested))
      throw new Error('Action identifier was reused with different parameters')
    if (existing && !['prepared', 'settled'].includes(existing.status))
      throw new Error(`Action ${id} is ${existing.status}; verification is required before another dispatch`)
    const authorityView = await options.read()
    if (authorityView.cardId !== input.cardId)
      throw new Error('Action responsibility crossed the card boundary')
    if (existing?.status !== 'settled' && input.effectContract?.retryClass !== 'read-only')
      await assertNoUncertainResourceConflict({ ...input, effects: authorityView.effects })
    const admission = await options.getIngress(`user:${input.turnId}`)
    const sourceStates = existing?.status === 'settled' ? ['accepted', 'processing', 'settled'] : ['accepted', 'processing']
    if (admission && !sourceStates.includes(admission.status))
      throw new Error('The originating user turn is no longer active; another action needs a current request')
    const responsibility = actionResponsibility({ view: authorityView, ingress: admission ?? await options.getIngress(input.turnId), turnId: input.turnId, actionId: input.actionId, forReceipt: existing?.status === 'settled' })
    if (existing && (!existing.payload.actionResponsibility || executionDigest(existing.payload.actionResponsibility) !== executionDigest(responsibility)))
      throw new Error('Action responsibility changed; reconciliation is required')
    if (existing?.status === 'settled') {
      return {
        id,
        cached: existing.receipt,
        authorizeDispatch: async (_parameters: unknown) => { throw new Error('A settled action must use its receipt instead of dispatching again') },
        assertDispatchCurrent: async (_options?: { target?: boolean }): Promise<never> => { throw new Error('A settled action cannot dispatch additional operations') },
      }
    }
    // Prepare and authorize dispatch under one owner fence. A stale proposal
    // leaves no orphan intent and can be replanned without replaying an action.
    let lease: ResourceLease | undefined
    const resources = input.effectContract?.sideEffect !== 'read' ? (await executionOperationResources(input.cardId, input.capabilityId, input.parameters)).sort() : null
    const recorded = existing ? recordedExecutionResources(existing) : resources
    if (resources && (!recorded || executionDigest(recorded) !== executionDigest([...resources].sort())))
      throw new Error('Prepared action resource identity changed; a fresh action is required')
    const payload = { ...requested, actionResponsibility: responsibility, ...(recorded ? { resourceSnapshot: { version: 1, keys: recorded } } : {}) }
    const metadataRead = lifeMetadataReaders.has(input.capabilityId) && input.effectContract?.sideEffect === 'read' && input.effectContract.retryClass === 'read-only'
    if (options.resourceBroker && !metadataRead) {
      // Reads own no mutation target, but their stopped/uncertain lifecycle must
      // still be associated with the enclosing task's aggregate execution lease.
      lease = options.resourceBroker.acquire({ owner: `${input.cardId}:${input.turnId}`, resources: resources ?? [], effectId: id, effectCardId: input.cardId })
      leases.set(id, lease)
    }
    try {
      signal.throwIfAborted()
      if (lease)
        options.resourceBroker!.assert(lease)
      await options.commit({ cardId: input.cardId, operationKey: `dispatch:${id}`, expectedOwners: input.owners, changes: [], mutations: [...(!existing ? [{ type: 'effect-prepare' as const, effect: { id, operationKey: id, kind: 'execute' as const, turnId: input.turnId, actionId: input.actionId, generation: 0, payload } }] : []), { type: 'effect-transition', id, expected: 'prepared', status: 'claimed', leaseUntil: options.now() + 60_000 }, { type: 'effect-transition', id, expected: 'claimed', status: 'dispatched', leaseUntil: options.now() + 60_000 }] }, { signal })
    }
    catch (error) {
      if (lease) {
        const dispatched = await options.getEffect(id).catch(() => null)
        options.resourceBroker!.settle(lease, { stopped: dispatched?.status !== 'dispatched', uncertain: dispatched?.status === 'dispatched' })
        leases.delete(id)
      }
      throw error
    }
    const dispatch = createActionDispatchGate({ ...input, effectId: id, responsibility, ...(isMainFilesystemMutation(input.capabilityId) && options.fileRecovery ? { fileRecovery: options.fileRecovery({ cardId: input.cardId, effectId: id, turnId: input.turnId }) } : {}), signal, lease, broker: options.resourceBroker, read: options.read, getEffect: options.getEffect, getIngress: options.getIngress, now: options.now })
    return { id, cached: null, authorizeDispatch: dispatch, assertDispatchCurrent: dispatch.assertCurrent }
  }

  async function afterAction(input: { cardId: string, id: string, outcome: string, output: unknown, interrupted: boolean }) {
    const ingressId = `observation:${input.id}`
    const observedAt = options.now()
    const output = input.output && typeof input.output === 'object' ? input.output as Record<string, unknown> : null
    const notStarted = actionDidNotStart(input.output, input.cardId, input.id)
    const uncertain = (input.interrupted && !notStarted) || output?.effectMayHaveOccurred === true || output?.sideEffectState === 'unknown'
    const outcome = output?.status === 'failed' || output?.ok === false ? 'failure' : input.outcome
    await options.commit({ cardId: input.cardId, operationKey: `observe:${input.id}`, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: ingressId, kind: 'tool-result', source: 'execution', sourceKey: input.id, occurredAt: observedAt, payload: { outcome, output: input.output } } }, { type: 'ingress-settle', id: ingressId, status: 'settled' }, { type: 'effect-transition', id: input.id, expected: 'dispatched', status: uncertain ? 'uncertain' : 'settled', receipt: { outcome, output: input.output, observedAt } }] })
    const lease = leases.get(input.id)
    if (lease) {
      options.resourceBroker!.settle(lease, { stopped: !input.interrupted || notStarted, uncertain })
      leases.delete(input.id)
    }
    if (!uncertain) {
      const effect = await options.getEffect(input.id)
      if (effect)
        await closeLifeFileAction({ cardId: input.cardId, effect, read: options.read, commit: options.commit, now: options.now })
      if (effect && options.observeInterface)
        await closeLifeInterfaceAction({ cardId: input.cardId, effect, read: options.read, commit: options.commit, observe: options.observeInterface, now: options.now })
    }
  }

  async function settle(input: { cardId: string, turnId: string, status: string, committedText?: string, creativeOpportunity?: boolean, personalIntent?: unknown }) {
    const id = `user:${input.turnId}`
    const marker = `dialogue-settlement:${id}`
    if (input.status === 'completed') {
      const existing = await options.getIngress(marker)
      if (existing) {
        if (existing.kind !== 'system' || existing.source !== 'dialogue-settlement' || existing.status !== 'settled' || existing.payload.sourceInputId !== id || existing.payload.turnId !== input.turnId)
          throw new Error('Dialogue settlement marker requires reconciliation')
        if (input.committedText)
          await recordLifePersonalChoice(options, { cardId: input.cardId, turnId: input.turnId, text: input.committedText, creativeOpportunity: input.creativeOpportunity, personalIntent: input.personalIntent })
        return
      }
    }
    await options.commit({ cardId: input.cardId, operationKey: `settle:${id}`, changes: [], mutations: [{ type: 'ingress-settle', id, status: input.status === 'completed' ? 'settled' : 'failed' }, ...(input.status === 'completed' ? [{ type: 'ingress-accept' as const, ingress: { id: marker, kind: 'system' as const, source: 'dialogue-settlement', sourceKey: input.turnId, occurredAt: options.now(), payload: { turnId: input.turnId, sourceInputId: id } } }, { type: 'ingress-settle' as const, id: marker, status: 'settled' as const }] : [])] })
    if (input.status === 'completed' && input.committedText)
      await recordLifePersonalChoice(options, { cardId: input.cardId, turnId: input.turnId, text: input.committedText, creativeOpportunity: input.creativeOpportunity, personalIntent: input.personalIntent })
  }
  async function recordContextUse(input: { cardId: string, turnId: string, requestHash: string, evidenceIds: string[], evidenceRefs?: LifeEvidenceRef[], owners: LifeOwnerVersion[], growthCandidateId?: string | null }, signal: AbortSignal) {
    const id = `context:${input.turnId}:${input.requestHash}`
    if (await options.getIngress(id))
      return
    const view = await options.read()
    const soul = view.values['life:soul-active'] ? JSON.parse(view.values['life:soul-active']) : null
    await options.commit({ cardId: input.cardId, operationKey: id, changes: [], ...createLifeDialogueReadSet(input.owners), ingressIds: [`user:${input.turnId}`], mutations: [{ type: 'ingress-accept', ingress: { id, kind: 'system', source: 'provider-context', sourceKey: `${input.turnId}:${input.requestHash}`, occurredAt: options.now(), payload: { turnId: input.turnId, requestHash: input.requestHash, personaProposalId: soul?.persona?.proposalId ?? null, evidenceIds: input.evidenceIds, evidenceRefs: input.evidenceRefs ?? [], readSet: input.owners } } }, { type: 'ingress-settle', id, status: 'settled' }, ...(input.growthCandidateId ? [{ type: 'growth-consumed' as const, key: input.owners.find(owner => owner.owner === 'growth')!.metaKey, candidateId: input.growthCandidateId, consumer: 'provider-context', turnId: input.turnId }] : [])] }, { signal })
  }
  async function recover(cardId: string) {
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Recovery crossed the active card boundary')
    for (const effect of view.effects) {
      if (effect.status === 'dispatched' || effect.status === 'claimed') {
        await options.commit({ cardId, operationKey: `recover:${effect.id}:${effect.status}`, changes: [], mutations: [{ type: 'effect-transition', id: effect.id, expected: effect.status, status: effect.status === 'dispatched' ? 'uncertain' : 'cancelled', receipt: { reason: 'runtime-restart', requiresVerification: effect.status === 'dispatched' } }] })
      }
    }
    for (const ingress of view.ingress) {
      if (ingress.kind === 'user-turn' && ['accepted', 'processing'].includes(ingress.status))
        await options.commit({ cardId, operationKey: `recover-input:${ingress.id}`, changes: [], mutations: [{ type: 'ingress-settle', id: ingress.id, status: 'held' }] })
    }
    return options.read()
  }
  return { admit, context, beforeAction, afterAction, settle, recover, recordContextUse }
}

export type LifeTurnRuntime = ReturnType<typeof createLifeTurnRuntime>
