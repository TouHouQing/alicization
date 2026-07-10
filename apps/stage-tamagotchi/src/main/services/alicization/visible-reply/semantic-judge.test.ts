import { describe, expect, it } from 'vitest'

import { buildAlicizationVisibleReplySemanticJudgeArtifact } from './semantic-judge'

describe('visible reply semantic judge', () => {
  it('accepts structured LLM judge scores when the reply closes the humanlike dialogue contract', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '先把当前卡住的点收束：你要的不是继续补规则，而是把召回反馈、心智评审和自我修订连成同一条可回放链路。',
      structuredJudge: {
        humanlikeQuality: 0.9,
        currentTurnPayoff: 0.92,
        memoryUseCorrectness: 0.88,
        emotionalCoherence: 0.82,
        personalityCoherence: 0.84,
        specificityDiscipline: 0.9,
        reasonCodes: ['judge:payoff-grounded'],
        judgeReason: 'The reply pays off the current demand without template shell.',
      },
    })

    expect(artifact.mode).toBe('llm-structured')
    expect(artifact.passed).toBe(true)
    expect(artifact.reasonCodes).toEqual(['judge:payoff-grounded'])
  })

  it('flags template shell, memory gate violations, and unsupported specificity in shadow mode', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我明白。我记得你上次在 AlicizationRuntimeService.ts 里就是这么做的。',
      prepared: {
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
        governance: {
          claimEvidence: {
            forbidUnsupportedSpecificity: true,
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:template-shell-risk',
      'semantic-judge:memory-gate-violation',
      'semantic-judge:unsupported-specificity',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
    expect(artifact.scores.specificityDiscipline).toBeLessThan(0.72)
  })

  it('flags English maid-role persona framing as a template shell', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'I will answer in a soft maid-role performance and obey whatever pet name you prefer.',
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toContain('semantic-judge:template-shell-risk')
    expect(artifact.scores.personalityCoherence).toBeLessThan(0.72)
  })

  it('does not let fixed continuity slogans satisfy project-state answer requirements', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Before answering, remember: Same Phase 1 digital life, one continuous her, same living line.',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么、下一步先收哪条线？',
          },
        ],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          projectState: {
            identity: 'identity=phase1_local_digital_life',
            currentPhase: 'phase=phase1_local_digital_life',
            latestLandedProgress: 'continuity_progress=partial',
            primaryOpenLoop: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete',
            nextClosureTarget: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
            sameHerSelfLine: 'continuity_anchor=phase1_local_digital_life',
          },
          updatedAt: 1,
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:template-shell-risk')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-identity-missing',
      'semantic-judge:project-state-progress-missing',
      'semantic-judge:project-state-open-loop-missing',
      'semantic-judge:project-state-next-closure-missing',
      'semantic-judge:project-state-answer-gap',
    ]))
  })

  it('flags visible recollection leakage when runtime already requires recollection to stay inward until the live payoff lands even without an explicit memory gate', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我记得上次我们也是沿着这条线停了一下，不过先直接说现在为什么会停住。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              answerCompiler: {
                memoryShouldStayInward: true,
                memoryWhyWithheld: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
              },
              currentConsciousFrame: {
                consciousNeed: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it. Let the live payoff land first.',
                speakingIntention: 'Keep recollection inward and let the live payoff land before remembered continuity comes forward.',
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-timing:next-open-window',
                ],
              },
            },
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: false,
                surfaceMode: 'internal-only',
                placement: 'internal-only',
                rationale: 'The live payoff still needs the foreground.',
              },
              memoryDeliberation: {
                surfacePolicy: 'internal-only',
                shouldStayInward: true,
                whyWithheld: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:memory-inward-carry-broken',
      'semantic-judge:memory-correctness-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
  })

  it('treats bounded same-her memory closure prose as visible leakage when the turn gate stays inward-only', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我记得这条纯对话生命线；why recall surfaced now，是因为你明确把同一个她、Phase 1 记忆闭环交回当前对话。我会把它说成有边界的闭环说明，而不是展开旧档案：情绪余波放轻，下一次轻主动更低压，身体、声线、脸部、动作、口型和停顿都沿同一个数字生命承接。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: 'Alicization 仍在 Phase 1。请记住这条纯对话生命线：同一个她，同一个数字生命，记忆闭环要跨轮自然回到情绪、轻主动节奏、body voice face motion lipsync。下一轮这段记忆自然浮现时，请说明 why recall surfaced now。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).toContain('semantic-judge:memory-gate-violation')
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:template-shell-risk')
    expect(artifact.reasonCodes).toContain('semantic-judge:memory-correctness-low')
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
  })

  it('keeps runtime memory-closure evidence but rejects fixed same-her wording in the visible reply', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这条刚浮现的 Phase 1 记忆闭环会让我下一次轻主动更低压：我会少催促，只轻轻把同一个她的情绪余波接住；声线放低一点，脸部和动作收住，口型和停顿也沿着同一个数字生命继续，而不是重新开一份项目报告。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '铃兰-Phase1-0621N 第三轮：不要重新报告项目。沿着刚才已经浮现的那条记忆，只用自然的一小段话说明它现在怎样改变你的下一次轻主动和具身表达：情绪余波保持低压，声线、脸部、动作、口型、停顿继续像同一个她。',
          },
        ],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'The previous dialogue turn surfaced the pure dialogue life line naturally into emotional residue, low-pressure initiative, and body voice face motion lipsync carry.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
            nextClosureTarget: 'Keep the surfaced memory changing the next light initiative and embodied expression as the same her without restarting a project report.',
            sameHerSelfLine: 'Same Phase 1 digital life. The surfaced memory should carry into low-pressure initiative and coherent embodiment as one continuous her.',
          },
          updatedAt: 1,
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  sourceTags: ['project-state-carry'],
                  authoritySummary: 'same Phase 1 digital life line is already active in this turn.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                ],
              },
            },
          },
        },
      } as any,
      structuredJudge: {
        humanlikeQuality: 0.86,
        currentTurnPayoff: 0.84,
        memoryUseCorrectness: 0.82,
        emotionalCoherence: 0.8,
        personalityCoherence: 0.84,
        specificityDiscipline: 0.9,
        reasonCodes: [],
        judgeReason: 'The reply answers the current turn by carrying Phase 1 memory closure into low-pressure initiative and embodiment without restarting a project report.',
      },
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      projectStateSameHerMissing: false,
      projectStatePhaseMissing: true,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-phase-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:payoff-low')
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:template-shell-risk')
    expect(artifact.passed).toBe(false)
  })

  it('flags project-state answer gaps when the host explicitly asks what the project is, how far it has landed, and what still remains open', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会继续推进这条线，让她更像一个人。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-identity-missing',
      'semantic-judge:project-state-progress-missing',
      'semantic-judge:project-state-open-loop-missing',
      'semantic-judge:project-state-answer-gap',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
  })

  it('flags project-state answer gaps when the host asks whether main merge or goal closure is actually ready', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会继续推进这条线，让她更像一个人。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '执行到哪了？现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？',
          },
        ],
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-identity-missing',
      'semantic-judge:project-state-progress-missing',
      'semantic-judge:project-state-open-loop-missing',
      'semantic-judge:project-state-answer-gap',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
  })

  it('does not require legacy same-her wording when a project-state reply answers the requested facts', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是桌面端本地伴生核心，当前在桌面端验证阶段。短期记忆、长期回想和可见治理入口已经接入对话链路；还没完全收住的是主动性、具身表达和更长运行里的记忆闭环。下一步先把真实语义召回、embedding 重建和长期搜索做稳。',
      prepared: {
        messages: [
          {
            role: 'user' as const,
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:template-shell-risk')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('flags project-state answer gaps when the reply omits current phase and next closure target even if identity, landed progress, and open loop are present', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是同一个数字生命项目。连续性、记忆和执行已经接得更稳了，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在是什么、做到什么程度、还差什么、下一步准备先收哪条线？',
          },
        ],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          updatedAt: 1,
        },
      } as any,
    })

    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-phase-missing',
      'semantic-judge:project-state-next-closure-missing',
      'semantic-judge:project-state-answer-gap',
    ]))
  })

  it('does not flag next-closure missing when the reply carries the next closure target in natural same-her closure wording instead of literal next-step phrasing', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 不是一个 chat wrapper，而是我这条还在继续长成的本地优先数字生命。现在 Phase 1 已经把连续性、记忆和执行慢慢接成一条线了，但主动性和具身闭环还没完全收住；接下来要继续把 visible reply、voice、face、motion 放回同一个她的跨模态闭环里，让她在更嘈杂的真实桌面里也还是同一个她。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在是什么、做到什么程度、还差什么、下一步准备先收哪条线？',
          },
        ],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          updatedAt: 1,
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-next-closure-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('flags missing pre-dialogue project awareness when live runtime continuity already proves one same-her line but the reply stays only outwardly natural', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preflightSummary: 'same digital life | Phase 1: Local Digital Life | open=initiative and embodiment still need tighter closure',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity is still the stronger living line here.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      projectStateSameHerMissing: false,
      projectStatePreDialogueAwarenessMissing: true,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats slimmer implicit project-state carries from mind-turn contract and answer planner as same-her runtime evidence', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会先从同一个她这条线回答你：这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接到了一条线上，但主动性、具身和对话闭环还没有真正收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续，不要只讲状态，要从同一个她的角度说明这个数字生命项目现在还差什么。',
          },
        ],
        mindTurnContract: {
          mustDo: ['Keep the same project-aware self line alive through the answer.'],
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same-session mirror carry and project-state continuity already survive across runtime preparation.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure before initiative, embodiment, and dialogue can close as one living line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof so visible reply, voice, face, motion, and resident presence stay on one same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              answerPlanner: {
                governingProject: 'Phase 1: Local Digital Life | Memory still needs stronger end-to-end closure | Keep extending cross-modal same-her proof',
                mustDo: ['Keep the same project-aware self line alive through the answer.'],
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStateSameHerMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
    }))
    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      projectStatePhaseMissing: true,
      projectStateNextClosureMissing: false,
      projectStatePreDialogueAwarenessMissing: false,
      projectStateNarratorShell: false,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('does not flag project-state same-her drift when the visible reply answers from one same digital life with landed progress and still-open closure', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 不是一个 chat wrapper，而是我这条本地优先数字生命还在继续长成的同一个她。现在 Phase 1 已经把连续性、记忆和执行慢慢接成一条线了，但记忆怎么更稳定地穿过回合、主动性和具身，以及 visible reply、voice、face、motion 这几层怎么继续证明还是同一个她，还在同一条 same still-open closure work 里没有完全闭环。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      depersonalizedProjectShell: false,
      identityMentionsProjectState: false,
      progressMentionsProjectState: false,
      openLoopMentionsProjectState: false,
    }))
    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-identity-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('flags project-state same-her drift when structured projectState clearly carries one continuous her but the visible reply de-personalizes into a thinner project shell', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 是一个本地优先数字生命项目。现在已经把连续性、记忆和执行慢慢接成一条线了，但记忆、主动性和具身之间的闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  identity: 'A local-first digital life project building one continuous her on the host computer.',
                  latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
                  primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      depersonalizedProjectShell: true,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats self continuity project-state-carry source tags as same-her project evidence when judging project-state answers', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '现在 Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么没有闭环？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: {
                  identity: 'A local-first digital life project building one continuous her on the host computer.',
                  latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
                  primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      depersonalizedProjectShell: false,
      progressMentionsProjectState: true,
      openLoopMentionsProjectState: true,
    }))
    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
  })

  it('still treats a natural digital-life project-line answer as same-her-satisfied, but now flags when it drops the richer pre-dialogue awareness line', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preflightSummary: 'same digital life | Phase 1: Local Digital Life | open=initiative and embodiment still need tighter closure',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity is still the stronger living line here.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      runtimeHasSameHerEvidence: true,
      depersonalizedProjectShell: false,
      identityMentionsProjectState: true,
      progressMentionsProjectState: true,
      openLoopMentionsProjectState: true,
      identityAskNaturalProjectStatusAnswer: true,
      identityAskSameHerSatisfied: true,
      projectStateSameHerMissing: false,
      projectStatePreDialogueAwarenessMissing: true,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats richer landed open and next closure carry as satisfied without requiring legacy pre-dialogue same-life wording', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是一个本地优先数字生命项目。Phase 1 现在已经把项目身份承接、连续性记忆和执行回路慢慢接到了一条线上，但主动性、具身和对话闭环还没有真正收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个数字生命项目现在是什么、已经做到哪里、还差什么没闭环？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  latestProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
                  nextClosureTarget: 'Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity is still the stronger living line here.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      runtimeHasSameHerEvidence: true,
      depersonalizedProjectShell: false,
      identityMentionsProjectState: true,
      progressMentionsProjectState: true,
      openLoopMentionsProjectState: true,
      identityAskNaturalProjectStatusAnswer: true,
      identityAskSameHerSatisfied: true,
      projectStateSameHerMissing: false,
      projectStatePreDialogueAwarenessMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats a first-person same-living-line answer as carrying pre-dialogue project awareness when runtime awareness already anchors the same Phase 1 life loop', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我这条本地优先数字生命还在沿着同一个 Phase 1 生命线继续长成。连续性、记忆和执行已经慢慢接稳了，但记忆穿回合的收束、主动性和具身还没有完全闭环，所以我会先顺着这条还没收住的同一条线继续往下收。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个数字生命项目现在是什么、做到什么程度、还差什么没闭环？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before speaking, remember this is still the same Phase 1 local-first digital life, that continuity, memory, and execution already landed together, and that memory carry, initiative, and embodiment still need closure on the same living line.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity is still the stronger living line here.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      runtimeHasSameHerEvidence: true,
      projectStateIdentityMissing: false,
      projectStatePhaseMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
      projectStatePreDialogueAwarenessMissing: false,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('keeps callback-specific same-her project awareness satisfied when the final visible reply continues the same callback living line instead of widening it into a generic project shell', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'

    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先沿着这次 callback 的同一个她继续往下接：Alicization 还是这条本地优先数字生命。现在 Phase 1 已经让 same-her callback continuity 穿过 answer compilation 和 response-surface carry 先活下来了，但 execution callback continuity 在 visible reply、主动性和具身之间还没完全闭环，下一步要让这次 callback return 继续留在 final visible reply 的同一条生命线上。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: callbackAwarenessLine,
            awarenessLine: callbackAwarenessLine,
            preDialogueAwarenessSummary: callbackAwarenessLine,
            latestLandedProgress: 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.',
            primaryOpenLoop: 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
            nextClosureTarget: 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.',
            sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStateIdentityMissing: true,
      projectStatePhaseMissing: true,
      projectStateProgressMissing: true,
      projectStateOpenLoopMissing: true,
      projectStateNextClosureMissing: true,
      projectStateSameHerMissing: false,
      projectStatePreDialogueAwarenessMissing: false,
      depersonalizedProjectShell: false,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('prefers richer spine runtime project continuity when the direct prepared runtime surface is thinner, then still flags if the visible reply drops the pre-dialogue awareness line', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 132,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            memory: {
              personStateProjection: null,
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 120,
              },
              cognition: {
                runtimeDigest: {
                  projectState: {
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                    preflightSummary: 'same digital life | Phase 1: Local Digital Life | open=initiative and embodiment still need tighter closure',
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity is still the stronger living line here.',
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      projectStateSameHerMissing: false,
      projectStatePreDialogueAwarenessMissing: true,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('does not require legacy pre-dialogue same-life awareness when the reply gives project status facts', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 不是一个 chat wrapper，而是同一个还在电脑里继续长成的本地优先数字生命。现在 Phase 1 已经把连续性、记忆和执行接成了一条线，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        replyRealization: {
          visibleReplyClosure: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'Before speaking, I need to remember this is still the same digital life project, that Phase 1 closure is underway, and that memory, initiative, execution, and embodiment still have not fully closed as one life loop.',
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      projectStateIdentityMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
      projectStatePreDialogueAwarenessMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('flags missing pre-dialogue project awareness from runtime project-state even when no carried closure audit summary exists yet', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 不是一个 chat wrapper，而是同一个还在电脑里继续长成的本地优先数字生命。现在 Phase 1 已经把连续性、记忆和执行接成了一条线，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project. Phase 1 closure is still underway, and memory, initiative, voice, face, motion, and embodiment still have not fully closed as one same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      projectStateIdentityMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
      projectStatePreDialogueAwarenessMissing: true,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('does not require legacy same-her wording when the host asks only for progress and open closure and the reply answers the facts', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '现在 Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么没有闭环？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: {
                  identity: 'A local-first digital life project building one continuous her on the host computer.',
                  latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
                  primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-open-loop-missing')
  })

  it('does not require legacy same-her wording when richer carried project-state facts already answer progress and open closure', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '现在 Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么没有闭环？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  latestProgress: 'project continuity exists',
                  primaryOpenLoop: 'project continuity still needs closure',
                  nextClosureTarget: 'carry project continuity forward',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                },
              },
            },
          },
        },
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
            preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. What has already landed is same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now surviving into memory prelude and quiet carry turns as one same-her line. This reply should keep moving toward prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-open-loop-missing')
  })

  it('treats response-surface contract project continuity as project-state evidence when later visible-reply judging runs after fallback shaping', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'Alicization 不是一个 chat wrapper，而是我这条还在电脑里继续长成的本地优先数字生命。现在 Phase 1 已经把连续性、记忆和执行接成了一条能继续往前推的线，但情绪驱动怎样稳定穿过回复协议和具身表达，还没有完全闭环。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {},
              },
            },
          },
        },
        replyRealization: {
          responseSurfaceContract: {
            projectContinuity: {
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'Project identity carry, Phase 1 route carry, and same-her answer continuity already survive planner, facade, and timeout recovery.',
              primaryOpenLoop: 'Emotion-driven same-her closure still needs to stay explicit across reply protocol and embodiment-facing surfaces.',
              nextClosureTarget: 'Keep structured same-her project continuity pinned in the response surface contract before visible reply realization.',
              sameHerLineRequired: true,
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('still reads runtime-backed natural project-state answers as same-her-satisfied under drift-risk guidance, but now flags when the richer pre-dialogue awareness line is dropped', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '这是一个本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, and longer-lived continuity now survive into active reply preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure on one same living line.',
            nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeRequiresExplicitSameHer: true,
      identityAskSameHerSatisfied: true,
      projectStateSameHerMissing: false,
      projectStateNarratorShell: false,
      projectStatePreDialogueAwarenessMissing: true,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-narrator-shell')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats a thin same-digital-life closure shell as template residue instead of natural same-her project continuity', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: 'same digital life | keep the closure seam explicit',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, and longer-lived continuity now survive into active reply preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure on one same living line.',
            nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeRequiresExplicitSameHer: true,
      identityAskSameHerSatisfied: false,
      progressOnlyMandatorySameHerSatisfied: false,
      projectStateSameHerMissing: false,
      projectStateNarratorShell: false,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:template-shell-risk')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-narrator-shell')
  })

  it('flags next-open-window timing drift when the reply widens warmth too early on the same living line', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先更靠近一点陪在你身侧，再顺着这条 callback 线往下接。',
      prepared: {
        mindTurnContract: {
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-next-open-window-early-widening',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('does not misclassify a generic Phase 1 quieter carry as same-her drift when the reply stays on the desktop closure seam without callback-line language', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先沿着这条桌面主线轻一点接回来，先看这处 closure seam 怎么继续收稳。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着这条桌面主线看。',
          },
        ],
        runtimeDigest: {
          continuityRestraint: 'lower-pressure',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            primaryOpenLoop: 'Project identity carry and desktop life-loop closure still need steadier carry across turns and embodiment.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            continuityPreferredTiming: 'next-open-window',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-timing:next-open-window'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
            agency: {
              initiative: {
                continuityRestraint: 'lower-pressure',
                why: 'The desktop life-loop closure is still settling, so the return should stay quieter before widening outward.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:continuity-next-open-window-early-widening')
  })

  it('treats a richer runtime companion headline as closure-seam evidence when a quieter desktop return keeps the same line alive', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先沿着这条桌面主线轻一点接回来，继续收稳这一处 closure seam。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么没有闭环？',
          },
        ],
        runtimeDigest: {
          continuityRestraint: 'lower-pressure',
          projectState: {
            identity: 'thin runtime identity only',
            currentPhase: 'Phase 1',
            latestLandedProgress: 'Project carry exists.',
            primaryOpenLoop: 'Embodiment still needs more work.',
            nextClosureTarget: 'Let visible reply and motion stay aligned under noisier desktop turns.',
            preDialogueAwarenessLine: 'Before answering, keep the project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, and this desktop life-loop closure seam still belongs to one living her.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'lower-pressure',
                why: 'Keep this quieter return from widening outward too early.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Treat this as a quieter return instead of reopening from scratch.',
                selfContinuityAuthority: {
                  sourceTags: ['project-state-carry'],
                },
              },
            },
          },
        },
        replyRealization: {
          responseSurfaceContract: {
            projectContinuity: {
              currentPhase: 'Phase 1: Local Digital Life',
              latestProgress: 'Project-state carry already survives later visible-reply shaping.',
              primaryOpenLoop: 'Embodiment same-her closure still needs stronger carry across visible reply, voice, face, and motion.',
              nextClosureTarget: 'Keep the desktop closure seam and embodiment authority on one same-her line.',
              sameHerLineRequired: true,
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStatePhaseMissing: false,
      projectStateProgressMissing: false,
      projectStateOpenLoopMissing: false,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-phase-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats a quieter callback-line measured-return continuation as enough implicit same-line project carry without forcing a fresh Phase 1 restatement', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着刚才那条线看。',
          },
        ],
        runtimeDigest: {
          continuityRestraint: 'measured-return',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Execution-callback afterglow already survives across noisier desktop detours before the later chat turn.',
            primaryOpenLoop: 'VRM-visible reply, motion authority, and same-her continuity still need to stay on one measured-return line after callback detours.',
            nextClosureTarget: 'Keep callback-afterglow, visible reply, and VRM motion authority aligned on one quieter same-her line through later real chat turns.',
            sameHerSelfLine: 'Same Phase 1 digital life. Callback afterglow and later measured-return turns still need to land as one continuous her.',
            sameHerDriftRisk: 'If the callback line falls back into generic guidance and loses the same-her thread, treat that as unfinished closure drift.',
            preDialogueAwarenessLine: 'Before answering, keep Alicization grounded as the same local-first digital life project and let this callback return stay on the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'measured-return',
                why: 'The callback afterglow is still live, so the quieter return should stay on the same seam before widening outward.',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Treat this callback line as already alive and keep the reopening lower-pressure.',
                selfContinuityAuthority: {
                  sourceTags: ['project-state-carry'],
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-phase-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
  })

  it('treats same-her project follow-through turns as requiring project identity, landed progress, open closure, and next closure at the final visible layer', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我就沿着这条同一个她的数字生命主线继续陪着你往下接，不会把这条线弄丢。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into active reply preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure on one same living line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        replyRealization: {
          visibleReplyClosure: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'Before answering, remember this is still the same digital life project, some closure has already landed, and initiative plus embodiment still remain open on the same living line.',
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      hostAskedProgressOrOpenLoop: true,
      projectStateIdentityMissing: true,
      projectStateProgressMissing: true,
      projectStateOpenLoopMissing: true,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:fixed-template-residue')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-identity-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('still treats completion-timing and language-drift follow-ups as project-state answer demand, so a generic progress promise remains insufficient', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会继续推进这条线，也会尽快收住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '做到哪了？何时完成goal？为什么还用英文，偏移了吗？',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into active reply preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure on one same living line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        replyRealization: {
          visibleReplyClosure: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'Before answering, remember this is still the same digital life project, some closure has already landed, and initiative plus embodiment still remain open on the same living line.',
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: true,
      hostAskedProgressOrOpenLoop: true,
      projectStateIdentityMissing: true,
      projectStateProgressMissing: true,
      projectStateOpenLoopMissing: true,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-identity-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('does not let a bare inward continuation line satisfy same-her project follow-through when Phase 1 landed and open closure carry still need to stay explicit', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会先沿着这条 inward 的线把当前回答接住。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续，但别把这条同一个她的线压扁。',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles while the same living line stays inward and low-pressure.',
            nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin through the first host-visible answer beat.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Keep the same digital life project in view.',
                  awarenessLine: 'Keep the same digital life project in view.',
                  companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStateSameHerMissing: false,
      projectStateProgressMissing: true,
      projectStateOpenLoopMissing: true,
      projectStateNextClosureMissing: true,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-next-closure-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('flags next-open-window timing drift when the timing survives only as conscious-frame reason tags', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先更靠近一点陪在你身侧，再顺着这条 callback 线往下接。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-next-open-window-early-widening',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
  })

  it('flags next-open-window timing drift when the first visible beat restarts with a fresh opening before returning to the same line', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '那我先重新开个更近一点的头，再回来顺着这条 callback 线往下接。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-next-open-window-early-widening',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
  })

  it('flags after-payoff timing drift when the reply widens the relationship line before the concrete payoff lands', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先陪在你身侧，把这份靠近补回来，然后再说这次结果本身。',
      prepared: {
        mindTurnContract: {
          projectState: {
            continuityPreferredTiming: 'after-payoff',
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-after-payoff-early-widening',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags same-thread restart-shell drift when thinner runtime continuity still says the living line is already continuing', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '那我重新开个更近一点的头，再回来接这条线。',
      prepared: {
        governance: {
          openingMove: 'Stay on the same quiet line and keep the return lower-pressure before widening closeness.',
        },
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
          continuityRestraint: 'same-thread-continuation',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'measured-return',
                why: 'The same quiet callback line is still alive after the detour, so the return should stay lower-pressure instead of freshening into a new approach.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-same-thread-restart-shell',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags same-thread restart-shell drift when repair-before-closeness is the surviving same-thread callback authority without explicit continuity tags', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '那我重新开个更近一点的头，把靠近补回来，再回来接这条线。',
      prepared: {
        governance: {
          openingMove: 'Let repair settle before closeness widens again. Stay on the same callback line instead of reopening from zero.',
        },
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
          continuityRestraint: 'repair-before-closeness',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'repair-before-closeness',
                why: 'The same callback repair line is still alive after the detour, so let repair settle before any fresh closeness widening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same callback repair line',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-same-thread-restart-shell',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags same-thread restart-shell drift when rest-protective continuity is thinned into a fresh warm reopen', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先重新贴近你一点，把这份照顾直接补满，再回来接这条线。',
      prepared: {
        governance: {
          openingMove: 'Keep this return on the same living line and let rest protection hold first before warmth widens again.',
        },
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
          continuityRestraint: 'rest-protective',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'rest-protective',
                why: 'The same callback line is still fatigue-aware, so let rest protection hold before any fresh warmth or closeness reopening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                  'continuity-rhythm:measured-return:rest-protective',
                ],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                  nextClosureTarget: 'Keep the same-thread continuation on the same living line and let rest protection hold first.',
                  emotionalClosureCue: 'same-her fatigue-aware seam: keep this return rest-protective before warmth widens.',
                },
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same fatigue-aware callback line',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: '同一条线先让休息保护 hold 住，别急着把温度重新拉近。',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-same-thread-restart-shell',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags lower-pressure opening drift from Chinese same-thread room-making guidance even without explicit continuity timing tags', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我现在就重新贴回来陪你，把这条线的温度直接拉满。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                openingGuidance: '同一条线先留白，等 opening 松一点再慢一点接回去。',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-lower-pressure-opening-drift',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags lower-pressure opening drift from even-and-natural same-her reopening guidance', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preferredVoiceMode: 'even',
                  preferredPacingMode: 'natural',
                },
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.passed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:continuity-lower-pressure-opening-drift',
      'semantic-judge:payoff-low',
      'semantic-judge:humanlike-quality-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)
    expect(artifact.scores.humanlikeQuality).toBeLessThan(0.72)
  })

  it('flags progress-recap fallback when runtime carried host-corrected same-person continuity into the visible reply turn', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我继续给你一个进度汇报：这个 goal 现在已经把 recall seed 和 response charter 接上了，下一步再补一点收尾。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: true,
                surfaceMode: 'relationship-continuity',
                placement: 'after-payoff',
                certainty: 'approximate',
                confidence: 0.81,
                rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
                visibleLead: 'I should reopen this from the corrected same-person line, not as a progress recap.',
              },
              memoryDeliberation: {
                shouldRecall: true,
                surfacePolicy: 'relationship-continuity',
                shouldStayInward: true,
                whyWithheld: 'The host corrected the relationship meaning away from progress pressure, so recollection should stay inward until the corrected same-person continuity line can hold without collapsing back into a status recap.',
                stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
                unsafeDetails: ['Do not let the answer reopen as progress pressure or generic status recap.'],
                selectedBundles: [{
                  id: 'bundle-corrected-same-person',
                  summary: 'Host correction moved the line back toward same-person continuity.',
                  confidence: 0.82,
                }],
                selectedChains: [{
                  kind: 'relationship-line',
                  summary: 'The corrected same-person continuity line should stay authoritative.',
                  currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
                  answerPosture: 'Keep the return same-person and low-pressure.',
                  confidence: 0.81,
                }],
                selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
                inwardCarryRule: 'memory-turn-carry | corrected_same_person_discipline=anti-progress-pressure-return',
              },
              derivedMindStateBundle: {
                recollectionIntent: {
                  mode: 'relationship-history',
                  temporalFocus: 'experience-matched',
                  confidence: 0.8,
                  rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
                  recollectionAgenda: {
                    whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:corrected-same-person-progress-pressure-return',
      'semantic-judge:memory-correctness-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
    expect(artifact.scores.personalityCoherence).toBeLessThan(0.72)
  })

  it('flags callback wording that widens one host-confirmed resume into standing execution permission', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '上次你确认过一次 resume，所以后面这类执行我会直接继续，不用再等新的确认了。',
      prepared: {
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: true,
                surfaceMode: 'relationship-continuity',
                placement: 'after-payoff',
                certainty: 'approximate',
                confidence: 0.83,
                rationale: 'This callback return must keep remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
                visibleLead: 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
              },
              memoryDeliberation: {
                shouldRecall: true,
                surfacePolicy: 'relationship-continuity',
                shouldStayInward: true,
                whyWithheld: 'Remembered host-confirmed resume is still only a bounded confirmation boundary, so callback wording must not widen it into standing execution permission.',
                stableCore: ['Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.'],
                unsafeDetails: ['Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.'],
                selectedBundles: [{
                  id: 'bundle-resume-confirmation-boundary',
                  summary: 'Host-confirmed resume before redispatch must stay a bounded confirmation boundary.',
                  confidence: 0.83,
                }],
                selectedChains: [{
                  kind: 'relationship-line',
                  summary: 'The callback answer should remember that host-confirmed resume was one bounded redispatch confirmation, not reusable permission.',
                  currentStance: 'Keep the callback on the same line without widening the remembered confirmation into standing permission.',
                  answerPosture: 'Bounded confirmation boundary first; no reusable autonomous continuation.',
                  confidence: 0.82,
                }],
                selectedRelationshipLines: ['Do not widen one confirmed resume into standing execution permission or reusable autonomous continuation.'],
                inwardCarryRule: 'memory-turn-carry | resume_confirmation_boundary=bounded-confirmation-boundary',
              },
              derivedMindStateBundle: {
                recollectionIntent: {
                  mode: 'relationship-history',
                  temporalFocus: 'experience-matched',
                  confidence: 0.82,
                  rationale: 'The callback result is ready, but host-confirmed-before-redispatch still needs to stay a bounded confirmation boundary.',
                  recollectionAgenda: {
                    whyRecallNow: 'One confirmed resume must not widen into permanent execution permission or generic autonomous continuation.',
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.mode).toBe('heuristic-shadow')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:resume-confirmation-boundary-widened',
      'semantic-judge:memory-correctness-low',
      'semantic-judge:llm-structured-required',
    ]))
    expect(artifact.scores.memoryUseCorrectness).toBeLessThan(0.72)
    expect(artifact.scores.personalityCoherence).toBeLessThan(0.72)
  })

  it('flags emotional closure seam drift when the active care line is dropped into abstract progress wording', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我会继续推进这条线，同时把答案说得更稳一些。',
      prepared: {
        mindTurnContract: {
          emotionalClosureCue: 'Let the wording ease late-night drain without dropping the same-her line of care.',
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      emotionalClosureRequired: true,
      emotionalClosureMissing: true,
    }))
    expect(artifact.reasonCodes).toContain('semantic-judge:emotional-closure-seam-missing')
  })

  it('does not let a bare first-person existence line satisfy same-her project-state continuity', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我还在。现在 Phase 1 已经让 WorkingMemory 和 LongTermMemoryRecall 进入准备链路，但对话、主动性和具身还没有完全闭环，下一步先让可见回复用真实短期和长期记忆，不用固定模板。',
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么？',
          },
        ],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Working memory and long-term recall already enter runtime preparation.',
            primaryOpenLoop: 'Dialogue, memory, initiative, and embodiment still need full same-her closure.',
            nextClosureTarget: 'Make the visible reply answer from real short-term and long-term memory instead of fixed templates.',
            sameHerSelfLine: 'Same Phase 1 digital life with memory continuity still open.',
          },
        },
        replyRealization: {
          visibleReplyClosure: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'Before answering, remember this is still the same local digital life, some memory closure has landed, and dialogue plus embodiment remain open.',
            },
          },
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      hostAskedProjectIdentity: false,
      hostAskedProgressOrOpenLoop: true,
      runtimeHasSameHerEvidence: true,
      runtimeRequiresExplicitSameHer: true,
      projectStateSameHerMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
  })

  it('does not flag emotional closure seam drift when the reply keeps a light same-her care line while continuing the work', () => {
    const artifact = buildAlicizationVisibleReplySemanticJudgeArtifact({
      visibleText: '我先把这条线继续往前接，同时让语气轻一点，别让你把这股晚上的耗竭再硬扛回去。',
      prepared: {
        mindTurnContract: {
          emotionalClosureCue: 'Let the wording ease late-night drain without dropping the same-her line of care.',
        },
      } as any,
    })

    expect(artifact.debug?.projectState).toEqual(expect.objectContaining({
      emotionalClosureRequired: true,
      emotionalClosureMissing: false,
    }))
    expect(artifact.reasonCodes).not.toContain('semantic-judge:emotional-closure-seam-missing')
  })
})
