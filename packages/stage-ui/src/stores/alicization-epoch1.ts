import type {
  AlicizationGenesisInput,
  AlicizationKillSwitchSnapshot,
  AlicizationMemoryStats,
  AlicizationOrganicMemorySnapshot,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
} from './alicization-bridge'

import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { calibrateSentimentConfidence, estimateLexicalSentiment } from '../composables/alicization-structured-output'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import {
  getMemoryStats,
  runMemoryPrune,
} from './alicization-memory'
import { computePersonalityDelta } from './alicization-personality'
import { useChatOrchestratorStore } from './chat'

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

const genesisPollIntervalMs = 2000

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

function createEmptyOrganicMemorySnapshot(hostAttitude = '礼貌而克制，保持观察', coreIncarnation = ''): AlicizationOrganicMemorySnapshot {
  return {
    hostAttitude,
    coreIncarnation,
    activeThoughts: [],
    subconsciousCount: 0,
    recentSubconsciousFragments: [],
    recentEpisodicEvents: [],
    hostPersonModel: null,
    memoryConsolidations: [],
    recollectionIntent: null,
    recollectionPlan: null,
    recollectionSpeechPlan: null,
    recollectionForeground: null,
    lastDreamedAt: null,
  }
}

export const useAlicizationEpoch1Store = defineStore('alicization-epoch1', () => {
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
  const organicMemorySnapshot = ref<AlicizationOrganicMemorySnapshot>(createEmptyOrganicMemorySnapshot())
  const organicMemorySearchResults = ref<AlicizationSubconsciousFragment[]>([])

  let initialized = false
  let genesisPollTimer: ReturnType<typeof setInterval> | undefined
  let lastAssistantEmotion: string | null = null
  const hookDisposers: Array<() => void> = []

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

  async function refreshOrganicMemorySnapshot() {
    const currentSoul = soul.value
    organicMemorySearchResults.value = []
    const bridge = hasAlicizationBridge() ? getAlicizationBridge() : null
    if (!bridge?.getOrganicMemorySnapshot) {
      organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot(
        currentSoul?.frontmatter.host_attitude ?? '礼貌而克制，保持观察',
        currentSoul?.frontmatter.core_incarnation ?? '',
      )
      return organicMemorySnapshot.value
    }

    const snapshot = await bridge.getOrganicMemorySnapshot().catch(() => null)
    if (snapshot) {
      organicMemorySnapshot.value = snapshot
      return snapshot
    }

    organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot(
      currentSoul?.frontmatter.host_attitude ?? '礼貌而克制，保持观察',
      currentSoul?.frontmatter.core_incarnation ?? '',
    )
    return organicMemorySnapshot.value
  }

  async function searchOrganicSubconsciousFragments(query: string, limit = 12) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      organicMemorySearchResults.value = []
      return organicMemorySearchResults.value
    }

    const bridge = hasAlicizationBridge() ? getAlicizationBridge() : null
    if (!bridge?.searchOrganicSubconsciousFragments) {
      organicMemorySearchResults.value = []
      return organicMemorySearchResults.value
    }

    const result = await bridge.searchOrganicSubconsciousFragments({
      query: normalizedQuery,
      limit,
    }).catch(() => null)
    organicMemorySearchResults.value = result ?? []
    return organicMemorySearchResults.value
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
      organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot()
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
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: snapshot.frontmatter.host_attitude,
      coreIncarnation: snapshot.frontmatter.core_incarnation,
    }
  }

  async function initializeGenesis(payload: AlicizationGenesisInput) {
    if (!hasAlicizationBridge())
      return

    const result = await getAlicizationBridge().initializeGenesis(payload)
    const resolvedNeedsGenesis = result.soul.needsGenesis

    soul.value = result.soul
    needsGenesis.value = resolvedNeedsGenesis
    genesisConflictCandidate.value = result.conflictCandidate ?? null
    if (resolvedNeedsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: result.soul.frontmatter.host_attitude,
      coreIncarnation: result.soul.frontmatter.core_incarnation,
    }
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

    hookDisposers.push(
      chatOrchestrator.onChatTurnComplete(async ({ output }, context) => {
        const userText = parseUserText(context.message.content)
        const structured = output.structured
        const turnId = output.id ?? context.message.id ?? nanoid()
        const sessionId = context.sessionId ?? 'unknown-session'
        const debugAuditEnabled = isAlicizationDebugAuditEnabled()

        await appendAlicizationAuditLog({
          level: 'info',
          category: 'emotion',
          action: 'assistant-turn-emotion',
          message: 'Recorded assistant turn emotion telemetry.',
          details: {
            sessionId,
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
            action: 'provider-payload-invalid-skip-learning',
            message: 'Skipped personality drift because provider payload validation failed.',
            details: {
              sessionId,
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
            message: 'Skipped personality drift for policy-locked turn.',
            details: {
              sessionId,
              turnId,
              policyLocked: structured.policyLocked,
            },
          })
          lastAssistantEmotion = structured.emotion || lastAssistantEmotion
          return
        }

        const lexicalStrength = Math.abs(estimateLexicalSentiment(structured?.reply ?? parseUserText(output.content)))
        const emotionalCoherence = lastAssistantEmotion
          ? (lastAssistantEmotion === structured?.emotion ? 1 : 0.55)
          : 0.7
        const calibratedConfidence = calibrateSentimentConfidence({
          rawConfidence: structured?.sentimentConfidenceRaw,
          lexicalStrength,
          emotionCoherence: emotionalCoherence,
          extractorAgreement: 0.5,
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
            sessionId,
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
              sessionId,
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
      }),
    )
  }

  async function initialize() {
    if (initialized)
      return
    initialized = true

    await bootstrapRuntime()
    attachChatHooks()
    await syncMemoryStatsToRuntime()
    await syncKillSwitchState()
    await refreshOrganicMemorySnapshot()
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
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: snapshot.frontmatter.host_attitude,
      coreIncarnation: snapshot.frontmatter.core_incarnation,
    }
  }

  function dispose() {
    for (const disposer of hookDisposers.splice(0, hookDisposers.length)) {
      disposer()
    }

    stopGenesisPolling()
    lastAssistantEmotion = null
    initialized = false
  }

  return {
    soul,
    needsGenesis,
    memoryStats,
    organicMemorySnapshot,
    organicMemorySearchResults,
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
    refreshOrganicMemorySnapshot,
    searchOrganicSubconsciousFragments,
    runPruneNow,
    dispose,
  }
})
