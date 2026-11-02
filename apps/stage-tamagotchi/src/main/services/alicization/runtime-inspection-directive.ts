/** Tool arguments and quoted code are data, never permission to capture a desktop. */
export function projectInspectionDirective(message: string) {
  let hasStructuredContent = false
  const prose = message.replace(/```[\s\S]*?(?:```|$)/gu, () => {
    hasStructuredContent = true
    return ' '
  })
  const parts: string[] = []
  let start = 0
  for (let index = 0; index < prose.length; index++) {
    const opening = prose[index]
    if (opening !== '{' && opening !== '[')
      continue
    const jsonStart = opening === '{' ? /\s*(?:"|\})/uy : /\s*(?:["[\]{}\d-]|true\b|false\b|null\b)/uy
    jsonStart.lastIndex = index + 1
    if (!jsonStart.test(prose))
      continue
    const stack = [opening]
    let quoted = false
    let escaped = false
    let end = index + 1
    for (; end < prose.length; end++) {
      const character = prose[end]
      if (quoted) {
        if (escaped)
          escaped = false
        else if (character === '\\')
          escaped = true
        else if (character === '"')
          quoted = false
        continue
      }
      if (character === '"') {
        quoted = true
      }
      else if (character === '{' || character === '[') {
        stack.push(character)
      }
      else if (character === '}' || character === ']') {
        const expected = character === '}' ? '{' : '['
        if (stack.pop() !== expected || stack.length === 0) {
          end++
          break
        }
      }
    }
    // Incomplete arguments stay opaque too. The original text is still sent
    // unchanged to the dialogue/work runtime; this projection only gates sensing.
    parts.push(prose.slice(start, index), ' ')
    hasStructuredContent = true
    start = end
    index = end - 1
  }
  parts.push(prose.slice(start))
  return { text: parts.join('').trim(), hasStructuredContent }
}

/** Past quoted arguments cannot establish shared attention for a later turn. */
export function projectInspectionMessages(messages: Array<{ role?: string, content?: unknown }>) {
  return messages.map((message) => {
    const content = message.content
    const text = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => {
            if (typeof part === 'string')
              return part
            return part && typeof part === 'object' && typeof part.text === 'string' ? part.text : ''
          }).join('\n')
        : ''
    return { ...message, content: projectInspectionDirective(text).text }
  })
}
