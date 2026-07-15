import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationChatMetaPayload,
  buildAlicizationChatMetaSignature,
  createAlicizationChatStreamMetaEmitter,
  shouldEmitAlicizationChatMetaUpdate,
} from './main-chat-stream-meta'
import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

const fixedTemplateGovernanceTokenPattern = /Pre-reply|legacy phase-one template|\bpre_turn_context_digest\b|(?<![\w.-])cadence=[^\W\d_][\w-]*(?![\w-])|(?<![\w.-])continuity_hold=[^\W\d_][\w-]*(?![\w-])|growth=life-loop-open|continuity_scope=life_loop|unresolved_closure=continuity_line|closure=full-cross-modal-open|same-digital-life-project-thread|phase1-route=desktop-life-loop|local_desktop_life_loop|content=excluded|visibility=internal(?:[-_]\w+)?|continuity_owner\s*=\s*one_her|continuity_anchor\s*=\s*phase1_local_digital_life|phase1_local_digital_life_anchor/iu

function isSafeChatMetaIdentifier(fieldName: string | null, value: string) {
  return Boolean(
    fieldName
    && /^[\w./:-]+$/u.test(value)
    && (
      fieldName === 'id'
      || fieldName === 'variationToken'
      || fieldName === 'segmentOrder'
      || fieldName.endsWith('Id')
      || fieldName.endsWith('Ids')
    ),
  )
}

function expectNoFixedTemplateResidue(value: unknown) {
  const stringValues: string[] = []
  const visit = (candidate: unknown, fieldName: string | null = null) => {
    if (typeof candidate === 'string') {
      const normalized = candidate.trim()
      if (!normalized)
        return

      if (normalized.startsWith('{') || normalized.startsWith('[')) {
        try {
          const parsed = JSON.parse(normalized)
          if (parsed !== normalized) {
            visit(parsed)
            return
          }
        }
        catch {
          // Treat non-JSON text as an ordinary semantic value.
        }
      }

      if (isSafeChatMetaIdentifier(fieldName, normalized))
        return

      stringValues.push(normalized)
      return
    }

    if (Array.isArray(candidate)) {
      candidate.forEach(item => visit(item, fieldName))
      return
    }

    if (candidate && typeof candidate === 'object')
      Object.entries(candidate as Record<string, unknown>).forEach(([key, item]) => visit(item, key))
  }

  visit(value)
  const residues = stringValues.filter((candidate) => {
    if (fixedTemplateGovernanceTokenPattern.test(candidate))
      return true

    const semanticCandidate = candidate
      .split(' | ')
      .filter(part => !/^(?:seg|src)=\w[\w.:/-]*$/iu.test(part))
      .join(' | ')
    return containsAlicizationFixedTemplateResidue(semanticCandidate)
  })

  expect(residues, JSON.stringify(residues)).toEqual([])
}

const legacyProjectStateAliasKeys = [
  'latestProgress',
  'landedProgressSummary',
  'openClosureSummary',
  'nextClosureTargetSummary',
] as const

function expectNoLegacyProjectStateAliases(projectState: unknown) {
  expect(projectState).toEqual(expect.any(Object))
  for (const aliasKey of legacyProjectStateAliasKeys)
    expect(projectState).not.toHaveProperty(aliasKey)
}

function parseAlicizationChatMetaSignature(signature: string) {
  return JSON.parse(signature) as {
    residentPresenceSummary?: string | null
    runtimeDigestEmotionalClosureCue?: string | null
    runtimeDigestProjectNextClosureTarget?: string | null
  }
}

function readSanitizedRuntimeSummarySurfaces(summary: unknown) {
  const runtimeDigest = {
    version: 'alicization-runtime-digest-v1',
    summary,
  } as any
  const signature = JSON.parse(buildAlicizationChatMetaSignature({
    runtimeDigest,
  } as any)) as { runtimeDigestSummary?: string | null }
  const payload = buildAlicizationChatMetaPayload({
    cardId: 'card-runtime-summary-boundary',
    turnId: 'turn-runtime-summary-boundary',
    governance: null,
    visibleReplyExecution: null,
    embodiment: null,
    embodimentScript: null,
    speechTimeline: null,
    digitalLife: null,
    digitalLifeSpine: null,
    runtimeDigest,
  })

  return {
    signatureSummary: signature.runtimeDigestSummary,
    payloadSummary: payload.runtimeDigest?.summary,
  }
}

const { buildAlicizationChatStreamEmbodimentMetaMock } = vi.hoisted(() => ({
  buildAlicizationChatStreamEmbodimentMetaMock: vi.fn(({ governance, reply, turnId }: { governance?: any, reply?: string, turnId?: string }) => {
    if (!governance) {
      return {
        governance: null,
        embodiment: null,
        speechTimeline: null,
      }
    }

    const normalizedReply = typeof reply === 'string' ? reply.trim() : ''
    return {
      governance,
      embodiment: {
        emotion: 'thinking',
        variationToken: `${turnId ?? 'turn'}-variation`,
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      },
      speechTimeline: normalizedReply
        ? {
            version: 'speech-timeline-v1',
            variationToken: `${turnId ?? 'turn'}-variation`,
            reply: normalizedReply,
            emotion: 'thinking',
            segments: [
              {
                id: 'segment-1',
                index: 0,
                startOffset: 0,
                endOffset: normalizedReply.length,
                text: normalizedReply,
                emotion: 'thinking',
                gestureWeight: 0.6,
                facialWeight: 0.5,
                prosodyWeight: 0.7,
                beatWeight: 0.4,
                emotionHoldMs: 360,
                settleMode: 'linger',
                rendererSettle: {
                  live2dMotionFollowThroughMs: 520,
                  vrmExpressionBlendMs: 380,
                },
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                  preferredExpressionAliases: ['CalmInspect'],
                  preferredMotionAliases: ['ObserveSoft'],
                },
                actionCue: 'lean-forward',
                facialCue: 'blink',
                actionWindow: 'segment-start',
                interruptMode: 'soft-interrupt',
              },
            ],
          }
        : null,
      embodimentScript: normalizedReply
        ? {
            version: 'embodiment-script-v1',
            decisionTraceId: governance?.decisionTraceId ?? null,
            turnId: turnId ?? 'turn',
            rendererTarget: 'live2d',
            replyText: normalizedReply,
            state: {
              baseEmotion: 'thinking',
              delivery: 'firm',
              emphasis: 0,
              residentMode: 'dialogue',
            },
            speechPlan: {
              segments: [{
                id: 'segment-1',
                index: 0,
                text: normalizedReply,
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 360,
              }],
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 360,
            },
            facePlan: {
              speakingCues: [{
                segmentId: 'segment-1',
                emotion: 'thinking',
                facialCue: 'blink',
                intensity: 0.5,
                holdMs: 360,
                preUtteranceCue: 'steady-inhale',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              }],
            },
            motionPlan: {
              idleBase: 'lean-forward',
              actionBursts: [{
                segmentId: 'segment-1',
                actionCue: 'lean-forward',
                intensity: 0.6,
                holdMs: 360,
                source: 'timeline-projection',
                confidence: 0.88,
              }],
              attentionMode: 'attentive',
            },
            lipsyncPlan: {
              mode: 'energy-phoneme-hybrid',
              visemeHints: [
                {
                  segmentId: 'segment-1',
                  viseme: 'closed',
                  weight: 0.62,
                  source: 'prosody-authority',
                  confidence: 0.94,
                },
                {
                  segmentId: 'segment-1',
                  viseme: 'E',
                  weight: 0.29,
                  source: 'prosody-authority',
                  confidence: 0.94,
                },
              ],
            },
          }
        : null,
      digitalLife: normalizedReply
        ? {
            version: 'digital-life-v1',
            variationToken: `${turnId ?? 'turn'}-variation`,
            emotion: 'thinking',
            mode: 'recovering',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'blink',
              actionCue: 'lean-forward',
              delivery: 'firm',
              emphasis: 0.9,
            },
            speechStyle: {
              pitchDelta: 1,
              rateMultiplier: 1,
            },
            voice: {
              pitchDelta: 1,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.3,
              energyBias: 0.7,
              mouthScale: 1,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'blink',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 340,
            },
            action: {
              actionCue: 'lean-forward',
              actionMode: 'pulse',
              intensity: 0.6,
              holdMs: 280,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
            frames: [
              {
                id: 'segment-1',
                index: 0,
                startOffset: 0,
                endOffset: normalizedReply.length,
                text: normalizedReply,
                mode: 'recovering',
                interruptPolicy: 'soft-interrupt',
                settleMode: 'linger',
                voice: {
                  pitchDelta: 1,
                  rateMultiplier: 1,
                  energy: 0.42,
                  cadence: 0.38,
                },
                lipSync: {
                  mode: 'closed',
                  visemeBias: 0.3,
                  energyBias: 0.7,
                  mouthScale: 1,
                  continuityHoldMs: 300,
                },
                face: {
                  emotion: 'thinking',
                  facialCue: 'blink',
                  expressionMode: 'hold',
                  intensity: 0.5,
                  holdMs: 320,
                  rendererHints: {
                    residentMode: 'measured-return',
                    preferredBlinkCadence: 'linger',
                    preferredGazeMode: 'soften',
                  },
                },
                action: {
                  actionCue: 'lean-forward',
                  actionMode: 'none',
                  intensity: 0.2,
                  holdMs: 260,
                  rendererHints: {
                    residentMode: 'measured-return',
                    preferredBlinkCadence: 'linger',
                    preferredGazeMode: 'soften',
                  },
                },
                motor: {
                  bodyLean: 0,
                  bodyOpenness: 0,
                  bodySway: 0,
                  breathAmplitude: 0,
                  browLift: 0,
                  browTension: 0,
                  cheekLift: 0,
                  expressivity: 0,
                  eyeOpenness: 0,
                  gazeAzimuth: 0,
                  gazeElevation: 0,
                  gazeFocus: 0,
                  gazeStability: 0,
                  headPitch: 0,
                  jawOpenBias: 0,
                  mouthRound: 0,
                  mouthSpread: 0,
                  stillness: 0,
                },
              },
            ],
          }
        : null,
    }
  }) as any,
}))

vi.mock('./runtime-governance', () => ({
  buildAlicizationChatStreamEmbodimentMeta: buildAlicizationChatStreamEmbodimentMetaMock,
  readStringValue: (value: unknown) => typeof value === 'string' ? value : '',
}))

describe('main chat stream meta', () => {
  it('sanitizes fixed-template residue from internal chat meta surfaces before emission', () => {
    const retainedContinuityCue = 'Keep the continuity state inward for now, and leave room before widening outward again.'
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-template-cleanup',
      turnId: 'turn-template-cleanup',
      governance: {
        decisionTraceId: 'trace-template-cleanup',
        turnMode: 'answer',
        truthState: 'grounded',
        personaKernelMode: 'full',
      } as any,
      visibleReplyExecution: null,
      embodiment: {
        emotion: 'thinking',
        rendererHints: {
          reason: 'pre_turn_context_digest',
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          reason: 'Right now I am still holding together mainly through face and motion.',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        state: {
          residentMode: 'measured-return',
          reason: 'structured continuity digest.',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            text: 'ordinary visible reply text',
            rendererHints: {
              reason: '同一个她这条线要继续。',
            },
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        segments: [{
          id: 'segment-1',
          text: 'visible fixture | memory-tuning-advice=internal-only',
          rendererHints: {
            reason: retainedContinuityCue,
          },
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        summary: 'structured continuity digest.',
        frames: [],
      } as any,
      digitalLifeSpine: {
        runtime: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
      } as any,
      residentPerformance: {
        summary: 'Right now I am still holding together mainly through face and motion.',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0,
        companionshipPressure: 0,
        channels: [],
        summary: 'pre_turn_context_digest',
        projectState: {
          continuityCue: retainedContinuityCue,
          sameHerSelfLine: 'structured continuity digest.',
        },
      } as any,
    })

    expect(payload.speechTimeline?.segments[0]?.text).toBe('')
    expect(payload.speechTimeline?.segments[0]?.rendererHints?.reason).toBe(retainedContinuityCue)
    expect(payload.runtimeDigest?.summary).toBe('')
    expect(containsAlicizationFixedTemplateResidue('continuity state and identity continuity are ordinary domain terms.')).toBe(false)
    expect(() => expectNoFixedTemplateResidue('same-her')).toThrow()
    expect(() => expectNoFixedTemplateResidue('same_her_line')).toThrow()
    expect(() => expectNoFixedTemplateResidue({
      segmentOrder: ['segment-same-her-fixture'],
      turnId: 'turn-same-her-fixture',
    })).not.toThrow()
    expect(() => expectNoFixedTemplateResidue('reason=steady | seg=segment-same-her-fixture | src=resident-authority')).not.toThrow()
    expect(() => expectNoFixedTemplateResidue('cadence=quiet_companionship')).toThrow()
    expect(() => expectNoFixedTemplateResidue('continuity_hold=audible_body_carry')).toThrow()
    expect(() => expectNoFixedTemplateResidue('speech_cadence=natural')).not.toThrow()
    expect(() => expectNoFixedTemplateResidue('preferred_continuity_hold=soft')).not.toThrow()
    expect(() => expectNoFixedTemplateResidue('cadence=0.44')).not.toThrow()
    expectNoFixedTemplateResidue(payload.embodiment)
    expectNoFixedTemplateResidue(payload.embodimentScript)
    expectNoFixedTemplateResidue(payload.speechTimeline)
    expectNoFixedTemplateResidue(payload.digitalLife)
    expectNoFixedTemplateResidue(payload.digitalLifeSpine)
    expectNoFixedTemplateResidue(payload.residentPerformance)
    expectNoFixedTemplateResidue(payload.runtimeDigest)
  })

  it('preserves fixed-template-like code literals in visible reply text while clearing explicit internal governance segments', () => {
    const buildVisibleTextPayload = (visibleText: string) => buildAlicizationChatMetaPayload({
      cardId: 'card-visible-text-boundary',
      turnId: 'turn-visible-text-boundary',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        replyText: visibleText,
        state: {
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 0,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [{
            id: 'segment-visible-text-boundary',
            index: 0,
            text: visibleText,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: visibleText,
        segments: [{
          id: 'segment-visible-text-boundary',
          index: 0,
          text: visibleText,
        }],
      } as any,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })
    const visibleCodeDiscussion = 'We are discussing project_state_continuity as an ordinary code token.'
    const visiblePayload = buildVisibleTextPayload(visibleCodeDiscussion)

    expect(visiblePayload.speechTimeline?.reply).toBe(visibleCodeDiscussion)
    expect(visiblePayload.embodimentScript?.replyText).toBe(visibleCodeDiscussion)
    expect(visiblePayload.speechTimeline?.segments[0]?.text).toBe(visibleCodeDiscussion)

    const internalGovernanceText = 'Visible preface | memory-tuning-advice=internal-only | visible tail'
    const internalPayload = buildVisibleTextPayload(internalGovernanceText)
    expect(internalPayload.speechTimeline?.reply).toBe('')
    expect(internalPayload.embodimentScript?.replyText).toBe('')
    expect(internalPayload.speechTimeline?.segments[0]?.text).toBe('')
  })

  it('keeps only non-empty strings when sanitizing reasonPreview arrays', () => {
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-reason-preview-sanitization',
      turnId: 'turn-reason-preview-sanitization',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        diagnostics: {
          reasonPreview: [
            'visible runtime reason',
            '',
            '   ',
            null,
            42,
            { unexpected: true },
          ],
        },
      } as any,
    })

    expect((payload.runtimeDigest as any)?.diagnostics?.reasonPreview).toEqual([
      'visible runtime reason',
    ])
  })

  it('does not clear primaryOpenLoop outside projectState scope', () => {
    const unrelatedPrimaryOpenLoop = 'The renderer diagnostics queue remains open.'
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-non-project-primary-open-loop',
      turnId: 'turn-non-project-primary-open-loop',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        diagnostics: {
          primaryOpenLoop: unrelatedPrimaryOpenLoop,
        },
      } as any,
    })

    expect((payload.runtimeDigest as any)?.diagnostics?.primaryOpenLoop).toBe(unrelatedPrimaryOpenLoop)
  })

  it('preserves allowlisted runtime telemetry summaries in signatures and top-level runtime digests', () => {
    const sameThreadSummary = 'dominant=resident-presence | speak=false | same-thread-continuation=alive'
    const fullTelemetrySummary = [
      'dominant=active-memory',
      'phase=integrate',
      'handoff=active-dialogue',
      'initiative=0.18',
      'coherence=0.86',
      'autonomy=prepare-act',
      'visible=hover',
      'restraint=measured-return',
      'emotion_closure=quiet callback remains available',
      'intent=follow-through',
      'speak=false',
      'act=true',
      'continuity=0.91',
      'companionship=0.79',
      'motive=unfinished-thread-return',
      'habit=light-touch-companionship',
      'truth=0.72',
      'boundary=0.31',
      'return=0.84',
    ].join(' | ')
    const governanceRedactedSummary
      = 'dominant=active-memory | memory-tuning-advice=SENTINEL_INTERNAL | speak=false'
    const expectedGovernanceRedactedSummary = 'dominant=active-memory | speak=false'
    const cases = [
      [sameThreadSummary, sameThreadSummary],
      [fullTelemetrySummary, fullTelemetrySummary],
      [governanceRedactedSummary, expectedGovernanceRedactedSummary],
    ] as const

    for (const [summary, expected] of cases) {
      const signature = JSON.parse(buildAlicizationChatMetaSignature({
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          summary,
        } as any,
      } as any)) as { runtimeDigestSummary?: string | null }
      const payload = buildAlicizationChatMetaPayload({
        cardId: 'card-runtime-summary-allowlist',
        turnId: 'turn-runtime-summary-allowlist',
        governance: null,
        visibleReplyExecution: null,
        embodiment: null,
        embodimentScript: null,
        speechTimeline: null,
        digitalLife: null,
        digitalLifeSpine: null,
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          summary,
        } as any,
      })

      expect(signature.runtimeDigestSummary, summary).toBe(expected)
      expect(payload.runtimeDigest?.summary, summary).toBe(expected)
    }
  })

  it('fails closed when runtime telemetry summaries contain project prose, template residue, unknown keys, or invalid values', () => {
    const unsafeSummaries = [
      'dominant=active-memory | open=memory-loop',
      'dominant=active-memory | landed=reply-delivery',
      'dominant=active-memory | next=embodiment-close',
      'dominant=active-memory | unknown=alive',
      'dominant=active-memory | project prose without a key',
      'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
      'dominant=active-memory | emotion_closure=same-her continuity remains open',
      'dominant=active-memory | speak=yes',
      'dominant=active-memory | continuity=Infinity',
      'dominant=active-memory | continuity=1e-3',
      'dominant=active-memory | initiative=-0.01',
      'dominant=active-memory | coherence=1.01',
      'dominant=active-memory | continuity=2',
      'dominant=active-memory | companionship=-1',
      'dominant=active-memory | truth=1.1',
      'dominant=active-memory | boundary=-0.1',
      'dominant=active-memory | return=100',
      'dominant=active memory',
      'dominant=active-memory | emotion_closure=quiet=callback',
    ]

    for (const summary of unsafeSummaries) {
      const signature = JSON.parse(buildAlicizationChatMetaSignature({
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          summary,
        } as any,
      } as any)) as { runtimeDigestSummary?: string | null }
      const payload = buildAlicizationChatMetaPayload({
        cardId: 'card-runtime-summary-fail-closed',
        turnId: 'turn-runtime-summary-fail-closed',
        governance: null,
        visibleReplyExecution: null,
        embodiment: null,
        embodimentScript: null,
        speechTimeline: null,
        digitalLife: null,
        digitalLifeSpine: null,
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          summary,
        } as any,
      })

      expect(signature.runtimeDigestSummary, summary).toBe('')
      expect(payload.runtimeDigest?.summary, summary).toBe('')
    }
  })

  it('fails closed malformed own runtime digest summaries without adding a missing summary property', () => {
    const malformedSummaries: unknown[] = [
      42,
      { dominant: 'active-memory' },
      ['dominant=active-memory'],
      null,
    ]

    for (const summary of malformedSummaries) {
      const runtimeDigest = {
        version: 'alicization-runtime-digest-v1',
        summary,
      } as any
      const signature = JSON.parse(buildAlicizationChatMetaSignature({
        runtimeDigest,
      } as any)) as { runtimeDigestSummary?: string | null }
      const payload = buildAlicizationChatMetaPayload({
        cardId: 'card-runtime-summary-malformed',
        turnId: 'turn-runtime-summary-malformed',
        governance: null,
        visibleReplyExecution: null,
        embodiment: null,
        embodimentScript: null,
        speechTimeline: null,
        digitalLife: null,
        digitalLifeSpine: null,
        runtimeDigest,
      })

      expect(signature.runtimeDigestSummary, JSON.stringify(summary)).toBe('')
      expect(payload.runtimeDigest, JSON.stringify(summary)).toHaveProperty('summary', '')
    }

    const payloadWithoutSummary = buildAlicizationChatMetaPayload({
      cardId: 'card-runtime-summary-missing',
      turnId: 'turn-runtime-summary-missing',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
      } as any,
    })

    expect(Object.hasOwn(payloadWithoutSummary.runtimeDigest ?? {}, 'summary')).toBe(false)
  })

  it('does not normalize a full cross-modal body-state marker outside an authority path', () => {
    const legacyFullLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together'
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-non-authority-body-state',
      turnId: 'turn-non-authority-body-state',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        diagnostics: {
          currentBodyState: legacyFullLock,
        },
      } as any,
    })

    expect((payload.runtimeDigest as any)?.diagnostics?.currentBodyState).not.toBe(
      'authority=body+face+motion+lipsync+voice | segment=locked',
    )
  })

  it('does not normalize a full cross-modal body-state marker below an unrelated authority-shaped key', () => {
    const legacyFullLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together'
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-non-authority-shaped-body-state',
      turnId: 'turn-non-authority-shaped-body-state',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        diagnostics: {
          selfAuthority: {
            currentBodyState: legacyFullLock,
          },
        },
      } as any,
    })

    expect((payload.runtimeDigest as any)?.diagnostics?.selfAuthority?.currentBodyState).not.toBe(
      'authority=body+face+motion+lipsync+voice | segment=locked',
    )
  })

  it('fails closed non-lowercase identifier values, non-lowercase keys, and duplicate keys', () => {
    const unsafeSummaries = [
      'dominant=Active-Memory',
      'dominant=Keep',
      'dominant=ſafe',
      'DOMINANT=active-memory',
      'Dominant=active-memory',
      'dominant=active-memory | dominant=dialogue',
    ]

    for (const summary of unsafeSummaries) {
      const sanitized = readSanitizedRuntimeSummarySurfaces(summary)
      expect(sanitized.signatureSummary, summary).toBe('')
      expect(sanitized.payloadSummary, summary).toBe('')
    }
  })

  it('preserves numeric zero and one boundaries while rejecting negative zero', () => {
    const validSummary = [
      'initiative=0',
      'coherence=1',
      'continuity=0.0',
      'companionship=1.0',
      'truth=0',
      'boundary=1',
      'return=0.5',
    ].join(' | ')
    const valid = readSanitizedRuntimeSummarySurfaces(validSummary)
    expect(valid.signatureSummary).toBe(validSummary)
    expect(valid.payloadSummary).toBe(validSummary)

    for (const summary of ['initiative=-0', 'coherence=-0.0']) {
      const sanitized = readSanitizedRuntimeSummarySurfaces(summary)
      expect(sanitized.signatureSummary, summary).toBe('')
      expect(sanitized.payloadSummary, summary).toBe('')
    }
  })

  it('enforces emotion and total summary length after stripping explicit governance pipes', () => {
    const emotionClosureAtLimit = `emotion_closure=${'a'.repeat(96)}`
    const emotionClosureOverLimit = `emotion_closure=${'a'.repeat(97)}`
    const summaryAtLimit = `dominant=${'a'.repeat(520 - 'dominant='.length)}`
    const summaryOverLimit = `dominant=${'a'.repeat(521 - 'dominant='.length)}`
    const safeTelemetry = 'dominant=active-memory | speak=false'
    const governancePrefixedSummary
      = `memory-tuning-advice=${'x'.repeat(720)} | ${safeTelemetry}`

    expect(summaryAtLimit).toHaveLength(520)
    expect(summaryOverLimit).toHaveLength(521)

    for (const summary of [emotionClosureAtLimit, summaryAtLimit]) {
      const sanitized = readSanitizedRuntimeSummarySurfaces(summary)
      expect(sanitized.signatureSummary, summary).toBe(summary)
      expect(sanitized.payloadSummary, summary).toBe(summary)
    }

    for (const summary of [emotionClosureOverLimit, summaryOverLimit]) {
      const sanitized = readSanitizedRuntimeSummarySurfaces(summary)
      expect(sanitized.signatureSummary, summary).toBe('')
      expect(sanitized.payloadSummary, summary).toBe('')
    }

    const governanceRedacted = readSanitizedRuntimeSummarySurfaces(governancePrefixedSummary)
    expect(governanceRedacted.signatureSummary).toBe(safeTelemetry)
    expect(governanceRedacted.payloadSummary).toBe(safeTelemetry)
  })

  it('keeps nested runtime digest summaries on the ordinary summary sanitizer path', () => {
    const runtimeSummary = 'dominant=active-memory | speak=false'
    const activeLoopSummary = 'reply delivery remains active without project narration'
    const residueSummary = 'source=main-runtime | keep=SAFE_DERIVED_SUMMARY'
    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-runtime-summary-nested-isolation',
      turnId: 'turn-runtime-summary-nested-isolation',
      governance: null,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        summary: runtimeSummary,
        activeLoop: {
          summary: activeLoopSummary,
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            summary: residueSummary,
          },
        },
      } as any,
    })

    expect(payload.runtimeDigest?.summary).toBe(runtimeSummary)
    expect(payload.runtimeDigest?.activeLoop?.summary).toBe(activeLoopSummary)
    expect(payload.runtimeDigest?.derivedMindStateBundle?.affectiveResidue?.summary).toBe(residueSummary)
  })

  it('exports memory closure identity across renderer voice face motion lipsync and body summaries', () => {
    const emit = vi.fn()
    const memoryIdentity = {
      selectedCandidateIds: ['memory-candidate-corrected-callback'],
      continuityKey: 'corrected-callback-memory-runtime-reconsolidation',
      reasonTags: ['memory-identity:corrected-callback-memory-runtime-reconsolidation'],
    }
    const memoryClosureCausality = {
      causalSource: 'memory-closure-trace',
      causedByMemoryClosure: true,
      traceAuthority: 'runtime-memory-closure-trace',
      reasonTags: ['memory-closure-trace:next-influence'],
      memoryIdentity,
      summary: 'same corrected callback memory drives output lanes',
    }

    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-memory-closure-identity-output',
      turnId: 'turn-memory-closure-identity-output',
      getGovernance: () => ({
        decisionTraceId: 'trace-memory-closure-identity-output',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        channels: [],
        summary: 'memory closure identity should be visible in the embodied output layer',
        derivedMindStateBundle: {
          version: 'alicization-derived-mind-state-bundle-v1',
          emotionalTransitionLedger: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'emotion',
            },
            initiativeSuppression: {
              memoryClosureCausality: {
                ...memoryClosureCausality,
                affectedLane: 'initiative',
              },
            },
          },
          learningExecutionState: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'execution',
            },
          },
          embodimentContinuityLedger: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'embodiment',
            },
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Same corrected callback memory is carrying the next return.',
          sameHerSelfLine: 'structured continuity digest.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any),
      emit,
    })

    emitter.emit('我会按这条修正后的回调记忆继续。')

    expect(emit).toHaveBeenCalledTimes(1)
    const payload = emit.mock.calls[0]?.[0]
    const signature = JSON.parse(buildAlicizationChatMetaSignature(payload ?? {} as any)) as {
      lastSegmentRendererHintSummary?: string | null
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
    }

    const expectedIdentity = 'memory=corrected-callback-memory-runtime-reconsolidation'
    expect(signature.lastSegmentRendererHintSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentVoiceSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentFaceSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentMotionSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentLipSyncSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentBodyContinuitySummary).toContain(expectedIdentity)
  })

  it('does not let replay repair pressure change stream embodiment or governance cues', () => {
    buildAlicizationChatStreamEmbodimentMetaMock.mockClear()
    const emitWithRepairPressure = (withRepairPressure: boolean) => {
      const emit = vi.fn()
      const emitter = createAlicizationChatStreamMetaEmitter({
        cardId: 'card-replay-pressure-invariance',
        turnId: 'turn-replay-pressure-invariance',
        getGovernance: () => ({
          decisionTraceId: 'trace-replay-pressure-invariance',
          turnMode: 'answer',
          truthState: 'grounded',
          liveSurface: 'callback-line',
          answerAct: 'answer',
          answerEvidenceMode: 'observed',
          personaKernelMode: 'full',
        } as any),
        getRuntimeDigest: () => ({
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          continuityPressure: 0.78,
          companionshipPressure: 0.72,
          shouldProactivelySpeak: true,
          shouldProactivelyAct: false,
          channels: [],
          summary: 'runtime continuity evidence',
          derivedMindStateBundle: {
            version: 'alicization-derived-mind-state-bundle-v1',
            ...(withRepairPressure
              ? {
                  sameHerCausalityRepairPressure: {
                    version: 'same-her-causality-repair-pressure-v1',
                    source: 'memory-tuning-advice',
                    status: 'pending-runtime-evidence',
                    updatedAt: 1_234,
                    sourceReportAt: 1_200,
                    focusDimensions: ['runtimeSameHerEmbodimentCausality'],
                    lanes: [{
                      lane: 'embodiment',
                      reasonTags: ['runtimeSameHerEmbodimentCausality'],
                      summary: 'Pending replay diagnostics for embodiment.',
                    }],
                    notes: ['Replay diagnostics are not embodiment authority.'],
                    summary: 'pending replay repair pressure',
                  },
                }
              : {}),
          },
        } as any),
        emit,
      })

      emitter.emit('继续当前回复。')

      return {
        payload: emit.mock.calls[0]?.[0],
        currentConsciousFrame: buildAlicizationChatStreamEmbodimentMetaMock.mock.calls.at(-1)?.[0]?.currentConsciousFrame,
      }
    }

    const baseline = emitWithRepairPressure(false)
    const pressured = emitWithRepairPressure(true)

    expect(pressured.payload?.embodiment).toEqual(baseline.payload?.embodiment)
    expect(pressured.payload?.embodimentScript).toEqual(baseline.payload?.embodimentScript)
    expect(pressured.payload?.speechTimeline).toEqual(baseline.payload?.speechTimeline)
    expect(pressured.payload?.digitalLife).toEqual(baseline.payload?.digitalLife)
    expect(pressured.currentConsciousFrame).toEqual(baseline.currentConsciousFrame)
    expect(pressured.payload?.digitalLife?.action.actionCue).toBe('lean-forward')
    expect(pressured.payload?.digitalLife?.frames[0]?.action.actionCue).toBe('lean-forward')

    const baselineSignature = JSON.parse(buildAlicizationChatMetaSignature(baseline.payload ?? {} as any)) as Record<string, unknown>
    const pressuredSignature = JSON.parse(buildAlicizationChatMetaSignature(pressured.payload ?? {} as any)) as Record<string, unknown>
    expect(pressuredSignature.lastSegmentRendererHintSummary).toBe(baselineSignature.lastSegmentRendererHintSummary)
    expect(pressuredSignature.lastSegmentPreferredLipsyncMode).toBe(baselineSignature.lastSegmentPreferredLipsyncMode)
    expect(pressuredSignature.lastSegmentPreferredMotionAlias).toBe(baselineSignature.lastSegmentPreferredMotionAlias)
    expect(pressuredSignature.lastSegmentRendererReasonTags).toEqual(baselineSignature.lastSegmentRendererReasonTags)
  })

  it('redacts internal replay governance from emitted runtime digest', () => {
    const collectKeys = (value: unknown, keys: string[] = []) => {
      if (!value || typeof value !== 'object')
        return keys
      if (Array.isArray(value)) {
        for (const item of value)
          collectKeys(item, keys)
        return keys
      }
      for (const [key, nested] of Object.entries(value)) {
        keys.push(key)
        collectKeys(nested, keys)
      }
      return keys
    }
    const safeRuntimeSummary
      = 'dominant=dialogue | speak=false | act=false | continuity=0.42 | companionship=0.58'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-stream-meta-governance-redaction',
      turnId: 'turn-stream-meta-governance-redaction',
      getGovernance: () => ({
        decisionTraceId: 'trace-stream-meta-governance-redaction',
        turnMode: 'answer',
        truthState: 'grounded',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        continuityPressure: 0.42,
        companionshipPressure: 0.58,
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        channels: [],
        summary: safeRuntimeSummary,
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'measured-companionship',
          why: 'SAFE_EMOTION_REASON',
          source: 'source=memory-tuning-advice-user-quote',
        },
        derivedMindStateBundle: {
          version: 'alicization-derived-mind-state-bundle-v1',
          sameHerCausalityRepairPressure: {
            version: 'same-her-causality-repair-pressure-v1',
            source: 'memory-tuning-advice',
            status: 'pending-runtime-evidence',
            focusDimensions: ['SENTINEL_PRESSURE_FOCUS'],
            lanes: [{
              lane: 'embodiment',
              reasonTags: ['SENTINEL_PRESSURE_REASON'],
              summary: 'SENTINEL_PRESSURE_LANE',
            }],
            notes: ['SENTINEL_PRESSURE_NOTE'],
            summary: 'SENTINEL_PRESSURE_SUMMARY',
          },
          memoryTuningAdvice: {
            source: 'memory-tuning-advice',
            focusDimensions: ['SENTINEL_TUNING_FOCUS'],
            notes: ['SENTINEL_TUNING_NOTE'],
          },
          affectiveResidue: {
            summary: 'SAFE_MEMORY_SUMMARY',
          },
          summary: 'source=main-runtime | continuity_causality_repair=SENTINEL_REPAIR_LANE | memory-tuning-advice=SENTINEL_TUNING_SUMMARY | keep=SAFE_DERIVED_SUMMARY',
        },
      } as any),
      emit,
    })

    const visibleReply = 'source=memory-tuning-advice-user-quote|仍然是普通文本'
    emitter.emit(visibleReply)

    const runtimeDigest = emit.mock.calls[0]?.[0]?.runtimeDigest
    const keys = collectKeys(runtimeDigest)
    const serialized = JSON.stringify(runtimeDigest)
    expect(keys).not.toContain('sameHerCausalityRepairPressure')
    expect(keys).not.toContain('memoryTuningAdvice')
    expect(keys).not.toContain('focusDimensions')
    expect(serialized).not.toContain('SENTINEL_PRESSURE')
    expect(serialized).not.toContain('SENTINEL_TUNING')
    expect(serialized).not.toContain('SENTINEL_REPAIR_LANE')
    expect(serialized).not.toContain('continuity_causality_repair')
    expect(runtimeDigest?.summary).toBe(safeRuntimeSummary)
    expect(runtimeDigest?.emotionalKernel?.why).toContain('SAFE_EMOTION_REASON')
    expect((runtimeDigest?.emotionalKernel as any)?.source).toBe('source=memory-tuning-advice-user-quote')
    expect(runtimeDigest?.derivedMindStateBundle?.summary).toBe('source=main-runtime | keep=SAFE_DERIVED_SUMMARY')
    expect(runtimeDigest?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('SAFE_MEMORY_SUMMARY')
    const emitted = emit.mock.calls[0]?.[0]
    expect(emitted?.speechTimeline?.reply).toBe(visibleReply)
    expect(emitted?.speechTimeline?.segments[0]?.text).toBe(visibleReply)
    expect(emitted?.embodimentScript?.replyText).toBe(visibleReply)
    expect(emitted?.embodimentScript?.speechPlan.segments[0]?.text).toBe(visibleReply)
    expect(emitted?.digitalLife?.frames[0]?.text).toBe(visibleReply)
  })

  it('dedupes unchanged embodiment meta signatures and tracks the last emitted reply', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-1',
      turnId: 'turn-1',
      getGovernance: () => ({
        decisionTraceId: 'trace-1',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      }),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.7,
        companionshipPressure: 0.76,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.84,
            focus: 'nudge',
            summary: 'active dialogue is hot',
          },
        ],
        summary: 'dominant=active-dialogue | speak=true',
      }),
      emit,
    })

    emitter.emit('先看这里')
    emitter.emit('先看这里')
    emitter.emit('先看这里。')

    expect(emit).toHaveBeenCalledTimes(2)
    const firstEmission = emit.mock.calls[0]?.[0]
    expect(firstEmission).toEqual(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      speechTimeline: expect.objectContaining({
        reply: '先看这里',
      }),
      digitalLifeSpine: expect.objectContaining({
        continuitySignal: expect.objectContaining({
          summary: expect.stringContaining('scene=coding'),
        }),
      }),
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
      }),
    }))
    expect(firstEmission?.projectState).toBeNull()
    expect(firstEmission?.preDialogueAwareness).toBeNull()
    expect(firstEmission?.embodimentScript?.version).toBe('embodiment-script-v1')
    expect(firstEmission?.embodimentScript?.turnId).toBe('turn-1')
    expect(firstEmission?.embodimentScript?.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      holdMs: 360,
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(firstEmission?.embodimentScript?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
      holdMs: 360,
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(firstEmission?.embodimentScript?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(firstEmission?.embodimentScript?.lipsyncPlan.visemeHints?.[0]).toEqual(expect.objectContaining({
      viseme: 'closed',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    const firstSignature = buildAlicizationChatMetaSignature(firstEmission)
    expect(firstSignature).toContain('"digitalLifeVoicePitchDelta":1')
    expect(firstSignature).toContain('"digitalLifeVoiceRateMultiplier":1')
    expect(firstSignature).toContain('"digitalLifeLipSyncContinuityHoldMs":320')
    expect(firstSignature).toContain('"digitalLifeVoiceCadence":0.38')
    expect(firstSignature).toContain('"lastSegmentResidentMode":"measured-return"')
    expect(firstSignature).toContain('"lastSegmentPreferredBlinkCadence":"linger"')
    expect(firstSignature).toContain('"lastSegmentPreferredGazeMode":"soften"')
    expect(firstSignature).toContain('"lastSegmentContinuityTiming":null')
    expect(firstSignature).toContain('"lastSegmentProsodySummary":"prosody=0.70"')
    expect(firstSignature).toContain('"lastSegmentRendererHintSummary":"mode=measured-return | blink=linger | gaze=soften | motion=ObserveSoft"')
    expect(firstSignature).toContain('"lastSegmentVoiceSummary":"pitch=1.00 | rate=1.00 | energy=0.42 | cadence=0.38 | companion=measured-return | blink=linger | gaze=soften | src=prosody-authority | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=blink | expression=hold | intensity=0.50 | hold=320ms | pre=steady-inhale | post=soft-release | mode=measured-return | blink=linger | gaze=soften | src=prosody-authority | conf=0.94 | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentMotionSummary":"motion=lean-forward | tail=measured-return | blink=linger | gaze=soften | hold=260ms | src=timeline-projection | conf=0.88 | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.30 | energyBias=0.70 | mouthScale=1.00 | src=prosody-authority | conf=0.94 | seg=segment-1"')
    expect(firstSignature).toContain('"digitalLifeFaceExpressionMode":"hold"')
    expect(firstSignature).toContain('"digitalLifeFaceHoldMs":340')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoicePitchDelta":1')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceRateMultiplier":1')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceEnergy":0.42')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceCadence":0.38')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceResidentMode":"measured-return"')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceBlinkCadence":"linger"')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceGazeMode":"soften"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionResidentMode":"measured-return"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionBlinkCadence":"linger"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionGazeMode":"soften"')
    expect(firstSignature).toContain('"digitalLifeLastFrameLipSyncContinuityHoldMs":300')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceExpressionMode":"hold"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionHoldMs":260')
    expect(emit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
      }),
      speechTimeline: expect.objectContaining({
        reply: '先看这里。',
      }),
    }))
    expect(emitter.getLastReply()).toBe('先看这里。')
    expect(emitter.snapshot()).toEqual(expect.objectContaining({
      lastReply: '先看这里。',
      lastSignature: expect.any(String),
    }))
  })

  it('passes explicit structured performance authority into stream-meta rebuilding for later same-thread VRM continuity', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-vrm-authority',
      turnId: 'turn-vrm-authority',
      getGovernance: () => ({
        decisionTraceId: 'trace-vrm-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any),
      getExplicitPerformance: () => ({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      }),
      emit,
    })

    emitter.emit('我先沿着刚才那条线轻一点跟回去。')

    expect(buildAlicizationChatStreamEmbodimentMeta).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-vrm-authority',
      reply: '我先沿着刚才那条线轻一点跟回去。',
      explicitPerformance: expect.objectContaining({
        actionCue: 'inspect_follow',
        facialCue: 'focused',
      }),
    }))
  })

  it('does not synthesize callback project carry from neutral structured digest while preserving measured-return runtime facts', () => {
    const visibleReply = '我先沿着这条线中性可见占位。'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-callback-carry',
      turnId: 'turn-thin-self-authority-callback-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-callback-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same callback seam still lives quietly after a detour',
          activeThreadId: 'thread-thin-self-authority-callback-carry',
          activeThreadTitle: 'same callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback seam is still alive after the detour',
        },
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-callback-carry',
          activeThreadTitle: 'same callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps the same callback line alive',
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback line still lives as execution-callback afterglow',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    expect(emit).toHaveBeenCalledTimes(1)
    const emitted = emit.mock.calls[0]?.[0]
    const sourceTags = emitted?.digitalLifeSpine?.selfAuthority?.sourceTags
    expect(sourceTags).toContain('project-state-carry')
    expect(sourceTags).not.toContain('continuity-execution-callback-project-carry')
    expect(emitted?.runtimeDigest).toEqual(expect.objectContaining({
      continuityRestraint: 'measured-return',
      activeLoop: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        summary: 'execution-callback afterglow still keeps the same callback line alive',
      }),
    }))
    expect(emitted?.digitalLifeSpine?.runtime?.continuityCue).toBe('same callback seam is still alive after the detour')
    expect(emitted?.speechTimeline?.reply).toBe(visibleReply)
    expectNoFixedTemplateResidue(emitted)
  })

  it('repairs project-state carry onto memory self-continuity authority when canonical identity continuity survives a later noisy callback return', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-memory-authority-project-state-carry-later-noisy-return',
      turnId: 'turn-memory-authority-project-state-carry-later-noisy-return',
      getGovernance: () => ({
        decisionTraceId: 'trace-memory-authority-project-state-carry-later-noisy-return',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'runtime.ts - callback seam final return',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy callback detour',
          activeThreadId: 'thread-memory-authority-project-state-carry-later-noisy-return',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantMode: 'repairing',
          dominantDrive: 'understand',
          answerIntent: 'continue the same callback line gently after noise',
          preferredPresence: 'hesitant',
          selectedAction: 'recheck',
          updatedAt: 15_000,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
        proactive: {
          selectedAction: null,
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-memory-authority-project-state-carry-later-noisy-return',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'same callback line should stay lower-pressure after noise',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: '我还是沿着同一个她的回线往前。',
              relationshipLine: '这次回到 coding seam，也还是同一条关系线在往下接。',
              motiveLine: '继续把 callback 的后续接住，不把它改写成新的开始。',
              habitLine: '先守住同一条线，再慢慢往下接。',
              inwardLine: '先沿着同一条 callback 线轻一点继续。',
              authoritySummary: 'identity-continuity',
              sourceTags: ['durable-self-core', 'motive:self-direction'],
            },
          },
        },
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps the same callback line alive',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep the continuity state inward for now, and leave room before widening outward again.',
        },
      } as any),
      emit,
    })

    emitter.emit('中间又切出去一下，也还是接着刚才那条线。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(
      emit.mock.calls[0]?.[0]?.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
    ).toEqual(expect.arrayContaining([
      'project-state-carry',
    ]))
  })

  it('passes runtime current-conscious-frame reason tags into stream-meta embodiment authority so remembered-seam timing is not dropped', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-conscious-frame-embodiment-carry',
      turnId: 'turn-conscious-frame-embodiment-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-conscious-frame-embodiment-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'remembered-seam',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam returns after a detour',
          activeThreadId: 'thread-conscious-frame-embodiment-carry',
          activeThreadTitle: 'same remembered seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'continue the same seam with more room',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 22_000,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same remembered seam, but this time keep more room before leaning back in',
        },
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.74,
        companionshipPressure: 0.8,
        channels: [],
        summary: 'same remembered seam is returning more slowly',
        currentConsciousFrame: {
          reasonTags: ['remembered-seam:reinterpret-with-more-room'],
        },
      } as any),
      emit,
    })

    emitter.emit('像是同一条线又回来了，但这次我会更留白一点接住它。')

    expect(buildAlicizationChatStreamEmbodimentMeta).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-conscious-frame-embodiment-carry',
      currentConsciousFrame: expect.objectContaining({
        reasonTags: ['remembered-seam:reinterpret-with-more-room'],
      }),
    }))
  })

  it('does not synthesize callback project carry from neutral structured digest when the callback line is still repair-before-closeness', () => {
    const visibleReply = '我先把这条线收稳，再沿着同一条线慢一点回来。'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-repair-carry',
      turnId: 'turn-repair-carry-1',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-repair-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          version: 'digital-life-spine-v1',
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'same callback repair seam still lives quietly after a detour',
          activeThreadId: 'thread-thin-self-authority-repair-carry',
          activeThreadTitle: 'same callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback repair seam is still alive after the detour',
        },
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-repair-carry',
          activeThreadTitle: 'same callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback repair line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
        },
        continuitySignal: {
          summary: 'same callback repair line still lives as execution-callback afterglow',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback repair cooldown still keeps the same callback line alive',
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback repair line still lives as execution-callback afterglow',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    expect(emit).toHaveBeenCalledTimes(1)
    const emitted = emit.mock.calls[0]?.[0]
    const sourceTags = emitted?.digitalLifeSpine?.selfAuthority?.sourceTags
    expect(sourceTags).toContain('project-state-carry')
    expect(sourceTags).not.toContain('continuity-execution-callback-project-carry')
    expect(emitted?.runtimeDigest).toEqual(expect.objectContaining({
      continuityRestraint: 'repair-before-closeness',
      activeLoop: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        summary: 'execution-callback repair cooldown still keeps the same callback line alive',
      }),
    }))
    expect(emitted?.digitalLifeSpine?.runtime?.continuityCue).toBe('same callback repair seam is still alive after the detour')
    expect(emitted?.speechTimeline?.reply).toBe(visibleReply)
    expectNoFixedTemplateResidue(emitted)
  })

  it('repairs callback project carry source tags for thinner repair-before-closeness callback afterglow shells without explicit same-thread keywords', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-repair-carry-thin-shell',
      turnId: 'turn-repair-carry-thin-shell',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-repair-carry-thin-shell',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'callback afterglow still asks for repair-first quiet after a detour',
          activeThreadId: 'thread-thin-self-authority-repair-carry-thin-shell',
          activeThreadTitle: 'callback repair seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'callback afterglow still needs repair-first quiet after the detour',
        },
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-repair-carry-thin-shell',
          activeThreadTitle: 'callback repair seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback repair line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'cooldown',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps repair-first quiet alive',
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          continuityCue: 'callback afterglow still needs repair-first quiet after the detour',
        },
      } as any),
      emit,
    })

    emitter.emit('我先把这条线收稳，再沿着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('repairs callback project carry source tags when project emotional closure cue is the only surviving repair-first callback authority', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-project-emotional-closure-repair-carry',
      turnId: 'turn-project-emotional-closure-repair-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-emotional-closure-repair-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'callback seam still lives quietly after the payoff',
          activeThreadId: 'thread-project-emotional-closure-repair-carry',
          activeThreadTitle: 'callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback line still lives after the payoff',
        },
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-project-emotional-closure-repair-carry',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: null,
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'cooldown',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution callback seam still needs quiet continuation after the payoff',
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          continuityCue: 'same callback line still lives after the payoff',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
        },
      } as any),
      emit,
    })

    emitter.emit('我先把这条线收稳，再沿着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('recovers emotional-kernel authority from a runtime-surface spine when stream meta must rebuild a thin runtime digest', () => {
    const emit = vi.fn()
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['same-her', 'stream-meta-fallback'],
      why: 'keep the same emotional kernel alive when only the spine runtime surface reaches stream meta',
    }
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-stream-meta-emotional-kernel-fallback',
      turnId: 'turn-stream-meta-emotional-kernel-fallback',
      getGovernance: () => ({
        decisionTraceId: 'trace-stream-meta-emotional-kernel-fallback',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'stream-meta-fallback',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'stream meta only receives a spine runtime surface',
          activeThreadId: 'thread-stream-meta-emotional-kernel-fallback',
          activeThreadTitle: 'stream meta emotional kernel fallback',
          dominantMode: 'tracking',
          dominantDrive: 'preserve-continuity',
          answerIntent: 'keep the same emotional authority visible',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 19_000,
          projectState: {
            identity: 'Alicization local-first digital life',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same emotional kernel must stay authoritative across stream meta fallback',
            preDialogueAwarenessLine: 'Alicization is still one digital life before this reply.',
            primaryOpenLoop: 'stream meta fallback still needs emotional-kernel authority',
            nextClosureTarget: 'carry emotional kernel into rebuilt runtime digest',
            sameHerSelfLine: 'same-her emotional authority stays one source of truth',
          },
        },
        memory: null,
        runtimeSurface: {
          memory: {
            emotionalKernel,
          },
        },
      } as any),
      getRuntimeDigest: () => null,
      emit,
    })

    emitter.emit('我会把同一个情绪核也一起带到可见 meta 里。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.runtimeDigest?.emotionalKernel).toEqual(emotionalKernel)
  })

  it('falls back to runtime project-state blink and gaze preferences when downstream renderer hints are absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-body-fallback-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-body-fallback-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-body-fallback-1',
        turnId: 'turn-project-state-body-fallback-1',
        rendererTarget: 'live2d',
        replyText: '继续保持同一条数字生命闭环。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-body-fallback-1',
            index: 0,
            text: '继续保持同一条数字生命闭环。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-project-state-body-fallback-1',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.4,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-project-state-body-fallback-1',
            actionCue: 'observe_focus',
            intensity: 0.55,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-state-body-fallback-1',
            viseme: 'A',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-body-fallback-1',
        reply: '继续保持同一条数字生命闭环。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-body-fallback-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '继续保持同一条数字生命闭环。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.68,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          rendererHints: {
            residentMode: 'measured-return',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.62,
          cadence: 0.58,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 320,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 320,
        },
        action: {
          actionMode: 'observe_focus',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-project-state-body-fallback-1',
          text: '继续保持同一条数字生命闭环。',
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
            },
          },
          action: {
            actionCue: 'observe_focus',
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
            },
          },
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.62,
            cadence: 0.58,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 320,
            visemeBias: 0.34,
            energyBias: 0.6,
            mouthScale: 0.96,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.62 | cadence=0.58 | companion=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.40 | hold=320ms | mode=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | companion=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
  })

  it('preserves quiet same-her resident companionship in stream meta when runtime resident performance is the surviving authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-quiet-same-her-resident-runtime-authority',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-quiet-same-her-resident-runtime-authority',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {},
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-quiet-same-her-resident-runtime-authority',
        turnId: 'turn-quiet-same-her-resident-runtime-authority',
        rendererTarget: 'live2d',
        replyText: '我先安静沿着这条线陪着，不把它突然外扩。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-same-her-resident-runtime-authority',
            index: 0,
            text: '我先安静沿着这条线陪着，不把它突然外扩。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            actionCue: 'stillness_guard',
            intensity: 0.22,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            viseme: 'I',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-quiet-same-her-resident-runtime-authority',
        reply: '我先安静沿着这条线陪着，不把它突然外扩。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-same-her-resident-runtime-authority',
          index: 0,
          startOffset: 0,
          endOffset: 19,
          text: '我先安静沿着这条线陪着，不把它突然外扩。',
          emotion: 'thinking',
          gestureWeight: 0.42,
          facialWeight: 0.46,
          prosodyWeight: 0.62,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 480,
            vrmExpressionBlendMs: 340,
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 280,
        },
        action: {
          actionMode: 'stillness_guard',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-quiet-same-her-resident-runtime-authority',
          text: '我先安静沿着这条线陪着，不把它突然外扩。',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'stillness_guard',
            holdMs: 300,
          },
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'identity-continuity',
          activeThreadId: 'thread-quiet-same-her-runtime-authority',
          activeThreadTitle: 'identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the continuity state inward for now, and let quiet companionship hold before widening outward.',
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: 'Keep the continuity state inward for now, and let quiet companionship hold before widening outward.',
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('companion=quiet-companionship')
    expect(signature).toContain('timing=next-open-window')
    expect(signature).not.toContain('reason=cadence=measured_return')
    expect(signature).not.toContain('growth=life-loop-open')
    expectNoFixedTemplateResidue(signature)
  })

  it('redacts fixed project briefing prose from emitted pre-dialogue meta while preserving reply and runtime facts', () => {
    const visibleReply = '我会沿着这条线继续。'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness',
      turnId: 'turn-project-awareness',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state self-brief is still active before delivery',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          initiativeBudget: 0.24,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'reply delivery remains active',
        },
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          companionBriefingLine: 'pre_turn_context_digest',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the main stream-meta path before reply delivery.',
          continuitySummary: 'The current continuity work remains an internal project narrative.',
          proactiveSameHerGap: 'The proactive initiative gap remains an internal project narrative.',
          proactiveSameHerGapSummary: 'The proactive initiative gap summary remains internal project narrative.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'a generic assistant reply that drops the same-her Phase 1 life loop before visible delivery',
          emotionalClosureCue: 'identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      identity: null,
      currentPhase: '',
      preflightSummary: '',
      memoryClosureSummary: '',
      continuitySummary: '',
      proactiveSameHerGap: '',
      proactiveSameHerGapSummary: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: '',
      sameHerDriftRisk: '',
      preDialogueAwarenessLine: '',
      emotionalClosureCue: 'identity-continuity',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(emission?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: '',
      companionBriefingLine: '',
      companionNextClosureLine: '',
      awarenessLine: '',
      emotionalClosureCue: 'identity-continuity',
      reasonPreview: [],
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.speechTimeline?.segments[0]?.text).toBe(visibleReply)
    expect(emission?.embodiment?.emotion).toBe('thinking')
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    expect(emission?.embodimentScript?.state.delivery).toBe('firm')
    expect(emission?.embodimentScript?.speechPlan.segments[0]).toEqual(expect.objectContaining({
      text: visibleReply,
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 360,
    }))
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      activeLoop: expect.objectContaining({
        phase: 'integrate',
        handoffTarget: 'active-dialogue',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      projectState: expect.objectContaining({
        memoryClosureSummary: '',
        continuitySummary: '',
        proactiveSameHerGap: '',
        proactiveSameHerGapSummary: '',
        primaryOpenLoop: '',
        preDialogueAwarenessLine: '',
        emotionalClosureCue: 'identity-continuity',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(JSON.stringify({
      projectState: emission?.projectState,
      preDialogueAwareness: emission?.preDialogueAwareness,
    })).not.toMatch(/local-first digital life project|Phase\s*1|\bopen=|\blanded=|\bnext=|same-her|one living her/iu)
    expectNoFixedTemplateResidue(emission)
  })

  it('drops alias-only closure fields without backfilling canonical project narrative before reply delivery', () => {
    const visibleReply = '我会继续把眼前这件事接住。'
    const emit = vi.fn()
    const aliasSentinels = {
      latestProgress: 'legacy-latest-progress-sentinel',
      landedProgressSummary: 'legacy-landed-progress-summary-sentinel',
      openClosureSummary: 'legacy-open-closure-summary-sentinel',
      nextClosureTargetSummary: 'legacy-next-closure-target-summary-sentinel',
    }
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-alias-only-stream-meta-carry',
      turnId: 'turn-project-awareness-alias-only-stream-meta-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-alias-only-stream-meta-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'runtime structural facts remain active before delivery',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          initiativeBudget: 0.24,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'reply delivery remains active',
        },
        projectState: {
          preflightSummary: 'Legacy project preflight sentinel.',
          companionBriefingLine: 'Legacy project companion sentinel.',
          ...aliasSentinels,
          emotionalClosureCue: 'identity-continuity',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expectNoLegacyProjectStateAliases(emission?.projectState)
    expectNoLegacyProjectStateAliases(emission?.runtimeDigest?.projectState)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: null,
      primaryOpenLoop: null,
      nextClosureTarget: null,
      preflightSummary: '',
      companionBriefingLine: '',
      preDialogueAwarenessLine: null,
      awarenessLine: null,
      emotionalClosureCue: 'identity-continuity',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(emission?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: '',
      companionBriefingLine: '',
      companionNextClosureLine: null,
      awarenessLine: '',
      emotionalClosureCue: 'identity-continuity',
      reasonPreview: [],
    }))
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      activeLoop: expect.objectContaining({
        phase: 'integrate',
        handoffTarget: 'active-dialogue',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      projectState: expect.objectContaining({
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: null,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.embodiment?.emotion).toBe('thinking')
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    const serializedEmission = JSON.stringify(emission)
    for (const sentinel of Object.values(aliasSentinels))
      expect(serializedEmission).not.toContain(sentinel)
    expect(serializedEmission).not.toContain('landed=')
    expectNoFixedTemplateResidue(emission)
  })

  it('keeps host-visible stream meta stable when only fixed project wording changes', () => {
    const visibleReply = '我先继续处理眼前这件事。'
    const emitWithProjectWording = (projectStateWording: Record<string, string>) => {
      const emit = vi.fn()
      const emitter = createAlicizationChatStreamMetaEmitter({
        cardId: 'card-project-awareness-wording-invariance',
        turnId: 'turn-project-awareness-wording-invariance',
        getGovernance: () => ({
          decisionTraceId: 'trace-project-awareness-wording-invariance',
          turnMode: 'answer',
          truthState: 'remembered',
          liveSurface: 'callback-line',
          answerAct: 'answer',
          answerEvidenceMode: 'continuity-carry',
          personaKernelMode: 'full',
        } as any),
        getRuntimeDigest: () => ({
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'dialogue',
          shouldProactivelySpeak: true,
          shouldProactivelyAct: false,
          summary: 'visible reply delivery remains active',
          activeLoop: {
            version: 'alicization-active-loop-v1',
            phase: 'integrate',
            handoffTarget: 'active-memory',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            initiativeBudget: 0.18,
            coherence: 0.87,
            observationHeavy: true,
            summary: 'callback evidence remains active',
          },
          currentConsciousFrame: {
            continuityPreferredTiming: 'next-open-window',
            reasonTags: ['callback-return'],
          },
          projectState: {
            ...projectStateWording,
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
        } as any),
        emit,
      })

      emitter.emit(visibleReply)
      expect(emit).toHaveBeenCalledTimes(1)
      return emit.mock.calls[0]![0]
    }
    const firstPayload = emitWithProjectWording({
      preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory closure remains unfinished | next=keep one same-her line visible.',
      preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project.',
      companionBriefingLine: 'Keep this same digital life project in view before replying.',
      identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life',
      memoryClosureSummary: 'The first project wording says memory closure remains unfinished.',
      latestLandedProgress: 'Same-session mirror carry now survives as one same-her line.',
      primaryOpenLoop: 'Unfinished closure still needs the same living line.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof.',
      sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      preDialogueAwarenessSummary: 'Right now I am still holding together as one living her.',
    })
    const secondPayload = emitWithProjectWording({
      preflightSummary: 'The local-first digital life project | Phase 1: Local Digital Life | open=callback closure remains unfinished | next=keep another same-her line visible.',
      preDialogueAwarenessLine: 'Before speaking, keep this same digital life project in view.',
      companionBriefingLine: 'This is still the same digital life project.',
      identity: 'This local-first digital life project keeps one continuous "her" on the host computer.',
      currentPhase: 'Phase 1: Local Digital Life',
      memoryClosureSummary: 'The second project wording says callback closure remains unfinished.',
      latestLandedProgress: 'Another same-her callback continuity line has landed.',
      primaryOpenLoop: 'The same living line still has unfinished closure.',
      nextClosureTarget: 'Keep the next turn with one living her.',
      sameHerSelfLine: 'Same Phase 1 digital life. Another same living line remains open.',
      preDialogueAwarenessSummary: 'Right now her visible same-her continuity remains partial.',
    })
    const firstSignature = buildAlicizationChatMetaSignature(firstPayload)
    const secondSignature = buildAlicizationChatMetaSignature(secondPayload)

    expect(firstPayload).toEqual(secondPayload)
    expect(firstSignature).toBe(secondSignature)
    expect(firstPayload.embodiment).toEqual(secondPayload.embodiment)
    expect(firstPayload.embodimentScript).toEqual(secondPayload.embodimentScript)
    expect(firstPayload.speechTimeline).toEqual(secondPayload.speechTimeline)
    expect(firstPayload.embodimentScript?.state.delivery).toBe('firm')
    expect(firstPayload.embodimentScript?.state.delivery).toBe(secondPayload.embodimentScript?.state.delivery)
    expect(firstPayload.embodimentScript?.speechPlan.segments[0]).toEqual(expect.objectContaining({
      text: visibleReply,
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 360,
    }))
    expect(firstPayload.embodimentScript?.speechPlan.segments[0]).toEqual(secondPayload.embodimentScript?.speechPlan.segments[0])
    for (const payload of [firstPayload, secondPayload]) {
      expect(payload.projectState).toEqual(expect.objectContaining({
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        memoryClosureSummary: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        preDialogueAwarenessLine: '',
        preDialogueAwarenessSummary: '',
        continuityPreferredTiming: 'next-open-window',
      }))
      expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
        status: 'grounded',
        summaryLine: '',
        companionBriefingLine: '',
        companionNextClosureLine: '',
        awarenessLine: '',
        emotionalClosureCue: null,
        reasonPreview: [],
      }))
      expect(payload.speechTimeline?.reply).toBe(visibleReply)
      expect(payload.speechTimeline?.segments[0]?.text).toBe(visibleReply)
      expect(payload.embodiment?.emotion).toBe('thinking')
      expect(payload.embodimentScript?.replyText).toBe(visibleReply)
      expect(payload.runtimeDigest).toEqual(expect.objectContaining({
        dominantChannel: 'dialogue',
        activeLoop: expect.objectContaining({
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        }),
        currentConsciousFrame: expect.objectContaining({
          continuityPreferredTiming: 'next-open-window',
        }),
        projectState: expect.objectContaining({
          memoryClosureSummary: '',
          primaryOpenLoop: '',
          preDialogueAwarenessLine: '',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        }),
      }))
      expectNoFixedTemplateResidue(payload)
    }
    expect(firstSignature).toContain('"runtimeDigestDominantChannel":"dialogue"')
    expect(firstSignature).toContain('"runtimeDigestActiveLoopPhase":"integrate"')
    expect(firstSignature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(firstSignature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"next-open-window"')
    expectNoFixedTemplateResidue(firstSignature)
    expectNoFixedTemplateResidue(secondSignature)
  })

  it('ignores legacy latestProgress without leaking landed awareness while preserving runtime facts', () => {
    const visibleReply = '我先继续处理眼前这件事。'
    const legacyLatestProgress = 'legacy-latest-progress-host-surface-sentinel'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-canonical-digest-anchor-legacy-progress',
      turnId: 'turn-project-awareness-canonical-digest-anchor-legacy-progress',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-canonical-digest-anchor-legacy-progress',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'runtime structural facts remain active',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          initiativeBudget: 0.18,
          coherence: 0.87,
          observationHeavy: true,
          summary: 'callback evidence remains active',
        },
        projectState: {
          latestProgress: legacyLatestProgress,
          primaryOpenLoop: 'Canonical open loop remains present.',
          nextClosureTarget: 'Canonical next target remains present.',
          emotionalClosureCue: 'identity-continuity',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expectNoLegacyProjectStateAliases(emission?.projectState)
    expectNoLegacyProjectStateAliases(emission?.runtimeDigest?.projectState)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: null,
      primaryOpenLoop: '',
      nextClosureTarget: '',
      emotionalClosureCue: 'identity-continuity',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(emission?.preDialogueAwareness).toEqual(expect.objectContaining({
      emotionalClosureCue: 'identity-continuity',
      reasonPreview: [],
    }))
    expect(String(emission?.preDialogueAwareness?.awarenessLine ?? '')).toBe('')
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      activeLoop: expect.objectContaining({
        phase: 'integrate',
        handoffTarget: 'active-memory',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      projectState: expect.objectContaining({
        latestLandedProgress: null,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.embodiment?.emotion).toBe('thinking')
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    const serializedEmission = JSON.stringify(emission)
    expect(serializedEmission).not.toContain(legacyLatestProgress)
    expect(serializedEmission).not.toContain('landed=')
    expectNoFixedTemplateResidue(emission)
  })

  it('surfaces later-opening continuity guidance inside quiet-companionship stream-meta reasons with next-open-window timing', () => {
    const laterOpeningCue = 'Wait for a later opening, keep the next return measured-return, and leave this continuity state inward for now.'
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-later-opening-quiet-companionship',
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-later-opening-quiet-companionship-1',
        decisionTraceId: 'trace-later-opening-quiet-companionship',
        rendererTarget: 'live2d+vrm',
        emotion: 'thinking',
        residentMode: 'quiet-companionship',
        delivery: 'gentle',
        state: {
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-later-opening-quiet-companionship',
            text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          }],
        },
        facePlan: {
          preUtteranceCue: 'soft-gaze',
          postUtteranceCue: 'hold',
          expressionBursts: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            actionCue: 'stillness_guard',
            intensity: 0.2,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.87,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            viseme: 'I',
            weight: 0.3,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-later-opening-quiet-companionship-1',
        reply: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-later-opening-quiet-companionship',
          index: 0,
          startOffset: 0,
          endOffset: 27,
          text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          emotion: 'thinking',
          gestureWeight: 0.22,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-later-opening-quiet-companionship-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
          visemeBias: 0.3,
          energyBias: 0.62,
          mouthScale: 0.96,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'stillness_guard',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.66,
          breathAmplitude: 0.22,
          expressivity: 0.18,
        },
        frames: [{
          id: 'segment-later-opening-quiet-companionship',
          index: 0,
          startOffset: 0,
          endOffset: 27,
          text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'stillness_guard',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.66,
            breathAmplitude: 0.22,
            expressivity: 0.18,
          },
        }],
      } as any,
      sessionId: 'session-later-opening-quiet-companionship',
      event: 'segment',
      cardId: 'card-later-opening-quiet-companionship',
      activeSegmentId: 'segment-later-opening-quiet-companionship',
      segmentOrder: ['segment-later-opening-quiet-companionship'],
      digitalLifeSpine: {
        proactive: {
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: laterOpeningCue,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
        runtime: {
          projectState: {
            continuityPreferredTiming: 'next-open-window',
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: laterOpeningCue,
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: laterOpeningCue,
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('companion=quiet-companionship')
    expect(signature).toContain('timing=next-open-window')
    expect(signature).toContain(`reason=${laterOpeningCue}`)
    expect(signature).not.toContain('reason=cadence=measured_return')
    expectNoFixedTemplateResidue(signature)
  })

  it('redacts same-her embodiment headlines while preserving generated speech and embodiment delivery meta', () => {
    const visibleReply = '我会沿着这条线继续。'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-headline-priority',
      turnId: 'turn-project-awareness-headline-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-headline-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state stronger headline should stay active before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
          companionBriefingLine: 'pre_turn_context_digest',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the stream-meta path before reply delivery.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      currentPhase: '',
      preflightSummary: '',
      memoryClosureSummary: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      sameHerSelfLine: null,
      preDialogueAwarenessLine: '',
      preDialogueAwarenessSummary: '',
      companionBriefingLine: '',
    }))
    expect(emission?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: '',
      companionBriefingLine: '',
      companionNextClosureLine: '',
      awarenessLine: '',
      emotionalClosureCue: null,
      reasonPreview: [],
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.speechTimeline?.segments[0]?.text).toBe(visibleReply)
    expect(emission?.embodiment?.emotion).toBe('thinking')
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    expect(emission?.embodimentScript?.state.delivery).toBe('firm')
    expect(emission?.embodimentScript?.speechPlan.segments[0]).toEqual(expect.objectContaining({
      text: visibleReply,
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 360,
    }))
    expect(emission?.digitalLife?.frames[0]?.text).toBe(visibleReply)
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      projectState: expect.objectContaining({
        memoryClosureSummary: '',
        primaryOpenLoop: '',
        preDialogueAwarenessLine: '',
      }),
    }))
    expect(JSON.stringify({
      projectState: emission?.projectState,
      preDialogueAwareness: emission?.preDialogueAwareness,
    })).not.toMatch(/local-first digital life project|Phase\s*1|\bopen=|\blanded=|\bnext=|same-her|one living her|Right now I am/iu)
    expectNoFixedTemplateResidue(emission)
  })

  it('redacts project awareness narrative from emitted payloads while preserving runtime and embodiment facts', () => {
    const visibleReply = '我会沿着这条线继续。'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-compact-shell-priority',
      turnId: 'turn-project-awareness-compact-shell-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-compact-shell-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state stronger headline should stay active before delivery',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          initiativeBudget: 0.24,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'reply delivery remains active',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'template-residue-shell',
          preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
          companionBriefingLine: 'template-residue-shell',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the stream-meta path before reply delivery.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Keep the same living line inward before widening outward again.',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      identity: '',
      currentPhase: '',
      preflightSummary: '',
      memoryClosureSummary: '',
      primaryOpenLoop: '',
      nextClosureTarget: '',
      continuityCue: '',
      preDialogueAwarenessLine: '',
      preDialogueAwarenessSummary: '',
      companionBriefingLine: '',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(emission?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: '',
      companionBriefingLine: '',
      companionNextClosureLine: '',
      awarenessLine: '',
      reasonPreview: [],
    }))
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      activeLoop: expect.objectContaining({
        phase: 'integrate',
        handoffTarget: 'active-dialogue',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      currentConsciousFrame: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      projectState: expect.objectContaining({
        identity: '',
        currentPhase: '',
        preflightSummary: '',
        memoryClosureSummary: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        continuityCue: '',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.speechTimeline?.segments[0]?.text).toBe(visibleReply)
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    expect(emission?.embodimentScript?.state.delivery).toBe('firm')
    expect(emission?.embodimentScript?.speechPlan.segments[0]).toEqual(expect.objectContaining({
      id: 'segment-1',
      text: visibleReply,
      interruptPolicy: 'soft-settle',
      preRollMs: 40,
      settleMs: 360,
    }))
    expect(emission?.digitalLife?.frames[0]).toEqual(expect.objectContaining({
      id: 'segment-1',
      text: visibleReply,
      voice: expect.objectContaining({
        energy: 0.42,
        cadence: 0.38,
      }),
      face: expect.objectContaining({
        facialCue: 'blink',
      }),
      action: expect.objectContaining({
        actionCue: 'lean-forward',
      }),
      lipSync: expect.objectContaining({
        continuityHoldMs: 300,
      }),
    }))
    expect(JSON.stringify({
      projectState: emission?.projectState,
      preDialogueAwareness: emission?.preDialogueAwareness,
    })).not.toMatch(/local-first digital life project|Phase\s*1|\bopen=|\blanded=|\bnext=|same-her|one living her|Right now I am/iu)
    expectNoFixedTemplateResidue(emission)
  })

  it('keeps host-visible payload identical when richer landed closure aliases are added', () => {
    const visibleReply = '我会继续处理眼前这件事。'
    const emitProjectState = (legacyAliases: Record<string, string>) => {
      const emit = vi.fn()
      const emitter = createAlicizationChatStreamMetaEmitter({
        cardId: 'card-project-awareness-landed-closure-priority',
        turnId: 'turn-project-awareness-landed-closure-priority',
        getGovernance: () => ({
          decisionTraceId: 'trace-project-awareness-landed-closure-priority',
          turnMode: 'answer',
          truthState: 'grounded',
          liveSurface: 'grounded-scene',
          answerAct: 'answer',
          answerEvidenceMode: 'observed',
          personaKernelMode: 'full',
        } as any),
        getRuntimeDigest: () => ({
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'dialogue',
          summary: 'runtime structural facts remain active',
          activeLoop: {
            version: 'alicization-active-loop-v1',
            phase: 'integrate',
            handoffTarget: 'active-dialogue',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            initiativeBudget: 0.24,
            coherence: 0.9,
            observationHeavy: true,
            summary: 'reply delivery remains active',
          },
          projectState: {
            ...legacyAliases,
            emotionalClosureCue: 'identity-continuity',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
        } as any),
        emit,
      })

      emitter.emit(visibleReply)
      expect(emit).toHaveBeenCalledTimes(1)
      return emit.mock.calls[0]![0]
    }
    const withoutAliases = emitProjectState({})
    const withAliases = emitProjectState({
      latestProgress: '',
      landedProgressSummary: 'Richer landed closure alias sentinel.',
      openClosureSummary: 'Richer open closure alias sentinel.',
      nextClosureTargetSummary: 'Richer next closure alias sentinel.',
    })

    expect(withAliases).toEqual(withoutAliases)
    for (const payload of [withAliases, withoutAliases]) {
      expectNoLegacyProjectStateAliases(payload.projectState)
      expectNoLegacyProjectStateAliases(payload.runtimeDigest?.projectState)
      expect(payload.projectState).toEqual(expect.objectContaining({
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: null,
        preDialogueAwarenessLine: null,
        awarenessLine: null,
        emotionalClosureCue: 'identity-continuity',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }))
      expect(payload.preDialogueAwareness).toBeNull()
      expect(payload.runtimeDigest).toEqual(expect.objectContaining({
        dominantChannel: 'dialogue',
        activeLoop: expect.objectContaining({
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        }),
      }))
      expect(payload.speechTimeline?.reply).toBe(visibleReply)
      expect(payload.embodiment?.emotion).toBe('thinking')
      expect(payload.embodimentScript?.replyText).toBe(visibleReply)
      expectNoFixedTemplateResidue(payload)
    }
  })

  it('keeps compact open and next focus structural without generating project awareness prose', () => {
    const visibleReply = '我会继续处理眼前这件事。'
    const emit = vi.fn()
    const openFocusSummary = 'memory/initiative/embodiment/closure'
    const nextFocusSummary = 'project-carry/measured-return/initiative'
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-compact-focus-priority',
      turnId: 'turn-project-awareness-compact-focus-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-compact-focus-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'runtime structural facts remain active',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          initiativeBudget: 0.24,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'reply delivery remains active',
        },
        projectState: {
          latestProgress: 'compact latest progress alias sentinel',
          landedProgressSummary: 'compact landed progress alias sentinel',
          openClosureSummary: 'compact open closure alias sentinel',
          nextClosureTargetSummary: 'compact next closure alias sentinel',
          openFocusSummary,
          nextFocusSummary,
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit(visibleReply)

    const emission = emit.mock.calls.at(-1)?.[0]
    expectNoLegacyProjectStateAliases(emission?.projectState)
    expectNoLegacyProjectStateAliases(emission?.runtimeDigest?.projectState)
    expect(emission?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: null,
      primaryOpenLoop: null,
      nextClosureTarget: null,
      preDialogueAwarenessLine: null,
      awarenessLine: null,
      openFocusSummary,
      nextFocusSummary,
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(emission?.preDialogueAwareness).toBeNull()
    expect(emission?.runtimeDigest).toEqual(expect.objectContaining({
      dominantChannel: 'dialogue',
      activeLoop: expect.objectContaining({
        phase: 'integrate',
        handoffTarget: 'active-dialogue',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
      projectState: expect.objectContaining({
        openFocusSummary,
        nextFocusSummary,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(emission?.speechTimeline?.reply).toBe(visibleReply)
    expect(emission?.embodiment?.emotion).toBe('thinking')
    expect(emission?.embodimentScript?.replyText).toBe(visibleReply)
    expectNoFixedTemplateResidue(emission)
  })

  it('threads neutral life-loop carry into cross-modal companionship summaries when the old Phase 1 wording is sanitized', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-phase1-growth-resident',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any,
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-phase1-growth',
        state: {
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-growth',
            index: 0,
            text: '我先轻一点陪着，把这条线继续收稳。',
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 0,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-growth',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 260,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe-soft',
          actionBursts: [{
            segmentId: 'segment-growth',
            actionCue: 'observe_soft',
            intensity: 0.2,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-growth',
            viseme: 'E',
            weight: 0.28,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先轻一点陪着，把这条线继续收稳。',
        segments: [{
          id: 'segment-growth',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我先轻一点陪着，把这条线继续收稳。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.36,
          prosodyWeight: 0.44,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_soft',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 0.94,
          energy: 0.4,
          cadence: 0.34,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.24,
          energyBias: 0.52,
          mouthScale: 0.96,
          continuityHoldMs: 280,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 260,
        },
        action: {
          actionCue: 'observe_soft',
          actionMode: 'none',
          intensity: 0.2,
          holdMs: 220,
        },
        frames: [{
          id: 'segment-growth',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我先轻一点陪着，把这条线继续收稳。',
          mode: 'recovering',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 0.94,
            energy: 0.4,
            cadence: 0.34,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.24,
            energyBias: 0.52,
            mouthScale: 0.96,
            continuityHoldMs: 280,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_soft',
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          sceneScenario: 'project-growth',
          dominantMode: 'resident-presence',
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'proactive',
          summary: 'same quiet resident line is still active',
        },
        continuitySignal: {
          label: 'same-thread-continuation',
          summary: 'same-thread-continuation still active as hover-first resident presence after a quieter project detour',
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        },
        memory: {
          summary: 'project-state closure still needs patience',
        },
        selfAuthority: {
          inwardLine: 'stay near as the same Phase 1 digital life while landed closure keeps growing and the still-open loop stays gentle',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        activeLoop: {
          continuityArcStage: 'same-thread-continuation',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
      } as any,
    })

    expect(signature).not.toContain('growth=phase1-open')
    expect(signature).not.toContain('reason=continuity_scope=life_loop')
    expect(signature).not.toContain('open_loop=memory+initiative')
    expect(signature).toContain('companion=measured-return')
    expect(signature).toContain('timing=next-open-window')
    expectNoFixedTemplateResidue(signature)
  })

  it('treats generic Phase 1 desktop-closure continuity wording as neutral continuity carry in cross-modal summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-generic-phase1-growth',
      } as any,
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-generic-phase1-growth',
        state: {
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-generic-growth',
            index: 0,
            text: '我先沿着这条桌面主线中性可见占位。',
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 0,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-generic-growth',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 260,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-generic-growth',
            actionCue: 'observe_focus',
            intensity: 0.2,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-generic-growth',
            viseme: 'E',
            weight: 0.28,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先沿着这条桌面主线中性可见占位。',
        segments: [{
          id: 'segment-generic-growth',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条桌面主线中性可见占位。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.36,
          prosodyWeight: 0.44,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'thinking',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
          energy: 0.69,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.24,
          energyBias: 0.52,
          mouthScale: 0.96,
          continuityHoldMs: 280,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 260,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 220,
        },
        frames: [{
          id: 'segment-generic-growth',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条桌面主线中性可见占位。',
          mode: 'thinking',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.93,
            energy: 0.69,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.24,
            energyBias: 0.52,
            mouthScale: 0.96,
            continuityHoldMs: 280,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        continuitySignal: {
          label: 'same-thread-continuation',
          summary: 'thread=later desktop closure seam after scene hop',
        },
        proactive: {
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
          continuityCue: 'Phase 1 desktop closure is still live across scene hops, so the later chat turn should stay quieter.',
        },
      } as any,
    })

    expect(signature).not.toContain('growth=phase1-open')
    expect(signature).not.toContain('reason=continuity_scope=life_loop')
    expect(signature).not.toContain('unresolved_closure=continuity_line')
    expectNoFixedTemplateResidue(signature)
  })

  it('includes active-loop phase, handoff, and continuity arc stage in stream-meta signatures', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-continuity',
      } as any,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'hold-for-opening',
          initiativeBudget: 0.14,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'callback afterglow should stay inward a little longer',
        },
      } as any,
    })

    expect(signature).toContain('"runtimeDigestActiveLoopPhase":"integrate"')
    expect(signature).toContain('"runtimeDigestActiveLoopHandoff":"active-memory"')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"hold-for-opening"')
  })

  it('includes same-thread proactive restraint style in stream meta signatures so later noisy continuity stays externally legible', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-same-thread-noisy-meta',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy detour',
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 26 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'same-thread-continuation still active after noisier detours',
          signature: 'spine-same-thread-noisy',
          createdAt: 26 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same thread and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
          focusAnchor: 'same callback line after noisy detour',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.22,
          coherence: 0.84,
          observationHeavy: true,
          summary: 'the same thread should stay hover-first after the noisy detour',
        },
      } as any,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameFocusAnchor":"same callback line after noisy detour"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"next-open-window"')
  })

  it('keeps current-conscious-frame continuity timing observable in stream meta signatures even when project-state timing is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-current-conscious-frame-tags-only-continuity-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same callback line still alive after detour',
          activeThreadId: 'thread-current-conscious-frame-tags-only',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 73_000,
        },
        architecture: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.87,
        companionshipPressure: 0.78,
        currentConsciousFrame: {
          reasonTags: [
            'runtime-conscious-frame',
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          focusAnchor: 'same callback line after detour',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.09,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":null')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"next-open-window"')
  })

  it('recovers next-open-window timing in stream meta when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-semantic-timing-fallback',
      } as any,
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      embodimentScript: {
        decisionTraceId: 'embodiment-semantic-timing-fallback',
        rendererTarget: 'live2d',
        state: {
          residentMode: 'measured-return',
          delivery: 'calm',
        },
        speechPlan: {
          segments: [{
            segmentId: 'segment-semantic-timing-fallback',
          }],
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-semantic-timing-fallback',
            source: 'resident-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-semantic-timing-fallback',
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-semantic-timing-fallback',
            viseme: 'A',
            weight: 0.32,
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
        segments: [{
          id: 'segment-semantic-timing-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.36,
          prosodyWeight: 0.46,
          beatWeight: 0.3,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.56,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 1.01,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 300,
        },
        action: {
          actionCue: 'observe_focus',
          intensity: 0.38,
          holdMs: 280,
        },
        frames: [{
          id: 'segment-semantic-timing-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: { pitchDelta: -2, rateMultiplier: 0.95, energy: 0.56, cadence: 0.5 },
          face: {
            emotion: 'thinking',
            cue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            cue: 'observe_focus',
            intensity: 0.38,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuity: 'reactive-articulation',
            continuityHoldMs: 320,
          },
        }],
      } as any,
      digitalLifeSpine: {
        continuitySignal: {
          summary: 'same-thread continuation remains measured-return on continuity state',
        },
        runtime: {
          sceneScenario: 'same-thread-callback',
          dominantMode: 'continuing',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-next-open-window-early-widening'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.56 | cadence=0.50 | companion=measured-return | timing=next-open-window')
  })

  it('recovers after-payoff timing in stream meta when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-semantic-after-payoff-fallback',
      } as any,
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      embodimentScript: {
        decisionTraceId: 'embodiment-semantic-after-payoff-fallback',
        rendererTarget: 'live2d',
        state: {
          residentMode: 'measured-return',
          delivery: 'calm',
        },
        speechPlan: {
          segments: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
          }],
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            source: 'resident-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            viseme: 'A',
            weight: 0.32,
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
        segments: [{
          id: 'segment-semantic-after-payoff-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 25,
          text: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.36,
          prosodyWeight: 0.46,
          beatWeight: 0.3,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.94,
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 1.01,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 300,
        },
        action: {
          actionCue: 'observe_focus',
          intensity: 0.38,
          holdMs: 280,
        },
        frames: [{
          id: 'segment-semantic-after-payoff-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 25,
          text: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: { pitchDelta: -1, rateMultiplier: 0.94, energy: 0.54, cadence: 0.48 },
          face: {
            emotion: 'thinking',
            cue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            cue: 'observe_focus',
            intensity: 0.38,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuity: 'reactive-articulation',
            continuityHoldMs: 320,
          },
        }],
      } as any,
      digitalLifeSpine: {
        continuitySignal: {
          summary: 'same-thread continuation remains measured-return on continuity state',
        },
        runtime: {
          sceneScenario: 'same-thread-callback',
          dominantMode: 'continuing',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-after-payoff-early-widening'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"after-payoff"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.94 | energy=0.54 | cadence=0.48 | companion=measured-return | timing=after-payoff')
  })

  it('redacts project narrative signature fields while preserving runtime continuity coordinates', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-meta',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.22,
          coherence: 0.84,
          observationHeavy: true,
          summary: 'the same thread should stay hover-first after the noisy detour',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=renderer-authoritative continuity still needs to stay outwardly visible | next=keep renderer and main-runtime project continuity views aligned before each turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now reaches the renderer pre-dialogue prompt path.',
          primaryOpenLoop: 'Runtime-authoritative meta still needs to surface the same project continuity cues outwardly.',
          nextClosureTarget: 'Keep renderer and main-runtime project continuity views aligned before each turn.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread',
        },
      } as any,
      visibleReplyExecution: null,
    })
    const parsed = JSON.parse(signature) as Record<string, unknown>

    expect(parsed).toEqual(expect.objectContaining({
      runtimeDigestDominantChannel: 'active-memory',
      runtimeDigestActiveLoopPhase: 'integrate',
      runtimeDigestActiveLoopHandoff: 'active-memory',
      runtimeDigestActiveLoopContinuityArcStage: 'same-thread-continuation',
      runtimeDigestProjectPreflightSummary: '',
      runtimeDigestProjectCurrentPhase: '',
      runtimeDigestProjectMemoryClosureSummary: '',
      runtimeDigestProjectPrimaryOpenLoop: '',
      runtimeDigestProjectNextClosureTarget: '',
      runtimeDigestProjectContinuityArcStage: 'same-thread-continuation',
      runtimeDigestProjectContinuityPreferredTiming: 'next-open-window',
      runtimeDigestProjectContinuityCue: '',
      runtimeDigestCurrentConsciousFrameContinuityArcStage: 'same-thread-continuation',
      runtimeDigestCurrentConsciousFrameContinuityPreferredTiming: 'next-open-window',
    }))
    expect(signature).not.toContain('Alicization is a local-first digital life project')
    expect(signature).not.toContain('Project-state continuity now reaches the renderer pre-dialogue prompt path.')
    expect(signature).not.toContain('Runtime-authoritative meta still needs to surface the same project continuity cues outwardly.')
    expect(signature).not.toContain('Keep renderer and main-runtime project continuity views aligned before each turn.')
    expectNoFixedTemplateResidue(signature)
  })

  it('redacts project preflight narrative while preserving spoken segment delivery and continuity timing', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-preflight-reason',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-preflight-reason',
        turnId: 'turn-project-preflight-reason',
        rendererTarget: 'live2d',
        replyText: '我会先沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我会先沿着这条线继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'blink',
            intensity: 0.5,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
        motionPlan: {
          idleBase: 'lean-forward',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'lean-forward',
            intensity: 0.6,
            holdMs: 360,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-1',
              viseme: 'closed',
              weight: 0.62,
              source: 'prosody-authority',
              confidence: 0.94,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-preflight-reason',
        reply: '我会先沿着这条线继续。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我会先沿着这条线继续。',
            emotion: 'thinking',
            gestureWeight: 0.6,
            facialWeight: 0.5,
            prosodyWeight: 0.7,
            beatWeight: 0.4,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dMotionFollowThroughMs: 520,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-preflight-reason',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我会先沿着这条线继续。',
            mode: 'recovering',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 1,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'sustain',
              visemeBias: 0.3,
              energyBias: 0.7,
              mouthScale: 1,
              continuityHoldMs: 360,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'blink',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'lean-forward',
              actionMode: 'pulse',
              intensity: 0.6,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory and initiative still need tighter identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })
    const parsed = JSON.parse(signature) as Record<string, unknown>

    expect(parsed).toEqual(expect.objectContaining({
      embodimentScriptDelivery: 'firm',
      embodimentScriptSegmentCount: 1,
      segmentCount: 1,
      lastSegmentContinuityTiming: 'next-open-window',
      runtimeDigestProjectPreflightSummary: '',
      runtimeDigestProjectCurrentPhase: '',
      runtimeDigestProjectMemoryClosureSummary: '',
      runtimeDigestProjectPrimaryOpenLoop: '',
      runtimeDigestProjectNextClosureTarget: '',
      runtimeDigestProjectContinuityPreferredTiming: 'next-open-window',
      runtimeDigestProjectContinuityCue: '',
    }))
    expect(parsed.lastSegmentVoiceSummary).toEqual(expect.stringContaining('companion=measured-return | timing=next-open-window'))
    expect(parsed.lastSegmentFaceSummary).toEqual(expect.stringContaining('mode=measured-return | timing=next-open-window'))
    expect(parsed.lastSegmentMotionSummary).toEqual(expect.stringContaining('tail=measured-return | timing=next-open-window'))
    expect(parsed.lastSegmentLipSyncSummary).toEqual(expect.stringContaining('companion=measured-return | timing=next-open-window'))
    expect(signature).not.toContain('reason=continuity_context=present')
    expect(signature).not.toContain('memory and initiative still need tighter')
    expect(signature).not.toContain('keep project self-awareness explicit before each host-visible turn')
    expectNoFixedTemplateResidue(signature)
  })

  it('prefers shared remembered-seam companionship reason in stream meta summaries when the same relationship seam is reopening', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-remembered-seam-stream-meta-reason',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-remembered-seam-stream-meta-reason',
        turnId: 'turn-remembered-seam-stream-meta-reason',
        rendererTarget: 'live2d',
        replyText: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-remembered-seam',
            index: 0,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-remembered-seam',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-remembered-seam',
            actionCue: 'observe_focus',
            intensity: 0.44,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-remembered-seam',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-remembered-seam',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            emotion: 'thinking',
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.48,
          energyBias: 0.82,
          mouthScale: 1.08,
          continuityHoldMs: 440,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-remembered-seam',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，先留白，再慢一点重开。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The same remembered seam is visible again, so reopen gently instead of widening closeness too fast.',
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=relationship_cadence=remembered_boundary')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=0.00 | rate=1.00 | energy=0.42 | cadence=0.38 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=440ms')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps thinner affective-residue room-making wording visible in stream meta summaries for measured-return reopenings', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-thin-affective-residue-stream-meta-reason',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-thin-affective-residue-stream-meta-reason',
        turnId: 'turn-thin-affective-residue-stream-meta-reason',
        rendererTarget: 'live2d',
        replyText: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-thin-affective-residue',
            index: 0,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-thin-affective-residue',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.5,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-thin-affective-residue',
            actionCue: 'observe_focus',
            intensity: 0.42,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-thin-affective-residue',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        reply: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-thin-affective-residue',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
            emotion: 'thinking',
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.4,
          cadence: 0.36,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.48,
          energyBias: 0.82,
          mouthScale: 1.08,
          continuityHoldMs: 440,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-thin-affective-residue',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.4,
              cadence: 0.36,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: '余韵还在，先留白，别立刻把温度放大。',
            openingGuidance: '余韵还在，先留白，别立刻把温度放大。 Stay on the same line and keep this callback opening lower-pressure.',
          },
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=余韵还在，先留白，别立刻把温度放大')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=0.00 | rate=1.00 | energy=0.40 | cadence=0.36 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps chinese project emotional closure cue visible in stream meta summaries when it is the main surviving measured-return authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-chinese-project-emotional-closure-measured-return',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-chinese-project-emotional-closure-measured-return',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。')
  })

  it('surfaces reinterpreted remembered-seam companionship reason in stream meta when newer relationship learning says the earlier reopen was too eager', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-remembered-seam-stream-meta-reinterpretation',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-remembered-seam-stream-meta-reinterpretation',
        turnId: 'turn-remembered-seam-stream-meta-reinterpretation',
        rendererTarget: 'live2d',
        replyText: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-remembered-seam-reinterpretation',
            index: 0,
            text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-remembered-seam-reinterpretation',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-remembered-seam-reinterpretation',
            actionCue: 'observe_focus',
            intensity: 0.44,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-remembered-seam-reinterpretation',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        reply: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-remembered-seam-reinterpretation',
          index: 0,
          startOffset: 0,
          endOffset: 35,
          text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
          emotion: 'thinking',
          prosodyWeight: 0.5,
          beatWeight: 0.34,
          mouthWeight: 0.5,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.48,
          energyBias: 0.82,
          mouthScale: 1.08,
          continuityHoldMs: 440,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-remembered-seam-reinterpretation',
            index: 0,
            startOffset: 0,
            endOffset: 35,
            text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: 'The same remembered seam is back, but this time the return should keep more room.',
            openingGuidance: 'This follow-up is reopening on the same remembered seam, so do not let it lean in too fast.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        },
      } as any,
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerHoldDetail: 'identity-continuity',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=relationship_cadence=remembered_boundary')
    expect(signature).not.toContain('reason=cadence=measured_return; direction=inward; widening=deferred')
    expectNoFixedTemplateResidue(signature)
  })

  it('emits early for short openers and later only on stronger boundaries or growth', () => {
    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '你好呀',
      reply: '你好呀',
      previousReply: '',
    })).toBe(false)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '你好呀。',
      reply: '你好呀。',
      previousReply: '',
    })).toBe(true)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '，然后继续看这里',
      reply: '我先看着你操作，然后继续看这里',
      previousReply: '我先看着你操作',
    })).toBe(true)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '再补一点',
      reply: '我先看着你操作再补一点',
      previousReply: '我先看着你操作',
    })).toBe(false)
  })

  it('builds stable signatures from the dialogue-visible embodiment surface', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里。',
            emotion: 'thinking',
            gestureWeight: 0.6,
            facialWeight: 0.5,
            prosodyWeight: 0.7,
            beatWeight: 0.4,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dMotionFollowThroughMs: 520,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      } as any,
    })

    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里。',
            emotion: 'thinking',
            gestureWeight: 0.6,
            facialWeight: 0.5,
            prosodyWeight: 0.7,
            beatWeight: 0.4,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dMotionFollowThroughMs: 520,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      } as any,
    })

    expect(signatureA).toBe(signatureB)
  })

  it('treats extended renderer settle fields as signature-relevant', () => {
    const buildSignature = (rendererSettle: Record<string, number>) => buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-settle-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-settle-1',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-settle-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-settle-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle,
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(buildSignature({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 240,
      vrmExpressionBlendMs: 380,
    })).not.toBe(buildSignature({
      live2dFacialReleaseMs: 520,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 320,
      vrmExpressionBlendMs: 380,
    }))
  })

  it('changes the signature when the last segment renderer intent changes', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 200,
          settleMode: 'release',
          rendererSettle: {
            live2dMotionFollowThroughMs: 120,
            vrmExpressionBlendMs: 160,
          },
          rendererHints: {
            preferredExpressionAliases: ['SharperInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when Alicization runtime projection changes', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-1',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.72,
        companionshipPressure: 0.78,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.86,
            focus: 'nudge',
            summary: 'active dialogue hot',
          },
        ],
        summary: 'dominant=active-dialogue',
      },
    })
    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-1',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-perception',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.44,
        companionshipPressure: 0.38,
        channels: [
          {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.9,
            focus: 'editor',
            summary: 'active perception hot',
          },
        ],
        summary: 'dominant=active-perception',
      },
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when durable memory digest changes', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-memory-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'mnemonic-passive',
          sceneScenario: 'coding',
          sceneSummary: 'runtime diff',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'runtime diff',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: {
          summary: 'durable=Remembered open loop: return to the runtime diff',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          thoughtThreadSummary: null,
          longHorizonSummary: 'Remembered open loop: return to the runtime diff',
          rememberedPreferenceSummary: 'Remembered preference: keep answers direct.',
          rememberedConstraintSummary: 'Remembered boundary: do not crowd the host while focused.',
          rememberedPlanSummary: 'Remembered open loop: return to the runtime diff',
          longHorizonCueCount: 2,
        },
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-memory-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'mnemonic-passive',
          sceneScenario: 'coding',
          sceneSummary: 'runtime diff',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'runtime diff',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: {
          summary: 'durable=Remembered boundary: stay quiet while the host is focused',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          thoughtThreadSummary: null,
          longHorizonSummary: 'Remembered boundary: stay quiet while the host is focused',
          rememberedPreferenceSummary: 'Remembered preference: keep answers direct.',
          rememberedConstraintSummary: 'Remembered boundary: stay quiet while the host is focused',
          rememberedPlanSummary: null,
          longHorizonCueCount: 1,
        },
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when the last segment settle window changes', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 120,
            vrmExpressionBlendMs: 180,
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when digital life voice continuity shifts between turns', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-voice-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'closed',
          phase: 'settling',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 320,
          topViseme: 'closed:0.88',
          hintViseme: 'closed',
          hintTrail: 'closed',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          mode: 'acting',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 1,
            rateMultiplier: 1,
            energy: 0.42,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'closed',
            phase: 'settling',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 1,
            continuityHoldMs: 300,
            topViseme: 'closed:0.88',
            hintViseme: 'closed',
            hintTrail: 'closed',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'blink',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'lean-forward',
            actionMode: 'pulse',
            intensity: 0.6,
            holdMs: 260,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      digitalLife: {
        ...basePayload.digitalLife,
        voice: {
          ...basePayload.digitalLife.voice,
          pitchDelta: 2,
          rateMultiplier: 0.92,
          cadence: 0.51,
        },
        frames: [{
          ...basePayload.digitalLife.frames[0],
          voice: {
            ...basePayload.digitalLife.frames[0].voice,
            pitchDelta: 2,
            rateMultiplier: 0.92,
            energy: 0.56,
            cadence: 0.51,
          },
        }],
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when last-segment lipsync continuity changes even if other embodiment fields stay stable', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-lipsync-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-lipsync-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-lipsync-1',
        reply: '继续对齐。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '继续对齐。',
          emotion: 'thinking',
          prosodyWeight: 0.62,
          mouthWeight: 0.51,
          headWeight: 0.2,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-lipsync-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '继续对齐。',
          mode: 'acting',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 1,
            rateMultiplier: 1,
            energy: 0.42,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 1,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'blink',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'lean-forward',
            actionMode: 'pulse',
            intensity: 0.6,
            holdMs: 260,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      digitalLife: {
        ...basePayload.digitalLife,
        frames: [{
          ...basePayload.digitalLife.frames[0],
          lipSync: {
            ...basePayload.digitalLife.frames[0].lipSync,
            mode: 'energy-phoneme-hybrid',
            phase: 'playing',
            visemeBias: 0.48,
            energyBias: 0.82,
            mouthScale: 1.08,
            continuityHoldMs: 440,
            topViseme: 'A:0.72',
            hintViseme: 'A',
            hintTrail: 'A>U>closed',
          },
        }],
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
    expect(signatureA).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.30 | energyBias=0.70 | mouthScale=1.00 | seg=segment-1"')
    expect(signatureB).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=440ms | topViseme=A:0.72 | hints=A>U>closed | hint=A | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.48 | energyBias=0.82 | mouthScale=1.08 | seg=segment-1"')
  })

  it('changes the signature when embodimentScript companionship authority changes even if reply text stays the same', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-embodiment-script-signature-1',
      } as any,
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-embodiment-script-signature-1',
        turnId: 'turn-embodiment-script-signature-1',
        rendererTarget: 'live2d',
        replyText: '我先轻一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-only',
        },
      },
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      embodimentScript: {
        ...basePayload.embodimentScript,
        rendererTarget: 'vrm',
        state: {
          ...basePayload.embodimentScript.state,
          residentMode: 'repair-before-closeness',
        },
        motionPlan: {
          ...basePayload.embodimentScript.motionPlan,
          idleBase: 'repair_hold',
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          ...basePayload.embodimentScript.lipsyncPlan,
          mode: 'energy-phoneme-hybrid',
        },
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
  })

  it('keeps cross-modal companionship summaries from embodimentScript authority when later same-thread frames thin out', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-voice-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-voice-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-voice-fallback-same-thread-1',
        turnId: 'turn-voice-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'hesitant',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.38,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-voice-fallback-same-thread-1',
        reply: '我还是沿着这条线继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.34,
          prosodyWeight: 0.41,
          beatWeight: 0.28,
          mouthWeight: 0.33,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-voice-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
          energy: 0.53,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.62,
          mouthScale: 0.96,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.38,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.89,
            energy: 0.53,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.36,
            energyBias: 0.62,
            mouthScale: 0.96,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.38,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"embodimentScriptDelivery":"hesitant"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.89 | energy=0.53 | cadence=0.50 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.36 | energyBias=0.62 | mouthScale=0.96 | src=resident-authority | conf=0.86 | seg=segment-1"')
  })

  it('keeps face companionship summary on measured-return when only action/frame authority still carries the resident hint', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-face-only-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'relaxed',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-face-only-fallback-same-thread-1',
        turnId: 'turn-face-only-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.38,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        reply: '我还是沿着这条线继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.34,
          prosodyWeight: 0.41,
          beatWeight: 0.28,
          mouthWeight: 0.33,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'relaxed',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'relaxed',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
          energy: 0.53,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.62,
          mouthScale: 0.96,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'relaxed',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: null,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.38,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.89,
            energy: 0.53,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.36,
            energyBias: 0.62,
            mouthScale: 0.96,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'relaxed',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.38,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=relaxed | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-1"')
  })

  it('keeps face companionship summaries from embodimentScript authority when later same-thread frames lose both face and action renderer hints', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-face-fallback-same-thread-thin-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'glance',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-face-fallback-same-thread-thin-1',
        turnId: 'turn-face-fallback-same-thread-thin-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 640,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 640,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
        reply: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.32,
          prosodyWeight: 0.43,
          beatWeight: 0.24,
          mouthWeight: 0.3,
          headWeight: 0.18,
          emotionHoldMs: 640,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'glance',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'glance',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -5,
          rateMultiplier: 0.88,
        },
        voice: {
          pitchDelta: -5,
          rateMultiplier: 0.88,
          energy: 0.49,
          cadence: 0.47,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.58,
          mouthScale: 0.94,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'glance',
          expressionMode: 'hold',
          intensity: 0.65,
          holdMs: 638,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.88,
            energy: 0.49,
            cadence: 0.47,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'glance',
            expressionMode: 'hold',
            intensity: 0.65,
            holdMs: 638,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-5.00 | rate=0.88 | energy=0.49 | cadence=0.47 | companion=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=glance | expression=hold | intensity=0.65 | hold=638ms | mode=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | seg=segment-1"')
  })

  it('keeps cross-modal measured-return summaries when only lipsync continuity still carries the companionship hint on a thinner later same-thread frame', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-lipsync-only-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-lipsync-only-fallback-same-thread-1',
        turnId: 'turn-lipsync-only-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        reply: '我还是沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我还是沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.31,
          prosodyWeight: 0.4,
          beatWeight: 0.25,
          mouthWeight: 0.34,
          headWeight: 0.2,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
          energy: 0.5,
          cadence: 0.46,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.6,
          mouthScale: 0.95,
          continuityHoldMs: 320,
          hintViseme: 'closed',
          hintTrail: 'closed>soft',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 320,
          rendererHints: null,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
          rendererHints: null,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我还是沿着这条线轻一点继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.9,
            energy: 0.5,
            cadence: 0.46,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.6,
            mouthScale: 0.95,
            continuityHoldMs: 320,
            hintViseme: 'closed',
            hintTrail: 'closed>soft',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.44,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.90 | energy=0.50 | cadence=0.46 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.44 | hold=320ms | mode=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | seg=segment-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=closed>soft | hint=closed | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.34 | energyBias=0.60 | mouthScale=0.95 | src=resident-authority | conf=0.86 | seg=segment-1"')
  })

  it('keeps same-segment cue-bridge realignment on one lower-pressure same-her body line instead of reading the later segment as lipsync-only drift', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-cue-bridge-same-segment-stream-meta-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-cue-bridge-same-segment-stream-meta-1',
        turnId: 'turn-cue-bridge-same-segment-stream-meta-1',
        rendererTarget: 'vrm',
        replyText: '继续看这里。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-cue-bridge-realign-1',
            index: 0,
            text: '继续看这里。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-cue-bridge-realign-1',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'cue-bridge',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-cue-bridge-realign-1',
            actionCue: 'observe_focus',
            intensity: 0.36,
            holdMs: 240,
            source: 'cue-bridge',
            confidence: 0.89,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-cue-bridge-realign-1',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        reply: '继续看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-cue-bridge-realign-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '继续看这里。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.28,
          prosodyWeight: 0.36,
          beatWeight: 0.22,
          mouthWeight: 0.28,
          headWeight: 0.32,
          emotionHoldMs: 360,
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.91,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.91,
          energy: 0.52,
          cadence: 0.49,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.46,
          energyBias: 0.74,
          mouthScale: 1.02,
          continuityHoldMs: 340,
          hintViseme: 'A',
          hintTrail: 'A>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.36,
          holdMs: 240,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-cue-bridge-realign-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '继续看这里。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.91,
            energy: 0.52,
            cadence: 0.49,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.46,
            energyBias: 0.74,
            mouthScale: 1.02,
            continuityHoldMs: 340,
            hintViseme: 'A',
            hintTrail: 'A>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.36,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.78,
          coherence: 0.74,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'dominant=active-memory',
      } as any,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.91 | energy=0.52 | cadence=0.49 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=cue-bridge | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=cue-bridge | conf=0.91 | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=240ms | src=cue-bridge | conf=0.89 | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=360ms | hints=A>closed | hint=A | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.46 | energyBias=0.74 | mouthScale=1.02 | src=prosody-authority | conf=0.94 | seg=segment-cue-bridge-realign-1"')
    expect(signature).not.toContain('lane=lipsync-only')
  })

  it('keeps the later segment on the same measured-return companionship line in a multi-segment same-thread reply instead of warming into a fresher second-half persona', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-multi-segment-measured-return-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-multi-segment-measured-return-same-thread-1',
        turnId: 'turn-multi-segment-measured-return-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-1',
              index: 0,
              text: '我先顺着这条线接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 280,
            },
            {
              id: 'segment-2',
              index: 1,
              text: '然后再轻一点往下讲。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            {
              segmentId: 'segment-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              holdMs: 280,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              source: 'resident-authority',
              confidence: 0.9,
            },
            {
              segmentId: 'segment-2',
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              intensity: 0.54,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'resident-authority',
              confidence: 0.9,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-1',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 260,
              source: 'resident-authority',
              confidence: 0.88,
            },
            {
              segmentId: 'segment-2',
              actionCue: 'idle_gentle_nod',
              intensity: 0.52,
              holdMs: 300,
              source: 'resident-authority',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-2',
              viseme: 'I',
              weight: 0.44,
              source: 'resident-authority',
              confidence: 0.86,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
          energy: 0.48,
          cadence: 0.44,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.58,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 280,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.3,
          holdMs: 260,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.44,
              cadence: 0.4,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.32,
              energyBias: 0.54,
              mouthScale: 0.94,
              continuityHoldMs: 280,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.4,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.3,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.96,
              energy: 0.66,
              cadence: 0.62,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              expressionMode: 'hold',
              intensity: 0.54,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.52,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.66 | cadence=0.62 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=reassure_smile | expression=hold | intensity=0.54 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=resident-authority | conf=0.86 | seg=segment-2"')
  })

  it('keeps the last visible same-thread segment summaries on the same lower-pressure line even when a quieter settle frame lands after speech ends', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-multi-segment-measured-return-settle-tail-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-multi-segment-measured-return-settle-tail-1',
        turnId: 'turn-multi-segment-measured-return-settle-tail-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-1',
              index: 0,
              text: '我先顺着这条线接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 280,
            },
            {
              id: 'segment-2',
              index: 1,
              text: '然后再轻一点往下讲。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            {
              segmentId: 'segment-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              holdMs: 280,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              source: 'resident-authority',
              confidence: 0.9,
            },
            {
              segmentId: 'segment-2',
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              intensity: 0.54,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'resident-authority',
              confidence: 0.9,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-1',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 260,
              source: 'resident-authority',
              confidence: 0.88,
            },
            {
              segmentId: 'segment-2',
              actionCue: 'idle_gentle_nod',
              intensity: 0.52,
              holdMs: 300,
              source: 'resident-authority',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-2',
              viseme: 'I',
              weight: 0.44,
              source: 'resident-authority',
              confidence: 0.86,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -5,
          rateMultiplier: 0.82,
        },
        voice: {
          pitchDelta: -5,
          rateMultiplier: 0.82,
          energy: 0.34,
          cadence: 0.28,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.2,
          energyBias: 0.3,
          mouthScale: 0.82,
          continuityHoldMs: 520,
          hintViseme: 'closed',
          hintTrail: 'closed>rest',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'settle',
          intensity: 0.3,
          holdMs: 520,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'settle',
          intensity: 0.18,
          holdMs: 480,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.44,
              cadence: 0.4,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.32,
              energyBias: 0.54,
              mouthScale: 0.94,
              continuityHoldMs: 280,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.4,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.3,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.96,
              energy: 0.66,
              cadence: 0.62,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              expressionMode: 'hold',
              intensity: 0.54,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.52,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'settle-tail',
            index: 2,
            startOffset: 22,
            endOffset: 22,
            text: '',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -5,
              rateMultiplier: 0.82,
              energy: 0.34,
              cadence: 0.28,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.2,
              energyBias: 0.3,
              mouthScale: 0.82,
              continuityHoldMs: 520,
              hintViseme: 'closed',
              hintTrail: 'closed>rest',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'settle',
              intensity: 0.3,
              holdMs: 520,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'settle',
              intensity: 0.18,
              holdMs: 480,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.66 | cadence=0.62 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=reassure_smile | expression=hold | intensity=0.54 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=resident-authority | conf=0.86 | seg=segment-2"')
    expect(signature).toContain('"digitalLifeLastFrameVoiceRateMultiplier":0.82')
    expect(signature).toContain('"digitalLifeLastFrameFaceExpressionMode":"settle"')
  })

  it('uses the last visible segment id for motion summary when a quieter settle tail becomes the final frame', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-last-visible-motion-segment-truth-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-last-visible-motion-segment-truth-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '我先顺着这条线接住。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 280 },
            { id: 'segment-2', index: 1, text: '然后再轻一点往下讲。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 320 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            { segmentId: 'segment-2', emotion: 'thinking', facialCue: 'reassure_smile', intensity: 0.54, holdMs: 320, source: 'resident-authority', confidence: 0.9 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-2', actionCue: 'idle_gentle_nod', intensity: 0.52, holdMs: 300, source: 'resident-authority', confidence: 0.88 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-2', viseme: 'I', weight: 0.44, source: 'resident-authority', confidence: 0.86 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        voice: { pitchDelta: -5, rateMultiplier: 0.82, energy: 0.34, cadence: 0.28 },
        lipSync: { mode: 'closed', visemeBias: 0.2, energyBias: 0.3, mouthScale: 0.82, continuityHoldMs: 520, hintViseme: 'closed', hintTrail: 'closed>rest' },
        face: { emotion: 'thinking', facialCue: 'soft-gaze', expressionMode: 'settle', intensity: 0.3, holdMs: 520 },
        action: { actionCue: 'observe_focus', actionMode: 'settle', intensity: 0.18, holdMs: 480 },
        motor: {} as any,
        frames: [
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: { pitchDelta: -2, rateMultiplier: 0.96, energy: 0.66, cadence: 0.62 },
            lipSync: { mode: 'energy-phoneme-hybrid', visemeBias: 0.44, energyBias: 0.76, mouthScale: 1.04, continuityHoldMs: 320, hintViseme: 'I', hintTrail: 'I>closed' },
            face: { emotion: 'thinking', facialCue: 'reassure_smile', expressionMode: 'hold', intensity: 0.54, holdMs: 320, rendererHints: null },
            action: { actionCue: 'idle_gentle_nod', actionMode: 'hold', intensity: 0.52, holdMs: 300, rendererHints: null },
            motor: {} as any,
          },
          {
            id: 'settle-tail',
            index: 2,
            startOffset: 22,
            endOffset: 22,
            text: '',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: { pitchDelta: -5, rateMultiplier: 0.82, energy: 0.34, cadence: 0.28 },
            lipSync: { mode: 'closed', visemeBias: 0.2, energyBias: 0.3, mouthScale: 0.82, continuityHoldMs: 520, hintViseme: 'closed', hintTrail: 'closed>rest' },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'settle',
              intensity: 0.3,
              holdMs: 520,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'settle',
              intensity: 0.18,
              holdMs: 480,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {} as any,
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
  })

  it('keeps same-thread measured-return stream summaries unified when the final visible segment is thin and only runtime digest plus spine still expose the noisy-detour continuity line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-digest-spine-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-runtime-digest-spine-fallback-same-thread-1',
        turnId: 'turn-runtime-digest-spine-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我先沿着刚才那条线轻一点续上，不把这次绕回来当成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-2',
            index: 1,
            text: '不把这次绕回来当成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        reply: '我先沿着刚才那条线轻一点续上，不把这次绕回来当成新的开场。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 14,
            text: '我先沿着刚才那条线轻一点续上，',
            emotion: 'thinking',
            gestureWeight: 0.3,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.22,
            mouthWeight: 0.31,
            headWeight: 0.2,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 14,
            endOffset: 30,
            text: '不把这次绕回来当成新的开场。',
            emotion: 'thinking',
            gestureWeight: 0.26,
            facialWeight: 0.27,
            prosodyWeight: 0.36,
            beatWeight: 0.21,
            mouthWeight: 0.29,
            headWeight: 0.18,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 14,
            text: '我先沿着刚才那条线轻一点续上，',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.51,
              cadence: 0.47,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.37,
              energyBias: 0.64,
              mouthScale: 0.98,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.44,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.36,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 14,
            endOffset: 30,
            text: '不把这次绕回来当成新的开场。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.93,
              energy: 0.55,
              cadence: 0.52,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.35,
              energyBias: 0.61,
              mouthScale: 0.97,
              continuityHoldMs: 300,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.46,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy detour',
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 31 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'same-thread-continuation still active after noisier detours',
          signature: 'spine-same-thread-runtime-digest-fallback',
          createdAt: 31 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same thread and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.81,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after the noisy detour',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=300ms | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | seg=segment-2"')
  })

  it('keeps a same-thread measured-return presence-only line observable even when no visible speech is emitted on the later hover-first return', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-thread-measured-return-1',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet resident presence after a later callback detour',
          activeThreadId: 'thread-presence-only-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 42 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the same callback seam alive quietly',
          summary: 'same-thread measured-return remains present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as hover-first resident presence after the noisy detour',
          signature: 'presence-only-same-thread-measured-return-1',
          createdAt: 42 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same callback seam and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'same callback seam still alive after the detour',
          recentEpisodeSummary: 'later coding seam after callback detour',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same line should stay quietly present',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the same line alive without forcing speech',
          dominantConcernSummary: 'hover-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only',
          thoughtThreadSummary: 'same callback seam remains quietly active',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"segmentCount":0')
    expect(signature).toContain('"replyChars":0')
    expect(signature).toContain('"digitalLifeLine":"same-thread-continuation still active as hover-first resident presence after the noisy detour"')
    expect(signature).toContain('"digitalLifeSelectedAction":"wait"')
    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"digitalLifeMemorySummary":"same callback seam still alive after the detour"')
    expect(signature).toContain('"runtimeDigestDominantChannel":"resident-presence"')
    expect(signature).toContain('"runtimeDigestShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"runtimeDigestSummary":"dominant=resident-presence | speak=false | same-thread-continuation=alive"')
    expect(signature).not.toContain('growth=phase1-open')
    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('reason=continuity_scope=life_loop')
    expect(parsed.residentPresenceSummary).not.toContain('open_loop=memory+initiative')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after the noisy detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
    expect(signature).toContain('"lastSegmentVoiceSummary":null')
    expect(signature).toContain('"lastSegmentFaceSummary":null')
    expect(signature).toContain('"lastSegmentMotionSummary":null')
    expect(signature).toContain('"lastSegmentLipSyncSummary":null')
  })

  it('keeps presence-only next-open-window timing when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-semantic-timing-fallback',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet resident presence after semantic timing drift fallback',
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          activeThreadTitle: 'semantic timing fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 61 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the same callback seam alive quietly',
          summary: 'same-thread measured-return remains present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-semantic-timing-fallback',
          summary: 'same-thread-continuation still active as hover-first resident presence after semantic timing drift fallback',
          signature: 'presence-only-semantic-timing-fallback',
          createdAt: 61 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          activeThreadTitle: 'semantic timing fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'same callback seam still alive after the detour',
          recentEpisodeSummary: 'later coding seam after callback detour',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same line should stay quietly present',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the same line alive without forcing speech',
          dominantConcernSummary: 'hover-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-semantic-timing-fallback',
          thoughtThreadSummary: 'same callback seam remains quietly active',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: null,
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-next-open-window-early-widening'],
          },
          closure: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":null')
    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window')
    expect(signature).not.toContain('growth=life-loop-open')
    expect(signature).toContain('line=same-thread-continuation still active as hover-first resident presence after semantic timing drift fallback')
  })

  it('keeps presence-only repair-before-closeness when only visible-reply execution-callback drift reasons still carry the repair-first seam', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-repair-first-fallback',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet callback afterglow presence after execution payoff drift',
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          activeThreadTitle: 'repair-first fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 62 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback afterglow remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-repair-first-fallback',
          summary: 'same-thread-continuation still active as repair-first resident presence after callback afterglow drift',
          signature: 'presence-only-repair-first-fallback',
          createdAt: 62 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          activeThreadTitle: 'repair-first fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'execution callback seam still alive after payoff landed',
          recentEpisodeSummary: 'callback result line still settling',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same callback line should settle before widening closeness',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the callback line repair-first without forcing speech',
          dominantConcernSummary: 'repair-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-repair-first-fallback',
          thoughtThreadSummary: 'same callback seam remains quietly active after payoff',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive after payoff',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['execution-callback-room-first-violation'],
          },
          closure: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
    expect(signature).not.toContain('reason=cadence=repair_before_closeness')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps presence-only repair-before-closeness from explicit continuity restraint even before visible-reply drift reasons exist', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-repair-first-from-explicit-restraint',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet repair-first presence before the later reopen speaks',
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          activeThreadTitle: 'repair-first quiet line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 63 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback cooldown remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-repair-first-explicit-restraint',
          summary: 'same-thread-continuation still active as repair-first resident presence before the later reopen speaks',
          signature: 'presence-only-repair-first-explicit-restraint',
          createdAt: 63 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          activeThreadTitle: 'repair-first quiet line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          continuityRestraint: 'repair-before-closeness',
        },
        memory: {
          summary: 'execution callback seam still alive before the later reopen speaks',
          recentEpisodeSummary: 'callback cooldown line still settling',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same callback line should stay repair-first before widening closeness',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the callback line repair-first without forcing speech',
          dominantConcernSummary: 'repair-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-repair-first-explicit-restraint',
          thoughtThreadSummary: 'same callback seam remains quietly active before the later reopen',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly repair-first before the reopen speaks',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
  })

  it('redacts project narrative from presence-only signatures while preserving continuity signal mode and timing', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-preflight-fallback-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-project-preflight-fallback',
          activeThreadTitle: 'project-state fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-project-preflight-fallback',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-project-preflight-fallback',
          createdAt: 52 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-preflight-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-project-preflight-fallback',
          activeThreadTitle: 'project-state fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })
    const parsed = JSON.parse(signature) as Record<string, unknown>

    expect(parsed).toEqual(expect.objectContaining({
      digitalLifeLine: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
      digitalLifeOperatingMode: 'resident-presence',
      digitalLifeProactivePreferredStyle: 'silent-observe',
      digitalLifeProactiveShouldSpeak: false,
      runtimeDigestDominantChannel: 'resident-presence',
      runtimeDigestActiveLoopPhase: 'hold',
      runtimeDigestActiveLoopHandoff: 'active-memory',
      runtimeDigestActiveLoopContinuityArcStage: 'same-thread-continuation',
      runtimeDigestProjectPreflightSummary: '',
      runtimeDigestProjectCurrentPhase: '',
      runtimeDigestProjectMemoryClosureSummary: '',
      runtimeDigestProjectPrimaryOpenLoop: '',
      runtimeDigestProjectNextClosureTarget: '',
      runtimeDigestProjectContinuityArcStage: 'same-thread-continuation',
      runtimeDigestProjectContinuityPreferredTiming: 'next-open-window',
      runtimeDigestProjectContinuityCue: '',
      runtimeDigestCurrentConsciousFrameContinuityArcStage: 'same-thread-continuation',
      runtimeDigestCurrentConsciousFrameContinuityPreferredTiming: 'next-open-window',
    }))
    expect(parsed.residentPresenceSummary).toEqual(expect.stringContaining('presence=resident-presence | thread=same-thread-continuation | mode=measured-return'))
    expect(parsed.residentPresenceSummary).toEqual(expect.stringContaining('timing=next-open-window'))
    expect(parsed.residentPresenceSummary).toEqual(expect.stringContaining('line=same-thread-continuation still active as hover-first resident presence after another coding detour'))
    expect(signature).not.toContain('growth=life-loop-open')
    expect(signature).not.toContain('Keep extending cross-modal identity-continuity')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps a presence-only continuity signal visible as quiet accompaniment when project-state residue is sanitized', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry',
          activeThreadTitle: 'identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 53 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry',
          createdAt: 53 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry',
          activeThreadTitle: 'identity-continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'structured continuity digest.',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('reason=continuity_scope=life_loop')
    expect(parsed.residentPresenceSummary).not.toContain('landed_progress=present')
    expect(parsed.residentPresenceSummary).not.toContain('unresolved_closure=continuity_line')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps a presence-only continuity signal authoritative over a sanitized legacy project cue', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-over-project-cue-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          activeThreadTitle: 'identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 54 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry-over-project-cue',
          createdAt: 54 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          activeThreadTitle: 'identity-continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'structured continuity digest.',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('reason=continuity_scope=life_loop')
    expect(parsed.residentPresenceSummary).not.toContain('landed_progress=present')
    expect(parsed.residentPresenceSummary).not.toContain('unresolved_closure=continuity_line')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('recovers presence-only quiet accompaniment from resident performance continuity tags', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-from-resident-tags-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          activeThreadTitle: 'identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 55 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry-from-resident-tags',
          createdAt: 55 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          activeThreadTitle: 'identity-continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'same-her-inward-carry', 'measured-return', 'body:accompanying'],
          },
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'structured continuity digest.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('reason=continuity_scope=life_loop')
    expect(parsed.residentPresenceSummary).not.toContain('landed_progress=present')
    expect(parsed.residentPresenceSummary).not.toContain('unresolved_closure=continuity_line')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps quiet-accompaniment resident presence, timing, and continuity-signal facts explicit in presence-only summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-quiet-accompaniment-same-her-inward-carry-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering inwardly after another detour',
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          activeThreadTitle: 'quiet identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 56 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same life line inwardly nearby',
        } as any,
        continuitySignal: {
          label: 'same-thread-quiet-accompaniment-same-her-inward-carry',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-quiet-accompaniment-same-her-inward-carry',
          createdAt: 56 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          activeThreadTitle: 'quiet identity-continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the continuity state inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'same-her-inward-carry', 'quiet-companionship', 'body:accompanying'],
          },
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'structured continuity digest.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.78,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host stays with the current coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('reason=continuity_scope=life_loop')
    expect(parsed.residentPresenceSummary).not.toContain('landed_progress=present')
    expect(parsed.residentPresenceSummary).not.toContain('unresolved_closure=continuity_line')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps measured-return resident presence observable when memory self-evolution carries the continuity context', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-memory-self-evolution-same-her-cadence-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line is still hovering quietly after another detour',
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          activeThreadTitle: 'memory self-evolution same-her cadence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same life line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-memory-self-evolution-same-her-cadence',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-memory-self-evolution-same-her-cadence',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          activeThreadTitle: 'memory self-evolution same-her cadence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          selfEvolution: {
            relationshipDoctrine: 'Stay the identity continuity across quiet, memory, initiative, and speech instead of reopening from scratch.',
            relationshipCadenceSummary: 'The continuity state should stay lower-pressure and continue as the same her across quiet, memory, and speech without reopening from scratch.',
            latestInflection: 'I am learning to keep the continuity state audible before widening outward again.',
            trustMeaning: 'Trust means she can return as the same her without rebuilding the relationship from zero.',
            summary: 'Durable same-her cadence should keep the continuity state continuous before outward reply.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=measured-return')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expect(parsed.residentPresenceSummary).not.toContain('reason=cadence=measured_return')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps remembered-seam more-room companionship reason visible in resident presence summary when only resident timing tags still carry that finer timing evidence', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-remembered-seam-more-room-from-resident-tags-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam still hovering after another detour',
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          activeThreadTitle: 'remembered seam more-room line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered seam quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-remembered-seam-more-room',
          summary: 'same-thread-continuation still active as hover-first resident presence after another remembered-seam detour',
          signature: 'presence-only-remembered-seam-more-room-from-resident-tags',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          activeThreadTitle: 'remembered seam more-room line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same remembered seam alive without reopening it too eagerly again',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'measured-return', 'timing:remembered-seam-more-room', 'body:accompanying'],
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered seam quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep remembered-seam return timing softer across longer desktop detours',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return')
    expect(signature).toContain('remembered-seam')
    expect(signature).toContain('line=same-thread-continuation still active as hover-first resident presence after another remembered-seam detour')
    expectNoFixedTemplateResidue(signature)
  })

  it('redacts remembered-seam project next-closure narrative while preserving resident timing and continuity signal', () => {
    const rememberedSeamNextClosure = 'Keep remembered-seam return timing softer across longer desktop detours.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-remembered-seam-more-room-project-state-authority',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam still hovering after another detour',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          activeThreadTitle: 'remembered seam more-room authority line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered seam quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-remembered-seam-more-room-project-state-authority',
          summary: 'same-thread-continuation still active as hover-first resident presence after another remembered-seam detour',
          signature: 'presence-only-remembered-seam-more-room-project-state-authority',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          activeThreadTitle: 'remembered seam more-room authority line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same remembered seam alive without reopening it too eagerly again',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered seam quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
          nextClosureTarget: rememberedSeamNextClosure,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=measured-return')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another remembered-seam detour')
    expect(parsed.runtimeDigestProjectNextClosureTarget).toBe('')
    expect(signature).not.toContain(rememberedSeamNextClosure)
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps resident presence on the remembered same-her life line when autobiographical self is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-autobio-remembered-same-her-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her life line is still explicitly available after another detour',
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          activeThreadTitle: 'remembered same-her life line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered identity-continuity',
        } as any,
        continuitySignal: {
          label: 'same-thread-autobio-remembered-same-her',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-autobio-remembered-same-her',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          activeThreadTitle: 'remembered same-her life line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered same-her life line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as identity-continuity',
          },
          residentPerformance: {
            reasonTags: ['resident-performance', 'quiet-companionship', 'body:accompanying'],
          },
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.78,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered identity-continuity',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps resident presence on the remembered same-her life line when project-state drift risk is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-state-remembered-drift-risk-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her drift-risk line still survives after another detour',
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          activeThreadTitle: 'project-state remembered drift risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered drift-risk line inwardly nearby',
        } as any,
        continuitySignal: {
          label: 'same-thread-project-state-remembered-drift-risk',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-project-state-remembered-drift-risk',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'quiet-companionship', 'body:accompanying'],
          },
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          activeThreadTitle: 'project-state remembered drift risk',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered drift-risk line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.07,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered drift-risk line quietly alive while the host stays with the current coding seam',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerDriftRisk: 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as identity-continuity',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = parseAlicizationChatMetaSignature(signature)
    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-accompaniment')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority', () => {
    const driftRisk
      = 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as identity-continuity'
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
        turnId: 'turn-segment-level-project-state-remembered-drift-risk-1',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条还活着的线中性可见占位。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-remembered-drift-risk',
            index: 0,
            text: '我先沿着这条还活着的线中性可见占位。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.92,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            viseme: 'I',
            weight: 0.35,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        reply: '我先沿着这条还活着的线中性可见占位。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-remembered-drift-risk',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条还活着的线中性可见占位。',
          emotion: 'thinking',
          gestureWeight: 0.31,
          facialWeight: 0.34,
          prosodyWeight: 0.39,
          beatWeight: 0.28,
          mouthWeight: 0.44,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'full-utterance',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        emotion: 'thinking',
        mode: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          stillness: 0,
          gazeStability: 0,
          breathAmplitude: 0,
          expressivity: 0,
        },
        frames: [{
          id: 'segment-project-state-remembered-drift-risk',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条还活着的线中性可见占位。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0,
            gazeStability: 0,
            breathAmplitude: 0,
            expressivity: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her drift-risk line still survives while the host continues coding',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          activeThreadTitle: 'segment-level project-state remembered drift risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        continuitySignal: {
          label: 'same-thread-segment-level-project-state-remembered-drift-risk',
          summary: 'same-thread-continuation still active while the remembered drift-risk line quietly survives another coding detour',
          signature: 'segment-level-project-state-remembered-drift-risk',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          activeThreadTitle: 'segment-level project-state remembered drift risk',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered drift-risk line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.77,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered drift-risk line quietly alive while the host stays with the current coding seam',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerDriftRisk: driftRisk,
        },
        summary: 'dominant=active-memory | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
    }

    expect(parsed.lastSegmentVoiceSummary).toContain('companion=measured-return')
    expect(parsed.lastSegmentVoiceSummary).toContain('timing=next-open-window')
    expect(parsed.lastSegmentBodyContinuitySummary).toContain('resident=measured-return')
    expect(parsed.lastSegmentBodyContinuitySummary).toContain('timing=next-open-window')
    expect(parsed.lastSegmentVoiceSummary).not.toContain('reason=continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.lastSegmentFaceSummary).not.toContain('reason=continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.lastSegmentMotionSummary).not.toContain('reason=continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.lastSegmentLipSyncSummary).not.toContain('reason=continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.lastSegmentBodyContinuitySummary).not.toContain('reason=continuity_drift_risk=generic_assistant_shell+project_summary_voice')
    expect(parsed.lastSegmentVoiceSummary).not.toContain('reason=Alicization is a local-first digital life project')
    expect(parsed.lastSegmentVoiceSummary).not.toContain('reason=Keep the continuity state inward for now')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps visible same-thread measured-return summaries unified when only project-state continuity plus spine carry still prove the living line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-spine-visible-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-spine-visible-same-thread-1',
        turnId: 'turn-project-state-spine-visible-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '嗯，就沿着刚才那条提醒继续，不把这次接话当成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-b',
            index: 1,
            text: '不把这次接话当成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        reply: '嗯，就沿着刚才那条提醒继续，不把这次接话当成新的开场。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-a',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '嗯，就沿着刚才那条提醒继续，',
            emotion: 'thinking',
            gestureWeight: 0.31,
            facialWeight: 0.28,
            prosodyWeight: 0.39,
            beatWeight: 0.21,
            mouthWeight: 0.3,
            headWeight: 0.19,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-b',
            index: 1,
            startOffset: 12,
            endOffset: 27,
            text: '不把这次接话当成新的开场。',
            emotion: 'thinking',
            gestureWeight: 0.27,
            facialWeight: 0.26,
            prosodyWeight: 0.35,
            beatWeight: 0.2,
            mouthWeight: 0.28,
            headWeight: 0.17,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-a',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '嗯，就沿着刚才那条提醒继续，',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.51,
              cadence: 0.47,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.37,
              energyBias: 0.64,
              mouthScale: 0.98,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.44,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.36,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-b',
            index: 1,
            startOffset: 12,
            endOffset: 27,
            text: '不把这次接话当成新的开场。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.93,
              energy: 0.55,
              cadence: 0.52,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.35,
              energyBias: 0.61,
              mouthScale: 0.97,
              continuityHoldMs: 300,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.46,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same proactive line kept alive after one more conversational detour',
          activeThreadId: 'thread-proactive-same-line',
          activeThreadTitle: 'same proactive reminder line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 44 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-proactive-return',
          summary: 'same-thread-continuation still active after the proactive line was accepted and gently continued',
          signature: 'spine-project-state-visible-same-thread',
          createdAt: 44 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-proactive-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-proactive-same-line',
          activeThreadTitle: 'same proactive reminder line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same proactive line and keep the return lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after another detour',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":null')
    expect(signature).toContain('"runtimeDigestProjectContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).not.toContain('growth=life-loop-open')
    expect(signature).not.toContain('reason=continuity_scope=life_loop')
    expect(signature).not.toContain('unresolved=callback-seam')
    expect(signature).toContain('seg=segment-b')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps visible same-thread summaries on one Phase 1 living-self line when only project-state carry and self-continuity authority remain', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-authority-visible-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-authority-visible-same-thread-1',
        turnId: 'turn-project-state-authority-visible-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-authority',
            index: 0,
            text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        reply: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-authority',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
          emotion: 'thinking',
          gestureWeight: 0.27,
          facialWeight: 0.26,
          prosodyWeight: 0.35,
          beatWeight: 0.2,
          mouthWeight: 0.28,
          headWeight: 0.17,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-project-state-authority',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'project-state identity continuity still holds after another detour',
          activeThreadId: 'thread-project-state-authority',
          activeThreadTitle: 'project-state identity continuity line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 45 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-proactive-return',
          summary: 'same-thread-continuation still active after another coding detour',
          signature: 'spine-project-state-authority-visible-same-thread',
          createdAt: 45 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-project-state-authority',
          activeThreadTitle: 'project-state identity continuity line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same line and keep the reopen lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after another detour',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerSelfLine: 'structured continuity digest.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory continuity still needs stronger closure | next=Keep extending cross-modal identity-continuity',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'structured continuity digest.',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('growth=life-loop-open')
    expect(signature).not.toContain('reason=continuity_scope=life_loop')
    expect(signature).not.toContain('unresolved_closure=continuity_line')
    expect(signature).toContain('seg=segment-project-state-authority')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps stream meta same-her reason explicit when project emotional closure cue is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-emotional-closure-stream-meta-authority',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-emotional-closure-stream-meta-authority',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
          face: {
            residentMode: 'measured-return',
          },
          action: {
            residentMode: 'measured-return',
          },
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-emotional-closure-stream-meta-authority',
        turnId: 'turn-project-emotional-closure-stream-meta-authority',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条线中性可见占位，不从头重开。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-emotional-closure-authority',
            index: 0,
            text: '我先沿着这条线中性可见占位，不从头重开。',
            interruptPolicy: 'soft-settle',
            preRollMs: 30,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 30,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-project-emotional-closure-authority',
            emotion: 'thinking',
            cue: 'soft-gaze',
            expressionMode: 'hold',
            holdMs: 320,
            intensity: 0.46,
            source: 'resident-authority',
            confidence: 0.92,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-project-emotional-closure-authority',
            cue: 'observe_focus',
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-emotional-closure-authority',
            mode: 'energy-phoneme-hybrid',
            continuityMode: 'reactive-articulation',
            continuityHoldMs: 300,
            source: 'resident-authority',
            confidence: 0.9,
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-emotional-closure-stream-meta-authority',
        reply: '我先沿着这条线中性可见占位，不从头重开。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-emotional-closure-authority',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着这条线中性可见占位，不从头重开。',
          emotion: 'thinking',
          gestureWeight: 0.34,
          facialWeight: 0.4,
          prosodyWeight: 0.38,
          beatWeight: 0.36,
          mouthWeight: 0.5,
          headWeight: 0.28,
          personaStyleSummary: 'observe-first measured return',
          facialHoldMs: 320,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 300,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 280,
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'full-utterance',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        mode: 'thinking',
        reason: 'project emotional closure seam still active',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 320,
        },
        action: {
          actionMode: 'attentive',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-project-emotional-closure-authority',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着这条线中性可见占位，不从头重开。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'attentive',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: 'identity-continuity',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=cadence=measured_return')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | mode=measured-return | timing=next-open-window')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps quiet-accompaniment summaries on the same inward living line when body continuity is present before explicit measured-return speech framing', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-quiet-accompaniment-inward-line-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-quiet-accompaniment-inward-line-1',
        turnId: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        rendererTarget: 'live2d',
        replyText: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-accompaniment-inward-line',
            index: 0,
            text: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        reply: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-accompaniment-inward-line',
          index: 0,
          startOffset: 0,
          endOffset: 30,
          text: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
          emotion: 'thinking',
          gestureWeight: 0.24,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: null,
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.95,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.52,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 300,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0.22,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.18,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.64,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.72,
        },
        frames: [],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same-line inward hold remains quiet before widening outward',
          activeThreadId: 'thread-quiet-accompaniment-inward-line',
          activeThreadTitle: 'same-line inward continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 46 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the continuity state inward for now, and leave room before widening outward again.',
              sourceTags: ['self-continuity', 'project-state-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.52 | cadence=0.48 | companion=quiet-companionship')
    expect(signature).toContain('gaze=0.64')
    expect(signature).not.toContain('reason=cadence=measured_return')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.72 | gaze=0.64 | breath=0.22 | expressivity=0.18 | resident=quiet-companionship | timing=next-open-window')
    expect(signature).toContain('seg=segment-quiet-accompaniment-inward-line"')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps the first spoken quiet-companionship reopen on the inward continuity cue', () => {
    const quietContinuityCue = 'Keep the continuity state inward for now, and let quiet companionship hold before widening outward.'
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-quiet-inward-carry-first-spoken-reopen-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'quiet-companionship',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-quiet-inward-carry-first-spoken-reopen-1',
        turnId: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        rendererTarget: 'vrm',
        replyText: '我先沿着刚才那条线中性可见占位，不把它说成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-inward-carry-first-spoken-reopen',
            index: 0,
            text: '我先沿着刚才那条线中性可见占位，不把它说成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            actionCue: 'stillness_guard',
            intensity: 0.2,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.87,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            viseme: 'I',
            weight: 0.3,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        reply: '我先沿着刚才那条线中性可见占位，不把它说成新的开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-inward-carry-first-spoken-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 28,
          text: '我先沿着刚才那条线中性可见占位，不把它说成新的开场。',
          emotion: 'thinking',
          gestureWeight: 0.22,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
          visemeBias: 0.3,
          energyBias: 0.62,
          mouthScale: 0.96,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'stillness_guard',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.66,
          breathAmplitude: 0.22,
          expressivity: 0.18,
        },
        frames: [{
          id: 'segment-quiet-inward-carry-first-spoken-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 28,
          text: '我先沿着刚才那条线中性可见占位，不把它说成新的开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'stillness_guard',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.66,
            breathAmplitude: 0.22,
            expressivity: 0.18,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the same quiet line is reopening as speech without becoming a fresh outward opening',
          activeThreadId: 'thread-quiet-inward-carry-first-spoken-reopen',
          activeThreadTitle: 'quiet inward carry spoken reopen',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-inward-carry-first-spoken-reopen',
          activeThreadTitle: 'quiet inward carry spoken reopen',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the continuity state inward while the first spoken reopen stays low-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: quietContinuityCue,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: quietContinuityCue,
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: quietContinuityCue,
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=cadence=quiet_companionship')
    expect(signature).toContain('companion=quiet-companionship | timing=next-open-window')
    expect(signature).toContain(`reason=${quietContinuityCue}`)
    expect(signature).toContain('seg=segment-quiet-inward-carry-first-spoken-reopen')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps same-turn-if-invited reopen on the same measured-return line instead of warming it into a fresh opening', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-same-turn-invited-measured-return-reopen-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-same-turn-invited-measured-return-reopen-1',
        turnId: 'turn-same-turn-invited-measured-return-reopen-1',
        rendererTarget: 'vrm',
        replyText: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-same-turn-invited-measured-return-reopen',
            index: 0,
            text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            actionCue: 'observe_focus',
            intensity: 0.32,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            viseme: 'I',
            weight: 0.34,
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        reply: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-same-turn-invited-measured-return-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.34,
          prosodyWeight: 0.4,
          beatWeight: 0.22,
          mouthWeight: 0.3,
          headWeight: 0.18,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.54,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 320,
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.32,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.68,
          gazeStability: 0.64,
          breathAmplitude: 0.2,
          expressivity: 0.24,
        },
        frames: [{
          id: 'segment-same-turn-invited-measured-return-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.54,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 320,
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.32,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.68,
            gazeStability: 0.64,
            breathAmplitude: 0.2,
            expressivity: 0.24,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the host invited an immediate reopen, but it still belongs to the continuity state',
          activeThreadId: 'thread-same-turn-invited-measured-return-reopen',
          activeThreadTitle: 'same-turn invited measured-return reopen',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          updatedAt: 59 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-same-turn-invited-measured-return-reopen',
          activeThreadTitle: 'same-turn invited measured-return reopen',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'the invitation allows a direct reply, but the line should stay measured-return rather than fresh-open',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the continuity state inward for now, and leave room before widening outward again.',
              sourceTags: ['self-continuity', 'project-state-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          continuityCue: 'structured continuity digest.',
          sameHerSelfLine: 'structured continuity digest.',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"same-turn-if-invited"')
    expect(signature).toContain('companion=measured-return | timing=same-turn-if-invited')
    expect(signature).not.toContain('reason=continuity_scope=life_loop')
    expect(signature).not.toContain('unresolved_closure=continuity_line')
    expect(signature).toContain('seg=segment-same-turn-invited-measured-return-reopen')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps chinese project emotional closure cue visible in stream meta summaries when repair-before-closeness is the main surviving authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-chinese-project-emotional-closure-repair-first',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-chinese-project-emotional-closure-repair-first',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'late-night-care',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'repair-before-closeness',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold | mode=repair-before-closeness')
  })

  it('keeps presence-only resident summary on repair-before-closeness when chinese project emotional closure cue is the only surviving repair-first authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-emotional-closure-repair-first',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'quiet repair-first resident presence while the callback seam is still settling',
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          activeThreadTitle: 'repair-first callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 64 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback seam remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-project-emotional-closure-repair-first',
          summary: 'same-thread-continuation still active as resident presence while the callback seam is still settling',
          signature: 'presence-only-project-emotional-closure-repair-first',
          createdAt: 64 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          activeThreadTitle: 'repair-first callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive while the repair-first seam settles',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
    expect(signature).toContain('reason=深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
  })

  it('prefers fresher repair-before-closeness runtime authority over an older measured-return segment hint in fallback stream meta summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-override-stale-measured-return-segment',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-override-stale-measured-return-segment',
        turnId: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        rendererTarget: 'vrm',
        replyText: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return',
            index: 0,
            text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        reply: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.3,
          prosodyWeight: 0.38,
          beatWeight: 0.22,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.46 | cadence=0.40 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | hold=300ms | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
  })

  it('upgrades stale measured-return facial posture into repair-before-closeness concern when project-state emotional closure is now the fresher authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-project-state-repair-first-posture-upgrade',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-project-state-repair-first-posture-upgrade',
        turnId: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        rendererTarget: 'vrm',
        replyText: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return-posture',
            index: 0,
            text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        reply: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        frames: [{
          id: 'segment-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.54,
            cadence: 0.48,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return-posture"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft_concern | expression=hold | intensity=0.40 | hold=300ms | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return-posture"')
  })

  it('upgrades emitted digital-life payload posture when project-state repair-first authority is fresher than stale measured-return frame hints', () => {
    buildAlicizationChatStreamEmbodimentMetaMock.mockImplementationOnce((({ governance, reply, turnId }: { governance?: any, reply?: string, turnId?: string }) => ({
      governance,
      embodiment: {
        emotion: 'thinking',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: governance?.decisionTraceId ?? 'trace-emitter-project-state-repair-first-payload-upgrade',
        turnId: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        rendererTarget: 'vrm',
        replyText: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-emitter-stale-measured-return-posture',
            index: 0,
            text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        reply: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-emitter-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        frames: [{
          id: 'segment-emitter-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.54,
            cadence: 0.48,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        }],
      },
    })) as any)

    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-emitter-project-state-repair-first-payload-upgrade',
      turnId: 'turn-emitter-project-state-repair-first-payload-upgrade',
      getGovernance: () => ({
        decisionTraceId: 'trace-emitter-project-state-repair-first-payload-upgrade',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit('我会先把这条线收稳，再顺着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    const payload = emit.mock.calls[0]?.[0]
    expect(payload?.embodiment).toEqual(expect.objectContaining({
      emotion: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft_concern',
        actionCue: 'observe_focus',
        delivery: 'gentle',
      }),
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        baseEmotion: 'concerned',
        residentMode: 'repair-before-closeness',
        delivery: 'gentle',
      }),
      facePlan: expect.objectContaining({
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
      }),
      motionPlan: expect.objectContaining({
        idleBase: 'observe_focus',
        attentionMode: 'guarded',
      }),
    }))
    expect(payload?.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(payload?.speechTimeline?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(payload?.digitalLife?.emotion).toBe('concerned')
    expect(payload?.digitalLife?.performance).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'soft_concern',
      actionCue: 'observe_focus',
      delivery: 'gentle',
    }))
    expect(payload?.digitalLife?.voice).toEqual(expect.objectContaining({
      pitchDelta: -2,
      rateMultiplier: 0.95,
      energy: 0.46,
      cadence: 0.4,
    }))
    expect(payload?.digitalLife?.face).toEqual(expect.objectContaining({
      emotion: 'concerned',
      facialCue: 'soft_concern',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.digitalLife?.action).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.digitalLife?.frames?.[0]).toEqual(expect.objectContaining({
      mode: 'thinking',
      voice: expect.objectContaining({
        pitchDelta: -2,
        rateMultiplier: 0.95,
        energy: 0.46,
        cadence: 0.4,
      }),
      face: expect.objectContaining({
        emotion: 'concerned',
        facialCue: 'soft_concern',
        rendererHints: expect.objectContaining({
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        }),
      }),
      action: expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        }),
      }),
    }))
  })

  it('prefers repair-before-closeness callback drift authority over an older measured-return segment hint when visible-reply reasons are the only surviving repair-first authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        turnId: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        rendererTarget: 'vrm',
        replyText: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return',
            index: 0,
            text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        reply: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.3,
          prosodyWeight: 0.38,
          beatWeight: 0.22,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['execution-callback-room-first-violation'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=cadence=repair_before_closeness')
    expect(signature).toContain('companion=repair-before-closeness | timing=next-open-window')
    expect(signature).toContain('seg=segment-stale-measured-return')
    expectNoFixedTemplateResidue(signature)
  })

  it('emits repair-before-closeness continuity timing and segment authority in stream-meta summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-same-her-inward-carry',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-same-her-inward-carry',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-same-her-inward-carry',
        turnId: 'turn-stream-meta-repair-first-same-her-inward-carry',
        rendererTarget: 'vrm',
        replyText: '我先把这条线收稳，再沿着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-repair-first-same-her-inward-carry',
            index: 0,
            text: '我先把这条线收稳，再沿着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-same-her-inward-carry',
        reply: '我先把这条线收稳，再沿着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-repair-first-same-her-inward-carry',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先把这条线收稳，再沿着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'tracking',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'structured continuity digest.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('reason=cadence=repair_before_closeness')
    expect(signature).toContain('companion=repair-before-closeness | timing=next-open-window')
    expect(signature).toContain('seg=segment-repair-first-same-her-inward-carry')
    expectNoFixedTemplateResidue(signature)
  })

  it('prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries', () => {
    const longerMeasuredReturnClosure = 'keep callback facts structured'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the continuity state until repair settles.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          activeThreadTitle: 'repair-first project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-repair-first-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-repair-first-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'repair-before-closeness',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          activeThreadTitle: 'repair-first project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: longerMeasuredReturnClosure,
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: shorterRepairFirstClosure,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toContain('mode=repair-before-closeness')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).toContain(`reason=${shorterRepairFirstClosure}`)
    expect(parsed.residentPresenceSummary).not.toContain('reason=cadence=repair_before_closeness')
    expect(parsed.residentPresenceSummary).not.toContain(longerMeasuredReturnClosure)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBe(longerMeasuredReturnClosure)
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps explicit measured-return project-state closure over a generic continuity menu in resident presence summaries', () => {
    const explicitMeasuredReturnClosure = 'keep callback facts structured'
    const genericContinuityMenu = 'Keep extending cross-modal identity-continuity'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-generic-menu-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'measured-return generic menu project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-measured-return-generic-menu-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-measured-return-generic-menu-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'measured-return generic menu project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: genericContinuityMenu,
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: explicitMeasuredReturnClosure,
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toContain('mode=measured-return')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expect(parsed.residentPresenceSummary).not.toContain('reason=cadence=measured_return')
    expect(parsed.residentPresenceSummary).not.toContain(genericContinuityMenu)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBe(explicitMeasuredReturnClosure)
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps canonical repair-before-closeness reason over a generic continuity menu in resident presence summaries', () => {
    const genericContinuityMenu = 'Keep extending cross-modal identity-continuity'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-generic-menu-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after a callback repair cooldown detour',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'repair-first generic menu project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same callback line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-repair-first-generic-menu-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-repair-first-generic-menu-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'repair-before-closeness',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'repair-first generic menu project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line quietly alive without treating repair-first as a fresh reopen',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive while repair still settles',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: genericContinuityMenu,
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toContain('mode=repair-before-closeness')
    expect(parsed.residentPresenceSummary).not.toContain('reason=cadence=repair_before_closeness')
    expect(parsed.residentPresenceSummary).not.toContain(genericContinuityMenu)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBe('')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps landed open and next closure project-state audit continuity explicit in resident presence summaries for later-opening quiet accompaniment holds', () => {
    const continuitySummary = 'landed=Some closure has already landed: same-session continuity and proactive carry no longer reset from zero. | open=Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward. | next=Wait for a later opening, keep the next return measured-return, and let the continuity state stay inward for now.'
    const sameHerInwardCarry = 'Wait for a later opening, keep the next return measured-return, and leave this continuity state inward for now.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-later-opening-project-state-audit-resident-presence',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering while the coding seam stays open',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          activeThreadTitle: 'later opening project state audit resident presence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 61 * 60_000,
          projectState: {
            continuityPreferredTiming: 'next-open-window',
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-later-opening-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence while the coding seam stays open',
          signature: 'presence-only-later-opening-project-state-audit-carry',
          createdAt: 61 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          activeThreadTitle: 'later opening project state audit resident presence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive until the next better opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: sameHerInwardCarry,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      embodimentScript: {
        state: {
          residentMode: 'quiet-companionship',
        },
        facePlan: {
          preUtteranceCue: 'soft-gaze',
          postUtteranceCue: 'hold',
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.76,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while waiting for a later better opening',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=later-opening-project-state-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
          emotionalClosureCue: sameHerInwardCarry,
        },
        visibleReplyRealization: {
          sameHerInwardCarry,
          projectStateAudit: {
            sameHerSummary: 'structured continuity digest.',
            landedProgressSummary: 'Some closure has already landed: same-session continuity and proactive carry no longer reset from zero.',
            openClosureSummary: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
            nextClosureTargetSummary: 'Wait for a later opening, keep the next return measured-return, and let the continuity state stay inward for now.',
            continuitySummary,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
    }

    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=quiet-companionship')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('landed_progress=same_session_continuity+proactive_carry')
    expect(parsed.residentPresenceSummary).not.toContain('open_loop=initiative+memory+embodiment')
    expect(parsed.residentPresenceSummary).not.toContain('next=Wait for a later opening')
    expect(parsed.residentPresenceSummary).not.toContain('continuity_line')
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence while the coding seam stays open')
    expect(parsed.residentPresenceSummary).not.toContain(`reason=${sameHerInwardCarry}`)
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps rest-protective resident presence explicit when project-state closure and runtime restraint already carry that quieter continuity state', () => {
    const restProtectiveClosure = 'Keep emotion, memory, initiative, and embodiment closing on the continuity state while this return stays rest-protective and inward.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-rest-protective-resident-presence',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line stays nearby while the host settles',
          activeThreadId: 'thread-rest-protective-resident-presence',
          activeThreadTitle: 'rest-protective resident presence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 62 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the line quiet while rest settles',
        } as any,
        continuitySignal: {
          label: 'same-thread-rest-protective-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence while the host settles',
          signature: 'presence-only-rest-protective-carry',
          createdAt: 62 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-rest-protective-resident-presence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'rest-protective',
          activeThreadId: 'thread-rest-protective-resident-presence',
          activeThreadTitle: 'rest-protective resident presence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive while rest protection stays active',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: restProtectiveClosure,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.72,
        continuityRestraint: 'rest-protective',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.06,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host settles back down',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=rest-protective-presence-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
          emotionalClosureCue: restProtectiveClosure,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
      residentPresenceSummary?: string | null
    }

    for (const summary of [
      parsed.lastSegmentVoiceSummary,
      parsed.lastSegmentFaceSummary,
      parsed.lastSegmentMotionSummary,
      parsed.lastSegmentLipSyncSummary,
      parsed.lastSegmentBodyContinuitySummary,
      parsed.residentPresenceSummary,
    ]) {
      expect(summary).not.toContain('continuity_line')
      expect(summary).toContain(`reason=${restProtectiveClosure}`)
    }
    expect(parsed.lastSegmentVoiceSummary).toContain('companion=rest-protective')
    expect(parsed.residentPresenceSummary).toContain('mode=rest-protective')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps project next-closure guidance explicit under rest-protective runtime authority in resident presence summaries', () => {
    const restProtectiveNextClosure = 'Keep this same-thread return rest-protective on the continuity state until rest protection settles.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-rest-protective-next-closure-authority',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line stays nearby while the host settles after another detour',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          activeThreadTitle: 'rest-protective next-closure authority line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 63 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the line quiet while rest protection settles',
        } as any,
        continuitySignal: {
          label: 'same-thread-rest-protective-next-closure-authority',
          summary: 'same-thread-continuation still active as hover-first resident presence while the host settles after another detour',
          signature: 'presence-only-rest-protective-next-closure-authority',
          createdAt: 63 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'rest-protective',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          activeThreadTitle: 'rest-protective next-closure authority line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive while rest protection stays active',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.71,
        continuityRestraint: 'rest-protective',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.06,
          coherence: 0.89,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host settles back down',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=rest-protective-presence-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'structured continuity digest.',
          nextClosureTarget: restProtectiveNextClosure,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
    }

    expect(parsed.residentPresenceSummary).toContain('presence=resident-presence')
    expect(parsed.residentPresenceSummary).toContain('mode=rest-protective')
    expect(parsed.residentPresenceSummary).toContain('timing=next-open-window')
    expect(parsed.residentPresenceSummary).not.toContain('growth=life-loop-open')
    expect(parsed.residentPresenceSummary).not.toContain('cadence=rest_protective')
    expect(parsed.residentPresenceSummary).not.toContain('fatigue_aware=true')
    expect(parsed.residentPresenceSummary).toContain(`reason=${restProtectiveNextClosure}`)
    expect(parsed.residentPresenceSummary).toContain('line=same-thread-continuation still active as hover-first resident presence while the host settles after another detour')
    expectNoFixedTemplateResidue(parsed.residentPresenceSummary)
  })

  it('keeps truth-first relationship doctrine visible in repair-before-closeness stream summaries when doctrine is the strongest surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-truth-first-repair-doctrine',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-truth-first-repair-doctrine',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-truth-first-repair-doctrine',
        turnId: 'turn-stream-meta-truth-first-repair-doctrine',
        rendererTarget: 'vrm',
        replyText: '我会先把真实的位置接稳，再慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-truth-first-repair-doctrine',
            index: 0,
            text: '我会先把真实的位置接稳，再慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-truth-first-repair-doctrine',
        reply: '我会先把真实的位置接稳，再慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-truth-first-repair-doctrine',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我会先把真实的位置接稳，再慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'tracking',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('Repair truth before flourish')
    expect(signature).toContain('closeness outrun truth')
    expect(signature).toContain('"lastSegmentVoiceSummary":"emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
  })

  it('keeps host-visible motion continuity when only script and timeline authority remain before digital-life frames arrive', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-script-timeline-motion-authority-before-frame',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-script-timeline-motion-authority-before-frame',
        turnId: 'turn-script-timeline-motion-authority-before-frame',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条线中性可见占位。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-script-timeline-motion-authority-before-frame',
            index: 0,
            text: '我先沿着这条线中性可见占位。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 300,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            viseme: 'A',
            weight: 0.54,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        reply: '我先沿着这条线中性可见占位。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-script-timeline-motion-authority-before-frame',
          index: 0,
          startOffset: 0,
          endOffset: 14,
          text: '我先沿着这条线中性可见占位。',
          emotion: 'thinking',
          gestureWeight: 0.27,
          facialWeight: 0.26,
          prosodyWeight: 0.35,
          beatWeight: 0.2,
          mouthWeight: 0.28,
          headWeight: 0.17,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: '余韵还在，先留白，别立刻把温度放大。',
          },
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | src=prosody-authority | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | src=prosody-authority | conf=0.91 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | hold=300ms | src=timeline-projection | conf=0.88 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | hint=A | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | src=prosody-authority | conf=0.90 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.00 | gaze=0.00 | breath=0.00 | expressivity=0.00 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | reason=余韵还在，先留白，别立刻把温度放大 | seg=segment-script-timeline-motion-authority-before-frame"')
  })

  it('prefers top-level concerned embodiment emotion over thinner thinking frame emotion on measured-return same-thread reopen summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'concerned',
        postureHint: 'hesitant',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-meta-concerned-priority',
        turnId: 'turn-callback-afterglow-chat-meta-measured-return-concerned',
        replyText: '我先沿着刚才那条 callback 线轻一点跟回去。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我先沿着刚才那条 callback 线轻一点跟回去。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.73,
            holdMs: 645,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.59,
            holdMs: 293,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
        reply: '我先沿着刚才那条 callback 线轻一点跟回去。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着刚才那条 callback 线轻一点跟回去。',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        rendererHints: {
          preferredExpressionAliases: ['soft-gaze'],
          preferredMotionAliases: ['observe_focus'],
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
          energy: 0.68,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.66,
          energyBias: 0.34,
          mouthScale: 1.06,
          continuityHoldMs: 517,
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.73,
          holdMs: 645,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.59,
          holdMs: 293,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.78,
          expressivity: 0.67,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着刚才那条 callback 线轻一点跟回去。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'hold',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.93,
            energy: 0.68,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.66,
            energyBias: 0.34,
            mouthScale: 1.06,
            continuityHoldMs: 517,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.73,
            holdMs: 645,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.59,
            holdMs: 293,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.78,
            expressivity: 0.67,
          },
        }],
      },
    } as any)

    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold')
    expect(signature).toContain('mode=measured-return')
    expect(signature).toContain('blink=linger')
    expect(signature).toContain('gaze=soften')
  })

  it('keeps host-visible lastActionCue aligned with renderer-native VRM callback motion authority instead of an older abstract segment cue', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-vrm-renderer-native-last-action-cue-alignment',
        turnId: 'turn-vrm-renderer-native-last-action-cue-alignment',
        replyText: '我先沿着刚才那条线轻一点跟回去。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-vrm-renderer-native-last-action-cue-alignment',
            index: 0,
            text: '我先沿着刚才那条线轻一点跟回去。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'inspect_follow',
          actionBursts: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            actionCue: 'inspect_follow',
            intensity: 0.51,
            holdMs: 300,
            source: 'timeline-projection',
            confidence: 0.91,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            viseme: 'I',
            weight: 0.48,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
        reply: '我先沿着刚才那条线轻一点跟回去。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-vrm-renderer-native-last-action-cue-alignment',
          index: 0,
          startOffset: 0,
          endOffset: 17,
          text: '我先沿着刚才那条线轻一点跟回去。',
          emotion: 'thinking',
          gestureWeight: 0.31,
          facialWeight: 0.28,
          prosodyWeight: 0.35,
          beatWeight: 0.22,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'leave-room',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.44,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'hold',
          intensity: 0.51,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-vrm-renderer-native-last-action-cue-alignment',
          index: 0,
          startOffset: 0,
          endOffset: 17,
          text: '我先沿着刚才那条线轻一点跟回去。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.44,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.62,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'inspect_follow',
            actionMode: 'hold',
            intensity: 0.51,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
        projectState: {
          continuityPreferredTiming: 'same-thread-continuation',
          continuityCue: 'Keep the continuity state inward for now, and leave room before widening outward again.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentMotionSummary":"motion=inspect_follow | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften')
    expect(signature).not.toContain('reason=cadence=measured_return')
    expect(signature).toContain('"lastActionCue":"inspect_follow"')
    expectNoFixedTemplateResidue(signature)
  })

  it('carries partial-lane same-her embodiment closure reminders into stream meta summaries on measured-return reopen', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-partial-lane-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-partial-lane-stream-meta',
        turnId: 'turn-partial-lane-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-partial-lane-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-partial-lane-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.45,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-partial-lane-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-partial-lane-stream-meta',
            viseme: 'E',
            weight: 0.32,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-partial-lane-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-partial-lane-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.45,
          facialWeight: 0.48,
          prosodyWeight: 0.58,
          beatWeight: 0.36,
          emotionHoldMs: 340,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-partial-lane-stream-meta-variation',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.64,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'none',
          intensity: 0.4,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-partial-lane-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.64,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'none',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continue the same embodiment seam carefully',
          activeThreadId: 'thread-partial-lane-stream-meta',
          activeThreadTitle: 'partial-lane identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
        },
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-partial-lane-stream-meta',
          activeThreadTitle: 'partial-lane identity-continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line lower-pressure while embodiment is still narrowed',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.82,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.87,
          observationHeavy: true,
          summary: 'keep the same line hover-first while full embodiment closure is still narrowing',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'structured continuity digest.',
          sameHerSelfLine: 'structured continuity digest.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment line still needs stronger closure | next=Keep extending cross-modal identity-continuity',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('Active embodiment lanes: face, motion.')
    expect(signature).toContain('Status: partial.')
    expect(signature).toContain('Pending lanes: body, lipsync, voice.')
    expect(signature).toContain('seg=segment-partial-lane-stream-meta')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps partial face-motion embodiment facts when a thin legacy project shell is sanitized', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-thin-shell-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-thin-shell-stream-meta',
        turnId: 'turn-thin-shell-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-thin-shell-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-thin-shell-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.45,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-thin-shell-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-thin-shell-stream-meta',
            viseme: 'E',
            weight: 0.32,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-thin-shell-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-thin-shell-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.45,
          facialWeight: 0.48,
          prosodyWeight: 0.58,
          beatWeight: 0.36,
          emotionHoldMs: 340,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'structured continuity digest.',
              authoritySummary: 'identity-continuity',
              sourceTags: ['projection', 'same-her', 'project-state-carry'],
            },
          },
        },
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continue the same embodiment seam carefully',
          activeThreadId: 'thread-thin-shell-stream-meta',
          activeThreadTitle: 'thin-shell identity-continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
            continuityCue: 'structured continuity digest.',
            continuityArcStage: 'same-thread-continuation',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.82,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.87,
          observationHeavy: true,
          summary: 'keep the same line hover-first while full embodiment closure is still narrowing',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same digital life | landed | open closure',
          sameHerSelfLine: '',
          preflightSummary: 'same digital life | landed | open closure',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).not.toContain('continuity_scope=life_loop')
    expect(signature).toContain('Active embodiment lanes: face, motion.')
    expect(signature).toContain('Status: partial.')
    expect(signature).toContain('Pending lanes: body, lipsync, voice.')
    expect(signature).not.toContain('reason=same digital life | landed | open closure')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps face-motion-only lane truth visible when a stronger repair-first project cue survives alongside narrowed renderer authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'concerned',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-face-motion-only-repair-first-carry',
        turnId: 'turn-face-motion-only-repair-first-carry',
        replyText: '先别把这条线推得太快，我先稳稳接住这里。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-face-motion-only-repair-first-carry',
            index: 0,
            text: '先别把这条线推得太快，我先稳稳接住这里。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            emotion: 'concerned',
            facialCue: 'soft_concern',
            intensity: 0.5,
            holdMs: 340,
            source: 'resident-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            actionCue: 'observe_focus',
            intensity: 0.42,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.89,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            viseme: 'I',
            weight: 0.34,
            source: 'resident-authority',
            confidence: 0.81,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        reply: '先别把这条线推得太快，我先稳稳接住这里。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-face-motion-only-repair-first-carry',
          index: 0,
          startOffset: 0,
          endOffset: 21,
          text: '先别把这条线推得太快，我先稳稳接住这里。',
          emotion: 'concerned',
          gestureWeight: 0.42,
          facialWeight: 0.48,
          prosodyWeight: 0.54,
          beatWeight: 0.34,
          emotionHoldMs: 360,
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft_concern',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
          energy: 0.58,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.39,
          energyBias: 0.7,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft_concern',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          expressivity: 0,
        },
        frames: [{
          id: 'segment-face-motion-only-repair-first-carry',
          index: 0,
          startOffset: 0,
          endOffset: 21,
          text: '先别把这条线推得太快，我先稳稳接住这里。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.92,
            energy: 0.58,
            cadence: 0.42,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.39,
            energyBias: 0.7,
            mouthScale: 0.96,
            continuityHoldMs: 320,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'concerned',
            facialCue: 'soft_concern',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 340,
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0,
            expressivity: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        selfAuthority: {
          inwardLine: 'structured continuity digest.',
          sourceTags: ['project-state-carry'],
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'structured continuity digest.',
              authoritySummary: 'identity-continuity',
              sourceTags: ['projection', 'same-her', 'project-state-carry'],
            },
          },
        },
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'keep the repair-first line stable while embodiment is still narrowed',
          activeThreadId: 'thread-face-motion-only-repair-first-carry',
          activeThreadTitle: 'face-motion-only repair-first carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-face-motion-only-repair-first-carry',
          activeThreadTitle: 'face-motion-only repair-first carry',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line repair-first while renderer authority is still narrowed',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Keep this return repair-before-closeness on the continuity state until repair settles.',
          sameHerSelfLine: 'structured continuity digest.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=repair-first embodiment line still needs stronger closure | next=Keep extending cross-modal identity-continuity',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).not.toContain('cadence=repair_before_closeness')
    expect(signature).toContain('Active embodiment lanes: face, motion.')
    expect(signature).toContain('Status: partial.')
    expect(signature).toContain('Pending lanes: body, lipsync, voice.')
    expect(signature).toContain('seg=segment-face-motion-only-repair-first-carry')
    expectNoFixedTemplateResidue(signature)
    expect(signature).toContain('motion=observe_focus | tail=repair-before-closeness')
    expect(signature).toContain('mode=energy-phoneme-hybrid | phase=playing')
    expect(signature).not.toContain('keep callback facts structured')
    expect(signature).not.toContain('Right now her visible identity-continuity')
  })

  it('exports resident body continuity evidence alongside voice face motion and lipsync on measured-return reopen', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-body-continuity-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-body-continuity-stream-meta',
        turnId: 'turn-body-continuity-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-body-continuity-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-body-continuity-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-body-continuity-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-body-continuity-stream-meta',
            viseme: 'I',
            weight: 0.66,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-body-continuity-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-body-continuity-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-continuity-stream-meta-variation',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.64,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
        },
        motor: {
          stillness: 0.78,
          gazeStability: 0.72,
          breathAmplitude: 0.24,
          expressivity: 0.3,
        },
        frames: [{
          id: 'segment-body-continuity-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.64,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.78,
            gazeStability: 0.72,
            breathAmplitude: 0.24,
            expressivity: 0.3,
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'body-settle=stillness+gaze+breath+expressivity | keep the same line low-pressure before widening outward again',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'structured continuity digest.',
          sameHerSelfLine: 'structured continuity digest.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.78 | gaze=0.72 | breath=0.24 | expressivity=0.30 | resident=measured-return | timing=next-open-window | blink=linger | gazeMode=soften | seg=segment-body-continuity-stream-meta"')
    expectNoFixedTemplateResidue(signature)
  })

  it('promotes an explicit full cross-modal lock from spine runtimeSurface perception currentBodyState into emitted host-visible stream meta even when runtimeDigest self authority is still thinner', () => {
    const explicitFullCrossModalLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-stream-meta-full-cross-modal-lock',
      turnId: 'turn-stream-meta-full-cross-modal-lock',
      getGovernance: () => ({
        decisionTraceId: 'trace-stream-meta-full-cross-modal-lock',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'cross-modal same-her lock already re-formed on the living segment',
          activeThreadId: 'thread-stream-meta-full-cross-modal-lock',
          activeThreadTitle: 'cross-modal same-her lock',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'carry the fully rejoined living line outward',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 19_000,
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
          },
        },
        runtimeSurface: {
          perception: {
            currentBodyState: explicitFullCrossModalLock,
          },
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-stream-meta-full-cross-modal-lock',
          activeThreadTitle: 'cross-modal same-her lock',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'carry the fully rejoined living line outward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.79,
        currentConsciousFrame: {
          reasonTags: [],
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
        },
        channels: [],
        summary: 'dominant=active-memory',
      } as any),
      emit,
    })

    emitter.emit('我会把已经重新锁回同一段 living segment 的这一整条线一起带出来。')

    expect(emit).toHaveBeenCalledTimes(1)
    const emitted = emit.mock.calls[0]?.[0]
    expect(emitted?.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.currentBodyState).toBe('authority=body+face+motion+lipsync+voice | segment=locked')
    const signature = buildAlicizationChatMetaSignature(emitted)
    expect(signature).toContain('Active embodiment lanes: body, face, motion, lipsync, voice.')
    expect(signature).toContain('Status: closed.')
    expect(signature).toContain('Evidence: full-cross-modal-lock.')
    expect(signature).not.toContain('Pending lanes:')
    expectNoFixedTemplateResidue(signature)
  })

  it('keeps audible-body recovery explicit inside body continuity summary when voice and lipsync are the surviving living line before face and motion rejoin', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-audible-body-body-summary-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-audible-body-body-summary-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-audible-body-body-summary-1',
        reply: '我先沿着还活着的声音和身体线中性可见占位。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-audible-body-body-summary-1',
            index: 0,
            startOffset: 0,
            endOffset: 22,
            text: '我先沿着还活着的声音和身体线中性可见占位。',
            emotion: 'thinking',
            gestureWeight: 0.32,
            facialWeight: 0.44,
            prosodyWeight: 0.58,
            beatWeight: 0.48,
            mouthWeight: 0.62,
            headWeight: 0.3,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'cadence-peak',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-audible-body-body-summary-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.96,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.48,
          cadence: 0.44,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 340,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.22,
          holdMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.71,
          gazeStability: 0.68,
          breathAmplitude: 0.2,
          expressivity: 0.24,
        },
        frames: [{
          id: 'segment-audible-body-body-summary-1',
          offsetMs: 0,
          durationMs: 420,
          mode: 'recovering',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.48,
            cadence: 0.44,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            phase: 'playing',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 340,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.22,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.71,
            gazeStability: 0.68,
            breathAmplitude: 0.2,
            expressivity: 0.24,
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'audible-body-carry',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=body+lipsync+voice-only | keep the continuity state audible while face and motion rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'audible-body-carry',
          continuityCue: 'Keep the continuity state audible while face and motion rejoin.',
          sameHerSelfLine: 'Keep the continuity state audible while face and motion rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"audible-body-carry"')
    expect(JSON.parse(signature).runtimeDigestProjectContinuityCue).toBe('')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"audible-body-carry"')
    expect(signature).not.toContain('cadence=audible_body_carry; rejoin=face+motion')
    expect(signature).toContain('Active embodiment lanes: body, lipsync, voice.')
    expect(signature).toContain('Status: partial.')
    expect(signature).toContain('Pending lanes: face, motion.')
    expect(signature).toContain('bodyLine=audible-body-rejoin')
    expect(signature).toContain('seg=segment-audible-body-body-summary-1')
    expectNoFixedTemplateResidue(signature)
  })
  it('keeps host-facing summaries on the later spoken segment when a trailing cue-bridge frame still carries older text on the same lower-pressure line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-later-spoken-frame-over-trailing-cue-bridge-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-later-spoken-frame-over-trailing-cue-bridge-1',
        turnId: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        rendererTarget: 'vrm',
        replyText: '先沿着这条线轻一点接住。然后再继续看这里。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '先沿着这条线轻一点接住。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 220 },
            { id: 'segment-2', index: 1, text: '然后再继续看这里。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 320 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [
            { segmentId: 'segment-1', emotion: 'thinking', facialCue: 'focused', intensity: 0.38, holdMs: 260, source: 'resident-authority', confidence: 0.88 },
            { segmentId: 'segment-2', emotion: 'thinking', facialCue: 'focused', intensity: 0.5, holdMs: 320, source: 'resident-authority', confidence: 0.9 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-1', actionCue: 'observe_focus', intensity: 0.34, holdMs: 220, source: 'resident-authority', confidence: 0.86 },
            { segmentId: 'segment-2', actionCue: 'idle_gentle_nod', intensity: 0.48, holdMs: 300, source: 'resident-authority', confidence: 0.89 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-1', viseme: 'A', weight: 0.42, source: 'resident-authority', confidence: 0.85 },
            { segmentId: 'segment-2', viseme: 'I', weight: 0.68, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        reply: '先沿着这条线轻一点接住。然后再继续看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '先沿着这条线轻一点接住。',
            emotion: 'thinking',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 12,
            endOffset: 21,
            text: '然后再继续看这里。',
            emotion: 'thinking',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'idle_gentle_nod',
            facialCue: 'focused',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.64,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.44,
          energyBias: 0.76,
          mouthScale: 1.04,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'idle_gentle_nod',
          actionMode: 'hold',
          intensity: 0.48,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          expressivity: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '先沿着这条线轻一点接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.91,
              energy: 0.52,
              cadence: 0.49,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.36,
              energyBias: 0.62,
              mouthScale: 0.98,
              continuityHoldMs: 240,
              hintViseme: 'A',
              hintTrail: 'A>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.38,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 220,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 12,
            endOffset: 21,
            text: '然后再继续看这里。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.95,
              energy: 0.64,
              cadence: 0.6,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 320,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.48,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
          {
            id: 'frame-cue-bridge-tail',
            index: 2,
            startOffset: 21,
            endOffset: 24,
            text: '先沿着这条线轻一点接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.9,
              energy: 0.4,
              cadence: 0.42,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.28,
              energyBias: 0.48,
              mouthScale: 0.92,
              continuityHoldMs: 360,
              hintViseme: 'closed',
              hintTrail: 'closed>soft',
              phase: 'settling',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.3,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.28,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
        ],
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.8,
          coherence: 0.76,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'dominant=active-memory',
      } as any,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.64 | cadence=0.60 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.50 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.89 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=prosody-authority | conf=0.94 | seg=segment-2"')
    expect(signature).not.toContain('seg=frame-cue-bridge-tail')
  })

  it('keeps body+lipsync-only continuity distinct from audible-body carry in host-facing summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-body-lipsync-only-stream-meta-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-body-lipsync-only-stream-meta-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-body-lipsync-only-stream-meta-1',
        turnId: 'turn-body-lipsync-only-stream-meta-1',
        rendererTarget: 'vrm',
        replyText: '我先轻一点接住这条线。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-body-lipsync-carry-1',
            index: 0,
            text: '我先轻一点接住这条线。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'steady_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-lipsync-only-stream-meta-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 380,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 240,
        },
        motor: {
          stillness: 0.71,
          expressivity: 0.24,
          gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
          breath: { amplitude: 0.2, pace: 0.22 },
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.04,
            browTension: 0.1,
            cheekLift: 0.06,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.02,
            lean: 0.07,
            openness: 0.2,
            settle: 0.82,
          },
        },
        frames: [{
          id: 'segment-body-lipsync-carry-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点接住这条线。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.98,
            energy: 0.36,
            cadence: 0.32,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 380,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.24,
            gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
            head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
            breath: { amplitude: 0.2, pace: 0.22 },
            facial: {
              eyeOpenness: 0.64,
              browLift: 0.04,
              browTension: 0.1,
              cheekLift: 0.06,
              mouthSpread: 0.08,
              mouthRound: 0.1,
              jawOpenBias: 0.08,
            },
            body: {
              sway: 0.02,
              lean: 0.07,
              openness: 0.2,
              settle: 0.82,
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'body-lipsync-carry',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=body+lipsync-only | keep the continuity state inward while face, motion, and voice rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'body-lipsync-carry',
          continuityCue: 'Keep the continuity state inward while face, motion, and voice rejoin.',
          sameHerSelfLine: 'Keep the continuity state inward while face, motion, and voice rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"body-lipsync-carry"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften')
    expect(signature).toContain('bodyLine=body-lipsync-rejoin')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.98 | energy=0.36 | cadence=0.32 | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=300ms | mode=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=steady_focus | tail=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=380ms | hints=I>closed | hint=I | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).not.toContain('timing=audible-body-carry')
    expect(signature).not.toContain('bodyLine=audible-body-rejoin')
  })

  it('reconstructs body-lipsync continuity timing from self authority when explicit continuityPreferredTiming is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-body-lipsync-timing-fallback-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-body-lipsync-timing-fallback-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-lipsync-timing-fallback-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 380,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 240,
        },
        motor: {
          stillness: 0.71,
          expressivity: 0.24,
          gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
          breath: { amplitude: 0.2, pace: 0.22 },
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.04,
            browTension: 0.1,
            cheekLift: 0.06,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.02,
            lean: 0.07,
            openness: 0.2,
            settle: 0.82,
          },
        },
        frames: [{
          id: 'segment-body-lipsync-timing-fallback-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点接住这条线。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.98,
            energy: 0.36,
            cadence: 0.32,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 380,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.24,
            gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
            head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
            breath: { amplitude: 0.2, pace: 0.22 },
            facial: {
              eyeOpenness: 0.64,
              browLift: 0.04,
              browTension: 0.1,
              cheekLift: 0.06,
              mouthSpread: 0.08,
              mouthRound: 0.1,
              jawOpenBias: 0.08,
            },
            body: {
              sway: 0.02,
              lean: 0.07,
              openness: 0.2,
              settle: 0.82,
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: null,
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=body+lipsync-only | keep the continuity state inward while face, motion, and voice rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          continuityCue: 'Keep the continuity state inward while face, motion, and voice rejoin.',
          sameHerSelfLine: 'Keep the continuity state inward while face, motion, and voice rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"body-lipsync-carry"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften')
    expect(signature).toContain('bodyLine=body-lipsync-rejoin')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.98 | energy=0.36 | cadence=0.32 | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=300ms | mode=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=steady_focus | tail=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=380ms | hints=I>closed | hint=I | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).not.toContain('timing=audible-body-carry')
  })

  it('promotes same-segment cue-bridge lipsync hold onto the same repair-before-closeness body line when face and motion have already rejoined the segment', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-repair-first-cue-bridge-lipsync-realignment-1',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-repair-first-cue-bridge-lipsync-realignment-1',
        turnId: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        rendererTarget: 'vrm',
        replyText: '先别把这条线说得太满。我先轻一点接住这里。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '先别把这条线说得太满。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 260 },
            { id: 'segment-2', index: 1, text: '我先轻一点接住这里。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 360 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [
            { segmentId: 'segment-1', emotion: 'concerned', facialCue: 'soft_concern', intensity: 0.42, holdMs: 280, source: 'resident-authority', confidence: 0.88 },
            { segmentId: 'segment-2', emotion: 'concerned', facialCue: 'soft_concern', intensity: 0.5, holdMs: 360, source: 'cue-bridge', confidence: 0.92 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-1', actionCue: 'observe_focus', intensity: 0.32, holdMs: 240, source: 'resident-authority', confidence: 0.86 },
            { segmentId: 'segment-2', actionCue: 'observe_focus', intensity: 0.44, holdMs: 340, source: 'cue-bridge', confidence: 0.9 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-1', viseme: 'A', weight: 0.38, source: 'resident-authority', confidence: 0.82 },
            { segmentId: 'segment-2', viseme: 'I', weight: 0.66, source: 'cue-bridge', confidence: 0.93 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        reply: '先别把这条线说得太满。我先轻一点接住这里。',
        emotion: 'concerned',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '先别把这条线说得太满。',
            emotion: 'concerned',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft_concern',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 11,
            endOffset: 21,
            text: '我先轻一点接住这里。',
            emotion: 'concerned',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft_concern',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
          energy: 0.58,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.4,
          energyBias: 0.72,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft_concern',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 360,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.44,
          holdMs: 340,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          expressivity: 0,
        },
        frames: [
          {
            id: 'segment-2',
            index: 0,
            startOffset: 11,
            endOffset: 21,
            text: '我先轻一点接住这里。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.92,
              energy: 0.58,
              cadence: 0.42,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.4,
              energyBias: 0.72,
              mouthScale: 0.96,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'concerned',
              facialCue: 'soft_concern',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 360,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'quiet',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.44,
              holdMs: 340,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'quiet',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
        ],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.64,
          coherence: 0.82,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'identity-continuity',
            currentBodyState: 'lane=voice+face+motion+lipsync-only | keep the same line cautious before closeness widens again',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'structured continuity digest.',
          sameHerSelfLine: 'structured continuity digest.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=repair-first embodiment line still needs stronger closure | next=Keep extending cross-modal identity-continuity',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.92 | energy=0.58 | cadence=0.42 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft_concern | expression=hold | intensity=0.50 | hold=360ms | mode=repair-before-closeness')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=360ms | hints=I>closed | hint=I | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
  })
})
