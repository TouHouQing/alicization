function pushReplayExpectedMemoryCue(cues: string[], raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return
  const text = raw.trim()
  if (!text)
    return
  const boundedText = text.length > maxChars
    ? text.slice(0, Math.max(12, maxChars)).trim()
    : text
  if (!boundedText)
    return
  if (cues.some(existing => existing.includes(boundedText) || boundedText.includes(existing)))
    return
  cues.push(boundedText)
}

export function buildReplayBenchmarkExpectedMemory(input: {
  assistantText?: string | null
  structuredJson?: string | null
  visibleText?: string | null
}) {
  const cues: string[] = []
  const deferredSurfaceCues: string[] = []
  pushReplayExpectedMemoryCue(deferredSurfaceCues, input.assistantText)
  pushReplayExpectedMemoryCue(deferredSurfaceCues, input.visibleText)

  const structuredJson = typeof input.structuredJson === 'string'
    ? input.structuredJson.trim()
    : ''
  if (structuredJson) {
    try {
      const parsed = JSON.parse(structuredJson) as {
        reply?: unknown
      }
      pushReplayExpectedMemoryCue(deferredSurfaceCues, parsed?.reply)
    }
    catch {
      // NOTICE: Invalid structured payloads are not treated as memory evidence.
    }
  }

  for (const cue of deferredSurfaceCues)
    pushReplayExpectedMemoryCue(cues, cue)

  return cues.join(' ').trim().slice(0, 240) || undefined
}
