interface GeneratePresenceExpressionInput {
  trigger: 'presence-only-hold'
  previousState: Record<string, any> | null | undefined
  state: Record<string, any> | null | undefined
  now: number
  generate?: ((input: GeneratePresenceExpressionInput) => unknown) | null
}

interface PresenceExpressionSnapshot {
  version: 'presence-expression-v1'
  trigger: 'presence-only-hold'
  text: string
  display: {
    mode: 'near-body-whisper'
    allowAutoShow: true
  }
  grounding: {
    sourceRefs: string[]
  }
}

function normalizeGeneratedText(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ')
    : ''
}

function isBannedPresenceExpressionText(text: string) {
  const normalized = text
    .replace(/[，。！？、,.!?]/g, '')
    .replace(/\s+/g, '')
    .trim()

  return normalized === '我在旁边先不打扰你'
}

function buildPresenceExpressionGroundingSourceRefs(state: Record<string, any> | null | undefined) {
  const sourceRefs = [
    state?.privateThought ? 'privateThought' : '',
    state?.emotionalKernel ? 'emotionalKernel' : '',
    state?.initiative ? 'initiative' : '',
  ].filter(Boolean)

  return Array.from(new Set(sourceRefs))
}

export async function buildAlicizationPresenceExpression(input: GeneratePresenceExpressionInput): Promise<PresenceExpressionSnapshot | null> {
  if (typeof input.generate !== 'function')
    return null

  let generated: unknown
  try {
    generated = await input.generate(input)
  }
  catch {
    return null
  }

  const text = normalizeGeneratedText(
    typeof generated === 'string'
      ? generated
      : generated && typeof generated === 'object'
        ? (generated as Record<string, unknown>).text
        : null,
  )
  if (!text || isBannedPresenceExpressionText(text))
    return null

  const groundingSourceRefs = buildPresenceExpressionGroundingSourceRefs(input.state)
  if (!groundingSourceRefs.length)
    return null

  return {
    version: 'presence-expression-v1',
    trigger: input.trigger,
    text,
    display: {
      mode: 'near-body-whisper',
      allowAutoShow: true,
    },
    grounding: {
      sourceRefs: groundingSourceRefs,
    },
  }
}
