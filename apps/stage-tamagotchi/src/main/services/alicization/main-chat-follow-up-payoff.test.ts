import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationExecutionFollowUpPayoffResolver } from './main-chat-follow-up-payoff'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-desktop',
    decisionTraceId: 'trace-desktop',
    turnId: 'turn-desktop',
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: 'List desktop files requested by user.',
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'Listed desktop entries (10): 小砖猿, GIT, +8 more',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 3_000,
    completedAt: 3_000,
    ...overrides,
  }
}

function createEvent(overrides: Partial<AlicizationExecutionEventRecord> = {}): AlicizationExecutionEventRecord {
  return {
    id: 'event-result',
    threadId: 'thread-desktop',
    decisionTraceId: 'trace-desktop',
    turnId: 'turn-desktop',
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      stdout: 'total 10 drwxr-xr-x@ 3 touhouqing staff 96 Apr 10 09:47 小砖猿 -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 GIT -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 README.md -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 package.json -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 pnpm-lock.yaml -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 notes.txt -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 screenshot.png -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 todo.md -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 tsconfig.json -rw-r--r--@ 1 touhouqing staff 42 Apr 11 20:00 vitest.config.ts',
      summary: 'Listed desktop entries (10): 小砖猿, GIT, +8 more',
    },
    createdAt: 3_000,
    ...overrides,
  }
}

describe('main chat follow-up payoff', () => {
  it('answers remaining desktop items from real execution output instead of meta continuation text', async () => {
    const resolvePayoff = createAlicizationExecutionFollowUpPayoffResolver({
      listTaskThreads: vi.fn(async () => [createThread()]),
      listExecutionEvents: vi.fn(async () => [createEvent()]),
    })

    const structured = await resolvePayoff({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 10 项，先能确认到这些：小砖猿、GIT、README.md、package.json、pnpm-lock.yaml、notes.txt，另外还有 4 项。' },
        { role: 'user', content: '另外四项是什么？' },
      ],
      decision: {
        lane: 'follow-up',
        strategy: 'deterministic-payoff',
        timeoutMs: 0,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'context-hint',
        latestUserText: '另外四项是什么？',
        previousUserText: '用cli帮我查一下桌面有什么文件',
        previousAssistantText: '我已经替你把桌面看完了，现在一共 10 项，先能确认到这些：小砖猿、GIT、README.md、package.json、pnpm-lock.yaml、notes.txt，另外还有 4 项。',
        continuityAnchor: '桌面文件',
        runtimeDigest: null,
        personaKernel: null,
        sessionMirror: {
          agencySummary: null,
          cardId: 'default',
          continuityLabels: [],
          decisionTraceId: null,
          dialogueSummary: null,
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: 'recent=callback:cli:completed summary=Listed desktop entries (10): 小砖猿, GIT, +8 more',
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: null,
          perceptionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        governance: null,
        reasonCodes: ['short-follow-up', 'session-carry', 'execution-carry'],
      },
      prepared: {
        conversationSessionId: 'session-1',
      } as any,
    })

    expect(structured).toBeTruthy()
    const parsed = JSON.parse(structured!)
    expect(parsed.reply).toContain('另外 4 项是')
    expect(parsed.reply).toContain('screenshot.png')
    expect(parsed.reply).toContain('todo.md')
    expect(parsed.reply).not.toContain('我直接沿刚才')
    expect(parsed.governance.answerSubject).toBe('task-knot')
    expect(parsed.governance.screenReferenceMode).toBe('helpful')
  })

  it('answers generic execution-result follow-ups from the real settled task outcome', async () => {
    const resolvePayoff = createAlicizationExecutionFollowUpPayoffResolver({
      listTaskThreads: vi.fn(async () => [createThread({
        id: 'thread-vitest',
        decisionTraceId: 'trace-vitest',
        turnId: 'turn-vitest',
        goal: 'Run pnpm test for stage-tamagotchi',
        summary: 'pnpm test finished without failures',
      })]),
      listExecutionEvents: vi.fn(async () => [createEvent({
        id: 'event-vitest-result',
        threadId: 'thread-vitest',
        decisionTraceId: 'trace-vitest',
        turnId: 'turn-vitest',
        payload: {
          stdout: 'vitest passed on stage-tamagotchi',
          summary: 'pnpm test finished without failures',
        },
      })]),
    })

    const structured = await resolvePayoff({
      conversationMessages: [
        { role: 'user', content: '帮我跑一下 stage-tamagotchi 的测试' },
        { role: 'assistant', content: '我刚把那条测试任务接过去了。' },
        { role: 'user', content: '刚才那个命令结果呢' },
      ],
      decision: {
        lane: 'follow-up',
        strategy: 'deterministic-payoff',
        timeoutMs: 0,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'context-hint',
        latestUserText: '刚才那个命令结果呢',
        previousUserText: '帮我跑一下 stage-tamagotchi 的测试',
        previousAssistantText: '我刚把那条测试任务接过去了。',
        continuityAnchor: 'stage-tamagotchi 测试',
        runtimeDigest: null,
        personaKernel: null,
        sessionMirror: {
          agencySummary: null,
          cardId: 'default',
          continuityLabels: [],
          decisionTraceId: null,
          dialogueSummary: null,
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: 'recent=dispatch:cli:completed summary=pnpm test finished without failures',
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: null,
          perceptionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        governance: null,
        reasonCodes: ['short-follow-up', 'session-carry', 'execution-carry'],
      },
      prepared: {
        conversationSessionId: 'session-1',
      } as any,
    })

    expect(structured).toBeTruthy()
    const parsed = JSON.parse(structured!)
    expect(parsed.reply).toMatch(/CLI 那条.*(跑完了|收束了|回来了)/u)
    expect(parsed.reply).toContain('vitest passed on stage-tamagotchi')
    expect(parsed.reply).toContain('pnpm test finished without failures')
    expect(parsed.governance.answerAct).toBe('guide')
    expect(parsed.governance.dialogueActKernel.openingClaim).toContain('pnpm test finished without failures')
    expect(String(parsed.governance.dialogueActKernel.mustSay[0] ?? '')).toContain('vitest passed on stage-tamagotchi')
    expect(parsed.governance.mindTurnFrame.memory.memoryMode).toBe('task-thread')
  })
})
