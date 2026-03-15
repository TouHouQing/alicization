import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { Message } from '@xsai/shared-chat'

import type { AlicizationGenesisInput, AlicizationKillSwitchSnapshot, AlicizationMemoryStats, AlicizationSoulSnapshot } from './alicization-bridge'
import type { AlicizationMemoryFact } from './alicization-memory'

import { ContextUpdateStrategy } from '@proj-airi/server-sdk'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { sanitizeForRemoteModel } from '../composables/alicization-guardrails'
import { calibrateSentimentConfidence, estimateLexicalSentiment } from '../composables/alicization-structured-output'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import {
  asyncExtractionIdleMs,
  evaluateAsyncExtractionBudget,
  evaluateAsyncExtractionTrigger,
} from './alicization-epoch1-scheduler'
import { ensureRuntimeMemoryMigration, extractRuleFacts, getMemoryStats, retrieveFacts, runMemoryPrune, upsertFacts } from './alicization-memory'
import { computePersonalityDelta } from './alicization-personality'
import { useChatOrchestratorStore } from './chat'
import { useChatContextStore } from './chat/context-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'
import { useProvidersStore } from './providers'

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value))
    return min
  return Math.min(max, Math.max(min, value))
}

function normalizeBooleanEnv(value: unknown) {
  if (typeof value !== 'string')
    return false
  return /^(?:1|true|yes|on)$/i.test(value.trim())
}

function isAlicizationDebugAuditEnabled() {
  const envValue = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.ALICIZATION_DEBUG_AUDIT
  return normalizeBooleanEnv(envValue)
}

function createThoughtDigest(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

interface ExtractedAsyncFact {
  turnId?: string
  subject: string
  predicate: string
  object: string
  confidence: number
}

function extractJsonObjectCandidate(raw: string, maxChars = 32 * 1024) {
  const text = raw.trim()
  if (!text)
    return null

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace < firstBrace)
    return null

  const candidate = text.slice(firstBrace, lastBrace + 1)
  if (candidate.length > maxChars)
    return null

  return candidate
}

function parseExtractedAsyncFacts(raw: string): ExtractedAsyncFact[] {
  const candidate = extractJsonObjectCandidate(raw)
  if (!candidate)
    return []

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  }
  catch {
    return []
  }

  const payload = parsed && typeof parsed === 'object'
    ? parsed as { facts?: unknown }
    : null
  if (!payload || !Array.isArray(payload.facts))
    return []

  return payload.facts
    .map((item): ExtractedAsyncFact | null => {
      if (!item || typeof item !== 'object')
        return null

      const row = item as Record<string, unknown>
      const subject = typeof row.subject === 'string' ? row.subject.trim() : ''
      const predicate = typeof row.predicate === 'string' ? row.predicate.trim() : ''
      const object = typeof row.object === 'string' ? row.object.trim() : ''
      const turnId = typeof row.turnId === 'string' ? row.turnId.trim() : ''
      const confidenceRaw = typeof row.confidence === 'number'
        ? row.confidence
        : Number.parseFloat(String(row.confidence ?? '0'))
      const confidence = Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0

      if (!subject || !predicate || !object)
        return null

      return {
        turnId: turnId || undefined,
        subject,
        predicate,
        object,
        confidence,
      }
    })
    .filter((item): item is ExtractedAsyncFact => Boolean(item))
}

function parseUserText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    }).join('')
  }
  return ''
}

function trimForExtractor(text: string, maxChars = 480) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars)
    return normalized
  return `${normalized.slice(0, Math.max(64, maxChars - 1))}…`
}

function extractSoulBody(content: string) {
  if (!content.startsWith('---\n'))
    return content.trim()
  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0)
    return content.trim()
  return content.slice(secondMarkerIndex + 5).trim()
}

function replaceSoulBody(content: string, body: string) {
  const normalizedBody = body.trim()
  if (!content.startsWith('---\n')) {
    return `${normalizedBody}\n`
  }

  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0) {
    return `${normalizedBody}\n`
  }

  const frontmatterBlock = content.slice(0, secondMarkerIndex + 5)
  return `${frontmatterBlock}${normalizedBody}\n`
}

const pruneIntervalMs = 24 * 60 * 60 * 1000
const genesisPollIntervalMs = 2000

type AsyncExtractorProvider = 'remote' | 'local' | 'off'

interface PendingAsyncExtractionTurn {
  sessionId: string
  turnId: string
  userText: string
  replyText: string
  memoryConfidenceWeight: number
}

function buildFactKey(fact: Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>) {
  return `${fact.subject.trim().toLowerCase()}|${fact.predicate.trim().toLowerCase()}|${fact.object.trim().toLowerCase()}`
}

function computeExtractorAgreement(
  left: Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>>,
  right: Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>>,
) {
  if (left.length === 0 && right.length === 0)
    return 0.5

  const leftKeys = new Set(left.map(buildFactKey))
  const rightKeys = new Set(right.map(buildFactKey))
  const union = new Set([...leftKeys, ...rightKeys])
  if (union.size === 0)
    return 0.5

  let intersection = 0
  for (const key of leftKeys) {
    if (rightKeys.has(key))
      intersection += 1
  }

  return clamp(intersection / union.size, 0, 1)
}

async function appendAlicizationAuditLog(payload: {
  level: 'info' | 'notice' | 'warning' | 'critical'
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}) {
  if (!hasAlicizationBridge())
    return

  await getAlicizationBridge().appendAuditLog({
    level: payload.level,
    category: payload.category,
    action: payload.action,
    message: payload.message,
    payload: payload.details,
  }).catch(() => {})
}

export const useAlicizationEpoch1Store = defineStore('alicization-epoch1', () => {
  const llmStore = useLLM()
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()

  const soul = ref<AlicizationSoulSnapshot | null>(null)
  const needsGenesis = ref(false)
  const genesisConflictCandidate = ref<AlicizationSoulSnapshot | null>(null)
  const killSwitch = ref<AlicizationKillSwitchSnapshot>({
    state: 'ACTIVE',
    reason: 'bootstrap',
    updatedAt: Date.now(),
  })
  const memoryStats = ref<AlicizationMemoryStats>({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  })

  let initialized = false
  let pruneTimer: ReturnType<typeof setInterval> | undefined
  let genesisPollTimer: ReturnType<typeof setInterval> | undefined
  let lastAssistantEmotion: string | null = null
  const hookDisposers: Array<() => void> = []
  const pendingAsyncExtractionTurns = new Map<string, PendingAsyncExtractionTurn>()
  let asyncExtractionIdleTimer: ReturnType<typeof setTimeout> | undefined
  let asyncExtractionRunning = false
  const asyncExtractionProvider: AsyncExtractorProvider = 'remote'
  let asyncExtractionBudgetWindowStartedAt = 0
  let asyncExtractionBudgetConsumed = 0
  let lastAsyncExtractionQueuedAt: number | null = null

  async function extractFactsViaConfiguredProvider(batch: PendingAsyncExtractionTurn[]): Promise<ExtractedAsyncFact[]> {
    const providerId = consciousnessStore.activeProvider
    const modelId = consciousnessStore.activeModel
    if (!providerId || !modelId) {
      throw new Error('No active provider/model configured for async extractor.')
    }

    const chatProvider = await providersStore.getProviderInstance<ChatProvider>(providerId)
    const transcript = batch
      .map((item, index) => [
        `Turn #${index + 1}`,
        `turnId=${item.turnId}`,
        `User: ${trimForExtractor(item.userText)}`,
        `Assistant: ${trimForExtractor(item.replyText)}`,
      ].join('\n'))
      .join('\n\n')

    const messages: Message[] = [
      {
        role: 'system',
        content: [
          'Extract durable user-related memory facts from the transcript.',
          'Return ONLY strict JSON object:',
          '{"facts":[{"turnId":"...","subject":"...","predicate":"...","object":"...","confidence":0.0}]}',
          'Rules:',
          '- Keep only stable facts that help future assistance.',
          '- Use short lowercase predicate labels.',
          '- confidence must be 0..1.',
          '- Do not include markdown or prose.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: transcript,
      },
    ]

    const sanitized = sanitizeForRemoteModel(messages, { timeBudgetMs: 50, chunkSize: 2048 })
    if (sanitized.blocked) {
      throw new Error(`Async extractor blocked by sanitize gateway: ${sanitized.reason ?? 'unknown'}`)
    }

    let fullText = ''
    await llmStore.stream(modelId, chatProvider, sanitized.messages, {
      supportsTools: false,
      waitForTools: false,
      onStreamEvent: async (event) => {
        if (event.type === 'text-delta')
          fullText += event.text
        if (event.type === 'error')
          throw event.error ?? new Error('Async extractor stream error')
      },
    })

    return parseExtractedAsyncFacts(fullText)
  }

  async function syncMemoryStatsToRuntime() {
    const stats = await getMemoryStats()
    memoryStats.value = stats
    return stats
  }

  async function runPruneNow() {
    const stats = await runMemoryPrune()
    memoryStats.value = stats
    return await syncMemoryStatsToRuntime()
  }

  async function refreshMemoryStats() {
    return await syncMemoryStatsToRuntime()
  }

  async function syncKillSwitchState() {
    if (!hasAlicizationBridge()) {
      killSwitch.value = {
        state: 'ACTIVE',
        reason: 'bridge-unavailable',
        updatedAt: Date.now(),
      }
      return killSwitch.value
    }

    const snapshot = await getAlicizationBridge().getKillSwitchState().catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  function setKillSwitchSnapshot(snapshot: AlicizationKillSwitchSnapshot) {
    killSwitch.value = snapshot
  }

  async function suspendKillSwitch(reason = 'manual-ui') {
    if (!hasAlicizationBridge())
      return killSwitch.value

    const snapshot = await getAlicizationBridge().suspendKillSwitch({ reason }).catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  async function resumeKillSwitch(reason = 'manual-ui') {
    if (!hasAlicizationBridge())
      return killSwitch.value

    const snapshot = await getAlicizationBridge().resumeKillSwitch({ reason }).catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  function setupPruneTimer() {
    if (pruneTimer)
      return

    pruneTimer = setInterval(() => {
      void runPruneNow()
    }, pruneIntervalMs)
  }

  function clearAsyncExtractionIdleTimer() {
    if (!asyncExtractionIdleTimer)
      return
    clearTimeout(asyncExtractionIdleTimer)
    asyncExtractionIdleTimer = undefined
  }

  function canConsumeAsyncExtractionBudget() {
    const currentTs = Date.now()
    const result = evaluateAsyncExtractionBudget({
      state: {
        windowStartedAt: asyncExtractionBudgetWindowStartedAt,
        consumed: asyncExtractionBudgetConsumed,
      },
      now: currentTs,
    })
    asyncExtractionBudgetWindowStartedAt = result.nextState.windowStartedAt
    asyncExtractionBudgetConsumed = result.nextState.consumed
    return result.allowed
  }

  async function flushAsyncExtraction(reason: 'batch-threshold' | 'idle') {
    if (asyncExtractionRunning)
      return
    if (pendingAsyncExtractionTurns.size === 0)
      return

    asyncExtractionRunning = true
    clearAsyncExtractionIdleTimer()
    const batch = [...pendingAsyncExtractionTurns.values()]
    pendingAsyncExtractionTurns.clear()

    try {
      if (killSwitch.value.state === 'SUSPENDED') {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'memory',
          action: 'async-extractor-skipped',
          message: 'Async memory extractor skipped because kill switch is suspended.',
          details: {
            batchSize: batch.length,
            reason,
            killSwitchState: killSwitch.value.state,
          },
        })
        return
      }

      if (asyncExtractionProvider === 'off') {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'memory',
          action: 'async-extractor-skipped',
          message: 'Async memory extractor is disabled (provider=off).',
          details: {
            batchSize: batch.length,
            reason,
          },
        })
        return
      }

      if (!canConsumeAsyncExtractionBudget()) {
        await appendAlicizationAuditLog({
          level: 'notice',
          category: 'memory',
          action: 'async-extractor-degraded',
          message: 'Async memory extractor budget exceeded, degraded to rule-only extraction.',
          details: {
            batchSize: batch.length,
            provider: asyncExtractionProvider,
            reason,
          },
        })
        return
      }

      if (asyncExtractionProvider === 'remote' || asyncExtractionProvider === 'local') {
        const extracted = await extractFactsViaConfiguredProvider(batch)
        if (extracted.length > 0) {
          const turnWeightById = new Map(batch.map(item => [item.turnId, item.memoryConfidenceWeight]))
          const weightedFacts = extracted.map((fact) => {
            const weight = fact.turnId ? turnWeightById.get(fact.turnId) : undefined
            const confidenceWeight = typeof weight === 'number' ? weight : 0.6
            return {
              subject: fact.subject,
              predicate: fact.predicate,
              object: fact.object,
              confidence: clamp(fact.confidence * confidenceWeight + 0.05, 0, 1),
            }
          })
          await upsertFacts(weightedFacts, 'async-llm')
        }
      }

      await appendAlicizationAuditLog({
        level: 'info',
        category: 'memory',
        action: 'async-extractor-flushed',
        message: 'Async memory extraction batch completed.',
        details: {
          batchSize: batch.length,
          provider: asyncExtractionProvider,
          reason,
        },
      })
      await syncMemoryStatsToRuntime()
    }
    catch (error) {
      await appendAlicizationAuditLog({
        level: 'warning',
        category: 'memory',
        action: 'async-extractor-failed',
        message: 'Async memory extraction batch failed.',
        details: {
          reason: error instanceof Error ? error.message : String(error),
          provider: asyncExtractionProvider,
        },
      })
    }
    finally {
      asyncExtractionRunning = false
    }
  }

  function scheduleAsyncExtractionIdleFlush() {
    clearAsyncExtractionIdleTimer()
    asyncExtractionIdleTimer = setTimeout(() => {
      void flushAsyncExtraction('idle')
    }, asyncExtractionIdleMs)
  }

  function enqueueAsyncExtractionTurn(input: PendingAsyncExtractionTurn) {
    const key = `${input.sessionId}:${input.turnId}`
    pendingAsyncExtractionTurns.set(key, input)
    lastAsyncExtractionQueuedAt = Date.now()

    const trigger = evaluateAsyncExtractionTrigger({
      pendingCount: pendingAsyncExtractionTurns.size,
      lastQueuedAt: lastAsyncExtractionQueuedAt,
      now: lastAsyncExtractionQueuedAt,
    })
    if (trigger === 'batch') {
      void flushAsyncExtraction('batch-threshold')
      return
    }

    scheduleAsyncExtractionIdleFlush()
  }

  function stopGenesisPolling() {
    if (!genesisPollTimer)
      return

    clearInterval(genesisPollTimer)
    genesisPollTimer = undefined
  }

  function setupGenesisPolling() {
    if (genesisPollTimer || !hasAlicizationBridge())
      return

    genesisPollTimer = setInterval(() => {
      void (async () => {
        if (!needsGenesis.value || !hasAlicizationBridge()) {
          stopGenesisPolling()
          return
        }

        const latest = await getAlicizationBridge().getSoul().catch(() => null)
        if (!latest)
          return
        if (latest.hash === soul.value?.hash)
          return

        soul.value = latest
        needsGenesis.value = latest.needsGenesis
        if (latest.needsGenesis) {
          genesisConflictCandidate.value = latest
        }
        else {
          genesisConflictCandidate.value = null
          stopGenesisPolling()
        }
      })()
    }, genesisPollIntervalMs)
  }

  async function bootstrapRuntime() {
    if (!hasAlicizationBridge()) {
      needsGenesis.value = false
      stopGenesisPolling()
      return
    }

    const snapshot = await getAlicizationBridge().bootstrap()
    soul.value = snapshot
    needsGenesis.value = snapshot.needsGenesis
    if (!snapshot.needsGenesis)
      genesisConflictCandidate.value = null
    if (snapshot.needsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
  }

  async function initializeGenesis(payload: AlicizationGenesisInput) {
    if (!hasAlicizationBridge())
      return

    const result = await getAlicizationBridge().initializeGenesis(payload)

    soul.value = result.soul
    needsGenesis.value = result.soul.needsGenesis
    genesisConflictCandidate.value = result.conflictCandidate ?? null
    if (result.soul.needsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
    return result
  }

  async function refreshSoul() {
    if (!hasAlicizationBridge())
      return soul.value

    const snapshot = await getAlicizationBridge().getSoul().catch(() => null)
    if (snapshot)
      setSoulSnapshot(snapshot)
    return soul.value
  }

  async function updateSoulContent(content: string) {
    if (!hasAlicizationBridge() || !soul.value)
      return soul.value

    const updated = await getAlicizationBridge().updateSoul({
      expectedRevision: soul.value.revision,
      content,
    }).catch(() => null)

    if (updated)
      setSoulSnapshot(updated)
    return soul.value
  }

  async function updateSoulBody(body: string) {
    if (!soul.value)
      return soul.value

    const nextContent = replaceSoulBody(soul.value.content, body)
    if (extractSoulBody(nextContent) === extractSoulBody(soul.value.content))
      return soul.value
    return await updateSoulContent(nextContent)
  }

  function attachChatHooks() {
    const chatOrchestrator = useChatOrchestratorStore()
    const chatContext = useChatContextStore()

    hookDisposers.push(
      chatOrchestrator.onBeforeMessageComposed(async (message) => {
        const matched = await retrieveFacts(message, 6)
        if (matched.length === 0)
          return

        const summary = matched
          .map(item => `- ${item.subject} ${item.predicate} ${item.object} (confidence=${item.confidence.toFixed(2)})`)
          .join('\n')

        chatContext.ingestContextMessage({
          id: nanoid(),
          contextId: 'alicization:memory',
          strategy: ContextUpdateStrategy.ReplaceSelf,
          text: summary,
          createdAt: Date.now(),
        })

        await syncMemoryStatsToRuntime()
      }),
      chatOrchestrator.onChatTurnComplete(async ({ output }, context) => {
        const userText = parseUserText(context.message.content)
        const replyText = output.structured?.reply ?? parseUserText(output.content)
        const structured = output.structured
        const turnId = output.id ?? context.message.id ?? nanoid()
        const debugAuditEnabled = isAlicizationDebugAuditEnabled()

        await appendAlicizationAuditLog({
          level: 'info',
          category: 'emotion',
          action: 'assistant-turn-emotion',
          message: 'Recorded assistant turn emotion telemetry.',
          details: {
            sessionId: context.sessionId,
            turnId,
            emotion: structured?.emotion ?? 'neutral',
            parsePath: structured?.parsePath ?? 'fallback',
            contractFailed: Boolean(structured?.contractFailed),
            policyLocked: structured?.policyLocked ?? null,
            format: structured?.format ?? 'fallback-v1',
            thoughtDigest: structured?.thought ? createThoughtDigest(structured.thought) : undefined,
            thought: debugAuditEnabled && structured?.thought
              ? structured.thought
              : undefined,
          },
        })

        if (structured?.contractFailed) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'structured-output',
            action: 'contract-failed-skip-learning',
            message: 'Skipped personality drift and async memory extraction because contract failed.',
            details: {
              sessionId: context.sessionId,
              turnId,
              parsePath: structured.parsePath,
              format: structured.format,
            },
          })
          lastAssistantEmotion = structured.emotion || lastAssistantEmotion
          return
        }

        if (structured?.policyLocked) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'policy-lock',
            action: 'policy-locked-skip-learning',
            message: 'Skipped personality drift and async memory extraction for policy-locked turn.',
            details: {
              sessionId: context.sessionId,
              turnId,
              policyLocked: structured.policyLocked,
            },
          })
          lastAssistantEmotion = structured.emotion || lastAssistantEmotion
          return
        }

        const extractedByRule = extractRuleFacts({ userText, replyText })
        const extractedByAsyncLlm = extractRuleFacts({
          userText: `${userText}\n${replyText}`.trim(),
          replyText,
        })
        const extractorAgreement = computeExtractorAgreement(extractedByRule, extractedByAsyncLlm)
        const lexicalStrength = Math.abs(estimateLexicalSentiment(replyText))
        const emotionalCoherence = lastAssistantEmotion
          ? (lastAssistantEmotion === structured?.emotion ? 1 : 0.55)
          : 0.7
        const calibratedConfidence = calibrateSentimentConfidence({
          rawConfidence: structured?.sentimentConfidenceRaw,
          lexicalStrength,
          emotionCoherence: emotionalCoherence,
          extractorAgreement,
        })

        const memoryConfidenceWeight = clamp(calibratedConfidence, 0.2, 1)
        const extracted = extractedByRule.map(item => ({
          ...item,
          confidence: clamp(item.confidence * memoryConfidenceWeight, 0, 1),
        }))
        await upsertFacts(extracted, 'rule')

        enqueueAsyncExtractionTurn({
          sessionId: context.sessionId ?? 'unknown',
          turnId,
          userText,
          replyText,
          memoryConfidenceWeight,
        })

        if (!structured || !hasAlicizationBridge())
          return

        structured.sentimentConfidence = calibratedConfidence
        const confidence = calibratedConfidence
        if (confidence < 0.25) {
          lastAssistantEmotion = structured.emotion
          return
        }
        const userSignal = estimateLexicalSentiment(userText)
        const modelScore = clamp(structured.userSentimentScore ?? 0, -1, 1)
        const weightedScore = clamp(userSignal * 0.75 + modelScore * 0.25, -1, 1)
        const confidenceDecay = confidence < 0.35
          ? clamp(confidence / 0.35, 0, 1)
          : 1
        const effectiveScore = clamp(weightedScore * confidenceDecay, -1, 1)

        await appendAlicizationAuditLog({
          level: 'info',
          category: 'alicization.personality',
          action: 'drift-signal',
          message: 'Computed autonomous personality drift signal from user-first sentiment weighting.',
          details: {
            sessionId: context.sessionId,
            turnId,
            userSignal,
            modelScore,
            effectiveScore,
            confidence,
          },
        })

        const delta = computePersonalityDelta(effectiveScore, confidence)
        if (
          Math.abs(delta.obedience) <= 0.0001
          && Math.abs(delta.liveliness) <= 0.0001
          && Math.abs(delta.sensibility) <= 0.0001
        ) {
          lastAssistantEmotion = structured.emotion
          return
        }

        const nextSoul = await getAlicizationBridge().updatePersonality({
          expectedRevision: soul.value?.revision,
          reason: 'epoch1-sentiment-drift',
          deltas: delta,
        }).catch(() => null)

        if (nextSoul) {
          soul.value = nextSoul
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'personality-drift',
            action: 'personality-drift-updated',
            message: 'Applied autonomous multi-axis personality drift from structured turn sentiment.',
            details: {
              sessionId: context.sessionId,
              turnId,
              userSignal,
              modelScore,
              effectiveScore,
              confidence,
              delta,
            },
          })
        }
        lastAssistantEmotion = structured.emotion

        await syncMemoryStatsToRuntime()
      }),
    )
  }

  async function initialize() {
    if (initialized)
      return
    initialized = true

    await bootstrapRuntime()
    await ensureRuntimeMemoryMigration()
    attachChatHooks()
    await syncMemoryStatsToRuntime()
    await syncKillSwitchState()
    await runPruneNow()
    setupPruneTimer()
  }

  function setSoulSnapshot(snapshot: AlicizationSoulSnapshot) {
    soul.value = snapshot
    needsGenesis.value = snapshot.needsGenesis
    if (!snapshot.needsGenesis)
      genesisConflictCandidate.value = null
    if (snapshot.needsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
  }

  function dispose() {
    for (const disposer of hookDisposers.splice(0, hookDisposers.length)) {
      disposer()
    }

    if (pruneTimer) {
      clearInterval(pruneTimer)
      pruneTimer = undefined
    }
    stopGenesisPolling()
    clearAsyncExtractionIdleTimer()
    pendingAsyncExtractionTurns.clear()
    asyncExtractionRunning = false
    asyncExtractionBudgetWindowStartedAt = 0
    asyncExtractionBudgetConsumed = 0
    lastAsyncExtractionQueuedAt = null
    lastAssistantEmotion = null
    initialized = false
  }

  return {
    soul,
    needsGenesis,
    memoryStats,
    genesisConflictCandidate,
    killSwitch,
    initialize,
    initializeGenesis,
    setSoulSnapshot,
    setKillSwitchSnapshot,
    refreshSoul,
    updateSoulContent,
    updateSoulBody,
    suspendKillSwitch,
    resumeKillSwitch,
    syncKillSwitchState,
    refreshMemoryStats,
    runPruneNow,
    dispose,
  }
})
