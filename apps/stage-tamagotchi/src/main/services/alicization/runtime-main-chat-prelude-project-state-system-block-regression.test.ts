import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime main chat prelude project-state system block regression', () => {
  it('keeps the injected project-state system block explicit about identity, landed progress, open closure, and next closure before execution turns', () => {
    const preludeSource = readFileSync(new URL('./runtime-main-chat-prelude.ts', import.meta.url), 'utf8')
    const briefSource = readFileSync(new URL('./project-state-brief.ts', import.meta.url), 'utf8')

    expect(preludeSource).toContain('import { buildAlicizationProjectStateExtraSystemBlocks } from \'./project-state-brief\'')
    expect(preludeSource).toContain('carriesAlicizationCanonicalProjectState(messages)')
    expect(preludeSource).toContain('...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: \'system\', content }) as Message)')

    expect(briefSource).toContain('\'[ALICIZATION_PROJECT_STATE]\'')
    expect(briefSource).toContain('current_phase=')
    expect(briefSource).toContain('current_objective=')
    expect(briefSource).toContain('project_preflight=')
    expect(briefSource).toContain('latest_landed_progress=')
    expect(briefSource).toContain('same_her_self_line=')
    expect(briefSource).toContain('same_her_drift_risk=')
    expect(briefSource).toContain('primary_open_loop=')
    expect(briefSource).toContain('next_closure_target=')
    expect(briefSource).toContain('Before acting, keep the project identity, current phase, closed foundations, and still-open life loops in view')
  })
})
