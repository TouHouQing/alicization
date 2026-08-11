export type AlicizationProviderToolCallPhase = 'call' | 'streaming-start'

export interface AlicizationMainChatToolCallIdentityRegistryOptions {
  singleFlightExecutorToolNames?: readonly string[]
}

export interface AlicizationMainChatToolCallIdentityRegistry {
  getToolName: (toolCallId: string) => string | null
  registerExecutorResult: (result: unknown, toolCallId: string) => void
  resolveProgressToolCall: (input: {
    toolCallId?: unknown
    toolName: string
  }) => string
  resolveExecutorToolCall: (input: {
    arguments?: unknown
    toolCallId?: unknown
    toolName: string
  }) => string
  resolveProviderToolCall: (input: {
    arguments?: unknown
    phase: AlicizationProviderToolCallPhase
    toolCallId?: unknown
    toolName: string
  }) => string
  resolveToolResult: (input: {
    arguments?: unknown
    result: unknown
    toolCallId?: unknown
    toolName: string
  }) => string
}

interface ToolCallIdentityRecord {
  argumentsFingerprint: string
  executorStarted: boolean
  hasProvidedId: boolean
  id: string
  providerCalled: boolean
  providerStreamingStarted: boolean
  resultResolved: boolean
  toolName: string
}

function normalizeToolCallId(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

function normalizeToolName(value: unknown) {
  const toolName = typeof value === 'string'
    ? value.trim()
    : ''
  return toolName || 'tool'
}

function toProviderToolResultContent(result: unknown) {
  if (typeof result === 'string')
    return result

  try {
    return JSON.stringify(result)
  }
  catch {
    return ''
  }
}

function fingerprintStructuredValue(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null)
    return 'null'
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number')
    return JSON.stringify(value)
  if (Array.isArray(value))
    return `[${value.map(entry => fingerprintStructuredValue(entry, seen)).join(',')}]`
  if (!value || typeof value !== 'object')
    return ''
  if (seen.has(value))
    return ''

  seen.add(value)
  const fingerprint = `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(key => `${JSON.stringify(key)}:${fingerprintStructuredValue((value as Record<string, unknown>)[key], seen)}`)
    .join(',')}}`
  seen.delete(value)
  return fingerprint
}

export function createAlicizationMainChatToolCallIdentityRegistry(
  options: AlicizationMainChatToolCallIdentityRegistryOptions = {},
): AlicizationMainChatToolCallIdentityRegistry {
  const aliases = new Map<string, string>()
  const records = new Map<string, ToolCallIdentityRecord>()
  const resultIdsByObject = new WeakMap<object, string>()
  const resultIdsByContent = new Map<string, Set<string>>()
  const singleFlightExecutorToolNames = new Set(
    options.singleFlightExecutorToolNames?.map(normalizeToolName),
  )
  let sequence = 0

  const createSyntheticId = () => {
    sequence += 1
    return `alicization-tool-call-${sequence}`
  }

  const ensureRecord = (input: {
    hasProvidedId: boolean
    id: string
    toolName: string
  }) => {
    const existing = records.get(input.id)
    if (existing) {
      if (existing.toolName === 'tool' && input.toolName !== 'tool')
        existing.toolName = input.toolName
      if (input.hasProvidedId)
        existing.hasProvidedId = true
      return existing
    }

    const record: ToolCallIdentityRecord = {
      argumentsFingerprint: '',
      executorStarted: false,
      hasProvidedId: input.hasProvidedId,
      id: input.id,
      providerCalled: false,
      providerStreamingStarted: false,
      resultResolved: false,
      toolName: input.toolName,
    }
    records.set(record.id, record)
    return record
  }

  const attachArguments = (record: ToolCallIdentityRecord, value: unknown) => {
    const fingerprint = fingerprintStructuredValue(value)
    if (fingerprint && !record.argumentsFingerprint)
      record.argumentsFingerprint = fingerprint
    return fingerprint
  }

  const matchesArguments = (record: ToolCallIdentityRecord, fingerprint: string) => {
    return !fingerprint
      || !record.argumentsFingerprint
      || record.argumentsFingerprint === fingerprint
  }

  const bindProvidedId = (record: ToolCallIdentityRecord, providedId: string) => {
    if (!providedId)
      return
    aliases.set(providedId, record.id)
    record.hasProvidedId = true
  }

  const findUniqueRecord = (
    toolName: string,
    predicate: (record: ToolCallIdentityRecord) => boolean,
  ) => {
    let match: ToolCallIdentityRecord | null = null
    for (const record of records.values()) {
      if (
        record.toolName === toolName
        && !record.resultResolved
        && predicate(record)
      ) {
        if (match)
          return null
        match = record
      }
    }
    return match
  }

  const resolveKnownRecord = (providedId: string) => {
    if (!providedId)
      return null
    const canonicalId = aliases.get(providedId) ?? providedId
    return records.get(canonicalId) ?? null
  }

  const createRecord = (toolName: string, providedId: string) => {
    const providedIdAlreadyUsed = Boolean(
      providedId
      && (records.has(providedId) || aliases.has(providedId)),
    )
    const id = providedId && !providedIdAlreadyUsed
      ? providedId
      : createSyntheticId()
    const record = ensureRecord({
      hasProvidedId: Boolean(providedId),
      id,
      toolName,
    })
    bindProvidedId(record, providedId)
    return record
  }

  const settleResultRecord = (record: ToolCallIdentityRecord) => {
    record.resultResolved = true
    for (const [content, ids] of resultIdsByContent) {
      ids.delete(record.id)
      if (ids.size === 0)
        resultIdsByContent.delete(content)
    }
    return record.id
  }

  return {
    getToolName: (toolCallId) => {
      const providedId = normalizeToolCallId(toolCallId)
      const canonicalId = aliases.get(providedId) ?? providedId
      return records.get(canonicalId)?.toolName ?? null
    },

    resolveProgressToolCall: (input) => {
      const toolName = normalizeToolName(input.toolName)
      const providedId = normalizeToolCallId(input.toolCallId)
      const knownRecord = resolveKnownRecord(providedId)
      if (knownRecord) {
        bindProvidedId(knownRecord, providedId)
        return knownRecord.id
      }

      const unresolvedRecords = [...records.values()].filter(record =>
        record.toolName === toolName
        && !record.resultResolved,
      )
      if (unresolvedRecords.length === 1) {
        bindProvidedId(unresolvedRecords[0]!, providedId)
        return unresolvedRecords[0]!.id
      }

      const settledRecords = [...records.values()].filter(record =>
        record.toolName === toolName
        && record.resultResolved,
      )
      if (unresolvedRecords.length === 0 && settledRecords.length === 1) {
        bindProvidedId(settledRecords[0]!, providedId)
        return settledRecords[0]!.id
      }

      return providedId || `${toolName}:progress`
    },

    resolveProviderToolCall: (input) => {
      const toolName = normalizeToolName(input.toolName)
      const providedId = normalizeToolCallId(input.toolCallId)
      const argumentsFingerprint = fingerprintStructuredValue(input.arguments)
      let record = resolveKnownRecord(providedId)
      if (record?.resultResolved)
        return record.id

      if (!record && input.phase === 'streaming-start' && singleFlightExecutorToolNames.has(toolName)) {
        record = findUniqueRecord(toolName, candidate => !candidate.resultResolved)
      }
      if (!record && input.phase === 'call') {
        record = findUniqueRecord(toolName, candidate =>
          candidate.providerStreamingStarted
          && !candidate.providerCalled
          && matchesArguments(candidate, argumentsFingerprint))
      }
      if (!record && input.phase === 'call' && singleFlightExecutorToolNames.has(toolName)) {
        record = findUniqueRecord(toolName, candidate =>
          matchesArguments(candidate, argumentsFingerprint))
      }
      if (!record && input.phase === 'streaming-start') {
        record = findUniqueRecord(toolName, candidate =>
          candidate.providerCalled
          && !candidate.providerStreamingStarted
          && matchesArguments(candidate, argumentsFingerprint))
      }
      if (!record) {
        record = findUniqueRecord(toolName, candidate =>
          candidate.executorStarted
          && !candidate.providerCalled
          && !candidate.providerStreamingStarted
          && matchesArguments(candidate, argumentsFingerprint))
      }
      record ??= createRecord(toolName, providedId)
      bindProvidedId(record, providedId)
      attachArguments(record, input.arguments)

      if (input.phase === 'streaming-start')
        record.providerStreamingStarted = true
      else
        record.providerCalled = true
      return record.id
    },

    resolveExecutorToolCall: (input) => {
      const toolName = normalizeToolName(input.toolName)
      const providedId = normalizeToolCallId(input.toolCallId)
      const argumentsFingerprint = fingerprintStructuredValue(input.arguments)
      let record = resolveKnownRecord(providedId)
      if (record?.resultResolved)
        record = null

      if (!record) {
        record = findUniqueRecord(toolName, candidate =>
          !candidate.executorStarted
          && (candidate.providerCalled || candidate.providerStreamingStarted)
          && matchesArguments(candidate, argumentsFingerprint))
      }
      record ??= createRecord(toolName, providedId)
      bindProvidedId(record, providedId)
      attachArguments(record, input.arguments)
      record.executorStarted = true
      return record.id
    },

    registerExecutorResult: (result, toolCallId) => {
      const providedId = normalizeToolCallId(toolCallId)
      const canonicalId = aliases.get(providedId) ?? providedId
      const record = records.get(canonicalId)
      if (!record)
        return

      if (result && typeof result === 'object')
        resultIdsByObject.set(result, record.id)

      const content = toProviderToolResultContent(result)
      if (!content)
        return
      const ids = resultIdsByContent.get(content) ?? new Set<string>()
      ids.add(record.id)
      resultIdsByContent.set(content, ids)
    },

    resolveToolResult: (input) => {
      const toolName = normalizeToolName(input.toolName)
      const providedId = normalizeToolCallId(input.toolCallId)
      const argumentsFingerprint = fingerprintStructuredValue(input.arguments)
      const knownRecord = resolveKnownRecord(providedId)
      if (knownRecord)
        return settleResultRecord(knownRecord)

      if (input.result && typeof input.result === 'object') {
        const resultId = resultIdsByObject.get(input.result)
        const resultRecord = resultId ? records.get(resultId) : null
        if (resultRecord) {
          bindProvidedId(resultRecord, providedId)
          return settleResultRecord(resultRecord)
        }
      }

      const content = toProviderToolResultContent(input.result)
      const contentIds = content
        ? [...(resultIdsByContent.get(content) ?? [])]
            .filter((id) => {
              const record = records.get(id)
              return record?.resultResolved === false
                && record.toolName === toolName
                && matchesArguments(record, argumentsFingerprint)
            })
        : []
      if (contentIds.length === 1) {
        const resultRecord = records.get(contentIds[0]!)
        if (resultRecord) {
          bindProvidedId(resultRecord, providedId)
          return settleResultRecord(resultRecord)
        }
      }
      if (contentIds.length > 1) {
        const ambiguousRecord = createRecord(toolName, '')
        ambiguousRecord.resultResolved = true
        return ambiguousRecord.id
      }

      const pendingResults = [...records.values()]
        .filter(record => (
          record.toolName === toolName
          && !record.resultResolved
          && (record.executorStarted || record.providerCalled || record.providerStreamingStarted)
        ))
        .filter(record => matchesArguments(record, argumentsFingerprint))
      if (pendingResults.length === 1) {
        bindProvidedId(pendingResults[0]!, providedId)
        return settleResultRecord(pendingResults[0]!)
      }

      const unmatchedRecord = createRecord(toolName, providedId)
      unmatchedRecord.resultResolved = true
      return unmatchedRecord.id
    },
  }
}
