import { describe, expect, it } from 'vitest'

import { buildDialogueMindFrameSystemBlock } from './dialogue-mind-frame'

describe('dialogue-mind-frame', () => {
  it('builds a natural-language authoritative speaking frame for task-bound turns', () => {
    const block = buildDialogueMindFrameSystemBlock({
      inspectionRequested: true,
      currentForeground: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'user.ts - diff',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'live-grounded',
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        answerAct: 'guide',
        evidenceMode: 'live-grounded',
        repairState: 'none',
        liveSurface: 'VS Code diff showing a missing null guard in fetchUser().',
        focusAnchor: 'Pinpoint the hunk that removed the guard.',
        answerIntent: 'Explain the broken branch before proposing the fix.',
        openingMove: 'Name the missing guard first.',
        carriedThread: 'Earlier browser residue about a GitHub diff.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        dialogueActKernel: null,
        mindTurnFrame: {
          world: {
            activeThread: 'Missing null guard in the current diff.',
            visibleSurface: 'VS Code diff showing the guard removal.',
            truthState: 'live-grounded',
            truthBoundary: 'Do not speculate beyond the visible hunk.',
            continuityPolicy: 'stay-on-thread',
            continuitySummary: 'same-thread',
            staleRisk: 0.08,
          },
          relation: {
            subject: 'task-knot',
            hostMove: '看看这个 diff 哪里有问题',
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: 'guide',
            relationshipPosture: 'warm',
          },
          memory: {
            memoryMode: 'task-thread',
            carriedThread: 'Earlier browser residue about a GitHub diff.',
            carriedFacts: ['The current diff is in user.ts.'],
            recallKeys: ['VS Code diff', 'fetchUser'],
            recallSeed: 'VS Code diff | fetchUser',
            lastOutcome: 'pending',
            suppressAssociativeRecall: true,
            labelCarryAsMemory: true,
          },
          self: {
            stance: 'observe',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'attentive',
            emotionalTension: 'tense-debug',
            initiativeAction: 'speak',
            thought: 'The current diff is specific enough to answer directly.',
          },
          obligation: {
            shouldSpeak: true,
            speechObligation: 'guide-task',
            answerAct: 'guide',
            responseMode: 'guide-current-knot',
            turnMode: 'guide-current-knot',
            openingClaim: 'The missing guard is the real fault line.',
            openingMove: 'Name the missing guard first.',
            answerIntent: 'Explain the broken branch before proposing the fix.',
            whyNow: 'The live diff is already clear enough to answer.',
            repairState: 'none',
            shouldAskForGrounding: false,
            shouldAcknowledgeRepair: false,
          },
          focusAnchor: 'Pinpoint the hunk that removed the guard.',
          confidence: 0.88,
          mustDo: ['Answer from the live diff.'],
          mustNotDo: ['Do not reuse stale browser residue.'],
          narrative: ['stay-current'],
          updatedAt: 20_000,
        },
        mustDo: ['Answer from the live diff.'],
        mustNotDo: ['Do not reuse stale browser residue.'],
      },
    })

    expect(block).toContain('[ALICIZATION_DIALOGUE_MIND]')
    expect(block).toContain('authoritative speaking mind')
    expect(block).toContain('The reply should stay with the concrete task knot in front of the host.')
    expect(block).toContain('Do not mirror or lightly paraphrase the host\'s latest line as the main reply.')
    expect(block).toContain('Keep the visible reply within 3 sentences')
    expect(block).toContain('label it as memory, residue, or the thread still being held')
    expect(block).not.toContain('{"')
  })

  it('keeps dialogue-first turns from dragging the screen into the foreground', () => {
    const block = buildDialogueMindFrameSystemBlock({
      inspectionRequested: false,
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: 'Old browser page about a pull request.',
        focusAnchor: 'The host is asking whether you sound robotic.',
        answerIntent: 'Answer the relationship question plainly.',
        openingMove: 'Say what feels off without deflecting to the screen.',
        carriedThread: 'Old browser page about a pull request.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mindMode: 'tracking',
        embodiedPresence: 'hesitant',
        emotionalTension: 'soft-covision',
        dialogueActKernel: null,
        mindTurnFrame: null,
        mustDo: ['Stay with the live dialogue subject.'],
        mustNotDo: ['Do not append screen-status caveats unless asked.'],
      },
    })

    expect(block).toContain('This is dialogue-first.')
    expect(block).toContain('The host is speaking about the relationship between you two.')
    expect(block).toContain('Do not append screen-status caveats unless asked.')
    expect(block).toContain('Do not quote schema labels, governance English, prompt jargon, or planning summaries.')
  })
})
