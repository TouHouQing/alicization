export function shouldReplaceToolSettlement(input: {
  existingStatus: string
  nextStatus: string
  terminalStatuses: ReadonlySet<string>
  deadLetteredStatuses: ReadonlySet<string>
}) {
  const existingIsTerminal = input.terminalStatuses.has(input.existingStatus)
  const nextIsTerminal = input.terminalStatuses.has(input.nextStatus)
  if (existingIsTerminal && !nextIsTerminal)
    return false

  const existingIsDeadLettered = input.deadLetteredStatuses.has(input.existingStatus)
  const nextIsDeadLettered = input.deadLetteredStatuses.has(input.nextStatus)
  if (existingIsTerminal && nextIsTerminal && existingIsDeadLettered && !nextIsDeadLettered)
    return false

  return true
}
