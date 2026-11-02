/** Incrementally decode only the root reply string; private fields never leave this parser. */
export function createVisibleReplyStreamDecoder(emit: (text: string) => void, options?: { allowPlainText?: boolean, onEmotion?: (emotion: string) => void }) {
  interface Container { kind: '{' | '[', state: 'key' | 'colon' | 'value' | 'comma', allowEnd: boolean, key?: string, keys: Set<string> }
  const stack: Container[] = []
  let mode: 'start' | 'json' | 'plain' | 'opaque' | 'done' = 'start'
  let string: { key: boolean, reply: boolean, emotion: boolean, raw: string, escape: string | null } | null = null
  let primitive = ''
  let rawSize = 0
  let replySize = 0
  let highSurrogate = ''
  let leading = true
  let whitespace = ''
  let pending = ''
  let replySeen = false
  const privatePrefixes = ['<think', '</think', '<analysis', '</analysis', '<tool_call', '<tool_response', '<|', '[state_patch', '[thought', '[system', '{"thought"', '{"performance"', '{"memoryusage"', '{"format"', 'thought:', 'analysis:', 'reasoning:', '思考过程：', '思考过程:', '内部思考：']
  const invalid = () => new Error('provider-visible-stream-invalid')
  const completeValue = () => {
    const parent = stack.at(-1)
    if (parent) {
      parent.state = 'comma'
      parent.allowEnd = true
    }
    else {
      mode = 'done'
    }
  }
  const admit = (text: string) => {
    for (const char of text) {
      pending += char
      if (pending.length > 256)
        throw invalid()
      const probe = pending.replace(/\s/gu, '').toLowerCase()
      if (privatePrefixes.some(prefix => probe.startsWith(prefix)))
        throw new Error('provider-visible-stream-internal-leak')
      if (probe && privatePrefixes.some(prefix => prefix.startsWith(probe)))
        continue
      emit(pending)
      pending = ''
    }
  }
  const decoded = (unit: string) => {
    if (++replySize > 12_000)
      throw new Error('provider-visible-stream-limit')
    const code = unit.charCodeAt(0)
    if (highSurrogate) {
      if (code < 0xDC00 || code > 0xDFFF)
        throw invalid()
      unit = highSurrogate + unit
      highSurrogate = ''
    }
    else if (code >= 0xD800 && code <= 0xDBFF) {
      highSurrogate = unit
      return
    }
    else if (code >= 0xDC00 && code <= 0xDFFF) {
      throw invalid()
    }
    if (/^\s+$/u.test(unit)) {
      if (!leading)
        whitespace += unit
      return
    }
    leading = false
    admit(whitespace + unit)
    whitespace = ''
  }
  const finishPublicString = () => {
    if (highSurrogate)
      throw invalid()
    if (pending) {
      // A normal final word such as "thought" is not a private heading.
      // Unclosed tag/object prefixes remain blocked.
      if (!/^\p{L}+$/u.test(pending))
        throw invalid()
      emit(pending)
      pending = ''
    }
  }
  function push(text: string) {
    rawSize += text.length
    if (rawSize > 262_144)
      throw new Error('provider-visible-stream-limit')
    for (const char of text) {
      if (mode === 'opaque')
        continue
      if (mode === 'plain') {
        for (let index = 0; index < char.length; index++)
          decoded(char[index]!)
        continue
      }
      if (string) {
        if (string.escape !== null) {
          string.escape += char
          if (string.escape.startsWith('u') && string.escape.length < 5) {
            if (!/^u[\da-f]{0,4}$/iu.test(string.escape))
              throw invalid()
            continue
          }
          const value = JSON.parse(`"\\${string.escape}"`) as string
          if (string.reply)
            decoded(value)
          if (string.key || string.emotion)
            string.raw += value
          string.escape = null
          continue
        }
        if (char === '\\') {
          string.escape = ''
          continue
        }
        if (char === '"') {
          if (string.key) {
            const parent = stack.at(-1)!
            if (parent.keys.has(string.raw))
              throw invalid()
            parent.keys.add(string.raw)
            parent.key = string.raw
            parent.state = 'colon'
          }
          else {
            if (string.reply)
              finishPublicString()
            if (string.emotion)
              options?.onEmotion?.(string.raw)
            completeValue()
          }
          string = null
          continue
        }
        if (char.charCodeAt(0) < 32)
          throw invalid()
        if (string.key || string.emotion) {
          string.raw += char
          if (string.raw.length > 256)
            throw invalid()
        }
        if (string.reply) {
          // for..of keeps native surrogate pairs whole; escaped pairs arrive separately.
          for (let index = 0; index < char.length; index++)
            decoded(char[index]!)
        }
        continue
      }
      if (primitive) {
        if (!/[\s,}\]]/u.test(char)) {
          primitive += char
          if (primitive.length > 256)
            throw invalid()
          continue
        }
        JSON.parse(primitive)
        primitive = ''
        completeValue()
      }
      if (/\s/u.test(char))
        continue
      if (mode === 'start') {
        if (char !== '{') {
          // Plain output is negotiated only on steps that cannot dispatch tools.
          // Fenced / array-shaped payloads still use complete framing repair.
          mode = options?.allowPlainText && char !== '`' && char !== '[' ? 'plain' : 'opaque'
          if (mode === 'plain') {
            for (let index = 0; index < char.length; index++) decoded(char[index]!)
          }
          continue
        }
        mode = 'json'
        stack.push({ kind: '{', state: 'key', allowEnd: true, keys: new Set() })
        continue
      }
      if (mode === 'done')
        throw invalid()
      const parent = stack.at(-1)!
      if (char === '}' || char === ']') {
        if ((char === '}' ? '{' : '[') !== parent.kind || !parent.allowEnd || !['key', 'value', 'comma'].includes(parent.state))
          throw invalid()
        stack.pop()
        completeValue()
      }
      else if (char === ',' && parent.state === 'comma') {
        parent.state = parent.kind === '{' ? 'key' : 'value'
        parent.allowEnd = false
      }
      else if (char === ':' && parent.kind === '{' && parent.state === 'colon') {
        parent.state = 'value'
        parent.allowEnd = false
      }
      else if (char === '"' && (parent.state === 'value' || parent.state === 'key')) {
        const reply = stack.length === 1 && parent.key === 'reply' && parent.state === 'value'
        if (reply && replySeen)
          throw invalid()
        replySeen ||= reply
        string = { key: parent.state === 'key', reply, emotion: stack.length === 1 && parent.key === 'emotion' && parent.state === 'value', raw: '', escape: null }
      }
      else if (parent.state === 'value' && (char === '{' || char === '[')) {
        if (stack.length === 1 && parent.key === 'reply')
          throw invalid()
        if (stack.length > 32)
          throw invalid()
        stack.push({ kind: char, state: char === '{' ? 'key' : 'value', allowEnd: true, keys: new Set() })
      }
      else if (parent.state === 'value' && /[\dntf-]/u.test(char)) {
        if (stack.length === 1 && parent.key === 'reply')
          throw invalid()
        primitive = char
      }
      else {
        throw invalid()
      }
    }
  }
  return {
    push,
    finish() {
      if (mode === 'plain') {
        finishPublicString()
        return
      }
      if (mode !== 'opaque' && (mode !== 'done' || string || stack.length || !replySeen))
        throw invalid()
    },
  }
}
