import type { LifeConversationStatement } from './life-conversation-statements'

import * as v from 'valibot'

import { attributesConversationStatement } from './life-conversation-statements'

export const lifeStatementReviewSchema = v.strictObject({
  quote: v.pipe(v.string(), v.minLength(1), v.maxLength(4000)),
  binding: v.nullable(v.strictObject({ kind: v.literal('dialogue'), id: v.string(), version: v.string() })),
  meaningMatchesBinding: v.boolean(),
  temporalScope: v.optional(v.picklist(['requested-interval', 'explicitly-before-interval', 'explicitly-after-interval'])),
})

/** Separate speaker channels prevent a host request from binding to her reply. */
export function buildLifeStatementReviewFormat(draft: string, candidates: string[], records: Array<Pick<LifeConversationStatement, 'binding' | 'speaker'>>, speaker: LifeConversationStatement['speaker'], timed: boolean) {
  const quotes = candidates.filter(quote => attributesConversationStatement(draft, quote, speaker))
  const bindings = records.filter(record => record.speaker === speaker).map(record => record.binding)
  return {
    type: 'array',
    maxItems: quotes.length ? 32 : 0,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['quote', 'binding', 'meaningMatchesBinding', ...(timed ? ['temporalScope'] : [])],
      properties: {
        quote: { type: 'string', minLength: 1, maxLength: 4000, ...(quotes.length ? { enum: quotes } : {}) },
        binding: bindings.length
          ? { anyOf: [{ type: 'null' }, {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'id', 'version'],
              properties: {
                kind: { type: 'string', enum: ['dialogue'] },
                id: { type: 'string', enum: bindings.map(binding => binding.id) },
                version: { type: 'string', enum: [...new Set(bindings.map(binding => binding.version))] },
              },
            }] }
          : { type: 'null' },
        meaningMatchesBinding: { type: 'boolean' },
        ...(timed ? { temporalScope: { type: 'string', enum: ['requested-interval', 'explicitly-before-interval', 'explicitly-after-interval'] } } : {}),
      },
    },
  }
}
