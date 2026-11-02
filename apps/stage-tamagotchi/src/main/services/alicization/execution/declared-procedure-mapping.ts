/** Exclude quoted examples and nested JSON from instruction/identity authority. */
export function readTopLevelProcedureValues(text: string, failure: () => Error) {
  const values: unknown[] = []
  let instructions = ''
  let containers = 0
  for (let index = 0; index < text.length;) {
    const begin = index
    const first = text[index]
    if (!['"', '{', '['].includes(first)) {
      instructions += first
      index++
      continue
    }
    if (++containers > 64)
      throw failure()
    const stack: string[] = first === '"' ? [] : [first]
    let quoted = first === '"'
    let escaped = false
    index++
    for (; index < text.length; index++) {
      const character = text[index]
      if (quoted) {
        if (escaped) {
          escaped = false
        }
        else if (character === '\\') {
          escaped = true
        }
        else if (character === '"') {
          quoted = false
          if (!stack.length) {
            index++
            break
          }
        }
      }
      else if (character === '"') {
        quoted = true
      }
      else if (character === '{' || character === '[') {
        stack.push(character)
        if (stack.length > 32)
          throw failure()
      }
      else if (character === '}' || character === ']') {
        if (stack.pop() !== (character === '}' ? '{' : '['))
          throw failure()
        if (!stack.length) {
          index++
          break
        }
      }
    }
    if (quoted || stack.length)
      throw failure()
    if (first !== '"') {
      try {
        values.push(JSON.parse(text.slice(begin, index)))
      }
      catch { /* A bracketed prose annotation is not a JSON declaration. */ }
    }
    instructions += ' '.repeat(index - begin)
  }
  return { values, instructions }
}
