import type { AlicizationConversationTurnInput } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import { coerceConversationTurnToMindGovernedPayload } from './runtime-governance'

describe('runtime-governance', () => {
  it('preserves organic direct repair replies instead of forcing deterministic fallback takeover', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-organic-repair-1',
      sessionId: 'session-1',
      userText: '你再看一眼现在屏幕',
      assistantText: '不是刚才那页了，我按这张新画面重新说。',
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=current-screen; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply: '不是刚才那页了，我按这张新画面重新说。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Code current window',
        focusAnchor: 'Code current window',
        answerIntent: 'Correct the stale anchor and answer from the current window.',
        openingMove: 'Correct the stale anchor directly.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.overrideClass).toBe('none')
    expect(governed.reasons).toContain('strict-repair-organic-reply-preserved')
    expect(governed.payload.assistantText).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(String(structured.reply ?? '')).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(String(structured.reply ?? '')).not.toContain('先按你眼前这件事说')
  })

  it('suppresses need-reground fallback takeover for explicit execution-bound turns', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-execution-bound-1',
      sessionId: 'session-1',
      userText: '用cli帮我查一下桌面有什么文件',
      assistantText: '好的。',
      structured: {
        thought: 'obligation=guide; truth=coarse; focus=desktop-files; move=execute-cli; tone=direct',
        emotion: 'thinking',
        reply: '好的。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.payload.assistantText).toBe('好的。')
    expect(String(structured.reply ?? '')).toBe('好的。')
    expect(String(structured.reply ?? '')).not.toContain('我先守住真实边界')
  })

  it('hides execution-bound stale anchor repair prose behind execution-first dispatch governance', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-execution-bound-2',
      sessionId: 'session-1',
      userText: '用cli命令帮我查一下桌面有什么文件',
      assistantText: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=desktop-files; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。 如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(governed.reasons).toContain('execution-first-governance-override')
    expect(governed.reasons).toContain('execution-first-dispatch-hidden')
    expect(governed.payload.assistantText).toBe('')
    expect(String(structured.reply ?? '')).toBe('')
    expect(String(structured.reply ?? '')).not.toContain('旧锚点')
    expect(String(structured.reply ?? '')).not.toContain('重新落地')
    expect(String(structured.thought ?? '')).toContain('obligation=guide')
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'calm',
      emphasis: 0,
    }))
    expect(governed.audit).toEqual(expect.objectContaining({
      execution_bound_turn: true,
      execution_first_override_applied: true,
      execution_dispatch_hidden: true,
      execution_dispatch_channels: ['cli'],
      visible_reply_authority: 'mind-surface-renderer',
    }))
  })

  it('overrides stale repair shell replies on ordinary greeting turns without surfacing repair narration', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-greeting-repair-residue-1',
      sessionId: 'session-1',
      userText: '你好',
      assistantText: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=current-user-turn; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code current window',
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host greeting directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(governed.payload.assistantText).not.toContain('真实边界')
    expect(governed.payload.assistantText).not.toContain('重新落地')
    expect(String(structured.reply ?? '')).not.toContain('真实边界')
    expect(String(structured.reply ?? '')).not.toContain('重新落地')
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'firm',
      emphasis: 0,
    }))
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'mind-surface-renderer',
    }))
  })

  it('replaces dialogue-first thin shells with a non-empty care reply', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-first-thin-shell-1',
      sessionId: 'session-1',
      userText: '我有点伤心，你可以安慰一下我吗',
      assistantText: '我直接说。',
      structured: {
        thought: 'obligation=answer; truth=memory; focus=current-user-turn; move=answer-the-hosts-question-about-alicization-directly; tone=warm',
        emotion: 'neutral',
        reply: '我直接说。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '我有点伤心，你可以安慰一下我吗',
        answerIntent: '先接住宿主现在的难过，再慢慢陪她说下去。',
        openingMove: '先直接接住宿主此刻的情绪。',
        carriedThread: null,
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(String(structured.reply ?? '')).not.toBe('我直接说。')
    expect(String(structured.reply ?? '')).not.toBe('')
    expect(String(structured.thought ?? '')).toContain('obligation=care')
    expect(structured.emotion).toBe('concerned')
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'mind-surface-renderer',
    }))
  })

  it('forces dialogue answer fallback through the renderer when contaminated dialogue-first replies have no initial surface', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-first-contaminated-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      assistantText: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
      structured: {
        thought: 'obligation=repair; truth=memory; focus=intellij-idea; move=protect-focus; tone=warm',
        emotion: 'neutral',
        reply: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA',
        focusAnchor: '你仔细看看呢',
        answerIntent: '你仔细看看呢',
        openingMove: 'Start from the current turn.',
        carriedThread: 'CaseApplyTypeEnum',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const reply = String(structured.reply ?? '')

    expect(governed.replyOverridden).toBe(true)
    expect(reply).not.toBe('')
    expect(reply).not.toContain('IntelliJ IDEA')
    expect(reply).not.toContain('主人')
    expect(governed.reasons).toContain('dialogue-first-visible-reply-contaminated')
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'mind-surface-renderer',
    }))
  })
})
