import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'

const authorityCue = 'fixed reply governance cue'
const pendingCandidateText = 'pending review candidate must stay out'

const workingMemoryFixture: WorkingMemoryOwnerContext & { authorityLine: string } = {
  version: 'working-memory-owner-context-v1',
  owner: 'working-memory',
  authorityLine: authorityCue,
  scope: {
    cardId: 'card-1',
    sessionId: 'session-1',
    updatedAt: 100,
    turnRange: {
      fromTurnId: 'turn-1:user',
      toTurnId: 'turn-2:alice',
    },
  },
  current: {
    threadTitle: 'Typed memory context foundation',
    threadMode: 'task',
    shouldHoldThread: true,
    currentUserMove: 'Continue Task 2A',
    activeTask: 'Define one provider memory JSON envelope',
    taskStatus: 'active',
  },
  obligations: [
    'honor_commitment:finish the typed memory context foundation',
  ],
  queryHints: [
    'typed memory context',
    'provider evidence',
  ],
  audit: {
    failureTurnIds: ['turn-failed:alice'],
    excludedLongTermCandidateTurnIds: ['turn-pending:user'],
    notes: ['Keep pending review material outside provider context.'],
  },
  longTermQueue: [{
    id: 'working-memory-long-term:session-1:correction:turn-pending:user:pending-candidate',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: pendingCandidateText,
    reason: 'The candidate still requires review.',
    sourceTurnIds: ['turn-pending:user'],
    evidenceSnippets: [pendingCandidateText],
    salience: 0.84,
    confidence: 0.78,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 90,
  }],
}

function createEvidence(
  id: string,
  index = 0,
): LongTermMemoryEvidenceBundle['evidence'][number] {
  return {
    candidate: {
      id,
      kind: 'fact',
      summary: `Confirmed long-term memory evidence ${index + 1}.`,
      source: 'memory_facts',
      confidence: 0.93,
      reviewStatus: 'confirmed',
      salience: 0.82,
      updatedAt: 80 - index,
      occurredAt: 70 - index,
      threadId: 'thread-memory-context',
      threadAnchor: 'typed memory context',
      cues: ['provider context', 'memory evidence'],
      entities: ['Alicization'],
      sensitivity: 'personal',
    },
    score: 0.91 - index / 100,
    queryMatches: ['typed memory context'],
    rankReasons: [
      'confirmed evidence',
      'ranked by query match',
    ],
    visibleMode: 'explicit',
  }
}

const longTermRecallFixture: LongTermMemoryEvidenceBundle = {
  intent: {
    mode: 'task',
    shouldRecall: true,
    confidence: 0.86,
    rationale: 'Confirmed task continuity evidence is available.',
    temporalFocus: 'cross-session',
    targetKinds: ['fact'],
    queryHints: ['typed memory context'],
    riskFlags: ['temporal-underspecified'],
  },
  plan: {
    rawQuery: 'Continue Task 2A',
    normalizedQuery: 'continue task 2a',
    keywordQueries: ['typed memory context'],
    phraseQueries: ['provider memory envelope'],
    charGramQueries: ['memory context'],
    semanticQueries: ['confirmed memory evidence for the current task'],
    episodicQueries: [],
    temporalHints: ['cross-session'],
    entityHints: ['Alicization'],
    procedureHints: ['continue current task'],
    threadHints: ['typed memory context foundation'],
    negativeCues: [],
    confidencePolicy: 'direct',
    riskFlags: ['query-needs-confirmed-evidence'],
    targetKinds: ['fact'],
  },
  evidence: [
    createEvidence(' memory-1 '),
  ],
  confidence: 0.88,
  budgetClass: 'light',
}

describe('main chat memory context', () => {
  it('normalizes provider evidence ids into one JSON envelope', () => {
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: longTermRecallFixture,
    })
    const parsed = JSON.parse(context.providerSystemBlock)

    expect(context.version).toBe('alicization-main-chat-memory-context-v1')
    expect(context.workingMemory).toMatchObject({
      version: 'working-memory-owner-context-v1',
      owner: workingMemoryFixture.owner,
      scope: workingMemoryFixture.scope,
      current: workingMemoryFixture.current,
      obligations: workingMemoryFixture.obligations,
      queryHints: workingMemoryFixture.queryHints,
      audit: workingMemoryFixture.audit,
    })
    expect(context.workingMemory).not.toHaveProperty('authorityLine')
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
    expect(context.longTermRecall).toMatchObject({
      owner: 'long-term-memory-recall',
      intent: longTermRecallFixture.intent,
      plan: longTermRecallFixture.plan,
      evidence: [{
        candidate: {
          id: 'memory-1',
        },
        rankReasons: [
          'confirmed evidence',
          'ranked by query match',
        ],
      }],
    })
    expect(context.longTermRecall?.evidence.map(entry => entry.candidate.id)).toEqual(
      context.availableLongTermEvidenceIds,
    )
    expect(context.availableLongTermEvidenceIds).toEqual(['memory-1'])
    expect(parsed).toMatchObject({
      type: 'alicization-turn-memory-context',
      version: context.version,
      longTermRecall: {
        owner: 'long-term-memory-recall',
        evidence: [{
          candidate: {
            id: 'memory-1',
          },
          rankReasons: [
            'confirmed evidence',
            'ranked by query match',
          ],
        }],
      },
    })
    expect(context.providerSystemBlock).not.toContain(authorityCue)
    expect(context.providerSystemBlock).not.toContain(pendingCandidateText)
    expect(parsed.longTermRecall.evidence[0].rankReasons).toEqual([
      'confirmed evidence',
      'ranked by query match',
    ])
  })

  it('isolates output from later input mutation', () => {
    const workingMemoryInput = structuredClone(workingMemoryFixture)
    const longTermRecallInput = structuredClone(longTermRecallFixture)

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryInput,
      longTermRecall: longTermRecallInput,
    })

    workingMemoryInput.scope.cardId = 'mutated-card'
    workingMemoryInput.current.currentUserMove = 'mutated move'
    workingMemoryInput.obligations.push('mutated obligation')
    workingMemoryInput.audit.notes[0] = 'mutated note'

    longTermRecallInput.evidence[0].candidate.id = 'mutated-id'
    longTermRecallInput.evidence[0].candidate.summary = 'mutated summary'
    longTermRecallInput.evidence[0].rankReasons[0] = 'mutated reason'

    expect(context.workingMemory.scope.cardId).toBe('card-1')
    expect(context.workingMemory.current.currentUserMove).toBe('Continue Task 2A')
    expect(context.workingMemory.obligations).toEqual([
      'honor_commitment:finish the typed memory context foundation',
    ])
    expect(context.workingMemory.audit.notes).toEqual([
      'Keep pending review material outside provider context.',
    ])
    expect(context.longTermRecall?.evidence[0].candidate.id).toBe('memory-1')
    expect(context.longTermRecall?.evidence[0].candidate.summary)
      .toBe('Confirmed long-term memory evidence 1.')
    expect(context.longTermRecall?.evidence[0].rankReasons).toEqual([
      'confirmed evidence',
      'ranked by query match',
    ])
    expect(JSON.parse(context.providerSystemBlock)).toMatchObject({
      workingMemory: {
        scope: {
          cardId: 'card-1',
        },
        current: {
          currentUserMove: 'Continue Task 2A',
        },
        obligations: [
          'honor_commitment:finish the typed memory context foundation',
        ],
        audit: {
          notes: [
            'Keep pending review material outside provider context.',
          ],
        },
      },
      longTermRecall: {
        evidence: [{
          candidate: {
            id: 'memory-1',
            summary: 'Confirmed long-term memory evidence 1.',
          },
          rankReasons: [
            'confirmed evidence',
            'ranked by query match',
          ],
        }],
      },
    })
    expect(context.availableLongTermEvidenceIds).toEqual(['memory-1'])
  })

  it('deduplicates ordered non-empty evidence IDs and caps the provider budget at 16', () => {
    const evidenceIds = [
      ' memory-1 ',
      '',
      'memory-2',
      'memory-1',
      ' memory-2 ',
      ...Array.from(
        { length: 17 },
        (_, index) => `memory-${index + 3}`,
      ),
    ]
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: evidenceIds.map((id, index) => createEvidence(id, index)),
        budgetClass: 'wide',
      },
    })

    expect(context.availableLongTermEvidenceIds).toEqual(
      [
        'memory-1',
        'memory-2',
        'memory-3',
        'memory-4',
        'memory-5',
        'memory-6',
        'memory-7',
        'memory-8',
        'memory-9',
        'memory-10',
        'memory-11',
        'memory-12',
        'memory-13',
        'memory-14',
        'memory-15',
        'memory-16',
      ],
    )
  })
})
