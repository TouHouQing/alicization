export function readLifeInputText(message: Record<string, unknown> | null) {
  if (!message)
    return { text: null, hasAttachments: false }
  if (typeof message.content === 'string')
    return { text: message.content, hasAttachments: false }
  const parts = Array.isArray(message.content) ? message.content : []
  return { text: parts.flatMap(part => part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string' ? [part.text] : []).join('\n'), hasAttachments: parts.some(part => part && typeof part === 'object' && part.type !== 'text') }
}
