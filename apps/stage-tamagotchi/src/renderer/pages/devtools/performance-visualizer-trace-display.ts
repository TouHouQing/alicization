function mapValue(
  value: string,
  mapping: Record<string, string>,
) {
  return mapping[value] ?? value
}

const traceEventKindLabels: Record<string, string> = {
  'governance-normalized': '治理归位',
  'person-state-updated': '人格状态更新',
  'presence-pulse-dispatched': '存在脉冲已派发',
}

const traceDetailLabels: Record<string, string> = {
  scenario: '场景',
  stance: '姿态',
  sourceTrail: '来源链',
}

export function formatRecentDrivingTraceHeading(value: string) {
  const [kind, suffix] = value.split(' @ ')
  if (!suffix)
    return mapValue(value, traceEventKindLabels)
  return `${mapValue(kind, traceEventKindLabels)} @ ${suffix}`
}

export function formatRecentDrivingTraceDetailLine(value: string) {
  const colonIndex = value.indexOf(':')
  if (colonIndex < 0)
    return value
  const label = value.slice(0, colonIndex)
  const detail = value.slice(colonIndex + 1)
  return `${mapValue(label, traceDetailLabels)}:${detail}`
}
