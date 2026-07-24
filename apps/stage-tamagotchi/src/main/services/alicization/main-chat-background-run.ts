import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
} from './runtime-soul'
import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'
import type { AlicizationResolvedVisibleReply } from './visible-reply/facade'

import { createAlicizationProviderVisibleArtifact } from '@proj-alicization/stage-shared'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationMinimalContextRecoveryMessages,
  buildAlicizationRequiredToolFactsSystemMessage,
  readAlicizationInlineExecutionReceipt,
} from './main-chat-background-rules'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { isAlicizationRequiredToolMissingError } from './main-chat-required-tool'
import {
  recoverAlicizationRequiredToolDeterministically,
  resolveDeterministicRequiredToolNames,
} from './main-chat-required-tool-recovery'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {
  mainChatFirstEventTimeoutMs,
  mainChatFirstEventTimeoutWithVisualGroundingMs,
  normalizeCardId,
  sanitizeText,
} from './runtime-soul'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import {
  AlicizationVisibleReplySettlementBlockedError,
  resolveAlicizationPreparedVisibleReplyExecution,
  settleAlicizationVisibleReply,
} from './visible-reply/facade'
import { validateAlicizationProviderSettlementPayload } from './visible-reply/settlement'

type AlicizationRuntimeEmotionalKernelShape = NonNullable<AlicizationRuntimeDigest['emotionalKernel']>

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readEmotionalKernelSnapshot(raw: unknown): AlicizationRuntimeEmotionalKernelShape | null {
  const candidate = readRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !sanitizeText(candidate.dominantEmotion, '')
    || !sanitizeText(candidate.initiativeMode, '')
    || !sanitizeText(candidate.memoryRecallMode, '')
    || !sanitizeText(candidate.embodimentTone, '')
  ) {
    return null
  }
  return candidate as unknown as AlicizationRuntimeEmotionalKernelShape
}

export const mainChatBackgroundRunTestInternals = {
  buildPreparedRuntimeDigestFallback,
  buildPreparedProjectStateClosureSnapshot,
}

type AlicizationBackgroundFinishPayload = Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>

interface AlicizationMainChatRunStateFacade {
  setSessionTraceGetter: (key: string, getter: () => AlicizationRuntimeCallChainSnapshot) => void
  finishRun: (key: string, payload: AlicizationBackgroundFinishPayload) => void
}

interface RunAlicizationMainChatBackgroundOptions {
  key: string
  payload: AlicizationChatStartPayload
  activeCardId: string
  mainGateway: MainGatewayResolvedConfig
  runState: ChatRunState
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  headers?: Record<string, string>
  isRunActive: () => boolean
  runStateController: AlicizationMainChatRunStateFacade
  emitMeta: (payload: AlicizationChatMetaEvent) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallEvent) => void
  emitToolResult: (payload: AlicizationChatToolResultEvent) => void
  emitError: (payload: AlicizationChatErrorEvent) => void
  incrementChunkStats: (rawDelta: string) => void
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig, options?: {
    bypassCache?: boolean
  }) => Promise<AlicizationMainGatewayReachabilitySnapshot>
  recordMainGatewayGenerationTimeout: (mainGateway: MainGatewayResolvedConfig, reason: unknown) => void | Promise<void>
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  queueScopedAuditLog: (cardId: string, input: {
    level: 'warning' | 'notice'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }) => Promise<void> | void
  recordPreparedMindTrace?: (input: {
    payload: AlicizationChatStartPayload
    prepared: AlicizationPreparedMainChatExecutionResult
  }) => Promise<void> | void
  suppressInlineExecutionDeliveries?: (input: {
    cardId: string
    entries: Array<{
      completedAt: number
      sessionId: string
      threadId: string
    }>
  }) => Promise<void> | void
}

function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: (runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
    preparedRuntimeSurface: (runtimeSurface?.digitalLifeRuntimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
  }) as AlicizationDigitalLifeRuntimeSurface | null
}

function resolvePreparedRuntimeEmotionalKernel(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationRuntimeEmotionalKernelShape | null {
  return readEmotionalKernelSnapshot(runtimeSurface?.memory?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.raw?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.cognition?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.dialogue?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.visualPresenceState?.emotionalKernel)
}

function resolvePreparedMainChatOneShotEmotionalKernel(
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined,
): AlicizationRuntimeEmotionalKernelShape | null {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeSurface = preferredRuntimeSurface ?? prepared?.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  return resolvePreparedRuntimeEmotionalKernel(runtimeSurface)
}

function buildPreparedRuntimeDigestFallback(prepared: AlicizationPreparedMainChatExecutionResult | null): AlicizationRuntimeDigest | null {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeSurface = preferredRuntimeSurface ?? prepared?.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const emotionalKernel = resolvePreparedRuntimeEmotionalKernel(runtimeSurface)

  if (!emotionalKernel)
    return null

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: 'dialogue',
    activeLoop: null,
    autonomy: null,
    projectState: null,
    emotionalKernel,
    currentConsciousFrame: null,
    continuityRestraint: null,
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    continuityPressure: 0,
    companionshipPressure: 0,
    rulingMotive: null,
    habitMode: null,
    truthDisciplinePressure: null,
    boundaryPressure: null,
    restProtectionPressure: null,
    returnPressure: null,
    channels: [{
      id: 'dialogue',
      state: 'idle',
      readiness: 0,
      focus: null,
      summary: '',
    }],
    summary: '',
  }
}

function buildPreparedProjectStateClosureSnapshot(_prepared: AlicizationPreparedMainChatExecutionResult | null) {
  return {
    projectStateClosureSummary: null,
    projectStateIdentity: null,
    projectStatePhase: null,
    projectStateSameHerSelfLine: null,
    projectStateLatestLandedProgress: null,
    projectStatePrimaryOpenLoop: null,
    projectStateNextClosureTarget: null,
    projectStatePreflightSummary: null,
    projectStatePreDialogueAwarenessLine: null,
    projectStateAwarenessLine: null,
    projectStateCompanionBriefingLine: null,
    projectStatePreDialogueAwarenessSummary: null,
    projectStateContinuityPreferredTiming: null,
  }
}

export function resolveAlicizationExecutionPayoffContinuityInputs(input: {
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined
}) {
  const continuityRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.runtimeSurface)
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: continuityRuntimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: continuityRuntimeSurface?.memory?.personStateProjection ?? null,
  })
  const hostPersonModel = continuityRuntimeSurface?.memory?.hostPersonModel ?? null
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  let selfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  ?? projectedSelfContinuityAuthority
  if (!selfContinuityAuthority) {
    try {
      selfContinuityAuthority = buildSelfContinuityAuthorityFromRuntimeSurface(continuityRuntimeSurface)
    }
    catch {
      selfContinuityAuthority = null
    }
  }
  return {
    personStateProjection,
    hostPersonModel,
    selfContinuityAuthority,
  }
}

function assertProviderBackgroundExecution(
  execution: AlicizationVisibleReplyExecution,
) {
  if (
    execution.providerMindExecuted === true
    && execution.actualVisibleReplyAuthority === 'llm-mind'
  ) {
    return
  }

  throw new AlicizationVisibleReplySettlementBlockedError(
    'provider-visible-reply-authority-invalid',
    null,
  )
}

function readBackgroundVisibleReplyCritic(raw: unknown) {
  const candidate = readRecord(raw)
  const status = candidate?.status === 'pass'
    ? 'pass' as const
    : candidate?.status === 'blocked'
      ? 'blocked' as const
      : null
  if (!candidate || !status)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1' as const,
    status,
    providerMindRequired: candidate.providerMindRequired === true,
    reasonCodes: Array.isArray(candidate.reasonCodes)
      ? candidate.reasonCodes.filter((reason): reason is string => typeof reason === 'string')
      : [],
  }
}

function readBackgroundVisibleReplyClosure(raw: unknown) {
  const candidate = readRecord(raw)
  const status = candidate?.status === 'approved'
    ? 'approved' as const
    : candidate?.status === 'blocked'
      ? 'blocked' as const
      : null
  if (!candidate || !status)
    return null
  const normalizeCriticStatus = (value: unknown) =>
    value === 'pass'
      ? 'pass' as const
      : value === 'blocked'
        ? 'blocked' as const
        : null

  return {
    version: 'visible-reply-closure-public-summary-v1' as const,
    status,
    reasonCodes: Array.isArray(candidate.reasonCodes)
      ? candidate.reasonCodes.filter((reason): reason is string => typeof reason === 'string')
      : [],
    initialCriticStatus: normalizeCriticStatus(candidate.initialCriticStatus),
    finalCriticStatus: normalizeCriticStatus(candidate.finalCriticStatus),
  }
}

function resolveBackgroundVisibleReplyRealization(input: {
  candidate: unknown
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}): AlicizationResolvedVisibleReply['realization'] {
  const candidate = readRecord(input.candidate)

  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: input.visibleText,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    emotionalClosureAudit: null,
    selfAuthorityAudit: null,
    reason: input.visibleReplyExecution.reason,
    critic: readBackgroundVisibleReplyCritic(candidate?.critic),
    closure: readBackgroundVisibleReplyClosure(candidate?.closure),
  }
}

function readProviderReplyFromRawFullText(fullText: string) {
  const parsed = parseJsonObjectFromText(fullText)
  return typeof parsed?.reply === 'string'
    ? parsed.reply
    : ''
}

export async function runAlicizationMainChatBackground(
  input: RunAlicizationMainChatBackgroundOptions,
) {
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let streamMetaEmitter: ReturnType<typeof createAlicizationChatStreamMetaEmitter> | null = null
  const nonProgressEventTypes = new Set<string>()

  const emitFailure = async (error: unknown) => {
    await handleAlicizationMainChatRunFailure({
      error,
      prepared,
      controller: input.runState.controller,
      mainGateway: input.mainGateway,
      payload: input.payload,
      dispatchBound: input.runState.hasLoggedDispatchBinding === true,
      nonProgressEventTypes,
      recordMainGatewayGenerationTimeout: input.recordMainGatewayGenerationTimeout,
      emitError: (reason, metadata) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
          ...metadata,
        })
      },
      finish: (finishPayload) => {
        input.runStateController.finishRun(input.key, {
          ...finishPayload,
          visibleReplyCritic: null,
          visibleReplyClosure: null,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
    })
  }

  try {
    prepared = await input.preparationPromise
    if (!input.isRunActive())
      return

    input.runStateController.setSessionTraceGetter(input.key, prepared.getSessionTrace)
    const normalizedPayload = input.payload
    let currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared,
    })
    streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      getGovernance: () => prepared?.governance ?? null,
      getThought: () => null,
      getVisibleReplyExecution: () => currentVisibleReplyExecution,
      getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(prepared?.runtimeSurface?.digitalLifeSpine ?? null),
      getRuntimeDigest: () => buildPreparedRuntimeDigestFallback(prepared),
      getResidentPerformance: () => null,
      getPerformanceManifest: () => prepared?.performanceManifest ?? null,
      getExplicitPerformance: () => null,
      emit: input.emitMeta,
    })

    try {
      await Promise.resolve(input.recordPreparedMindTrace?.({
        payload: normalizedPayload,
        prepared,
      }))
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.prepared-mind-trace-failed', {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const settleStructuredVisibleReply = async (settlementInput: {
      fullText: string
      visibleReplyExecution: AlicizationVisibleReplyExecution
    }) => {
      const settled = await settleAlicizationVisibleReply({
        draft: {
          fullText: settlementInput.fullText,
          visibleReplyExecution: settlementInput.visibleReplyExecution,
        },
        prepared: prepared!,
        requireProviderMemoryUsage: true,
        appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      })
      return {
        fullText: settlementInput.fullText,
        visibleReplyExecution: settlementInput.visibleReplyExecution,
        critic: settled.closureResult.critic,
        closure: settled.closureResult.closure,
        visibleReplyRealization: settled.realization,
      }
    }

    const firstEventTimeoutMs = prepared.hasVisualGrounding
      ? mainChatFirstEventTimeoutWithVisualGroundingMs
      : mainChatFirstEventTimeoutMs
    const streamResult = await runAlicizationMainChatStream({
      payload: input.payload,
      prepared,
      headers: input.headers,
      controller: input.runState.controller,
      firstEventTimeoutMs,
      isRunActive: input.isRunActive,
      nonProgressEventTypes,
      streamMeta: streamMetaEmitter,
      incrementChunkStats: input.incrementChunkStats,
      emitChunk: input.emitChunk,
      emitToolCall: input.emitToolCall,
      emitToolResult: input.emitToolResult,
      generateNonStreaming: async (oneShotInput) => {
        await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-started', {
          cardId: normalizeCardId(oneShotInput.cardId ?? input.activeCardId),
          turnId: sanitizeText(oneShotInput.turnId),
          timeoutMs: oneShotInput.timeoutMs,
        })
        return await generateAlicizationMainChatNonStreaming({
          ...oneShotInput,
          emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
        })
      },
      logReminderToolCall: async ({ toolCallId, toolName, argumentsPreview }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-call', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          toolName,
          argumentsPreview,
        })
      },
      logReminderToolResult: async ({ toolCallId, summary }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-result', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          ...summary,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      turnRuntimeContext: prepared.turnRuntimeContext ?? null,
    })

    currentVisibleReplyExecution = streamResult.visibleReplyExecution
    assertProviderBackgroundExecution(currentVisibleReplyExecution)
    const visibleReplyRealization = resolveBackgroundVisibleReplyRealization({
      candidate: streamResult.visibleReplyRealization,
      visibleText: readProviderReplyFromRawFullText(streamResult.fullText),
      visibleReplyExecution: currentVisibleReplyExecution,
    })

    // Final success boundary: nothing may rewrite fullText after this validation.
    const finalValidation = validateAlicizationProviderSettlementPayload({
      fullText: streamResult.fullText,
      prepared,
    })
    if (!finalValidation.valid || !finalValidation.payload) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        `provider-settlement-invalid:${finalValidation.issues.join(',')}`,
        null,
      )
    }

    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      origin: streamResult.origin,
      learningPolicy: streamResult.learningPolicy,
      failureSurface: streamResult.failureSurface,
      memoryFailures: prepared.memoryFailures,
      fullText: streamResult.fullText,
      visibleReplyExecution: currentVisibleReplyExecution,
      visibleReplyRealization,
      visibleReplyCritic: visibleReplyRealization.critic as AlicizationChatFinishEvent['visibleReplyCritic'],
      visibleReplyClosure: visibleReplyRealization.closure as AlicizationChatFinishEvent['visibleReplyClosure'],
    })
  }
  catch (error) {
    let failureError: unknown = error
    if (
      prepared
      && input.isRunActive()
      && isAlicizationRequiredToolMissingError(error)
    ) {
      try {
        const requiredToolNames = resolveDeterministicRequiredToolNames({
          error,
          fallbackToolNames: prepared.runtimeSurface?.tooling?.enforcedToolNames,
        })
        if (!Array.isArray(prepared.tools) || prepared.tools.length === 0 || requiredToolNames.length === 0)
          throw error

        const recoveryResult = await recoverAlicizationRequiredToolDeterministically({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          messages: prepared.messages,
          tools: prepared.tools as never,
          requiredToolNames,
          toolInputOverrides: prepared.executionToolInputOverrides as Record<string, Record<string, unknown>> | undefined,
          emitToolCall: input.emitToolCall,
          emitToolResult: input.emitToolResult,
        })
        const payoffResult = await generateAlicizationMainChatNonStreaming({
          chatConfig: prepared.chatConfig,
          headers: input.headers,
          emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
          messages: [
            ...buildAlicizationMinimalContextRecoveryMessages(prepared.messages),
            buildAlicizationRequiredToolFactsSystemMessage({
              toolName: recoveryResult.toolName,
              toolInput: recoveryResult.toolInput,
              toolResult: recoveryResult.toolResult,
              executionFact: recoveryResult.executionFact,
            }),
          ],
          timeoutMs: 9_000,
        })
        const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'required-tool-provider-payoff',
        })
        const settled = await settleAlicizationVisibleReply({
          draft: {
            fullText: payoffResult.fullText,
            visibleReplyExecution,
          },
          prepared,
          requireProviderMemoryUsage: true,
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        })
        const providerArtifact = createAlicizationProviderVisibleArtifact({
          reply: settled.visibleText,
          memoryUsage: validateAlicizationProviderSettlementPayload({
            fullText: payoffResult.fullText,
            prepared,
          }).memoryUsage!,
        })
        input.incrementChunkStats(settled.visibleText)
        input.emitChunk({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          text: settled.visibleText,
          origin: providerArtifact.origin,
          learningPolicy: {
            allowLongTermCondensation: providerArtifact.allowLongTermCondensation,
            allowPersonaLearning: providerArtifact.allowPersonaLearning,
            allowTraining: providerArtifact.allowTraining,
          },
          failureSurface: null,
        })
        streamMetaEmitter?.emit(settled.visibleText, { force: true })

        const receipt = readAlicizationInlineExecutionReceipt(recoveryResult.toolResult)
        if (receipt) {
          await Promise.resolve(input.suppressInlineExecutionDeliveries?.({
            cardId: input.payload.cardId,
            entries: [{
              completedAt: receipt.completedAt,
              sessionId: receipt.sessionId,
              threadId: receipt.threadId,
            }],
          }))
        }

        // Required-tool payoff uses the same final raw-contract boundary.
        const finalValidation = validateAlicizationProviderSettlementPayload({
          fullText: payoffResult.fullText,
          prepared,
        })
        if (!finalValidation.valid || !finalValidation.payload) {
          throw new AlicizationVisibleReplySettlementBlockedError(
            `provider-settlement-invalid:${finalValidation.issues.join(',')}`,
            null,
          )
        }

        input.runStateController.finishRun(input.key, {
          status: 'completed',
          finishReason: 'required-tool-recovered',
          origin: providerArtifact.origin,
          learningPolicy: {
            allowLongTermCondensation: providerArtifact.allowLongTermCondensation,
            allowPersonaLearning: providerArtifact.allowPersonaLearning,
            allowTraining: providerArtifact.allowTraining,
          },
          failureSurface: null,
          memoryFailures: prepared.memoryFailures,
          fullText: payoffResult.fullText,
          visibleReplyExecution,
          visibleReplyRealization: settled.realization,
          visibleReplyCritic: settled.realization.critic as AlicizationChatFinishEvent['visibleReplyCritic'],
          visibleReplyClosure: settled.realization.closure as AlicizationChatFinishEvent['visibleReplyClosure'],
        })
        return
      }
      catch (recoveryError) {
        failureError = recoveryError
        await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        })
      }
    }

    await emitFailure(failureError)
  }
}
