import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../../../../..')

function readRepositoryFile(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

const providerFacingSources = [
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts',
  'packages/stage-ui/src/composables/alicization-prompt-composer.ts',
  'packages/stage-ui/src/composables/alicization-guardrails.ts',
  'packages/stage-ui/src/stores/character/orchestrator/agents/event-handler-spark-notify/index.ts',
] as const

describe('single memory dialogue mainline audit', () => {
  it('removes ordinary dialogue fast-path production and fixture modules', () => {
    const deletedPaths = [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-fast-path-project-state-provider.test.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.test.ts',
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

    for (const source of productionSources) {
      expect(source).not.toMatch(
        /main-chat-active-dialogue-loop|active-dialogue-fast-path|active-dialogue-compact|active-dialogue-local|active-dialogue-deterministic/u,
      )
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

  it('keeps provider-facing engineering facts structured instead of adding reply rules', () => {
    const forbiddenProviderPrompt = /Alicization core response policy|Response contract|must-follow|before answering|reply posture|opening style|Do not output shell openers|Do not explain governance|Use the host name only|Keep thought, emotion, and reply|reply energy should|affect should|instruction acceptance should/iu

    for (const path of providerFacingSources) {
      const source = readRepositoryFile(path)
      expect(source, path).not.toMatch(forbiddenProviderPrompt)
    }
  })

  it('does not aggregate legacy life-subsystem SystemBlock builders into main chat', () => {
    const source = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts',
    )

    expect(source).not.toMatch(
      /build(?:AutobiographicalSelf|HabitPolicy|LongHorizonMemory|MindEcology|MotiveEngine)SystemBlock|describeAlicizationMainChatProviderMindRequirement/u,
    )
    expect(source).toContain('buildAlicizationProviderFactBlock')
  })
})
