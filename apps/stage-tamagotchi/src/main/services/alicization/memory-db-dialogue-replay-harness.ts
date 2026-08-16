import type { AlicizationMemoryDialogueReplayStageDetails } from '@proj-alicization/stage-shared'

import type { WorkingMemoryLongTermEvidence, WorkingMemorySnapshot } from './life-core/working-memory'
import type { WorkingMemoryRecentTurnInput } from './life-core/working-memory-builder'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type { AlicizationMainChatMemoryContext } from './main-chat-memory-context'

import { errorMessageFrom } from '@moeru/std'

import { buildWorkingMemorySnapshot } from './life-core/working-memory-builder'
import { compressWorkingMemorySnapshot } from './life-core/working-memory-compressor'
import { buildWorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'

export interface MemoryDialogueReplayRecallInput {
  cardId: string
  userId?: string
  currentUserText: string
  workingMemoryQueryHints?: string[]
  currentThreadTitle?: string | null
  activeTask?: string | null
  limit?: number
}

export interface MemoryDialogueReplayDatabase {
  getWorkingMemoryCheckpoint: (
    cardId: string,
    sessionId: string,
  ) => Promise<WorkingMemorySnapshot | null>
  upsertWorkingMemoryCheckpoint: (
    snapshot: WorkingMemorySnapshot,
  ) => Promise<void>
  retrieveLongTermMemoryEvidence: (
    input: MemoryDialogueReplayRecallInput,
  ) => Promise<LongTermMemoryEvidenceBundle>
  readPersonaState?: () => Promise<unknown>
  persistPersonaState?: (next: unknown) => Promise<void>
}

export interface MemoryDialogueReplayProviderMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface MemoryDialogueReplayProviderInput {
  turnId: string
  messages: MemoryDialogueReplayProviderMessage[]
  memoryContext: AlicizationMainChatMemoryContext
  workingMemory: WorkingMemorySnapshot
  recalledMemory: LongTermMemoryEvidenceBundle
}

export interface MemoryDialogueReplayProviderOutput {
  text: string
  memoryEvidence?: WorkingMemoryLongTermEvidence | null
  personaState?: unknown
}

export interface MemoryDialogueReplayProviderAdapter {
  generate: (
    input: MemoryDialogueReplayProviderInput,
  ) => Promise<MemoryDialogueReplayProviderOutput>
}

export interface MemoryDialogueReplayTurnInput {
  turnId: string
  userText: string
  now: number
  recentTurns?: WorkingMemoryRecentTurnInput[]
}

export interface MemoryDialogueReplayInput {
  id: string
  cardId: string
  sessionId: string
  userId: string
  turns: MemoryDialogueReplayTurnInput[]
  db: MemoryDialogueReplayDatabase
  provider: MemoryDialogueReplayProviderAdapter
  maxRawTurns?: number
  recallLimit?: number
}

export type MemoryDialogueReplayStageName
  = | 'hydration'
    | 'compression'
    | 'context-assembly'
    | 'recall'
    | 'provider-adapter'
    | 'commit'

export interface MemoryDialogueReplayStage {
  name: MemoryDialogueReplayStageName
  status: 'succeeded' | 'failed'
  details: AlicizationMemoryDialogueReplayStageDetails
  error: string | null
}

export interface MemoryDialogueReplayWriteback {
  checkpoint: 'written' | 'skipped'
  persona: 'written' | 'skipped'
}

export interface MemoryDialogueReplayTurnReport {
  turnId: string
  status: 'succeeded' | 'failed'
  providerOutput: string | null
  providerMessages: MemoryDialogueReplayProviderMessage[]
  recalledEvidenceIds: string[]
  stages: MemoryDialogueReplayStage[]
  writeback: MemoryDialogueReplayWriteback
  error: string | null
}

export interface MemoryDialogueReplayReport {
  version: 'memory-db-dialogue-replay-report-v1'
  id: string
  passed: boolean
  createdAt: number
  summary: {
    turnCount: number
    succeededTurnCount: number
    failedTurnCount: number
    checkpointWriteCount: number
    personaWriteCount: number
    recalledEvidenceCount: number
    lastError: string | null
  }
  turns: MemoryDialogueReplayTurnReport[]
}

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
}

function errorText(error: unknown) {
  return errorMessageFrom(error)?.trim() || String(error ?? 'Unknown replay error')
}

function createStage(
  name: MemoryDialogueReplayStageName,
  details: AlicizationMemoryDialogueReplayStageDetails,
): MemoryDialogueReplayStage {
  return {
    name,
    status: 'succeeded',
    details,
    error: null,
  }
}

function createFailedStage(
  name: MemoryDialogueReplayStageName,
  error: unknown,
  details: AlicizationMemoryDialogueReplayStageDetails = {},
): MemoryDialogueReplayStage {
  return {
    name,
    status: 'failed',
    details,
    error: errorText(error),
  }
}

function hasCompressionChanged(
  snapshot: WorkingMemorySnapshot,
  now: number,
) {
  return snapshot.compression.level !== 'none'
    && snapshot.compression.lastCompressedAt === now
    && snapshot.compression.sourceTurnIds.length > 0
}

function buildProviderMessages(
  memoryContext: AlicizationMainChatMemoryContext,
  userText: string,
): MemoryDialogueReplayProviderMessage[] {
  return [
    {
      role: 'system',
      content: memoryContext.providerSystemBlock,
    },
    {
      role: 'user',
      content: userText,
    },
  ]
}

function buildWorkingMemoryForTurn(input: {
  replay: MemoryDialogueReplayInput
  turn: MemoryDialogueReplayTurnInput
  previousSnapshot: WorkingMemorySnapshot | null
  assistantText?: string | null
  memoryEvidence?: WorkingMemoryLongTermEvidence | null
}) {
  const snapshot = buildWorkingMemorySnapshot({
    cardId: input.replay.cardId,
    sessionId: input.replay.sessionId,
    now: input.turn.now,
    currentUserText: input.turn.userText,
    currentTurnId: input.turn.turnId,
    currentAssistantText: input.assistantText ?? null,
    currentLearningPolicy: {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    },
    currentMemoryEvidence: input.memoryEvidence ?? null,
    recentTurns: input.turn.recentTurns,
    previousSnapshot: input.previousSnapshot,
  })
  return compressWorkingMemorySnapshot(snapshot, {
    now: input.turn.now,
    maxRawTurns: input.replay.maxRawTurns ?? 6,
  })
}

async function replayTurn(input: {
  replay: MemoryDialogueReplayInput
  turn: MemoryDialogueReplayTurnInput
}): Promise<MemoryDialogueReplayTurnReport> {
  const { replay, turn } = input
  const stages: MemoryDialogueReplayStage[] = []
  const writeback: MemoryDialogueReplayWriteback = {
    checkpoint: 'skipped',
    persona: 'skipped',
  }
  let hydratedSnapshot: WorkingMemorySnapshot | null = null

  try {
    hydratedSnapshot = await replay.db.getWorkingMemoryCheckpoint(
      replay.cardId,
      replay.sessionId,
    )
    stages.push(createStage('hydration', {
      source: 'persistent-working-memory-checkpoint',
      found: hydratedSnapshot !== null,
      updatedAt: hydratedSnapshot?.updatedAt ?? null,
    }))
  }
  catch (error) {
    stages.push(createFailedStage('hydration', error))
    return {
      turnId: turn.turnId,
      status: 'failed',
      providerOutput: null,
      providerMessages: [],
      recalledEvidenceIds: [],
      stages,
      writeback,
      error: errorText(error),
    }
  }

  let workingMemory: WorkingMemorySnapshot
  try {
    workingMemory = buildWorkingMemoryForTurn({
      replay,
      turn,
      previousSnapshot: hydratedSnapshot,
    })
    stages.push(createStage('compression', {
      changed: hasCompressionChanged(workingMemory, turn.now),
      level: workingMemory.compression.level,
      sourceTurnIds: workingMemory.compression.sourceTurnIds,
      compressedEpisodeletCount: workingMemory.compressedTimeline.length,
      retainedRawTurnCount: workingMemory.recentRawTurns.length,
      maxRawTurns: Math.max(2, Math.floor(replay.maxRawTurns ?? 6)),
    }))
  }
  catch (error) {
    stages.push(createFailedStage('compression', error))
    return {
      turnId: turn.turnId,
      status: 'failed',
      providerOutput: null,
      providerMessages: [],
      recalledEvidenceIds: [],
      stages,
      writeback,
      error: errorText(error),
    }
  }

  let initialMemoryContext: AlicizationMainChatMemoryContext
  try {
    initialMemoryContext = buildAlicizationMainChatMemoryContext({
      workingMemory: buildWorkingMemoryOwnerContext(workingMemory),
      workingMemorySnapshot: workingMemory,
      longTermRecall: null,
    })
    stages.push(createStage('context-assembly', {
      owner: 'main-chat-memory-context',
      providerSystemBlockType: 'alicization-turn-memory-context',
      preRecallEvidenceCount: 0,
      workingMemoryCompressedEpisodeletCount: initialMemoryContext.workingMemory.compressedTimeline.length,
      workingMemoryObligationCount: initialMemoryContext.workingMemory.rememberedItems.length,
    }))
  }
  catch (error) {
    stages.push(createFailedStage('context-assembly', error))
    return {
      turnId: turn.turnId,
      status: 'failed',
      providerOutput: null,
      providerMessages: [],
      recalledEvidenceIds: [],
      stages,
      writeback,
      error: errorText(error),
    }
  }

  let recalledMemory: LongTermMemoryEvidenceBundle
  try {
    recalledMemory = await replay.db.retrieveLongTermMemoryEvidence({
      cardId: replay.cardId,
      userId: replay.userId,
      currentUserText: turn.userText,
      workingMemoryQueryHints: workingMemory.memoryQueryHints,
      currentThreadTitle: initialMemoryContext.workingMemory.current.threadTitle,
      activeTask: initialMemoryContext.workingMemory.current.activeTask,
      limit: replay.recallLimit ?? 5,
    })
    stages.push(createStage('recall', {
      source: 'persistent-long-term-memory-recall',
      status: recalledMemory.evidence.length > 0 ? 'recalled' : 'empty',
      evidenceIds: recalledMemory.evidence.map(item => item.candidate.id),
      confidence: recalledMemory.confidence,
      query: recalledMemory.plan.normalizedQuery,
    }))
  }
  catch (error) {
    stages.push(createFailedStage('recall', error))
    return {
      turnId: turn.turnId,
      status: 'failed',
      providerOutput: null,
      providerMessages: [],
      recalledEvidenceIds: [],
      stages,
      writeback,
      error: errorText(error),
    }
  }

  const providerMemoryContext = buildAlicizationMainChatMemoryContext({
    workingMemory: buildWorkingMemoryOwnerContext(workingMemory),
    workingMemorySnapshot: workingMemory,
    longTermRecall: recalledMemory,
  })
  const providerMessages = buildProviderMessages(
    providerMemoryContext,
    turn.userText,
  )

  try {
    const providerOutput = await replay.provider.generate({
      turnId: turn.turnId,
      messages: providerMessages,
      memoryContext: providerMemoryContext,
      workingMemory,
      recalledMemory,
    })
    const assistantText = normalizeText(providerOutput.text, 4_000)
    if (!assistantText)
      throw new Error('provider adapter returned empty text')
    stages.push(createStage('provider-adapter', {
      providerOutputLength: assistantText.length,
      recalledEvidenceCount: recalledMemory.evidence.length,
    }))

    const committedWorkingMemory = buildWorkingMemoryForTurn({
      replay,
      turn,
      previousSnapshot: workingMemory,
      assistantText,
      memoryEvidence: providerOutput.memoryEvidence ?? null,
    })
    await replay.db.upsertWorkingMemoryCheckpoint(committedWorkingMemory)
    writeback.checkpoint = 'written'

    if (providerOutput.personaState !== undefined && replay.db.persistPersonaState) {
      await replay.db.persistPersonaState(providerOutput.personaState)
      writeback.persona = 'written'
    }
    stages.push(createStage('commit', {
      checkpointUpdatedAt: committedWorkingMemory.updatedAt,
      persistedPersona: writeback.persona === 'written',
      committedRawTurnCount: committedWorkingMemory.recentRawTurns.length,
      committedCompressedEpisodeletCount: committedWorkingMemory.compressedTimeline.length,
    }))

    return {
      turnId: turn.turnId,
      status: 'succeeded',
      providerOutput: assistantText,
      providerMessages,
      recalledEvidenceIds: recalledMemory.evidence.map(item => item.candidate.id),
      stages,
      writeback,
      error: null,
    }
  }
  catch (error) {
    stages.push(createFailedStage('provider-adapter', error, {
      checkpointWriteAllowed: false,
      personaWriteAllowed: false,
    }))
    return {
      turnId: turn.turnId,
      status: 'failed',
      providerOutput: null,
      providerMessages,
      recalledEvidenceIds: recalledMemory.evidence.map(item => item.candidate.id),
      stages,
      writeback,
      error: errorText(error),
    }
  }
}

export async function replayMemoryDialogue(
  input: MemoryDialogueReplayInput,
): Promise<MemoryDialogueReplayReport> {
  const turns: MemoryDialogueReplayTurnReport[] = []
  for (const turn of input.turns) {
    turns.push(await replayTurn({
      replay: input,
      turn,
    }))
  }

  const succeededTurnCount = turns.filter(turn => turn.status === 'succeeded').length
  const failedTurnCount = turns.length - succeededTurnCount
  const checkpointWriteCount = turns.filter(turn => turn.writeback.checkpoint === 'written').length
  const personaWriteCount = turns.filter(turn => turn.writeback.persona === 'written').length
  const recalledEvidenceCount = turns.reduce(
    (sum, turn) => sum + turn.recalledEvidenceIds.length,
    0,
  )
  const lastError = [...turns].reverse().find(turn => turn.error)?.error ?? null

  return {
    version: 'memory-db-dialogue-replay-report-v1',
    id: normalizeText(input.id, 180) || 'memory-dialogue-replay',
    passed: failedTurnCount === 0,
    createdAt: input.turns.at(-1)?.now ?? Date.now(),
    summary: {
      turnCount: turns.length,
      succeededTurnCount,
      failedTurnCount,
      checkpointWriteCount,
      personaWriteCount,
      recalledEvidenceCount,
      lastError,
    },
    turns,
  }
}

export function serializeMemoryDialogueReplayReport(
  report: MemoryDialogueReplayReport,
) {
  return JSON.stringify(report)
}
