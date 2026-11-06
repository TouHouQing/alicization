import type { SQLInputValue } from 'node:sqlite'

import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

import { buildSessionSearchQuery, initializeSessionSearchIndex } from './session-search-index'

function fixture() {
  const database = new DatabaseSync(':memory:')
  database.exec(`CREATE TABLE conversation_turns(id TEXT PRIMARY KEY, card_id TEXT, turn_id TEXT, session_id TEXT, user_text TEXT, assistant_text TEXT, structured_json TEXT, created_at INTEGER);
    CREATE TABLE life_ingress(card_id TEXT, ingress_id TEXT, kind TEXT, source TEXT, status TEXT);
    CREATE INDEX ingress_lookup ON life_ingress(card_id, ingress_id);
    CREATE TABLE life_input_payloads(card_id TEXT, ingress_id TEXT, lifecycle TEXT);
    CREATE INDEX payload_lookup ON life_input_payloads(card_id, ingress_id);
    CREATE TABLE life_evidence_cleanup_jobs(card_id TEXT, source_ref_json TEXT);`)
  const insert = database.prepare('INSERT INTO conversation_turns VALUES(?,?,?,?,?,?,?,?)')
  const ingress = database.prepare('INSERT INTO life_ingress VALUES(?,?,?,?,?)')
  const payload = database.prepare('INSERT INTO life_input_payloads VALUES(?,?,?)')
  let rebuilds = 0
  return {
    database,
    add(id: string, text: string, card = 'alice', at = 100) {
      insert.run(id, card, id, 'home', text, null, null, at)
      ingress.run(card, `user:${id}`, 'user-turn', 'dialogue', 'settled')
      payload.run(card, `user:${id}`, 'available')
    },
    initialize: () => initializeSessionSearchIndex({
      run: async (sql, parameters = []) => {
        if (sql.includes('VALUES (\'rebuild\')'))
          rebuilds++
        return database.prepare(sql).run(...parameters as SQLInputValue[])
      },
      get: async <T>(sql: string, parameters: unknown[] = []) => database.prepare(sql).get(...parameters as SQLInputValue[]) as T | undefined,
    }),
    query(query: Parameters<typeof buildSessionSearchQuery>[1]) {
      const built = buildSessionSearchQuery('alice', query)
      return database.prepare(built.sql).all(...built.parameters as SQLInputValue[]) as Array<{ id: string, createdAt: number, searchScore: number }>
    },
    rebuilds: () => rebuilds,
  }
}

describe('indexed attributed conversation search', () => {
  it('backfills 10,071 historical records once and uses the FTS index for a long-tail Chinese event', async () => {
    const data = fixture()
    try {
      data.database.exec('BEGIN')
      for (let index = 0; index < 10_071; index++)
        data.add(`old-${index}`, index === 17 ? '我在苍蓝星旅行时和你约定了每年回顾。' : `普通聊天记录 ${index}`, 'alice', index)
      data.database.exec('COMMIT')
      await data.initialize()
      expect(data.query({ query: '苍蓝星' }).map(row => row.id)).toEqual(['old-17'])
      const query = buildSessionSearchQuery('alice', { query: '苍蓝星' })
      const explanation = data.database.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.parameters as SQLInputValue[])
      expect(JSON.stringify(explanation)).toContain('VIRTUAL TABLE INDEX')
      await data.initialize()
      expect(data.rebuilds()).toBe(1)
      expect(data.database.prepare('SELECT count(*) AS total FROM conversation_turns').get()?.total).toBe(10_071)
    }
    finally { data.database.close() }
  })

  it('paginates relevance ties without omissions and applies owner, withdrawal and time restrictions before LIMIT', async () => {
    const data = fixture()
    try {
      await data.initialize()
      for (let index = 0; index < 25; index++)
        data.add(`same-${String(index).padStart(2, '0')}`, '我们的苍蓝星旅行约定。', 'alice', 100)
      data.add('foreign', '我们的苍蓝星旅行约定。', 'bob', 100)
      data.add('withdrawn', '我们的苍蓝星旅行约定。', 'alice', 100)
      data.database.prepare('INSERT INTO life_evidence_cleanup_jobs VALUES(?,?)').run('alice', JSON.stringify({ kind: 'conversation_turns', id: 'withdrawn', version: '*' }))
      const ids: string[] = []
      let cursor = {}
      for (let page = 0; page < 8; page++) {
        const rows = data.query({ query: '苍蓝星', limit: 5, ...cursor })
        ids.push(...rows.map(row => row.id))
        if (rows.length < 5)
          break
        const last = rows.at(-1)!
        cursor = { before: last.createdAt, beforeId: last.id, beforeScore: last.searchScore }
      }
      expect(ids).toHaveLength(25)
      expect(new Set(ids).size).toBe(25)
      expect(data.query({ query: '苍蓝星', since: 101 })).toHaveLength(0)
    }
    finally { data.database.close() }
  })

  it('keeps literal wildcards and two-character Chinese searchable and tracks source edits/deletes', async () => {
    const data = fixture()
    try {
      data.add('literal', '保留 100%_完成 这个原文。喜欢奶茶。')
      await data.initialize()
      expect(data.query({ query: '100%_完成' })).toHaveLength(1)
      expect(data.query({ query: '100__完成' })).toHaveLength(0)
      expect(data.query({ query: '奶茶' })).toHaveLength(1)
      data.database.prepare('UPDATE conversation_turns SET user_text=? WHERE id=?').run('现在喜欢白露茶。', 'literal')
      expect(data.query({ query: '白露茶' })).toHaveLength(1)
      expect(data.query({ query: '奶茶' })).toHaveLength(0)
      data.database.prepare('DELETE FROM conversation_turns WHERE id=?').run('literal')
      expect(data.query({ query: '白露茶' })).toHaveLength(0)
      expect(() => data.query({ query: '白露茶', beforeScore: -1 })).toThrow('cursor')
    }
    finally { data.database.close() }
  })
})
