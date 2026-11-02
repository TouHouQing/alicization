function resolveActionKey(id: string, cue: string) {
  // The speech pipeline appends a transcript and ordinal to its utterance ID.
  // Sentence boundaries and formatting do not authorize another primary gesture.
  const boundary = id.indexOf('|||')
  const ordinal = boundary >= 0 ? /:(\d+)$/u.exec(id)?.[1] : undefined
  if (ordinal === undefined)
    return JSON.stringify(['segment', id, cue])
  return JSON.stringify(['utterance', id.slice(0, boundary).replace(/:gw\d+$/u, '')])
}

/** One primary gesture per spoken utterance; ordinary explicit segments retain their own identity. */
export function createStageActionDelivery() {
  const issued = new Set<string>()
  return {
    claim(segmentId: string | null | undefined, cue: string, turnId?: string | null) {
      if (!segmentId && !turnId)
        return true
      const key = turnId
        ? JSON.stringify(['utterance', turnId.replace(/:gw\d+$/u, '')])
        : resolveActionKey(segmentId!, cue)
      if (issued.has(key))
        return false
      issued.add(key)
      if (issued.size > 256)
        issued.delete(issued.values().next().value!)
      return true
    },
    clear() { issued.clear() },
  }
}
