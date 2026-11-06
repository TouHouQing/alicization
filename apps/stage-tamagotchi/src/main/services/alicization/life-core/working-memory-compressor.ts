import type { WorkingMemoryEpisodelet, WorkingMemorySnapshot } from './working-memory'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import { uniqueWorkingMemoryTexts } from './working-memory'
import { findWorkingMemoryCut, selectWorkingMemorySentences, workingMemoryMeaningScore, workingMemoryRetention } from './working-memory-retention'

export interface CompressWorkingMemoryOptions {
  maxRawTurns?: number
  maxRawBytes?: number
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

  const text = selectWorkingMemorySentences(turn.text, 500)
  if (!text)
    return ''
  if (looksLikeFixedFallbackTemplate(text))
    return ''

  return `${turn.role}:${text}`
}

function summarizeTurns(turns: WorkingMemorySnapshot['recentRawTurns']) {
  return selectWorkingMemorySentences(turns
    .map(summarizeTurn)
    .filter(Boolean)
    .join(' | '), 1800)
}

export function boundWorkingMemoryTimeline(items: WorkingMemoryEpisodelet[]): WorkingMemoryEpisodelet[] {
  if (items.length <= workingMemoryRetention.maxTimelineItems)
    return items
  const older = items.slice(0, items.length - workingMemoryRetention.maxTimelineItems + 1)
  const lines = (key: 'commitments' | 'corrections' | 'unresolvedQuestions') => uniqueWorkingMemoryTexts(older.flatMap(item => item[key]), 12, 260)
  const ranked = [...older].sort((left, right) => right.importance - left.importance || right.createdAt - left.createdAt)
  const evidence = ranked.flatMap(item => item.evidence ?? []).filter((item, index, values) => values.findIndex(other => other.turnId === item.turnId && other.quote === item.quote) === index).slice(0, workingMemoryRetention.maxEvidenceItems)
  const first = older[0]!
  const last = older.at(-1)!
  const rollup: WorkingMemoryEpisodelet = {
    id: `${first.id}:rollup`,
    sourceTurnIds: uniqueWorkingMemoryTexts([...evidence.map(item => item.turnId), ...older.flatMap(item => item.sourceTurnIds)], 512, 160),
    summary: selectWorkingMemorySentences(ranked.map(item => item.summary).join(' | '), 1800),
    thread: last.thread,
    unresolvedQuestions: lines('unresolvedQuestions'),
    commitments: lines('commitments'),
    corrections: lines('corrections'),
    relationshipPosture: last.relationshipPosture,
    emotionalPosture: last.emotionalPosture,
    executionCarry: last.executionCarry,
    importance: Math.max(...older.map(item => item.importance)),
    createdAt: last.createdAt,
    evidence,
    method: 'extractive',
  }
  return [rollup, ...items.slice(older.length)]
}

export function compressWorkingMemorySnapshot(
  snapshot: WorkingMemorySnapshot,
  options: CompressWorkingMemoryOptions,
): WorkingMemorySnapshot {
  const splitIndex = findWorkingMemoryCut(snapshot.recentRawTurns, options)
  if (splitIndex === 0)
    return snapshot
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
    importance: Math.max(0.4, ...olderTurns.filter(turn => !turn.failureKind && !turn.contaminated).map(turn => Math.max(Math.min(0.8, turn.importance), workingMemoryMeaningScore(turn.text)))),
    createdAt: options.now,
    evidence: olderTurns
      .filter(turn => turn.visibility === 'user-visible' && !turn.failureKind && !turn.failureSurface && !turn.contaminated && !looksLikeFixedFallbackTemplate(turn.text))
      .map(turn => ({ turnId: turn.turnId, role: turn.role, quote: selectWorkingMemorySentences(turn.text, 700), occurredAt: turn.createdAt }))
      .filter(item => item.quote)
      .slice(-workingMemoryRetention.maxEvidenceItems),
    method: 'extractive',
  }

  return {
    ...snapshot,
    recentRawTurns: retainedTurns,
    compressedTimeline: boundWorkingMemoryTimeline([...snapshot.compressedTimeline, episodelet]),
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
