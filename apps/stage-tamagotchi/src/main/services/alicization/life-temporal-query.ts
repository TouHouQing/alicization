export interface LifeTemporalQuery {
  historical: boolean
  recordedRange: { from: number, to: number } | null
  validRange?: { from: number, to: number } | null
  interpretation: 'current' | 'past-record' | 'known-during-interval' | 'valid-during-interval'
}

export function planLifeTemporalQuery(text: string, now: number): LifeTemporalQuery {
  const today = new Date(now)
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  let recordedRange: LifeTemporalQuery['recordedRange'] = null
  if (/上个月|上月|last month/iu.test(text)) {
    recordedRange = { from: new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime(), to: new Date(today.getFullYear(), today.getMonth(), 1).getTime() }
  }
  else if (/昨天|昨日|yesterday/iu.test(text)) {
    recordedRange = { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime(), to: startDay }
  }
  else if (/上周|上星期|last week/iu.test(text)) {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
    recordedRange = { from: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7).getTime(), to: monday.getTime() }
  }
  else {
    const match = text.match(/\b(20\d{2})[-年](\d{1,2})(?:[-月](\d{1,2})日?)?/u)
    if (match) {
      const year = Number(match[1])
      const month = Number(match[2])
      const day = match[3] ? Number(match[3]) : 1
      const from = new Date(year, month - 1, day)
      if (from.getFullYear() === year && from.getMonth() === month - 1 && from.getDate() === day)
        recordedRange = { from: from.getTime(), to: match[3] ? new Date(year, month - 1, day + 1).getTime() : new Date(year, month, 1).getTime() }
    }
  }
  const historical = Boolean(recordedRange) || /以前|当时|那时候|过去|之前|previously|used to|at that time|back then/iu.test(text)
  if (recordedRange && (recordedRange.from > now || /实际|生效|有效|valid on|as of/iu.test(text)))
    return { historical: true, recordedRange: null, validRange: recordedRange, interpretation: 'valid-during-interval' }
  return { historical, recordedRange, interpretation: recordedRange ? 'known-during-interval' : historical ? 'past-record' : 'current' }
}
