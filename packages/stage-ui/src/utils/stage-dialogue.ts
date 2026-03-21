import type { ChatAssistantMessage, ChatHistoryItem, StreamingAssistantMessage } from '../types/chat'

export type StageBubblePlacement = 'top-left' | 'top-right'

export interface StageDialoguePanelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface StageCharacterFrame {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  anchorY: number
}

export interface StageDialoguePanelBoundsInput {
  containerWidth: number
  containerHeight: number
  characterFrame?: StageCharacterFrame | null
  placement: StageBubblePlacement
  quickReplyEnabled?: boolean
}

export interface StageDialogueRelativeOffset {
  x: number
  y: number
}

export interface StageDialoguePanelSize {
  width: number
  height: number
}

const stageBubbleLegacyMidlineThreshold = 12
const stageDialoguePanelPadding = 18
const stageDialoguePanelCharacterGap = 26
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

function resolveFallbackCharacterFrame(input: StageDialoguePanelBoundsInput): StageCharacterFrame {
  const centerX = input.containerWidth / 2
  const top = clampNumber(input.containerHeight * 0.24, stageDialoguePanelPadding, input.containerHeight - stageDialoguePanelPadding)
  const bottom = clampNumber(input.containerHeight * 0.88, top + 120, input.containerHeight - stageDialoguePanelPadding)
  const width = clampNumber(input.containerWidth * 0.2, 180, Math.max(220, input.containerWidth * 0.34))
  const left = clampNumber(centerX - width / 2, stageDialoguePanelPadding, input.containerWidth - stageDialoguePanelPadding - width)
  const right = left + width
  const height = Math.max(0, bottom - top)

  return {
    left,
    right,
    top,
    bottom,
    centerX,
    anchorY: top + height * 0.18,
  }
}

function normalizeCharacterFrame(input: StageDialoguePanelBoundsInput): StageCharacterFrame {
  const frame = input.characterFrame
  if (!frame)
    return resolveFallbackCharacterFrame(input)

  const left = clampNumber(frame.left, 0, input.containerWidth)
  const right = clampNumber(frame.right, left, input.containerWidth)
  const top = clampNumber(frame.top, 0, input.containerHeight)
  const bottom = clampNumber(frame.bottom, top, input.containerHeight)
  const centerX = clampNumber(frame.centerX, left, right)
  const anchorY = clampNumber(frame.anchorY, top, bottom)

  if (right <= left || bottom <= top)
    return resolveFallbackCharacterFrame(input)

  return {
    left,
    right,
    top,
    bottom,
    centerX,
    anchorY,
  }
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

function resolvePreferredPanelWidth(input: StageDialoguePanelBoundsInput) {
  const safeWidth = Math.max(0, input.containerWidth - stageDialoguePanelPadding * 2)
  return clampNumber(
    input.containerWidth * (input.quickReplyEnabled === false ? 0.28 : 0.34),
    Math.min(stageDialoguePanelMinWidth, safeWidth),
    Math.min(stageDialoguePanelMaxWidth, safeWidth),
  )
}

function resolvePreferredPanelHeight(input: StageDialoguePanelBoundsInput) {
  const minHeight = input.quickReplyEnabled === false ? stageDialoguePanelMinHeight : 220
  return clampNumber(
    input.containerHeight * (input.quickReplyEnabled === false ? 0.24 : 0.34),
    minHeight,
    stageDialoguePanelMaxHeight,
  )
}

function resolveDefaultAnchorPoint(
  input: StageDialoguePanelBoundsInput,
  width: number,
  height: number,
) {
  const frame = normalizeCharacterFrame(input)
  const x = input.placement === 'top-left'
    ? frame.left - stageDialoguePanelCharacterGap - width
    : frame.right + stageDialoguePanelCharacterGap
  const y = frame.anchorY - height * 0.4

  return {
    x,
    y,
  }
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

export function resolveStageBubblePlacement(
  positionOrCharacterFrame: number | StageCharacterFrame | null | undefined,
  containerWidth?: number,
): StageBubblePlacement {
  if (typeof positionOrCharacterFrame === 'number') {
    if (!Number.isFinite(positionOrCharacterFrame))
      return 'top-right'

    if (positionOrCharacterFrame > stageBubbleLegacyMidlineThreshold)
      return 'top-left'

    return 'top-right'
  }

  if (!positionOrCharacterFrame || !containerWidth || !Number.isFinite(containerWidth))
    return 'top-right'

  return positionOrCharacterFrame.centerX > containerWidth / 2 ? 'top-left' : 'top-right'
}

export function resolveStageDialogueDefaultPanelRect(input: StageDialoguePanelBoundsInput): StageDialoguePanelRect {
  const width = resolvePreferredPanelWidth(input)
  const height = clampNumber(
    resolvePreferredPanelHeight(input),
    stageDialoguePanelMinHeight,
    Math.max(stageDialoguePanelMinHeight, input.containerHeight - stageDialoguePanelPadding * 2),
  )
  const anchorPoint = resolveDefaultAnchorPoint(input, width, height)

  return clampStageDialoguePanelRect({
    x: anchorPoint.x,
    y: anchorPoint.y,
    width,
    height,
  }, input)
}

export function resolveStageDialogueAnchoredPanelRect(
  input: StageDialoguePanelBoundsInput,
  options: {
    offset?: StageDialogueRelativeOffset
    size?: Partial<StageDialoguePanelSize>
  } = {},
): StageDialoguePanelRect {
  const defaultRect = resolveStageDialogueDefaultPanelRect(input)
  const width = options.size?.width ?? defaultRect.width
  const height = options.size?.height ?? defaultRect.height
  const anchorPoint = resolveDefaultAnchorPoint(input, width, height)

  return clampStageDialoguePanelRect({
    x: anchorPoint.x + (options.offset?.x ?? 0),
    y: anchorPoint.y + (options.offset?.y ?? 0),
    width,
    height,
  }, input)
}

export function clampStageDialoguePanelRect(
  rect: StageDialoguePanelRect,
  input: StageDialoguePanelBoundsInput,
): StageDialoguePanelRect {
  const maxWidth = Math.max(
    stageDialoguePanelMinWidth,
    Math.min(stageDialoguePanelMaxWidth, input.containerWidth - stageDialoguePanelPadding * 2 - stageDialoguePanelChromeWidth),
  )
  const maxHeight = Math.max(
    stageDialoguePanelMinHeight,
    Math.min(stageDialoguePanelMaxHeight, input.containerHeight - stageDialoguePanelPadding * 2),
  )
  const width = clampNumber(rect.width, stageDialoguePanelMinWidth, maxWidth)
  const height = clampNumber(rect.height, stageDialoguePanelMinHeight, maxHeight)
  const minX = stageDialoguePanelPadding
  const maxX = Math.max(minX, input.containerWidth - stageDialoguePanelPadding - stageDialoguePanelChromeWidth - width)
  const minY = stageDialoguePanelPadding
  const maxY = Math.max(minY, input.containerHeight - stageDialoguePanelPadding - height)
  const x = clampNumber(rect.x, minX, maxX)
  const y = clampNumber(rect.y, minY, maxY)

  return { x, y, width, height }
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
