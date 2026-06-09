import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationProjectStateAnswerGovernanceAuthorityFiles,
  alicizationProjectStateAnswerGovernanceContinuitySurfaceFiles,
  alicizationProjectStateAnswerGovernanceContractSurfaceFiles,
  alicizationProjectStateAnswerGovernanceEnricherFiles,
  alicizationProjectStateAnswerGovernanceReplySurfacePreflightFiles,
  resolveAlicizationProjectStateAnswerGovernanceAuditedFiles,
  resolveAlicizationProjectStateAnswerGovernanceAuditRegistry,
  resolveAlicizationProjectStateAnswerGovernanceMode,
} from './project-state-answer-governance-audit'
import { collectAlicizationProjectStateAnswerGovernanceFiles } from './project-state-answer-governance-entrypoint-audit'

describe('project state answer governance audit', () => {
  it('keeps project-state answer governance discovery sourced from a shared helper instead of a local owner scan', () => {
    const source = readFileSync(new URL('./project-state-answer-governance-audit.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./project-state-answer-governance-entrypoint-audit\'')
    expect(source).toContain('collectAlicizationProjectStateAnswerGovernanceFiles(')
    expect(/^function collectProjectStateAnswerGovernanceOwnerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps every current shared project-state answer governance owner and consumer explicitly registered', () => {
    const discoveredFiles = collectAlicizationProjectStateAnswerGovernanceFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationProjectStateAnswerGovernanceAuditedFiles().slice().sort())
    expect(resolveAlicizationProjectStateAnswerGovernanceAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
    expect(discoveredFiles).toContain('visible-reply/facade.ts')
  })

  it('keeps a single canonical governance authority and requires runtime answer-preparation seams to enrich project-state answers through it', () => {
    expect(alicizationProjectStateAnswerGovernanceAuthorityFiles).toEqual(['project-state-answer-governance.ts'])

    for (const relativePath of alicizationProjectStateAnswerGovernanceAuthorityFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('governance-authority')
      expect(source).toContain('alicizationProjectStateAnswerMustDo')
      expect(source).toContain('alicizationProjectStateAnswerMustNotDo')
      expect(source).toContain('enrichProjectStateAnswerGovernanceIfNeeded')
      expect(source).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
      expect(source).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
      expect(source).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
      expect(source).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
      expect(source).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
    }

    for (const relativePath of alicizationProjectStateAnswerGovernanceEnricherFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('answer-governance-enricher')
      expect(source).toContain('enrichProjectStateAnswerGovernanceIfNeeded(')
      expect(source).toContain(`answerSubject: 'project-state'`)
    }
  })

  it('requires project-state answer contract surfaces to reuse the shared same-her answer contract instead of improvising thinner local status rules', () => {
    for (const relativePath of alicizationProjectStateAnswerGovernanceContractSurfaceFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('answer-contract-surface')
      if (relativePath === 'executive-answer-brief.ts') {
        expect(source).toContain('alicizationProjectStateAnswerMustDo')
        expect(source).toContain('looksLikeProjectStateDirectAnswerTurn')
      }
      else if (relativePath === 'main-chat-active-dialogue-loop.ts') {
        expect(source).toContain('alicizationProjectStateAnswerContractLines')
        expect(source).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
      }
      else {
        expect(source).toContain('alicizationProjectStateAnswerContractLines')
        expect(source).toContain('alicizationProjectStateAnswerMustDo')
        expect(source).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
      }
    }
  })

  it('requires visible reply and persistence continuity surfaces to keep shared same-her / landed / open / next reminders explicit', () => {
    expect(alicizationProjectStateAnswerGovernanceContinuitySurfaceFiles).toContain('visible-reply/semantic-judge.ts')

    for (const relativePath of alicizationProjectStateAnswerGovernanceContinuitySurfaceFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('visible-reply-continuity-surface')

      if (relativePath === 'response-surface-contract.ts') {
        expect(source).toContain('alicizationProjectStateSameHerContinuityReminder')
        expect(source).toContain(`alicizationProjectStateVisibleReplySameHerReminder.replace('questions', 'status')`)
      }
      else if (relativePath === 'visible-reply/critic.ts') {
        expect(source).toContain('alicizationProjectStateVisibleReplySameHerReminder')
        expect(source).toContain('pushUnique(mustPreserve, alicizationProjectStateVisibleReplySameHerReminder)')
      }
      else if (relativePath === 'visible-reply/semantic-judge.ts') {
        expect(source).toContain('alicizationProjectStateVisibleReplySameHerReminder')
        expect(source).toContain('alicizationProjectStateVisibleReplyOpenClosureReminder')
        expect(source).toContain('alicizationProjectStateVisibleReplyNextClosureReminder')
      }
      else if (relativePath === 'runtime.ts') {
        expect(source).toContain('alicizationProjectStatePersistenceLandedReminder')
        expect(source).toContain('alicizationProjectStatePersistenceNextClosureReminder')
        expect(source).toContain('continuitySummary:')
      }
      else {
        expect(source).toContain('alicizationProjectStateVisibleReplySameHerReminder')
        expect(source).toContain('alicizationProjectStatePersistenceLandedReminder')
      }
    }
  })

  it('requires visible-reply surface preflight planners to keep canonical project preflight self-awareness explicit before executive answer briefing and response-surface contract shaping', () => {
    const source = readFileSync(new URL('./visible-reply/facade.ts', import.meta.url), 'utf8')
    const projectStateIndex = source.indexOf('const projectState = resolveVisibleReplyProjectState({')
    const responseCharterIndex = source.indexOf('const responseCharter = buildAlicizationResponseCharter({')
    const executiveAnswerBriefIndex = source.indexOf('const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({')
    const responseSurfaceContractIndex = source.indexOf('const responseSurfaceContract = buildAlicizationResponseSurfaceContract({')

    expect(alicizationProjectStateAnswerGovernanceReplySurfacePreflightFiles).toContain('visible-reply/facade.ts')
    expect(resolveAlicizationProjectStateAnswerGovernanceMode('visible-reply/facade.ts')).toBe('reply-surface-preflight')
    expect(source).toContain('const projectState = resolveVisibleReplyProjectState({')
    expect(source).toContain('const responseCharter = buildAlicizationResponseCharter({')
    expect(source).toContain('const executiveAnswerBrief = buildAlicizationExecutiveAnswerBrief({')
    expect(source).toContain('const responseSurfaceContract = buildAlicizationResponseSurfaceContract({')
    expect(projectStateIndex).toBeGreaterThan(-1)
    expect(responseCharterIndex).toBeGreaterThan(projectStateIndex)
    expect(executiveAnswerBriefIndex).toBeGreaterThan(responseCharterIndex)
    expect(responseSurfaceContractIndex).toBeGreaterThan(responseCharterIndex)
    expect(source).toContain('preflightSummary')
  })
})
