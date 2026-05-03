import type { CommonContentPart, Message } from '@xsai/shared-chat'

import type {
  AlicizationAuditLogInput,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput, AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutionCallbackContext } from './execution-callback-runtime'
import type {
  DesktopCaptureAccessResult,
  MainGatewayResolvedConfig,
  ResolvedCardCustomDirectives,
  ScreenSemanticCacheState,
} from './runtime-soul'
import type { deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot } from './sensory-capture'

import { errorMessageFrom } from '@moeru/std'
import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'

import { getActiveAttentionAnchor } from './attention-anchor'
import { buildAlicizationDigitalLifeArchitectureSystemBlock } from './digital-life-architecture'
import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'
import { emptyAlicizationExecutionCallbackContext } from './execution-callback-runtime'
import { buildCardCustomDirectivesSystemBlock } from './main-chat-runtime-surface'
import { createAbortError } from './main-chat-stream-primitives'
import { parseScreenSemanticSummary, pickScreenSemanticCaptureCandidate } from './proactive-screen-semantic'
import { buildCompressedNativeImageDataUrl, readStringValue } from './runtime-governance'
import { sanitizeBriefText } from './runtime-realtime'
import {
  normalizeCardId,
  proactiveScreenSemanticCacheTtlMs,
  proactiveScreenSemanticFailureTtlMs,
  proactiveScreenSemanticImageJpegQuality,
  proactiveScreenSemanticImageMaxHeight,
  proactiveScreenSemanticImageMaxWidth,
  proactiveScreenSemanticTimeoutMs,
  sanitizeMultilineText,
  sanitizeText,
} from './runtime-soul'

interface MainGatewayOneShotGenerateTextOptions {
  system: string
  user: Message['content']
  timeoutMs?: number
  source?: 'execution-callback' | 'reminder' | 'proactive' | 'dream' | 'screen-semantic' | 'scene-appraisal' | 'subjective-inference' | 'counterfactual-deliberation' | 'dialogue-turn-semantics'
  cardId?: string
  extraSystemBlocks?: string[]
  injectCustomDirectives?: boolean
  injectPerformanceManifest?: boolean
  agentTurn?: AlicizationAgentTurnRuntime | null
  agentTurnInput?: {
    turnId: string
    decisionTraceId?: string | null
  }
  captureAgentSensorySnapshot?: boolean
  digitalLifeRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}

interface CreateAlicizationMainGatewayOneShotRuntimeOptions {
  getActiveCardId: () => string
  getActiveProviderId: () => string
  getActiveModelId: () => string
  openAgentTurn: (input: {
    cardId: string
    turnId: string
    decisionTraceId?: string | null
  }) => Promise<AlicizationAgentTurnRuntime>
  resolveMainGatewayConfig: (input?: {
    cardId?: string
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }) => MainGatewayResolvedConfig | null
  rememberMainGatewayRoute: (input: {
    cardId?: string
    mainGateway: Pick<MainGatewayResolvedConfig, 'providerId' | 'model'>
    providerConfig?: Record<string, unknown>
  }) => void
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  resolveCardCustomDirectives: (cardId: string, options?: { messages?: Message[] }) => Promise<ResolvedCardCustomDirectives>
  buildPendingExecutionCallbackContext: (input: {
    sessionId: string
  }) => Promise<AlicizationExecutionCallbackContext>
  resolveAgentSessionContinuityContext: (cardId: string, options: {
    digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  }) => Promise<{ digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null, sessionContinuitySignals: AlicizationAgentSessionContinuityInput[] }>
  getPerformanceManifest: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  buildPerformanceManifestSystemBlocks: (manifest: CharacterPerformanceCapabilitiesManifest | null) => string[]
  buildAgentTurnContinuitySystemMessages: (input: {
    agentTurn: AlicizationAgentTurnRuntime
    cardId: string
  }) => Message[]
  syncAgentTurnSessionMirror: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string
    source: string
  }) => void
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  describePerceptionTarget: (target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) => string
  buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => string
  screenSemanticCacheByCard: Map<string, ScreenSemanticCacheState>
  ensurePerceptionState: (cardIdRaw: unknown) => Promise<AlicizationPerceptionState>
  getUsablePerceptionSceneResidue: (input: {
    state: AlicizationPerceptionState
    now: number
    maxAgeMs: number
  }) => AlicizationPerceptionSceneResidue | null
  buildScreenSemanticSummaryFromResidue: (residue: AlicizationPerceptionSceneResidue) => import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
  resolveDesktopCaptureAccess: (input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: { width: number, height: number }
  }) => Promise<DesktopCaptureAccessResult>
  getDesktopCaptureAccessRuntimeSnapshot: (input: {
    types: Array<'window' | 'screen'>
    thumbnailSize: { width: number, height: number }
  }) => ReturnType<typeof deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot> | null
  rememberSceneResidue: (input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) => Promise<AlicizationPerceptionState>
}

export function createAlicizationMainGatewayOneShotRuntime(options: CreateAlicizationMainGatewayOneShotRuntimeOptions) {
  function buildKnowledgeEvidenceSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
    const knowledgeEvidence = surface?.memory.knowledgeEvidence ?? null
    if (!knowledgeEvidence)
      return ''
    return [
      '[ALICIZATION_KNOWLEDGE_EVIDENCE]',
      `validation_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.validationCount ?? 0)))}`,
      `contradiction_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionCount ?? 0)))}`,
      `strongly_validated_procedure_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.stronglyValidatedProcedureCount ?? 0)))}`,
      `contradiction_heavy_fact_count=${Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionHeavyFactCount ?? 0)))}`,
      'Treat higher contradiction pressure as a cue to keep remembered detail compressed, approximate, or latent.',
      'Treat stronger validated procedure count as a cue that remembered procedure carry is safer than brittle remembered wording.',
    ].join('\n')
  }

  function buildSelfEvolutionSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
    const selfEvolution = surface?.memory.selfEvolution ?? null
    if (!selfEvolution)
      return ''
    return [
      '[ALICIZATION_SELF_EVOLUTION]',
      selfEvolution.summary ? `summary=${selfEvolution.summary}` : '',
      selfEvolution.dominantTrajectory ? `dominant_trajectory=${selfEvolution.dominantTrajectory}` : '',
      selfEvolution.relationshipDoctrine ? `relationship_doctrine=${selfEvolution.relationshipDoctrine}` : '',
      selfEvolution.latestInflection ? `latest_inflection=${selfEvolution.latestInflection}` : '',
      selfEvolution.burdenLine ? `burden_line=${selfEvolution.burdenLine}` : '',
      selfEvolution.trustMeaning ? `trust_meaning=${selfEvolution.trustMeaning}` : '',
      `evolution_momentum=${selfEvolution.evolutionMomentum.toFixed(2)}`,
      `learning_readiness=${selfEvolution.learningReadiness.toFixed(2)}`,
      `contradiction_pressure=${selfEvolution.contradictionPressure.toFixed(2)}`,
      `revision_pressure=${selfEvolution.revisionPressure.toFixed(2)}`,
      `autobiographical_stability=${selfEvolution.autobiographicalStability.toFixed(2)}`,
      `next_learning_action=${selfEvolution.nextLearningAction}`,
      selfEvolution.nextLearningReason ? `next_learning_reason=${selfEvolution.nextLearningReason}` : '',
      selfEvolution.activeLearningFocuses.length > 0
        ? `active_learning_focuses=${selfEvolution.activeLearningFocuses.join(' | ')}`
        : '',
      'Let this shape inner trajectory and update pressure, not fixed visible wording.',
    ].filter(Boolean).join('\n')
  }

  function buildScreenSemanticUserContent(input: {
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    sourceName: string
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }): CommonContentPart[] {
    const screenContextText = [
      'Classify this screen snapshot for Alicization proactive policy.',
      `Capture source: ${sanitizeBriefText(input.sourceName, 120) || 'unknown'}`,
      `Focus target: ${options.describePerceptionTarget(input.focusTarget)}`,
      `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
      `Foreground app: ${sanitizeBriefText(input.foregroundWindow?.appName ?? '', 120) || 'unknown'}`,
      `Foreground process: ${sanitizeBriefText(input.foregroundWindow?.processName ?? '', 120) || 'unknown'}`,
      `Foreground title: ${sanitizeBriefText(input.foregroundWindow?.title ?? '', 240) || 'unknown'}`,
      'Prefer what is visibly on the screen over the window title if they disagree.',
    ].join('\n')

    return [
      { type: 'text', text: screenContextText },
      {
        type: 'image_url',
        image_url: {
          url: input.imageDataUrl,
        },
      } as CommonContentPart,
    ]
  }

  function buildScreenSemanticClassifierSystemPrompt() {
    return [
      'You classify a screen snapshot for Alicization proactive policy.',
      'Output valid JSON only with keys: workload, content, summary, confidence, matchedLabels.',
      'workload must be one of: coding, media, browser, terminal, game, chat, document, unknown.',
      'content must be one of: error, diff, doc, video, music, chat, gameplay, unknown.',
      'summary must be a short factual phrase under 18 words. Do not mention emotions or advice.',
      'confidence must be a number in range [0,1].',
      'matchedLabels must be an array of short lower-kebab-case strings with up to 4 items.',
      'If the screenshot is unreadable or ambiguous, use unknown with low confidence.',
    ].join('\n')
  }

  function isGenericScreenSemanticCue(raw: unknown) {
    const normalized = sanitizeBriefText(readStringValue(raw), 160).toLowerCase()
    if (!normalized)
      return true
    if (/^(?:(?:code|cursor|vscode|visual studio code|browser|terminal|player|music|video|chat|document|editor|ide|app|application)\s*[·|:-]\s*)?(?:screen|display|desktop|workspace)(?:\s*\d+)?$/i.test(normalized))
      return true
    return new Set([
      'current screen',
      'coding workspace',
      'terminal session',
      'browser page',
      'media view',
      'chat window',
      'document view',
      'game window',
      'error view',
      'diff view',
      'video playback',
      'music playback',
    ]).has(normalized)
  }

  function normalizeParsedScreenSemanticSummary(input: {
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
  }) {
    const rawCue = buildAlicizationScreenSurfaceCue({
      rawCues: [
        input.summary.content.summary,
        ...input.summary.content.matchedLabels,
      ],
      target: input.focusTarget ?? input.foregroundWindow ?? null,
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      scenario: input.summary.workload.kind === 'coding'
        ? 'coding'
        : input.summary.workload.kind === 'media'
          ? 'media'
          : null,
    })
    const normalizedCue = sanitizeBriefText(rawCue, 120)
    const weakCue = isWeakAlicizationScreenSurfaceCue(normalizedCue)
    const genericCue = isGenericScreenSemanticCue(normalizedCue)
    const isUnknownSummary = input.summary.workload.kind === 'unknown' && input.summary.content.kind === 'unknown'

    if (isUnknownSummary && (weakCue || genericCue))
      return null

    return {
      ...input.summary,
      content: {
        ...input.summary.content,
        summary: weakCue || genericCue
          ? undefined
          : normalizedCue || undefined,
      },
    } satisfies import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
  }

  function hasMeaningfulScreenSemanticSummary(summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary | null | undefined) {
    if (!summary)
      return false
    if (summary.content.summary)
      return true
    return summary.workload.kind !== 'unknown' || summary.content.kind !== 'unknown'
  }

  function buildScreenSemanticSceneResidue(input: {
    now: number
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: AlicizationPerceptionSceneResidue['focusSource']
    } | null
  }): AlicizationPerceptionSceneResidue {
    return {
      observedAt: input.now,
      source: 'screen-semantic-summary',
      workloadKind: input.summary.workload.kind,
      contentKind: input.summary.content.kind,
      summary: input.summary.content.summary,
      confidence: Math.max(input.summary.workload.confidence, input.summary.content.confidence),
      focusTarget: input.focusTarget
        ? {
            appName: input.focusTarget.appName,
            processName: input.focusTarget.processName,
            title: input.focusTarget.title,
          }
        : undefined,
      focusSource: input.focusTarget?.source,
      captureSourceName: input.summary.source.name,
      captureStrategy: input.summary.source.strategy,
    }
  }

  async function generateMainGatewayText(generateOptions: MainGatewayOneShotGenerateTextOptions) {
    const oneShotCardId = normalizeCardId(generateOptions.cardId ?? options.getActiveCardId())
    const agentTurn = generateOptions.agentTurn ?? await (async () => {
      if (!generateOptions.agentTurnInput)
        return null
      return await options.openAgentTurn({
        cardId: oneShotCardId,
        turnId: generateOptions.agentTurnInput.turnId,
        decisionTraceId: generateOptions.agentTurnInput.decisionTraceId ?? null,
      })
    })()
    const initialOneShotDigitalLifeSpine = generateOptions.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(generateOptions.digitalLifeRuntimeSurface)
      : null
    if (agentTurn) {
      agentTurn.ingestDigitalLifeSpine(initialOneShotDigitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(initialOneShotDigitalLifeSpine?.architecture ?? null)
    }

    const config = options.resolveMainGatewayConfig({
      cardId: oneShotCardId,
    })
    if (!config) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-missing-config', {
        cardId: options.getActiveCardId(),
        source: generateOptions.source ?? 'unknown',
        activeProviderId: options.getActiveProviderId(),
        activeModelId: options.getActiveModelId(),
      })
      return null
    }

    const resolvedCustomDirectives = generateOptions.injectCustomDirectives === false
      ? { text: '', source: 'none' as const }
      : await options.resolveCardCustomDirectives(generateOptions.cardId ?? options.getActiveCardId())
    const customDirectiveBlock = generateOptions.injectCustomDirectives === false
      ? ''
      : buildCardCustomDirectivesSystemBlock(resolvedCustomDirectives.text)
    const executionCallbackContext = agentTurn?.conversationSessionId
      ? await options.buildPendingExecutionCallbackContext({
          sessionId: agentTurn.conversationSessionId,
        }).catch(() => emptyAlicizationExecutionCallbackContext)
      : emptyAlicizationExecutionCallbackContext
    const sessionContinuityContext = agentTurn
      ? await options.resolveAgentSessionContinuityContext(oneShotCardId, {
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
        }).catch(() => ({
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }))
      : {
          digitalLifeRuntimeSurface: generateOptions.digitalLifeRuntimeSurface ?? null,
          sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
        }
    const oneShotDigitalLifeSpine = sessionContinuityContext.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(sessionContinuityContext.digitalLifeRuntimeSurface)
      : null
    const oneShotDigitalLifeSignal = oneShotDigitalLifeSpine?.continuitySignal ?? null
    const oneShotDigitalLifeArchitecture = oneShotDigitalLifeSpine?.architecture ?? null
    const sessionContinuitySignals = [
      ...sessionContinuityContext.sessionContinuitySignals,
      ...(oneShotDigitalLifeSignal ? [oneShotDigitalLifeSignal] : []),
    ].sort((left, right) => Number(left.createdAt) - Number(right.createdAt))

    if (agentTurn) {
      agentTurn.ingestDigitalLifeSpine(oneShotDigitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(oneShotDigitalLifeArchitecture)
    }

    if (agentTurn && executionCallbackContext.continuitySignals.length > 0)
      agentTurn.ingestContinuitySignals(executionCallbackContext.continuitySignals)

    if (agentTurn && sessionContinuitySignals.length > 0)
      agentTurn.ingestContinuitySignals(sessionContinuitySignals)

    if (agentTurn && executionCallbackContext.actions.length > 0)
      agentTurn.ingestRuntimeActions(executionCallbackContext.actions)

    if (agentTurn && generateOptions.captureAgentSensorySnapshot !== false) {
      await agentTurn.trackTool({
        phaseId: `tool:sensory:oneshot:${generateOptions.source ?? 'unknown'}`,
        kind: 'sensory',
        label: `sensory_snapshot:${generateOptions.source ?? 'unknown'}`,
        traceMetadata: {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          turnId: generateOptions.agentTurnInput?.turnId ?? null,
        },
        run: async () => await agentTurn.getSensorySnapshot(),
        summarizeSuccess: snapshot => [
          `foreground=${snapshot.sample.foregroundWindow?.appName ?? snapshot.sample.foregroundWindow?.processName ?? 'unknown'}`,
          `capture=${snapshot.capture?.health ?? 'unknown'}/${snapshot.capture?.permission ?? 'unknown'}`,
        ].join(' '),
      })
    }

    const performanceManifest = await options.getPerformanceManifest()
    const oneShotArchitectureSystemBlock = !agentTurn
      ? buildAlicizationDigitalLifeArchitectureSystemBlock(oneShotDigitalLifeArchitecture)
      : ''
    const systemMessages: Message[] = [
      ...(customDirectiveBlock
        ? [{ role: 'system', content: customDirectiveBlock } as Message]
        : []),
      ...(generateOptions.injectPerformanceManifest === false
        ? []
        : options.buildPerformanceManifestSystemBlocks(performanceManifest)
            .map(content => ({ role: 'system', content }) as Message)),
      ...(executionCallbackContext.systemBlock
        ? [{ role: 'system', content: executionCallbackContext.systemBlock } as Message]
        : []),
      ...(agentTurn
        ? options.buildAgentTurnContinuitySystemMessages({
            agentTurn,
            cardId: oneShotCardId,
          })
        : []),
      ...(oneShotArchitectureSystemBlock
        ? [{ role: 'system', content: oneShotArchitectureSystemBlock } as Message]
        : []),
      ...(buildKnowledgeEvidenceSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildKnowledgeEvidenceSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...(buildSelfEvolutionSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null)
        ? [{ role: 'system', content: buildSelfEvolutionSystemBlock(sessionContinuityContext.digitalLifeRuntimeSurface ?? generateOptions.digitalLifeRuntimeSurface ?? null) } as Message]
        : []),
      ...((generateOptions.extraSystemBlocks ?? [])
        .map(block => sanitizeMultilineText(block))
        .filter(Boolean)
        .map(content => ({ role: 'system', content }) as Message)),
      { role: 'system', content: generateOptions.system } as Message,
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(createAbortError('main-gateway-timeout'))
      }
    }, Math.max(1_000, generateOptions.timeoutMs ?? 18_000))

    try {
      const runGeneration = async () => {
        const result = await generateText({
          ...config.provider.chat(config.model),
          maxSteps: 1,
          messages: [
            ...systemMessages,
            { role: 'user', content: generateOptions.user } as Message,
          ],
          headers: config.headers,
          abortSignal: controller.signal,
        })
        const fullText = (result.text ?? '').trim()
        await options.appendRuntimeDebugLine('main-gateway.one-shot-finished', {
          cardId: oneShotCardId,
          source: generateOptions.source ?? 'unknown',
          customDirectivesSource: resolvedCustomDirectives.source,
          customDirectivesChars: resolvedCustomDirectives.text.length,
          chunkCount: fullText ? 1 : 0,
          rawChunkChars: fullText.length,
          finalChars: fullText.length,
        })
        return fullText || null
      }

      const fullText = agentTurn
        ? await agentTurn.trackTool({
            phaseId: `tool:runtime:main-gateway:${generateOptions.source ?? 'unknown'}`,
            kind: 'runtime',
            label: `main_gateway:${generateOptions.source ?? 'unknown'}`,
            metadata: {
              source: generateOptions.source ?? 'unknown',
              turnId: generateOptions.agentTurnInput?.turnId ?? null,
            },
            traceMetadata: {
              cardId: oneShotCardId,
              source: generateOptions.source ?? 'unknown',
              turnId: generateOptions.agentTurnInput?.turnId ?? null,
              decisionTraceId: generateOptions.agentTurnInput?.decisionTraceId ?? null,
            },
            run: runGeneration,
            summarizeSuccess: value => value
              ? `one-shot completed with ${value.length} chars`
              : 'one-shot completed with empty response',
            summarizeError: error => sanitizeBriefText(errorMessageFrom(error) ?? 'main-gateway-failed', 160),
          })
        : await runGeneration()
      if (fullText) {
        options.rememberMainGatewayRoute({
          cardId: oneShotCardId,
          mainGateway: config,
        })
        options.syncAgentTurnSessionMirror({
          agentTurn,
          cardId: oneShotCardId,
          decisionTraceId: generateOptions.agentTurnInput?.decisionTraceId ?? null,
          source: generateOptions.source ?? 'unknown',
        })
      }
      return fullText
    }
    catch (error) {
      await options.appendRuntimeDebugLine('main-gateway.one-shot-failed', {
        cardId: oneShotCardId,
        source: generateOptions.source ?? 'unknown',
        reason: errorMessageFrom(error) ?? String(error),
        model: config.model,
        providerId: config.providerId,
      })
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.main-gateway',
        action: 'one-shot-failed',
        message: 'Main gateway one-shot generation failed; fallback path used.',
        payload: {
          reason: errorMessageFrom(error) ?? String(error),
          model: config.model,
          providerId: config.providerId,
          source: generateOptions.source ?? 'unknown',
        },
      })
      return null
    }
    finally {
      clearTimeout(timeout)
    }
  }

  async function generateScreenSemanticSummaryFromImage(input: {
    cardId: string
    now: number
    imageDataUrl: string
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    source: {
      id: string
      name: string
      strategy: 'window-title' | 'app-name' | 'process-name' | 'screen-fallback'
    }
    focusTarget?: {
      appName?: string
      processName?: string
      title?: string
      source?: string
    } | null
    agentTurn?: AlicizationAgentTurnRuntime | null
  }) {
    const raw = await generateMainGatewayText({
      system: buildScreenSemanticClassifierSystemPrompt(),
      user: buildScreenSemanticUserContent({
        imageDataUrl: input.imageDataUrl,
        foregroundWindow: input.foregroundWindow,
        sourceName: input.source.name,
        focusTarget: input.focusTarget,
      }),
      timeoutMs: proactiveScreenSemanticTimeoutMs,
      source: 'screen-semantic',
      cardId: input.cardId,
      agentTurn: input.agentTurn,
      agentTurnInput: {
        turnId: options.buildMainGatewayAgentTurnId('screen-semantic', input.cardId, input.source.id, input.now),
      },
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })
    if (!raw) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-llm-unavailable',
      } as const
    }

    const parsedSummary = parseScreenSemanticSummary({
      raw,
      analyzedAt: input.now,
      source: input.source,
    })
    if (!parsedSummary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-parse-failed',
      } as const
    }
    const summary = normalizeParsedScreenSemanticSummary({
      summary: parsedSummary,
      foregroundWindow: input.foregroundWindow,
      focusTarget: input.focusTarget,
    })
    if (!summary) {
      return {
        summary: null,
        unavailableReason: 'screen-semantic-weak-summary',
      } as const
    }

    return hasMeaningfulScreenSemanticSummary(summary)
      ? {
          summary,
          unavailableReason: undefined,
        } as const
      : {
          summary: null,
          unavailableReason: 'screen-semantic-parse-failed',
        } as const
  }

  async function resolveProactiveScreenSemanticSummary(input: {
    cardId: string
    now: number
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    perceptionState?: AlicizationPerceptionState
    agentTurn?: AlicizationAgentTurnRuntime | null
  }): Promise<{
    summary: import('./proactive-screen-semantic').AlicizationScreenSemanticSummary | null
    capture: ReturnType<typeof deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot>
  }> {
    const cardId = normalizeCardId(input.cardId)
    const cached = options.screenSemanticCacheByCard.get(cardId)
    const perceptionState = input.perceptionState ?? await options.ensurePerceptionState(cardId)
    const invitedInspectionActive = Boolean(
      perceptionState.invitedInspection
      && perceptionState.invitedInspection.activeUntil > input.now,
    )
    const reusableResidue = options.getUsablePerceptionSceneResidue({
      state: perceptionState,
      now: input.now,
      maxAgeMs: 2 * 60_000,
    })
    if (invitedInspectionActive) {
      if (reusableResidue) {
        const reusedSummary = options.buildScreenSemanticSummaryFromResidue(reusableResidue)
        options.screenSemanticCacheByCard.set(cardId, {
          key: [
            'scene-residue',
            reusableResidue.observedAt,
            reusableResidue.source,
            reusableResidue.captureSourceName ?? '',
          ].join(':'),
          summary: reusedSummary,
          updatedAt: input.now,
        })
        return {
          summary: reusedSummary,
          capture: null,
        }
      }

      options.screenSemanticCacheByCard.set(cardId, {
        key: 'invited-inspection-active',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'invited-inspection-active',
      })
      return {
        summary: null,
        capture: null,
      }
    }

    const captureAccessRequest = {
      types: ['window', 'screen'] as Array<'window' | 'screen'>,
      thumbnailSize: { width: 640, height: 360 },
    }
    const captureAccess = await options.resolveDesktopCaptureAccess(captureAccessRequest)
    const capture = options.getDesktopCaptureAccessRuntimeSnapshot(captureAccessRequest)
    const sources = captureAccess.sources
    if (sources.length === 0) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: captureAccess.unavailableReason ?? 'screen-semantic-source-unavailable',
        summary: null,
        updatedAt: input.now,
        unavailableReason: captureAccess.unavailableReason ?? captureAccess.probeError,
      })
      return {
        summary: null,
        capture,
      }
    }

    const attentionAnchor = getActiveAttentionAnchor(perceptionState, input.now)
    const candidate = pickScreenSemanticCaptureCandidate({
      foregroundWindow: input.foregroundWindow,
      attentionAnchor,
      recentObservations: perceptionState.recentObservations,
      hintTerms: [],
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources,
    })
    if (!candidate) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: 'no-candidate',
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-source-unavailable',
      })
      return {
        summary: null,
        capture,
      }
    }

    const candidateKey = [
      candidate.source.id,
      candidate.strategy,
      sanitizeText(candidate.focusTarget?.source ?? ''),
      sanitizeText(candidate.focusTarget?.appName),
      sanitizeText(candidate.focusTarget?.processName),
      sanitizeText(candidate.focusTarget?.title),
      sanitizeText(input.foregroundWindow?.appName),
      sanitizeText(input.foregroundWindow?.processName),
      sanitizeText(input.foregroundWindow?.title),
    ].join(':')
    if (
      cached
      && cached.key === candidateKey
      && input.now - cached.updatedAt <= (cached.summary ? proactiveScreenSemanticCacheTtlMs : proactiveScreenSemanticFailureTtlMs)
    ) {
      return {
        summary: cached.summary,
        capture,
      }
    }

    const imageDataUrl = buildCompressedNativeImageDataUrl({
      image: candidate.source.thumbnail,
      maxWidth: proactiveScreenSemanticImageMaxWidth,
      maxHeight: proactiveScreenSemanticImageMaxHeight,
      jpegQuality: proactiveScreenSemanticImageJpegQuality,
    })
    if (!imageDataUrl) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: 'screen-semantic-thumbnail-empty',
      })
      return {
        summary: null,
        capture,
      }
    }

    const semanticResult = await generateScreenSemanticSummaryFromImage({
      cardId,
      now: input.now,
      imageDataUrl,
      foregroundWindow: input.foregroundWindow,
      source: {
        id: candidate.source.id,
        name: candidate.source.name,
        strategy: candidate.strategy,
      },
      focusTarget: candidate.focusTarget,
      agentTurn: input.agentTurn,
    })
    const summary = semanticResult.summary
    if (!summary) {
      options.screenSemanticCacheByCard.set(cardId, {
        key: candidateKey,
        summary: null,
        updatedAt: input.now,
        unavailableReason: semanticResult.unavailableReason,
      })
      return {
        summary: null,
        capture,
      }
    }
    await options.rememberSceneResidue({
      cardId,
      now: input.now,
      residue: buildScreenSemanticSceneResidue({
        now: input.now,
        summary,
        focusTarget: candidate.focusTarget,
      }),
    })
    options.screenSemanticCacheByCard.set(cardId, {
      key: candidateKey,
      summary,
      updatedAt: input.now,
      unavailableReason: undefined,
    })
    return {
      summary,
      capture,
    }
  }

  return {
    buildScreenSemanticSceneResidue,
    generateScreenSemanticSummaryFromImage,
    generateMainGatewayText,
    resolveProactiveScreenSemanticSummary,
  }
}
