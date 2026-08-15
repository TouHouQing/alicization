import type { WorkingMemoryRecentTurnInput } from './working-memory-builder'

import {
  containsAlicizationFixedTemplateResidue,
} from '@proj-alicization/stage-shared'

import { normalizeWorkingMemoryLongTermEvidence } from './working-memory'

export const workingMemoryHistoryFallbackTurnBudget = 6

export interface WorkingMemoryConversationTurnRecord {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson: string | null
  createdAt: number
}

function parseStructuredTurn(raw: string | null | undefined) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  }
  catch {
    return null
  }
}

function mapPersistedTurn(
  turn: WorkingMemoryConversationTurnRecord,
  index: number,
): WorkingMemoryRecentTurnInput[] {
  const structured = parseStructuredTurn(turn.structuredJson)
  const nestedFailureSurface = structured?.failureSurface
    && typeof structured.failureSurface === 'object'
    && !Array.isArray(structured.failureSurface)
    ? structured.failureSurface as Record<string, unknown>
    : null
  const rawFailureSurface = nestedFailureSurface
    ?? (
      structured?.origin === 'failure-surface'
      && typeof structured.kind === 'string'
        ? structured
        : null
    )
  const rawOrigin = rawFailureSurface?.origin === 'failure-surface'
    ? 'failure-surface'
    : structured?.origin
  const origin = rawOrigin === 'provider'
    || rawOrigin === 'failure-surface'
    || rawOrigin === 'authorization-surface'
    ? rawOrigin
    : null
  const rawLearningPolicy = structured?.learningPolicy
    && typeof structured.learningPolicy === 'object'
    && !Array.isArray(structured.learningPolicy)
    ? structured.learningPolicy as Record<string, unknown>
    : structured
      && (
        'allowLongTermCondensation' in structured
        || 'allowPersonaLearning' in structured
        || 'allowTraining' in structured
      )
      ? structured
      : null
  const learningPolicy = rawLearningPolicy
    ? {
        allowLongTermCondensation: rawLearningPolicy.allowLongTermCondensation === true,
        allowPersonaLearning: rawLearningPolicy.allowPersonaLearning === true,
        allowTraining: false,
      }
    : rawFailureSurface
      ? {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }
      : null
  const memoryEvidence = normalizeWorkingMemoryLongTermEvidence(
    structured?.memoryEvidence,
  )

  if (
    origin === 'failure-surface'
    || structured?.artifactRole === 'memory-side-failure'
    || rawFailureSurface?.kind
    || (!turn.userText?.trim() && !turn.assistantText?.trim())
  ) {
    return []
  }

  return [{
    turnId: turn.turnId ?? `persisted-${index + 1}`,
    userText: turn.userText,
    assistantText: turn.assistantText,
    createdAt: turn.createdAt,
    origin,
    learningPolicy,
    failureSurface: null,
    memoryEvidence,
    contaminated: containsAlicizationFixedTemplateResidue(turn.assistantText ?? '', {
      provenance: 'internal-structured-fact',
    }),
  }]
}

export function createWorkingMemoryHistoryOwner(options: {
  listConversationTurnsBySession: (
    sessionId: string,
    options: { limit: number },
  ) => Promise<WorkingMemoryConversationTurnRecord[]>
}) {
  return {
    async loadFallback(sessionId: string) {
      const turns = await options.listConversationTurnsBySession(
        sessionId,
        { limit: workingMemoryHistoryFallbackTurnBudget },
      )
      return turns
        .slice(-workingMemoryHistoryFallbackTurnBudget)
        .flatMap(mapPersistedTurn)
    },
  }
}

export type WorkingMemoryHistoryOwner = ReturnType<typeof createWorkingMemoryHistoryOwner>
