import type {
  AlicizationRealtimeCategory,
  AlicizationRealtimeSurface,
  AlicizationRealtimeSurfaceField,
  AlicizationRealtimeSurfaceItem,
} from './alicization-transport-contracts'

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function hasCjk(text: string) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)
}

export function inferAlicizationRealtimeSurfaceLocale(raw?: string): 'zh' | 'en' {
  return hasCjk(sanitizeText(raw ?? '', 240)) ? 'zh' : 'en'
}

function buildField(label: string, value: unknown): AlicizationRealtimeSurfaceField {
  return {
    label,
    value: sanitizeText(value, 120),
  }
}

function buildItem(title: unknown, meta?: unknown, url?: unknown): AlicizationRealtimeSurfaceItem {
  return {
    title: sanitizeText(title, 180),
    meta: sanitizeText(meta, 120) || null,
    url: sanitizeText(url, 600) || null,
  }
}

export function buildAlicizationWeatherSurface(input: {
  location: string
  condition: string
  temperatureC: number
  apparentTemperatureC: number
  humidity: number
  windSpeedKmH: number
}): AlicizationRealtimeSurface {
  return {
    kind: 'weather',
    title: sanitizeText(input.location, 120),
    lead: `${sanitizeText(input.location, 120)} 现在 ${sanitizeText(input.condition, 40)}`,
    fields: [
      buildField('温度', `${input.temperatureC.toFixed(1)}°C`),
      buildField('体感', `${input.apparentTemperatureC.toFixed(1)}°C`),
      buildField('湿度', `${input.humidity.toFixed(0)}%`),
      buildField('风速', `${input.windSpeedKmH.toFixed(1)} km/h`),
    ],
  }
}

export function buildAlicizationNewsSurface(input: {
  query: string
  items: Array<{
    title: string
    source?: string | null
    url?: string | null
    publishedAt?: string | null
  }>
}): AlicizationRealtimeSurface {
  return {
    kind: 'news',
    title: sanitizeText(input.query, 120),
    lead: `${sanitizeText(input.query, 120)} 这边先落最新几条`,
    items: input.items
      .map(item => buildItem(
        item.title,
        uniqueStrings([
          sanitizeText(item.source, 48),
          sanitizeText(item.publishedAt, 48),
        ]).join(' · '),
        item.url,
      ))
      .filter(item => item.title),
  }
}

export function buildAlicizationFinanceSurface(input:
  | {
      ticker: string
      market: 'crypto'
      priceUsd: number
      change24h: number
    }
  | {
      ticker: string
      market: 'equity'
      closePriceUsd: number
      date: string
    },
): AlicizationRealtimeSurface {
  if (input.market === 'crypto') {
    return {
      kind: 'finance',
      title: sanitizeText(input.ticker, 24),
      lead: `${sanitizeText(input.ticker, 24)} 现在的价格落点`,
      fields: [
        buildField('价格', `$${input.priceUsd.toFixed(2)}`),
        buildField('24h 变动', `${input.change24h.toFixed(2)}%`),
      ],
    }
  }

  return {
    kind: 'finance',
    title: sanitizeText(input.ticker, 24),
    lead: `${sanitizeText(input.ticker, 24)} 最近收盘落点`,
    fields: [
      buildField('收盘价', `$${input.closePriceUsd.toFixed(2)}`),
      buildField('日期', sanitizeText(input.date, 32) || '未知'),
    ],
  }
}

export function buildAlicizationSportsSurface(input: {
  leagueLabel: string
  items: Array<{
    name: string
    score: string
    status: string
  }>
}): AlicizationRealtimeSurface {
  return {
    kind: 'sports',
    title: sanitizeText(input.leagueLabel, 32),
    lead: `${sanitizeText(input.leagueLabel, 32)} 这边能对上的比赛`,
    items: input.items
      .map(item => buildItem(
        item.name,
        uniqueStrings([
          sanitizeText(item.score, 32),
          sanitizeText(item.status, 72),
        ]).join(' · '),
      ))
      .filter(item => item.title),
  }
}

export function formatAlicizationRealtimeSurfaceSummary(surface: AlicizationRealtimeSurface): string {
  const title = sanitizeText(surface.title, 120)
  const lead = sanitizeText(surface.lead, 180)
  const fields = (surface.fields ?? [])
    .map(field => `${sanitizeText(field.label, 24)}=${sanitizeText(field.value, 64)}`)
    .filter(Boolean)
  const items = (surface.items ?? [])
    .map(item => [sanitizeText(item.title, 96), sanitizeText(item.meta, 72)].filter(Boolean).join(' | '))
    .filter(Boolean)

  return [
    surface.kind,
    title ? `title=${title}` : '',
    lead ? `lead=${lead}` : '',
    fields.length > 0 ? `fields=${fields.join(', ')}` : '',
    items.length > 0 ? `items=${items.join(' || ')}` : '',
  ].filter(Boolean).join(' ; ')
}

function renderWeatherSurface(surface: AlicizationRealtimeSurface, locale: 'zh' | 'en') {
  const lead = sanitizeText(surface.lead, 180)
  const fields = new Map((surface.fields ?? []).map(field => [field.label, sanitizeText(field.value, 64)]))
  if (locale === 'zh') {
    return [
      lead,
      [fields.get('温度'), fields.get('体感'), fields.get('湿度'), fields.get('风速')].filter(Boolean).join('，'),
    ].filter(Boolean).join('，')
  }

  return [
    lead,
    [
      fields.get('温度') ? `temperature ${fields.get('温度')}` : '',
      fields.get('体感') ? `feels like ${fields.get('体感')}` : '',
      fields.get('湿度') ? `humidity ${fields.get('湿度')}` : '',
      fields.get('风速') ? `wind ${fields.get('风速')}` : '',
    ].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ')
}

function renderListSurface(surface: AlicizationRealtimeSurface, locale: 'zh' | 'en') {
  const lead = sanitizeText(surface.lead, 180)
  const items = (surface.items ?? [])
    .slice(0, 3)
    .map((item, index) => {
      const meta = sanitizeText(item.meta, 120)
      return locale === 'zh'
        ? `${index + 1}. ${sanitizeText(item.title, 180)}${meta ? `（${meta}）` : ''}`
        : `${index + 1}. ${sanitizeText(item.title, 180)}${meta ? ` (${meta})` : ''}`
    })
    .filter(Boolean)

  return [lead, ...items].filter(Boolean).join('\n')
}

function renderFinanceSurface(surface: AlicizationRealtimeSurface, locale: 'zh' | 'en') {
  const lead = sanitizeText(surface.lead, 180)
  const fields = (surface.fields ?? [])
    .map(field => {
      const label = sanitizeText(field.label, 24)
      const value = sanitizeText(field.value, 64)
      if (!label || !value)
        return ''
      return locale === 'zh' ? `${label} ${value}` : `${label}: ${value}`
    })
    .filter(Boolean)

  return [lead, fields.join(locale === 'zh' ? '，' : ', ')].filter(Boolean).join(locale === 'zh' ? '，' : ', ')
}

export function renderAlicizationRealtimeSurface(surface: AlicizationRealtimeSurface, locale: 'zh' | 'en' = 'zh'): string {
  if (surface.kind === 'weather')
    return renderWeatherSurface(surface, locale)
  if (surface.kind === 'finance')
    return renderFinanceSurface(surface, locale)
  return renderListSurface(surface, locale)
}

export interface AlicizationRealtimeReplyEvidence {
  category: AlicizationRealtimeCategory
  source: 'builtin' | 'mcp'
  summary?: string | null
  surface?: AlicizationRealtimeSurface | null
}

function buildFailureReply(category: AlicizationRealtimeCategory, locale: 'zh' | 'en') {
  if (locale === 'en') {
    if (category === 'weather')
      return 'I did not get a reliable live weather result this turn. Give me a city or country and I will narrow it again.'
    if (category === 'finance')
      return 'I did not get a reliable live market result this turn. Give me a ticker like AAPL, TSLA, or BTC and I will retry.'
    if (category === 'sports')
      return 'I did not get a reliable live sports result this turn. Name the league or team and I will narrow it again.'
    return 'I did not get a reliable live news result this turn. We can retry in a moment.'
  }

  if (category === 'weather')
    return '这轮没拿到可靠的实时天气结果。你给我城市或国家，我再缩一次。'
  if (category === 'finance')
    return '这轮没拿到可靠的实时行情结果。你给我 ticker，比如 AAPL、TSLA、BTC，我再查。'
  if (category === 'sports')
    return '这轮没拿到可靠的实时比赛结果。你给我联赛或球队，我再缩一次。'
  return '这轮没拿到可靠的实时新闻结果。稍后再试一轮会更稳。'
}

export function composeAlicizationRealtimeReply(input: {
  evidences: AlicizationRealtimeReplyEvidence[]
  failed: AlicizationRealtimeCategory[]
  locale?: 'zh' | 'en'
}): string {
  const locale = input.locale ?? 'zh'
  if (input.evidences.length === 0) {
    if (input.failed.length > 0)
      return buildFailureReply(input.failed[0]!, locale)
    return locale === 'zh'
      ? '这轮没有拿到可验证的实时结果。'
      : 'This turn did not produce a verified live result.'
  }

  const sections = input.evidences
    .map((item) => {
      if (item.surface)
        return renderAlicizationRealtimeSurface(item.surface, locale)
      return sanitizeText(item.summary, 480)
    })
    .filter(Boolean)

  const failedHint = input.failed.length > 0
    ? (
        locale === 'zh'
          ? `\n\n另外还有 ${input.failed.map(category => category).join('、')} 这一类，这轮没拿到可靠结果。`
          : `\n\nI still do not have a reliable result for ${input.failed.join(', ')} this turn.`
      )
    : ''

  return `${sections.join('\n\n')}${failedHint}`
}
