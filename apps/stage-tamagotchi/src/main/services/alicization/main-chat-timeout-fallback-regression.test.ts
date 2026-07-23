import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('main-chat-timeout-fallback regression', () => {
  it('keeps timeout fallback limited to a transparent infrastructure failure artifact', () => {
    const source = readFileSync(new URL('./main-chat-timeout-fallback.ts', import.meta.url), 'utf8')

    expect(source).toContain('buildAlicizationMindAuthoringFailureArtifact')
    expect(source).toContain('stage: \'main-gateway-timeout\'')
    expect(source).toContain('reason: \'main-gateway-timeout-recovery-exhausted\'')
    expect(source).toContain('failureKind: \'timeout\'')
    expect(source).toContain('infra-status-only-timeout-fallback')
    expect(source).not.toContain('resolveAlicizationProjectStateBrief')
    expect(source).not.toContain('projectStateBrief')
    expect(source).not.toContain('projectStateAudit')
    expect(source).not.toContain('sameHerDriftRisk')
    expect(source).not.toContain('continuityArcStage')
    expect(source).not.toContain('preDialogueAwarenessLine')
  })
})
