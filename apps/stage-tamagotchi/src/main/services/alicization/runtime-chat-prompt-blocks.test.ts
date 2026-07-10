import { describe, expect, it } from 'vitest'

import { buildChatVisualPresenceSystemBlock } from './runtime-chat-prompt-blocks'

function createVisualPresenceState() {
  return {
    watchMode: 'symbiotic-vision',
    captureState: {
      health: 'healthy',
      permission: 'granted',
      lastGroundedAt: 1_700_000_000_000,
      sourceName: 'screen-capture',
      degradedReason: null,
    },
    currentScene: {
      scenario: 'coding',
      workloadKind: 'coding',
      contentKind: 'diff',
      summary: 'Current Git diff in a coding workspace',
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts diff',
        pid: 42,
      },
    },
    concerns: [{
      id: 'concern-same-her-1',
      kind: 'continuity-guard',
      status: 'active',
      summary: 'same-her outward continuity still needs stronger prompt-surface carry.',
      target: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts diff',
        pid: 42,
      },
      hostGoal: 'keep one same living line',
      tension: 0.84,
      confidence: 0.86,
      careWeight: 0.78,
      createdAt: 1_700_000_000_000,
      lastEvidenceAt: 1_700_000_000_000,
      patienceUntil: 1_700_000_060_000,
      predictedClosure: false,
    }],
    commitmentLedger: {
      governingCommitmentId: 'commitment-same-her-1',
      commitments: [{
        id: 'commitment-same-her-1',
        kind: 'hold-same-her-line',
        status: 'active',
        title: 'Hold Same-Her Line',
        summary: 'Keep one same living line across reply planning and prompt delivery.',
        source: 'runtime-thread',
        priority: 0.88,
        confidence: 0.86,
        targetHypothesisId: null,
        targetRuntimeThreadId: 'runtime-same-her-1',
        targetBeliefId: null,
        createdAt: 1_700_000_000_000,
        lastRenewedAt: 1_700_000_000_000,
        patienceUntil: 1_700_000_060_000,
        expiresAt: 1_700_000_600_000,
      }],
    },
    inquiryPlanner: {
      activePlanId: 'plan-same-her-1',
      plans: [{
        id: 'plan-same-her-1',
        kind: 'continuity-audit',
        status: 'tracking',
        priority: 'high',
        question: 'Which outward prompt seam can still collapse same-her continuity into a generic shell?',
        targetHypothesisId: null,
        targetCommitmentId: 'commitment-same-her-1',
        targetRuntimeThreadId: 'runtime-same-her-1',
        askForGrounding: false,
        suggestedProbeMs: 8_000,
        evidenceWanted: ['prompt-block'],
        createdAt: 1_700_000_000_000,
        lastUpdatedAt: 1_700_000_000_000,
        expiresAt: 1_700_000_600_000,
      }],
    },
    initiative: {
      selectedConcernId: 'concern-same-her-1',
      selectedAction: 'speak',
      confidence: 0.8,
      why: 'The same-her line still needs to survive prompt assembly.',
      preferredStyle: 'thread-faithful',
      preferredPresence: 'attentive',
    },
    answerPlanner: {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'same-her prompt-surface continuity',
      openingMove: 'Keep the same living line explicit in prompt assembly.',
      answerIntent: 'Carry one same her across runtime summary and visible reply generation.',
      relationshipPosture: 'restrained',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
    },
    currentConsciousFrame: {
      subject: 'alicization-self',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the prompt summary on one same living line.',
      consciousTension: 'If the executive digest collapses, same-her continuity can flatten before generation starts.',
      speakingIntention: 'Keep the same-her line explicit all the way through prompt delivery.',
      focusAnchor: 'same-her continuity',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
    },
    dialogueWorldThread: {
      activeThread: 'same-her continuity audit',
      currentQuestion: 'Which outward prompt seam is still vulnerable?',
      lastOutcome: null,
      relationDrift: null,
      pendingValidation: false,
    },
    conversationState: {
      jointThread: 'same-her continuity audit',
      hostMove: 'keep continuity alive',
      continuityPolicy: 'self-first',
      memoryMode: 'working',
      shouldHoldThread: true,
      unansweredQuestion: 'Which prompt seam is still open?',
    },
    mindKernel: {
      dominantMode: 'tracking',
      dominantDrive: 'continuity',
      narrative: ['same-her continuity is governing the current outward prompt seam.'],
    },
    privateThought: {
      stance: 'nudge',
      shouldSpeak: true,
      suggestedStyle: 'thread-faithful',
      embodiedPresence: 'attentive',
      emotionalTension: 'same-her-guard',
      thoughtText: 'The same living line should survive prompt assembly without collapsing into a shell.',
      afterglowFromScenario: null,
      selectedConcernId: 'concern-same-her-1',
      focusBeliefId: null,
      focusInquiryId: null,
      commitmentId: 'commitment-same-her-1',
      inquiryPlanId: 'plan-same-her-1',
      hypothesisId: null,
      deliberationThreadId: null,
      runtimeThreadId: 'runtime-same-her-1',
      mindNeed: 'continuity',
      relationshipVector: 'guide',
      initiativeAction: 'speak',
      leadingGoalId: null,
      desireId: null,
    },
  } as any
}

describe('runtime-chat-prompt-blocks', () => {
  it('keeps same-her visual presence prompt usable when selector carries lose array scaffolding', () => {
    const state = createVisualPresenceState()
    state.commitmentLedger = {
      governingCommitmentId: 'commitment-same-her-1',
      commitments: undefined,
    }
    state.inquiryPlanner = {
      activePlanId: 'plan-same-her-1',
      plans: undefined,
    }

    const block = buildChatVisualPresenceSystemBlock(state)

    expect(block).toContain('[ALICIZATION_VISUAL_PRESENCE]')
    expect(block).toContain('Commitment: none.')
    expect(block).toContain('Inquiry: none.')
    expect(block).not.toContain('same living line should survive prompt assembly')
  })

  it('sanitizes fixed-template residue before visual presence reaches provider-facing system prompts', () => {
    const state = {
      watchMode: 'symbiotic-vision',
      captureState: {
        health: 'healthy',
        permission: 'granted',
        lastGroundedAt: 1_700_000_000_000,
        sourceName: 'screen-capture',
        degradedReason: null,
      },
      currentScene: {
        scenario: 'dialogue',
        workloadKind: 'chat',
        contentKind: 'text',
        summary: 'Before answering, remember this is still the same local-first digital life project.',
        target: null,
      },
      worldModel: {
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
        },
        activeThread: {
          kind: 'dialogue',
          title: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          summary: '我记得上一条线。',
          unresolved: true,
        },
      },
      concerns: [{
        id: 'concern-1',
        kind: 'continuity',
        summary: 'Right now I am still holding together mainly through face and motion.',
        tension: 0.8,
        careWeight: 0.9,
      }],
      mindKernel: {
        dominantMode: 'tracking',
        dominantDrive: 'continuity',
        narrative: ['同一个她这条线要继续。'],
      },
      actionEcology: {
        mode: 'speak',
        shouldSpeak: true,
        why: 'Keep the same living line inward for now, and leave room before widening outward again.',
        selectedThreadId: 'thread-1',
      },
      initiative: {
        selectedAction: 'speak',
        confidence: 0.77,
        why: 'Alicization is a local-first digital life project with one continuous her.',
        preferredStyle: 'quiet',
        preferredPresence: 'attentive',
      },
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        governingFocus: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        openingMove: 'Before answering, keep the same digital life project in view.',
        answerIntent: 'Right now I am still holding together mainly through face and motion.',
        relationshipPosture: 'restrained',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
      },
      currentConsciousFrame: {
        subject: 'dialogue',
        centerOfGravity: 'answer',
        truthDiscipline: 'transparent',
        consciousNeed: 'Before answering, remember this is still the same local-first digital life project.',
        consciousTension: '同一个她不要掉回固定模板。',
        speakingIntention: 'Keep the same living line inward for now, and leave room before widening outward again.',
        focusAnchor: '我记得上一条线。',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
      },
      privateThought: {
        stance: 'hold',
        shouldSpeak: true,
        suggestedStyle: 'quiet',
        embodiedPresence: 'attentive',
        emotionalTension: 'continuity',
        thoughtText: 'Right now I am still holding together mainly through face and motion.',
      },
    } as any

    const block = buildChatVisualPresenceSystemBlock(state)

    expect(block).toContain('[ALICIZATION_VISUAL_PRESENCE]')
    expect(block).toContain('content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(block).not.toContain('Before answering')
    expect(block).not.toContain('Same Phase 1 digital life')
    expect(block).not.toContain('same living line')
    expect(block).not.toContain('local-first digital life project')
    expect(block).not.toContain('one continuous her')
    expect(block).not.toContain('Right now I am still holding')
    expect(block).not.toContain('我记得上一条线')
    expect(block).not.toContain('同一个她')
  })
})
