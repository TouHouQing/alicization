import { describe, expect, it } from 'vitest'

import { mainChatBackgroundRunTestInternals } from './main-chat-background-run'

describe('main chat background run project-state summary', () => {
  it('keeps the compatibility snapshot empty', () => {
    expect(mainChatBackgroundRunTestInternals.buildPreparedProjectStateClosureSnapshot(null)).toEqual({
      projectStateClosureSummary: null,
      projectStateIdentity: null,
      projectStatePhase: null,
      projectStateSameHerSelfLine: null,
      projectStateLatestLandedProgress: null,
      projectStatePrimaryOpenLoop: null,
      projectStateNextClosureTarget: null,
      projectStatePreflightSummary: null,
      projectStatePreDialogueAwarenessLine: null,
      projectStateAwarenessLine: null,
      projectStateCompanionBriefingLine: null,
      projectStatePreDialogueAwarenessSummary: null,
      projectStateContinuityPreferredTiming: null,
    })
  })
})
