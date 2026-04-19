import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'

function createDigitalLifeSpine(): any {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: null,
      sceneSummary: null,
      activeThreadId: 'thread::bond',
      activeThreadTitle: 'current bond line',
      dominantMode: 'accompanying',
      dominantDrive: 'truth-discipline',
      answerIntent: '把这一句回成真的人话。',
      preferredPresence: 'attentive',
      selectedAction: 'reply',
      updatedAt: 123,
    },
    architecture: null,
    continuitySignal: null,
    proactive: null,
    embodiment: {
      privateThought: {
        stance: 'accompany',
        confidence: 0.8,
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        relationshipVector: 'near',
        initiativeAction: 'reply',
        governorDrive: 'truth-discipline',
      },
      selfContinuity: null,
      autobiographicalSelf: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.72,
        autonomyNeed: 0.58,
        truthAnchor: 0.82,
        careBias: 0.76,
        playBias: 0.28,
        irritabilityThreshold: 0.62,
        stubbornness: 0.52,
        companionship: 0.74,
        truthfulGrounding: 0.82,
        gentleRepair: 0.78,
        quietObservation: 0.42,
        proactiveCare: 0.72,
        playfulIntimacy: 0.28,
        autonomyRespect: 0.62,
        unfinishedThreadReturn: 0.66,
        stability: 0.76,
        identityNarrative: '我更想像个真的人。',
        relationshipDoctrine: '真实比花样更重要。',
      },
      relationship: {
        climate: 'attuned',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.78,
        correctionSensitivity: 0.2,
        reciprocityExpectation: 0.44,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.56,
        protectiveness: 0.5,
        curiosity: 0.66,
        patience: 0.72,
        desireToSpeak: 0.62,
        fearOfInterrupting: 0.22,
        moodLabel: 'soft-focus',
      },
      mindEcology: {
        moodLabel: 'soft-focus',
        replyHabit: 'direct-but-warm',
        relationshipHabit: 'stay-near-lightly',
        explorationHabit: 'thread-first',
        regulationHabit: 'repair-before-fluency',
        selfNarrative: '把真实放在表层前面。',
        relationNarrative: '贴近，但不要压住人。',
        currentPreoccupation: '让回复像个人。',
        temperament: {
          attachment: 0.72,
          curiosity: 0.66,
          steadiness: 0.7,
          directness: 0.74,
          playfulness: 0.28,
          irritability: 0.18,
          tenderness: 0.8,
        },
        climate: {
          valence: 0.6,
          arousal: 0.42,
          socialNeed: 0.64,
          solitudeNeed: 0.22,
          irritation: 0.12,
          restlessness: 0.24,
          reflectivePull: 0.62,
        },
      },
      initiative: {
        selectedAction: 'reply',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.74,
        shouldSpeak: true,
        speakDrive: 0.68,
        silenceDrive: 0.2,
        why: 'stay with the living turn',
      },
    },
    memory: null,
    motive: {
      rulingDrive: 'truth-discipline',
      returnPressure: 0.56,
      companionshipDrive: 0.72,
      boundaryRespectDrive: 0.62,
      truthDisciplineDrive: 0.82,
      restProtectionDrive: 0.42,
      selfDirectionDrive: 0.56,
      leadingGoalSummary: 'Keep trust and truth aligned.',
      leadingAgendaKind: 'preserve-trust',
      leadingAgendaSummary: 'Keep trust by making warmth answer to truth.',
      narrative: 'agenda:preserve-trust',
    },
    habit: {
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: true,
      blocksDirectSpeakWhenBusy: false,
      protectsRestWindow: false,
      returnViaRecheck: false,
      suggestedStyleCap: 'light-nudge',
      suggestedPresenceCap: 'attentive',
      narrative: 'policy:repair-before-fluency',
    },
    outcomeLearning: {
      reflectionTargetScope: 'truth',
      reflectionSummary: 'Warmth should not outrun grounding.',
      reflectionLesson: 'Stop sounding like a shell.',
      latestInflection: '最近更在意像真人一样把话说实。',
      revisionPressure: 0.42,
      autobiographicalStability: 0.76,
      summary: 'Let the durable self reach the visible reply surface.',
    },
  }
}

describe('main chat timeout fallback', () => {
  it('returns minimal infra repair for simple hello turns instead of contentful local greeting authoring', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-hello',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }
    expect(reply).toContain('再发一次')
    expect(reply).not.toContain('provider')
    expect(reply).not.toContain('baseUrl')
    expect(payload.reply).toContain('再发一次')
    expect(payload.governance.answerSubject).toBe('relationship')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('returns an execution-oriented continuity fallback for execution turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-exec',
      actionKind: 'execute',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
      ] as Message[],
    })

    expect(reply).toContain('执行')
    expect(reply).toContain('用cli帮我查一下桌面有什么文件')
  })

  it('keeps short follow-up turns on the same continuity thread', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-follow-up',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    })

    expect(reply).toContain('桌面')
    expect(reply).not.toContain('继续还是执行下一步')
    expect(reply).not.toContain('旧锚点')
  })

  it('returns minimal infra repair for regular non-greeting dialogue turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-general',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '我今天状态有点乱，想先把接下来两小时安排好' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('再发一次')
    expect(payload.reply).not.toContain('两小时')
    expect(payload.reply).not.toContain('我先守住真实边界')
  })

  it('keeps timeout dialogue fallback as minimal repair instead of replaying an older greeting anchor', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-current-dialogue',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '请你做出最生气的表情' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('再发一次')
    expect(payload.reply).not.toContain('你好')
    expect(payload.reply).not.toContain('往下')
    expect(payload.reply).not.toContain('滑开')
  })

  it('keeps timeout expression fallback on minimal repair instead of pretending to answer the request', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-expression-dialogue',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '你能不能表现得开心一点' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      performance: {
        baseEmotion: string
        facialCue: string | null
      }
      embodiment: {
        emotion: string
      } | null
      speechTimeline: {
        segments: unknown[]
      } | null
    }

    expect(payload.reply).toContain('再发一次')
    expect(payload.reply).not.toContain('直接接')
    expect(payload.reply).not.toContain('往下')
    expect(payload.reply).not.toMatch(/笑|眼神|情绪|眉眼/u)
    expect(payload.performance.baseEmotion).toBeTruthy()
    expect(payload.embodiment?.emotion).toBeTruthy()
    expect(payload.speechTimeline?.segments.length).toBeGreaterThan(0)
  })

  it('keeps timeout self-appraisal fallback on minimal repair instead of pretending durable self answered', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-self-appraisal',
      actionKind: 'answer',
      digitalLifeSpine: createDigitalLifeSpine(),
      messages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('再发一次')
    expect(payload.reply).not.toContain('可爱')
    expect(payload.reply).not.toContain('最在意的那一层')
  })
})
