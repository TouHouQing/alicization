import type { AlicizationProviderMemoryEvidence } from '@proj-alicization/stage-shared'

import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type {
  AlicizationVisibleReplyPublicClosureSummary,
  AlicizationVisibleReplyPublicCriticSummary,
  AlicizationVisibleReplyRealizationArtifact,
} from '../visible-reply/facade'

import { createHash } from 'node:crypto'

import { normalizeAlicizationProviderMemoryEvidence } from '@proj-alicization/stage-shared'

export interface AlicizationRuntimeReplyArtifact {
  artifactVersion: 1
  visibleText: string
  fullText: string
  finishReason: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  realization: AlicizationVisibleReplyRealizationArtifact
  memoryEvidence?: AlicizationProviderMemoryEvidence | null
}

export interface AlicizationRuntimeReplyDeliveryIdentity {
  replyId: string
  deliveryId: string
  contentHash: string
  artifactHash: string
}

export interface AlicizationRuntimeReplyDeliveryIntent
  extends AlicizationRuntimeReplyDeliveryIdentity {
  artifact: AlicizationRuntimeReplyArtifact
}

interface ReplyScope {
  turnId: string
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function assertKnownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  const allowedKeys = new Set(allowed)
  const unknownKey = Object.keys(record).find(key => !allowedKeys.has(key))
  if (unknownKey)
    throw new TypeError(`${label} contains unknown field ${unknownKey}`)
}

function requiredText(value: unknown, label: string, preserve = false) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${label} must not be empty`)
  return preserve ? value : value.trim()
}

function nullableText(value: unknown, label: string) {
  if (value === null)
    return null
  return requiredText(value, label)
}

function requiredBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean')
    throw new TypeError(`${label} must be a boolean`)
  return value
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value))
    throw new TypeError(`${label} must be an array`)
  return value.map((item, index) => requiredText(item, `${label}[${index}]`))
}

function executionMode(value: unknown, label: string) {
  if (
    value !== 'provider-stream'
    && value !== 'provider-one-shot'
    && value !== 'local-fallback'
  ) {
    throw new TypeError(`${label} must be a known visible reply execution mode`)
  }
  return value
}

function executionAuthority(value: unknown, label: string) {
  if (
    value !== null
    && value !== 'llm-mind'
    && value !== 'local-deterministic-fallback'
    && value !== 'non-human-authored-blocked'
  ) {
    throw new TypeError(`${label} must be a known visible reply authority`)
  }
  return value
}

function criticStatus(
  value: unknown,
  label: string,
): AlicizationVisibleReplyPublicCriticSummary['status'] {
  if (value !== 'pass' && value !== 'blocked')
    throw new TypeError(`${label} must be pass or blocked`)
  return value
}

function parseCritic(
  value: unknown,
): AlicizationVisibleReplyPublicCriticSummary | null {
  if (value === null || value === undefined)
    return null
  const record = asRecord(value, 'reply artifact critic')
  assertKnownKeys(record, [
    'version',
    'status',
    'providerMindRequired',
    'reasonCodes',
  ], 'reply artifact critic')
  if (record.version !== 'visible-reply-critic-public-summary-v1')
    throw new TypeError('reply artifact critic version is unsupported')
  return {
    version: 'visible-reply-critic-public-summary-v1' as const,
    status: criticStatus(record.status, 'reply artifact critic status'),
    providerMindRequired: requiredBoolean(
      record.providerMindRequired,
      'reply artifact critic providerMindRequired',
    ),
    reasonCodes: stringArray(record.reasonCodes, 'reply artifact critic reasonCodes'),
  }
}

function parseClosure(
  value: unknown,
): AlicizationVisibleReplyPublicClosureSummary {
  const record = asRecord(value, 'reply artifact closure')
  assertKnownKeys(record, [
    'version',
    'status',
    'reasonCodes',
    'initialCriticStatus',
    'finalCriticStatus',
  ], 'reply artifact closure')
  if (record.version !== 'visible-reply-closure-public-summary-v1')
    throw new TypeError('reply artifact closure version is unsupported')
  if (record.status !== 'approved')
    throw new TypeError('reply artifact closure must be approved')
  const parseNullableCriticStatus = (raw: unknown, label: string) =>
    raw === null ? null : criticStatus(raw, label)
  return {
    version: 'visible-reply-closure-public-summary-v1' as const,
    status: 'approved' as const,
    reasonCodes: stringArray(record.reasonCodes, 'reply artifact closure reasonCodes'),
    initialCriticStatus: parseNullableCriticStatus(
      record.initialCriticStatus,
      'reply artifact closure initialCriticStatus',
    ),
    finalCriticStatus: parseNullableCriticStatus(
      record.finalCriticStatus,
      'reply artifact closure finalCriticStatus',
    ),
  }
}

function parseExecution(value: unknown): AlicizationVisibleReplyExecution {
  const record = asRecord(value, 'reply artifact visibleReplyExecution')
  assertKnownKeys(record, [
    'mode',
    'expectedVisibleReplyAuthority',
    'actualVisibleReplyAuthority',
    'providerMindExecuted',
    'reason',
  ], 'reply artifact visibleReplyExecution')
  if (
    record.expectedVisibleReplyAuthority !== null
    && record.expectedVisibleReplyAuthority !== 'llm-mind'
  ) {
    throw new TypeError(
      'reply artifact expectedVisibleReplyAuthority must be llm-mind or null',
    )
  }
  return {
    mode: executionMode(
      record.mode,
      'reply artifact visibleReplyExecution mode',
    ),
    expectedVisibleReplyAuthority: record.expectedVisibleReplyAuthority,
    actualVisibleReplyAuthority: executionAuthority(
      record.actualVisibleReplyAuthority,
      'reply artifact visibleReplyExecution actualVisibleReplyAuthority',
    ),
    providerMindExecuted: requiredBoolean(
      record.providerMindExecuted,
      'reply artifact visibleReplyExecution providerMindExecuted',
    ),
    reason: nullableText(
      record.reason,
      'reply artifact visibleReplyExecution reason',
    ),
  }
}

function parseRealization(value: unknown): AlicizationVisibleReplyRealizationArtifact {
  const record = asRecord(value, 'reply artifact realization')
  assertKnownKeys(record, [
    'version',
    'expectedAuthority',
    'actualAuthority',
    'providerMindExecuted',
    'mode',
    'visibleText',
    'visibleReplyValidationStatus',
    'nonHumanAuthoredStatus',
    'blockedReasons',
    'reason',
    'critic',
    'closure',
  ], 'reply artifact realization')
  if (record.version !== 'visible-reply-realization-v1')
    throw new TypeError('reply artifact realization version is unsupported')
  if (record.expectedAuthority !== 'llm-mind')
    throw new TypeError('reply artifact realization expectedAuthority must be llm-mind')
  if (record.visibleReplyValidationStatus !== 'approved')
    throw new TypeError('reply artifact realization must be approved')
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: executionAuthority(
      record.actualAuthority,
      'reply artifact realization actualAuthority',
    ),
    providerMindExecuted: requiredBoolean(
      record.providerMindExecuted,
      'reply artifact realization providerMindExecuted',
    ),
    mode: executionMode(record.mode, 'reply artifact realization mode'),
    visibleText: requiredText(
      record.visibleText,
      'reply artifact realization visibleText',
      true,
    ),
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: nullableText(
      record.nonHumanAuthoredStatus,
      'reply artifact realization nonHumanAuthoredStatus',
    ),
    blockedReasons: stringArray(
      record.blockedReasons,
      'reply artifact realization blockedReasons',
    ),
    reason: nullableText(record.reason, 'reply artifact realization reason'),
    critic: parseCritic(record.critic),
    closure: parseClosure(record.closure),
  }
}

function sha256(value: string) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`
}

export function parseAlicizationRuntimeReplyArtifact(
  value: unknown,
): AlicizationRuntimeReplyArtifact {
  const record = asRecord(value, 'runtime reply artifact')
  assertKnownKeys(record, [
    'artifactVersion',
    'visibleText',
    'fullText',
    'finishReason',
    'visibleReplyExecution',
    'realization',
    'memoryEvidence',
  ], 'runtime reply artifact')
  if (record.artifactVersion !== 1)
    throw new TypeError('runtime reply artifact version must be 1')

  const memoryEvidence = record.memoryEvidence === undefined || record.memoryEvidence === null
    ? null
    : normalizeAlicizationProviderMemoryEvidence(record.memoryEvidence)
  if (record.memoryEvidence !== undefined && record.memoryEvidence !== null && !memoryEvidence) {
    throw new TypeError('runtime reply artifact memoryEvidence is invalid')
  }

  const artifact: AlicizationRuntimeReplyArtifact = {
    artifactVersion: 1,
    visibleText: requiredText(
      record.visibleText,
      'runtime reply artifact visibleText',
      true,
    ),
    fullText: requiredText(
      record.fullText,
      'runtime reply artifact fullText',
      true,
    ),
    finishReason: requiredText(
      record.finishReason,
      'runtime reply artifact finishReason',
    ),
    visibleReplyExecution: parseExecution(record.visibleReplyExecution),
    realization: parseRealization(record.realization),
    memoryEvidence,
  }

  if (artifact.realization.visibleText !== artifact.visibleText) {
    throw new TypeError(
      'runtime reply artifact visibleText must match realization visibleText',
    )
  }
  if (
    artifact.realization.expectedAuthority
    !== artifact.visibleReplyExecution.expectedVisibleReplyAuthority
    || artifact.realization.mode !== artifact.visibleReplyExecution.mode
    || artifact.realization.actualAuthority
    !== artifact.visibleReplyExecution.actualVisibleReplyAuthority
    || artifact.realization.providerMindExecuted
    !== artifact.visibleReplyExecution.providerMindExecuted
    || artifact.realization.reason !== artifact.visibleReplyExecution.reason
  ) {
    throw new TypeError(
      'runtime reply artifact realization does not match visible reply execution',
    )
  }
  if (
    artifact.visibleReplyExecution.mode !== 'provider-stream'
    && artifact.visibleReplyExecution.mode !== 'provider-one-shot'
  ) {
    throw new TypeError(
      'runtime reply artifact mode must be a Provider execution mode',
    )
  }
  if (
    artifact.visibleReplyExecution.actualVisibleReplyAuthority !== 'llm-mind'
    || artifact.realization.actualAuthority !== 'llm-mind'
  ) {
    throw new TypeError(
      'runtime reply artifact authority must be llm-mind',
    )
  }
  if (
    artifact.visibleReplyExecution.providerMindExecuted !== true
    || artifact.realization.providerMindExecuted !== true
  ) {
    throw new TypeError(
      'runtime reply artifact requires an executed Provider mind',
    )
  }
  if (!artifact.realization.critic || artifact.realization.critic.status !== 'pass') {
    throw new TypeError(
      'runtime reply artifact critic must exist and pass',
    )
  }
  if (
    !artifact.realization.closure
    || artifact.realization.closure.finalCriticStatus !== 'pass'
  ) {
    throw new TypeError(
      'runtime reply artifact closure final critic must pass',
    )
  }
  if (artifact.realization.blockedReasons.length > 0) {
    throw new TypeError(
      'runtime reply artifact must not contain blocked reasons',
    )
  }
  if (artifact.realization.nonHumanAuthoredStatus !== null) {
    throw new TypeError(
      'runtime reply artifact non-human authored status must be null',
    )
  }
  return artifact
}

export function createAlicizationRuntimeReplyArtifact(
  input: AlicizationRuntimeReplyArtifact,
) {
  return parseAlicizationRuntimeReplyArtifact(input)
}

export function createAlicizationRuntimeReplyDeliveryIntent(
  scope: ReplyScope,
  deliveryOwner: 'inline' | 'callback',
  artifactInput: AlicizationRuntimeReplyArtifact,
): AlicizationRuntimeReplyDeliveryIntent {
  const turnId = requiredText(scope.turnId, 'runtime reply turnId')
  const artifact = parseAlicizationRuntimeReplyArtifact(artifactInput)
  return {
    replyId: `${turnId}:reply`,
    deliveryId: `${turnId}:delivery:${deliveryOwner}`,
    contentHash: sha256(artifact.visibleText),
    artifactHash: sha256(JSON.stringify(artifact)),
    artifact,
  }
}

export function parseAlicizationRuntimeReplyDeliveryIdentity(
  value: unknown,
): AlicizationRuntimeReplyDeliveryIdentity {
  const record = asRecord(value, 'runtime reply delivery identity')
  assertKnownKeys(record, [
    'replyId',
    'deliveryId',
    'contentHash',
    'artifactHash',
  ], 'runtime reply delivery identity')
  const identity = {
    replyId: requiredText(record.replyId, 'runtime reply delivery replyId'),
    deliveryId: requiredText(record.deliveryId, 'runtime reply delivery deliveryId'),
    contentHash: requiredText(
      record.contentHash,
      'runtime reply delivery contentHash',
    ),
    artifactHash: requiredText(
      record.artifactHash,
      'runtime reply delivery artifactHash',
    ),
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(identity.contentHash))
    throw new TypeError('runtime reply delivery contentHash must be a SHA-256 hash')
  if (!/^sha256:[0-9a-f]{64}$/.test(identity.artifactHash))
    throw new TypeError('runtime reply delivery artifactHash must be a SHA-256 hash')
  return identity
}

export function parseAlicizationRuntimeReplyDeliveryIntent(
  value: unknown,
): AlicizationRuntimeReplyDeliveryIntent {
  const record = asRecord(value, 'runtime reply delivery intent')
  assertKnownKeys(record, [
    'replyId',
    'deliveryId',
    'contentHash',
    'artifactHash',
    'artifact',
  ], 'runtime reply delivery intent')
  const identity = parseAlicizationRuntimeReplyDeliveryIdentity({
    replyId: record.replyId,
    deliveryId: record.deliveryId,
    contentHash: record.contentHash,
    artifactHash: record.artifactHash,
  })
  const artifact = parseAlicizationRuntimeReplyArtifact(record.artifact)
  if (identity.contentHash !== sha256(artifact.visibleText))
    throw new TypeError('runtime reply delivery contentHash does not match visibleText')
  if (identity.artifactHash !== sha256(JSON.stringify(artifact)))
    throw new TypeError('runtime reply delivery artifactHash does not match artifact')
  return {
    ...identity,
    artifact,
  }
}

export function assertAlicizationRuntimeReplyDeliveryScope(
  scope: ReplyScope,
  deliveryOwner: 'inline' | 'callback',
  identity: AlicizationRuntimeReplyDeliveryIdentity,
) {
  const turnId = requiredText(scope.turnId, 'runtime reply turnId')
  if (
    identity.replyId !== `${turnId}:reply`
    || identity.deliveryId !== `${turnId}:delivery:${deliveryOwner}`
  ) {
    throw new TypeError(
      'runtime reply delivery identity does not match the turn delivery owner',
    )
  }
}
