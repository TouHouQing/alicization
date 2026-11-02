/** One desktop contract for the host editor and its main-process writer. */
export const workStepEditableFields: Readonly<Record<string, { maxLength: number, multiline: boolean, arguments?: boolean }>> = {
  path: { maxLength: 4096, multiline: false },
  content: { maxLength: 64000, multiline: true },
  url: { maxLength: 4096, multiline: false },
  text: { maxLength: 64000, multiline: true },
  targetText: { maxLength: 4096, multiline: false },
  windowTitle: { maxLength: 4096, multiline: false },
  prompt: { maxLength: 8000, multiline: true },
  command: { maxLength: 8000, multiline: true },
  cwd: { maxLength: 4096, multiline: false },
  args: { maxLength: 12000, multiline: true, arguments: true },
}

export function isWorkStepEditableField(key: string, value: unknown) {
  const spec = Object.hasOwn(workStepEditableFields, key) ? workStepEditableFields[key] : null
  return Boolean(spec && (spec.arguments ? Array.isArray(value) && value.every(item => typeof item === 'string') : typeof value === 'string'))
}

export function parseWorkStepEdit(key: string, text: string): string | string[] {
  const spec = Object.hasOwn(workStepEditableFields, key) ? workStepEditableFields[key] : null
  if (!spec || typeof text !== 'string' || text.length > spec.maxLength)
    throw new Error('The edited work field exceeds its allowed shape')
  if (!spec.arguments)
    return text
  const args: unknown = JSON.parse(text)
  if (!Array.isArray(args) || args.length > 32 || args.some(value => typeof value !== 'string' || value.length > 2048))
    throw new Error('Command arguments require a JSON array of at most 32 bounded strings')
  return args
}
