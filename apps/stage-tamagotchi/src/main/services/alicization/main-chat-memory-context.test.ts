import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'

const ownerInternalMetadata = 'owner-internal-metadata'
const pendingCandidateText = 'pending review candidate must stay out'

const workingMemoryFixture: WorkingMemoryOwnerContext & { authorityLine: string } = {
  version: 'working-memory-owner-context-v1',
  owner: 'working-memory',
  authorityLine: ownerInternalMetadata,
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
  compressedTimeline: [],
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

const workingMemorySnapshotFixture = createEmptyWorkingMemorySnapshot({
  cardId: 'card-1',
  sessionId: 'session-1',
  now: 100,
})

workingMemorySnapshotFixture.unresolvedQuestions = [{
  text: '上下文压缩后如何继续追踪这个问题？',
  sourceTurnId: 'turn-1:user',
}]
workingMemorySnapshotFixture.commitments = [{
  text: '保留当前任务的连续性',
  sourceTurnId: 'turn-2:alice',
}]
workingMemorySnapshotFixture.userCorrections = [{
  text: '请保留用户刚刚明确的纠正',
  sourceTurnId: 'turn-1:user',
  scope: 'reply',
}]
workingMemorySnapshotFixture.relationshipPosture = {
  summary: '保持真实、连续的协作关系',
  source: 'conversation-state',
}
workingMemorySnapshotFixture.emotionalPosture = {
  summary: '当前专注于把短期记忆接回对话',
  source: 'conscious-frame',
}
workingMemorySnapshotFixture.executionState = {
  summary: '当前没有待完成的工具执行',
  source: 'execution-ledger',
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
      scope: {
        userId: 'user-1',
        cardId: 'card-1',
      },
      provenance: 'remembered',
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
    scope: {
      userId: 'user-1',
      cardId: 'card-1',
    },
    provenance: 'remembered',
    evidenceVersion: 'long-term-memory-evidence-v1',
    version: 'long-term-memory-evidence-v1',
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
  it('projects every compressed and checkpointed WorkingMemory field as independent provider data', () => {
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      workingMemorySnapshot: workingMemorySnapshotFixture,
      longTermRecall: null,
    })
    const parsed = JSON.parse(context.providerSystemBlock).data.workingMemory

    expect(parsed).toMatchObject({
      owner: 'working-memory',
      unresolvedQuestions: ['上下文压缩后如何继续追踪这个问题？'],
      commitments: ['保留当前任务的连续性'],
      corrections: [{
        text: '请保留用户刚刚明确的纠正',
        scope: 'reply',
      }],
      relationshipPosture: {
        summary: '保持真实、连续的协作关系',
        source: 'conversation-state',
      },
      emotionalPosture: {
        summary: '当前专注于把短期记忆接回对话',
        source: 'conscious-frame',
      },
      executionState: {
        summary: '当前没有待完成的工具执行',
        source: 'execution-ledger',
      },
    })
    expect(parsed).not.toHaveProperty('queryHints')
    expect(parsed).not.toHaveProperty('audit')
    expect(context.workingMemory.owner).toBe('working-memory')
  })

  it('removes legacy owner prefixes while preserving the underlying working-memory text', () => {
    const rawCorrection = '不是这个，今天先处理长期记忆分页。'
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: {
        ...workingMemoryFixture,
        obligations: [
          `respect_correction(persona):${rawCorrection}`,
          'honor_commitment:保留用户的任务和时间事实',
        ],
      },
      longTermRecall: null,
    })
    const parsed = JSON.parse(context.providerSystemBlock)

    expect(parsed.data.workingMemory.rememberedItems).toEqual([
      rawCorrection,
      '保留用户的任务和时间事实',
    ])
    expect(context.providerSystemBlock).not.toContain('respect_correction(')
    expect(context.providerSystemBlock).not.toContain('honor_commitment:')
  })

  it('projects compressed working-memory timeline into the Provider envelope without legacy internal cues', () => {
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: {
        ...workingMemoryFixture,
        compressedTimeline: [
          {
            id: 'episodelet-internal',
            sourceTurnIds: ['turn-internal'],
            summary: 'structured continuity digest.',
            thread: 'pre_turn_context_digest',
            commitments: [],
            corrections: [],
            importance: 0.8,
            createdAt: 80,
          },
          {
            id: 'episodelet-1',
            sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
            summary: 'user:继续长期记忆分页 | alice:先保留短期 checkpoint',
            thread: '长期记忆分页',
            commitments: ['透明提示 checkpoint 失败'],
            corrections: ['不要让固定模板干扰人格回复'],
            importance: 0.9,
            createdAt: 90,
          },
        ],
      },
      longTermRecall: null,
    })
    const parsed = JSON.parse(context.providerSystemBlock)

    expect(parsed.data.workingMemory.compressedTimeline).toEqual([{
      summary: 'user:继续长期记忆分页 | alice:先保留短期 checkpoint',
      thread: '长期记忆分页',
      sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
      commitments: ['透明提示 checkpoint 失败'],
      corrections: ['不要让固定模板干扰人格回复'],
    }])
    expect(context.providerSystemBlock).not.toContain('structured continuity digest')
    expect(context.providerSystemBlock).not.toContain('pre_turn_context_digest')
  })

  it('drops generic structured residue from provider evidence while keeping confirmed memory', () => {
    const structuredResidue = 'mode=internal; visibility=hidden'
    const contaminatedEvidence = createEvidence('memory-contaminated')
    contaminatedEvidence.candidate.summary = structuredResidue
    contaminatedEvidence.candidate.origin = 'internal-structured-fact'

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [
          contaminatedEvidence,
          createEvidence('memory-confirmed'),
        ],
      },
    })

    const serialized = context.providerSystemBlock
    expect(serialized).not.toContain(structuredResidue)
    expect(context.longTermRecall?.evidence.map(item => item.id)).toEqual([
      'memory-confirmed',
    ])
  })

  it('drops structured source residue from internal evidence before Provider projection', () => {
    const structuredResidue = 'source_kind=internal; visibility=hidden'
    const contaminatedEvidence = createEvidence('memory-source-contaminated')
    contaminatedEvidence.candidate.origin = 'internal-structured-fact'
    contaminatedEvidence.candidate.source = structuredResidue

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [contaminatedEvidence],
      },
    })

    expect(context.longTermRecall?.evidence[0]?.source).toBe('memory')
    expect(context.providerSystemBlock).not.toContain(structuredResidue)
  })

  it('drops structured threadId residue from internal evidence before Provider projection', () => {
    const structuredResidue = 'thread_mode=internal; lifecycle=held'
    const contaminatedEvidence = createEvidence('memory-thread-id-contaminated')
    contaminatedEvidence.candidate.origin = 'internal-structured-fact'
    contaminatedEvidence.candidate.threadId = structuredResidue

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [contaminatedEvidence],
      },
    })

    expect(context.longTermRecall?.evidence[0]?.threadId).toBeNull()
    expect(context.providerSystemBlock).not.toContain(structuredResidue)
  })

  it('drops structured threadAnchor residue from internal evidence before Provider projection', () => {
    const structuredResidue = 'anchor_mode=internal; continuity=held'
    const contaminatedEvidence = createEvidence('memory-thread-anchor-contaminated')
    contaminatedEvidence.candidate.origin = 'internal-structured-fact'
    contaminatedEvidence.candidate.threadAnchor = structuredResidue

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [contaminatedEvidence],
      },
    })

    expect(context.longTermRecall?.evidence[0]?.threadAnchor).toBeNull()
    expect(context.providerSystemBlock).not.toContain(structuredResidue)
  })

  it('preserves natural-language key=value discussion from user-origin evidence', () => {
    const naturalFieldDiscussion = '用户确认 feature_flag=enabled 是当前选择。'
    const userEvidence = createEvidence('memory-user-field-discussion')
    userEvidence.candidate.origin = 'user-turn'
    userEvidence.candidate.source = 'user-turn'
    userEvidence.candidate.summary = naturalFieldDiscussion

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [userEvidence],
      },
    })

    expect(context.longTermRecall?.evidence[0]).toMatchObject({
      source: 'user-turn',
      summary: naturalFieldDiscussion,
    })
    expect(context.providerSystemBlock).toContain(naturalFieldDiscussion)
  })

  it('keeps retrieval diagnostics out of the Provider-facing memory envelope', () => {
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [createEvidence('memory-provider-facing')],
      },
    })

    const serialized = context.providerSystemBlock
    expect(serialized).toContain('memory-provider-facing')
    expect(serialized).toContain('Confirmed long-term memory evidence')
    expect(serialized).not.toContain('retrievalScore')
    expect(serialized).not.toContain('queryMatches')
    expect(serialized).not.toContain('rankReasons')
    expect(serialized).not.toContain('evidenceVersion')
  })

  it('preserves natural-language field discussion while removing retrieval and audit policy from the Provider envelope', () => {
    const retiredField = ['opening', 'policy'].join('_')
    const naturalFieldDiscussion = `用户正在讨论 ${retiredField}=legacy 这个代码字段。`
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: {
        ...workingMemoryFixture,
        current: {
          ...workingMemoryFixture.current,
          threadTitle: naturalFieldDiscussion,
          currentUserMove: naturalFieldDiscussion,
        },
        obligations: [
          `用户明确说 ${retiredField}=legacy 是待删除代码字段。`,
          'Provider timed out after 30 seconds.',
        ],
        queryHints: [
          'legacy field query hint',
          '长期记忆分页',
        ],
        audit: {
          ...workingMemoryFixture.audit,
          notes: [
            'mode=internal; visibility=hidden',
            'Provider failure remains visible.',
          ],
        },
      },
      longTermRecall: {
        ...longTermRecallFixture,
        intent: {
          ...longTermRecallFixture.intent,
          rationale: 'legacy field rationale',
          queryHints: ['legacy field query'],
        },
        plan: {
          ...longTermRecallFixture.plan,
          rawQuery: 'legacy field raw query',
          keywordQueries: ['legacy field keyword'],
        },
      },
    })
    const parsed = JSON.parse(context.providerSystemBlock)
    const providerData = parsed.data

    expect(providerData.workingMemory.current.threadTitle).toBe(naturalFieldDiscussion)
    expect(providerData.workingMemory.current.currentUserMove).toBe(naturalFieldDiscussion)
    expect(providerData.workingMemory.rememberedItems).toEqual([
      `用户明确说 ${retiredField}=legacy 是待删除代码字段。`,
      'Provider timed out after 30 seconds.',
    ])
    expect(providerData.workingMemory).not.toHaveProperty('queryHints')
    expect(providerData.workingMemory).not.toHaveProperty('audit')
    expect(providerData.longTermRecall).not.toHaveProperty('intent')
    expect(providerData.longTermRecall).not.toHaveProperty('plan')
    expect(providerData.longTermRecall.evidence[0]).toMatchObject({
      scope: {
        userId: 'user-1',
        cardId: 'card-1',
      },
      provenance: 'remembered',
      confidence: 0.93,
    })
    expect(providerData.longTermRecall.evidence[0]).not.toHaveProperty('visibleMode')
    expect(providerData.longTermRecall.evidence[0]).not.toHaveProperty('visibility')
    expect(providerData.longTermRecall.evidence[0]).not.toHaveProperty('speechPlan')
    expect(providerData.longTermRecall.evidence[0]).not.toHaveProperty('surfaceMode')
    expect(providerData.longTermRecall.evidence[0]).not.toHaveProperty('mustDisplay')
    expect(JSON.stringify(providerData.longTermRecall)).not.toContain('mode=internal; visibility=hidden')
  })

  it('keeps a confirmed user correction that discusses fixed-template terminology', () => {
    const correctionEvidence = createEvidence('memory-correction')
    correctionEvidence.candidate.summary = '用户明确要求不要固定模板，并保留这句纠正原文。'
    correctionEvidence.queryMatches = ['用户纠正']
    const pendingEvidence = createEvidence('memory-pending')
    pendingEvidence.candidate.reviewStatus = 'pending'

    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: workingMemoryFixture,
      longTermRecall: {
        ...longTermRecallFixture,
        evidence: [
          correctionEvidence,
          pendingEvidence,
        ],
      },
    })

    expect(context.longTermRecall?.evidence.map(item => item.id)).toEqual([
      'memory-correction',
    ])
    expect(context.longTermRecall?.evidence[0]?.summary)
      .toBe('用户明确要求不要固定模板，并保留这句纠正原文。')
  })

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
      current: {
        threadTitle: workingMemoryFixture.current.threadTitle,
        currentUserMove: workingMemoryFixture.current.currentUserMove,
        activeTask: workingMemoryFixture.current.activeTask,
        taskStatus: workingMemoryFixture.current.taskStatus,
      },
      rememberedItems: ['finish the typed memory context foundation'],
      compressedTimeline: [],
    })
    expect(context.workingMemory).not.toHaveProperty('authorityLine')
    expect(context.workingMemory).not.toHaveProperty('longTermQueue')
    expect(context.workingMemory).not.toHaveProperty('queryHints')
    expect(context.workingMemory).not.toHaveProperty('audit')
    expect(context.longTermRecall).toMatchObject({
      owner: 'long-term-memory-recall',
      status: 'recalled',
      confidence: longTermRecallFixture.confidence,
      evidence: [{
        id: 'memory-1',
        summary: 'Confirmed long-term memory evidence 1.',
        source: 'memory_facts',
        scope: {
          userId: 'user-1',
          cardId: 'card-1',
        },
        provenance: 'remembered',
        confidence: 0.93,
        rankReasons: [
          'confirmed evidence',
          'ranked by query match',
        ],
        evidenceVersion: 'long-term-memory-evidence-v1',
        version: 'long-term-memory-evidence-v1',
        retrievalScore: 0.91,
      }],
    })
    expect(context.longTermRecall?.evidence.map(entry => entry.id)).toEqual(
      context.availableLongTermEvidenceIds,
    )
    expect(context.availableLongTermEvidenceIds).toEqual(['memory-1'])
    expect(parsed).toMatchObject({
      type: 'alicization-turn-memory-context',
      data: {
        version: context.version,
        longTermRecall: {
          owner: 'long-term-memory-recall',
          evidence: [{
            id: 'memory-1',
          }],
        },
      },
    })
    expect(context.providerSystemBlock).not.toContain(pendingCandidateText)
    expect(parsed.data.longTermRecall).not.toHaveProperty('intent')
    expect(parsed.data.longTermRecall).not.toHaveProperty('plan')
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
    expect(context.workingMemory.rememberedItems).toEqual([
      'finish the typed memory context foundation',
    ])
    expect(context.longTermRecall?.evidence[0].id).toBe('memory-1')
    expect(context.longTermRecall?.evidence[0].summary)
      .toBe('Confirmed long-term memory evidence 1.')
    expect(JSON.parse(context.providerSystemBlock)).toMatchObject({
      data: {
        workingMemory: {
          scope: {
            cardId: 'card-1',
          },
          current: {
            currentUserMove: 'Continue Task 2A',
          },
          rememberedItems: [
            'finish the typed memory context foundation',
          ],
        },
        longTermRecall: {
          evidence: [{
            id: 'memory-1',
            summary: 'Confirmed long-term memory evidence 1.',
          }],
        },
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
