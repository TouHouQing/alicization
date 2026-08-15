import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import {
  parseWorkingMemoryCheckpoint,
  serializeWorkingMemoryCheckpoint,
} from './working-memory-checkpoint'

describe('working memory checkpoint', () => {
  it('round-trips owner state needed for restart continuity', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'card-1',
      sessionId: 'session-1',
      now: 1_000,
    })
    snapshot.currentThread = {
      title: '长期记忆产品化',
      currentUserMove: '继续',
      currentAliceMove: '开始做 checkpoint',
      primaryAnchor: 'WorkingMemory',
      mode: 'task',
      shouldHold: true,
      confidence: 0.82,
    }
    snapshot.activeTask = {
      summary: '让 WorkingMemory 重启后继续持有短期记忆',
      status: 'active',
      evidenceTurnIds: ['turn-1:user'],
    }
    snapshot.unresolvedQuestions = [{
      text: 'checkpoint 是否恢复 compressed timeline',
      sourceTurnId: 'turn-1:user',
    }]
    snapshot.commitments = [{
      text: '透明告诉用户 checkpoint 读写失败',
      sourceTurnId: 'turn-1:user',
    }]
    snapshot.userCorrections = [{
      text: '不要让固定模板干扰人格回复',
      sourceTurnId: 'turn-1:user',
      scope: 'persona',
    }]
    snapshot.emotionalPosture = {
      summary: 'focused',
      source: 'runtime',
    }
    snapshot.executionState = {
      summary: 'typecheck pending',
      source: 'execution-callback',
      status: 'active',
      observedAt: 950,
    }
    snapshot.compressedTimeline = [{
      id: 'episodelet-1',
      sourceTurnIds: ['turn-0:user'],
      summary: 'user:继续 | alice:开始收束',
      thread: '长期记忆产品化',
      unresolvedQuestions: [],
      commitments: ['保留短期记忆'],
      corrections: ['不要固定模板'],
      relationshipPosture: null,
      emotionalPosture: 'focused',
      executionCarry: null,
      importance: 0.8,
      createdAt: 900,
    }]
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-1:user'],
      kind: 'correction',
      summary: '不要让固定模板干扰人格回复',
      reason: 'candidate:correction',
      evidenceSnippets: ['不要让固定模板干扰人格回复'],
      salience: 0.9,
      sensitivity: 'personal',
      confidence: 0.86,
      allowTraining: false,
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'correction',
        summary: '不要让固定模板干扰人格回复',
        reason: 'candidate:correction',
        evidenceSnippets: ['不要让固定模板干扰人格回复'],
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.86,
      },
    }]

    const parsed = parseWorkingMemoryCheckpoint(
      serializeWorkingMemoryCheckpoint(snapshot),
      {
        cardId: 'card-1',
        sessionId: 'session-1',
      },
    )

    expect(parsed).toMatchObject({
      cardId: 'card-1',
      sessionId: 'session-1',
      currentThread: {
        title: '长期记忆产品化',
        shouldHold: true,
      },
      activeTask: {
        summary: '让 WorkingMemory 重启后继续持有短期记忆',
        status: 'active',
      },
      emotionalPosture: {
        summary: 'focused',
      },
      executionState: {
        summary: 'typecheck pending',
        status: 'active',
        observedAt: 950,
      },
    })
    expect(parsed?.compressedTimeline[0]?.summary).toContain('开始收束')
    expect(parsed?.commitments.map(item => item.text)).toContain('透明告诉用户 checkpoint 读写失败')
    expect(parsed?.userCorrections.map(item => item.text)).toContain('不要让固定模板干扰人格回复')
    expect(parsed?.longTermCandidates[0]?.allowTraining).toBe(false)
  })

  it('rejects mismatched card or session checkpoints', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'card-1',
      sessionId: 'session-1',
      now: 1_000,
    })
    const serialized = serializeWorkingMemoryCheckpoint(snapshot)

    expect(parseWorkingMemoryCheckpoint(serialized, { cardId: 'card-2' })).toBeNull()
    expect(parseWorkingMemoryCheckpoint(serialized, { sessionId: 'session-2' })).toBeNull()
  })

  it('bounds raw turns and compressed timeline while preserving latest entries', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'card-1',
      sessionId: 'session-1',
      now: 1_000,
    })
    snapshot.recentRawTurns = Array.from({ length: 12 }, (_, index) => normalizeWorkingMemoryTurn({
      turnId: `turn-${index + 1}`,
      role: 'user',
      text: `raw ${index + 1}`,
      createdAt: index + 1,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 0.5,
    }))
    snapshot.compressedTimeline = Array.from({ length: 40 }, (_, index) => ({
      id: `episodelet-${index + 1}`,
      sourceTurnIds: [`turn-${index + 1}`],
      summary: `episodelet ${index + 1}`,
      thread: null,
      unresolvedQuestions: [],
      commitments: [],
      corrections: [],
      relationshipPosture: null,
      emotionalPosture: null,
      executionCarry: null,
      importance: 0.5,
      createdAt: index + 1,
    }))

    const parsed = parseWorkingMemoryCheckpoint(serializeWorkingMemoryCheckpoint(snapshot))

    expect(parsed?.recentRawTurns).toHaveLength(8)
    expect(parsed?.recentRawTurns[0]?.turnId).toBe('turn-5')
    expect(parsed?.compressedTimeline).toHaveLength(32)
    expect(parsed?.compressedTimeline[0]?.id).toBe('episodelet-9')
    expect(parsed?.compressedTimeline.at(-1)?.id).toBe('episodelet-40')
  })
})
