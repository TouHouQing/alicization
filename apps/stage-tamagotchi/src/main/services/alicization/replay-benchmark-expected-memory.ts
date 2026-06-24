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

function pushReplayExpectedMemoryCueList(cues: string[], raw: unknown, limit = 2) {
  if (!Array.isArray(raw))
    return
  for (const item of raw.slice(0, limit))
    pushReplayExpectedMemoryCue(cues, item)
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
  if (!structuredJson)
    return cues.join(' ').trim().slice(0, 240) || undefined

  try {
    const parsed = JSON.parse(structuredJson) as {
      reply?: unknown
      projectState?: {
        identity?: unknown
        phase?: unknown
        currentPhase?: unknown
        latestLandedProgress?: unknown
        openLoop?: unknown
        primaryOpenLoop?: unknown
        openLoops?: unknown
        nextClosureTarget?: unknown
        sameHerSelfLine?: unknown
        preDialogueAwarenessLine?: unknown
        emotionalClosureCue?: unknown
      } | null
    }
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.identity, 72)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.phase, 72)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.currentPhase, 72)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.nextClosureTarget)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.sameHerSelfLine)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.latestLandedProgress)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.openLoop)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.primaryOpenLoop)
    pushReplayExpectedMemoryCueList(cues, parsed?.projectState?.openLoops)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.preDialogueAwarenessLine)
    pushReplayExpectedMemoryCue(cues, parsed?.projectState?.emotionalClosureCue)
    pushReplayExpectedMemoryCue(deferredSurfaceCues, parsed?.reply)
  }
  catch {
    // NOTICE: Non-JSON structured payloads still fall back to their raw prefix when no better cue exists.
  }

  for (const cue of deferredSurfaceCues)
    pushReplayExpectedMemoryCue(cues, cue)

  if (cues.length > 0)
    return cues.join(' ').trim().slice(0, 240) || undefined
  return structuredJson.slice(0, 240) || undefined
}
