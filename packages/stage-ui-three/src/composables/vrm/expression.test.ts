import { VRMExpression, VRMExpressionManager } from '@pixiv/three-vrm-core'
import { describe, expect, it } from 'vitest'

import { useVRMEmote } from './expression'

function createMockBind(name: string, index: number, primitiveUuid = 'face-mesh') {
  return {
    index,
    primitives: [{
      morphTargetDictionary: { [name]: index },
      uuid: primitiveUuid,
    }],
    applyWeight() {},
    clearAppliedWeight() {},
  }
}

function createExpression(name: string, binds: Array<ReturnType<typeof createMockBind>> = []) {
  const expression = new VRMExpression(name)
  binds.forEach(bind => expression.addBind(bind as never))
  return expression
}

function createMockVrm() {
  const manager = new VRMExpressionManager()
  const expressions = {
    aa: createExpression('aa', [createMockBind('mouthOpen', 0)]),
    angry: createExpression('angry'),
    blink: createExpression('blink', [createMockBind('blink', 1)]),
    ee: createExpression('ee', [createMockBind('mouthWide', 2)]),
    happy: createExpression('happy', [
      createMockBind('mouthOpen', 0),
      createMockBind('browRaise', 3),
    ]),
    grimace: createExpression('grimace', [createMockBind('smirk', 8)]),
    ih: createExpression('ih', [createMockBind('mouthNarrow', 4)]),
    neutral: createExpression('neutral'),
    oh: createExpression('oh', [createMockBind('mouthRound', 5)]),
    ou: createExpression('ou', [createMockBind('mouthPucker', 6)]),
    relaxed: createExpression('relaxed'),
    sad: createExpression('sad'),
    starEyes: createExpression('starEyes', [
      createMockBind('mouthOpen', 0),
      createMockBind('starEyes', 7),
    ]),
    surprised: createExpression('surprised'),
  }

  Object.values(expressions).forEach(expression => manager.registerExpression(expression))

  return {
    expressions,
    manager,
    vrm: {
      expressionManager: manager,
    },
  }
}

function findInternalMouthShadow(manager: VRMExpressionManager, logicalName: string) {
  return manager.expressions.find(expression =>
    expression.expressionName.startsWith('__airi_internal_mouth__')
    && expression.expressionName.endsWith(logicalName),
  )
}

function stepFrames(emote: ReturnType<typeof useVRMEmote>, frames: number, delta = 0.05) {
  for (let i = 0; i < frames; i += 1)
    emote.update(delta)
}

describe('vrm expression mux', () => {
  it('routes blink through the mux layer', () => {
    const { manager, vrm } = createMockVrm()
    const emote = useVRMEmote(vrm as never)

    emote.setBlinkWeights({ blink: 0.9 })
    stepFrames(emote, 4, 0.05)

    expect(manager.getValue('blink') ?? 0).toBeGreaterThan(0.25)
  })

  it('keeps non-mouth facial weight while routing mouth binds into a shadow expression', () => {
    const { expressions, manager, vrm } = createMockVrm()
    const emote = useVRMEmote(vrm as never)

    emote.setEmotion('happy', 1)
    stepFrames(emote, 16, 0.05)
    const happyShadow = findInternalMouthShadow(manager, 'happy')
    const happyBeforeSpeech = manager.getValue('happy') ?? 0
    const shadowBeforeSpeech = manager.getValue(happyShadow?.expressionName ?? '') ?? 0

    expect(expressions.happy.binds).toHaveLength(1)
    expect(happyShadow?.binds).toHaveLength(1)

    emote.setVisemeWeights({ aa: 0.9 }, true)
    stepFrames(emote, 8, 0.05)
    const happyDuringSpeech = manager.getValue('happy') ?? 0
    const shadowDuringSpeech = manager.getValue(happyShadow?.expressionName ?? '') ?? 0
    const aaDuringSpeech = manager.getValue('aa') ?? 0

    emote.setVisemeWeights({}, false)
    stepFrames(emote, 20, 0.05)
    const shadowAfterSpeech = manager.getValue(happyShadow?.expressionName ?? '') ?? 0

    expect(happyBeforeSpeech).toBeGreaterThan(0.45)
    expect(aaDuringSpeech).toBeGreaterThan(0.4)
    expect(happyDuringSpeech).toBeGreaterThan(happyBeforeSpeech * 0.85)
    expect(shadowDuringSpeech).toBeLessThan(shadowBeforeSpeech)
    expect(shadowAfterSpeech).toBeGreaterThan(shadowDuringSpeech)
  })

  it('can drop mouth routing for the active facial cue without reloading the model', () => {
    const { expressions, manager, vrm } = createMockVrm()
    const emote = useVRMEmote(vrm as never)

    emote.setFacialCue('starEyes', 1, { affectsMouth: true })
    stepFrames(emote, 8, 0.05)

    const starEyesShadow = findInternalMouthShadow(manager, 'starEyes')
    expect(starEyesShadow?.binds).toHaveLength(1)
    expect(expressions.starEyes.binds).toHaveLength(1)

    emote.setVisemeWeights({ aa: 0.9 }, true)
    stepFrames(emote, 8, 0.05)
    const shadowDuringSpeech = manager.getValue(starEyesShadow?.expressionName ?? '') ?? 0

    emote.updateCurrentFacialCueOptions({ affectsMouth: false })
    stepFrames(emote, 4, 0.05)

    expect(findInternalMouthShadow(manager, 'starEyes')).toBeUndefined()
    expect(expressions.starEyes.binds).toHaveLength(2)
    expect(shadowDuringSpeech).toBeGreaterThanOrEqual(0)
  })

  it('falls back to routing the whole expression when mouth binds cannot be isolated', () => {
    const { expressions, manager, vrm } = createMockVrm()
    const emote = useVRMEmote(vrm as never)

    emote.setFacialCue('grimace', 1, { affectsMouth: true })
    stepFrames(emote, 8, 0.05)

    const grimaceShadow = findInternalMouthShadow(manager, 'grimace')
    const shadowBeforeSpeech = manager.getValue(grimaceShadow?.expressionName ?? '') ?? 0

    expect(expressions.grimace.binds).toHaveLength(0)
    expect(grimaceShadow?.binds).toHaveLength(1)

    emote.setVisemeWeights({ aa: 0.9 }, true)
    stepFrames(emote, 8, 0.05)

    const shadowDuringSpeech = manager.getValue(grimaceShadow?.expressionName ?? '') ?? 0

    expect(shadowBeforeSpeech).toBeGreaterThan(0.25)
    expect(shadowDuringSpeech).toBeLessThan(shadowBeforeSpeech)
  })
})
