import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../../../../..')

function readRepositoryFile(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

function joinRetiredName(...parts: string[]) {
  return parts.join('')
}

const providerFacingSources = [
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts',
  'packages/stage-ui/src/composables/alicization-guardrails.ts',
  'packages/stage-ui/src/stores/character/orchestrator/agents/event-handler-spark-notify/index.ts',
] as const

const productionDialogueFiles = [
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts',
  'packages/stage-ui/src/stores/chat.ts',
  'packages/stage-ui/src/composables/alicization-structured-output.ts',
] as const

describe('single memory dialogue mainline audit', () => {
  it('removes ordinary dialogue bypass production and fixture modules', () => {
    const deletedPaths = [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts',
      joinRetiredName(
        'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-',
        'fast-',
        'path-',
        'project-',
        'state-provider.test.ts',
      ),
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts',
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-', 'rewrite.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-', 'rewrite.test.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/response-', 'charter.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/response-', 'charter.test.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/executive-answer-', 'brief.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/executive-answer-', 'brief.test.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/response-surface-', 'contract.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/response-surface-', 'contract.test.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/chat-mind-', 'governance.ts'),
      joinRetiredName('apps/stage-tamagotchi/src/main/services/alicization/chat-mind-', 'governance.test.ts'),
      'apps/stage-tamagotchi/src/main/services/alicization/time-query-semantics.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/reply-authority-policy.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/reply-authority-policy.test.ts',
    ] as const

    for (const path of deletedPaths)
      expect(existsSync(resolve(repositoryRoot, path)), path).toBe(false)

    const productionSources = [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/authority-orchestrator.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts',
    ].map(readRepositoryFile)

    const retiredBypassPattern = new RegExp([
      'main-chat-active-dialogue-loop',
      joinRetiredName('active-dialogue-', 'fast-', 'path'),
      'active-dialogue-compact',
      'active-dialogue-local',
      'active-dialogue-deterministic',
    ].join('|'), 'u')

    for (const source of productionSources) {
      expect(source).not.toMatch(retiredBypassPattern)
    }
  })

  it('removes the fixed prompting module and all production imports', () => {
    expect(existsSync(resolve(
      repositoryRoot,
      'packages/stage-shared/src/alicization-prompting.ts',
    ))).toBe(false)

    const productionSources = [
      ...providerFacingSources,
      'packages/stage-shared/src/index.ts',
      'packages/stage-shared/package.json',
    ].map(readRepositoryFile)

    for (const source of productionSources)
      expect(source).not.toContain('alicization-prompting')
  })

  it('retires the unreachable renderer prompt composer', () => {
    const composerPath = 'packages/stage-ui/src/composables/alicization-prompt-composer.ts'
    expect(existsSync(resolve(repositoryRoot, composerPath)), composerPath).toBe(false)

    const chatSource = readRepositoryFile('packages/stage-ui/src/stores/chat.ts')
    expect(chatSource).not.toContain('composeAlicizationPromptMessages')
    expect(chatSource).not.toContain('personality-directives.injected')

    const composablesIndex = readRepositoryFile('packages/stage-ui/src/composables/index.ts')
    expect(composablesIndex).not.toContain('alicization-prompt-composer')
  })

  it('keeps provider-facing engineering facts structured instead of adding reply rules', () => {
    const forbiddenProviderPrompt = /fixed provider policy shell|scripted reply contract|hardcoded opening rule|synthetic host-name rule|fixed affect rule/iu

    for (const path of providerFacingSources) {
      const source = readRepositoryFile(path)
      expect(source, path).not.toMatch(forbiddenProviderPrompt)
    }
  })

  it('admits only typed provider facts instead of legacy reply governance blocks', () => {
    const source = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
    )

    expect(source).not.toMatch(
      /build(?:AutobiographicalSelf|HabitPolicy|LongHorizonMemory|MindEcology|MotiveEngine)SystemBlock|describeAlicizationMainChatProviderMindRequirement/u,
    )
    expect(source).toContain('alicizationProviderFactTypes')
    expect(source).toContain('filterAlicizationProviderSystemMessages')
    expect(source).toContain('alicization-turn-memory-context')
    expect(source).not.toContain('alicization-datetime')
  })

  it('does not rebuild retired reply posture governance in the perception or facade layers', () => {
    const perceptionSource = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts',
    )
    const facadeSource = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/facade.ts',
    )

    expect(perceptionSource).not.toMatch(
      /buildAlicizationVisibleReplySurfacePlan|buildAlicizationMindTurnGovernance|compactMindGovernedChatMessages/u,
    )
    expect(facadeSource).not.toContain('buildAlicizationVisibleReplySurfacePlan')

    const perceptionHelpersSource = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-perception-helpers.ts',
    )
    expect(perceptionHelpersSource).not.toContain('compactMindGovernedChatMessages')

    for (const path of [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/local-visual.ts',
    ]) {
      const source = readRepositoryFile(path)
      expect(source, path).not.toContain('routeNarrative')
      expect(source, path).not.toContain('routeExperience')
    }
  })

  it('does not reserve user phrases for a hidden repair bypass', () => {
    for (const path of [
      'apps/stage-tamagotchi/src/main/services/alicization/attention-anchor.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-context.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime-perception-helpers.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/runtime.ts',
    ]) {
      const source = readRepositoryFile(path)
      expect(source, path).not.toMatch(
        /isInternalAlicizationRepairPrompt|shouldBypassPerception/u,
      )
    }
  })

  it('keeps normal visible reply authority on the Provider mainline', () => {
    const sources = productionDialogueFiles.map(path => ({
      path,
      source: readRepositoryFile(path),
    }))

    for (const { path, source } of sources) {
      expect(source, path).not.toMatch(
        /active-dialogue-fast-path|active-dialogue-compact|stageAssistantFallback|createStructuredFallback|repairStructuredContractLocally|structuredRetrySystemPrompt|rewriteAlicizationVisibleReplySecondPass|rewriteSecondPass|rewriteStructuredVisibleReply/u,
      )
    }

    const settlementSources = sources
      .filter(({ path }) =>
        path.endsWith('main-chat-background-run.ts')
        || path.endsWith('visible-reply/settlement.ts'),
      )

    for (const { path, source } of settlementSources)
      expect(source, path).not.toContain('forceMustPreserve')
  })
})
