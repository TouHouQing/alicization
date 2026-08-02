import type { WorkingMemoryEpisodelet, WorkingMemorySnapshot } from './working-memory'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import { normalizeWorkingMemoryText, uniqueWorkingMemoryTexts } from './working-memory'

export interface CompressWorkingMemoryOptions {
  maxRawTurns?: number
  now: number
}

function looksLikeFixedFallbackTemplate(text: string) {
  return containsAlicizationFixedTemplateResidue(text, {
    origin: 'internal-structured-fact',
  })
}

function summarizeTurn(turn: WorkingMemorySnapshot['recentRawTurns'][number]) {
  if (turn.failureKind)
    return `${turn.role}:[failure:${turn.failureKind}]`

  const text = normalizeWorkingMemoryText(turn.text, 120)
  if (!text)
    return ''
  if (looksLikeFixedFallbackTemplate(text))
    return ''

  return `${turn.role}:${text}`
}

function summarizeTurns(turns: WorkingMemorySnapshot['recentRawTurns']) {
  return turns
    .map(summarizeTurn)
    .filter(Boolean)
    .join(' | ')
    .slice(0, 700)
}

export function compressWorkingMemorySnapshot(
  snapshot: WorkingMemorySnapshot,
  options: CompressWorkingMemoryOptions,
): WorkingMemorySnapshot {
  const maxRawTurns = Math.max(2, Math.floor(options.maxRawTurns ?? 8))
  if (snapshot.recentRawTurns.length <= maxRawTurns)
    return snapshot

  const splitIndex = snapshot.recentRawTurns.length - maxRawTurns
  const olderTurns = snapshot.recentRawTurns.slice(0, splitIndex)
  const retainedTurns = snapshot.recentRawTurns.slice(splitIndex)
  const sourceTurnIds = olderTurns.map(turn => turn.turnId).filter(Boolean)
  const olderIdSet = new Set(sourceTurnIds)
  const episodelet: WorkingMemoryEpisodelet = {
    id: `wm-episodelet:${snapshot.sessionId}:${options.now}`,
    sourceTurnIds,
    summary: summarizeTurns(olderTurns),
    thread: snapshot.currentThread?.title ?? null,
    unresolvedQuestions: snapshot.unresolvedQuestions
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    commitments: snapshot.commitments
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    corrections: snapshot.userCorrections
      .filter(item => !item.sourceTurnId || olderIdSet.has(item.sourceTurnId))
      .map(item => item.text),
    relationshipPosture: snapshot.relationshipPosture?.summary ?? null,
    emotionalPosture: snapshot.emotionalPosture?.summary ?? null,
    executionCarry: snapshot.executionState?.summary ?? null,
    importance: Math.max(0.4, ...olderTurns.map(turn => turn.importance)),
    createdAt: options.now,
  }

  return {
    ...snapshot,
    recentRawTurns: retainedTurns,
    compressedTimeline: [...snapshot.compressedTimeline, episodelet],
    compression: {
      level: retainedTurns.length <= 2 ? 'heavy' : 'light',
      sourceTurnIds: uniqueWorkingMemoryTexts([
        ...snapshot.compression.sourceTurnIds,
        ...sourceTurnIds,
      ], 200, 160),
      lastCompressedAt: options.now,
    },
    updatedAt: options.now,
  }
}
