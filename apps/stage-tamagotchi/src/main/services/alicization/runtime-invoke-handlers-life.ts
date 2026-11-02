import type { IpcMainEvent } from 'electron'

import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'
import type { LifeSurfaceRegistration } from './life-body-repository'

import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'

import * as v from 'valibot'

import { lifeBackupCommandSchema } from '../../../shared/life-backup-contracts'
import { electronLifeArtifactRestore, electronLifeAuthorizedBrowser, electronLifeBackupCommand, electronLifeBodyActivity, electronLifeBodyHealth, electronLifeClosure, electronLifeExecutionArtifact, electronLifeExecutionCriteriaChange, electronLifeExecutionPlan, electronLifeExecutionRecovery, electronLifeExecutionReobserve, electronLifeExecutionReview, electronLifeExecutionRevise, electronLifeExecutionRun, electronLifeExecutionStop, electronLifeExecutionStorage, electronLifeExecutionVerifiers, electronLifeExpressionReceipt, electronLifeFileRecovery, electronLifeGrowthRollback, electronLifeInputCommand, electronLifeInputPreview, electronLifeObligationCommand, electronLifeObligationHistory, electronLifeOutreachPolicy, electronLifePersonaCommand, electronLifePersonalProposalWithdraw, electronLifePolicyCommand, electronLifeProcedure, electronLifeProjectFeedback, electronLifeSurfaceSession, electronLifeView } from '../../../shared/life-events'
import { workGraphChangesSchema } from '../../../shared/work-graph-editing'
import { executionCriteriaSchema } from './execution/acceptance-compiler'
import { explicitWorkStepEditsSchema } from './execution/explicit-work-step-edits'
import { lifeBodyActivitySchema, recordLifeBodyActivity } from './life-body-activity-runtime'
import { discardLifeConversationPreferences, lifeRelationshipKey } from './life-conversation-preferences'
import { lifeExpressionReceiptSchema } from './life-expression-repository'
import { verifyLifeGoal } from './life-goal-verifier'
import { parseLifeGrowthSnapshot } from './life-growth-repository'
import { lifeObligationHistoryRequestSchema } from './life-history-query'
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
  storageCommand?: (input: import('../../../shared/execution-storage-contracts').ExecutionStorageCommand) => Promise<import('../../../shared/execution-storage-contracts').ExecutionStorageStatus>
  obligationHistory?: (input: import('../../../shared/life-history-contracts').LifeObligationHistoryRequest) => Promise<import('../../../shared/life-history-contracts').LifeObligationHistoryPage>
  verificationConfiguration?: (input: import('../../../shared/execution-verification-contracts').ExecutionVerifierCommand, surfaceId: number) => Promise<import('../../../shared/execution-verification-contracts').ExecutionVerifierState>
  fileRecoveryCommand?: (input: import('../../../shared/file-recovery-contracts').FileRecoveryCommand, surfaceId: number) => Promise<import('../../../shared/file-recovery-contracts').FileRecoveryResult>
  changeWorkCriteria?: (input: import('../../../shared/execution-contracts').ExecutionCriteriaChange) => Promise<{ state: string }>
  reobserveBrowserWork?: (input: { cardId: string, planId: string, expectedRevision: number, requestId: string }) => Promise<{ state: string }>
  authorizedBrowserCommand?: (input: import('../../../shared/authorized-browser-contracts').AuthorizedBrowserCommand) => Promise<import('../../../shared/authorized-browser-contracts').AuthorizedBrowserState>
  procedureCommand?: (input: import('../../../shared/procedure-contracts').ProcedureCommand) => Promise<import('../../../shared/procedure-contracts').ProcedureCommandResult>
  recoverEffect?: (input: import('../../../shared/execution-recovery-contracts').ExecutionRecoveryCommand, surfaceId: number) => Promise<import('../../../shared/execution-recovery-contracts').ExecutionRecoveryResult>
  withUserCommand?: <T>(cardId: string, task: () => Promise<T>) => Promise<T>
  reviseWork?: (input: { cardId: string, planId: string, expectedRevision: number, stepId: string, changes: Record<string, string>, requestId: string }) => Promise<{ state: string }>
  saveWorkPlan?: (input: { cardId: string, plan: import('../../../shared/execution-contracts').WorkPlan, expectedRevision: number, requestId: string }) => Promise<LifeCommitReceipt>
  startWorkPlan?: (input: { cardId: string, planId: string, expectedRevision: number, requestId: string }) => Promise<{ state: string }>
  stopWorkPlan?: (input: { cardId: string, planId: string, expectedRevision: number, requestId: string, action: 'pause' | 'cancel' }) => Promise<{ state: string }>
  reviewWork?: (input: { cardId: string, obligationId: string, expectedGeneration: number, contractHash: string, criterionId: string, approved: boolean, requestId: string }) => Promise<{ state: string }>
  openArtifact?: (path: string) => Promise<string>
  verificationInputs?: (view: LifeStateView, goal: import('../../../shared/life-contracts').LifeObligation) => Pick<Parameters<typeof verifyLifeGoal>[0], 'readReview' | 'readDownload' | 'readFileMatch'>
  refreshExecutionOutcome?: (input: { cardId: string, obligationId: string }) => Promise<void>
  downloadArtifact?: (input: { cardId: string, obligationId: string, expectedGeneration: number, criterionId: string }) => Promise<string>
  register: (event: unknown, handler: (payload: unknown, metadata: InvokeMetadata) => Promise<unknown>) => void
  withCardScope: <T>(cardId: string, task: () => Promise<T>, options?: { lane: 'foreground' | 'background', label: string, skipQueueWhenScopeAlreadyActive?: boolean }) => Promise<T>
  readClosure: (turnId: string) => Promise<import('../../../shared/life-closure-contracts').LifeClosureRecord>
  read: (scope?: import('../../../shared/life-contracts').LifeStateReadScope) => Promise<LifeStateView>
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
  const userCommand = options.withUserCommand ?? (<T>(cardId: string, task: () => Promise<T>) => options.withCardScope(cardId, task, { lane: 'foreground', label: 'execution-user-control' }))
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
  options.register(electronLifeExecutionStorage, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, action: v.picklist(['inspect', 'clear-cache']) }), raw)
    if (!options.storageCommand)
      throw new Error('Storage maintenance is unavailable')
    if (input.action === 'inspect')
      return options.withCardScope(input.cardId, () => options.storageCommand!(input), { lane: 'background', label: 'execution-storage-status', skipQueueWhenScopeAlreadyActive: true })
    return userCommand(input.cardId, () => options.storageCommand!(input))
  })
  options.register(electronLifeFileRecovery, async (raw, metadata) => {
    const surface = sender(metadata)
    const versionId = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
    const input = v.parse(v.variant('action', [
      v.strictObject({ cardId: id, action: v.literal('list'), afterId: v.optional(id) }),
      v.strictObject({ cardId: id, action: v.literal('preview'), versionId }),
      v.strictObject({ cardId: id, action: v.literal('preview-forget'), versionId }),
      v.strictObject({ cardId: id, action: v.literal('restore'), versionId, token: v.pipe(v.string(), v.uuid()), confirmed: v.literal(true) }),
      v.strictObject({ cardId: id, action: v.literal('forget'), versionId, token: v.pipe(v.string(), v.uuid()), confirmed: v.literal(true) }),
      v.strictObject({ cardId: id, action: v.literal('stop'), effectId: v.pipe(v.string(), v.regex(/^file-restore:[a-f\d-]{36}$/u)) }),
    ]), raw)
    if (!options.fileRecoveryCommand)
      throw new Error('File recovery governance is unavailable')
    // A held restoration owns the foreground scope. Stop must reach it without
    // queuing behind that same operation; main validates its current card.
    if (input.action === 'stop')
      return options.fileRecoveryCommand(input, surface.id)
    if (input.action === 'list')
      return options.withCardScope(input.cardId, () => options.fileRecoveryCommand!(input, surface.id), { lane: 'background', label: 'file-recovery-list', skipQueueWhenScopeAlreadyActive: true })
    return userCommand(input.cardId, () => options.fileRecoveryCommand!(input, surface.id))
  })
  options.register(electronLifeAuthorizedBrowser, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.variant('action', [
      v.strictObject({ cardId: id, action: v.picklist(['status', 'revoke', 'takeover', 'managed']) }),
      v.strictObject({ cardId: id, action: v.literal('inspect'), endpoint: v.pipe(v.string(), v.maxLength(128)) }),
      v.strictObject({ cardId: id, action: v.literal('grant'), inspectionId: v.pipe(v.string(), v.uuid()), tabId: id, origins: v.pipe(v.array(v.pipe(v.string(), v.maxLength(2048))), v.minLength(1), v.maxLength(8)) }),
      v.strictObject({ cardId: id, action: v.literal('confirm-closed'), confirmedClosed: v.literal(true) }),
    ]), raw)
    if (!options.authorizedBrowserCommand)
      throw new Error('Authorized browser access is unavailable')
    // Host revocation must reach a blocked browser operation immediately.
    // The manager itself checks the active card before every asynchronous step.
    return options.authorizedBrowserCommand(input)
  })
  options.register(electronLifeExecutionReobserve, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, planId: id, expectedRevision: version, requestId: id }), raw)
    if (!options.reobserveBrowserWork)
      throw new Error('Browser work reconnection is unavailable')
    return userCommand(input.cardId, () => options.reobserveBrowserWork!(input))
  })
  options.register(electronLifeProcedure, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.variant('action', [
      v.strictObject({ cardId: id, action: v.literal('list') }),
      v.strictObject({ cardId: id, action: v.literal('cancel-evaluation') }),
      v.strictObject({ cardId: id, action: v.literal('evaluate'), candidateId: id }),
      v.strictObject({ cardId: id, action: v.picklist(['activate', 'revoke', 'rollback']), id, version: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)) }),
    ]), raw)
    if (!options.procedureCommand)
      throw new Error('Learned procedure governance is unavailable')
    if (input.action === 'cancel-evaluation')
      return options.procedureCommand(input)
    if (input.action === 'list')
      return options.withCardScope(input.cardId, () => options.procedureCommand!(input), { lane: 'foreground', label: 'procedure-list', skipQueueWhenScopeAlreadyActive: true })
    return userCommand(input.cardId, () => options.procedureCommand!(input))
  })
  options.register(electronLifeExecutionRecovery, async (raw, metadata) => {
    const surface = sender(metadata)
    const shape = { cardId: id, effectId: id }
    const input = v.parse(v.variant('action', [v.strictObject({ cardId: id, action: v.literal('list-downloads'), afterId: v.optional(id) }), v.strictObject({ ...shape, action: v.literal('preview') }), v.strictObject({ ...shape, action: v.literal('recheck') }), v.strictObject({ ...shape, action: v.literal('takeover'), token: v.pipe(v.string(), v.uuid()), confirmedStopped: v.literal(true) })]), raw)
    if (!options.recoverEffect)
      throw new Error('Execution recovery governance is unavailable')
    if (input.action === 'list-downloads')
      return options.withCardScope(input.cardId, () => options.recoverEffect!(input, surface.id), { lane: 'background', label: 'download-resource-list' })
    return userCommand(input.cardId, () => options.recoverEffect!(input, surface.id))
  })
  options.register(electronLifeBackupCommand, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(lifeBackupCommandSchema, raw)
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
    return options.withCardScope(scope.cardId, options.read, { lane: 'foreground', label: 'life-view-snapshot', skipQueueWhenScopeAlreadyActive: true })
  })
  options.register(electronLifeObligationHistory, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(lifeObligationHistoryRequestSchema, raw)
    if (!options.obligationHistory)
      throw new Error('History pagination is unavailable')
    return options.withCardScope(input.cardId, () => options.obligationHistory!(input), { lane: 'background', label: 'life-obligation-history', skipQueueWhenScopeAlreadyActive: true })
  })
  options.register(electronLifeExecutionVerifiers, async (raw, metadata) => {
    const surface = sender(metadata)
    const input = v.parse(v.variant('action', [
      v.strictObject({ cardId: id, action: v.literal('list') }),
      v.strictObject({ cardId: id, action: v.literal('preview'), registry: v.pipe(v.string(), v.minLength(1), v.maxLength(131_072)) }),
      v.strictObject({ cardId: id, action: v.literal('apply'), token: v.pipe(v.string(), v.uuid()) }),
    ]), raw)
    if (!options.verificationConfiguration)
      throw new Error('Execution verification configuration is unavailable')
    if (input.action === 'list')
      return options.withCardScope(input.cardId, () => options.verificationConfiguration!(input, surface.id), { lane: 'background', label: 'execution-verifier-list', skipQueueWhenScopeAlreadyActive: true })
    return userCommand(input.cardId, () => options.verificationConfiguration!(input, surface.id))
  })
  options.register(electronLifeExecutionPlan, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, plan: v.record(v.string(), v.unknown()), expectedRevision: version, requestId: id }), raw)
    if (!options.saveWorkPlan)
      throw new Error('Execution plan governance is unavailable')
    return userCommand(input.cardId, () => options.saveWorkPlan!({ ...input, plan: input.plan as unknown as import('../../../shared/execution-contracts').WorkPlan }))
  })
  options.register(electronLifeExecutionRun, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, planId: id, expectedRevision: version, requestId: id }), raw)
    if (!options.startWorkPlan)
      throw new Error('Execution scheduling is unavailable')
    return userCommand(input.cardId, () => options.startWorkPlan!(input))
  })
  options.register(electronLifeExecutionStop, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, planId: id, expectedRevision: version, requestId: id, action: v.picklist(['pause', 'cancel']) }), raw)
    if (!options.stopWorkPlan)
      throw new Error('Execution stop governance is unavailable')
    return userCommand(input.cardId, () => options.stopWorkPlan!(input))
  })
  options.register(electronLifeProjectFeedback, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, goalId: id, generation: version, turnId: id, feedback: v.picklist(['positive', 'dismiss']), operationId: id }), raw)
    return options.withCardScope(input.cardId, () => recordExplicitPersonalProjectFeedback(options, input))
  })
  options.register(electronLifeExecutionRevise, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, planId: id, expectedRevision: version, stepId: id, changes: v.record(id, v.pipe(v.string(), v.maxLength(64000))), requestId: id }), raw)
    if (!options.reviseWork)
      throw new Error('Work revision is unavailable')
    return userCommand(input.cardId, () => options.reviseWork!(input))
  })
  options.register(electronLifeExecutionCriteriaChange, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, planId: id, expectedRevision: version, expectedGeneration: version, contractHash: id, criteria: executionCriteriaSchema, stepChanges: v.optional(explicitWorkStepEditsSchema), graphChanges: v.optional(workGraphChangesSchema), requestId: id }), raw)
    if (!options.changeWorkCriteria)
      throw new Error('Acceptance revision is unavailable')
    return userCommand(input.cardId, () => options.changeWorkCriteria!(input))
  })
  options.register(electronLifeExecutionReview, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, obligationId: id, expectedGeneration: version, contractHash: id, criterionId: id, approved: v.boolean(), requestId: id }), raw)
    if (!options.reviewWork)
      throw new Error('Work acceptance is unavailable')
    return userCommand(input.cardId, () => options.reviewWork!(input))
  })
  options.register(electronLifeExecutionArtifact, async (raw, metadata) => {
    sender(metadata)
    const input = v.parse(v.strictObject({ cardId: id, obligationId: id, expectedGeneration: version, criterionId: id }), raw)
    return userCommand(input.cardId, async () => {
      const view = await options.read({ obligationId: input.obligationId })
      const goal = view.obligations.find(item => item.id === input.obligationId && item.generation === input.expectedGeneration && !item.invalidatedBy)
      const artifact = goal?.proof.acceptance?.criteria.find(item => item.id === input.criterionId)?.predicate
      if (!artifact || !['file-bytes', 'file-matches-read', 'json-structure', 'text-content', 'browser-download'].includes(artifact.kind))
        throw new Error('The accepted artifact is no longer available')
      const path = artifact.kind === 'browser-download' ? await options.downloadArtifact?.(input) : 'path' in artifact ? artifact.path : undefined
      if (!path)
        throw new Error('The accepted artifact cannot be independently resolved')
      if (!['.txt', '.md', '.json', '.csv', '.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.pptx'].includes(extname(path).toLowerCase()))
        throw new Error('This artifact type needs an explicit application action')
      const error = await options.openArtifact?.(path)
      if (!options.openArtifact || error)
        throw new Error(error || 'The system could not open this artifact')
      return { state: 'open-requested' }
    })
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
      const view = await options.read({ obligationId: command.id })
      const obligation = view.obligations.find(item => item.id === command.id)
      if (!obligation || obligation.generation !== command.expectedGeneration || obligation.revision !== command.expectedRevision)
        throw new Error('Obligation changed; reload its current state')
      const fence = { id: obligation.id, expectedGeneration: obligation.generation, expectedRevision: obligation.revision }
      let receipt: LifeCommitReceipt
      if (command.action === 'verify' || command.action === 'report-completed') {
        if (command.action === 'report-completed' && obligation.proof.kind !== 'user-reported')
          throw new Error('This obligation requires independent verification')
        const verification = await verifyLifeGoal({ obligation, readSetting: options.readSetting, ...options.verificationInputs?.(view, obligation), userReported: command.action === 'report-completed' })
        receipt = await options.commit({ cardId: command.cardId, operationKey: `governance:${command.operationId}`, changes: [], mutations: [{ type: 'obligation-verify', ...fence, verification }] })
        await options.refreshExecutionOutcome?.({ cardId: command.cardId, obligationId: obligation.id })
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
