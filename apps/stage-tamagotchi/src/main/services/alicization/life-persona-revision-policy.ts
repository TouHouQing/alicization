import { parseSoul } from './runtime-soul'

export function validateLifePersonaRevision(base: string, candidate: string) {
  const before = parseSoul(base).frontmatter
  const after = parseSoul(candidate).frontmatter
  for (const key of ['profile', 'custom_directives', 'initialized', 'schemaVersion'] as const) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      throw new Error('A learned revision cannot replace identity, human directives, or initialization')
  }
  const beforeKernel = before.personality.identityKernel
  const afterKernel = after.personality.identityKernel
  if (!beforeKernel?.temperament || !afterKernel?.temperament)
    throw new Error('Persona revision requires a complete identity kernel')
  const { temperament: _beforeTemperament, ...stableBefore } = beforeKernel
  const { temperament: _afterTemperament, ...stableAfter } = afterKernel
  if (JSON.stringify(stableBefore) !== JSON.stringify(stableAfter) || JSON.stringify(before.personality.evolutionSeed) !== JSON.stringify(after.personality.evolutionSeed))
    throw new Error('A learned revision cannot replace the stable identity kernel or its learning boundaries')
  for (const key of ['obedience', 'liveliness', 'sensibility'] as const) {
    const previous = beforeKernel.temperament[key]
    const next = afterKernel.temperament[key]
    if (typeof previous !== 'number' || typeof next !== 'number' || !Number.isFinite(previous) || !Number.isFinite(next) || Math.abs(previous - next) > 0.050001)
      throw new Error('Temperament growth exceeds the bounded change allowed per reviewed revision')
  }
}
