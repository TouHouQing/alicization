import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))

const targetFixtureFiles = [
  'apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.test.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.test.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime-fixed-template-regression.test.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/one-shot-provider-boundary-audit.test.ts',
] as const

const conversationEntrypoints = [
  'apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-chat-perception-augment.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-memory-closure.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts',
] as const

const retiredTextTokens = [
  ['same', '-her'].join(''),
  ['same', ' her'].join(''),
  ['project', '-state'].join(''),
  ['opening', '_policy'].join(''),
  ['relationship', '_cadence'].join(''),
  ['visibility', '=', 'redacted', '_internal'].join(''),
] as const

const retiredResolverNames = [
  ['resolveAlicization', 'Project', 'StateBrief'].join(''),
  ['resolveAlicization', 'Project', 'StateSnapshot'].join(''),
  ['buildAlicization', 'Project', 'StateSystemBlock'].join(''),
  ['buildAlicization', 'Project', 'StateExtraSystemBlocks'].join(''),
  ['buildAlicization', 'Project', 'StateClosureDashboard'].join(''),
] as const

const retiredArtifactFields = [
  ['project', 'StateAudit'].join(''),
  ['project', 'StateEvidenceStatus'].join(''),
  ['same', 'HerInwardCarry'].join(''),
  ['opening', 'GuidanceHoldDetail'].join(''),
  ['companionship', 'HoldMode'].join(''),
  ['opening', 'EmbodimentAudit'].join(''),
] as const

function readRepoFile(relativePath: string) {
  return readFileSync(`${repoRoot}/${relativePath}`, 'utf8')
}

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex >= 0
    ? source.slice(startIndex, endIndex)
    : ''
}

describe('main chat template boundary audit', () => {
  it('keeps retired governance language out of the test fixtures themselves', () => {
    const failures = targetFixtureFiles.flatMap((relativePath) => {
      const source = readRepoFile(relativePath)
      return retiredTextTokens
        .filter(token => source.includes(token))
        .map(token => `${relativePath}: ${token}`)
    })

    expect(failures).toEqual([])
  })

  it('keeps retired context resolvers out of conversation entrypoints', () => {
    const failures = conversationEntrypoints.flatMap((relativePath) => {
      const source = readRepoFile(relativePath)
      return retiredResolverNames
        .filter(name => source.includes(name))
        .map(name => `${relativePath}: ${name}`)
    })

    expect(failures).toEqual([])
  })

  it('keeps the realization return object limited to provider text and transparent diagnostics', () => {
    const source = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts')
    const builderBody = sourceBetween(
      source,
      'export function buildAlicizationVisibleReplyRealizationArtifact',
      'export function resolveAlicizationPreparedVisibleReplyExecution',
    )

    expect(builderBody).toContain('const visibleText =')
    expect(builderBody).toContain('deriveAlicizationVisibleReplyText(input.fullText ?? \'\')')
    expect(builderBody).toContain('? \'\'')
    for (const field of retiredArtifactFields)
      expect(builderBody).not.toContain(`${field}:`)
  })

  it('keeps the main gateway typed and returns null on Provider failure', () => {
    const source = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.ts')

    expect(source).toContain('function sanitizeOneShotProviderSystemBlock')
    expect(source).toContain('const parsed = JSON.parse(text)')
    expect(source).toContain('typeof parsed.type !== \'string\'')
    expect(source).toContain('parsed.data === undefined')
    expect(source).toContain('return null')
    expect(source).toContain('main-gateway.one-shot-failed')
  })

  it('keeps explicit Provider and tool failures represented as evidence instead of authored replies', () => {
    const oneShotTest = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-one-shot.test.ts')
    const realizationTest = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.test.ts')
    const outcomeTest = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts')

    expect(oneShotTest).toContain('reports Provider failure through diagnostics')
    expect(oneShotTest).toContain('expect(result).toBeNull()')
    expect(realizationTest).toContain('keeps local timeout fallback explicit')
    expect(realizationTest).toContain('expect(recovered.visibleText).toBe(\'\')')
    expect(outcomeTest).toContain('keeps a real Provider failure as dynamic evidence')
    expect(outcomeTest).toContain('Tool failed: process exited with code 1.')
  })

  it('keeps WorkingMemory and LongTermMemoryRecall as the only memory prompt owners', () => {
    const runtimeSource = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts')
    const memoryContextSource = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.ts')
    const recallSource = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts')

    expect(runtimeSource).toContain('buildAlicizationMainChatMemoryContext')
    expect(runtimeSource).toContain('injectAlicizationMainChatMemoryContext')
    expect(memoryContextSource).toContain('WorkingMemoryOwnerContext')
    expect(memoryContextSource).toContain('LongTermMemoryRecall')
    expect(recallSource).toContain('alicization-long-term-memory-recall')
    expect(recallSource).toContain('owner: \'LongTermMemoryRecall\'')
  })

  it('keeps outcome reflection pass-through and emotional explanations empty', () => {
    const outcomeSource = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.ts')
    const emotionalSource = readRepoFile('apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.ts')

    expect(outcomeSource).toContain('export function attachSynthesizedReflections')
    const reflectionSourceStart = outcomeSource.indexOf('export function attachSynthesizedReflections')
    expect(reflectionSourceStart).toBeGreaterThanOrEqual(0)
    expect(outcomeSource.slice(reflectionSourceStart)).toContain('return input')
    expect(emotionalSource).toContain('why: \'\'')
    expect(emotionalSource).not.toContain('projectState')
  })

  it('does not expose raw critic or closure governance artifacts through public chat transport', () => {
    const auditedFiles = [
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts',
      'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.ts',
    ] as const
    const forbiddenAssignments = [
      'visibleReplyCritic: streamResult.visibleReplyCritic',
      'visibleReplyClosure: streamResult.visibleReplyClosure',
      'visibleReplyCritic: visibleReplyCritic',
      'visibleReplyClosure: visibleReplyClosure',
    ] as const

    const failures = auditedFiles.flatMap((relativePath) => {
      const source = readRepoFile(relativePath)
      return forbiddenAssignments
        .filter(fragment => source.includes(fragment))
        .map(fragment => `${relativePath}: ${fragment}`)
    })

    expect(failures).toEqual([])
  })
})
