import process from 'node:process'

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { buildAlicizationInteractionIntent, buildAlicizationInteractionIntentFact } from '../../src/main/services/alicization/interaction-intent'
import { normalizeDialogueRespondedPayload } from '../../src/main/services/alicization/runtime-governance'

// Synthetic core inputs exercise production preparation and normalization.
// No model, private transcript, audio device or real execution is involved.
const timestamp = Date.now()
const manifest = { renderer: 'vrm' as const, supportsLookAt: true, supportsVisemeLipSync: true, supportsMicroDynamics: true, supportedBaseEmotions: ['neutral' as const], supportedFacialCues: [], supportedActions: ['open_palm', 'reassuring_nod', 'thoughtful_pause', 'gentle_boundary', 'idle_settle'].map(key => ({ key, label: key, source: 'builtin' as const })) }
const scenes = ['guide', 'care', 'reflect', 'defer'].map((purpose, index) => {
  const preparedAt = timestamp + index
  const turnId = `qa-interaction-${purpose}-${timestamp}`
  const frame = { updatedAt: preparedAt, subject: purpose === 'reflect' ? 'alicization-self' : purpose === 'guide' ? 'task-knot' : 'host-state', confidence: 0.85, focusAnchor: '明确标记的 QA 场景', speakingIntention: `QA ${purpose}：表达已准备的意图，不改变人格或情绪` }
  const governance = { turnMode: 'answer', answerAct: purpose === 'reflect' ? 'answer' : purpose, relationshipPosture: 'warm', repairState: 'none', truthState: 'dialogue-grounded', personaKernelMode: 'full', openingStyle: 'direct-answer' }
  const intent = buildAlicizationInteractionIntent({ cardId: 'default', turnId, now: preparedAt, surface: { dialogue: { currentConsciousFrame: frame, answerPlanner: { updatedAt: preparedAt, act: governance.answerAct } } } as any, governance: governance as any })
  if (intent?.purpose !== purpose)
    throw new Error(`Synthetic ${purpose} failed production preparation`)
  const payload = normalizeDialogueRespondedPayload({ cardId: 'default', turnId, sessionId: 'qa-interaction', userText: 'Synthetic acceptance input', assistantText: '我会把这一步说明白。', structured: { format: 'mind-turn-v1', parsePath: 'json', visibleReplyAuthority: 'llm-mind', reply: '我会把这一步说明白。', thought: frame.speakingIntention, emotion: 'neutral', performance: { baseEmotion: 'neutral', delivery: 'gentle', emphasis: 0.3 } }, governance } as any, manifest, { interactionIntent: intent })
  if (payload?.isFallback !== false || payload.structured.visibleReplyAuthority !== 'llm-mind')
    throw new Error(`Synthetic ${purpose} must have a valid dialogue contract; infrastructure diagnostics cannot animate the body`)
  if (!payload?.structured.embodimentScript?.state.interactionIntent)
    throw new Error(`Synthetic ${purpose} lost its prepared intent`)
  return { purpose, providerFact: JSON.parse(buildAlicizationInteractionIntentFact(intent)), payload: { ...payload, cardId: 'default' } }
})
const target = resolve(process.argv[2] ?? 'output/life-acceptance/intent-scenes.json')
if (!target.startsWith(`${resolve('output')}\\`))
  throw new Error('The synthetic fixture must stay inside workspace output')
await writeFile(target, JSON.stringify({ synthetic: true, configuredModel: false, timestamp, scenes }, null, 2))
console.info(JSON.stringify({ target, purposes: scenes.map(scene => scene.purpose) }))
