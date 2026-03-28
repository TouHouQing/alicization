import type { Message } from '@xsai/shared-chat'

import { defaultAlicizationProfile } from '@proj-alicization/stage-shared'
import {
  alicizationFixedSensoryContextHeader,
  alicizationFixedStructuredContractAnchor,
  alicizationFixedStructuredContractHeader,
} from '@proj-alicization/stage-shared/alicization-prompting'

interface PromptBudgetOptions {
  totalTokens?: number
  soulRatio?: number
  memoryRatio?: number
  currentTurnRatio?: number
}

interface PromptAssemblyOptions {
  totalDialogueTokens?: number
  maxRecentUserTurns?: number
  maxMessages?: number
  minTailMessages?: number
}

interface PromptBudgetSectionStats {
  beforeTokens: number
  afterTokens: number
}

interface PromptBudgetSafeModeReport {
  activated: boolean
  reason?: 'soul-overflow'
  soulTokensBefore?: number
  soulTokensAfter?: number
}

export interface PromptBudgetReport {
  truncated: boolean
  totalBeforeTokens: number
  totalAfterTokens: number
  droppedMessageCount: number
  anchorPreserved: boolean
  runtimeContractAnchorRecovered: boolean
  safeMode: PromptBudgetSafeModeReport
  sections: {
    soul: PromptBudgetSectionStats
    memory: PromptBudgetSectionStats
    currentTurn: PromptBudgetSectionStats
    sensory: PromptBudgetSectionStats
  }
}

export interface PromptBudgetResult {
  messages: Message[]
  report: PromptBudgetReport
}

export interface PromptAssemblyReport {
  beforeCount: number
  afterCount: number
  beforeTokens: number
  afterTokens: number
  droppedMessageCount: number
  retainedUserTurns: number
}

export interface PromptAssemblyResult {
  messages: Message[]
  report: PromptAssemblyReport
}

export interface SanitizeOptions {
  timeBudgetMs?: number
  chunkSize?: number
}

export interface SanitizeResult {
  blocked: boolean
  reason?: string
  messages: Message[]
  redactions: number
  elapsedMs: number
}

export interface AssistantOutputSanitizeResult {
  cleanText: string
  leakDetected: boolean
  fabricationDetected: boolean
  removedCount: number
  fabricationRemovedCount: number
  redactedSecrets: number
}

export interface AssistantOutputSanitizeOptions {
  realtimeIntent?: boolean
  verifiedToolResult?: boolean
}

const defaultPromptBudget: Required<PromptBudgetOptions> = {
  totalTokens: 3200,
  soulRatio: 0.25,
  memoryRatio: 0.25,
  currentTurnRatio: 0.5,
}

const defaultPromptAssembly: Required<PromptAssemblyOptions> = {
  totalDialogueTokens: 1800,
  maxRecentUserTurns: 6,
  maxMessages: 18,
  minTailMessages: 4,
}

const runtimeSensoryHeader = alicizationFixedSensoryContextHeader
const runtimeContractAnchorHeader = alicizationFixedStructuredContractHeader
const safeModeRuntimeContractNotice = [
  '[SYSTEM NOTICE] Memory and history are skipped for this turn due to SOUL overflow safe mode.',
  '',
  'Output contract (must-follow, highest priority):',
  '- Return exactly one strict JSON object with keys: thought, emotion, reply, performance.',
  '- No markdown fences, no extra keys, no prose outside JSON.',
  'Output contract: You must output JSON with { thought, emotion, reply, performance }',
].join('\n')

const defaultSanitizeOptions: Required<SanitizeOptions> = {
  timeBudgetMs: 50,
  chunkSize: 2048,
}

const safeRedactionPatterns = [
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{36,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[\w-]{35}\b/g,
]

const keyValuePatterns = [
  /(api[_-]?key\s*[:=]\s*)([^\s"'`]{4,})/gi,
  /(password\s*[:=]\s*)([^\s"'`]{4,})/gi,
  /(passwd\s*[:=]\s*)([^\s"'`]{4,})/gi,
  /(secret\s*[:=]\s*)([^\s"'`]{4,})/gi,
  /(token\s*[:=]\s*)([^\s"'`]{4,})/gi,
]

function estimateTokens(text: string) {
  if (!text)
    return 0
  return Math.ceil(text.length / 4)
}

function estimateMessageTokens(message: Message) {
  return estimateTokens(readMessageText(message))
}

function readMessageText(message: Message) {
  if (typeof message.content === 'string')
    return message.content

  if (!Array.isArray(message.content))
    return ''

  return message.content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    })
    .join('\n')
}

function writeMessageText(message: Message, text: string) {
  if (typeof message.content === 'string') {
    return ({
      ...message,
      content: text,
    } as Message)
  }

  if (Array.isArray(message.content)) {
    if (message.role === 'system') {
      return ({
        ...message,
        content: text,
      } as Message)
    }

    const nonTextParts = message.content.filter((part) => {
      if (typeof part === 'string')
        return false
      if (part && typeof part === 'object' && 'text' in part)
        return false
      return true
    })

    const rebuiltParts = text.trim().length > 0
      ? [{ type: 'text', text }, ...nonTextParts]
      : nonTextParts

    return ({
      ...message,
      content: rebuiltParts.length > 0 ? (rebuiltParts as Message['content']) : text,
    } as Message)
  }

  return ({
    ...message,
    content: text,
  } as Message)
}

function cloneMessages(messages: Message[]) {
  return messages.map(message => ({ ...message }))
}

function countUserTurns(messages: Message[]) {
  return messages.reduce((count, message) => count + (message.role === 'user' ? 1 : 0), 0)
}

export function compactMessagesForPromptAssembly(messages: Message[], options?: PromptAssemblyOptions): PromptAssemblyResult {
  const cfg = {
    ...defaultPromptAssembly,
    ...options,
  }
  const systemMessages = messages.filter(message => message.role === 'system')
  const dialogueMessages = messages.filter(message => message.role !== 'system') as Message[]
  const beforeTokens = messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)

  if (dialogueMessages.length === 0) {
    return {
      messages,
      report: {
        beforeCount: messages.length,
        afterCount: messages.length,
        beforeTokens,
        afterTokens: beforeTokens,
        droppedMessageCount: 0,
        retainedUserTurns: 0,
      },
    }
  }

  let cutoffIndex = 0
  let userTurnsSeen = 0
  for (let index = dialogueMessages.length - 1; index >= 0; index -= 1) {
    if (dialogueMessages[index]?.role === 'user')
      userTurnsSeen += 1
    cutoffIndex = index
    if (userTurnsSeen >= Math.max(1, Math.floor(cfg.maxRecentUserTurns)))
      break
  }

  const compactedDialogue: Message[] = dialogueMessages.slice(cutoffIndex)
  while (compactedDialogue.length > cfg.maxMessages && compactedDialogue.length > cfg.minTailMessages) {
    compactedDialogue.shift()
  }

  const isProtectedIndex = (index: number) => index >= Math.max(0, compactedDialogue.length - cfg.minTailMessages)
  let dialogueTokens = compactedDialogue.reduce((sum, message) => sum + estimateMessageTokens(message), 0)

  while (dialogueTokens > cfg.totalDialogueTokens && compactedDialogue.length > cfg.minTailMessages) {
    const removableIndex = compactedDialogue.findIndex((_, index) => !isProtectedIndex(index))
    if (removableIndex < 0)
      break
    dialogueTokens -= estimateMessageTokens(compactedDialogue[removableIndex]!)
    compactedDialogue.splice(removableIndex, 1)
  }

  if (dialogueTokens > cfg.totalDialogueTokens && compactedDialogue.length > 0) {
    const trimIndex = compactedDialogue.findIndex((_, index) => !isProtectedIndex(index))
    const targetIndex = trimIndex >= 0 ? trimIndex : 0
    const targetMessage = compactedDialogue[targetIndex]
    if (targetMessage) {
      const overflow = Math.max(0, dialogueTokens - cfg.totalDialogueTokens)
      const currentTokens = estimateMessageTokens(targetMessage)
      const nextBudget = Math.max(24, currentTokens - overflow)
      const nextText = trimTextToTokenBudget(readMessageText(targetMessage), nextBudget, 'middle')
      compactedDialogue[targetIndex] = writeMessageText(targetMessage, nextText) as Message
      dialogueTokens = compactedDialogue.reduce((sum, message) => sum + estimateMessageTokens(message), 0)
    }
  }

  const nextMessages = [...systemMessages, ...compactedDialogue]
  const afterTokens = nextMessages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)

  return {
    messages: nextMessages,
    report: {
      beforeCount: messages.length,
      afterCount: nextMessages.length,
      beforeTokens,
      afterTokens,
      droppedMessageCount: Math.max(0, messages.length - nextMessages.length),
      retainedUserTurns: countUserTurns(compactedDialogue),
    },
  }
}

function trimTextToTokenBudget(text: string, budgetTokens: number, mode: 'head' | 'tail' | 'middle' = 'tail') {
  if (budgetTokens <= 0)
    return ''

  if (estimateTokens(text) <= budgetTokens)
    return text

  const budgetChars = Math.max(0, budgetTokens * 4)
  if (budgetChars <= 0)
    return ''

  if (mode === 'head')
    return text.slice(0, budgetChars)
  if (mode === 'tail')
    return text.slice(Math.max(0, text.length - budgetChars))

  const half = Math.floor(budgetChars / 2)
  const head = text.slice(0, half)
  const tail = text.slice(Math.max(0, text.length - half))
  return `${head}\n...\n${tail}`
}

function extractConfidence(line: string) {
  const match = /confidence\s*=\s*(0(?:\.\d+)?|1(?:\.0+)?)/i.exec(line)
  if (!match?.[1])
    return Number.NaN
  return Number.parseFloat(match[1])
}

function trimMemoryByConfidence(text: string, budgetTokens: number) {
  if (estimateTokens(text) <= budgetTokens)
    return text

  const lines = text.split('\n')
  const fixedLines = lines.filter(line => !/^\s*[-*]\s/.test(line))
  const candidates = lines
    .map((line, index) => ({
      index,
      line,
      removable: /^\s*[-*]\s/.test(line),
      confidence: extractConfidence(line),
    }))
    .filter(item => item.removable)
    .sort((left, right) => {
      const leftScore = Number.isFinite(left.confidence) ? left.confidence : -1
      const rightScore = Number.isFinite(right.confidence) ? right.confidence : -1
      return leftScore - rightScore
    })

  const activeIndexes = new Set<number>(lines.map((_, index) => index))
  for (const candidate of candidates) {
    if (estimateTokens(lines.filter((_, index) => activeIndexes.has(index)).join('\n')) <= budgetTokens)
      break
    activeIndexes.delete(candidate.index)
  }

  const reduced = lines.filter((_, index) => activeIndexes.has(index)).join('\n')
  if (estimateTokens(reduced) <= budgetTokens)
    return reduced

  if (fixedLines.length > 0) {
    const fixedText = fixedLines.join('\n')
    if (estimateTokens(fixedText) > budgetTokens)
      return trimTextToTokenBudget(fixedText, budgetTokens, 'middle')
    return fixedText
  }

  return trimTextToTokenBudget(reduced, budgetTokens, 'middle')
}

function isMemoryMessage(message: Message) {
  const text = readMessageText(message)
  return /Relevant memory facts:/i.test(text) || /confidence\s*=/i.test(text)
}

function estimateSensoryTokens(text: string) {
  const headerIndex = text.indexOf(runtimeSensoryHeader)
  if (headerIndex < 0)
    return 0

  const contractIndex = text.indexOf(runtimeContractAnchorHeader, headerIndex)
  const sensorySegment = contractIndex > headerIndex
    ? text.slice(headerIndex, contractIndex)
    : text.slice(headerIndex)
  return estimateTokens(sensorySegment)
}

function compressRuntimeSensory(text: string, budgetTokens = 48) {
  const headerIndex = text.indexOf(runtimeSensoryHeader)
  if (headerIndex < 0)
    return text

  const contractIndex = text.indexOf(runtimeContractAnchorHeader, headerIndex)
  const sensorySegment = contractIndex > headerIndex
    ? text.slice(headerIndex, contractIndex)
    : text.slice(headerIndex)

  if (estimateTokens(sensorySegment) <= budgetTokens)
    return text

  const degradedSegment = sensorySegment
    .split('\n')
    .map((line) => {
      if (!line.includes('='))
        return line

      return line
        .split(',')
        .map((segment) => {
          const equalsIndex = segment.indexOf('=')
          if (equalsIndex < 0)
            return segment

          const keyPrefix = segment.slice(0, equalsIndex + 1)
          if (!keyPrefix.trim())
            return segment

          return `${keyPrefix}[DEGRADED]`
        })
        .join(',')
    })
    .join('\n')
  const compactedSegment = estimateTokens(degradedSegment) <= budgetTokens
    ? degradedSegment
    : `${runtimeSensoryHeader}\n[System Context: Sensory], telemetry=[DEGRADED]\n\n`

  if (contractIndex > headerIndex) {
    return `${text.slice(0, headerIndex)}${compactedSegment}${text.slice(contractIndex)}`
  }

  return `${text.slice(0, headerIndex)}${compactedSegment}`.trim()
}

function ensureRuntimeContractAnchor(text: string) {
  if (text.includes(runtimeContractAnchorHeader)) {
    return {
      text,
      recovered: false,
    }
  }

  const nextText = text.trim().length > 0
    ? `${text.trimEnd()}\n\n${alicizationFixedStructuredContractAnchor}`
    : alicizationFixedStructuredContractAnchor

  return {
    text: nextText,
    recovered: true,
  }
}

function getLastUserIndex(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user')
      return index
  }
  return -1
}

function parseSoulFrontmatter(content: string) {
  if (!content.startsWith('---\n'))
    return null

  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0)
    return null

  const frontmatterRaw = content.slice(4, secondMarkerIndex).trim()
  if (!frontmatterRaw)
    return null

  try {
    const parsed = JSON.parse(frontmatterRaw) as Record<string, unknown>
    return parsed
  }
  catch {
    return null
  }
}

function readNestedString(payload: Record<string, unknown> | null, path: string[], fallback = '') {
  if (!payload)
    return fallback

  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current))
      return fallback
    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current.trim() : fallback
}

function readNestedNumber(payload: Record<string, unknown> | null, path: string[], fallback = 0) {
  if (!payload)
    return fallback

  let current: unknown = payload
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current))
      return fallback
    current = (current as Record<string, unknown>)[key]
  }

  if (typeof current === 'number' && Number.isFinite(current))
    return current
  if (typeof current === 'string' && current.trim()) {
    const parsed = Number.parseFloat(current)
    if (Number.isFinite(parsed))
      return parsed
  }

  return fallback
}

function formatSafeModePercent(value: number) {
  return Math.min(1, Math.max(0, value)).toFixed(2)
}

function buildSafeModeSoulAnchor(content: string) {
  const frontmatter = parseSoulFrontmatter(content)
  const hostName = readNestedString(frontmatter, ['profile', 'hostName'], defaultAlicizationProfile.hostName)
  const alicizationName = readNestedString(frontmatter, ['profile', 'alicizationName'], defaultAlicizationProfile.alicizationName)
  const relationship = readNestedString(frontmatter, ['profile', 'relationship'], defaultAlicizationProfile.relationship)
  const gender = readNestedString(frontmatter, ['profile', 'gender'], defaultAlicizationProfile.gender)
  const mindAge = readNestedNumber(frontmatter, ['profile', 'mindAge'], defaultAlicizationProfile.mindAge)
  const obedience = readNestedNumber(frontmatter, ['personality', 'obedience'], 0.5)
  const liveliness = readNestedNumber(frontmatter, ['personality', 'liveliness'], 0.5)
  const sensibility = readNestedNumber(frontmatter, ['personality', 'sensibility'], 0.5)

  return [
    '# Alicization SOUL (SAFE MODE)',
    '',
    '[SYSTEM WARNING] SOUL context overflow detected. Current turn is running in safety degradation mode.',
    '',
    'Identity skeleton:',
    `- Name: ${alicizationName}`,
    `- Host: ${hostName}`,
    `- Relationship: ${relationship}`,
    `- Gender: ${gender}`,
    `- Mind age: ${Math.max(1, Math.floor(mindAge))}`,
    `- Personality: obedience=${formatSafeModePercent(obedience)}, liveliness=${formatSafeModePercent(liveliness)}, sensibility=${formatSafeModePercent(sensibility)}`,
    '',
    'Output contract:',
    '- Return one strict JSON object with keys: thought, emotion, reply, performance.',
    '- emotion must exactly mirror performance.baseEmotion.',
    '- performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
    '- Never expose tool names, tool parameters JSON, function calls, or secrets.',
    '- If realtime tool evidence is unavailable in current turn, state unavailability once and do not promise waiting.',
  ].join('\n')
}

export function applyPromptBudget(messages: Message[], options?: PromptBudgetOptions): PromptBudgetResult {
  const cfg = {
    ...defaultPromptBudget,
    ...options,
  }

  const totalBudget = Math.max(512, Math.floor(cfg.totalTokens))
  const soulBudget = Math.max(256, Math.floor(totalBudget * cfg.soulRatio))
  const memoryBudget = Math.floor(totalBudget * cfg.memoryRatio)
  const currentTurnBudget = Math.max(256, totalBudget - soulBudget - memoryBudget)
  const safeModeSoulThreshold = Math.max(256, totalBudget - currentTurnBudget)

  const result = cloneMessages(messages)
  const soulIndex = result.findIndex(message => message.role === 'system')
  const runtimeIndex = result.findIndex((message, index) => index !== soulIndex && message.role === 'system')
  const currentTurnIndex = getLastUserIndex(result)
  const memoryIndex = result.findIndex((message, index) => index !== soulIndex && isMemoryMessage(message))
  let anchorPreserved = true
  let runtimeContractAnchorRecovered = false
  let safeMode: PromptBudgetSafeModeReport = {
    activated: false,
  }

  const sectionBefore = {
    soul: soulIndex >= 0 ? estimateMessageTokens(result[soulIndex]!) : 0,
    memory: memoryIndex >= 0 ? estimateMessageTokens(result[memoryIndex]!) : 0,
    currentTurn: currentTurnIndex >= 0 ? estimateMessageTokens(result[currentTurnIndex]!) : 0,
    sensory: runtimeIndex >= 0 ? estimateSensoryTokens(readMessageText(result[runtimeIndex]!)) : 0,
  }

  if (soulIndex >= 0 && sectionBefore.soul > safeModeSoulThreshold) {
    const soulText = readMessageText(result[soulIndex]!)
    const nextSoulText = buildSafeModeSoulAnchor(soulText)
    result[soulIndex] = writeMessageText(result[soulIndex]!, nextSoulText)
    safeMode = {
      activated: true,
      reason: 'soul-overflow',
      soulTokensBefore: sectionBefore.soul,
      soulTokensAfter: estimateTokens(nextSoulText),
    }
  }

  if (safeMode.activated) {
    const minimalMessages: Message[] = []
    if (soulIndex >= 0 && result[soulIndex]) {
      minimalMessages.push(result[soulIndex]!)
    }
    minimalMessages.push({
      role: 'system',
      content: safeModeRuntimeContractNotice,
    })

    if (currentTurnIndex >= 0 && result[currentTurnIndex]) {
      const currentText = readMessageText(result[currentTurnIndex]!)
      const nextCurrentText = trimTextToTokenBudget(currentText, currentTurnBudget, 'tail')
      minimalMessages.push(writeMessageText(result[currentTurnIndex]!, nextCurrentText))
    }

    const totalBefore = messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)
    const totalAfter = minimalMessages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)

    return {
      messages: minimalMessages,
      report: {
        truncated: totalAfter !== totalBefore,
        totalBeforeTokens: totalBefore,
        totalAfterTokens: totalAfter,
        droppedMessageCount: Math.max(0, messages.length - minimalMessages.length),
        anchorPreserved,
        runtimeContractAnchorRecovered: false,
        safeMode,
        sections: {
          soul: {
            beforeTokens: sectionBefore.soul,
            afterTokens: estimateMessageTokens(minimalMessages[0]!),
          },
          memory: {
            beforeTokens: sectionBefore.memory,
            afterTokens: 0,
          },
          currentTurn: {
            beforeTokens: sectionBefore.currentTurn,
            afterTokens: currentTurnIndex >= 0
              ? estimateMessageTokens(minimalMessages[minimalMessages.length - 1]!)
              : 0,
          },
          sensory: {
            beforeTokens: sectionBefore.sensory,
            afterTokens: 0,
          },
        },
      },
    }
  }

  if (runtimeIndex >= 0) {
    const runtimeText = readMessageText(result[runtimeIndex]!)
    const nextRuntimeText = compressRuntimeSensory(runtimeText)
    result[runtimeIndex] = writeMessageText(result[runtimeIndex]!, nextRuntimeText)
  }

  if (memoryIndex >= 0 && memoryIndex !== runtimeIndex) {
    const memoryText = readMessageText(result[memoryIndex]!)
    const nextMemoryText = trimMemoryByConfidence(memoryText, memoryBudget)
    result[memoryIndex] = writeMessageText(result[memoryIndex]!, nextMemoryText)
  }

  if (currentTurnIndex >= 0) {
    const currentText = readMessageText(result[currentTurnIndex]!)
    const nextCurrentText = trimTextToTokenBudget(currentText, currentTurnBudget, 'tail')
    result[currentTurnIndex] = writeMessageText(result[currentTurnIndex]!, nextCurrentText)
  }

  if (memoryIndex >= 0 && memoryIndex !== runtimeIndex) {
    const protectedSoulTokens = soulIndex >= 0 ? estimateMessageTokens(result[soulIndex]!) : 0
    const protectedCurrentTokens = currentTurnIndex >= 0 ? estimateMessageTokens(result[currentTurnIndex]!) : 0
    const maxMemoryTokens = Math.max(0, totalBudget - protectedSoulTokens - protectedCurrentTokens)
    const currentMemoryText = readMessageText(result[memoryIndex]!)
    if (estimateTokens(currentMemoryText) > maxMemoryTokens) {
      const minimizedMemory = trimMemoryByConfidence(currentMemoryText, maxMemoryTokens)
      result[memoryIndex] = writeMessageText(result[memoryIndex]!, minimizedMemory)
    }
  }

  const isProtectedIndex = (index: number) =>
    [soulIndex, runtimeIndex, memoryIndex, currentTurnIndex].includes(index)

  let droppedMessageCount = 0
  let totalAfter = result.reduce((sum, message) => sum + estimateMessageTokens(message), 0)
  for (let index = 0; totalAfter > totalBudget && index < result.length; index += 1) {
    if (isProtectedIndex(index))
      continue

    const message = result[index]
    if (!message)
      continue

    const removedTokens = estimateMessageTokens(message)
    result[index] = ({
      ...message,
      content: '',
    } as Message)
    droppedMessageCount += 1
    totalAfter -= removedTokens
  }

  if (soulIndex >= 0 && result[soulIndex]) {
    const anchorTextAfter = readMessageText(result[soulIndex]!)
    const anchorTextBefore = readMessageText(messages[soulIndex]!)
    anchorPreserved = anchorTextAfter === anchorTextBefore
  }

  if (runtimeIndex >= 0 && result[runtimeIndex]) {
    const runtimeAnchorCheck = ensureRuntimeContractAnchor(readMessageText(result[runtimeIndex]!))
    if (runtimeAnchorCheck.recovered) {
      runtimeContractAnchorRecovered = true
      result[runtimeIndex] = writeMessageText(result[runtimeIndex]!, runtimeAnchorCheck.text)
    }
  }

  const sectionAfter = {
    soul: soulIndex >= 0 && result[soulIndex] ? estimateMessageTokens(result[soulIndex]!) : 0,
    memory: memoryIndex >= 0 && result[memoryIndex] ? estimateMessageTokens(result[memoryIndex]!) : 0,
    currentTurn: currentTurnIndex >= 0 && result[currentTurnIndex] ? estimateMessageTokens(result[currentTurnIndex]!) : 0,
    sensory: runtimeIndex >= 0 && result[runtimeIndex] ? estimateSensoryTokens(readMessageText(result[runtimeIndex]!)) : 0,
  }

  const compacted = result.filter((message, index) => {
    if (isProtectedIndex(index))
      return true
    return readMessageText(message).trim().length > 0
  })
  const totalBefore = messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)

  return {
    messages: compacted,
    report: {
      truncated: totalBefore > totalBudget || droppedMessageCount > 0,
      totalBeforeTokens: totalBefore,
      totalAfterTokens: compacted.reduce((sum, message) => sum + estimateMessageTokens(message), 0),
      droppedMessageCount,
      anchorPreserved,
      runtimeContractAnchorRecovered,
      safeMode,
      sections: {
        soul: {
          beforeTokens: sectionBefore.soul,
          afterTokens: sectionAfter.soul,
        },
        memory: {
          beforeTokens: sectionBefore.memory,
          afterTokens: sectionAfter.memory,
        },
        currentTurn: {
          beforeTokens: sectionBefore.currentTurn,
          afterTokens: sectionAfter.currentTurn,
        },
        sensory: {
          beforeTokens: sectionBefore.sensory,
          afterTokens: sectionAfter.sensory,
        },
      },
    },
  }
}

function redactChunk(chunk: string) {
  let redactions = 0
  let next = chunk

  for (const pattern of safeRedactionPatterns) {
    next = next.replace(pattern, () => {
      redactions += 1
      return '[REDACTED]'
    })
  }

  for (const pattern of keyValuePatterns) {
    next = next.replace(pattern, (_, key: string) => {
      redactions += 1
      return `${key}[REDACTED]`
    })
  }

  return {
    text: next,
    redactions,
  }
}

function sanitizeText(text: string, options: Required<SanitizeOptions>) {
  if (!text)
    return { text, redactions: 0, timeout: false }

  let redactions = 0
  const chunks: string[] = []
  const startedAt = Date.now()

  for (let offset = 0; offset < text.length; offset += options.chunkSize) {
    if (Date.now() - startedAt > options.timeBudgetMs) {
      return {
        text,
        redactions,
        timeout: true,
      }
    }

    const chunk = text.slice(offset, offset + options.chunkSize)
    const redacted = redactChunk(chunk)
    redactions += redacted.redactions
    chunks.push(redacted.text)
  }

  return {
    text: chunks.join(''),
    redactions,
    timeout: false,
  }
}

export function sanitizeForRemoteModel(messages: Message[], options?: SanitizeOptions): SanitizeResult {
  const cfg = {
    ...defaultSanitizeOptions,
    ...options,
  }

  const startedAt = Date.now()
  const nextMessages = cloneMessages(messages)
  let redactions = 0

  try {
    for (let index = 0; index < nextMessages.length; index += 1) {
      if (Date.now() - startedAt > cfg.timeBudgetMs) {
        return {
          blocked: true,
          reason: 'sanitize-timeout',
          messages,
          redactions,
          elapsedMs: Date.now() - startedAt,
        }
      }

      const message = nextMessages[index]
      if (!message)
        continue

      const text = readMessageText(message)
      const sanitized = sanitizeText(text, cfg)
      if (sanitized.timeout) {
        return {
          blocked: true,
          reason: 'sanitize-timeout',
          messages,
          redactions,
          elapsedMs: Date.now() - startedAt,
        }
      }

      redactions += sanitized.redactions
      nextMessages[index] = writeMessageText(message, sanitized.text)
    }

    return {
      blocked: false,
      messages: nextMessages,
      redactions,
      elapsedMs: Date.now() - startedAt,
    }
  }
  catch {
    return {
      blocked: true,
      reason: 'sanitize-error',
      messages,
      redactions,
      elapsedMs: Date.now() - startedAt,
    }
  }
}

const assistantLeakBlockPatterns = [
  /\{[\s\S]{0,2200}?"name"\s*:\s*"mcp_(?:call_tool|list_tools)"[\s\S]{0,2200}?\}/gi,
  /\{[\s\S]{0,2200}?"toolbench_rapidapi_key"\s*:\s*"[^"]*"[\s\S]{0,2200}?\}/gi,
]

const assistantLeakSecretPatterns = [
  /["']?toolbench_rapidapi_key["']?\s*[:=]\s*["'][^"']*["']/gi,
  /\btoolbench_rapidapi_key\s*[:=]\s*[^\s,}\]]+/gi,
  /\btoolbench_rapidapi_key\b/gi,
]

const assistantLeakKeywordPattern = /\b(?:mcp_call_tool|mcp_list_tools)\b/i
const assistantToolQualifiedNamePattern = /\b[\w-]+::[\w-]+\b/
const assistantLeakJsonSignalPattern = /\b(?:arguments|parameters|tool_calls?|function_call|toolResult|requestId)\b/i
const assistantLeakSyntaxPattern = /[{}[\]"':]/
const assistantFabricationHardLinePatterns = [
  /\bapi\.example\.com\b/i,
  /\b(?:import\s*requests|requests\.get\s*\(|def\s*get_\w+)/i,
  /假设的?\s*api/i,
  /\bhypothetical\s+api\b/i,
]
const assistantFabricationSoftLinePatterns = [
  /我正在调用/,
  /请稍等(?:一下)?/,
  /稍后再?(?:返回|告诉|给你)/,
  /返回(?:具体|最新)?的?(?:信息|结果)/,
  /\bplease\s+wait\b/i,
  /\bi(?:'m| am)\s+calling[^\n]{1,120}api\b/i,
]

function replacePatternWithCounter(
  source: string,
  pattern: RegExp,
  replacement: string,
  counter: { value: number },
) {
  return source.replace(pattern, () => {
    counter.value += 1
    return replacement
  })
}

function normalizeAssistantDisplayText(text: string) {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isAssistantFabricationLine(line: string, options?: AssistantOutputSanitizeOptions) {
  if (assistantFabricationHardLinePatterns.some(pattern => pattern.test(line)))
    return true

  const strictRealtimeGate = Boolean(options?.realtimeIntent && !options?.verifiedToolResult)
  if (!strictRealtimeGate)
    return false

  return assistantFabricationSoftLinePatterns.some(pattern => pattern.test(line))
}

function shouldDropAssistantLine(line: string) {
  if (assistantLeakKeywordPattern.test(line))
    return true

  if (line.includes('[REDACTED]') && assistantLeakSyntaxPattern.test(line))
    return true

  const hasQualifiedToolName = assistantToolQualifiedNamePattern.test(line)
  const hasLeakJsonSignal = assistantLeakJsonSignalPattern.test(line)
  if (hasQualifiedToolName && hasLeakJsonSignal)
    return true

  if (assistantLeakSyntaxPattern.test(line) && hasLeakJsonSignal && /\b(?:name|value)\b/i.test(line))
    return true

  return false
}

export function sanitizeAssistantOutputForDisplay(content: string, options?: AssistantOutputSanitizeOptions): AssistantOutputSanitizeResult {
  if (!content.trim()) {
    return {
      cleanText: '',
      leakDetected: false,
      fabricationDetected: false,
      removedCount: 0,
      fabricationRemovedCount: 0,
      redactedSecrets: 0,
    }
  }

  let working = content.replace(/\r\n/g, '\n')
  const removedCounter = { value: 0 }
  const secretCounter = { value: 0 }
  const fabricationCounter = { value: 0 }

  for (const pattern of assistantLeakBlockPatterns) {
    working = replacePatternWithCounter(working, pattern, ' ', removedCounter)
  }

  for (const pattern of assistantLeakSecretPatterns) {
    working = replacePatternWithCounter(working, pattern, '[REDACTED]', secretCounter)
  }

  const lines = working.split('\n')
  const keptLines: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line)
      continue

    if (shouldDropAssistantLine(line)) {
      removedCounter.value += 1
      continue
    }

    if (isAssistantFabricationLine(line, options)) {
      removedCounter.value += 1
      fabricationCounter.value += 1
      continue
    }

    const normalizedLine = normalizeAssistantDisplayText(line)
    if (normalizedLine)
      keptLines.push(normalizedLine)
  }

  const cleanText = normalizeAssistantDisplayText(keptLines.join('\n'))
  const leakDetected = (removedCounter.value - fabricationCounter.value) > 0 || secretCounter.value > 0
  const fabricationDetected = fabricationCounter.value > 0

  return {
    cleanText,
    leakDetected,
    fabricationDetected,
    removedCount: removedCounter.value,
    fabricationRemovedCount: fabricationCounter.value,
    redactedSecrets: secretCounter.value,
  }
}
