import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('main chat session runtime project-state contract regression', () => {
  it('rebuilds the final provider-facing mind-turn contract from effective runtime governance instead of leaving project-state answer duties stranded in the earlier prelude contract snapshot', () => {
    const source = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function rebuildProviderFacingMindTurnContract(input: {')
    expect(source).toContain('governance: AlicizationMindTurnGovernance | null')
    expect(source).toContain('runtimeSurface: AlicizationMainChatRuntimeSurface | null')
    expect(source).toContain('answerSubject: \'project-state\'')
    expect(source).toContain('const mergedGovernanceRules = enrichProjectStateAnswerGovernanceIfNeeded({')
    expect(source).toContain('mustDo: mergeUniqueRules([')
    expect(source).toContain('mustNotDo: mergeUniqueRules([')
    expect(source).toContain('mustDo: mergedGovernanceRules?.mustDo ?? mergeUniqueRules([')
    expect(source).toContain('mustNotDo: mergedGovernanceRules?.mustNotDo ?? mergeUniqueRules([')
    expect(source).toContain('contract: rebuildProviderFacingMindTurnContract({')
    expect(source).toContain('governance: llmMindAuthorityGovernance')
    expect(source).toContain('runtimeSurface,')
    expect(source).toContain('normalizeProviderFacingMindTurnContract(')
    expect(source).toContain('rawPayload,')
  })

  it('treats thin marker-only project-state shells as missing so provider-facing runtime prep re-injects canonical same-her closure context', () => {
    const source = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('import { carriesAlicizationCanonicalProjectState } from \'./main-chat-project-state-guard\'')
    expect(source).toContain('if (!carriesAlicizationCanonicalProjectState(messages)) {')
    expect(source).toContain('...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: \'system\', content }) as Message)')
  })
})
