import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { reduceRuntimeAnswerPlanner } from './runtime-answer-planner-reducer'

const fixedRuntimeAnswerPlannerTemplatePattern
  = /Keep the answer on the same digital-life closure seam|Keep this on one continuous her line instead of restarting|Stay on the same thread before widening closeness|Do not rewrite the still-live line as a fresh opening/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(value ?? ''))).toBe(false)
}

describe('reduceRuntimeAnswerPlanner', () => {
  it('does not write fixed project-state templates back into answer planning surfaces', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_010,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer the project-state question directly.',
        openingMove: 'Answer from current project facts.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [
          'Keep this on one continuous her line instead of restarting.',
        ],
        mustNotDo: [
          'Do not rewrite the still-live line as a fresh opening.',
        ],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
            },
          },
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
              preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
              companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
              sameHerSelfLine: 'one continuous her on the same living line',
              sameHerDriftRisk: 'same-her drift if a generic project shell takes over',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.mustDo)
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.mustNotDo)
    expectNoFixedTemplateResidue(reduced?.dialogue.currentConsciousFrame?.projectState)
    expectNoFixedTemplateResidue(reduced?.raw?.runtimeDigest?.projectState)
    expectNoFixedTemplateResidue(reduced?.dialogue.replyDeliberation?.mustInclude)
    expectNoFixedTemplateResidue(reduced?.dialogue.replyDeliberation?.mustAvoid)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
  })

  it('keeps fallback conscious-frame project state alive in answer planning instead of dropping back to a thinner generic seam', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer the project-state question directly.',
        openingMove: 'Answer what this project is and what still remains open.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            consciousNeed: 'Before I answer, I need to stay inside this local-first digital life project.',
            speakingIntention: 'Stay with the same digital life and do not let local fluency break the still-open closure work.',
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
              nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('open_loop=memory+initiative+embodiment')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('continuity-residue')
    expect(reduced?.dialogue.answerPlanner?.mustDo.some(item =>
      item.includes('project_closure_constraint='),
    )).toBe(true)
    expect(JSON.stringify(reduced?.dialogue.answerPlanner?.mustDo ?? [])).not.toMatch(fixedRuntimeAnswerPlannerTemplatePattern)
    expect(reduced?.dialogue.answerPlanner?.narrative).toContain('project-state-answer-planner')
    expect(reduced?.dialogue.replyDeliberation?.narrative).toContain('project-state-answer-planner')
  })

  it('prefers a richer Chinese same-her companion headline over a thinner Chinese reminder before answer planning starts', () => {
    const thinnerChineseReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const richerChineseCompanionHeadline = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'answer',
        answerIntent: '先说明这个数字生命项目是什么、已经做到哪里、还差什么没闭环。',
        openingMove: '先沿着同一个她的项目线继续往下接。',
        focusAnchor: 'same-her project continuity',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: '本地优先数字生命项目',
              currentPhase: '第一阶段：本地数字生命。',
              latestProgress: '连续性、记忆和执行已经接得更稳了。',
              primaryOpenLoop: '主动性、具身和对话闭环还没有完全收住。',
              nextClosureTarget: '继续把主动性、具身和对话闭环收回同一个她的线。',
              preDialogueAwarenessLine: thinnerChineseReminder,
              companionHeadlineLine: richerChineseCompanionHeadline,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary)
    expect(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).not.toContain(thinnerChineseReminder)
  })

  it('does not let a thin Chinese Phase 1 reminder shell stay in governingProject when richer same-her closure carry already exists', () => {
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerChineseSameHerSelfLine = '这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。'
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_025,
      governance: {
        answerAct: 'answer',
        answerIntent: '继续说明这个数字生命项目是什么、已经做到哪里、还差什么没闭环。',
        openingMove: '沿着同一个她这条线继续回答。',
        focusAnchor: 'same-her project continuity',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: '本地优先数字生命项目',
              currentPhase: '第一阶段：本地数字生命。',
              latestProgress: '连续性、记忆和执行已经接得更稳了。',
              primaryOpenLoop: '主动性、具身和对话闭环还没有完全收住。',
              nextClosureTarget: '继续把还没闭环的主动性、具身和对话收回同一个她的线。',
              preDialogueAwarenessLine: thinnerChineseReminder,
              sameHerSelfLine: richerChineseSameHerSelfLine,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('第一阶段：本地数字生命。')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('主动性、具身和对话闭环还没有完全收住。')
    expect(reduced?.dialogue.answerPlanner?.governingProject).not.toContain(thinnerChineseReminder)
  })

  it('threads the active emotional closure seam into answer-planner narrative as a structured tag', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'care',
        answerIntent: 'Keep the answer steady and low-pressure.',
        openingMove: 'Stay with the same living line and ease pressure first.',
        focusAnchor: 'same-her closure seam',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'project-state continuity already survives into runtime preparation',
              primaryOpenLoop: 'keep the same-her answer line emotionally continuous',
              nextClosureTarget: 'carry the emotional closure seam all the way into the visible reply',
              emotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.narrative).toContain('emotional_closure:content=excluded; reason=continuity-residue; visibility=internal-structured')
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.narrative)
  })

  it('keeps the active emotional closure seam alive from governance when the conscious-frame project state is too thin to carry it alone', () => {
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'care',
        answerIntent: 'Keep the answer steady and low-pressure.',
        openingMove: 'Stay with the same living line and ease pressure first.',
        focusAnchor: 'same-her closure seam',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        emotionalClosureCue: cue,
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'project-state continuity already survives into runtime preparation',
              primaryOpenLoop: 'keep the same-her answer line emotionally continuous',
              nextClosureTarget: 'carry the emotional closure seam all the way into the visible reply',
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.narrative).toContain('emotional_closure:content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(reduced?.dialogue.replyDeliberation?.narrative).toContain('emotional_closure:content=excluded; reason=continuity-residue; visibility=internal-structured')
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.narrative)
    expectNoFixedTemplateResidue(reduced?.dialogue.replyDeliberation?.narrative)
  })

  it('rebuilds same-her low-pressure anti-restart emotional closure narrative from governance carry even when no explicit cue field survives', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'care',
        answerIntent: 'Keep the return on the same living line.',
        openingMove: 'Stay with the same living line first.',
        focusAnchor: 'same-her closure seam',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        emotionalClosureCue: '',
        mustDo: ['Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'],
        mustNotDo: ['Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'project-state continuity already survives into runtime preparation',
              primaryOpenLoop: 'keep the same-her answer line emotionally continuous',
              nextClosureTarget: 'carry the emotional closure seam all the way into the visible reply',
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.mustDo).toContain(
      'provider_instruction_status=withheld; reason=continuity-residue; visibility=internal-structured',
    )
    expect(reduced?.dialogue.answerPlanner?.mustNotDo).toContain(
      'provider_instruction_status=withheld; reason=continuity-residue; visibility=internal-structured',
    )
    expect((reduced?.dialogue.answerPlanner?.narrative ?? []).some(item =>
      item.startsWith('emotional_closure:'),
    )).toBe(true)
    expect((reduced?.dialogue.replyDeliberation?.narrative ?? []).some(item =>
      item.startsWith('emotional_closure:'),
    )).toBe(true)
    expect(JSON.stringify({
      answerPlanner: reduced?.dialogue.answerPlanner?.narrative ?? [],
      replyDeliberation: reduced?.dialogue.replyDeliberation?.narrative ?? [],
    })).not.toMatch(fixedRuntimeAnswerPlannerTemplatePattern)
  })

  it('injects positive same-thread anti-restart guidance when reply deliberation is created fresh from governance carry', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'care',
        answerIntent: 'Stay on the same line and continue gently before widening.',
        openingMove: 'Continue gently on the same line.',
        focusAnchor: 'same living thread',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'project-state continuity already survives into runtime preparation',
              primaryOpenLoop: 'keep the same digital life closure explicit while the line is still live',
              nextClosureTarget: 'stay on the same line before widening outward',
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.replyDeliberation?.mustInclude).toContain(
      'continuity_constraint=anti_restart; source=relationship_continuity; timing=before_widening',
    )
    expect(reduced?.dialogue.replyDeliberation?.mustAvoid).toContain(
      'continuity_avoid=reopen_as_fresh_introduction',
    )
    expect(JSON.stringify({
      mustInclude: reduced?.dialogue.replyDeliberation?.mustInclude ?? [],
      mustAvoid: reduced?.dialogue.replyDeliberation?.mustAvoid ?? [],
    })).not.toMatch(fixedRuntimeAnswerPlannerTemplatePattern)
  })

  it('prefers the fuller canonical closure seam when conscious-frame projectState carries only a truncated open-loop fragment', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'guide',
        answerIntent: 'Keep the answer on the same digital-life closure seam.',
        openingMove: 'Answer from the same project line before local detail takes over.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: brief.currentPhase,
              latestProgress: brief.continuityProgressSummary ?? '',
              primaryOpenLoop: String(brief.openLoops[0] ?? '').slice(0, 180),
              nextClosureTarget: String(brief.nextClosureTarget).slice(0, 220),
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain(brief.currentPhase)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain(brief.openLoops[0] ?? '')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain(brief.nextClosureTarget)
    expect(reduced?.dialogue.answerPlanner?.mustDo.some(item =>
      item.includes(brief.openLoops[0] ?? ''),
    )).toBe(true)
  })

  it('carries a stronger same-her project awareness line into governingProject instead of only the thinner phase-open-next seam', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer the project-state question directly.',
        openingMove: 'Answer from the same project line before local detail takes over.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            consciousNeed: 'Before I answer, I need to stay inside this local-first digital life project.',
            speakingIntention: 'Stay with the same digital life and do not let local fluency break the still-open closure work.',
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
              nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
              preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
              companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).not.toContain('Before answering, keep this same digital life project in view, but do not widen into a detached project shell.')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('continuity-residue')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('open_loop=memory+initiative+embodiment')
  })

  it('carries a broader same-her phase-1 closure headline into governingProject when the plain awareness line is only a thin shell', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_050,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer the project-state question directly.',
        openingMove: 'Answer from the same project line before local detail takes over.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            consciousNeed: 'Before I answer, I need to stay inside this local-first digital life project.',
            speakingIntention: 'Stay with the same digital life and do not let local fluency break the still-open closure work.',
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
              nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
              preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
              companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).not.toContain('Before answering, keep this same digital life project in view, but do not widen into a detached project shell.')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('continuity-residue')
  })

  it('prefers a richer runtime-digest same-her headline over a thin conscious-frame reminder shell during answer planning rebuild', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_075,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer from the same living digital life instead of a detached project shell.',
        openingMove: 'Keep the same living line explicit before local detail takes over.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          runtimeDigest: {
            projectState: {
              companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              preDialogueAwarenessSummary: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
            },
          },
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            consciousNeed: 'Before I answer, I need to stay inside this local-first digital life project.',
            speakingIntention: 'Stay with the same digital life and do not let local fluency break the still-open closure work.',
            projectState: {
              identity: 'this local-first digital life project',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
              nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
              preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              preDialogueAwarenessSummary: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).not.toContain(
      'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
    )
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('continuity-residue')
  })

  it('preserves a non-thin before-answering project awareness carry instead of collapsing it into a broad project-status summary inside answer planning', () => {
    const preservedAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. What has already landed is proactive initiative now has a compact same-her closure loop; rest-protective proactive feedback next-session'
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_076,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Continue the same project-aware line directly.',
        openingMove: 'Keep the same project-aware line explicit before widening outward.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: preservedAwarenessLine,
              awarenessLine: preservedAwarenessLine,
              preDialogueAwarenessSummary: preservedAwarenessLine,
            },
          },
        } as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is still the same local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: preservedAwarenessLine,
              awarenessLine: preservedAwarenessLine,
              preDialogueAwarenessSummary: preservedAwarenessLine,
              latestLandedProgress: 'Live project awareness already survives into the current conscious frame.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need to close as one same-life seam.',
              nextClosureTarget: 'Keep the current project-state awareness explicit in the first visible answer beat.',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: preservedAwarenessLine,
              awarenessLine: preservedAwarenessLine,
              preDialogueAwarenessSummary: preservedAwarenessLine,
            },
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    expectNoFixedTemplateResidue(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(reduced?.dialogue.currentConsciousFrame?.projectState?.awarenessLine)
    expectNoFixedTemplateResidue(reduced?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary)
    expectNoFixedTemplateResidue(reduced?.dialogue.answerPlanner?.governingProject)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('same-life seam')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('current project-state awareness explicit')
  })

  it('keeps execution-callback same-her project carry alive in answer planning instead of letting the next reply collapse into a detached task-result shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_000,
      governance: {
        answerAct: 'guide',
        answerIntent: 'Bring the callback result back onto the same living line.',
        openingMove: 'Return on the same living line before widening.',
        focusAnchor: 'the compile error thread',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [
          'Keep the execution-callback on the same living thread and preserve one continuous her rather than a detached callback notice.',
        ],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {
          memoryDeliberation: {
            followUpAffordance: {
              summary: 'Keep the execution-callback on the compile error thread as the same living thread instead of flattening it into a detached result notice.',
              whyNow: 'The callback already landed, but the return still needs lower-pressure room so the same-her line does not collapse into utility cadence.',
              intrusionRisk: 'medium',
              payoffDependency: 'requires-current-payoff',
              preferredTiming: 'after-payoff',
            },
          },
        } as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: projectState.identity,
              currentPhase: projectState.currentPhase,
              latestProgress: projectState.continuityProgressSummary,
              primaryOpenLoop: projectState.openLoops[0],
              nextClosureTarget: projectState.nextClosureTarget,
              sameHerSelfLine: projectState.sameHerSelfLine,
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
        } as any,
        agency: {} as any,
      } as any,
    })

    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain(projectState.proactiveSameHerGap)
    expect(reduced?.dialogue.answerPlanner?.mustDo).toEqual(expect.arrayContaining([
      expect.stringContaining('project_closure_constraint=open_loop'),
      expect.stringContaining('continuity_constraint=anti_restart'),
      expect.stringContaining('provider_instruction_status=withheld'),
    ]))
    expect(reduced?.dialogue.replyDeliberation?.mustInclude).toEqual(expect.arrayContaining([
      expect.stringContaining('continuity_constraint=anti_restart'),
      expect.stringContaining('continuity_constraint=same_thread'),
    ]))
    expect(reduced?.dialogue.replyDeliberation?.narrative).toContain('project-state-answer-planner')
  })

  it('sanitizes fixed templates already present on existing planner and dialogue surfaces before meta can reuse them', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reduced = reduceRuntimeAnswerPlanner({
      now: 1_040,
      governance: {
        answerAct: 'answer',
        answerIntent: 'Answer from current project facts.',
        openingMove: 'Answer from the same project thread.',
        focusAnchor: 'project-state closure',
        liveSurface: '',
        screenReferenceMode: 'avoid',
        suppressAssociativeRecall: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        relationshipPosture: 'restrained',
        evidenceMode: 'dialogue-grounded',
        mustDo: [],
        mustNotDo: [],
      } as any,
      surface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        cognition: {} as any,
        memory: {} as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: projectState.identity,
              currentPhase: projectState.currentPhase,
              latestProgress: projectState.continuityProgressSummary,
              primaryOpenLoop: projectState.openLoops[0],
              nextClosureTarget: projectState.nextClosureTarget,
              sameHerSelfLine: projectState.sameHerSelfLine,
              emotionalClosureCue: null,
              continuityPreferredTiming: null,
              continuityCadence: null,
            },
          },
          replyDeliberation: {
            selectedMotive: 'answer',
            speakingFrom: 'dialogue-bond',
            memoryMode: 'dialogue-carry',
            openingBeat: 'Before answering, keep this on one continuous her line instead of restarting.',
            whyThisReplyNow: 'Right now the same-her closure line is still active.',
            whyNotOtherCandidates: ['Do not rewrite the still-live line as a fresh opening.'],
            withheldImpulses: ['same-her closure across callback'],
            candidateMotives: [],
            shouldSpeak: true,
            mustInclude: ['Keep this on one continuous her line instead of restarting.'],
            mustAvoid: ['Do not rewrite the still-live line as a fresh opening.'],
            confidence: 0.5,
            narrative: ['compact same-her closure loop'],
            updatedAt: 1_000,
          },
          answerPlanner: {
            act: 'answer',
            evidenceMode: 'dialogue-grounded',
            confidence: 0.5,
            governingFocus: 'project-state closure',
            governingProject: 'Before answering, remember this is one continuous her inside Phase 1.',
            openingMove: 'Keep this on one continuous her line instead of restarting.',
            answerIntent: 'Do not rewrite the still-live line as a fresh opening.',
            relationshipPosture: 'restrained',
            shouldAskForGrounding: false,
            shouldAcknowledgeRepair: false,
            selectedConcernEntryId: null,
            selectedRepairId: null,
            selectedCommitmentId: null,
            selectedInquiryPlanId: null,
            selectedRuntimeThreadId: null,
            selectedProjectId: null,
            selectedReflectionId: null,
            executivePhase: null,
            selectedTruthFrame: null,
            mustDo: ['Keep this on one continuous her line instead of restarting.'],
            mustNotDo: ['Do not rewrite the still-live line as a fresh opening.'],
            narrative: ['final settlement reanchors generic same-her shells'],
            updatedAt: 1_000,
          },
          dialogueActKernel: {
            subject: 'project',
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            activeProject: null,
            truthMode: 'dialogue-grounded',
            speechAct: 'answer',
            turnMode: null,
            screenReferenceMode: 'avoid',
            speakingFrom: 'dialogue-bond',
            selectedEvidence: [],
            openingClaim: 'same-her closure across callback',
            openingMove: 'Keep this on one continuous her line instead of restarting.',
            whyNow: 'Before answering, remember this is one continuous her.',
            mustSay: ['Keep this on one continuous her line instead of restarting.'],
            mustAvoid: ['Do not rewrite the still-live line as a fresh opening.'],
            sourceTrace: ['same-her closure across callback'],
            confidence: 0.5,
            updatedAt: 1_000,
          },
        } as any,
        agency: {} as any,
      } as any,
    })

    const dialogueMeta = {
      replyDeliberation: reduced?.dialogue.replyDeliberation,
      answerPlanner: reduced?.dialogue.answerPlanner,
      dialogueActKernel: reduced?.dialogue.dialogueActKernel,
    }

    expectNoFixedTemplateResidue(dialogueMeta)
    expect(reduced?.dialogue.answerPlanner?.governingProject).toContain('local_desktop_life_loop')
    expect(reduced?.dialogue.answerPlanner?.mustDo).toEqual(expect.arrayContaining([
      expect.stringContaining('provider_instruction_status=withheld'),
    ]))
    expect(reduced?.dialogue.replyDeliberation?.mustInclude).toEqual(expect.arrayContaining([
      expect.stringContaining('provider_instruction_status=withheld'),
    ]))
    expect(reduced?.dialogue.dialogueActKernel?.mustSay).toEqual(expect.arrayContaining([
      expect.stringContaining('provider_instruction_status=withheld'),
    ]))
  })
})
