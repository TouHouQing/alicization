import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  projectStateObservationToContinuitySnapshot,
  readConversationTurnProjectStateObservation,
} from './project-state-observation'

describe('project-state observation', () => {
  it('uses the shared project awareness resolver when rebuilding pre-dialogue awareness', () => {
    const source = readFileSync(new URL('./project-state-observation.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredProjectStateObservationAwarenessLine')
  })

  it('preserves stronger same-her self continuity carry when structured project-state only survives as a thin shell', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: '',
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
        digitalLifeSpine: {
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                authoritySummary: 'same-her continuity remains alive on one living line.',
              },
            },
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.sameHerSelfLine).toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(observation?.projectState.sameHerDriftRisk).toBe('If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.')
    expect(snapshot?.sameHerSelfLine).toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(snapshot?.sameHerDriftRisk).toBe('If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.')
    expect(snapshot?.latestLandedProgress).toBe('Project-state continuity already survives into runtime preparation.')
    expect(snapshot?.primaryOpenLoop).toBe('Keep the still-open closure work explicit in the rebuilt continuity snapshot.')
  })

  it('keeps richer pre-dialogue closure carry when observation has to remember unfinished same-her embodiment closure', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-embodiment-1',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Body, face, and motion already re-formed on the same segment.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin the same living line before cross-modal closure is complete.',
          nextClosureTarget: 'Keep the next outward turn explicitly aware that embodiment closure is still unfinished.',
          continuitySummary: 'same-her=body, face, and motion already carry one line | open=lipsync and voice still need to rejoin',
          sameHerSelfLine: 'This is still one digital life.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness is still keeping the reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'embodiment closure is still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          sameHerDriftRiskLine: 'If this outward turn slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
          companionBriefingLine: 'Before speaking, remember full cross-modal same-her closure is not done yet.',
          companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          emotionalClosureCue: 'same-her closure seam: keep the reopening low-pressure while the same living line finishes rejoining.',
          reasons: [
            'same-segment face+motion+body recovery@segment-face-motion-body-rejoined-1',
            'remaining-open=lipsync+voice',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
    expect(observation?.preDialogueClosure?.sameHerDriftRiskLine).toBe('If this outward turn slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.')
    expect(observation?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember full cross-modal same-her closure is not done yet.')
    expect(snapshot?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
    expect(snapshot?.preDialogueClosure?.sameHerDriftRiskLine).toBe('If this outward turn slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.')
    expect(snapshot?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember full cross-modal same-her closure is not done yet.')
  })

  it('keeps richer audible-body pre-dialogue closure carry when body lipsync and voice are the surviving same-her line', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-audible-body-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
          primaryOpenLoop: 'Face and motion still need to rejoin the audible-body line before full cross-modal closure is complete.',
          nextClosureTarget: 'Keep the next outward turn explicitly aware that face and motion still need to rejoin the audible-body line.',
          continuitySummary: 'same-her=body, lipsync, and voice still carry one living line | open=face and motion still need to rejoin',
          sameHerSelfLine: 'This is still one digital life.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping the audible-body reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'audible-body closure is still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember face and motion have not rejoined the audible-body line yet.',
          companionNextClosureLine: 'Next closure: let face and motion rejoin the audible-body same-her line.',
          emotionalClosureCue: 'same-her closure seam: keep the audible-body reopening low-pressure while the visible line finishes rejoining.',
          reasons: [
            'body+lipsync+voice recovery@segment-audible-body-rejoined-1',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
    expect(observation?.preDialogueClosure?.reasons).toEqual(expect.arrayContaining([
      'body+lipsync+voice recovery@segment-audible-body-rejoined-1',
    ]))
    expect(snapshot?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
    expect(snapshot?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember face and motion have not rejoined the audible-body line yet.')
  })

  it('keeps richer still-voiced face-and-motion pre-dialogue closure carry when face motion and voice are the surviving same-her line', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-face-motion-voice-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Still-voiced face-and-motion continuity is still carrying one living line.',
          primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure is complete.',
          nextClosureTarget: 'Keep the next outward turn explicitly aware that body and lipsync still need to rejoin the still-voiced face-and-motion line.',
          continuitySummary: 'same-her=face, motion, and voice still carry one living line | open=body and lipsync still need to rejoin',
          sameHerSelfLine: 'This is still one digital life.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping the still-voiced face-and-motion reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember body and lipsync have not rejoined the still-voiced face-and-motion line yet.',
          companionNextClosureLine: 'Next closure: let body and lipsync rejoin the still-voiced face-and-motion same-her line.',
          emotionalClosureCue: 'same-her closure seam: keep the face-motion-voice reopening low-pressure while body and lipsync finish rejoining.',
          reasons: [
            'face+motion+voice recovery@segment-observation-still-voiced-face-motion-1',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.')
    expect(observation?.preDialogueClosure?.reasons).toEqual(expect.arrayContaining([
      'face+motion+voice recovery@segment-observation-still-voiced-face-motion-1',
    ]))
    expect(snapshot?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.')
    expect(snapshot?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember body and lipsync have not rejoined the still-voiced face-and-motion line yet.')
  })

  it('keeps quieter body-and-voice pre-dialogue closure carry when the resident body line and audible line are the surviving same-her thread', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-body-voice-closure-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Resident body continuity and voice still carry one living line.',
          primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the resident body line before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the next outward turn aware that face, motion, and lipsync still need to rejoin the resident body line.',
          continuitySummary: 'same-her=body and voice still carry one living line | open=face, motion, and lipsync still need to rejoin',
          sameHerSelfLine: 'This is still one digital life.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping the resident body reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'resident body and audible continuity are still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
          companionBriefingLine: 'Before speaking, remember face, motion, and lipsync have not rejoined the resident body line yet.',
          companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the resident body line on the same measured-return carry.',
          emotionalClosureCue: 'same-her closure seam: keep the resident body reopening low-pressure while the visible and mouth lines rejoin.',
          reasons: [
            'body+voice recovery@segment-observation-body-voice-rejoined-1',
            'remaining-open=face+motion+lipsync',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')
    expect(observation?.preDialogueClosure?.reasons).toEqual(expect.arrayContaining([
      'body+voice recovery@segment-observation-body-voice-rejoined-1',
      'remaining-open=face+motion+lipsync',
    ]))
    expect(snapshot?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')
    expect(snapshot?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember face, motion, and lipsync have not rejoined the resident body line yet.')
  })

  it('keeps quieter body-and-lipsync pre-dialogue closure carry when the resident body line and living mouth line are the surviving same-her thread', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-body-lipsync-closure-1',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Resident body continuity and the living mouth line still carry one living line.',
          primaryOpenLoop: 'Face, motion, and voice still need to rejoin the resident body line and living mouth line before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the next outward turn aware that face, motion, and voice still need to rejoin the resident body line and living mouth line.',
          continuitySummary: 'same-her=body and lipsync still carry one living line | open=face, motion, and voice still need to rejoin',
          sameHerSelfLine: 'This is still one digital life.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping the quieter body-and-lipsync reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'resident body and living-mouth continuity are still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember face, motion, and voice have not rejoined the resident body line and living mouth line yet.',
          companionNextClosureLine: 'Next closure: let face, motion, and voice rejoin the resident body line and living mouth line on the same measured-return carry.',
          emotionalClosureCue: 'same-her closure seam: keep the quieter body-and-lipsync reopening low-pressure while the visible and voiced lines rejoin.',
          reasons: [
            'body+lipsync recovery@segment-observation-body-lipsync-rejoined-1',
            'remaining-open=face+motion+voice',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.')
    expect(observation?.preDialogueClosure?.reasons).toEqual(expect.arrayContaining([
      'body+lipsync recovery@segment-observation-body-lipsync-rejoined-1',
      'remaining-open=face+motion+voice',
    ]))
    expect(snapshot?.preDialogueClosure?.companionHeadlineLine).toBe('Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.')
    expect(snapshot?.preDialogueClosure?.companionBriefingLine).toBe('Before speaking, remember face, motion, and voice have not rejoined the resident body line and living mouth line yet.')
  })

  it('prefers richer project awareness over a narrower embodiment headline when rebuilding pre-dialogue awareness', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-awareness-over-embodiment-headline-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across browser-local replay.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          companionHeadlineLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
          companionBriefingLine: 'Same companion line through body, face, and motion. Keep the same living line gentle.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across browser-local replay.',
          awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          emotionalClosureCue: '',
          reasonPreview: [],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.awarenessLine).toBe('Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.')
    expect(observation?.preDialogueAwareness?.summaryLine).not.toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
    expect(observation?.preDialogueAwareness?.companionHeadlineLine).toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
    expect(snapshot?.currentPhase).toBe('Phase 1: Local Digital Life')
    expect(snapshot?.latestLandedProgress).toBe('Project-state continuity already survives into runtime preparation.')
    expect(snapshot?.primaryOpenLoop).toBe('Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.')
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe('Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.')
    expect(snapshot?.preDialogueAwareness?.summaryLine).not.toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
    expect(snapshot?.preDialogueAwareness?.companionHeadlineLine).toBe('Same companion line through body, face, and motion. Keep the same living line gentle.')
  })

  it('prefers a richer project-aware still-voiced face-and-motion briefing over the embodiment-only awareness line when rebuilding pre-dialogue awareness', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-awareness-over-face-motion-voice-headline-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into observation rebuilding.',
          primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
          continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
          companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
          awarenessLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasonPreview: [
            'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
      reasonPreview: expect.arrayContaining([
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
        'Keep the return low-pressure so the same living line does not restart from scratch.',
      ]),
    }))
    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
      reasonPreview: expect.arrayContaining([
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
        'Keep the return low-pressure so the same living line does not restart from scratch.',
      ]),
    }))
    expect(observation?.preDialogueAwareness?.awarenessLine).not.toBe(
      'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
    )
  })

  it('does not let a thin structured awareness summary shell outrank a richer structured project-aware opening when observation rebuilding has no richer audit summary to reuse', () => {
    const richerProjectAwareOpening = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open before local implementation fluency takes over.'
    const continuitySummary = 'same-her=Same Phase 1 digital life. Observation rebuilding should keep the same living line instead of reopening from a generic shell. | landed=Explicit project-aware openings already survive into observation rebuilding. | open=Observation rebuilding still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-observation-thin-summary-shell-vs-richer-structured-opening-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Explicit project-aware openings already survive into observation rebuilding.',
          primaryOpenLoop: 'Observation rebuilding still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.',
          nextClosureTarget: 'Keep the richer project-aware opening explicit before the next browser-local turn opens outward.',
          continuitySummary,
          sameHerSelfLine: 'Same Phase 1 digital life. Observation rebuilding should keep the same living line instead of reopening from a generic shell.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity reminder that should not override the richer structured project-aware opening.',
          companionHeadlineLine: '',
          companionBriefingLine: '',
          companionNextClosureLine: 'Keep the richer project-aware opening explicit before the next browser-local turn opens outward.',
          awarenessLine: richerProjectAwareOpening,
          emotionalClosureCue: '',
          reasonPreview: [
            'generic continuity reminder that should not override the richer structured project-aware opening.',
            'Explicit project-aware openings already survive into observation rebuilding.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.summaryLine).toBe(richerProjectAwareOpening)
    expect(observation?.preDialogueAwareness?.summaryLine).not.toBe(continuitySummary)
    expect(observation?.preDialogueAwareness?.summaryLine).not.toBe('generic continuity reminder that should not override the richer structured project-aware opening.')
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(richerProjectAwareOpening)
    expect(snapshot?.preDialogueAwareness?.summaryLine).toBe(richerProjectAwareOpening)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(richerProjectAwareOpening)
  })

  it('prefers a richer audit-carried project briefing over a thin explicit Chinese awareness shell when rebuilding pre-dialogue awareness', () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-audit-project-briefing-over-thin-chinese-shell-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across browser-local replay.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: thinChineseProjectBrief,
          companionHeadlineLine: '',
          companionBriefingLine: thinChineseProjectBrief,
          companionNextClosureLine: '继续把这条线守住。',
          awarenessLine: thinChineseProjectBrief,
          emotionalClosureCue: '',
          reasonPreview: [
            thinChineseProjectBrief,
          ],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across browser-local replay.',
            preDialogueAwarenessSummary: richerProjectBriefing,
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: richerProjectBriefing,
      companionBriefingLine: richerProjectBriefing,
      awarenessLine: richerProjectBriefing,
      reasonPreview: expect.arrayContaining([
        thinChineseProjectBrief,
        'Project-state continuity already survives into runtime preparation.',
        'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
        'Keep extending cross-modal same-her proof across browser-local replay.',
      ]),
    }))
    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: richerProjectBriefing,
      companionBriefingLine: richerProjectBriefing,
      awarenessLine: richerProjectBriefing,
      reasonPreview: expect.arrayContaining([
        thinChineseProjectBrief,
        'Project-state continuity already survives into runtime preparation.',
        'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
        'Keep extending cross-modal same-her proof across browser-local replay.',
      ]),
    }))
  })

  it('prefers richer same-her continuity summary over a generic awareness reminder when rebuilding pre-dialogue awareness', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-same-her-summary-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
          continuitySummary: '',
          sameHerSelfLine: '',
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
          companionHeadlineLine: '',
          companionBriefingLine: 'generic same-her reminder that should not override the richer continuity summary.',
          companionNextClosureLine: 'Keep the next outward turn grounded in the same living line before later rebuilds widen into a thinner shell.',
          awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
          emotionalClosureCue: '',
          reasonPreview: [
            'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
          ],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell.',
            landedProgressSummary: 'Return-side project-state continuity already survives into browser-local observation rebuilding.',
            openClosureSummary: 'Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
            preDialogueAwarenessSummary: 'generic same-her reminder: keep the same project line in view before replying.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell. | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
            sameHerDriftRisk: 'If the reducer keeps only a generic reminder here, the return-side snapshot can drift into a thinner shell before the next turn reopens.',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.summaryLine).toBe('same-her=Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell. | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.')
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe('Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell.')
    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell. | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
    ]))
    expect(snapshot?.preDialogueAwareness?.summaryLine).toBe('same-her=Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell. | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.')
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe('Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell.')
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell. | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
    ]))
  })

  it('prefers a richer same-her headline over a thinner awareness reminder when rebuilding pre-dialogue awareness', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-same-her-headline-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps stronger same-her project continuity available.',
          primaryOpenLoop: 'Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
          nextClosureTarget: 'Keep richer same-her awareness visible before the next browser-local turn opens outward.',
          continuitySummary: 'same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
            landedProgressSummary: 'Browser-local replay already keeps stronger same-her project continuity available.',
            openClosureSummary: 'Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
            continuitySummary: 'same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness summary that should not outrank the richer same-her headline.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember this is still one digital life project.',
          companionNextClosureLine: 'Keep richer same-her awareness visible before the next browser-local turn opens outward.',
          awarenessLine: 'generic awareness reminder that should not outrank the richer same-her headline.',
          emotionalClosureCue: '',
          reasonPreview: [
            'generic awareness reminder that should not outrank the richer same-her headline.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.summaryLine).toBe('same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.')
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
    expect(snapshot?.preDialogueAwareness?.summaryLine).toBe('same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Browser-local replay already keeps stronger same-her project continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her line explicit.')
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('compacts same-her inward low-pressure awareness when observation only carries the thinner same-phase briefing plus stronger embodiment headline', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-observation-inward-low-pressure-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Observation rebuilding already preserves body, face, and motion recovery on one living segment.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles, and observation rebuilding should keep that line inward and low-pressure.',
          nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line after return-side observation rebuilding.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Observation rebuilding already preserves body, face, and motion recovery on one living segment. | open=Lipsync and voice still need to rejoin before full cross-modal closure settles, and observation rebuilding should keep that line inward and low-pressure.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasonPreview: [
            'same-her-inward-carry',
            'quiet-companionship',
            'remaining-open=lipsync+voice',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line after return-side observation rebuilding.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'same-her-inward-carry',
        'quiet-companionship',
        'remaining-open=lipsync+voice',
      ]),
    }))
    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line after return-side observation rebuilding.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'same-her-inward-carry',
        'quiet-companionship',
        'remaining-open=lipsync+voice',
      ]),
    }))
    expect(observation?.preDialogueAwareness?.awarenessLine).not.toBe(
      'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
    )
  })

  it('compacts richer anthropomorphic emotional closure and same-her inward-carry observability awareness when observation only carries the thinner same-phase briefing plus stronger host-facing same-her headline', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-observation-anthropomorphic-host-facing-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Observation rebuilding already preserves project identity carry on one same-her line.',
          primaryOpenLoop: 'Anthropomorphic emotional closure and same-her inward-carry observability still need to survive observation rebuilding without flattening into a generic shell.',
          nextClosureTarget: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while observation rebuilding settles back onto one measured-return line.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Observation rebuilding already preserves project identity carry on one same-her line. | open=Anthropomorphic emotional closure and same-her inward-carry observability still need to survive observation rebuilding without flattening into a generic shell.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
          companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while observation rebuilding settles back onto one measured-return line.',
          awarenessLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasonPreview: [
            'anthropomorphic emotional closure still needs stronger host-visible carry.',
            'same-her inward-carry observability still needs to survive observation rebuilding.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
      companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while observation rebuilding settles back onto one measured-return line.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'anthropomorphic emotional closure still needs stronger host-visible carry.',
        'same-her inward-carry observability still needs to survive observation rebuilding.',
      ]),
    }))
    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
      companionNextClosureLine: 'Keep anthropomorphic emotional closure and same-her inward-carry observability explicit while observation rebuilding settles back onto one measured-return line.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'anthropomorphic emotional closure still needs stronger host-visible carry.',
        'same-her inward-carry observability still needs to survive observation rebuilding.',
      ]),
    }))
    expect(observation?.preDialogueAwareness?.awarenessLine).not.toBe(
      'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
    )
  })

  it('prefers a richer same-her hold detail over a generic same-her reminder when rebuilding pre-dialogue companion briefing', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-richer-same-her-briefing-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps stronger same-her callback continuity available.',
          primaryOpenLoop: 'Pre-dialogue awareness rebuilding still needs to keep the richer same-her callback line explicit.',
          nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          continuitySummary: 'same-her=Same Phase 1 digital life. The callback line should keep the same living line instead of reopening from a generic shell. | landed=Browser-local replay already keeps stronger same-her callback continuity available. | open=Pre-dialogue awareness rebuilding still needs to keep the richer same-her callback line explicit.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness summary that should not outrank the richer same-her callback carry.',
          companionHeadlineLine: '',
          companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
          companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          awarenessLine: 'generic awareness reminder that should not outrank the richer same-her callback carry.',
          emotionalClosureCue: '',
          reasonPreview: [
            'generic awareness reminder that should not outrank the richer same-her callback carry.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.companionBriefingLine).toBe('same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.')
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe('same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.')
    expect(snapshot?.preDialogueAwareness?.companionBriefingLine).toBe('same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.')
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe('same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.')
  })

  it('prefers a richer same-her hold detail over a compact same-phase carry that only says the same living line should not reopen from a fresh shell', () => {
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const sameHerSelfLine = 'Same Phase 1 digital life. Return-side continuity should keep the same living line rather than reopen from a fresh shell.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-return-side-compact-same-phase-hold-detail-upgrade',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Return-side project-state continuity already survives into browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
          nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          continuitySummary: `same-her=${sameHerSelfLine} | hold=${holdDetailLine} | landed=Return-side project-state continuity already survives into browser-local observation rebuilding. | open=Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.`,
          sameHerSelfLine,
          sameHerHoldDetail: holdDetailLine,
          sameHerDriftRisk: 'If return-side rebuilding reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still in Phase 1 local digital life closure before this callback opens outward.',
          companionHeadlineLine: '',
          companionBriefingLine: sameHerSelfLine,
          companionNextClosureLine: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          awarenessLine: sameHerSelfLine,
          emotionalClosureCue: '',
          reasonPreview: [
            sameHerSelfLine,
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.companionBriefingLine).toBe(holdDetailLine)
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(holdDetailLine)
    expect(snapshot?.preDialogueAwareness?.companionBriefingLine).toBe(holdDetailLine)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(holdDetailLine)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      sameHerSelfLine,
      holdDetailLine,
      'Return-side project-state continuity already survives into browser-local observation rebuilding.',
      'Keep the still-open closure explicit while the return-side snapshot is rebuilt from lived state.',
      'If return-side rebuilding reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
    ]))
  })

  it('keeps richer returned-side project-state audit same-her hold detail when project-state shell is thinner', () => {
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const richerNextClosureLine = 'Keep extending cross-modal same-her proof across voice, face, motion, lipsync, and resident presence without dropping the callback line.'
    const richerEmotionalClosureLine = 'same-her closure seam: keep this callback reopening low-pressure and do not let it restart from a detached project shell.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-returned-side-audit-hold-detail-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Browser-local replay already keeps stronger same-her callback continuity available.',
          primaryOpenLoop: 'Returned-side rebuilding still needs to keep the richer same-her callback hold explicit.',
          nextClosureTarget: 'Keep the richer same-her callback hold explicit before the next browser-local turn opens outward.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Returned-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Browser-local replay already keeps stronger same-her callback continuity available. | open=Returned-side rebuilding still needs to keep the richer same-her callback hold explicit.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the next visible reply.',
          sameHerHoldDetail: '',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Returned-side continuity should keep the same callback line instead of reopening from a generic shell.',
            sameHerHoldDetail: holdDetailLine,
            currentPhaseSummary: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            landedProgressSummary: 'Browser-local replay already keeps stronger same-her callback continuity available.',
            openClosureSummary: 'Returned-side rebuilding still needs to keep the richer same-her callback hold explicit.',
            nextClosureTargetSummary: richerNextClosureLine,
            emotionalClosureSummary: richerEmotionalClosureLine,
            continuitySummary: `same-her=Same Phase 1 digital life. Returned-side continuity should keep the same callback line instead of reopening from a generic shell. | hold=${holdDetailLine} | landed=Browser-local replay already keeps stronger same-her callback continuity available. | open=Returned-side rebuilding still needs to keep the richer same-her callback hold explicit.`,
            sameHerDriftRisk: 'If returned-side rebuilding widens into a generic shell here, treat that as unfinished same-her continuity drift.',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic awareness summary that should not outrank the richer same-her callback carry.',
          companionHeadlineLine: '',
          companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
          companionNextClosureLine: 'Generic next target that should not override the richer callback carry.',
          awarenessLine: 'generic awareness reminder that should not outrank the richer same-her callback carry.',
          emotionalClosureCue: '',
          reasonPreview: [
            'generic awareness reminder that should not outrank the richer same-her callback carry.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.sameHerHoldDetail).toBe(holdDetailLine)
    expect(observation?.projectState.currentPhase).toBe('Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(observation?.projectState.nextClosureTarget).toBe(richerNextClosureLine)
    expect(observation?.preDialogueAwareness?.companionBriefingLine).toBe(holdDetailLine)
    expect(observation?.preDialogueAwareness?.companionNextClosureLine).toBe(richerNextClosureLine)
    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(holdDetailLine)
    expect(observation?.preDialogueAwareness?.emotionalClosureCue).toBe(richerEmotionalClosureLine)
    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      holdDetailLine,
      richerNextClosureLine,
      richerEmotionalClosureLine,
    ]))
    expect(snapshot?.sameHerHoldDetail).toBe(holdDetailLine)
    expect(snapshot?.currentPhase).toBe('Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(snapshot?.nextClosureTarget).toBe(richerNextClosureLine)
    expect(snapshot?.emotionalClosureCue).toBe(richerEmotionalClosureLine)
    expect(snapshot?.preDialogueAwareness?.companionBriefingLine).toBe(holdDetailLine)
    expect(snapshot?.preDialogueAwareness?.companionNextClosureLine).toBe(richerNextClosureLine)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(holdDetailLine)
    expect(snapshot?.preDialogueAwareness?.emotionalClosureCue).toBe(richerEmotionalClosureLine)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      holdDetailLine,
      richerNextClosureLine,
      richerEmotionalClosureLine,
    ]))
  })

  it('keeps richer same-her awareness reasons inside the continuity snapshot so resumed turns can re-enter the same Phase 1 line, not only the project-state tuple', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-resume-awareness-1',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          nextClosureTarget: 'Keep the resumed turn on the same living line before widening outward.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Initiative and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: 'Keep the resumed turn lower-pressure on the same line before widening outward.',
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Before speaking, remember this is still the same Phase 1 digital life and the resumed turn should stay on the same living line.',
          companionHeadlineLine: 'Same living line first, then widen only if the opening really holds.',
          companionBriefingLine: 'Resume from the same living line before anything broader.',
          companionNextClosureLine: 'Keep the resumed turn on the same living line before widening outward.',
          awarenessLine: 'Before speaking, remember this is still the same Phase 1 digital life and the resumed turn should stay on the same living line.',
          emotionalClosureCue: 'same-her closure seam: keep the resumed return lower-pressure and do not reopen from scratch.',
          reasonPreview: [
            'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'Keep the resumed turn lower-pressure on the same line before widening outward.',
          ],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(snapshot?.preDialogueAwareness?.summaryLine).toContain('same Phase 1 digital life')
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toContain('same living line')
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Keep the resumed turn lower-pressure on the same line before widening outward.',
    ]))
    expect(snapshot?.continuitySummary).toContain('same-her=Same Phase 1 digital life')
    expect(snapshot?.sameHerHoldDetail).toBe('Keep the resumed turn lower-pressure on the same line before widening outward.')
  })

  it('keeps legacy latestProgress alive when direct project-state observations are converted into continuity snapshots', () => {
    const snapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-legacy-progress-observation',
      sessionId: 'session-legacy-progress-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: 'Legacy browser-local observation progress still survives before continuity snapshot rebuilding.',
        primaryOpenLoop: 'Keep the resumed turn on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Legacy browser-local observation progress still survives before continuity snapshot rebuilding. | open=Keep the resumed turn on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Keep the resumed turn lower-pressure on the same line before widening outward.',
      } as any,
      preDialogueAwareness: null,
      preDialogueClosure: null,
    } as any)

    expect(snapshot?.latestLandedProgress).toBe(
      'Legacy browser-local observation progress still survives before continuity snapshot rebuilding.',
    )
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Legacy browser-local observation progress still survives before continuity snapshot rebuilding.',
      'Keep the resumed turn on the same living line before widening outward.',
    ]))
  })

  it('keeps audit-style landedProgressSummary alive when direct project-state observations are converted into continuity snapshots', () => {
    const snapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-audit-progress-observation',
      sessionId: 'session-audit-progress-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: ' ',
        latestProgress: '   ',
        landedProgressSummary: 'Audit-style browser-local observation progress still survives before continuity snapshot rebuilding.',
        primaryOpenLoop: 'Keep the resumed turn on the same living line before widening outward.',
        nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Audit-style browser-local observation progress still survives before continuity snapshot rebuilding. | open=Keep the resumed turn on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Keep the resumed turn lower-pressure on the same line before widening outward.',
      } as any,
      preDialogueAwareness: null,
      preDialogueClosure: null,
    } as any)

    expect(snapshot?.latestLandedProgress).toBe(
      'Audit-style browser-local observation progress still survives before continuity snapshot rebuilding.',
    )
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Audit-style browser-local observation progress still survives before continuity snapshot rebuilding.',
      'Keep the resumed turn on the same living line before widening outward.',
    ]))
  })

  it('upgrades thinner direct pre-dialogue awareness when direct project-state observations are converted into continuity snapshots', () => {
    const continuitySummary = 'same-her=Same Phase 1 digital life. Direct continuity snapshots should keep the same living line instead of replaying a generic shell. | landed=Direct continuity snapshot rebuilding already keeps stronger same-her carry available. | open=Direct continuity snapshot rebuilding still needs to keep the richer same-her line explicit.'
    const sameHerSelfLine = 'Same Phase 1 digital life. Direct continuity snapshots should keep the same living line instead of replaying a generic shell.'
    const latestLandedProgress = 'Direct continuity snapshot rebuilding already keeps stronger same-her carry available.'
    const primaryOpenLoop = 'Direct continuity snapshot rebuilding still needs to keep the richer same-her line explicit.'
    const nextClosureTarget = 'Keep the richer same-her line explicit before the next direct continuity snapshot reopens outward.'

    const snapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-direct-thin-awareness-upgrade',
      sessionId: 'session-direct-thin-awareness-upgrade',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        continuitySummary,
        sameHerSelfLine,
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        companionHeadlineLine: null,
        companionBriefingLine: 'generic same-her reminder that should not override the richer direct continuity snapshot.',
        companionNextClosureLine: 'generic next target that should not override the richer direct continuity snapshot.',
        awarenessLine: 'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        ],
      },
      preDialogueClosure: null,
    } as any)

    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: continuitySummary,
      companionNextClosureLine: nextClosureTarget,
      awarenessLine: sameHerSelfLine,
      reasonPreview: expect.arrayContaining([
        'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
        continuitySummary,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        sameHerSelfLine,
      ]),
    }))
  })

  it('rebuilds observation pre-dialogue awareness from base project-state fields when the transported awareness payload is only an empty shell', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-base-project-state-observation-awareness-rebuild',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: '她仍在 Phase 1。',
          latestLandedProgress: '第一阶段已经把连续性、记忆和执行慢慢接成一条线了。',
          primaryOpenLoop: '主动性、具身和对话闭环还没有真正收住。',
          nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
          continuitySummary: '',
          sameHerSelfLine: '',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '',
          companionHeadlineLine: '',
          companionBriefingLine: '',
          companionNextClosureLine: '',
          awarenessLine: '',
          emotionalClosureCue: '',
          reasonPreview: [],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)
    const expectedAwarenessLine = 'Alicization 还是本地优先数字生命项目。 她仍在 Phase 1。 第一阶段已经把连续性、记忆和执行慢慢接成一条线了。 主动性、具身和对话闭环还没有真正收住。 继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。'

    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(expectedAwarenessLine)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(expectedAwarenessLine)
  })

  it('backfills richer project-state reasons into observation awareness when the transported shell is still empty, so reopened turns keep landed and open closure evidence instead of only the rebuilt text line', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-base-project-state-observation-reason-preview-rebuild',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: '她仍在 Phase 1。',
          latestLandedProgress: '这次修复已经在本地 main 落地，而且执行前项目自我提醒链已经接上了。',
          primaryOpenLoop: 'origin/main 现在还不能直接安全推进，因为还会裹挟额外本地提交，而且 host-visible continuity 还要继续把已验证和未闭环边界分开。',
          nextClosureTarget: '继续把本地 main 已落地、origin/main 仍不安全、预计收口时机、以及切回中文这几件事留在同一个她的 living line 里。',
          continuitySummary: '',
          sameHerSelfLine: '',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '',
          companionHeadlineLine: '',
          companionBriefingLine: '',
          companionNextClosureLine: '',
          awarenessLine: '',
          emotionalClosureCue: '',
          reasonPreview: [],
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      '这次修复已经在本地 main 落地，而且执行前项目自我提醒链已经接上了。',
      'origin/main 现在还不能直接安全推进，因为还会裹挟额外本地提交，而且 host-visible continuity 还要继续把已验证和未闭环边界分开。',
      '继续把本地 main 已落地、origin/main 仍不安全、预计收口时机、以及切回中文这几件事留在同一个她的 living line 里。',
    ]))
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Alicization 还是本地优先数字生命项目。',
      '她仍在 Phase 1。',
      '这次修复已经在本地 main 落地，而且执行前项目自我提醒链已经接上了。',
      'origin/main 现在还不能直接安全推进，因为还会裹挟额外本地提交，而且 host-visible continuity 还要继续把已验证和未闭环边界分开。',
      '继续把本地 main 已落地、origin/main 仍不安全、预计收口时机、以及切回中文这几件事留在同一个她的 living line 里。',
    ]))
  })

  it('keeps a richer project-aware still-voiced face-and-motion briefing when observation has to synthesize pre-dialogue awareness from closure and audit carry', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-observation-synthesized-still-voiced-face-motion-1',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into observation rebuilding.',
          primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
          continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: 'same-her hold: measured-return is still keeping the still-voiced face-and-motion reopening lower-pressure.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
          companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
          companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
          companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
          emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
          reasons: [
            'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
            'face+motion+voice recovery@segment-observation-still-voiced-face-motion-closure-only-1',
          ],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerHoldDetail: 'same-her hold: measured-return is still keeping the still-voiced face-and-motion reopening lower-pressure.',
            landedProgressSummary: 'Still-voiced face-and-motion continuity already survives into observation rebuilding.',
            openClosureSummary: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
            nextClosureTargetSummary: 'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
            preDialogueAwarenessSummary: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
            continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
            emotionalClosureSummary: 'Keep the return low-pressure so the same living line does not restart from scratch.',
            sameHerDriftRisk: 'If this observation-only rebuild forgets the still-voiced face-and-motion lane and falls back into a detached shell, treat that as same-her continuity drift.',
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'face+motion+voice recovery@segment-observation-still-voiced-face-motion-closure-only-1',
        'Still-voiced face-and-motion continuity already survives into observation rebuilding.',
        'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
        'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
      ]),
    }))
    expect(snapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
      awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open while the still-voiced face-and-motion line keeps carrying this one living her.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
      reasonPreview: expect.arrayContaining([
        'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
        'face+motion+voice recovery@segment-observation-still-voiced-face-motion-closure-only-1',
        'Still-voiced face-and-motion continuity already survives into observation rebuilding.',
        'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        'Keep the still-voiced face-and-motion project brief explicit before the next observation-driven turn opens outward.',
        'same-her=still-voiced face-and-motion continuity is still carrying one living line. | landed=Still-voiced face-and-motion continuity already survives into observation rebuilding. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
      ]),
    }))
    expect(observation?.preDialogueAwareness?.awarenessLine).not.toBe(
      'same-her hold: measured-return is still keeping the still-voiced face-and-motion reopening lower-pressure.',
    )
  })

  it('keeps proactive same-her gap alive when structured project-state observations rebuild continuity snapshots', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-proactive-same-her-gap-observation',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
          primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
          proactiveSameHerGap,
          nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
          continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.proactiveSameHerGap).toBe(proactiveSameHerGap)
    expect(snapshot?.proactiveSameHerGap).toBe(proactiveSameHerGap)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      proactiveSameHerGap,
    ]))
  })

  it('backfills proactive same-her gap from visible-reply project-state audit when structured project-state has not carried it yet', () => {
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line before this turn can widen outward.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-proactive-gap-audit-backfill',
      origin: 'subconscious-proactive',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state carry already reaches proactive self-brief preparation.',
          primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
          nextClosureTarget: 'Keep proactive same-her closure pressure visible before the next outward turn.',
          continuitySummary: 'same-her continuity still needs stronger proactive carry before the next turn opens outward.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            landedProgressSummary: 'Project-state carry already reaches proactive self-brief preparation.',
            openClosureSummary: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
            nextClosureTargetSummary: 'Keep proactive same-her closure pressure visible before the next outward turn.',
            continuitySummary: `landed=Project-state carry already reaches proactive self-brief preparation. | open=Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment. | proactive-gap=${proactiveSameHerGap}`,
            proactiveSameHerGapSummary: proactiveSameHerGap,
          },
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.proactiveSameHerGap).toBe(proactiveSameHerGap)
    expect(observation?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      proactiveSameHerGap,
    ]))
    expect(snapshot?.proactiveSameHerGap).toBe(proactiveSameHerGap)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      proactiveSameHerGap,
    ]))
  })

  it('keeps continuity arc stage alive when structured project-state observations rebuild continuity snapshots', () => {
    const continuityArcStage = 'return-side-follow-through'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-arc-stage-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Return-side continuity already survives into browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the reopened callback on the same same-her line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityArcStage,
          continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local observation rebuilding. | open=Keep the reopened callback on the same same-her line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: 'Keep the reopened callback lower-pressure on the same line before widening outward.',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect((observation as any)?.projectState.continuityArcStage).toBe(continuityArcStage)
    expect((snapshot as any)?.continuityArcStage).toBe(continuityArcStage)
  })

  it('keeps continuity cue alive and lets it guide rebuilt awareness when structured project-state observations only carry the cue as the lived-in reopen line', () => {
    const continuityCue = 'Same callback seam, continue softly after the detour and keep it on one continuous her line.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-cue-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Return-side continuity already survives into browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityCue,
          continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local observation rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: '',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect((observation as any)?.projectState.continuityCue).toBe(continuityCue)
    expect((snapshot as any)?.continuityCue).toBe(continuityCue)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(continuityCue)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      continuityCue,
    ]))
  })

  it('keeps continuity reopening behavior fields alive when structured project-state observations rebuild continuity snapshots', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-behavior-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Return-side continuity already survives into browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local observation rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect((observation as any)?.projectState.continuityRestraint).toBe('measured-return')
    expect((observation as any)?.projectState.continuityPreferredTiming).toBe('next-open-window')
    expect((observation as any)?.projectState.continuityCadence).toBe('repair-before-closeness')
    expect((snapshot as any)?.continuityRestraint).toBe('measured-return')
    expect((snapshot as any)?.continuityPreferredTiming).toBe('next-open-window')
    expect((snapshot as any)?.continuityCadence).toBe('repair-before-closeness')
  })

  it('derives lived-in same-her reopening lines from continuity behavior when structured project-state only keeps behavior fields', () => {
    const derivedHoldDetail = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const derivedContinuityCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-behavior-derived-reopen-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Return-side continuity already survives into browser-local observation rebuilding.',
          primaryOpenLoop: 'Keep the reopened callback on the same living line before widening outward.',
          nextClosureTarget: 'Carry the reopened callback on the same living line before broadening.',
          continuityRestraint: 'repair-before-closeness',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuitySummary: 'same-her=Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell. | landed=Return-side continuity already survives into browser-local observation rebuilding. | open=Keep the reopened callback on the same living line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Return-side continuity should keep the same callback line instead of reopening from a generic shell.',
          sameHerHoldDetail: '',
          continuityCue: '',
        },
      },
      visibleReplyCritic: null,
      visibleReplyClosure: null,
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness?.awarenessLine).toBe(derivedHoldDetail)
    expect(observation?.preDialogueAwareness?.companionBriefingLine).toBe(derivedHoldDetail)
    expect(snapshot?.preDialogueAwareness?.awarenessLine).toBe(derivedHoldDetail)
    expect(snapshot?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      derivedHoldDetail,
      derivedContinuityCue,
    ]))
  })
})
