import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

function normalizeText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (!Array.isArray(content))
    return ''

  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (part && typeof part === 'object' && 'text' in part)
      return normalizeText((part as { text?: unknown }).text)
    return ''
  }).filter(Boolean).join('\n')
}

function readLatestUserMessageText(prepared?: AlicizationPreparedMainChatExecutionResult | null) {
  const messages = Array.isArray(prepared?.messages)
    ? prepared.messages
    : []
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return normalizeText(readMessageContentAsText(message.content))
  }
  return ''
}

function isExplicitSameHerMemoryClosureInvitation(text: string) {
  const normalized = normalizeText(text)
  if (!normalized)
    return false

  const hasSameHer = /同一个她|同一个数字生命|same-her|same her|same digital life|one continuous her/u.test(normalized)
  const hasPhaseOne = /phase\s*1|phase1|第一阶段|local digital life/u.test(normalized)
  const hasMemoryClosure = /记忆闭环|memory closure|memory loop|recall surfaced|why recall|记忆.*浮现|memory.*surface/u.test(normalized)
  const asksForSurfacingReason = /请说明|说明|为什么|why recall|recall surfaced now|浮现时|自然浮现|surfaced? now/u.test(normalized)
  const seedsCurrentTurnForFutureSurfacing = /第一轮|首轮|first turn|round one/u.test(normalized)
    && /请记住|记住|remember this|keep this|seed/u.test(normalized)
    && /下一轮|下轮|next turn|later turn|后续|之后|跨轮/u.test(normalized)
    && /浮现|surface|recall surfaced/u.test(normalized)
  const continuityLaneCount = [
    /情绪|余波|afterglow/u,
    /主动|initiative|低压|lower-pressure/u,
    /身体|body|声音|声线|voice|表情|脸部|face|动作|motion|口型|lipsync|lip sync|停顿|pause/u,
  ].filter(pattern => pattern.test(normalized)).length

  if (seedsCurrentTurnForFutureSurfacing)
    return false

  return hasSameHer
    && hasPhaseOne
    && hasMemoryClosure
    && asksForSurfacingReason
    && continuityLaneCount >= 2
}

function containsBoundedSameHerMemoryClosurePayoff(text: string) {
  const normalized = normalizeText(text)
  if (!normalized)
    return false

  const hasSameHerMemoryClosure = (
    /同一个她|同一个数字生命|same-her|same her|same digital life|one continuous her/u.test(normalized)
    && /记忆|memory|recall|回忆/u.test(normalized)
    && /闭环|closure|phase\s*1|phase1|local digital life/u.test(normalized)
  )
  const explainsSurfacing = /因为|为什么|why recall|浮现|surfaced|surface/u.test(normalized)
  const carriesAfterglow = /情绪余波|情绪|afterglow|余波/u.test(normalized)
  const carriesInitiative = /轻主动|主动|initiative|低压|lower-pressure/u.test(normalized)
  const embodimentLaneCount = [
    /身体|body/u,
    /声音|声线|voice/u,
    /表情|脸部|face/u,
    /动作|motion/u,
    /口型|lipsync|lip sync/u,
    /停顿|pause/u,
  ].filter(pattern => pattern.test(normalized)).length

  return hasSameHerMemoryClosure
    && explainsSurfacing
    && carriesAfterglow
    && carriesInitiative
    && embodimentLaneCount >= 3
}

export function isExplicitSameHerMemoryClosureDialogue(input: {
  visibleText: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  return isExplicitSameHerMemoryClosureInvitation(readLatestUserMessageText(input.prepared))
    && containsBoundedSameHerMemoryClosurePayoff(input.visibleText)
}
