import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationAutonomousDialogueGovernedFiles,
} from './autonomous-dialogue-entrypoint-audit'
import {
  collectAlicizationAutonomousDialogueCandidateFiles,
} from './autonomous-dialogue-entrypoint-candidate-audit'

describe('autonomous dialogue entrypoint candidate audit', () => {
  it('keeps broader autonomous-dialogue candidate discovery sourced from the shared governed helper instead of re-encoding one more local runtime-owned dialogue scan', () => {
    const source = readFileSync(new URL('./autonomous-dialogue-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./autonomous-dialogue-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationAutonomousDialogueGovernedFiles(')
    expect(/^function collectAutonomousDialogueGovernedFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader autonomous-dialogue candidate discovery broad enough to catch proactive authority, gateway-authored proactive/reminder structured formats, reminder/callback entry, and subconscious carry seams instead of only one runtime-owned dialogue flavor', () => {
    const source = readFileSync(new URL('./autonomous-dialogue-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const remindersSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    expect(runtimeSource).toContain('[ALICIZATION_PROACTIVE_SELF_BRIEF]')
    expect(runtimeSource).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-proactive-llm\')')
    expect(runtimeSource).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-reminder\')')
    expect(remindersSource).toContain('kind: \'reminder\'')
    expect(remindersSource).toContain('kind: \'execution-callback\'')
    expect(remindersSource).toContain('resolveAlicizationAutonomousDialogueOrigin(\'proactive\')')
    expect(subconsciousSource).toContain('kind: \'subconscious\'')
    expect(subconsciousSource).toContain('resolveAlicizationAutonomousDialogueStructuredFormat(\'subconscious-proactive\')')
    expect(source).toContain('ALICIZATION_PROACTIVE_SELF_BRIEF')
    expect(source).toContain('resolveAlicizationAutonomousDialogueStructuredFormat\\(\'subconscious-proactive-llm\'\\)')
    expect(source).toContain('resolveAlicizationAutonomousDialogueStructuredFormat\\(\'subconscious-reminder\'\\)')
    expect(source).toContain('buildAlicizationAutonomousDialogueTurnId\\(')
    expect(source).toContain('kind: \'(reminder|execution-callback)\'')
    expect(source).toContain('kind: \'subconscious\'')
    expect(source).toContain('resolveAlicizationAutonomousDialogueStructuredFormat\\(\'subconscious-proactive\'\\)')
  })

  it('keeps the current autonomous-dialogue candidate set equal to the explicit governed files so the broader runtime-owned dialogue scan and registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationAutonomousDialogueCandidateFiles(rootDir)).toEqual(
      collectAlicizationAutonomousDialogueGovernedFiles(rootDir),
    )
  }, 20_000)

  it('makes the current boundary explicit: broader autonomous-dialogue candidates now feed the same top-level completeness guard, while future runtime-owned dialogue families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./autonomous-dialogue-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationAutonomousDialogueCandidateFiles(')
    expect(coverageSource).toContain('autonomous-dialogue-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('autonomous-dialogue-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future runtime-owned dialogue families still need explicit registration')
  })
})
