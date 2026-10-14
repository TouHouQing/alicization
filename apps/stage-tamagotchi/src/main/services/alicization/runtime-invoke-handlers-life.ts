import type { IpcMainEvent } from 'electron'

import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'
import type { LifeSurfaceRegistration } from './life-body-repository'

import { randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { electronLifeArtifactRestore, electronLifeBackupCommand, electronLifeBodyActivity, electronLifeBodyHealth, electronLifeClosure, electronLifeExpressionReceipt, electronLifeGrowthRollback, electronLifeInputCommand, electronLifeInputPreview, electronLifeObligationCommand, electronLifeOutreachPolicy, electronLifePersonaCommand, electronLifePersonalProposalWithdraw, electronLifePolicyCommand, electronLifeProjectFeedback, electronLifeSurfaceSession, electronLifeView } from '../../../shared/life-events'
import { lifeBodyActivitySchema, recordLifeBodyActivity } from './life-body-activity-runtime'
import { discardLifeConversationPreferences, lifeRelationshipKey } from './life-conversation-preferences'
import { lifeExpressionReceiptSchema } from './life-expression-repository'
import { verifyLifeGoal } from './life-goal-verifier'
import { parseLifeGrowthSnapshot } from './life-growth-repository'
import { readLifeInputText } from './life-input-preview'
import { withdrawLifePersonalProposal } from './life-personal-proposals'
import { recordExplicitPersonalProjectFeedback } from './life-project-development'
import { rollbackAlicizationSelfEvolutionCandidate } from './self-evolution/version-runtime'

interface InvokeMetadata { raw?: { ipcMainEvent?: IpcMainEvent } }
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const version = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
const scopeSchema = v.strictObject({ cardId: id })
const commandSchema = v.strictObject({ cardId: id, id, operationId: id, expectedGeneration: version, expectedRevision: version, action: v.picklist(['cancel', 'reschedule', 'verify', 'report-completed']), dueAt: v.optional(version) })
const outreachPolicySchema = v.strictObject({ maximumPerDay: version, minimumIntervalMinutes: version, quietStartHour: version, quietEndHour: version, quietEnabled: v.boolean(), timezone: id })

export function registerLifeInvokeHandlers(options: {
  register: (event: unknown, handler: (payload: unknown, metadata: InvokeMetadata) => Promise<unknown>) => void
  withCardScope: <T>(cardId: string, task: () => Promise<T>, options?: { lane: 'foreground' | 'background', label: string, skipQueueWhenScopeAlreadyActive?: boolean }) => Promise<T>
  readClosure: (turnId: string) => Promise<import('../../../shared/life-closure-contracts').LifeClosureRecord>
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  getIngress: (id: string) => Promise<import('../../../shared/life-contracts').LifeIngress | null>
  getUserInput: (id: string) => Promise<Record<string, unknown> | null>
  copyText: (text: string) => void
  readSetting: (key: string) => Promise<string | undefined>
  hasPublishedTurn: (cardId: string, turnId: string) => Promise<boolean>
  getSurface: (sessionId: string) => Promise<LifeSurfaceRegistration | null>
  surfaceVisible: (contents: IpcMainEvent['sender']) => boolean
  rescheduleTimer: () => Promise<void>
  cancelExecution: (cardId: string, threadId: string) => void
  personaCommand?: (input: import('../../../shared/life-persona-contracts').LifePersonaCommand) => Promise<{ status: string }>
  restoreArtifact?: (input: import('../../../shared/life-events').LifeArtifactCommand) => Promise<{ status: string }>
  resumeInput?: (input: { cardId: string, ingressId: string, expectedPayloadHash: string }, metadata: InvokeMetadata) => Promise<{ status: 'resumed', turnId: string }>
  policyCommand?: (input: import('../../../shared/life-policy-contracts').LifePolicyCommand) => Promise<{ status: string }>
  backupCommand?: (input: import('../../../shared/life-backup-contracts').LifeBackupCommand, metadata: InvokeMetadata) => Promise<import('../../../shared/life-backup-contracts').LifeBackupResult>
}) {
  const surfaces = new Map<number, { id: string, cardId: string }>()
  const sender = (metadata: InvokeMetadata) => {
    const contents = metadata?.raw?.ipcMainEvent?.sender
    if (!contents || contents.isDestroyed())
      throw new Error('Life governance requires an active desktop surface')
    const url = new URL(contents.getURL())
    if (url.protocol !== 'file:' && (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
      throw new Error('Life governance requires the trusted local application interface')
    return contents
  }
  options.register(electronLifeBackupCommand, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, action: v.picklist(['list', 'create', 'restore']), backupId: v.optional(v.pipe(v.string(), v.uuid())), expectedManifestHash: v.optional(v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))) }), raw)
    if (!options.backupCommand)
      throw new Error('Local backup governance is unavailable')
    return options.withCardScope(input.cardId, () => options.backupCommand!(input, metadata))
  })
  options.register(electronLifePolicyCommand, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, candidateId: id, expectedOwnerHash: id, operationId: id, action: v.picklist(['evaluate', 'adopt']), expectedEvaluationHash: v.optional(id) }), raw)
    if (!options.policyCommand)
      throw new Error('Policy evaluation is unavailable')
    return options.withCardScope(input.cardId, () => options.policyCommand!(input))
  })
  options.register(electronLifeView, async (raw, metadata) => {
    sender(metadata)
    const scope = v.parse(scopeSchema, raw)
    return options.withCardScope(scope.cardId, options.read)
  })
  options.register(electronLifeProjectFeedback, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, goalId: id, generation: version, turnId: id, feedback: v.picklist(['positive', 'dismiss']), operationId: id }), raw)
    return options.withCardScope(input.cardId, () => recordExplicitPersonalProjectFeedback(options, input))
  })
  options.register(electronLifePersonaCommand, async (raw, metadata) => {
    sender(metadata)
    const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
    const input = v.parse(v.strictObject({ cardId: id, proposalId: id, operationId: id, expectedTargetHash: hash, expectedEvaluationHash: v.optional(hash), action: v.picklist(['evaluate', 'approve', 'reject', 'adopt', 'rollback']) }), raw)
    if (!options.personaCommand)
      throw new Error('Persona development is unavailable')
    return options.withCardScope(input.cardId, () => options.personaCommand!(input))
  })
  options.register(electronLifeArtifactRestore, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, goalId: id, operationId: id, expectedGeneration: version, expectedHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)) }), raw)
    if (!options.restoreArtifact)
      throw new Error('Artifact restoration is unavailable')
    return options.withCardScope(input.cardId, () => options.restoreArtifact!(input))
  })
  options.register(electronLifeClosure, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, turnId: id }), raw)
    return options.withCardScope(input.cardId, () => options.readClosure(input.turnId))
  })
  const inputScope = { cardId: id, ingressId: id, expectedPayloadHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)) }
  async function checkedInput(input: { ingressId: string, expectedPayloadHash: string }) {
    const ingress = await options.getIngress(input.ingressId)
    if (!ingress || ingress.kind !== 'user-turn' || ingress.payloadHash !== input.expectedPayloadHash)
      throw new Error('The source input changed; reload before reviewing it')
    return ingress
  }
  options.register(electronLifeInputPreview, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject(inputScope), raw)
    return options.withCardScope(input.cardId, async () => {
      const ingress = await checkedInput(input)
      const source = readLifeInputText(await options.getUserInput(ingress.id))
      return { ingressId: ingress.id, turnId: String(ingress.payload.turnId ?? ''), text: source.text?.slice(0, 4000) ?? null, truncated: (source.text?.length ?? 0) > 4000, hasAttachments: source.hasAttachments, occurredAt: ingress.occurredAt }
    })
  })
  options.register(electronLifeInputCommand, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ ...inputScope, operationId: id, action: v.picklist(['copy', 'discard', 'resume']) }), raw)
    return options.withCardScope(input.cardId, async () => {
      if (input.action === 'resume') {
        if (!options.resumeInput)
          throw new Error('Input continuation is unavailable')
        return options.resumeInput({ cardId: input.cardId, ingressId: input.ingressId, expectedPayloadHash: input.expectedPayloadHash }, metadata)
      }
      const ingress = await checkedInput(input)
      if (input.action === 'copy') {
        const source = readLifeInputText(await options.getUserInput(ingress.id))
        if (!source.text)
          throw new Error('The source input has no recoverable text')
        options.copyText(source.text)
        return { status: 'copied' }
      }
      const preference = discardLifeConversationPreferences((await options.read()).values[lifeRelationshipKey], ingress.id)
      await options.commit({ cardId: input.cardId, operationKey: `input-discard:${input.operationId}`, changes: preference ? [preference] : [], mutations: [{ type: 'ingress-settle', id: ingress.id, status: 'failed', expectedStatus: 'held', expectedPayloadHash: input.expectedPayloadHash }] })
      return { status: 'discarded' }
    }, { lane: input.action === 'resume' ? 'foreground' : 'background', label: `input-${input.action}:${input.cardId}` })
  })
  options.register(electronLifeOutreachPolicy, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, operationId: id, policy: outreachPolicySchema, expectedPolicy: outreachPolicySchema }), raw)
    return options.withCardScope(input.cardId, () => options.commit({ cardId: input.cardId, operationKey: `outreach-policy:${input.operationId}`, changes: [], mutations: [{ type: 'outreach-policy', policy: input.policy, expectedPolicy: input.expectedPolicy }] }))
  })
  options.register(electronLifeSurfaceSession, async (raw, metadata) => {
    const scope = v.parse(scopeSchema, raw)
    const contents = sender(metadata)
    const surface = { id: randomUUID(), cardId: scope.cardId }
    await options.withCardScope(scope.cardId, () => options.commit({ cardId: scope.cardId, operationKey: `surface:${surface.id}`, changes: [], mutations: [{ type: 'surface-register', sessionId: surface.id, surface: contents.getURL().split('#')[0] }] }))
    if (contents.isDestroyed())
      throw new Error('Presentation surface closed while its session was being registered')
    const key = contents.id
    surfaces.set(key, surface)
    contents.once('destroyed', () => surfaces.delete(key))
    return { id: surface.id }
  })
  options.register(electronLifeExpressionReceipt, async (raw, metadata) => {
    const receipt = v.parse(lifeExpressionReceiptSchema, raw)
    const contents = sender(metadata)
    const surface = surfaces.get(contents.id)
    return options.withCardScope(receipt.cardId, async () => {
      const liveSession = surface?.cardId === receipt.cardId && surface.id === receipt.surfaceSessionId
      if (!liveSession) {
        const issued = await options.getSurface(receipt.surfaceSessionId)
        // Issued identity and sequence establish causality even after a wall-clock rollback.
        if (!issued || issued.surface !== contents.getURL().split('#')[0])
          throw new Error('Recovered expression receipt has no issued surface identity')
      }
      if (!await options.hasPublishedTurn(receipt.cardId, receipt.turnId))
        throw new Error('Expression receipt has no published turn')
      const visible = liveSession && options.surfaceVisible(contents)
      // A recovered DOM receipt cannot establish historical native visibility.
      // Keep its observation without using it as a reminder delivery proof.
      const presentationVerified = receipt.state === 'rendered' ? visible : true
      const committed = await options.commit({ cardId: receipt.cardId, operationKey: `expression:${receipt.receiptId}`, changes: [], mutations: [{ type: 'expression-record', receipt, presentationVerified }] })
      return { ...committed, presentationVerified }
    // Presentation is a callback of the current turn, and may settle the work
    // holding its scope. Same-card sharing retains the normal cross-card fence.
    }, { lane: 'foreground', label: `expression-receipt:${receipt.cardId}`, skipQueueWhenScopeAlreadyActive: true })
  })
  options.register(electronLifeBodyHealth, async (raw, metadata) => {
    const contents = sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, sessionId: id, health: v.strictObject({ rendererState: v.picklist(['pending', 'loading', 'mounted']), renderer: id, modelSelected: v.boolean(), canvasPresent: v.boolean(), visiblePixels: v.picklist(['unknown', 'visible', 'invisible']), errorCode: v.nullable(id) }) }), raw)
    if (surfaces.get(contents.id)?.cardId !== input.cardId || surfaces.get(contents.id)?.id !== input.sessionId)
      throw new Error('Body health surface is stale')
    return options.withCardScope(input.cardId, () => options.commit({ cardId: input.cardId, operationKey: `body-health:${randomUUID()}`, changes: [], mutations: [{ type: 'body-health', sessionId: input.sessionId, health: { ...input.health, nativeWindowVisible: options.surfaceVisible(contents) } }] }), { lane: 'foreground', label: `body-health:${input.cardId}`, skipQueueWhenScopeAlreadyActive: true })
  })
  options.register(electronLifeBodyActivity, async (raw, metadata) => {
    const contents = sender(metadata)
    const input = v.parse(v.strictObject({ receipt: lifeBodyActivitySchema, sessionId: id }), raw)
    if (surfaces.get(contents.id)?.cardId !== input.receipt.cardId || surfaces.get(contents.id)?.id !== input.sessionId)
      throw new Error('Body activity surface is stale')
    return options.withCardScope(input.receipt.cardId, () => recordLifeBodyActivity({ read: options.read, commit: options.commit, now: Date.now }, input.receipt, input.sessionId, options.surfaceVisible(contents)), { lane: 'foreground', label: `body-activity:${input.receipt.cardId}`, skipQueueWhenScopeAlreadyActive: true })
  })
  options.register(electronLifePersonalProposalWithdraw, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, proposalId: id, expectedReplyHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)) }), raw)
    return options.withCardScope(input.cardId, async () => {
      await withdrawLifePersonalProposal(options, input)
      return { status: 'withdrawn' }
    })
  })
  options.register(electronLifeGrowthRollback, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, candidateId: id, operationId: id, expectedHash: id }), raw)
    return options.withCardScope(input.cardId, async () => {
      const view = await options.read()
      const authority = view.owners.find(owner => owner.owner === 'growth')
      if (!authority || authority.contentHash !== input.expectedHash)
        throw new Error('Growth state changed; reload before rollback')
      const raw = view.values[authority.metaKey]
      const snapshot = parseLifeGrowthSnapshot(raw)
      if (!snapshot.candidates.some(candidate => candidate.id === input.candidateId && candidate.status !== 'rolled-back'))
        throw new Error('Growth candidate is absent or already rolled back')
      const next = rollbackAlicizationSelfEvolutionCandidate({ snapshot, candidateId: input.candidateId, reason: 'user-request', now: Date.now() })
      return options.commit({ cardId: input.cardId, operationKey: `growth-rollback:${input.operationId}`, changes: [], mutations: [{ type: 'growth-save', key: authority.metaKey, snapshotJson: JSON.stringify(next), expectedValue: raw }] })
    })
  })
  options.register(electronLifeObligationCommand, async (raw, metadata) => {
    sender(metadata)
    const command = v.parse(commandSchema, raw)
    return options.withCardScope(command.cardId, async () => {
      const view = await options.read()
      const obligation = view.obligations.find(item => item.id === command.id)
      if (!obligation || obligation.generation !== command.expectedGeneration || obligation.revision !== command.expectedRevision)
        throw new Error('Obligation changed; reload its current state')
      const fence = { id: obligation.id, expectedGeneration: obligation.generation, expectedRevision: obligation.revision }
      let receipt: LifeCommitReceipt
      if (command.action === 'verify' || command.action === 'report-completed') {
        if (command.action === 'report-completed' && obligation.proof.kind !== 'user-reported')
          throw new Error('This obligation requires independent verification')
        const verification = await verifyLifeGoal({ obligation, readSetting: options.readSetting, userReported: command.action === 'report-completed' })
        receipt = await options.commit({ cardId: command.cardId, operationKey: `governance:${command.operationId}`, changes: [], mutations: [{ type: 'obligation-verify', ...fence, verification }] })
      }
      else {
        if (command.action === 'reschedule' && command.dueAt == null)
          throw new TypeError('Rescheduling requires an exact local due time')
        receipt = await options.commit({ cardId: command.cardId, operationKey: `governance:${command.operationId}`, changes: [], mutations: [{ type: 'obligation-update', ...fence, status: command.action === 'cancel' ? 'cancelled' : 'waiting', ...(command.action === 'reschedule' ? { dueAt: command.dueAt } : {}) }] })
      }
      if (command.action === 'cancel' && obligation.threadId)
        options.cancelExecution(command.cardId, obligation.threadId)
      await options.rescheduleTimer()
      return receipt
    })
  })
}
