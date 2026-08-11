import type { Tool } from '@xsai/shared-chat'

const officialStrictToolSchemaProviderIds = new Set([
  'openai',
])

const portableSchemaOmittedKeys = new Set([
  '$schema',
  'default',
  'examples',
  'format',
  'propertyNames',
])

function toPortableProviderSchema(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(toPortableProviderSchema)

  if (!value || typeof value !== 'object')
    return value

  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (portableSchemaOmittedKeys.has(key))
      continue
    result[key] = toPortableProviderSchema(entry)
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isStrictCompatibleSchema(value: unknown): boolean {
  if (Array.isArray(value))
    return value.every(isStrictCompatibleSchema)
  if (!isRecord(value))
    return true

  if (value.type === 'object') {
    if (value.additionalProperties !== false)
      return false

    const properties = isRecord(value.properties)
      ? value.properties
      : {}
    const required = new Set(
      Array.isArray(value.required)
        ? value.required.filter((entry): entry is string => typeof entry === 'string')
        : [],
    )
    if (!Object.keys(properties).every(key => required.has(key)))
      return false
  }

  return Object.values(value).every(isStrictCompatibleSchema)
}

export function adaptAlicizationProviderTools(input: {
  providerId: string
  tools: Tool[] | undefined
}): Tool[] | undefined {
  if (!input.tools)
    return undefined

  const providerId = String(input.providerId ?? '').trim().toLowerCase()

  return input.tools.map((tool) => {
    const parameters = toPortableProviderSchema(tool.function.parameters) as Tool['function']['parameters']
    const strict = officialStrictToolSchemaProviderIds.has(providerId)
      && isStrictCompatibleSchema(parameters)

    return {
      ...tool,
      function: {
        ...tool.function,
        strict,
        parameters,
      },
    }
  })
}
