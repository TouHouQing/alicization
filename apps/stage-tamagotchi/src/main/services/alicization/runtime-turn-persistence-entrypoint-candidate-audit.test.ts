import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationRuntimeTurnPersistenceAuditedFiles,
} from './runtime-turn-persistence-audit'
import {
  collectAlicizationRuntimeTurnPersistenceFiles,
} from './runtime-turn-persistence-entrypoint-audit'

describe('runtime turn persistence entrypoint candidate audit', () => {
  it('keeps broader guarded turn persistence candidate discovery sourced from the shared audited helper instead of re-encoding one more local guarded-writer scan', () => {
    const source = readFileSync(new URL('./runtime-turn-persistence-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./runtime-turn-persistence-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationRuntimeTurnPersistenceFiles(')
    expect(/^function collectAppendConversationTurnGuardCallsiteFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader guarded turn persistence candidate discovery broad enough to catch persistence authority, renderer dialogue entry, proactive turn entry, reminder or callback turn entry, and origin-spoof rejection instead of only one append seam flavor', () => {
    const source = readFileSync(new URL('./runtime-turn-persistence-entrypoint-audit.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const invokeHandlersSource = readFileSync(new URL('./runtime-invoke-handlers-dialogue.ts', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const remindersSource = readFileSync(new URL('./runtime-delivery-reminders.ts', import.meta.url), 'utf8')

    expect(runtimeSource).toContain('appendConversationTurnWithGuards(')
    expect(runtimeSource).toContain('const originOnlyAutonomousSpoof')
    expect(invokeHandlersSource).toContain('appendConversationTurnWithGuards(')
    expect(subconsciousSource).toContain('appendConversationTurnWithGuards(')
    expect(remindersSource).toContain('appendConversationTurnWithGuards(')
    expect(source).toContain('appendConversationTurnWithGuards(')
  })

  it('keeps the current guarded turn persistence candidate set equal to the explicit audited files so the broader guarded-writer scan and audit registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationRuntimeTurnPersistenceFiles(rootDir)).toEqual(
      resolveAlicizationRuntimeTurnPersistenceAuditedFiles().slice().sort(),
    )
  })

  it('makes the current boundary explicit: broader guarded turn persistence candidates now feed the same top-level completeness guard, while future guarded persistence families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./runtime-turn-persistence-entrypoint-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationRuntimeTurnPersistenceFiles(')
    expect(coverageSource).toContain('runtime-turn-persistence-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('runtime-turn-persistence-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future guarded persistence families still need explicit classification')
  })
})
