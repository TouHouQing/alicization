import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const serviceRoot = new URL('./', import.meta.url)

function readServiceSource(relativePath: string) {
  return readFileSync(new URL(relativePath, serviceRoot), 'utf8')
}

describe('project-state reply governance removal', () => {
  it('removes the fixed project-state reply authority module', () => {
    expect(existsSync(new URL('./project-state-answer-governance.ts', serviceRoot))).toBe(false)
  })

  it('keeps project-state facts out of fixed reply governance call sites', () => {
    const productionFiles = [
      './executive-answer-brief.ts',
      './response-surface-contract.ts',
      './runtime-delivery-reminders.ts',
      './runtime-main-gateway-one-shot.ts',
      './runtime.ts',
    ]

    expect(existsSync(new URL('./visible-reply/semantic-judge.ts', serviceRoot))).toBe(false)

    for (const relativePath of productionFiles) {
      const source = readServiceSource(relativePath)
      expect(source, relativePath).not.toContain('project-state-answer-governance')
      expect(source, relativePath).not.toMatch(
        /alicizationProjectStateAnswer|alicizationProjectStatePersistence|alicizationProjectStateVisibleReply|enrichProjectStateAnswerGovernanceIfNeeded/u,
      )
    }
  })

  it('does not rebuild a project-state answer contract around fixed must-do prose', () => {
    const executiveSource = readServiceSource('./executive-answer-brief.ts')
    const oneShotSource = readServiceSource('./runtime-main-gateway-one-shot.ts')

    expect(executiveSource).not.toContain('enrichedProjectStateVisibleGovernance')
    expect(executiveSource).not.toContain('alicizationProjectStateAnswerMustDo')
    expect(executiveSource).not.toContain('alicizationProjectStateAnswerMustNotDo')
    expect(oneShotSource).not.toContain('ProjectStateAnswerContract')
    expect(oneShotSource).not.toContain('buildSceneAppraisalProjectStateAnswerContractSystemBlock')
  })

  it('removes bridge audits whose only purpose was proving the deleted reply-governance chain', () => {
    const obsoleteBridgeAudits = [
      './self-evolution-reply-planning-governance-bridge-audit.test.ts',
      './self-evolution-downstream-visible-reply-bridge-audit.test.ts',
      './self-evolution-replay-reopen-continuity-bridge-audit.test.ts',
      './self-evolution-return-side-reentry-bridge-audit.test.ts',
      './self-evolution-desktop-full-cycle-bridge-audit.test.ts',
      './self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts',
      './self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts',
      './self-evolution-remembered-emotional-carry-bridge-audit.test.ts',
      './self-evolution-durable-self-recognition-bridge-audit.test.ts',
      './self-evolution-pre-dialogue-planning-bridge-audit.test.ts',
      './proactive-anthropomorphic-host-visible-bridge-audit.test.ts',
      './proactive-remembered-emotional-carry-bridge-audit.test.ts',
      './proactive-pre-dialogue-planning-bridge-audit.test.ts',
      './proactive-replay-reopen-continuity-bridge-audit.test.ts',
    ]

    for (const relativePath of obsoleteBridgeAudits)
      expect(existsSync(new URL(relativePath, serviceRoot)), relativePath).toBe(false)
  })

  it('removes deleted reply-governance audit names from project-state coverage proofs', () => {
    const coverageSource = readServiceSource('./project-state-brief.ts')
    const obsoleteAuditNames = [
      'self-evolution-answer-governance-bridge-audit.test.ts',
      'self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts',
      'self-evolution-reply-planning-governance-bridge-audit.test.ts',
      'self-evolution-downstream-visible-reply-bridge-audit.test.ts',
      'self-evolution-replay-reopen-continuity-bridge-audit.test.ts',
      'self-evolution-return-side-reentry-bridge-audit.test.ts',
      'self-evolution-desktop-full-cycle-bridge-audit.test.ts',
      'self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts',
      'self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts',
      'self-evolution-remembered-emotional-carry-bridge-audit.test.ts',
      'self-evolution-durable-self-recognition-bridge-audit.test.ts',
      'self-evolution-pre-dialogue-planning-bridge-audit.test.ts',
      'proactive-pre-dialogue-reply-planning-bridge-audit.test.ts',
      'proactive-downstream-visible-reply-bridge-audit.test.ts',
      'proactive-replay-reopen-continuity-bridge-audit.test.ts',
      'proactive-anthropomorphic-host-visible-bridge-audit.test.ts',
      'proactive-remembered-emotional-carry-bridge-audit.test.ts',
      'proactive-pre-dialogue-planning-bridge-audit.test.ts',
    ]

    for (const auditName of obsoleteAuditNames)
      expect(coverageSource, auditName).not.toContain(auditName)
  })
})
