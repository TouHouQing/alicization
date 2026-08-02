import type { WorkingMemorySnapshot } from './working-memory'

import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { buildWorkingMemoryQualityView } from './working-memory-quality-view'

function emptySnapshot(): WorkingMemorySnapshot {
  return createEmptyWorkingMemorySnapshot({
    cardId: 'card-1',
    sessionId: 'session-1',
    now: 1234,
  })
}

describe('working memory quality view', () => {
  it('projects an empty snapshot as structured owner data without a prompt rendering surface', () => {
    const view = buildWorkingMemoryQualityView(emptySnapshot())

    expect(view).toMatchObject({
      version: 'working-memory-quality-view-v1',
      scope: {
        cardId: 'card-1',
        sessionId: 'session-1',
        turnRange: {
          fromTurnId: null,
          toTurnId: null,
        },
      },
      modules: {
        thread: {
          title: null,
        },
        task: {
          summary: null,
        },
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
        audit: {
          failureTurnIds: [],
          excludedLongTermCandidateTurnIds: [],
          notes: [],
        },
      },
    })
    expect(view).not.toHaveProperty('rendering')
  })

  it('normalizes and deduplicates short-term facts without promoting candidate data', () => {
    const view = buildWorkingMemoryQualityView({
      ...emptySnapshot(),
      currentThread: {
        title: 'WorkingMemory owner',
        currentUserMove: '继续检查短期记忆',
        currentAliceMove: '正在读取当前任务',
        primaryAnchor: 'working-memory',
        mode: 'task',
        shouldHold: true,
        confidence: 0.84,
      },
      activeTask: {
        summary: '验证结构化短期记忆',
        status: 'active',
        evidenceTurnIds: ['turn-1', 'turn-1'],
      },
      unresolvedQuestions: [
        { text: '长期记忆是否已召回？', sourceTurnId: 'turn-1' },
        { text: '长期记忆是否已召回？', sourceTurnId: 'turn-1' },
      ],
      memoryQueryHints: ['语义召回', '语义召回'],
      commitments: [
        { text: '保留失败透明度', sourceTurnId: 'turn-1' },
        { text: '保留失败透明度', sourceTurnId: 'turn-1' },
      ],
      userCorrections: [
        { text: '不要用固定回复模板', sourceTurnId: 'turn-1', scope: 'reply' },
        { text: '不要用固定回复模板', sourceTurnId: 'turn-1', scope: 'reply' },
      ],
      longTermCandidates: [],
    })

    expect(view.modules.thread.title).toBe('WorkingMemory owner')
    expect(view.modules.task.evidenceTurnIds).toEqual(['turn-1'])
    expect(view.modules.unresolvedQuestions).toEqual(['长期记忆是否已召回？'])
    expect(view.modules.memoryQueryHints).toEqual(['语义召回'])
    expect(view.modules.commitments).toEqual(['保留失败透明度'])
    expect(view.modules.corrections).toEqual([{
      text: '不要用固定回复模板',
      scope: 'reply',
    }])
    expect(view.modules.longTermCandidates).toEqual([])
  })

  it('keeps failed turns in audit without promoting them to long-term memory candidates', () => {
    const view = buildWorkingMemoryQualityView({
      ...emptySnapshot(),
      currentThread: {
        title: '记忆召回验证',
        currentUserMove: '检查失败回合是否被错误写入长期记忆',
        currentAliceMove: null,
        primaryAnchor: 'working-memory-audit',
        mode: 'task',
        shouldHold: true,
        confidence: 0.8,
      },
      compressedTimeline: [{
        id: 'wm-episodelet:audit',
        sourceTurnIds: ['turn-1'],
        summary: '用户正在验证失败回合的记忆隔离。',
        thread: '记忆召回验证',
        unresolvedQuestions: [],
        commitments: [],
        corrections: [],
        relationshipPosture: null,
        emotionalPosture: null,
        executionCarry: null,
        importance: 0.4,
        createdAt: 1200,
      }],
      unresolvedQuestions: [
        { text: '失败回合是否只保留在审计记录？', sourceTurnId: 'turn-1' },
      ],
      memoryQueryHints: ['失败回合 记忆隔离'],
      commitments: [
        { text: '运行长期记忆候选隔离测试', sourceTurnId: 'turn-1' },
      ],
      audit: {
        failureTurnIds: ['turn-2'],
        excludedLongTermCandidateTurnIds: ['turn-2'],
        notes: ['Provider 请求失败，未生成可确认的助手回复。'],
      },
      longTermCandidates: [],
    })

    expect(view.modules.thread.title).toBe('记忆召回验证')
    expect(view.modules.compressedTimeline).toEqual([{
      summary: '用户正在验证失败回合的记忆隔离。',
      thread: '记忆召回验证',
      sourceTurnIds: ['turn-1'],
    }])
    expect(view.modules.audit.failureTurnIds).toEqual(['turn-2'])
    expect(view.modules.audit.excludedLongTermCandidateTurnIds).toEqual(['turn-2'])
    expect(view.modules.longTermCandidates).toEqual([])
  })

  it('is deterministic for the same snapshot', () => {
    const snapshot = {
      ...emptySnapshot(),
      memoryQueryHints: ['短期记忆', '长期记忆'],
      commitments: [{ text: '运行定向测试', sourceTurnId: null }],
    }

    expect(buildWorkingMemoryQualityView(snapshot)).toEqual(buildWorkingMemoryQualityView(snapshot))
  })
})
