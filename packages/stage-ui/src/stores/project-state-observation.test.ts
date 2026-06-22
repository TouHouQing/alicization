import { describe, expect, it } from 'vitest'

import {
  projectStateObservationToContinuitySnapshot,
  readConversationTurnProjectStateObservation,
} from './project-state-observation'

describe('project-state observation', () => {
  it('reduces structured project-state turns into same-her continuity observations', () => {
    const observation = readConversationTurnProjectStateObservation({
      turnId: 'turn-project-state-observation-1',
      sessionId: 'session-project-state-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Renderer return-side observation keeps the project-state carry available after reload.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat that as unfinished closure drift.',
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure.',
          companionBriefingLine: 'Before speaking, remember what this project is and what remains open.',
          companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
          awarenessLine: 'Before speaking, remember what this project is and what remains open.',
          reasonPreview: ['same-her renderer observation'],
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'Renderer observation should keep closure fields attached.',
          emotionalClosureCue: 'Keep the return lower-pressure while the same living line settles.',
          reasons: ['same-her closure carry'],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation).toEqual(expect.objectContaining({
      turnId: 'turn-project-state-observation-1',
      sessionId: 'session-project-state-observation',
      origin: 'user-turn',
      projectState: expect.objectContaining({
        identity: expect.stringContaining('local-first digital life project'),
        sameHerSelfLine: expect.stringContaining('Same Phase 1 digital life'),
        sameHerDriftRisk: expect.stringContaining('unfinished closure drift'),
      }),
      preDialogueAwareness: expect.objectContaining({
        status: 'grounded',
        awarenessLine: expect.stringContaining('what remains open'),
      }),
      preDialogueClosure: expect.objectContaining({
        emotionalClosureCue: expect.stringContaining('lower-pressure'),
      }),
    }))
    expect(snapshot).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      latestLandedProgress: expect.stringContaining('Renderer return-side observation'),
      primaryOpenLoop: expect.stringContaining('same-her closure seam'),
      preDialogueAwareness: expect.objectContaining({
        companionNextClosureLine: expect.stringContaining('same-her line'),
      }),
      preDialogueClosure: expect.objectContaining({
        reasons: ['same-her closure carry'],
      }),
    }))
  })

  it('uses project-state audit carry when the direct structured project state is thin', () => {
    const observation = readConversationTurnProjectStateObservation({
      turnId: 'turn-project-state-observation-audit-1',
      sessionId: 'session-project-state-observation-audit',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep the return-side continuity bridge explicit.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. The same living line still matters.',
            landedProgressSummary: 'Audit carry preserved landed project-state progress.',
            openClosureSummary: 'Audit carry preserved the still-open closure loop.',
            preDialogueAwarenessSummary: 'Audit carry preserved pre-dialogue project awareness.',
            continuitySummary: 'same-her=Same Phase 1 digital life | landed=Audit carry preserved landed progress | open=Audit carry preserved still-open closure',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    expect(observation?.projectState.sameHerSelfLine).toBe('Same Phase 1 digital life. The same living line still matters.')
    expect(observation?.projectState.latestLandedProgress).toBe('Audit carry preserved landed project-state progress.')
    expect(observation?.projectState.primaryOpenLoop).toBe('Audit carry preserved the still-open closure loop.')
    expect(observation?.preDialogueAwareness?.summaryLine).toBe('Audit carry preserved pre-dialogue project awareness.')
  })

  it('upgrades thin pre-dialogue awareness with richer project-state audit carry', () => {
    const observation = readConversationTurnProjectStateObservation({
      turnId: 'turn-project-state-observation-thin-awareness-1',
      sessionId: 'session-project-state-observation-thin-awareness',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep the return-side continuity bridge explicit.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness reminder',
          awarenessLine: 'generic same-her reminder',
          reasonPreview: [],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            landedProgressSummary: 'Renderer observation now carries project progress after reload.',
            openClosureSummary: 'The remaining closure is keeping memory, initiative, and embodiment on one line.',
            preDialogueAwarenessSummary: 'Alicization is still Phase 1 local digital life; renderer reload must preserve the same living project line.',
            continuitySummary: 'same-her=Phase 1 local digital life | landed=renderer carry | open=memory initiative embodiment closure',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    expect(observation?.preDialogueAwareness?.summaryLine).toBe(
      'Alicization is still Phase 1 local digital life; renderer reload must preserve the same living project line.',
    )
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(
      'Alicization is still Phase 1 local digital life; renderer reload must preserve the same living project line.',
    )
    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual([
      'same-her=Phase 1 local digital life | landed=renderer carry | open=memory initiative embodiment closure',
      'Alicization is a local-first digital life project.',
      'Renderer observation now carries project progress after reload.',
      'The remaining closure is keeping memory, initiative, and embodiment on one line.',
      'Keep the return-side continuity bridge explicit.',
    ])
  })
})
