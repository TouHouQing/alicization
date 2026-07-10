import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  projectStateObservationToContinuitySnapshot,
  readConversationTurnProjectStateObservation,
} from './project-state-observation'

const excludedContinuityResidue = 'content=excluded; reason=continuity-residue; visibility=internal-structured'

const fixedTemplateResiduePattern = new RegExp([
  'Before (?:answering|speaking|acting)',
  'Right now I am',
  'Same Phase 1 digital life',
  'same-her',
  'same living line',
  'one living her',
  'one continuous her',
  'host computer',
  'better chat wrapper',
  'project identity, landed progress, and open closure',
  '同一个她',
  '数字生命主线',
].join('|'), 'iu')

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(item => collectStringValues(item))

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(item => collectStringValues(item))

  return []
}

function expectNoFixedTemplateResidue(value: unknown) {
  for (const text of collectStringValues(value))
    expect(text, text).not.toMatch(fixedTemplateResiduePattern)
}

describe('project-state observation', () => {
  it('uses the shared project awareness resolver when rebuilding pre-dialogue awareness', () => {
    const source = readFileSync(new URL('./project-state-observation.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredProjectStateObservationAwarenessLine')
  })

  it('withholds fixed project-state persona residue while preserving structured progress evidence', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-template-residue',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: '',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before later rebuilds widen into a generic shell.',
          sameHerSelfLine: '',
          continuitySummary: '',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'same digital life | landed | open closure',
          companionHeadlineLine: '',
          companionBriefingLine: '',
          companionNextClosureLine: '',
          awarenessLine: '',
          emotionalClosureCue: '',
          reasonPreview: [],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rebuilt continuity snapshot.',
            preDialogueAwarenessSummary: 'Remember this is still the same digital life project before local fluency takes over.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rebuilt continuity snapshot.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.identity).toBe('project_state_owner=ProjectStateGovernance')
    expect(observation?.projectState.currentPhase).toBe('runtime_context=local_runtime')
    expect(observation?.projectState.nextClosureTarget).toBe('continuity_review_required')
    expect(observation?.projectState.sameHerSelfLine).toBe(excludedContinuityResidue)
    expect(observation?.projectState.sameHerDriftRisk).toBe(excludedContinuityResidue)
    expect(snapshot?.latestLandedProgress).toBe('Project-state continuity already survives into runtime preparation.')
    expect(snapshot?.primaryOpenLoop).toBe('Keep the still-open closure work explicit in the rebuilt continuity snapshot.')
    expect(snapshot?.sameHerSelfLine).toBe(excludedContinuityResidue)
    expect(snapshot?.sameHerDriftRisk).toBe(excludedContinuityResidue)
    expectNoFixedTemplateResidue(observation)
    expectNoFixedTemplateResidue(snapshot)
  })

  it('withholds fixed pre-dialogue closure copy without dropping structured status and reasons', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-closure-residue',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'project_state_owner=ProjectStateGovernance',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Body, face, and motion state already reached runtime observation.',
          primaryOpenLoop: 'Lipsync and voice still need a reviewed rejoin check before cross-modal closure is complete.',
          nextClosureTarget: 'Queue a cross-modal closure review before broadening.',
          continuitySummary: 'owner=ProjectStateGovernance; landed=embodiment-runtime-observation; open=cross-modal-review',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'embodiment closure is still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          sameHerDriftRiskLine: 'If this outward turn slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
          companionBriefingLine: 'Before speaking, remember full cross-modal same-her closure is not done yet.',
          companionNextClosureLine: 'Next closure: let lipsync and voice rejoin after review.',
          emotionalClosureCue: 'same-her closure seam: keep the reopening low-pressure while the same living line finishes rejoining.',
          reasons: [
            'segment=face-motion-body-rejoined-1',
            'remaining_open=lipsync+voice',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.status).toBe('partial')
    expect(observation?.preDialogueClosure?.summaryLine).toBe('embodiment closure is still unfinished before this turn opens outward.')
    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe(excludedContinuityResidue)
    expect(observation?.preDialogueClosure?.sameHerDriftRiskLine).toBe(excludedContinuityResidue)
    expect(observation?.preDialogueClosure?.companionBriefingLine).toBe(excludedContinuityResidue)
    expect(observation?.preDialogueClosure?.emotionalClosureCue).toBe(excludedContinuityResidue)
    expect(snapshot?.preDialogueClosure?.reasons).toEqual(expect.arrayContaining([
      'segment=face-motion-body-rejoined-1',
      'remaining_open=lipsync+voice',
    ]))
    expectNoFixedTemplateResidue(observation)
    expectNoFixedTemplateResidue(snapshot)
  })

  it('synthesizes structured awareness from an empty transported shell', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-empty-awareness-shell',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'project_state_owner=ProjectStateGovernance',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Memory and execution continuity are now visible in local runtime observation.',
          primaryOpenLoop: 'Initiative and embodiment still require review before the life loop is closed.',
          nextClosureTarget: 'Review initiative and embodiment closure evidence before widening.',
          continuitySummary: 'owner=ProjectStateGovernance; landed=memory+execution-observation; open=initiative+embodiment-review',
        },
        preDialogueAwareness: {},
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.status).toBe('partial')
    expect(observation?.preDialogueAwareness?.awarenessLine).toContain('identity=project_state_owner=ProjectStateGovernance')
    expect(observation?.preDialogueAwareness?.awarenessLine).toContain('phase=runtime_context=local_runtime')
    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'project_state_owner=ProjectStateGovernance',
      'runtime_context=local_runtime',
      'Memory and execution continuity are now visible in local runtime observation.',
      'Initiative and embodiment still require review before the life loop is closed.',
      'Review initiative and embodiment closure evidence before widening.',
    ]))
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Memory and execution continuity are now visible in local runtime observation.',
      'Initiative and embodiment still require review before the life loop is closed.',
    ]))
    expectNoFixedTemplateResidue(observation)
    expectNoFixedTemplateResidue(snapshot)
  })

  it('keeps legacy latestProgress and landedProgressSummary alive in continuity snapshots', () => {
    const legacySnapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-legacy-progress-observation',
      sessionId: 'session-legacy-progress-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'project_state_owner=ProjectStateGovernance',
        currentPhase: 'runtime_context=local_runtime',
        latestProgress: 'Legacy browser-local observation progress survives snapshot rebuilding.',
        primaryOpenLoop: 'Keep the resumed turn in project-state continuity before widening outward.',
        nextClosureTarget: 'Carry the reopened callback through structured continuity review.',
        continuitySummary: 'owner=ProjectStateGovernance; landed=legacy-progress; open=structured-continuity-review',
        sameHerSelfLine: null,
        sameHerHoldDetail: 'Keep the resumed turn lower-pressure on the reviewed continuity line before widening outward.',
      } as any,
      preDialogueAwareness: null,
      preDialogueClosure: null,
    } as any)

    const auditSnapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-audit-progress-observation',
      sessionId: 'session-audit-progress-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'project_state_owner=ProjectStateGovernance',
        currentPhase: 'runtime_context=local_runtime',
        latestLandedProgress: ' ',
        latestProgress: '   ',
        landedProgressSummary: 'Audit-style browser-local observation progress survives snapshot rebuilding.',
        primaryOpenLoop: 'Keep audit evidence separate from persona wording.',
        nextClosureTarget: 'Carry audit evidence through structured continuity review.',
        continuitySummary: 'owner=ProjectStateGovernance; landed=audit-progress; open=structured-continuity-review',
        sameHerSelfLine: null,
      } as any,
      preDialogueAwareness: null,
      preDialogueClosure: null,
    } as any)

    expect(legacySnapshot?.latestLandedProgress).toBe('Legacy browser-local observation progress survives snapshot rebuilding.')
    expect(legacySnapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Legacy browser-local observation progress survives snapshot rebuilding.',
      'Keep the resumed turn in project-state continuity before widening outward.',
    ]))
    expect(auditSnapshot?.latestLandedProgress).toBe('Audit-style browser-local observation progress survives snapshot rebuilding.')
    expect(auditSnapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Audit-style browser-local observation progress survives snapshot rebuilding.',
      'Keep audit evidence separate from persona wording.',
    ]))
    expectNoFixedTemplateResidue(legacySnapshot)
    expectNoFixedTemplateResidue(auditSnapshot)
  })

  it('keeps continuity behavior fields without deriving fixed persona copy', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-behavior-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'project_state_owner=ProjectStateGovernance',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Return-side continuity already survives browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the reopened callback inside structured continuity review before widening outward.',
          nextClosureTarget: 'Carry the reopened callback through reviewed continuity behavior.',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuityCue: 'continuity_cue=callback-review; action=continue-softly',
          continuitySummary: 'owner=ProjectStateGovernance; landed=return-side-observation; open=callback-review',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.continuityRestraint).toBe('measured-return')
    expect(observation?.projectState.continuityPreferredTiming).toBe('next-open-window')
    expect(observation?.projectState.continuityCadence).toBe('repair-before-closeness')
    expect(observation?.projectState.continuityCue).toBe('continuity_cue=callback-review; action=continue-softly')
    expect(snapshot?.continuityRestraint).toBe('measured-return')
    expect(snapshot?.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot?.continuityCadence).toBe('repair-before-closeness')
    expect(snapshot?.continuityCue).toBe('continuity_cue=callback-review; action=continue-softly')
    expectNoFixedTemplateResidue(observation)
    expectNoFixedTemplateResidue(snapshot)
  })
})
