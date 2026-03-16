import type { ChatAssistantMessage, ChatHistoryItem, StreamingAssistantMessage } from '../types/chat'

export type StageBubblePlacement = 'top-left' | 'top-right'
export interface StageDialoguePanelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface StageDialoguePanelBoundsInput {
  containerWidth: number
  containerHeight: number
  characterOffsetX?: number
  placement: StageBubblePlacement
  quickReplyEnabled?: boolean
}

const stageBubbleMidlineThreshold = 12
const stageDialoguePanelPadding = 18
const stageDialoguePanelGuardGap = 26
const stageDialoguePanelGuardWidthRatio = 0.32
const stageDialoguePanelMinWidth = 220
const stageDialoguePanelMaxWidth = 460
const stageDialoguePanelMinHeight = 160
const stageDialoguePanelMaxHeight = 420
export const stageDialogueOrbSize = 72
export const stageDialoguePanelChromeWidth = 0

type StageBubbleMessage = ChatHistoryItem | ChatAssistantMessage | StreamingAssistantMessage | null | undefined

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min
  if (min > max)
    return min
  return Math.min(max, Math.max(min, value))
}

function resolveDialogueCharacterCenterX(containerWidth: number, characterOffsetX = 0) {
  const center = containerWidth * (0.5 + characterOffsetX / 100)
  return clampNumber(center, containerWidth * 0.2, containerWidth * 0.8)
}

function resolveDialogueGuardWidth(containerWidth: number) {
  return clampNumber(containerWidth * stageDialoguePanelGuardWidthRatio, 160, 420)
}

function resolveDialogueLaneRange(input: StageDialoguePanelBoundsInput, width: number) {
  const safeWidth = Math.max(0, input.containerWidth - stageDialoguePanelPadding * 2)
  const nextWidth = clampNumber(width, Math.min(stageDialoguePanelMinWidth, safeWidth), Math.min(stageDialoguePanelMaxWidth, safeWidth))
  const centerX = resolveDialogueCharacterCenterX(input.containerWidth, input.characterOffsetX)
  const guardHalfWidth = resolveDialogueGuardWidth(input.containerWidth) / 2

  if (input.placement === 'top-left') {
    const minX = stageDialoguePanelPadding + stageDialoguePanelChromeWidth
    const maxX = Math.max(minX, centerX - guardHalfWidth - stageDialoguePanelGuardGap - nextWidth)
    return { minX, maxX, width: nextWidth }
  }

  const minX = Math.min(
    Math.max(stageDialoguePanelPadding, centerX + guardHalfWidth + stageDialoguePanelGuardGap),
    Math.max(stageDialoguePanelPadding, input.containerWidth - stageDialoguePanelPadding - stageDialoguePanelChromeWidth - nextWidth),
  )
  const maxX = Math.max(minX, input.containerWidth - stageDialoguePanelPadding - stageDialoguePanelChromeWidth - nextWidth)
  return { minX, maxX, width: nextWidth }
}

function resolveDialogueFloatingRange(input: StageDialoguePanelBoundsInput, width: number) {
  const safeWidth = Math.max(0, input.containerWidth - stageDialoguePanelPadding * 2 - stageDialoguePanelChromeWidth)
  const nextWidth = clampNumber(width, Math.min(stageDialoguePanelMinWidth, safeWidth), Math.min(stageDialoguePanelMaxWidth, safeWidth))

  if (input.placement === 'top-left') {
    const minX = stageDialoguePanelPadding + stageDialoguePanelChromeWidth
    const maxX = Math.max(minX, input.containerWidth - stageDialoguePanelPadding - nextWidth)
    return { minX, maxX, width: nextWidth }
  }

  const minX = stageDialoguePanelPadding
  const maxX = Math.max(minX, input.containerWidth - stageDialoguePanelPadding - stageDialoguePanelChromeWidth - nextWidth)
  return { minX, maxX, width: nextWidth }
}

function readContentText(content: ChatAssistantMessage['content']) {
  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String(part.text ?? '')
      return ''
    })
    .join('')
}

function readReplyFromStructuredPayloadText(text: string) {
  const trimmed = text.trim()
  if (!trimmed)
    return ''

  const candidate = unwrapStructuredReplyFence(trimmed)

  if (!candidate.startsWith('{') || !candidate.endsWith('}'))
    return ''

  try {
    const parsed = JSON.parse(candidate) as { reply?: unknown }
    if (typeof parsed.reply === 'string')
      return parsed.reply.trim()
  }
  catch {
  }

  return ''
}

function unwrapStructuredReplyFence(text: string) {
  if (!text.startsWith('```'))
    return text

  const lines = text.split('\n')
  if (lines.length < 3)
    return text

  const openingFence = lines[0]?.trim().toLowerCase()
  const closingFence = lines.at(-1)?.trim()

  if (!openingFence || (openingFence !== '```' && openingFence !== '```json') || closingFence !== '```')
    return text

  return lines.slice(1, -1).join('\n').trim()
}

function normalizeBubbleText(text: string) {
  if (!text.trim())
    return ''

  const structuredReply = readReplyFromStructuredPayloadText(text)
  return structuredReply || text.trim()
}

export function resolveStageBubbleText(message: StageBubbleMessage) {
  if (!message || message.role !== 'assistant')
    return ''

  if ('structured' in message && typeof message.structured?.reply === 'string' && message.structured.reply.trim())
    return message.structured.reply.trim()

  if ('categorization' in message && typeof message.categorization?.speech === 'string' && message.categorization.speech.trim())
    return message.categorization.speech.trim()

  if ('slices' in message && Array.isArray(message.slices)) {
    const sliceText = message.slices
      .filter(slice => slice.type === 'text')
      .map(slice => slice.text)
      .join('')

    const normalizedSliceText = normalizeBubbleText(sliceText)
    if (normalizedSliceText)
      return normalizedSliceText
  }

  return normalizeBubbleText(readContentText(message.content))
}

export function resolveStageBubblePlacement(positionX: number): StageBubblePlacement {
  if (!Number.isFinite(positionX))
    return 'top-right'

  if (positionX > stageBubbleMidlineThreshold)
    return 'top-left'

  return 'top-right'
}

export function resolveStageDialogueDefaultPanelRect(input: StageDialoguePanelBoundsInput): StageDialoguePanelRect {
  const preferredWidth = clampNumber(
    input.containerWidth * (input.quickReplyEnabled === false ? 0.28 : 0.34),
    stageDialoguePanelMinWidth,
    stageDialoguePanelMaxWidth,
  )
  const { minX, maxX, width } = resolveDialogueLaneRange(input, preferredWidth)
  const preferredHeight = clampNumber(
    input.containerHeight * (input.quickReplyEnabled === false ? 0.24 : 0.34),
    input.quickReplyEnabled === false ? stageDialoguePanelMinHeight : 220,
    stageDialoguePanelMaxHeight,
  )
  const height = clampNumber(
    preferredHeight,
    stageDialoguePanelMinHeight,
    Math.max(stageDialoguePanelMinHeight, input.containerHeight - stageDialoguePanelPadding * 2),
  )
  const y = clampNumber(
    input.containerHeight * 0.08,
    stageDialoguePanelPadding,
    Math.max(stageDialoguePanelPadding, input.containerHeight - stageDialoguePanelPadding - height),
  )
  const x = input.placement === 'top-left' ? maxX : minX

  return { x, y, width, height }
}

export function clampStageDialoguePanelRect(
  rect: StageDialoguePanelRect,
  input: StageDialoguePanelBoundsInput,
): StageDialoguePanelRect {
  const maxHeight = Math.max(
    stageDialoguePanelMinHeight,
    Math.min(stageDialoguePanelMaxHeight, input.containerHeight - stageDialoguePanelPadding * 2),
  )
  const height = clampNumber(rect.height, stageDialoguePanelMinHeight, maxHeight)
  const { minX, maxX, width } = resolveDialogueFloatingRange(input, rect.width)
  const minY = stageDialoguePanelPadding
  const maxY = Math.max(minY, input.containerHeight - stageDialoguePanelPadding - height)
  const x = clampNumber(rect.x, minX, maxX)
  const y = clampNumber(rect.y, minY, maxY)

  return {
    x,
    y,
    width,
    height,
  }
}

export function clampStageDialogueOrbRect(
  rect: StageDialoguePanelRect,
  input: StageDialoguePanelBoundsInput,
): StageDialoguePanelRect {
  const minX = stageDialoguePanelPadding
  const maxX = Math.max(minX, input.containerWidth - stageDialoguePanelPadding - stageDialogueOrbSize)
  const minY = stageDialoguePanelPadding
  const maxY = Math.max(minY, input.containerHeight - stageDialoguePanelPadding - stageDialogueOrbSize)

  return {
    x: clampNumber(rect.x, minX, maxX),
    y: clampNumber(rect.y, minY, maxY),
    width: stageDialogueOrbSize,
    height: stageDialogueOrbSize,
  }
}
