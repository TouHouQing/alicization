import type { SessionSearchInput } from './session-search'

/** External-content FTS: only the index is new; dialogue keeps its existing owner. */
export async function initializeSessionSearchIndex(ports: {
  run: (sql: string, parameters?: unknown[]) => Promise<unknown>
  get: <T>(sql: string, parameters?: unknown[]) => Promise<T | undefined>
}) {
  await ports.run(`CREATE VIRTUAL TABLE IF NOT EXISTS agent_conversation_search USING fts5(user_text, assistant_text, content='conversation_turns', content_rowid='rowid', tokenize='trigram')`)
  await ports.run(`CREATE TABLE IF NOT EXISTS agent_conversation_search_meta (version INTEGER PRIMARY KEY)`)
  await ports.run(`CREATE TRIGGER IF NOT EXISTS agent_conversation_search_insert AFTER INSERT ON conversation_turns BEGIN
    INSERT INTO agent_conversation_search(rowid, user_text, assistant_text) VALUES (new.rowid, new.user_text, new.assistant_text);
  END`)
  await ports.run(`CREATE TRIGGER IF NOT EXISTS agent_conversation_search_delete AFTER DELETE ON conversation_turns BEGIN
    INSERT INTO agent_conversation_search(agent_conversation_search, rowid, user_text, assistant_text) VALUES ('delete', old.rowid, old.user_text, old.assistant_text);
  END`)
  await ports.run(`CREATE TRIGGER IF NOT EXISTS agent_conversation_search_update AFTER UPDATE ON conversation_turns BEGIN
    INSERT INTO agent_conversation_search(agent_conversation_search, rowid, user_text, assistant_text) VALUES ('delete', old.rowid, old.user_text, old.assistant_text);
    INSERT INTO agent_conversation_search(rowid, user_text, assistant_text) VALUES (new.rowid, new.user_text, new.assistant_text);
  END`)
  if (!await ports.get('SELECT version FROM agent_conversation_search_meta WHERE version = 1')) {
    await ports.run(`INSERT INTO agent_conversation_search(agent_conversation_search) VALUES ('rebuild')`)
    await ports.run('INSERT OR IGNORE INTO agent_conversation_search_meta(version) VALUES (1)')
  }
}

export function sessionSearchTerms(input: SessionSearchInput) {
  const terms = input.query.trim().split(/\s+/u).filter(Boolean)
  const limit = input.limit ?? 5
  if (!terms.length || terms.length > 4 || input.query.length > 256 || terms.some(term => term.length > 128) || !Number.isInteger(limit) || limit < 1 || limit > 8 || (input.beforeId?.length ?? 0) > 512 || (input.sessionId?.length ?? 0) > 512 || [input.since, input.before].some(value => value !== undefined && (!Number.isSafeInteger(value) || value < 0)) || (input.beforeScore !== undefined && !Number.isFinite(input.beforeScore)) || (input.order !== undefined && !['relevance', 'recent'].includes(input.order)))
    throw new Error('Session search exceeded its query budget')
  if (input.beforeScore !== undefined && (input.before === undefined || input.beforeId === undefined || input.order === 'recent'))
    throw new Error('Session search relevance cursor is incomplete')
  if ((input.sourceId !== undefined && (!input.sourceId || input.sourceId.length > 512)) || (input.offset !== undefined && (!input.sourceId || !Number.isSafeInteger(input.offset) || input.offset < 0)) || (input.speaker !== undefined && !['host', 'companion'].includes(input.speaker)))
    throw new Error('Session source read exceeded its query budget')
  return terms
}

export function buildSessionSearchQuery(cardId: string, input: SessionSearchInput) {
  const terms = sessionSearchTerms(input)
  // Trigram FTS supports literal substrings, including unsegmented Chinese.
  // One/two-character terms remain exact LIKE filters over the same card scope.
  const indexed = terms.filter(term => Array.from(term).length >= 3)
  const usesIndex = indexed.length > 0
  const score = usesIndex ? 'agent_conversation_search.rank' : '0.0'
  const relevance = input.order !== 'recent' && (input.before === undefined || input.beforeScore !== undefined)
  const clauses = [
    'turn.card_id = ?',
    `NOT EXISTS (SELECT 1 FROM life_evidence_cleanup_jobs AS cleanup WHERE cleanup.card_id = turn.card_id AND ((json_extract(cleanup.source_ref_json, '$.kind') = 'conversation_turns' AND json_extract(cleanup.source_ref_json, '$.id') = turn.id) OR (json_extract(cleanup.source_ref_json, '$.kind') = 'life_ingress' AND json_extract(cleanup.source_ref_json, '$.id') = ingress.ingress_id)))`,
  ]
  const parameters: unknown[] = [cardId]
  if (usesIndex) {
    clauses.push('agent_conversation_search MATCH ?')
    parameters.push(indexed.map(term => `"${term.replaceAll('"', '""')}"`).join(' AND '))
  }
  for (const term of terms) {
    clauses.push(`(COALESCE(turn.user_text, '') || ' ' || COALESCE(turn.assistant_text, '')) LIKE ? ESCAPE '\\'`)
    parameters.push(`%${term.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`)
  }
  if (input.sessionId) {
    clauses.push('turn.session_id = ?')
    parameters.push(input.sessionId)
  }
  if (input.since !== undefined) {
    clauses.push('turn.created_at >= ?')
    parameters.push(input.since)
  }
  if (input.before !== undefined) {
    const chronological = '(turn.created_at < ? OR (turn.created_at = ? AND turn.id < ?))'
    clauses.push(relevance ? `(${score} > ? OR (${score} = ? AND ${chronological}))` : chronological)
    if (relevance)
      parameters.push(input.beforeScore, input.beforeScore)
    parameters.push(input.before, input.before, input.beforeId ?? '')
  }
  parameters.push(input.limit ?? 5)
  return {
    sql: `SELECT turn.id, turn.turn_id AS turnId, turn.session_id AS sessionId, turn.user_text AS userText, turn.assistant_text AS assistantText, turn.structured_json AS structuredJson, turn.created_at AS createdAt, ${score} AS searchScore
      FROM conversation_turns AS turn
      ${usesIndex ? 'JOIN agent_conversation_search ON agent_conversation_search.rowid = turn.rowid' : ''}
      JOIN life_ingress AS ingress ON ingress.card_id = turn.card_id AND ingress.ingress_id = 'user:' || turn.turn_id AND ingress.kind = 'user-turn' AND ingress.source = 'dialogue' AND ingress.status = 'settled'
      JOIN life_input_payloads AS payload ON payload.card_id = turn.card_id AND payload.ingress_id = ingress.ingress_id AND payload.lifecycle NOT IN ('withdrawn', 'unavailable')
      WHERE ${clauses.join(' AND ')}
      ORDER BY ${relevance ? `${score} ASC, ` : ''}turn.created_at DESC, turn.id DESC LIMIT ?`,
    parameters,
    relevance,
  }
}
