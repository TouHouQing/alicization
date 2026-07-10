import type { WorkingMemorySnapshot } from './working-memory'

import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import {
  buildWorkingMemoryPromptBlock,
  buildWorkingMemoryPromptView,
} from './working-memory-prompt-view'

function emptySnapshot(): WorkingMemorySnapshot {
  return createEmptyWorkingMemorySnapshot({
    cardId: 'card-1',
    sessionId: 'session-1',
    now: 1234,
  })
}

describe('working memory prompt view', () => {
  it('renders an empty snapshot as a compact stable block', () => {
    const view = buildWorkingMemoryPromptView(emptySnapshot())

    expect(view).toMatchObject({
      version: 'working-memory-prompt-view-v1',
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
    expect(view.rendering.blockLines).toEqual([
      '[ALICIZATION_WORKING_MEMORY]',
      'owner=WorkingMemory; scope=short_term_dialogue; visible_wording=false',
      'thread=none',
      'task=none',
      'compressed_timeline=none',
      'questions=none',
      'memory_query_hints=none',
      'commitments=none',
      'corrections=none',
      'relationship=none',
      'emotion=none',
      'execution=none',
      'compression=none',
      'audit=none',
    ])
    expect(buildWorkingMemoryPromptBlock(emptySnapshot())).toBe(view.rendering.blockLines.join('\n'))
  })

  it('renders current thread, task, questions, corrections, and compression info', () => {
    const view = buildWorkingMemoryPromptView({
      ...emptySnapshot(),
      turnRange: {
        fromTurnId: 'turn-1:user',
        toTurnId: 'turn-4:alice',
      },
      currentThread: {
        title: 'Task 5 working-memory prompt view',
        currentUserMove: 'implement the pure formatter',
        currentAliceMove: 'reading compact prompt patterns',
        primaryAnchor: 'working-memory-prompt-view.ts',
        mode: 'task',
        shouldHold: true,
        confidence: 0.84,
      },
      activeTask: {
        summary: 'Add prompt-facing working-memory block',
        status: 'active',
        evidenceTurnIds: ['turn-4:alice'],
      },
      compressedTimeline: [{
        id: 'wm-episodelet:session-1:1250',
        sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
        summary: 'Earlier dialogue kept the fixed-template correction alive',
        thread: 'Task 5 working-memory prompt view',
        unresolvedQuestions: [],
        commitments: [],
        corrections: [],
        relationshipPosture: 'same-her local companion posture',
        emotionalPosture: 'focused and careful',
        executionCarry: null,
        importance: 0.78,
        createdAt: 1250,
      }],
      unresolvedQuestions: [
        { text: 'Should failures stay audit-only?', sourceTurnId: 'turn-2:user' },
        { text: 'Should failures stay audit-only?', sourceTurnId: 'turn-2:user' },
      ],
      memoryQueryHints: ['旧模板', '短期记忆'],
      commitments: [
        { text: 'Do not touch main-chat-session-runtime.ts', sourceTurnId: null },
      ],
      userCorrections: [
        { text: 'Do not invent a generic assistant opener', sourceTurnId: 'turn-3:user', scope: 'persona' },
      ],
      relationshipPosture: {
        summary: 'same-her local companion posture',
        source: 'conversation-state',
      },
      emotionalPosture: {
        summary: 'focused and careful',
        source: 'conscious-frame',
      },
      executionState: {
        summary: 'tests-first implementation in progress',
        source: 'execution-callback',
      },
      compression: {
        level: 'light',
        sourceTurnIds: ['turn-1:user', 'turn-2:alice'],
        lastCompressedAt: 1300,
      },
      audit: {
        failureTurnIds: ['turn-2:alice'],
        excludedLongTermCandidateTurnIds: ['turn-2:alice'],
        notes: ['timeout was excluded from long-term candidates'],
      },
      longTermCandidates: [
        {
          sourceTurnIds: ['turn-3:user'],
          kind: 'correction',
          summary: 'Do not invent a generic assistant opener',
          reason: 'User corrected persona expression.',
          salience: 0.82,
          sensitivity: 'personal',
          confidence: 0.78,
          allowTraining: false,
        },
      ],
    })

    expect(view.rendering.blockLines).toContain('range=turn-1:user..turn-4:alice')
    expect(view.rendering.blockLines).toContain('thread=Task 5 working-memory prompt view | mode=task | hold=yes | user=implement the pure formatter | alice=reading compact prompt patterns | anchor=working-memory-prompt-view.ts | confidence=0.84')
    expect(view.rendering.blockLines).toContain('task=active:Add prompt-facing working-memory block | evidence=turn-4:alice')
    expect(view.rendering.blockLines).toContain('compressed_timeline=Earlier dialogue kept the fixed-template correction alive | thread=Task 5 working-memory prompt view | sources=turn-1:user,turn-2:alice')
    expect(view.rendering.blockLines).toContain('questions=Should failures stay audit-only?')
    expect(view.rendering.blockLines).toContain('memory_query_hints=旧模板 ; 短期记忆')
    expect(view.rendering.blockLines).toContain('corrections=persona:Do not invent a generic assistant opener')
    expect(view.rendering.blockLines).toContain('compression=light | sources=turn-1:user,turn-2:alice | last=1300')
    expect(view.rendering.blockLines).toContain('audit=failures=turn-2:alice | excluded_long_term=turn-2:alice | notes=timeout was excluded from long-term candidates')
    expect(view.modules.longTermCandidates).toHaveLength(1)
    expect(view.rendering.blockLines.join('\n')).not.toContain('long_term_candidates=')
  })

  it('does not misrepresent fallback templates or failures as long-term candidates', () => {
    const block = buildWorkingMemoryPromptBlock({
      ...emptySnapshot(),
      recentRawTurns: [
        {
          turnId: 'fallback-1',
          role: 'alice',
          text: 'fallback template visible line',
          createdAt: 1200,
          source: 'conversation-turn',
          visibility: 'user-visible',
          failureKind: null,
          importance: 0.52,
        },
        {
          turnId: 'timeout-1',
          role: 'alice',
          text: 'Timed out.',
          createdAt: 1201,
          source: 'conversation-turn',
          visibility: 'user-visible',
          failureKind: 'timeout',
          importance: 0.05,
        },
      ],
      audit: {
        failureTurnIds: ['timeout-1'],
        excludedLongTermCandidateTurnIds: ['fallback-1', 'timeout-1'],
        notes: ['fallback template excluded', 'timeout excluded'],
      },
      longTermCandidates: [],
    })

    expect(block).toContain('audit=failures=timeout-1 | excluded_long_term=fallback-1,timeout-1 | notes=fallback template excluded ; timeout excluded')
    expect(block).not.toContain('long_term_candidates=')
    expect(block).not.toContain('candidate=fallback-1')
    expect(block).not.toContain('candidate=timeout-1')
  })

  it('sanitizes previously compressed fallback templates before rendering provider-facing memory', () => {
    const block = buildWorkingMemoryPromptBlock({
      ...emptySnapshot(),
      compressedTimeline: [{
        id: 'wm-episodelet:session-1:old-template',
        sourceTurnIds: ['turn-legacy:alice'],
        summary: 'Right now I am still holding together through face and motion, and I will 安静陪着你，沿着同一条线慢慢长成。',
        thread: '旧模板污染排查',
        unresolvedQuestions: [],
        commitments: [],
        corrections: [],
        relationshipPosture: null,
        emotionalPosture: null,
        executionCarry: null,
        importance: 0.4,
        createdAt: 1200,
      }],
    })

    expect(block).toContain('compressed_timeline=content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(block).not.toContain('Right now I am still holding together')
    expect(block).not.toContain('安静陪着')
    expect(block).not.toContain('沿着同一条线慢慢长成')
  })

  it('sanitizes fixed-template residue from all provider-facing working-memory fields', () => {
    const block = buildWorkingMemoryPromptBlock({
      ...emptySnapshot(),
      currentThread: {
        title: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        currentUserMove: '继续',
        currentAliceMove: 'Right now I am still holding together mainly through face and motion.',
        primaryAnchor: 'Before answering, remember this is still the same local-first digital life project.',
        mode: 'dialogue',
        shouldHold: true,
        confidence: 0.8,
      },
      unresolvedQuestions: [
        { text: 'Before answering, remember this is still the same local-first digital life project.', sourceTurnId: 'turn-1' },
        { text: '同一个她这条线下一轮还要继续吗？', sourceTurnId: 'turn-1' },
      ],
      memoryQueryHints: [
        'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        '我记得上一条线',
      ],
      commitments: [
        { text: 'Keep the same living line inward for now, and leave room before widening outward again.', sourceTurnId: 'turn-2' },
      ],
      activeTask: {
        summary: '随便聊聊也可以，我会安静陪着你。',
        status: 'active',
        evidenceTurnIds: ['turn-1'],
      },
      relationshipPosture: {
        summary: '用户要求失败面透明：不要用固定模板遮盖 provider failure。',
        source: 'conversation-state',
      },
      emotionalPosture: {
        summary: '沿着同一条线慢慢长成。',
        source: 'conscious-frame',
      },
      audit: {
        failureTurnIds: ['turn-2:alice'],
        excludedLongTermCandidateTurnIds: ['turn-2:alice'],
        notes: ['Right now I am still holding together mainly through face and motion.'],
      },
    })

    expect(block).toContain('content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(block).toContain('用户要求失败面透明：不要用固定模板遮盖 provider failure。')
    expect(block).not.toContain('Same Phase 1 digital life')
    expect(block).not.toContain('Right now I am still holding')
    expect(block).not.toContain('Before answering')
    expect(block).not.toContain('我记得上一条线')
    expect(block).not.toContain('同一个她')
    expect(block).not.toContain('安静陪着')
    expect(block).not.toContain('沿着同一条线慢慢长成')
  })

  it('dedupes repeated prompt lines and keeps output stable', () => {
    const snapshot: WorkingMemorySnapshot = {
      ...emptySnapshot(),
      unresolvedQuestions: [
        { text: 'Can we keep this local?', sourceTurnId: null },
        { text: 'Can we keep this local?', sourceTurnId: null },
      ],
      commitments: [
        { text: 'Run targeted tests', sourceTurnId: null },
        { text: 'Run targeted tests', sourceTurnId: null },
      ],
      userCorrections: [
        { text: 'Keep the block compact', sourceTurnId: null, scope: 'reply' },
        { text: 'Keep the block compact', sourceTurnId: null, scope: 'reply' },
      ],
      longTermCandidates: [
        {
          sourceTurnIds: ['turn-1'],
          kind: 'correction',
          summary: 'Keep the block compact',
          reason: 'User corrected prompt shape.',
          salience: 0.8,
          sensitivity: 'personal',
          confidence: 0.7,
          allowTraining: false,
        },
        {
          sourceTurnIds: ['turn-1'],
          kind: 'correction',
          summary: 'Keep the block compact',
          reason: 'User corrected prompt shape.',
          salience: 0.8,
          sensitivity: 'personal',
          confidence: 0.7,
          allowTraining: false,
        },
      ],
    }

    const first = buildWorkingMemoryPromptBlock(snapshot)
    const second = buildWorkingMemoryPromptBlock(snapshot)

    expect(first).toBe(second)
    expect(first.match(/Can we keep this local\?/g)).toHaveLength(1)
    expect(first.match(/Run targeted tests/g)).toHaveLength(1)
    expect(first.match(/reply:Keep the block compact/g)).toHaveLength(1)
    expect(first).not.toContain('long_term_candidates=')
  })
})
