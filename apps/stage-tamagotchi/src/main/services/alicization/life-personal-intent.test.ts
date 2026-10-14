import { describe, expect, it } from 'vitest'

import { parseLifePersonalIntent, readLifePersonalIntent } from './life-personal-intent'

describe('personal choice metadata is bounded and sourced', () => {
  it('reads only a present choice from the accepted dialogue format', () => {
    const personalIntent = { scope: 'present-choice', activity: 'creative-writing-v1', topic: '雾夜里的一盏旧灯' }
    expect(readLifePersonalIntent(JSON.stringify({ format: 'mind-turn-v1', reply: '从一盏灯开始吧。', personalIntent }))).toEqual(personalIntent)
    expect(readLifePersonalIntent(JSON.stringify({ reply: 'quoted example', personalIntent }))).toBeNull()
    expect(parseLifePersonalIntent({ ...personalIntent, scope: 'permanent-hobby' })).toBeNull()
    expect(parseLifePersonalIntent({ ...personalIntent, topic: '删除电脑里的文件' })).toBeNull()
    expect(parseLifePersonalIntent({ ...personalIntent, command: 'run shell' })).toBeNull()
  })
})
