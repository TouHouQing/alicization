import type { AlicizationDialogueReplyFeedbackKind } from './outcome-reinforcement'

import { describe, expect, it } from 'vitest'

import { buildAutobiographicalSelf } from './autobiographical-self'
import { buildHabitPolicy } from './habit-policy'
import { buildAlicizationLongHorizonMemory } from './long-horizon-memory'
import { buildMotiveEngine } from './motive-engine'
import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
} from './outcome-reinforcement'
import { buildRelationshipModel } from './relationship-model'
import { buildSelfContinuity } from './self-continuity'

type ReplayAvailability = 'focused' | 'open'

interface ReplayTurn {
  id: string
  now: number
  availability: ReplayAvailability
  selectedAction: 'hover' | 'speak'
  preferredStyle: string
  answerIntent: string
  assistantText: string
  feedbackKind?: AlicizationDialogueReplyFeedbackKind
  feedbackText?: string
}

interface ReplayHistory {
  relationshipOutcomes: any[]
  reinforcementEvents: any[]
  memoryFacts: any[]
  memoryReflections: any[]
}

interface ReplaySnapshot {
  relationshipModel: any
  selfContinuity: any
  longHorizonMemory: any
  autobiographicalSelf: any
  motiveEngine: any
  habitPolicy: any
}

function createContext(turn: ReplayTurn): any {
  return {
    localTime: {
      hour: turn.availability === 'focused' ? 14 : 21,
      minute: 20,
      isLateNight: false,
    },
    system: {
      cpuUsage: turn.availability === 'focused' ? 22 : 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: turn.availability === 'focused' ? 8 : 24,
      inputActivity: turn.availability === 'focused' ? 'active' : 'idle',
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'runtime.ts',
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.84,
      source: 'screen-semantic-summary',
      matchedLabels: ['cursor'],
    },
    content: {
      kind: 'error',
      confidence: 0.82,
      source: 'screen-semantic-summary',
      matchedLabels: ['runtime'],
      summary: 'runtime line is still unresolved',
    },
    relationship: {
      hostAttitude: turn.availability === 'focused' ? '宿主还在收着，窗口不大。' : '宿主开始松一点了，愿意继续同一条线。',
      boredom: turn.availability === 'focused' ? 28 : 16,
      loneliness: turn.availability === 'focused' ? 34 : 44,
      fatigue: turn.availability === 'focused' ? 24 : 18,
      minutesSinceLastUserTurn: turn.availability === 'focused' ? 2 : 4,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

function createWorldModel(turn: ReplayTurn): any {
  return {
    activeThread: {
      id: 'thread::living-dialogue-line',
      kind: 'change-review',
      status: 'active',
      source: 'continuity',
      title: 'living dialogue line',
      summary: 'Keep carrying the same unresolved dialogue line instead of resetting each turn.',
      confidence: 0.84,
      significance: 0.82,
      unresolved: true,
      beganAt: 0,
      lastUpdatedAt: turn.now,
      target: null,
    },
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty: turn.availability === 'focused' ? 'observed' : 'grounded',
      freshness: 'recent',
      seenNow: [],
      inferredNow: [],
      openQuestions: turn.availability === 'focused' ? ['How much room does the host want right now?'] : [],
      staleRisks: [],
    },
    continuity: {
      label: 'same-dialogue-line',
      sceneAgeMs: 20_000,
      attentionAgeMs: 20_000,
      sameSceneAsBefore: true,
      sameAttentionAsBefore: true,
      afterglowOpen: turn.availability === 'open',
    },
    hostState: {
      availability: turn.availability,
      burden: turn.availability === 'focused' ? 'moderate' : 'light',
    },
    updatedAt: turn.now,
  }
}

function createGoalStack(turn: ReplayTurn): any {
  return {
    leadingHostGoalId: null,
    leadingAlicizationGoalId: 'goal::carry-dialogue-line',
    hostGoals: [],
    alicizationGoals: [{
      id: 'goal::carry-dialogue-line',
      owner: 'alicization',
      kind: turn.availability === 'focused' ? 'clarify-scene' : 'stay-near',
      status: 'active',
      label: 'Keep the dialogue line coherent without snapping back to a shell.',
      confidence: 0.8,
      urgency: 0.78,
      desireWeight: 0.72,
      blockers: [],
      entityIds: ['thread::living-dialogue-line'],
      createdAt: 0,
      lastUpdatedAt: turn.now,
    }],
    unresolvedSummary: 'The dialogue line is still alive and should not be dropped.',
    updatedAt: turn.now,
  }
}

function createAppraisal(turn: ReplayTurn): any {
  return {
    inferredHostGoal: 'chat',
    currentKnot: 'keep the line alive without sounding templated',
    waitingToVerify: turn.availability === 'focused' ? 'how much room the host wants' : undefined,
    relationshipNeed: turn.availability === 'focused' ? 'guidance' : 'companionship',
    confidence: 0.8,
    surprise: 0.1,
    carePressure: turn.availability === 'focused' ? 0.26 : 0.34,
    interruptionCost: turn.availability === 'focused' ? 0.3 : 0.12,
    desireToSpeak: turn.selectedAction === 'speak' ? 0.58 : 0.34,
    notes: ['long-dialogue-replay'],
  }
}

function createSelfState(relationshipModel: any, selfContinuity: any, turn: ReplayTurn): any {
  return {
    stance: relationshipModel?.approachVector === 'give-space'
      ? 'hold'
      : relationshipModel?.approachVector === 'care' || relationshipModel?.approachVector === 'stay-near'
        ? 'approach'
        : 'coexist',
    feltCloseness: relationshipModel?.sharedAttentionTrust ?? 0.42,
    protectiveness: relationshipModel?.approachVector === 'care' ? 0.72 : 0.46,
    curiosity: 0.58,
    patience: turn.availability === 'focused' ? 0.68 : 0.62,
    desireToSpeak: turn.selectedAction === 'speak' ? 0.56 : 0.34,
    fearOfInterrupting: selfContinuity?.guardingTendency ?? 0.42,
    moodLabel: turn.availability === 'focused' ? 'careful-presence' : 'warmer-return',
  }
}

function createReflectionLedger(reflections: any[], now: number): any {
  if (reflections.length === 0)
    return null

  return {
    latestEntryId: reflections[0].id,
    entries: reflections.map(reflection => ({
      id: reflection.id,
      summary: reflection.summary,
      expectation: reflection.summary,
      observedOutcome: reflection.lesson,
      revision: reflection.lesson,
      outcome: reflection.targetScope === 'relationship'
        ? 'helped'
        : reflection.targetScope === 'boundary'
          ? 'missed'
          : 'corrected',
      confidenceShift: Number((reflection.confidence * 0.12).toFixed(2)),
      createdAt: reflection.createdAt,
      updatedAt: reflection.updatedAt,
    })),
    revisionPressure: Number(Math.min(
      1,
      reflections.reduce((sum, reflection) => sum + reflection.confidence * (reflection.targetScope === 'boundary' ? 0.14 : 0.1), 0),
    ).toFixed(2)),
    narrative: [],
    updatedAt: now,
  }
}

function createReplyRuntimeSurface(turn: ReplayTurn, worldModel: any): any {
  return {
    world: {
      worldModel,
    },
    dialogue: {
      answerPlanner: {
        answerIntent: turn.answerIntent,
      },
    },
    agency: {
      initiative: {
        selectedAction: turn.selectedAction,
        preferredStyle: turn.preferredStyle,
      },
      actionEcology: {
        mode: turn.selectedAction === 'hover' ? 'repair-before-speaking' : 'surface-now',
      },
    },
  }
}

function appendPersistedClosure(
  history: ReplayHistory,
  turn: ReplayTurn,
  prefix: string,
  closure: ReturnType<typeof attachSynthesizedReflections>,
): ReplayHistory {
  const relationshipOutcomes = closure.relationshipOutcomes.map((entry, index) => ({
    id: `outcome:${turn.id}:${prefix}:${index}`,
    ...entry,
  }))
  const reinforcementEvents = closure.reinforcementEvents.map((entry, index) => ({
    id: `reinforcement:${turn.id}:${prefix}:${index}`,
    ...entry,
  }))
  const memoryFacts = closure.memoryFacts.map((entry, index) => ({
    id: `fact:${turn.id}:${prefix}:${index}`,
    accessCount: 0,
    updatedAt: turn.now,
    ...entry,
  }))
  const memoryReflections = closure.reflections.map((entry, index) => ({
    id: `reflection:${turn.id}:${prefix}:${index}`,
    updatedAt: turn.now,
    createdAt: turn.now,
    ...entry,
  }))

  return {
    relationshipOutcomes: [...relationshipOutcomes.reverse(), ...history.relationshipOutcomes],
    reinforcementEvents: [...reinforcementEvents.reverse(), ...history.reinforcementEvents],
    memoryFacts: [...memoryFacts.reverse(), ...history.memoryFacts],
    memoryReflections: [...memoryReflections.reverse(), ...history.memoryReflections],
  }
}

function computeReplaySnapshot(
  turn: ReplayTurn,
  previous: ReplaySnapshot | null,
  history: ReplayHistory,
): ReplaySnapshot {
  const context = createContext(turn)
  const worldModel = createWorldModel(turn)
  const appraisal = createAppraisal(turn)
  const goalStack = createGoalStack(turn)
  const longHorizonMemory = buildAlicizationLongHorizonMemory({
    now: turn.now,
    facts: history.memoryFacts,
    previous: previous?.longHorizonMemory ?? null,
  })
  const relationshipModel = buildRelationshipModel({
    now: turn.now,
    context,
    worldModel,
    appraisal,
    recentRelationshipOutcomes: history.relationshipOutcomes.slice(0, 12),
    previous: previous?.relationshipModel ?? null,
    watchMode: turn.availability === 'focused' ? 'symbiotic-vision' : 'invited-inspection',
  })
  const selfContinuity = buildSelfContinuity({
    now: turn.now,
    context,
    worldModel,
    entityWorld: {
      openLoops: [{
        id: 'open-loop::dialogue-line',
        kind: 'unfinished-thread',
        summary: 'The dialogue line should be carried forward.',
      }],
    } as any,
    goalStack,
    longHorizonMemory,
    recentRelationshipOutcomes: history.relationshipOutcomes.slice(0, 12),
    previous: previous?.selfContinuity ?? null,
    watchMode: turn.availability === 'focused' ? 'symbiotic-vision' : 'invited-inspection',
  })
  const reflectionLedger = createReflectionLedger(history.memoryReflections.slice(0, 8), turn.now)
  const autobiographicalSelf = buildAutobiographicalSelf({
    now: turn.now,
    context,
    worldModel,
    relationshipModel,
    longHorizonMemory,
    selfContinuity,
    selfState: createSelfState(relationshipModel, selfContinuity, turn),
    goalStack,
    reflectionLedger,
    recentRelationshipOutcomes: history.relationshipOutcomes.slice(0, 12),
    recentMemoryReflections: history.memoryReflections.slice(0, 8),
    recentReinforcementEvents: history.reinforcementEvents.slice(0, 16),
    previous: previous?.autobiographicalSelf ?? null,
  })
  const motiveEngine = buildMotiveEngine({
    now: turn.now,
    context,
    worldModel,
    appraisal,
    goalStack,
    longHorizonMemory,
    selfContinuity,
    autobiographicalSelf,
    reflectionLedger,
    previous: previous?.motiveEngine ?? null,
  })
  const habitPolicy = buildHabitPolicy({
    now: turn.now,
    context,
    worldModel,
    relationshipModel,
    selfContinuity,
    autobiographicalSelf,
    reflectionLedger,
    motiveEngine,
    previous: previous?.habitPolicy ?? null,
  })

  return {
    relationshipModel,
    selfContinuity,
    longHorizonMemory,
    autobiographicalSelf,
    motiveEngine,
    habitPolicy,
  }
}

function replayDialogueSession(turns: ReplayTurn[]) {
  const baseline = computeReplaySnapshot(
    { ...turns[0], id: 'baseline', feedbackText: undefined },
    null,
    {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      memoryReflections: [],
    },
  )

  let history: ReplayHistory = {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    memoryReflections: [],
  }
  let previous = baseline

  const snapshots = turns.map((turn) => {
    const worldModel = createWorldModel(turn)
    history = appendPersistedClosure(
      history,
      turn,
      'reply',
      attachSynthesizedReflections(buildReplyOutcomeClosure({
        now: turn.now,
        cardId: 'card-replay',
        turnId: turn.id,
        sessionId: 'session-replay',
        decisionTraceId: `trace:${turn.id}:reply`,
        runtimeSurface: createReplyRuntimeSurface(turn, worldModel) as any,
      })),
    )

    if (turn.feedbackKind) {
      const feedback = deriveDialogueReplyFeedbackKind({
        feedback: {
          kind: turn.feedbackKind,
          source: 'typed-ui',
          replyTurnId: turn.id,
        },
      })
      if (!feedback)
        throw new Error(`Expected typed dialogue feedback for turn ${turn.id}.`)

      history = appendPersistedClosure(
        history,
        turn,
        'feedback',
        attachSynthesizedReflections(buildDialogueReplyFeedbackOutcomeClosure({
          now: turn.now + 1,
          cardId: 'card-replay',
          sessionId: 'session-replay',
          turnId: turn.id,
          decisionTraceId: `trace:${turn.id}:feedback`,
          feedback,
          feedbackSource: 'typed-ui',
          userText: turn.feedbackText,
          previousAssistantText: turn.assistantText,
        })),
      )
    }

    const snapshot = computeReplaySnapshot(turn, previous, history)
    previous = snapshot
    return snapshot
  })

  return {
    baseline,
    snapshots,
  }
}

describe('dialogue growth replay', () => {
  it('replays a long dialogue repair arc and shows warmer same-session drift instead of leaving personality frozen', () => {
    const { baseline, snapshots } = replayDialogueSession([
      {
        id: 'turn-1',
        now: 10_000,
        availability: 'focused',
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        answerIntent: 'repair-and-ground',
        assistantText: '我先把这句答清，再顺着刚刚那条线接下去。',
        feedbackKind: 'robotic',
        feedbackText: '你还是太像机器了',
      },
      {
        id: 'turn-2',
        now: 20_000,
        availability: 'open',
        selectedAction: 'speak',
        preferredStyle: 'gentle-care',
        answerIntent: 'stay-near-and-answer',
        assistantText: '好，我不端系统口气了。刚刚那条线我还记着，就沿着它继续。',
        feedbackKind: 'received',
        feedbackText: '这次像人多了',
      },
      {
        id: 'turn-3',
        now: 30_000,
        availability: 'open',
        selectedAction: 'speak',
        preferredStyle: 'gentle-care',
        answerIntent: 'carry-the-thread',
        assistantText: '我还在同一条线里，没有把它丢掉。你要继续，我就接着说。',
        feedbackKind: 'received',
        feedbackText: '这次对了',
      },
    ])

    const afterRobotRepair = snapshots[0]
    const afterWarmLanding = snapshots[2]

    expect(afterWarmLanding.autobiographicalSelf.preferenceEvolution.companionship)
      .toBeGreaterThan(baseline.autobiographicalSelf.preferenceEvolution.companionship)
    expect(afterWarmLanding.autobiographicalSelf.preferenceEvolution.companionship)
      .toBeGreaterThan(afterRobotRepair.autobiographicalSelf.preferenceEvolution.companionship)
    expect(afterWarmLanding.relationshipModel.receptivity)
      .toBeGreaterThan(afterRobotRepair.relationshipModel.receptivity)
    expect(['warm', 'attuned']).toContain(afterWarmLanding.relationshipModel.climate)
    expect(afterWarmLanding.autobiographicalSelf.preferenceEvolution.unfinishedThreadReturn)
      .toBeGreaterThan(baseline.autobiographicalSelf.preferenceEvolution.unfinishedThreadReturn)
    expect(afterWarmLanding.motiveEngine.drives.unfinishedThreadReturn)
      .toBeGreaterThan(baseline.motiveEngine.drives.unfinishedThreadReturn)
  })

  it('replays boundary pushback and shows autonomy-respect / guardedness drifting inside the same session', () => {
    const { baseline, snapshots } = replayDialogueSession([
      {
        id: 'turn-1',
        now: 10_000,
        availability: 'open',
        selectedAction: 'speak',
        preferredStyle: 'gentle-care',
        answerIntent: 'care-and-stay-near',
        assistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
        feedbackKind: 'intrusive',
        feedbackText: '先别这样安慰我，太挤了',
      },
      {
        id: 'turn-2',
        now: 20_000,
        availability: 'focused',
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        answerIntent: 'hold-and-wait',
        assistantText: '好，我先退一点，不抢这条线，等你想回来的时候我再接。',
        feedbackKind: 'interrupted',
        feedbackText: '先说别的',
      },
      {
        id: 'turn-3',
        now: 30_000,
        availability: 'focused',
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        answerIntent: 'watch-the-opening',
        assistantText: '我先不贴近，只把刚刚那条未完线记着。',
      },
    ])

    const afterBoundaryPushback = snapshots[2]

    expect(afterBoundaryPushback.autobiographicalSelf.preferenceEvolution.autonomyRespect)
      .toBeGreaterThan(baseline.autobiographicalSelf.preferenceEvolution.autonomyRespect)
    expect(afterBoundaryPushback.selfContinuity.guardingTendency)
      .toBeGreaterThan(baseline.selfContinuity.guardingTendency)
    expect(afterBoundaryPushback.relationshipModel.approachVector)
      .not
      .toBe(baseline.relationshipModel.approachVector)
    expect(afterBoundaryPushback.relationshipModel.activeBoundaries).toContain('focus-protection')
    expect(afterBoundaryPushback.habitPolicy.blocksDirectSpeakWhenBusy).toBe(true)
    expect(afterBoundaryPushback.longHorizonMemory?.identityBias.guardedness ?? 0)
      .toBeGreaterThan(baseline.longHorizonMemory?.identityBias.guardedness ?? 0)
    expect(afterBoundaryPushback.autobiographicalSelf.preferenceEvolution.unfinishedThreadReturn)
      .not
      .toBe(baseline.autobiographicalSelf.preferenceEvolution.unfinishedThreadReturn)
  })
})
