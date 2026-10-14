import { alicizationEmotionWhitelist, alicizationPerformanceDeliveryWhitelist, alicizationProviderResponseJsonSchema, buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import { lifePersonalIntentJsonSchema } from './life-personal-intent'

export function buildLifeExpressionResponseFormat(context?: { workingMemoryVersion: string | null, evidenceIds: string[] }) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'alicization_desktop_life_reply_v1',
      strict: true,
      schema: {
        ...alicizationProviderResponseJsonSchema,
        required: [...alicizationProviderResponseJsonSchema.required, 'interaction', 'personalIntent'],
        properties: {
          personalIntent: lifePersonalIntentJsonSchema,
          ...alicizationProviderResponseJsonSchema.properties,
          ...(context
            ? { memoryUsage: {
                type: 'object',
                additionalProperties: false,
                required: ['workingMemoryVersion', 'longTermEvidenceIds'],
                properties: {
                  workingMemoryVersion: { type: context.workingMemoryVersion === null ? 'null' : 'string', const: context.workingMemoryVersion },
                  longTermEvidenceIds: { type: 'array', maxItems: Math.min(16, context.evidenceIds.length), items: { type: 'string', ...(context.evidenceIds.length ? { enum: [...context.evidenceIds] } : {}) } },
                },
              } }
            : {}),
          interaction: {
            type: 'object',
            additionalProperties: false,
            required: ['purpose', 'attention', 'reason'],
            properties: {
              purpose: { type: 'string', enum: ['answer', 'care', 'accompany', 'guide', 'clarify', 'reflect', 'repair', 'defer', 'greet', 'celebrate', 'play'] },
              attention: { type: 'string', enum: ['host', 'shared-task', 'inward'] },
              reason: { type: 'string', minLength: 1, maxLength: 240 },
            },
          },
        },
      },
    },
  } as const
}

/** The foreground reply mind authors language and its bodily intention together. */
export function buildLifeExpressionOutputContract() {
  const formatRequirements = `For your final reply, return one JSON object without markdown fences. Keep the spoken words in reply; metadata is never spoken. Use format="mind-turn-v1", thought="", emotion from ${JSON.stringify(alicizationEmotionWhitelist)}, and performance={baseEmotion:the same emotion,facialCue:null or an actually supported facial cue,actionCue:null or an actually supported action,delivery:one of ${JSON.stringify(alicizationPerformanceDeliveryWhitelist)},emphasis:0|1|2}. Choose expression from your current feelings and this interaction, including real action results; do not rotate expressions randomly. Add interaction={purpose:answer|care|accompany|guide|clarify|reflect|repair|defer|greet|celebrate|play,attention:host|shared-task|inward,reason:a brief goal for this expression}. Use greet for an ordinary greeting, celebrate for sharing an accomplishment, play for a light joke; these differ in intensity. Include personalIntent=null ordinarily. If you presently choose a small personal creative activity, use personalIntent={scope:present-choice,activity:creative-writing-v1|visual-study-v1,topic:a specific topic you want to try}. It is a retractable current choice, not a permanent hobby or a promise to the host; the local life loop decides when it can actually proceed. This is your current intention, not hidden reasoning or a script for the user. If memoryUsage is included, use only the supplied workingMemoryVersion and exact available evidence IDs. If memoryEvidence is included, use the existing cleaned-evidence contract; do not claim storage or invent events. Reply naturally as the same person using the committed identity, relationship and actual evidence. Asking about an action's status calls for observation; do not repeat a write or another side effect merely to answer a status question. A provider that cannot emit JSON may still return its natural spoken reply.`
  return buildAlicizationProviderFactBlock('alicization-expression-output-contract', { version: 1, formatRequirements })
}
