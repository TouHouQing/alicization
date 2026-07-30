import type { AlicizationConversationTurnInput } from '../../../shared/eventa'

import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  coerceConversationTurnToMindGovernedPayload,
  normalizeDialogueRespondedPayload,
} from './runtime-governance'

function createProviderExecution(overrides?: Record<string, unknown>) {
  return {
    mode: 'provider-stream',
    expectedVisibleReplyAuthority: 'llm-mind',
    actualVisibleReplyAuthority: 'llm-mind',
    providerMindExecuted: true,
    reason: 'provider-stream',
    ...overrides,
  } as any
}

function createGovernance() {
  return {
    turnMode: 'answer',
    truthState: 'dialogue-grounded',
    personaKernelMode: 'full',
    openingStyle: 'direct-answer',
    relationshipPosture: 'warm',
    answerSubject: 'general',
    screenReferenceMode: 'avoid',
    answerAct: 'answer',
    evidenceMode: 'dialogue-grounded',
    repairState: 'none',
    liveSurface: null,
    focusAnchor: '继续',
    answerIntent: 'Continue the current turn.',
    openingMove: 'Continue.',
    carriedThread: null,
    labelCarryAsMemory: false,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    maxSentences: 3,
    mindMode: 'tracking',
    mustDo: [],
    mustNotDo: [],
  } as any
}

describe('runtime governance visible reply authority', () => {
  it('keeps the first Provider reply without content-contamination governance', () => {
    const providerReply = '主人……我仔细看看了。你今天很累，却还在 IntelliJ IDEA 里盯着代码。'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-provider-authority-1',
      sessionId: 'session-provider-authority',
      userText: '你仔细看看呢',
      assistantText: providerReply,
      structured: {
        thought: 'Obligation: answer. Truth: remembered. Focus: current user turn. Move: answer directly. Tone: warm.',
        emotion: 'neutral',
        reply: providerReply,
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      visibleReplyExecution: createProviderExecution(),
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
        answerIntent: 'Answer the current user turn.',
        openingMove: 'Answer directly.',
        carriedThread: 'CaseApplyTypeEnum',
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

    expect(governed.replyOverridden).toBe(false)
    expect(governed.payload.assistantText).toBe(providerReply)
    expect(structured.reply).toBe(providerReply)
    expect(structured.visibleReplyAuthority).toBe('llm-mind')
    expect(structured).not.toHaveProperty('visibleReplyRewriteRequest')
    expect(governed.reasons).not.toContain('dialogue-first-visible-reply-contaminated')
    expect(governed.audit).not.toHaveProperty('reply_kept_despite_mismatch')
  })

  it('has no second-pass or local visible-reply takeover machinery', () => {
    const source = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /buildGovernedVisibleReplyRewriteRequest|visibleReplyRewriteRequest|shouldOverrideVisibleReply|visibleReplyOverrideMode/u,
    )
    expect(source).not.toContain('llm-second-pass-rewrite')
  })

  it('keeps non-json Provider artifacts failed instead of repairing them into success', () => {
    const input = {
      turnId: 'turn-provider-contract-failed',
      sessionId: 'session-provider-contract-failed',
      userText: '继续',
      assistantText: '这是 Provider 原始回复。',
      structured: {
        format: 'mind-turn-v1',
        parsePath: 'repair-json',
        contractFailed: false,
        thought: '',
        emotion: 'neutral',
        reply: '这是 Provider 原始回复。',
      },
      visibleReplyExecution: createProviderExecution(),
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续',
        answerIntent: 'Continue the current turn.',
        openingMove: 'Continue.',
        carriedThread: null,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    } as unknown as AlicizationConversationTurnInput

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.payload.assistantText).toBe('这是 Provider 原始回复。')
    expect(structured.reply).toBe('这是 Provider 原始回复。')
    expect(structured.thought).toBe('')
    expect(structured.parsePath).toBe('repair-json')
    expect(structured.contractFailed).toBe(true)
    expect(governed.reasons).toContain('structured-parsepath-invalid')
    expect(governed.reasons).not.toContain('structured-parsepath-repaired')
    expect(structured.visibleReplyAuthority).toBe('non-human-authored-blocked')

    const normalized = normalizeDialogueRespondedPayload(governed.payload)
    expect(normalized?.isFallback).toBe(true)
    expect(normalized?.structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
  })

  it('does not fill a missing structured Provider reply from assistantText', () => {
    const input = {
      turnId: 'turn-provider-reply-missing',
      sessionId: 'session-provider-authority',
      userText: '继续',
      assistantText: '这段文本不能被提升为 Provider reply。',
      structured: {
        format: 'mind-turn-v1',
        parsePath: 'json',
        thought: 'Obligation: answer. Truth: grounded. Focus: current turn. Move: continue. Tone: warm.',
        emotion: 'neutral',
      },
      visibleReplyExecution: createProviderExecution(),
      governance: createGovernance(),
      createdAt: Date.now(),
    } as unknown as AlicizationConversationTurnInput

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const normalized = normalizeDialogueRespondedPayload(governed.payload)

    expect(governed.payload.assistantText).toBe('这段文本不能被提升为 Provider reply。')
    expect(structured.reply ?? '').toBe('')
    expect(structured.contractFailed).toBe(true)
    expect(structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(governed.reasons).toContain('structured-reply-missing')
    expect(normalized?.structured.reply).toBe('')
    expect(normalized?.structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(normalized?.isFallback).toBe(true)
  })

  it.each([
    {
      label: 'wrong format',
      structured: {
        format: 'epoch1-v1',
        parsePath: 'json',
        contractFailed: false,
      },
      reason: 'structured-format-invalid',
    },
    {
      label: 'an explicit contract failure',
      structured: {
        format: 'mind-turn-v1',
        parsePath: 'json',
        contractFailed: true,
      },
      reason: 'structured-contract-failed',
    },
  ])('keeps Provider text but fails closed for $label', ({ structured: invalidFields, reason }) => {
    const input = {
      turnId: `turn-provider-${reason}`,
      sessionId: 'session-provider-authority',
      userText: '继续',
      assistantText: '这是 Provider 原始回复。',
      structured: {
        ...invalidFields,
        thought: 'Provider 原始 thought。',
        emotion: 'neutral',
        reply: '这是 Provider 原始回复。',
      },
      visibleReplyExecution: createProviderExecution(),
      governance: createGovernance(),
      createdAt: Date.now(),
    } as unknown as AlicizationConversationTurnInput

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const governedStructured = governed.payload.structured as Record<string, unknown>
    const normalized = normalizeDialogueRespondedPayload(governed.payload)

    expect(governedStructured.thought).toBe('Provider 原始 thought。')
    expect(governedStructured.reply).toBe('这是 Provider 原始回复。')
    expect(governedStructured.contractFailed).toBe(true)
    expect(governedStructured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(governed.reasons).toContain(reason)
    expect(normalized?.structured.thought).toBe('Provider 原始 thought。')
    expect(normalized?.structured.reply).toBe('这是 Provider 原始回复。')
    expect(normalized?.structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(normalized?.isFallback).toBe(true)
  })

  it.each([
    {
      label: 'local fallback execution',
      execution: createProviderExecution({
        mode: 'local-fallback',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
      }),
    },
    {
      label: 'unsupported provider execution authority',
      execution: createProviderExecution({
        actualVisibleReplyAuthority: 'unsupported-provider-authority',
      }),
    },
  ])('does not promote $label to Provider success', ({ execution }) => {
    const input = {
      turnId: `turn-${execution.actualVisibleReplyAuthority}`,
      sessionId: 'session-provider-authority',
      userText: '继续',
      assistantText: '这是 Provider 原始回复。',
      structured: {
        format: 'mind-turn-v1',
        parsePath: 'json',
        thought: 'Provider 原始 thought。',
        emotion: 'neutral',
        reply: '这是 Provider 原始回复。',
      },
      visibleReplyExecution: execution,
      governance: createGovernance(),
      createdAt: Date.now(),
    } as unknown as AlicizationConversationTurnInput

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const governedStructured = governed.payload.structured as Record<string, unknown>
    const normalized = normalizeDialogueRespondedPayload(governed.payload)

    expect(governedStructured.thought).toBe('Provider 原始 thought。')
    expect(governedStructured.reply).toBe('这是 Provider 原始回复。')
    expect(governedStructured.contractFailed).toBe(true)
    expect(governedStructured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(governed.reasons).toContain('visible-reply-execution-invalid')
    expect(normalized?.structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(normalized?.isFallback).toBe(true)
  })

  it('does not let unsupported realization authority replace or authenticate the Provider reply', () => {
    const unsupportedAuthority = 'unsupported-provider-authority'
    const legacyInput = {
      turnId: 'turn-legacy-realization-1',
      sessionId: 'session-provider-authority',
      userText: '继续',
      assistantText: '这是首个 Provider 生成的回复。',
      structured: {
        format: 'mind-turn-v1',
        parsePath: 'json',
        thought: 'Obligation: answer. Truth: grounded. Focus: current turn. Move: continue. Tone: warm.',
        emotion: 'neutral',
        reply: '这是首个 Provider 生成的回复。',
        visibleReplyAuthority: unsupportedAuthority,
        visibleReplyRealization: {
          version: 'visible-reply-realization-v1',
          expectedAuthority: unsupportedAuthority,
          actualAuthority: unsupportedAuthority,
          providerMindExecuted: true,
          mode: 'provider-one-shot',
          visibleText: '这是旧观察记录试图注入的替代回复。',
          nonHumanAuthoredStatus: null,
          blockedReasons: [],
        },
      },
      visibleReplyExecution: createProviderExecution(),
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: unsupportedAuthority,
        actualAuthority: unsupportedAuthority,
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这是顶层旧观察记录试图注入的替代回复。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        internalMarker: 'legacy-governance-payload-ignored',
      },
      governance: createGovernance(),
      createdAt: Date.now(),
    } as unknown as AlicizationConversationTurnInput
    const governed = coerceConversationTurnToMindGovernedPayload(legacyInput)
    const governedStructured = governed.payload.structured as Record<string, any>
    const normalized = normalizeDialogueRespondedPayload(governed.payload)

    expect(governed.payload.visibleReplyRealization).toEqual(expect.objectContaining({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'non-human-authored-blocked',
      visibleText: '这是首个 Provider 生成的回复。',
    }))
    expect(governedStructured.visibleReplyRealization).toEqual(expect.objectContaining({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'non-human-authored-blocked',
      visibleText: '这是首个 Provider 生成的回复。',
    }))
    expect(governedStructured.contractFailed).toBe(true)
    expect(governedStructured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(governed.reasons).toContain('structured-visible-reply-authority-invalid')
    expect(normalized?.structured.reply).toBe('这是首个 Provider 生成的回复。')
    expect(normalized?.structured.visibleReplyAuthority).toBe('non-human-authored-blocked')
    expect(normalized?.isFallback).toBe(true)
    expect(normalized?.visibleReplyRealization).toEqual(expect.objectContaining({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'non-human-authored-blocked',
      visibleText: '这是首个 Provider 生成的回复。',
      visibleReplyValidationStatus: 'unknown',
    }))
    expect(normalized?.visibleReplyRealization).not.toHaveProperty('internalMarker')
    expect(normalized?.visibleReplyRealization).not.toHaveProperty('projectStateAudit')
  })

  it('removes second-pass authority from shared contracts and runtime authority helpers', () => {
    const contractsSource = readFileSync(
      'packages/stage-shared/src/alicization-transport-contracts.ts',
      'utf8',
    )
    const rootPackageSource = readFileSync('package.json', 'utf8')
    const failureAuthoritySource = readFileSync(
      new URL('./visible-reply/authority-orchestrator.ts', import.meta.url),
      'utf8',
    )
    const runtimeSurfaceSource = readFileSync(
      new URL('./visible-reply/runtime-surface-authority.ts', import.meta.url),
      'utf8',
    )

    expect(contractsSource).not.toMatch(
      /llm-second-pass-rewrite|AlicizationVisibleReplyRewriteRequest|visibleReplyRewriteRequest/u,
    )
    expect(rootPackageSource).not.toMatch(
      /visible-reply\/second-pass-rewrite|visible-reply\/governance-audit\.test/u,
    )
    expect(failureAuthoritySource).not.toMatch(
      /visible-reply-second-pass|llm-second-pass-rewrite|visibleReplyRewriteRequest/u,
    )
    expect(runtimeSurfaceSource).not.toContain('llm-second-pass-rewrite')
    expect(
      existsSync(new URL('./visible-reply/governance-audit.ts', import.meta.url)),
    ).toBe(false)
  })

  it('has no second-pass authority branch in dialogue production', () => {
    const productionFiles = [
      './main-chat-background-run.ts',
      './main-chat-runtime-surface.ts',
      './main-chat-stream-runner.ts',
      './project-state-brief.ts',
      './proactive-mind/visible-utterance-realization.ts',
      './runtime.ts',
      './visual-episodic-memory.ts',
      './visible-reply/critic.ts',
      './visible-reply/realization-engine.ts',
    ]

    for (const relativePath of productionFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source, relativePath).not.toMatch(
        /llm-second-pass-rewrite|visible-reply-second-pass|second-pass-json/u,
      )
    }
  })

  it('removes obsolete rewrite telemetry from the reply closure chain', () => {
    const coreFiles = [
      './main-chat-background-run.ts',
      './main-chat-stream-runner.ts',
      './runtime-delivery-reminders.ts',
      './runtime.ts',
      './proactive-mind/visible-utterance-realization.ts',
      './visible-reply/closure-orchestrator.ts',
      './visible-reply/realization-engine.ts',
      './visible-reply/runtime-surface-authority.ts',
      './visible-reply/settlement.ts',
    ]

    for (const relativePath of coreFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source, relativePath).not.toMatch(
        /preservedIntoRewrite|rewriteClosureApplied|rewriteAttempted|rewriteSucceeded/u,
      )
    }
  })
})
