import type { CommonContentPart, Message, UserMessage } from '@xsai/shared-chat'

import { sanitizeText } from './runtime-soul'

export function parseJsonObjectFromText(raw: string) {
  const normalized = sanitizeText(raw, '').trim()
  if (!normalized)
    return null

  try {
    const parsed = JSON.parse(normalized) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

export function readTransportContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    }).join('\n')
  }
  if (content == null)
    return ''
  try {
    return JSON.stringify(content)
  }
  catch {
    return String(content)
  }
}

export function normalizeTransportContentParts(content: unknown): CommonContentPart[] | null {
  if (!Array.isArray(content))
    return null

  const parts: CommonContentPart[] = []
  for (const part of content) {
    if (typeof part === 'string') {
      const text = part.trim()
      if (text)
        parts.push({ type: 'text', text })
      continue
    }

    const candidate = part && typeof part === 'object' ? part as Record<string, unknown> : null
    if (candidate?.type === 'text' && typeof candidate.text === 'string') {
      const text = candidate.text.trim()
      if (text)
        parts.push({ type: 'text', text })
      continue
    }

    const imageUrl = candidate?.image_url
    const url = imageUrl && typeof imageUrl === 'object'
      ? sanitizeText((imageUrl as { url?: unknown }).url)
      : ''
    if (candidate?.type === 'image_url' && url) {
      parts.push({
        type: 'image_url',
        image_url: {
          url,
        },
      } as CommonContentPart)
    }
  }

  return parts.length > 0 ? parts : null
}

export function hasImageTransportContent(content: unknown) {
  return Boolean(normalizeTransportContentParts(content)?.some(part => part.type === 'image_url'))
}

export function normalizeTransportMessageContent(content: unknown): string | CommonContentPart[] {
  if (typeof content === 'string')
    return content

  const parts = normalizeTransportContentParts(content)
  if (parts) {
    if (parts.some(part => part.type === 'image_url'))
      return parts
    return parts
      .filter((part): part is Extract<CommonContentPart, { type: 'text' }> => part.type === 'text')
      .map(part => part.text)
      .join('')
  }

  if (content == null)
    return ''
  try {
    return JSON.stringify(content)
  }
  catch {
    return String(content)
  }
}

export function preserveLatestUserMultimodalContent(input: {
  originalMessages: Array<{ role?: string, content?: unknown }>
  resolvedMessages: Message[]
}) {
  const latestOriginalUser = [...input.originalMessages].reverse().find(message => message?.role === 'user')
  const normalizedOriginalContent = normalizeTransportMessageContent(latestOriginalUser?.content)
  if (!Array.isArray(normalizedOriginalContent) || !normalizedOriginalContent.some(part => part.type === 'image_url'))
    return input.resolvedMessages

  const latestResolvedUserIndex = [...input.resolvedMessages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(entry => entry.message.role === 'user')
    ?.index
  if (typeof latestResolvedUserIndex !== 'number')
    return input.resolvedMessages

  const latestResolvedUser = input.resolvedMessages[latestResolvedUserIndex]
  if (Array.isArray(latestResolvedUser.content) && latestResolvedUser.content.some(part => part?.type === 'image_url'))
    return input.resolvedMessages

  return input.resolvedMessages.map((message, index) => {
    if (index !== latestResolvedUserIndex)
      return message
    return {
      ...(message as UserMessage),
      role: 'user',
      content: normalizedOriginalContent,
    } satisfies UserMessage
  })
}

export function appendContentPartsToLatestUserMessage(messages: Message[], extraParts: CommonContentPart[]) {
  if (extraParts.length === 0)
    return messages

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue

    const existingParts = normalizeTransportContentParts(message.content)
    const stringContent = typeof message.content === 'string'
      ? message.content.trim()
      : ''
    const nextContent = [
      ...(existingParts ?? (stringContent ? [{ type: 'text', text: stringContent } as CommonContentPart] : [])),
      ...extraParts,
    ]
    return [
      ...messages.slice(0, index),
      {
        ...message,
        content: nextContent,
      } as Message,
      ...messages.slice(index + 1),
    ]
  }

  return messages
}
