import type { AlicizationDbService } from '../db'
import type { LifeConversationStatement } from '../life-conversation-statements'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

import { companionStatement } from '../life-conversation-statements'
import { createSessionSearchRuntime, sessionSearchName } from './session-search'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const proofSchema = v.pipe(v.array(v.strictObject({ id, turnId: id, sessionId: id, inputRef: id, inputHash: hash, payloadHash: hash, conversationHash: hash, companionPresented: v.boolean() })), v.maxLength(8))
export type RetrievedDialogueProof = v.InferOutput<typeof proofSchema>

/** Only IDs in successful same-turn search receipts may supply historical speech. */
export async function readRetrievedDialogue(database: AlicizationDbService, cardId: string, turnId: string) {
  interface Excerpt { text: string, offset: number, totalChars: number }
  const matches = (await database.readLifeTurnExecutionEffects(turnId)).filter(effect => effect.kind === 'execute' && effect.status === 'settled' && effect.receipt?.outcome === 'success' && effect.payload.capabilityId === `tool.${sessionSearchName}`).flatMap((effect) => {
    const output = effect.receipt?.output as { type?: string, matches?: Array<{ id?: unknown, host?: Excerpt, companion?: Excerpt | null }> } | undefined
    return output?.type === 'life-session-search' && Array.isArray(output.matches) ? output.matches.filter(match => typeof match.id === 'string') : []
  })
  const rows = await createSessionSearchRuntime(database, cardId).statements(matches.map(match => String(match.id)))
  const statements: LifeConversationStatement[] = []
  const sources: RetrievedDialogueProof = []
  for (const row of rows) {
    const checked = (text: string, excerpt?: Excerpt | null) => excerpt && Number.isInteger(excerpt.offset) && excerpt.offset >= 0 && excerpt.totalChars === text.length && typeof excerpt.text === 'string' && excerpt.text.length <= 1600 && text.slice(excerpt.offset, excerpt.offset + excerpt.text.length) === excerpt.text ? excerpt.text : null
    let accepted = false
    for (const quote of matches.filter(match => match.id === row.id).slice(-8)) {
      const host = checked(row.host, quote.host)
      const companion = row.companion === null ? null : checked(row.companion, quote.companion)
      if (!host)
        continue
      accepted = true
      if (!statements.some(item => item.speaker === 'host' && item.text === host))
        statements.push({ binding: { kind: 'dialogue', id: row.inputRef, version: row.inputHash }, speaker: 'host', text: host, occurredAt: row.occurredAt })
      if (companion && !statements.some(item => item.speaker === 'companion' && item.text === companion))
        statements.push(companionStatement({ turnId: row.turnId, text: companion, occurredAt: row.occurredAt }))
    }
    if (!accepted)
      continue
    const { host: _host, companion: _companion, occurredAt: _occurredAt, ...source } = row
    sources.push({ ...source, companionPresented: row.companion !== null })
  }
  return { statements, sources }
}

/** Recheck inside the publication transaction, after any source withdrawal. */
export async function assertRetrievedDialogue(get: <T>(sql: string, parameters: unknown[]) => Promise<T | undefined>, cardId: string, raw: unknown) {
  const sources = v.parse(proofSchema, raw)
  for (const source of sources) {
    const row = await get<{ payload_hash: string, input_hash: string, body_json: string, lifecycle: string, status: string, assistant_text: string | null, structured_json: string | null, session_id: string }>(`SELECT ingress.payload_hash, ingress.status, payload.input_hash, payload.body_json, payload.lifecycle, turn.assistant_text, turn.structured_json, turn.session_id FROM conversation_turns AS turn JOIN life_ingress AS ingress ON ingress.card_id=turn.card_id AND ingress.ingress_id=? AND ingress.source='dialogue' JOIN life_input_payloads AS payload ON payload.card_id=turn.card_id AND payload.ingress_id=ingress.ingress_id WHERE turn.card_id=? AND turn.id=? AND turn.turn_id=?`, [source.inputRef, cardId, source.id, source.turnId])
    if (!row || row.status !== 'settled' || ['withdrawn', 'unavailable'].includes(row.lifecycle) || row.session_id !== source.sessionId || row.payload_hash !== source.payloadHash || row.input_hash !== source.inputHash || createHash('sha256').update(row.body_json).digest('hex') !== source.inputHash || createHash('sha256').update(JSON.stringify([row.assistant_text, row.structured_json])).digest('hex') !== source.conversationHash)
      throw new Error('Retrieved dialogue changed or was withdrawn before publication')
    if (source.companionPresented && !await get(`SELECT 1 FROM life_expression_receipts WHERE card_id=? AND turn_id=? AND presentation_verified=1 AND (state='rendered' OR (state='audio-ended' AND segment_id='utterance')) LIMIT 1`, [cardId, source.turnId]))
      throw new Error('Retrieved companion speech has no current presentation proof')
    for (const [kind, id, version] of [['life_ingress', source.inputRef, source.inputHash], ['conversation_turns', source.id, '*']]) {
      if (await get(`SELECT 1 FROM life_evidence_cleanup_jobs WHERE card_id=? AND json_extract(source_ref_json,'$.kind')=? AND json_extract(source_ref_json,'$.id')=? AND (json_extract(source_ref_json,'$.version')='*' OR json_extract(source_ref_json,'$.version')=?) LIMIT 1`, [cardId, kind, id, version]))
        throw new Error('Retrieved dialogue was revoked before publication')
    }
  }
}
