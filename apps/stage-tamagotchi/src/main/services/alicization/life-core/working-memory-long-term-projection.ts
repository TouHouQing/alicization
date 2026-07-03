import type {
  AlicizationEpisodicEventInput,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventInput,
} from '../../../../shared/eventa'
import type { WorkingMemoryLongTermCleanedCandidate } from './working-memory-long-term-cleaning'

import { normalizeWorkingMemoryText } from './working-memory'

export interface WorkingMemoryLongTermTypedProjectionBundle {
  memoryFacts: AlicizationMemoryFactInput[]
  memoryReflections: AlicizationMemoryReflectionInput[]
  episodicEvents: AlicizationEpisodicEventInput[]
  personaReinforcements: AlicizationPersonaReinforcementEventInput[]
  trainingArtifacts: []
}

function emptyProjectionBundle(): WorkingMemoryLongTermTypedProjectionBundle {
  return {
    memoryFacts: [],
    memoryReflections: [],
    episodicEvents: [],
    personaReinforcements: [],
    trainingArtifacts: [],
  }
}

function sourceTurnId(candidate: WorkingMemoryLongTermCleanedCandidate) {
  return candidate.sourceTurnIds[0] ?? null
}

export function projectWorkingMemoryLongTermCandidate(input: {
  candidate: WorkingMemoryLongTermCleanedCandidate
  now: number
}): WorkingMemoryLongTermTypedProjectionBundle {
  const candidate = input.candidate
  if (candidate.source !== 'working-memory-owner')
    return emptyProjectionBundle()

  const summary = normalizeWorkingMemoryText(candidate.summary, 260)
  if (!summary)
    return emptyProjectionBundle()

  if (candidate.kind === 'preference') {
    return {
      ...emptyProjectionBundle(),
      memoryFacts: [{
        subject: 'user',
        predicate: 'prefers',
        object: summary,
        confidence: candidate.confidence,
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        memoryDomain: 'relationship',
        sourceLabel: `working-memory-owner:${candidate.id}`,
        conflictsWith: [],
        supersedes: [],
      }],
    }
  }

  if (candidate.kind === 'episode') {
    return {
      ...emptyProjectionBundle(),
      episodicEvents: [{
        id: candidate.id,
        cardId: candidate.cardId,
        sessionId: candidate.sessionId,
        turnId: sourceTurnId(candidate),
        sourceKind: 'reply',
        provenance: 'remembered',
        occurredAt: candidate.createdAt,
        threadAnchor: candidate.relationshipMeaning ?? candidate.retrievalCues[0] ?? null,
        whatHappened: summary,
        relationshipMeaning: candidate.relationshipMeaning,
        sourceSummary: candidate.evidenceSnippets.join(' | ') || null,
        confidence: candidate.confidence,
        salience: candidate.salience,
        consolidationPriority: Math.max(candidate.salience, candidate.confidence),
        tags: candidate.retrievalCues,
        withWhom: ['user', 'alicization'],
        derivedFrom: candidate.sourceTurnIds.map(turnId => ({
          kind: 'turn',
          id: turnId,
          label: 'working-memory-owner',
        })),
        createdAt: input.now,
        updatedAt: input.now,
      }],
    }
  }

  if (candidate.kind === 'procedure') {
    return {
      ...emptyProjectionBundle(),
      memoryFacts: [{
        subject: 'user',
        predicate: 'prefers_procedure',
        object: summary,
        confidence: candidate.confidence,
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        memoryDomain: 'procedure',
        sourceLabel: `working-memory-owner:${candidate.id}`,
        conflictsWith: [],
        supersedes: [],
      }],
    }
  }

  if (candidate.kind === 'relationship') {
    return {
      ...emptyProjectionBundle(),
      memoryReflections: [{
        cardId: candidate.cardId,
        sessionId: candidate.sessionId,
        turnId: sourceTurnId(candidate),
        sourceKind: 'reply',
        targetScope: 'relationship',
        summary,
        lesson: normalizeWorkingMemoryText(
          'Alicization should preserve this relationship boundary as an inward constraint and answer transparently when the related situation appears again.',
          260,
        ),
        status: 'pending',
        confidence: candidate.confidence,
        supportingFactIds: [],
        supportingOutcomeIds: [],
        createdAt: input.now,
        updatedAt: input.now,
      }],
      personaReinforcements: [{
        cardId: candidate.cardId,
        sessionId: candidate.sessionId,
        turnId: sourceTurnId(candidate),
        sourceKind: 'reply',
        dimension: 'truthful-grounding',
        delta: Math.min(0.08, Math.max(0.02, candidate.confidence * 0.08)),
        valence: 'reinforce',
        summary,
        createdAt: input.now,
      }],
    }
  }

  if (candidate.kind !== 'correction')
    return emptyProjectionBundle()

  const lesson = normalizeWorkingMemoryText(
    'When the user rejects fixed-template behavior, Alicization should answer from her own continuous digital-life personality and surface real errors plainly.',
    260,
  )

  return {
    memoryFacts: [{
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: summary,
      confidence: candidate.confidence,
      knowledgeStage: 'working-understanding',
      validationStatus: 'provisional',
      memoryDomain: 'relationship',
      sourceLabel: `working-memory-owner:${candidate.id}`,
      conflictsWith: [],
      supersedes: [],
    }],
    memoryReflections: [{
      cardId: candidate.cardId,
      sessionId: candidate.sessionId,
      turnId: sourceTurnId(candidate),
      sourceKind: 'reply',
      targetScope: 'boundary',
      summary,
      lesson,
      status: 'pending',
      confidence: candidate.confidence,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt: input.now,
      updatedAt: input.now,
    }],
    episodicEvents: [],
    personaReinforcements: [],
    trainingArtifacts: [],
  }
}
