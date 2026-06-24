import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationContinuityDeliberationForFastPath,
  deriveAlicizationContinuityDeliberationFromSurface,
} from './continuity-deliberation'

describe('continuity deliberation', () => {
  it('marks held-autonomy afterglow as hold-for-opening before the line is ready to reopen', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary: 'That callback line is still here, but it should wait for a later opening window.',
            whyNow: 'Leave room first and requeue the same thread instead of pushing closeness now.',
            intrusionRisk: 'high',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'next-open-window',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
        },
      },
      agency: {
        autonomy: null,
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('execution-callback')
    expect(deliberation.arcStage).toBe('hold-for-opening')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('marks same-thread callback return as gentle-reopen when the held line is re-entering softly', () => {
    const deliberation = deriveAlicizationContinuityDeliberationForFastPath({
      runtimeDigest: {
        continuityPressure: 0.74,
        returnPressure: 0.71,
      } as any,
      continuityAnchor: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread.',
      preparedExecutionCarryText: 'callback:codex completed | thread-held-autonomy-later | stay on the same thread',
      latestUserText: '把刚才先忍住的那条线轻轻接回来。',
      previousUserText: '继续沿着刚才那条线，不要另起一段。',
      previousAssistantText: 'I am re-entering the same thread gently before widening.',
      sessionMirror: {
        executionSummary: 'recent=callback:codex:completed | afterglow=execution-callback | carry=trust-warming',
        dialogueSummary: '',
      } as any,
      shortTurn: true,
      hasContinuity: true,
    })

    expect(deliberation.kind).toBe('execution-callback')
    expect(deliberation.arcStage).toBe('gentle-reopen')
    expect(deliberation.shouldSpeakNow).toBe(true)
  })

  it('marks later same-line continuation after reopening as same-thread-continuation', () => {
    const deliberation = deriveAlicizationContinuityDeliberationForFastPath({
      runtimeDigest: {
        continuityPressure: 0.72,
        returnPressure: 0.34,
      } as any,
      continuityAnchor: 'Stay on the same line and continue from the living thread instead of treating it as a restart.',
      preparedExecutionCarryText: '',
      latestUserText: '隔了一会儿也继续沿着这条原线往下。',
      previousUserText: '继续，就按这条原线往前。',
      previousAssistantText: 'We are still on the same line and can continue from there.',
      sessionMirror: {
        executionSummary: '',
        dialogueSummary: 'same line continuation on the living thread',
      } as any,
      shortTurn: true,
      hasContinuity: true,
    })

    expect(deliberation.kind).toBe('execution-callback')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('keeps same-thread-continuation and same-turn-if-invited timing when a measured-return same line is already continuing', () => {
    const deliberation = deriveAlicizationContinuityDeliberationForFastPath({
      runtimeDigest: {
        continuityPressure: 0.76,
        returnPressure: 0.41,
      } as any,
      continuityAnchor: 'The callback line is already continuing lower-pressure on the same line after another detour.',
      preparedExecutionCarryText: 'callback line already continuing | measured-return | stay on the same thread',
      latestUserText: '中间绕了一下，也还是沿着刚才那条线继续往下。',
      previousUserText: '继续，不要另起一段。',
      previousAssistantText: 'I am continuing on the same line without restarting from zero.',
      sessionMirror: {
        executionSummary: 'same line already continuing lower-pressure',
        dialogueSummary: 'continuation on the same line after another detour',
      } as any,
      shortTurn: true,
      hasContinuity: true,
    })

    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.preferredTiming).toBe('same-turn-if-invited')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('promotes an already-continuing same callback line to next-open-window timing when repeated measured-return reopen guards are explicit', () => {
    const deliberation = deriveAlicizationContinuityDeliberationForFastPath({
      runtimeDigest: {
        continuityPressure: 0.82,
        returnPressure: 0.58,
      } as any,
      continuityAnchor: 'The callback line is already continuing lower-pressure on the same line after reopening several times, so do not restart it outward again.',
      preparedExecutionCarryText: 'callback line already continuing | measured-return | lower-pressure | already reopened several times | do not restart from zero',
      latestUserText: '中间又绕了一下，也还是沿着刚才那条线继续，但别重开。',
      previousUserText: '继续沿着同一条线，不要突然把关系放宽。',
      previousAssistantText: 'I am still continuing on the same callback line lower-pressure after several reopenings, not restarting from zero.',
      sessionMirror: {
        executionSummary: 'same callback line already continuing lower-pressure after several reopenings',
        dialogueSummary: 'same thread stays alive with measured-return guard and do-not-restart discipline',
      } as any,
      shortTurn: true,
      hasContinuity: true,
    })

    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('promotes an already-continuing same callback repair line to next-open-window timing when repeated repair-before-closeness guards are explicit', () => {
    const deliberation = deriveAlicizationContinuityDeliberationForFastPath({
      runtimeDigest: {
        continuityPressure: 0.82,
        returnPressure: 0.58,
      } as any,
      continuityAnchor: 'The callback repair line is already continuing repair-before-closeness on the same line after reopening several times, so do not restart it outward again.',
      preparedExecutionCarryText: 'callback line already continuing | repair-before-closeness | repair-first | already reopened several times | do not restart from zero',
      latestUserText: '中间又绕了一下，也还是沿着刚才那条修复线继续，但别重开，也别立刻把关系放宽。',
      previousUserText: '继续沿着同一条修复线，不要突然把关系放宽。',
      previousAssistantText: 'I am still continuing on the same callback repair line repair-before-closeness after several reopenings, not restarting from zero.',
      sessionMirror: {
        executionSummary: 'same callback repair line already continuing repair-before-closeness after several reopenings',
        dialogueSummary: 'same thread stays alive with repair-before-closeness guard and do-not-restart discipline',
      } as any,
      shortTurn: true,
      hasContinuity: true,
    })

    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('inherits same-thread continuation from runtime dialogue continuity evidence after a scene hop returns to the same living seam', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
      },
      agency: {
        autonomy: null,
      },
      dialogue: {
        currentConsciousFrame: {
          focusAnchor: 'callback seam TypeScript fix',
          consciousNeed: 'Bring the returned result back onto the same live seam without treating it like a restart.',
          speakingIntention: 'Let the wording keep the callback inside the same living continuity.',
          confidence: 0.79,
          reasonTags: [
            'subject:task-knot',
            'center:guide',
            'execution-callback-doctrine:lower-pressure',
            'continuity-regime:execution-callback',
          ],
        },
        conversationState: {
          jointThread: 'callback seam TypeScript fix',
          hostMove: '继续沿着刚才那条线轻一点往下。',
          primaryTurnAnchor: 'callback seam',
          primaryTurnAnchorSource: 'continuity-carry',
          activeProject: 'runtime seam',
          unansweredQuestion: '继续沿着刚才那条线轻一点往下。',
          owedRepair: null,
          activeCommitments: [],
          relationFrame: 'guide',
          continuityPolicy: 'stay-on-thread',
          memoryMode: 'dialogue-carry',
          memoryQueryHints: ['callback seam', 'scene hop return'],
          shouldHoldThread: true,
          carryEligible: true,
          carryReason: 'shared-attention-continuation',
          confidence: 0.81,
          narrative: ['same-thread-return after a scene hop'],
          updatedAt: 84_000,
        },
        dialogueWorldThread: {
          activeThread: 'callback seam TypeScript fix',
          currentQuestion: 'continue on the same living thread',
          primaryTurnAnchor: 'callback seam',
          primaryTurnAnchorSource: 'continuity-carry',
          openLoops: ['continue the same line after the scene hop'],
          recentlyResolvedLoops: [],
          carriedFacts: [],
          relationDrift: 'steady',
          memoryMode: 'dialogue-carry',
          recallKeys: ['callback seam'],
          carryEligible: true,
          carryReason: 'shared-attention-continuation',
          lastUserMove: '继续沿着刚才那条线轻一点往下。',
          lastAssistantMove: 'still on the same line',
          lastOutcome: 'pending',
          confidence: 0.82,
          narrative: ['same-thread-return after a scene hop'],
          updatedAt: 84_000,
        },
        replyDeliberation: {
          memoryMode: 'dialogue-carry',
          speakingFrom: 'held-memory',
          openingBeat: 'Stay with the callback seam without reopening as a fresh approach.',
          whyThisReplyNow: 'The fix line is back on screen, but the reply should stay measured.',
          shouldSpeak: false,
          confidence: 0.74,
        },
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('still surfaces same-thread continuation when proactive runtime has dialogue continuity evidence before reply deliberation is rebuilt', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
      },
      agency: {
        autonomy: null,
      },
      dialogue: {
        currentConsciousFrame: {
          focusAnchor: 'callback seam TypeScript fix',
          consciousNeed: 'Bring the returned result back onto the same live seam without treating it like a restart.',
          speakingIntention: 'Let the wording keep the callback inside the same living continuity.',
          confidence: 0.79,
          reasonTags: [
            'subject:task-knot',
            'center:guide',
            'execution-callback-doctrine:lower-pressure',
            'continuity-regime:execution-callback',
          ],
        },
        conversationState: {
          jointThread: 'callback seam TypeScript fix',
          hostMove: '继续沿着刚才那条线轻一点往下。',
          primaryTurnAnchor: 'callback seam',
          primaryTurnAnchorSource: 'continuity-carry',
          activeProject: 'runtime seam',
          unansweredQuestion: '继续沿着刚才那条线轻一点往下。',
          owedRepair: null,
          activeCommitments: [],
          relationFrame: 'guide',
          continuityPolicy: 'stay-on-thread',
          memoryMode: 'dialogue-carry',
          memoryQueryHints: ['callback seam', 'scene hop return'],
          shouldHoldThread: true,
          carryEligible: true,
          carryReason: 'shared-attention-continuation',
          confidence: 0.81,
          narrative: ['same-thread-return after a scene hop'],
          updatedAt: 85_000,
        },
        dialogueWorldThread: {
          activeThread: 'callback seam TypeScript fix',
          currentQuestion: 'continue on the same living thread',
          primaryTurnAnchor: 'callback seam',
          primaryTurnAnchorSource: 'continuity-carry',
          openLoops: ['continue the same line after the scene hop'],
          recentlyResolvedLoops: [],
          carriedFacts: [],
          relationDrift: 'steady',
          memoryMode: 'dialogue-carry',
          recallKeys: ['callback seam'],
          carryEligible: true,
          carryReason: 'shared-attention-continuation',
          lastUserMove: '继续沿着刚才那条线轻一点往下。',
          lastAssistantMove: 'still on the same line',
          lastOutcome: 'pending',
          confidence: 0.82,
          narrative: ['same-thread-return after a scene hop'],
          updatedAt: 85_000,
        },
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('derives same-thread continuation from background scene-shift continuity when a new debugging seam is still carrying the earlier unresolved line', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      perception: {
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'callback seam TypeScript fix',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 86_000,
          lastSeenAt: 86_000,
        },
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'debugging::callback-seam',
            kind: 'debugging',
            status: 'forming',
            source: 'grounded-scene',
            title: 'callback seam TypeScript fix',
            summary: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            confidence: 1,
            significance: 0.6,
            unresolved: true,
            beganAt: 86_000,
            lastUpdatedAt: 86_000,
          },
          lingeringThreads: [
            {
              id: 'debugging::previous-error',
              kind: 'debugging',
              status: 'lingering',
              source: 'continuity',
              title: 'red TypeScript error panel',
              summary: '宿主正把注意力压在 red TypeScript error panel 这个故障点上。',
              confidence: 0.81,
              significance: 0.48,
              unresolved: true,
              beganAt: 85_000,
              lastUpdatedAt: 86_000,
            },
            {
              id: 'browsing::roadmap',
              kind: 'browsing',
              status: 'lingering',
              source: 'continuity',
              title: 'project roadmap note page',
              summary: '宿主现在更像是在浏览 project roadmap note page。',
              confidence: 0.89,
              significance: 0.4,
              unresolved: false,
              beganAt: 85_500,
              lastUpdatedAt: 86_000,
            },
          ],
          continuity: {
            label: 'scene-shift',
            sceneAgeMs: 0,
            attentionAgeMs: 0,
            sameSceneAsBefore: false,
            sameAttentionAsBefore: false,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'drifting',
            burden: 'moderate',
          },
          updatedAt: 86_000,
        },
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            visibleSurface: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            truthState: 'live-grounded',
            truthBoundary: null,
            continuityPolicy: '',
            continuitySummary: 'scene-shift',
            staleRisk: 0.05,
          },
          relation: {
            subject: 'visible-scene',
            hostMove: null,
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: null,
            relationshipPosture: 'warm',
          },
          self: {
            stance: 'uncertain',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'hesitant',
            emotionalTension: 'tense-debug',
            initiativeAction: 'recheck',
            thought: '宿主正把注意力压在 red TypeScript error panel 这个故障点上。',
          },
          obligation: {
            shouldSpeak: false,
            answerAct: 'guide',
            turnMode: 'guide-current-knot',
            openingClaim: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            openingMove: 'Open from the concrete knot you are currently holding, then narrow to the actionable locus.',
            answerIntent: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            whyNow: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            repairState: 'none',
          },
          focusAnchor: 'callback seam TypeScript fix',
          confidence: 0.62,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 86_000,
        },
      },
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The line can return in a measured way without forcing closeness.',
          },
          summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The line can return in a measured way without forcing closeness.',
            },
            summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
          },
        },
        personStateProjection: {
          openingGuidance: 'Stay near, but let the host keep room to breathe.',
          manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation lower-pressure and less eager before closeness widens again.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          shouldSurface: true,
          shouldSpeak: false,
          why: 're-ground the scene before speaking about callback seam TypeScript fix',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('derives same-thread continuation from background scene-shift continuity when a new debugging seam is still carrying the earlier unresolved repair-before-closeness line', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      perception: {
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'callback seam TypeScript fix',
          source: 'screen-semantic-summary',
          confidence: 0.91,
          beganAt: 86_000,
          lastSeenAt: 86_000,
        },
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'debugging::callback-seam-repair-first',
            kind: 'debugging',
            status: 'forming',
            source: 'grounded-scene',
            title: 'callback seam TypeScript fix',
            summary: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            confidence: 1,
            significance: 0.6,
            unresolved: true,
            beganAt: 86_000,
            lastUpdatedAt: 86_000,
          },
          lingeringThreads: [
            {
              id: 'debugging::previous-repair',
              kind: 'debugging',
              status: 'lingering',
              source: 'continuity',
              title: 'red TypeScript error panel',
              summary: '宿主正把注意力压在 red TypeScript error panel 这个故障点上。',
              confidence: 0.81,
              significance: 0.48,
              unresolved: true,
              beganAt: 85_000,
              lastUpdatedAt: 86_000,
            },
          ],
          continuity: {
            label: 'scene-shift',
            sceneAgeMs: 0,
            attentionAgeMs: 0,
            sameSceneAsBefore: false,
            sameAttentionAsBefore: false,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'drifting',
            burden: 'moderate',
          },
          updatedAt: 86_000,
        },
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            visibleSurface: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            truthState: 'live-grounded',
            truthBoundary: null,
            continuityPolicy: '',
            continuitySummary: 'scene-shift',
            staleRisk: 0.05,
          },
          relation: {
            subject: 'visible-scene',
            hostMove: null,
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: null,
            relationshipPosture: 'warm',
          },
          self: {
            stance: 'uncertain',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'concerned',
            emotionalTension: 'repair-cooldown',
            initiativeAction: 'recheck',
            thought: '宿主正把注意力压在 red TypeScript error panel 这个故障点上。',
          },
          obligation: {
            shouldSpeak: false,
            answerAct: 'guide',
            turnMode: 'guide-current-knot',
            openingClaim: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            openingMove: 'Open from the concrete knot you are currently holding, but keep the repair line steady first.',
            answerIntent: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            whyNow: '宿主正把注意力压在 callback seam TypeScript fix 这个故障点上。',
            repairState: 'none',
          },
          focusAnchor: 'callback seam TypeScript fix',
          confidence: 0.62,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 86_000,
        },
      },
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'cooldown',
            summary: 'The line can return repair-before-closeness without forcing closeness.',
          },
          summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'cooldown',
              summary: 'The line can return repair-before-closeness without forcing closeness.',
            },
            summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
          },
        },
        personStateProjection: {
          openingGuidance: 'Stay near, but let repair settle before closeness widens.',
          manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation repair-before-closeness while the callback seam is still being resolved.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
          shouldSurface: true,
          shouldSpeak: false,
          why: 're-ground the scene before speaking about callback seam TypeScript fix',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('keeps same-thread continuation when a debugging reopen is still carrying an unresolved change-review seam', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      perception: {
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'later coding seam after noisy callback detour',
          source: 'screen-semantic-summary',
          confidence: 0.9,
          beganAt: 87_000,
          lastSeenAt: 87_000,
        },
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'debugging::later-coding-seam',
            kind: 'debugging',
            status: 'forming',
            source: 'grounded-scene',
            title: 'later coding seam after noisy callback detour',
            summary: '宿主回到了 later coding seam after noisy callback detour 这个当前故障点。',
            confidence: 1,
            significance: 0.62,
            unresolved: true,
            beganAt: 87_000,
            lastUpdatedAt: 87_000,
          },
          lingeringThreads: [
            {
              id: 'change-review::callback-result-seam',
              kind: 'change-review',
              status: 'lingering',
              source: 'continuity',
              title: 'runtime.ts - callback result seam',
              summary: '宿主还挂着 runtime.ts - callback result seam 这条未收束的改动核对线。',
              confidence: 0.84,
              significance: 0.5,
              unresolved: true,
              beganAt: 86_000,
              lastUpdatedAt: 87_000,
            },
            {
              id: 'browsing::roadmap',
              kind: 'browsing',
              status: 'lingering',
              source: 'continuity',
              title: 'project roadmap note page',
              summary: '宿主刚才还在浏览 project roadmap note page。',
              confidence: 0.88,
              significance: 0.38,
              unresolved: false,
              beganAt: 86_500,
              lastUpdatedAt: 87_000,
            },
          ],
          continuity: {
            label: 'scene-shift',
            sceneAgeMs: 0,
            attentionAgeMs: 0,
            sameSceneAsBefore: false,
            sameAttentionAsBefore: false,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'drifting',
            burden: 'moderate',
          },
          updatedAt: 87_000,
        },
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: '宿主回到了 later coding seam after noisy callback detour 这个当前故障点。',
            visibleSurface: 'runtime.ts - callback result seam 仍然挂在这条返回线后面。',
            truthState: 'live-grounded',
            truthBoundary: null,
            continuityPolicy: '',
            continuitySummary: 'scene-shift',
            staleRisk: 0.05,
          },
          relation: {
            subject: 'visible-scene',
            hostMove: null,
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: null,
            relationshipPosture: 'warm',
          },
          self: {
            stance: 'uncertain',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'hesitant',
            emotionalTension: 'tense-debug',
            initiativeAction: 'recheck',
            thought: 'runtime.ts - callback result seam 这条 earlier seam 还在，当前只是在 later coding seam after noisy callback detour 上继续往下。',
          },
          obligation: {
            shouldSpeak: false,
            answerAct: 'guide',
            turnMode: 'guide-current-knot',
            openingClaim: '宿主回到了 later coding seam after noisy callback detour 这个当前故障点。',
            openingMove: 'Stay on the same repair line instead of treating this as a fresh approach.',
            answerIntent: '宿主回到了 later coding seam after noisy callback detour 这个当前故障点。',
            whyNow: 'runtime.ts - callback result seam 还没收束，现在是在它延长出来的 later coding seam 上继续。',
            repairState: 'none',
          },
          focusAnchor: 'later coding seam after noisy callback detour',
          confidence: 0.63,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 87_000,
        },
      },
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The callback line should reopen in a measured-return cadence instead of a fresh eager approach.',
          },
          summary: 'Callback afterglow is still carrying the unresolved repair line.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The callback line should reopen in a measured-return cadence instead of a fresh eager approach.',
            },
            summary: 'Callback afterglow is still carrying the unresolved repair line.',
          },
        },
        personStateProjection: {
          openingGuidance: 'Keep the return lower-pressure and stay on the same repair thread.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while the callback seam is still being resolved.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          shouldSurface: true,
          shouldSpeak: false,
          why: 're-ground the current repair seam before widening the callback return',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('rebuilds same-thread continuation from thinner measured-return resident carry after noisier detours already stripped scene scaffolding', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still in motion after the noisier detour, so the return should stay lower-pressure.',
          },
          summary: 'Callback afterglow is still carrying the same line even though the foreground has already drifted.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The same callback line is still in motion after the noisier detour, so the return should stay lower-pressure.',
            },
            summary: 'Callback afterglow is still carrying the same line even though the foreground has already drifted.',
          },
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line is still in motion after noisier detours, so any reopening should remain lower-pressure',
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure instead of widening it into a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while the same callback line is still being continued.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.92,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback line is still live, so this should keep continuing lower-pressure instead of reopening from zero.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('rebuilds same-thread continuation from thinner repair-before-closeness resident carry after noisier detours already stripped scene scaffolding', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'cooldown',
            summary: 'The same callback repair line is still in motion after the noisier detour, so the return should stay repair-before-closeness.',
          },
          summary: 'Callback repair afterglow is still carrying the same line even though the foreground has already drifted.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'cooldown',
              summary: 'The same callback repair line is still in motion after the noisier detour, so the return should stay repair-before-closeness.',
            },
            summary: 'Callback repair afterglow is still carrying the same line even though the foreground has already drifted.',
          },
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback repair line is still in motion after noisier detours, so any reopening should remain repair-before-closeness',
          openingGuidance: 'Stay on the same callback repair line and keep the return repair-before-closeness instead of widening it into a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay repair-before-closeness while the same callback line is still being continued.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.92,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback repair line is still live, so this should keep continuing repair-before-closeness instead of reopening from zero.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('keeps same-thread continuation when person-state guidance says the callback line has already reopened multiple times and should continue lower-pressure instead of restarting again', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'This callback line has already reopened several times, so the next move should keep its measured-return cadence instead of warming into a fresh approach.',
          },
          summary: 'The same callback line is still alive after several reopenings, and the next outward move should stay lower-pressure.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'This callback line has already reopened several times, so the next move should keep its measured-return cadence instead of warming into a fresh approach.',
            },
            summary: 'The same callback line is still alive after several reopenings, and the next outward move should stay lower-pressure.',
          },
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line has already reopened multiple times, so any further move should continue lower-pressure on that thread instead of restarting from zero',
          openingGuidance: 'Stay on the same callback line and keep this next return lower-pressure; it has already reopened several times and should not restart as a fresh approach.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return because the same callback line has already reopened several times and is still being continued.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.94,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The callback line has already reopened several times, so this should keep continuing lower-pressure on the same thread instead of restarting outward again.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.summary).toContain('reopened multiple times')
    expect(deliberation.whyNow).toContain('same callback line')
  })

  it('does not fall back to hold-for-opening timing once an already-spoken same callback line is still continuing lower-pressure after another detour', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still in motion after another detour, so the return should stay lower-pressure without restarting from zero.',
          },
          summary: 'The same callback line is still live after it has already been spoken back into view once.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The same callback line is still in motion after another detour, so the return should stay lower-pressure without restarting from zero.',
            },
            summary: 'The same callback line is still live after it has already been spoken back into view once.',
          },
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line is still in motion and has already been spoken back into view, so it should keep continuing lower-pressure',
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure; this line is already continuing and should not be treated like a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return because the same callback line is already continuing after another detour.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.95,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback line is still live and already continuing lower-pressure, so this should not drop back into a fresh-reopen waiting posture.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
    expect(deliberation.preferredTiming).toBe('same-turn-if-invited')
    expect(deliberation.sourceTags).toContain('line:already-continuing')
  })

  it('rebuilds same-thread continuation from thin resident carry even when older conscious-frame tags still say hold-for-opening after yet another detour', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still live after another detour, so the return should stay lower-pressure instead of waiting from zero again.',
          },
          summary: 'The spoken callback seam is thinner now, but it is still the same living line.',
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line is still alive after another detour and should keep continuing lower-pressure',
          openingGuidance: 'The same callback line is still live and already continuing after another detour; do not widen it into a fresh reopen or drop it back into waiting from zero.',
          manifestationCadenceSummary: 'already reopened several times; same callback line is still live; keep continuing lower-pressure',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.93,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback line is still in motion after another detour, so keep continuing lower-pressure rather than cooling back into a fresh-reopen wait.',
        },
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
          focusAnchor: 'later coding seam after extra detour',
          consciousNeed: 'keep the callback line alive without widening it',
          speakingIntention: 'stay on the same line instead of treating it as a fresh approach',
        },
        conversationState: {
          continuityPolicy: 'stay-on-thread',
          carryEligible: true,
          carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
          jointThread: 'later coding seam after extra detour',
          narrative: ['the callback line is already continuing after another detour'],
          hostMove: 'another short detour before returning to the same seam',
        },
        dialogueWorldThread: {
          carryEligible: true,
          carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
          activeThread: 'later coding seam after extra detour',
          openLoops: ['callback line is already continuing lower-pressure after another detour'],
          narrative: ['same line remains alive after another detour'],
          lastAssistantMove: '我还是沿着刚才那条 callback 线轻一点继续，不把这次再绕开的回来当成重新开口。',
        },
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.sourceTags).toContain('line:already-continuing')
  })

  it('keeps same-thread continuation when only a thin conscious-frame tag and same-her opening guidance survive the spine runtime surface', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'same-her-baseline | lower-pressure | same callback seam',
            reasonCodes: ['hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
        personStateProjection: {
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure after the detour.',
        },
      },
      agency: {
        autonomy: null,
        initiative: null,
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.summary).toContain('same callback line')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('prefers fresher same-thread resident continuity over an older hold-for-opening affordance once the callback line is already continuing after another detour', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary: 'The callback line is still here, but it should wait for a later opening window.',
            whyNow: 'Leave room first and requeue the same thread instead of pushing closeness now.',
            intrusionRisk: 'high',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'next-open-window',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
        },
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The same callback line is still in motion after another detour, so the return should stay lower-pressure without restarting from zero.',
          },
          summary: 'The same callback line is still live after it has already been spoken back into view once.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The same callback line is still in motion after another detour, so the return should stay lower-pressure without restarting from zero.',
            },
            summary: 'The same callback line is still live after it has already been spoken back into view once.',
          },
        },
        personStateProjection: {
          summary: 'project_continuity=the same callback line is still in motion and has already been spoken back into view, so it should keep continuing lower-pressure',
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure; this line is already continuing and should not be treated like a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return because the same callback line is already continuing after another detour.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.95,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'The same callback line is still live and already continuing lower-pressure, so this should not drop back into a fresh-reopen waiting posture.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
    expect(deliberation.preferredTiming).toBe('same-turn-if-invited')
    expect(deliberation.sourceTags).toContain('line:already-continuing')
  })

  it('marks project-state callback carry when execution continuity still carries the same unfinished Phase 1 digital-life line', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      world: {
        worldModel: null,
      },
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary: 'Keep the execution-callback on the same local-first digital life thread while the unfinished Phase 1 closure is still open.',
            whyNow: 'This callback is still carrying project identity, current Phase 1 progress, and unfinished closure on one same living line.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
      },
      agency: {
        autonomy: null,
        initiative: null,
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('execution-callback')
    expect(deliberation.sourceTags).toContain('project-state-callback-carry')
  })

  it('treats same-her low-pressure anti-restart closure follow-up as same-thread continuation that should wait for the next opening', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      world: {
        worldModel: null,
      },
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary: 'Keep the same-her closure line inward until the current thread can hold the return without reopening from scratch.',
            whyNow: 'The same-her closure line still matters, but surfacing it too early would break the low-pressure return and make it read like it is reopening from scratch.',
            intrusionRisk: 'high',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'next-open-window',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
          placement: 'internal-only',
          styleNote: 'Keep the same-her closure return low-pressure and inward.',
        },
      },
      agency: {
        autonomy: null,
        initiative: null,
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldSpeakNow).toBe(false)
    expect(deliberation.sourceTags).toContain('memory-deliberation')
    expect(deliberation.whyNow).toContain('low-pressure')
    expect(deliberation.whyNow).toContain('reopening from scratch')
  })

  it('keeps same-thread continuation when the foreground drifts to browsing but unresolved callback seams still linger under staying-with-thread continuity', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      world: {
        worldModel: {
          activeThread: {
            id: 'browsing::project-roadmap',
            kind: 'browsing',
            status: 'forming',
            source: 'continuity',
            title: 'Project Roadmap - Arc',
            summary: '宿主现在更像是在浏览 Project Roadmap - Arc。',
            confidence: 0.78,
            significance: 0.38,
            unresolved: false,
          },
          lingeringThreads: [
            {
              id: 'deep-focus::later-coding-seam',
              kind: 'deep-focus',
              status: 'lingering',
              source: 'working-memory',
              title: 'runtime.ts - later coding seam',
              summary: 'later coding seam after noisy callback detour',
              confidence: 0.64,
              significance: 0.55,
              unresolved: true,
            },
            {
              id: 'change-review::callback-result-seam',
              kind: 'change-review',
              status: 'lingering',
              source: 'continuity',
              title: 'runtime.ts - callback result seam',
              summary: 'runtime.ts - callback result seam',
              confidence: 0.58,
              significance: 0.42,
              unresolved: true,
            },
          ],
          continuity: {
            label: 'staying-with-thread',
            sceneAgeMs: 220,
            attentionAgeMs: 220,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'drifting',
            burden: 'light',
          },
          updatedAt: 88_000,
        },
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: '再往下接一点，还是同一条线',
            visibleSurface: 'Project Roadmap - Arc',
            truthState: 'uncertain',
            truthBoundary: null,
            continuityPolicy: '',
            continuitySummary: 'staying-with-thread',
            staleRisk: 0.8,
          },
          memory: {
            carriedThread: '再往下接一点，还是同一条线',
            carriedFacts: [
              'Project Roadmap - Arc',
              'continue-thread around later coding seam after noisy callback detour',
            ],
            recallKeys: [
              '再往下接一点，还是同一条线',
              'later coding seam after noisy callback detour',
              'runtime.ts - callback result seam',
              'continue-thread around later coding seam after noisy callback detour',
            ],
          },
          self: {
            stance: 'accompany',
            mindMode: 'repairing',
            dominantDrive: 'repair',
            embodiedPresence: 'hesitant',
            emotionalTension: 'restless-switching',
            initiativeAction: 'recheck',
            thought: 'continue-thread around later coding seam after noisy callback detour',
          },
          obligation: {
            shouldSpeak: false,
            answerAct: 'ask-reground',
            turnMode: 'screen-repair',
            openingClaim: 'later coding seam after noisy callback detour',
            openingMove: 'Open by admitting the live view is not grounded enough yet, then lean back toward the same callback seam.',
            answerIntent: 'later coding seam after noisy callback detour',
            whyNow: 'runtime.ts - callback result seam still has not closed, and the current browse drift is happening above that same line.',
            repairState: 'need-reground',
            shouldAskForGrounding: true,
            shouldAcknowledgeRepair: true,
          },
          focusAnchor: 'later coding seam after noisy callback detour',
          confidence: 0.64,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 88_000,
        },
      },
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The line can return in a measured way without forcing closeness.',
          },
          summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The line can return in a measured way without forcing closeness.',
            },
            summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
          },
        },
        personStateProjection: {
          openingGuidance: 'Stay on the same callback line and keep the return lower-pressure instead of widening it into a fresh reopen.',
          manifestationCadenceSummary: 'Relationship timing should stay measured-return while the same callback line is still being continued.',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'protect the host focus around Project Roadmap - Arc project-phase1-life-loop keeps the action one step more reversible until the digital-life closure is more earned.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('rebuilds same-thread continuation from affective residue source signals after an extra detour drops projection scaffolding', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          residues: [
            {
              kind: 'repair',
              intensity: 0.18,
              persistence: 0.16,
              confidence: 0.58,
              polarity: 'protective',
              releaseMode: 'mind-only',
              summary: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
              sourceSignals: ['repair-posture:measured-repair'],
              lastUpdatedAt: 90_000,
            },
            {
              kind: 'afterglow',
              intensity: 0.04,
              persistence: 0.07,
              confidence: 0.48,
              polarity: 'warm',
              releaseMode: 'surface-eligible',
              summary: 'Execution-callback afterglow is still live across noisier desktop detours, so the later chat turn should stay measured-return.',
              sourceSignals: ['callback line still alive'],
              lastUpdatedAt: 90_000,
            },
          ],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.04,
          repairPressure: 0.18,
          burdenPressure: 0.06,
          trustPressure: 0.08,
          restProtectivePressure: 0,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'nearby-soft',
            companionshipDensity: 0.02,
            repairRecovery: 0.11,
            overreachRisk: 0.06,
            fatigueGuard: 0.02,
            afterglowCarry: 0.07,
            shouldDelayWarmth: false,
            shouldProtectRest: false,
            reasonTags: ['cadence-mode:measured-return'],
            summary: 'The line can return in a measured way without forcing closeness.',
          },
          sourceSignals: [
            'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
            'Execution-callback afterglow is still live across noisier desktop detours, so the later chat turn should stay measured-return.',
          ],
          summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
          updatedAt: 90_000,
        },
        personStateProjection: null,
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'protect the host focus around Project Roadmap - Arc until a fresher look re-grounds the line.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('keeps same-thread continuation but shifts to the next open window after repeated measured-return reopen guards unless the same spoken line is still explicitly in motion', () => {
    const cooledDeliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The callback return should stay lower-pressure after several reopen attempts.',
          },
          summary: 'The seam is still present, but repeated reopen guards mean she should wait for the next softer opening.',
        },
        personStateProjection: {
          summary: 'same callback line after repeated reopen guard',
          openingGuidance: 'The same callback line is still there, but already reopened several times, so do not force another fresh approach.',
          manifestationCadenceSummary: 'already reopened several times; measured-return; do not fresh reopen',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.92,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'keep the callback line alive quietly without widening it into another reopening.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(cooledDeliberation.kind).toBe('dialogue-carry')
    expect(cooledDeliberation.arcStage).toBe('same-thread-continuation')
    expect(cooledDeliberation.preferredTiming).toBe('next-open-window')
    expect(cooledDeliberation.sourceTags).toContain('guard:repeated-reopen')

    const stillContinuingDeliberation = deriveAlicizationContinuityDeliberationFromSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The callback return should stay lower-pressure after several reopen attempts.',
          },
          summary: 'The seam is still present and the spoken callback line is still explicitly in motion.',
        },
        personStateProjection: {
          summary: 'same callback line after repeated reopen guard',
          openingGuidance: 'The same callback line is still live and already reopened several times, but it is still in motion rather than waiting from zero.',
          manifestationCadenceSummary: 'already reopened several times; same callback line is still live; keep continuing lower-pressure',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 0.95,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'keep continuing on the same callback line without dropping back into a fresh reopen posture.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(stillContinuingDeliberation.kind).toBe('dialogue-carry')
    expect(stillContinuingDeliberation.arcStage).toBe('same-thread-continuation')
    expect(stillContinuingDeliberation.preferredTiming).toBe('next-open-window')
    expect(stillContinuingDeliberation.sourceTags).toContain('guard:repeated-reopen')
    expect(stillContinuingDeliberation.sourceTags).toContain('line:already-continuing')
  })

  it('rebuilds same-thread continuation from foreground drift plus lingering unresolved callback seams even after project continuity summary has thinned away', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface({
      world: {
        worldModel: {
          activeThread: {
            id: 'browsing::project-roadmap',
            kind: 'browsing',
            status: 'forming',
            source: 'continuity',
            title: 'Project Roadmap - Arc',
            summary: '宿主现在更像是在浏览 Project Roadmap - Arc。',
            confidence: 0.78,
            significance: 0.38,
            unresolved: false,
          },
          lingeringThreads: [
            {
              id: 'deep-focus::later-coding-seam',
              kind: 'deep-focus',
              status: 'lingering',
              source: 'working-memory',
              title: 'runtime.ts - later coding seam',
              summary: 'later coding seam after noisy callback detour',
              confidence: 0.64,
              significance: 0.55,
              unresolved: true,
            },
            {
              id: 'change-review::callback-result-seam',
              kind: 'change-review',
              status: 'lingering',
              source: 'continuity',
              title: 'runtime.ts - callback result seam',
              summary: 'runtime.ts - callback result seam',
              confidence: 0.58,
              significance: 0.42,
              unresolved: true,
            },
          ],
          continuity: {
            label: 'staying-with-thread',
            sceneAgeMs: 220,
            attentionAgeMs: 220,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'drifting',
            burden: 'light',
          },
          updatedAt: 88_000,
        },
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: '再往下接一点，还是同一条线',
            visibleSurface: 'Project Roadmap - Arc',
            truthState: 'uncertain',
            truthBoundary: null,
            continuityPolicy: '',
            continuitySummary: 'staying-with-thread',
            staleRisk: 0.8,
          },
          memory: {
            carriedThread: '再往下接一点，还是同一条线',
            carriedFacts: [
              'Project Roadmap - Arc',
              'continue-thread around later coding seam after noisy callback detour',
            ],
            recallKeys: [
              '再往下接一点，还是同一条线',
              'later coding seam after noisy callback detour',
              'runtime.ts - callback result seam',
              'continue-thread around later coding seam after noisy callback detour',
            ],
          },
          self: {
            stance: 'accompany',
            mindMode: 'repairing',
            dominantDrive: 'repair',
            embodiedPresence: 'hesitant',
            emotionalTension: 'restless-switching',
            initiativeAction: 'recheck',
            thought: 'continue-thread around later coding seam after noisy callback detour',
          },
          obligation: {
            shouldSpeak: false,
            answerAct: 'ask-reground',
            turnMode: 'screen-repair',
            openingClaim: 'later coding seam after noisy callback detour',
            openingMove: 'Open by admitting the live view is not grounded enough yet, then lean back toward the same callback seam.',
            answerIntent: 'later coding seam after noisy callback detour',
            whyNow: 'runtime.ts - callback result seam still has not closed, and the current browse drift is happening above that same line.',
            repairState: 'need-reground',
            shouldAskForGrounding: true,
            shouldAcknowledgeRepair: true,
          },
          focusAnchor: 'later coding seam after noisy callback detour',
          confidence: 0.64,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 88_000,
        },
      },
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: {
            cadenceMode: 'measured-return',
            summary: 'The line can return in a measured way without forcing closeness.',
          },
          summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            relationshipCadence: {
              cadenceMode: 'measured-return',
              summary: 'The line can return in a measured way without forcing closeness.',
            },
            summary: 'Repair residue is still carrying the line, so warmth should stay earned rather than rushed.',
          },
        },
        personStateProjection: {
          openingGuidance: '',
          manifestationCadenceSummary: '',
        },
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          confidence: 1,
          preferredStyle: 'silent-observe',
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
          shouldSurface: true,
          shouldSpeak: false,
          why: 'protect the host focus around Project Roadmap - Arc project-phase1-life-loop keeps the action one step more reversible until the digital-life closure is more earned.',
        },
      },
      dialogue: {
        replyDeliberation: null,
      },
    } as any)

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })
})
