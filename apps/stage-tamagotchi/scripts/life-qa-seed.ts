import process from 'node:process'

import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'

import { setupAlicizationDb } from '../src/main/services/alicization/db'
import { createLifeTurnRuntime } from '../src/main/services/alicization/life-turn-runtime'

const profile = resolve(process.argv[2] ?? '')
if (!profile.toLowerCase().startsWith(resolve(tmpdir()).toLowerCase()) || !basename(profile).startsWith('alicization-life-real-'))
  throw new Error('QA seeding only accepts its isolated temporary profile')
const db = await setupAlicizationDb(profile, { cardId: 'default' })
try {
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  await life.admit({ cardId: 'default', turnId: `qa-held-input${process.argv[3] ? `:${process.argv[3]}` : ''}`, conversationId: 'qa-native-life', messages: [{ role: 'user', content: '请和我打个招呼，回复中包含“QA-你好”。不调用工具，不保存新的记忆，不承诺其他事情。' }] }, new AbortController().signal)
  await life.recover('default')
  console.info(JSON.stringify({ seeded: true, schemaVersion: await db.getMetaValue('life.schema.version') }))
}
finally { await db.close() }
