import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  alicizationProjectStateAnswerGovernanceAnswerPlanningFiles,
  alicizationProjectStateAnswerGovernanceAuthorityFiles,
  alicizationProjectStateAnswerGovernanceContinuitySurfaceFiles,
  alicizationProjectStateAnswerGovernanceContractSurfaceFiles,
  alicizationProjectStateAnswerGovernanceEnricherFiles,
  alicizationProjectStateAnswerGovernanceReplySurfacePreflightFiles,
  alicizationProjectStateAnswerGovernanceResponseCharterFiles,
  alicizationProjectStateAnswerGovernanceSemanticsClassificationFiles,
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
    expect(discoveredFiles).toContain('runtime-governance.ts')
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
      else if (relativePath === 'runtime-governance.ts') {
        expect(source).toContain('function resolveProjectStateContinuityCarry(')
        expect(source).toContain('preDialogueAwarenessSummary')
        expect(source).toContain('landedProgressSummary')
        expect(source).toContain('openClosureSummary')
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

  it('requires project-status semantics, answer planning, and response charter shaping surfaces to keep direct project-state same-her governance explicit before later answer-contract or visible-reply layers begin', () => {
    expect(alicizationProjectStateAnswerGovernanceSemanticsClassificationFiles).toEqual(['dialogue-turn-semantics.ts'])
    expect(alicizationProjectStateAnswerGovernanceAnswerPlanningFiles).toEqual(['answer-planner.ts'])
    expect(alicizationProjectStateAnswerGovernanceResponseCharterFiles).toEqual(['response-charter.ts'])

    for (const relativePath of alicizationProjectStateAnswerGovernanceSemanticsClassificationFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('semantics-classification')
      expect(source).toContain('const projectStateMergeReadinessCuePattern')
      expect(source).toContain('const projectStateCompletionTimelineCuePattern')
      expect(source).toContain('const projectStateLanguageDriftCuePattern')
      expect(source).toContain(`reasonTags.push('project-state-continuity-question')`)
    }

    for (const relativePath of alicizationProjectStateAnswerGovernanceAnswerPlanningFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('answer-planning-surface')
      expect(source).toContain('function looksLikeProjectStateDirectAnswerTurn(')
      expect(source).toContain('same digital life line: Phase 1 landed progress, when the goal is expected to close, and whether the thread drifted out of the host language or project line still need one direct answer.')
      expect(source).toContain('Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    }

    for (const relativePath of alicizationProjectStateAnswerGovernanceResponseCharterFiles) {
      const source = readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationProjectStateAnswerGovernanceMode(relativePath)).toBe('response-charter-surface')
      expect(source).toContain('const namesProjectStateTurn = /project-state question|project status|project-state|project continuity/u.test(evidence)')
      expect(source).toContain('Keep direct project-state answers inward-first so the live payoff lands before any project-summary voice appears.')
      expect(source).toContain('Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.')
    }
  })
})
