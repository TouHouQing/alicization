import type {
  AlicizationRealtimeCategory,
  AlicizationRealtimeExecutePayload,
  AlicizationRealtimeExecuteResult,
} from '../../../shared/eventa'

import {
  buildAlicizationFinanceSurface,
  buildAlicizationNewsSurface,
  buildAlicizationSportsSurface,
  buildAlicizationWeatherSurface,
  extractAlicizationLocationFromQuery,
  formatAlicizationRealtimeSurfaceSummary,
} from '@proj-alicization/stage-shared'

export const realtimeRequestTimeoutMsec = 8000

export const financeTickerAliasMap: Record<string, string> = {
  比特币: 'BTC',
  以太坊: 'ETH',
  苹果: 'AAPL',
  特斯拉: 'TSLA',
  英伟达: 'NVDA',
  微软: 'MSFT',
  亚马逊: 'AMZN',
  谷歌: 'GOOGL',
}

export const cryptoCoinIdByTicker: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
}

export const sportsLeagueCatalog = {
  nba: { path: 'basketball/nba', label: 'NBA' },
  nfl: { path: 'football/nfl', label: 'NFL' },
  mlb: { path: 'baseball/mlb', label: 'MLB' },
  nhl: { path: 'hockey/nhl', label: 'NHL' },
  epl: { path: 'soccer/eng.1', label: 'EPL' },
} as const

export type SportsLeagueKey = keyof typeof sportsLeagueCatalog

export function createRealtimeError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string }
  error.code = code
  return error
}

export function normalizeQueryText(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
}

function readStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

export function sanitizeBriefText(raw: string, maxLength = 160) {
  const text = raw
    .replace(/\s+/g, ' ')
    .trim()
  if (!text)
    return ''
  if (text.length <= maxLength)
    return text
  return `${text.slice(0, Math.max(8, maxLength - 1))}…`
}

export function uniqueCarryAnchors(values: unknown[], maxItems = 6) {
  const anchors: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(readStringValue(value), 180)
    if (!normalized || anchors.includes(normalized))
      continue
    anchors.push(normalized)
    if (anchors.length >= maxItems)
      break
  }
  return anchors
}

export function normalizeReminderMessage(value: string) {
  const text = sanitizeText(value, '').replace(/\s+/g, ' ').trim()
  return text
}

export function parseReminderToolResultForDebug(result: unknown): {
  status?: string
  taskId?: string
  triggerAt?: number
  message?: string
  code?: string
} {
  const parseObject = (value: Record<string, unknown>) => {
    const status = typeof value.status === 'string' ? value.status : undefined
    const taskId = typeof value.taskId === 'string' ? value.taskId : undefined
    const triggerAt = typeof value.triggerAt === 'number' && Number.isFinite(value.triggerAt)
      ? value.triggerAt
      : undefined
    const message = typeof value.message === 'string' ? sanitizeBriefText(value.message, 120) : undefined
    const code = typeof value.code === 'string' ? value.code : undefined
    return {
      status,
      taskId,
      triggerAt,
      message,
      code,
    }
  }

  if (!result || typeof result !== 'object')
    return {}

  const payload = result as Record<string, unknown>
  const direct = parseObject(payload)
  if (direct.status || direct.code)
    return direct

  if (payload.toolResult && typeof payload.toolResult === 'object') {
    const nested = parseObject(payload.toolResult as Record<string, unknown>)
    if (nested.status || nested.code)
      return nested
  }

  if (payload.structuredContent && typeof payload.structuredContent === 'object') {
    const nested = parseObject(payload.structuredContent as Record<string, unknown>)
    if (nested.status || nested.code)
      return nested
  }

  return {}
}

export async function fetchWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ALICIZATION/1.0',
      },
    })
  }
  catch (error: any) {
    if (error?.name === 'AbortError') {
      throw createRealtimeError('TIMEOUT', `request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
  finally {
    clearTimeout(timeout)
  }
}

export async function fetchJsonWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const response = await fetchWithTimeout(url, timeoutMs)
  if (!response.ok) {
    throw createRealtimeError('UPSTREAM_HTTP_ERROR', `upstream request failed: ${response.status}`)
  }
  return await response.json() as Record<string, any>
}

export async function fetchTextWithTimeout(url: string, timeoutMs = realtimeRequestTimeoutMsec) {
  const response = await fetchWithTimeout(url, timeoutMs)
  if (!response.ok) {
    throw createRealtimeError('UPSTREAM_HTTP_ERROR', `upstream request failed: ${response.status}`)
  }
  return await response.text()
}

export const extractLocationFromQuery = extractAlicizationLocationFromQuery

interface OpenMeteoGeocodeResult {
  name?: unknown
  admin1?: unknown
  country?: unknown
  country_code?: unknown
  latitude?: unknown
  longitude?: unknown
  population?: unknown
}

const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const weatherLocationSuffixPattern = /(特别行政区|自治区|自治州|自治县|市|州|盟|县|区|旗)$/u
const weatherLocationAliasMap: Record<string, string> = {
  纽约: 'New York',
  洛杉矶: 'Los Angeles',
  旧金山: 'San Francisco',
  天津: 'Tianjin',
}

function hasCjkCharacters(text: string) {
  return cjkPattern.test(text)
}

function normalizeGeocodeToken(value: unknown) {
  if (typeof value !== 'string')
    return ''
  return value
    .toLowerCase()
    .replace(/[，,\s·.'’"“”\-_/\\()（）[\]【】]/g, '')
    .replace(weatherLocationSuffixPattern, '')
}

function buildWeatherGeocodeQueryCandidates(location: string) {
  const normalizedLocation = sanitizeText(location, '')
  if (!normalizedLocation)
    return []

  const candidates: string[] = []
  const pushCandidate = (candidate: string) => {
    const normalizedCandidate = sanitizeText(candidate, '')
    if (!normalizedCandidate || candidates.includes(normalizedCandidate))
      return
    candidates.push(normalizedCandidate)
  }

  pushCandidate(normalizedLocation)

  if (hasCjkCharacters(normalizedLocation)) {
    const withoutSuffix = normalizedLocation.replace(weatherLocationSuffixPattern, '')
    if (withoutSuffix && withoutSuffix !== normalizedLocation) {
      pushCandidate(withoutSuffix)
    }
    else if (!normalizedLocation.endsWith('市')) {
      pushCandidate(`${normalizedLocation}市`)
    }
  }

  const alias = weatherLocationAliasMap[normalizedLocation]
  if (alias)
    pushCandidate(alias)

  return candidates
}

function scoreWeatherGeocodeResult(input: {
  result: OpenMeteoGeocodeResult
  queryName: string
  originalLocation: string
}) {
  const queryToken = normalizeGeocodeToken(input.queryName)
  const originalToken = normalizeGeocodeToken(input.originalLocation)
  const nameToken = normalizeGeocodeToken(input.result.name)
  const adminToken = normalizeGeocodeToken(input.result.admin1)
  const countryToken = normalizeGeocodeToken(input.result.country)
  const combinedToken = normalizeGeocodeToken([
    sanitizeText(input.result.name, ''),
    sanitizeText(input.result.admin1, ''),
    sanitizeText(input.result.country, ''),
  ].join(' '))
  const countryCode = sanitizeText(input.result.country_code, '').toUpperCase()
  const population = Number(input.result.population)

  let score = 0
  if (nameToken && nameToken === queryToken)
    score += 8
  if (nameToken && nameToken === originalToken)
    score += 7
  if (adminToken && (adminToken === queryToken || adminToken === originalToken))
    score += 4
  if (countryToken && (countryToken === queryToken || countryToken === originalToken))
    score += 5
  if (combinedToken && queryToken && combinedToken.includes(queryToken))
    score += 2
  if (combinedToken && originalToken && combinedToken.includes(originalToken))
    score += 2
  if (hasCjkCharacters(input.originalLocation) && countryCode === 'CN')
    score += 3
  if (Number.isFinite(population) && population > 0)
    score += Math.min(2, Math.log10(population + 1) / 3)

  return score
}

async function resolveBestWeatherGeocode(location: string): Promise<OpenMeteoGeocodeResult | null> {
  const candidates = buildWeatherGeocodeQueryCandidates(location)
  if (candidates.length === 0)
    return null

  const perRequestTimeoutMs = Math.max(
    1_800,
    Math.min(4_500, Math.floor(realtimeRequestTimeoutMsec / candidates.length) + 1_200),
  )
  let bestCandidate: {
    result: OpenMeteoGeocodeResult
    score: number
    population: number
  } | null = null

  for (const candidate of candidates) {
    const geocode = await fetchJsonWithTimeout(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(candidate)}&count=8&language=zh&format=json`,
      perRequestTimeoutMs,
    )

    const results = Array.isArray(geocode.results)
      ? geocode.results as OpenMeteoGeocodeResult[]
      : []
    for (const result of results) {
      const latitude = Number(result.latitude)
      const longitude = Number(result.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        continue

      const score = scoreWeatherGeocodeResult({
        result,
        queryName: candidate,
        originalLocation: location,
      })
      const population = Number(result.population)
      const safePopulation = Number.isFinite(population) ? population : 0

      if (!bestCandidate || score > bestCandidate.score || (score === bestCandidate.score && safePopulation > bestCandidate.population)) {
        bestCandidate = {
          result,
          score,
          population: safePopulation,
        }
      }
    }

    if (bestCandidate && bestCandidate.score >= 12)
      break
  }

  if (!bestCandidate)
    return null
  return bestCandidate.result
}

export function describeWeatherCode(code: number | null | undefined) {
  const map: Record<number, string> = {
    0: '晴朗',
    1: '大部晴',
    2: '局部多云',
    3: '阴天',
    45: '有雾',
    48: '雾凇',
    51: '小毛雨',
    53: '毛毛雨',
    55: '强毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    95: '雷暴',
  }
  if (typeof code !== 'number' || Number.isNaN(code))
    return '未知天气'
  return map[code] ?? `天气代码 ${code}`
}

export async function executeBuiltinWeather(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const location = extractLocationFromQuery(query)
    if (!location) {
      throw createRealtimeError('MISSING_LOCATION', '未识别到地点，请补充城市或国家后重试。')
    }

    const resolvedGeocode = await resolveBestWeatherGeocode(location)
    if (!resolvedGeocode) {
      throw createRealtimeError('LOCATION_NOT_FOUND', `未找到地点：${location}`)
    }

    const latitude = Number(resolvedGeocode.latitude)
    const longitude = Number(resolvedGeocode.longitude)
    const weather = await fetchJsonWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
    )

    const current = weather.current ?? {}
    if (!Number.isFinite(Number(current.temperature_2m))) {
      throw createRealtimeError('NO_DATA', '天气源未返回有效的实时温度。')
    }

    const resolvedLocation = [resolvedGeocode.name, resolvedGeocode.admin1, resolvedGeocode.country]
      .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      .join(', ')
    const surface = buildAlicizationWeatherSurface({
      location: resolvedLocation || location,
      condition: describeWeatherCode(Number(current.weather_code)),
      temperatureC: Number(current.temperature_2m),
      apparentTemperatureC: Number(current.apparent_temperature),
      humidity: Number(current.relative_humidity_2m),
      windSpeedKmH: Number(current.wind_speed_10m),
    })

    return {
      category,
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
      durationMs: Date.now() - startedAt,
      data: {
        location: resolvedLocation || location,
        temperatureC: Number(current.temperature_2m),
        apparentTemperatureC: Number(current.apparent_temperature),
        humidity: Number(current.relative_humidity_2m),
        windSpeedKmH: Number(current.wind_speed_10m),
        weatherCode: Number(current.weather_code),
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'WEATHER_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

export function extractNewsQueryTerm(query: string) {
  const normalized = normalizeQueryText(query)
  if (!normalized)
    return 'United States'

  if (/美国|usa|united states/i.test(normalized))
    return 'United States'

  const location = extractLocationFromQuery(normalized)
  if (location)
    return location

  return normalized
}

export async function executeBuiltinNews(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const term = extractNewsQueryTerm(query)
    const data = await fetchJsonWithTimeout(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(term)}&mode=ArtList&maxrecords=5&format=json&sort=DateDesc`,
    )

    const articles = Array.isArray(data.articles) ? data.articles : []
    if (articles.length === 0) {
      throw createRealtimeError('NO_DATA', '新闻源当前没有返回可用结果。')
    }

    const items = articles.slice(0, 3).map((article: any) => ({
      title: sanitizeBriefText(String(article.title ?? ''), 120),
      source: sanitizeBriefText(String(article.sourcecountry ?? article.domain ?? ''), 40),
      url: String(article.url ?? ''),
      publishedAt: String(article.seendate ?? ''),
    }))

    const surface = buildAlicizationNewsSurface({
      query: term,
      items,
    })

    return {
      category,
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
      durationMs: Date.now() - startedAt,
      data: {
        query: term,
        items,
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'NEWS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

export function extractTickerFromQuery(query: string) {
  const normalized = normalizeQueryText(query)
  if (!normalized)
    return ''

  for (const [alias, ticker] of Object.entries(financeTickerAliasMap)) {
    if (normalized.includes(alias))
      return ticker
  }

  const rawMatches = normalized.match(/\b[A-Z]{2,6}\b/g) ?? []
  const stopwords = new Set(['TODAY', 'LATEST', 'PRICE', 'STOCK', 'MARKET', 'NEWS', 'USA'])
  const matchedTicker = rawMatches.find(item => !stopwords.has(item))
  if (matchedTicker)
    return matchedTicker

  return ''
}

export async function executeBuiltinFinance(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const ticker = extractTickerFromQuery(query)
    if (!ticker) {
      throw createRealtimeError('MISSING_TICKER', '未识别到股票或币种代码，请补充 ticker（例如 AAPL、TSLA、BTC）。')
    }

    const upperTicker = ticker.toUpperCase()
    const cryptoId = cryptoCoinIdByTicker[upperTicker]
    if (cryptoId) {
      const data = await fetchJsonWithTimeout(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoId)}&vs_currencies=usd&include_24hr_change=true`,
      )
      const node = data[cryptoId]
      if (!node || !Number.isFinite(Number(node.usd))) {
        throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的价格。`)
      }

      const price = Number(node.usd)
      const change = Number(node.usd_24h_change ?? 0)
      const surface = buildAlicizationFinanceSurface({
        ticker: upperTicker,
        market: 'crypto',
        priceUsd: price,
        change24h: change,
      })

      return {
        category,
        source: 'builtin',
        ok: true,
        summary: formatAlicizationRealtimeSurfaceSummary(surface),
        surface,
        durationMs: Date.now() - startedAt,
        data: {
          ticker: upperTicker,
          market: 'crypto',
          priceUsd: price,
          change24h: change,
        },
      }
    }

    const csv = await fetchTextWithTimeout(`https://stooq.com/q/l/?s=${encodeURIComponent(upperTicker.toLowerCase())}.us&i=d`)
    const lines = csv.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw createRealtimeError('NO_DATA', `未获取到 ${upperTicker} 的行情。`)
    }

    const header = lines[0]!.split(',')
    const row = lines[1]!.split(',')
    const record = Object.fromEntries(header.map((key, index) => [key, row[index]]))
    const closePrice = Number(record.Close)
    if (!Number.isFinite(closePrice)) {
      throw createRealtimeError('NO_DATA', `行情源返回了无效价格（${upperTicker}）。`)
    }

    const surface = buildAlicizationFinanceSurface({
      ticker: upperTicker,
      market: 'equity',
      closePriceUsd: closePrice,
      date: String(record.Date ?? ''),
    })

    return {
      category,
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
      durationMs: Date.now() - startedAt,
      data: {
        ticker: upperTicker,
        market: 'equity',
        closePriceUsd: closePrice,
        date: String(record.Date ?? ''),
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'FINANCE_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

export function extractSportsLeague(query: string): SportsLeagueKey | '' {
  const normalized = normalizeQueryText(query).toLowerCase()
  if (!normalized)
    return ''
  if (/\bnba\b|篮球|湖人|勇士|凯尔特人/.test(normalized))
    return 'nba'
  if (/\bnfl\b|美式橄榄球|酋长|49人/.test(normalized))
    return 'nfl'
  if (/\bmlb\b|棒球|道奇|洋基/.test(normalized))
    return 'mlb'
  if (/\bnhl\b|冰球|企鹅/.test(normalized))
    return 'nhl'
  if (/\bepl\b|英超|premier league|曼联|阿森纳|切尔西|利物浦|曼城/.test(normalized))
    return 'epl'
  return ''
}

export function extractSportsTeamKeyword(query: string) {
  const normalized = normalizeQueryText(query)
  const match = /([A-Z\u4E00-\u9FFF]{2,20})的?(?:比赛|赛程|比分)/i.exec(normalized)
  if (match?.[1] && !/今天|今日|实时|最新/.test(match[1])) {
    return match[1]
  }
  return ''
}

export async function executeBuiltinSports(category: AlicizationRealtimeCategory, query: string): Promise<AlicizationRealtimeExecuteResult> {
  const startedAt = Date.now()
  try {
    const league = extractSportsLeague(query)
    if (!league) {
      throw createRealtimeError('MISSING_LEAGUE', '未识别到联赛，请补充例如 NBA/NFL/MLB/NHL/EPL。')
    }

    const leagueInfo = sportsLeagueCatalog[league]
    const data = await fetchJsonWithTimeout(
      `https://site.api.espn.com/apis/site/v2/sports/${leagueInfo.path}/scoreboard`,
    )

    const events = Array.isArray(data.events) ? data.events : []
    if (events.length === 0) {
      throw createRealtimeError('NO_DATA', `${leagueInfo.label} 当前没有可用比赛数据。`)
    }

    const teamKeyword = extractSportsTeamKeyword(query)
    const filtered = teamKeyword
      ? events.filter((event: any) => {
          const competitors = event?.competitions?.[0]?.competitors ?? []
          return competitors.some((item: any) => String(item?.team?.displayName ?? '').includes(teamKeyword))
        })
      : events

    const selected = (filtered.length > 0 ? filtered : events).slice(0, 3).map((event: any) => {
      const competition = event?.competitions?.[0]
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []
      const home = competitors.find((item: any) => item?.homeAway === 'home') ?? competitors[0]
      const away = competitors.find((item: any) => item?.homeAway === 'away') ?? competitors[1]
      const status = String(competition?.status?.type?.shortDetail ?? competition?.status?.type?.description ?? '状态未知')
      return {
        name: `${away?.team?.displayName ?? '客队'} vs ${home?.team?.displayName ?? '主队'}`,
        score: `${away?.score ?? '-'}:${home?.score ?? '-'}`,
        status,
      }
    })

    const surface = buildAlicizationSportsSurface({
      leagueLabel: leagueInfo.label,
      items: selected,
    })

    return {
      category,
      source: 'builtin',
      ok: true,
      summary: formatAlicizationRealtimeSurfaceSummary(surface),
      surface,
      durationMs: Date.now() - startedAt,
      data: {
        league,
        leagueLabel: leagueInfo.label,
        items: selected,
      },
    }
  }
  catch (error: any) {
    return {
      category,
      source: 'builtin',
      ok: false,
      errorCode: error?.code ?? 'SPORTS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }
  }
}

export async function executeBuiltinRealtimeQuery(payload: AlicizationRealtimeExecutePayload): Promise<AlicizationRealtimeExecuteResult> {
  const normalizedCategory = payload.category
  const normalizedQuery = normalizeQueryText(payload.query)
  if (!normalizedQuery) {
    return {
      category: normalizedCategory,
      source: 'builtin',
      ok: false,
      errorCode: 'EMPTY_QUERY',
      errorMessage: 'query is empty',
      durationMs: 0,
    }
  }

  switch (normalizedCategory) {
    case 'weather':
      return executeBuiltinWeather(normalizedCategory, normalizedQuery)
    case 'news':
      return executeBuiltinNews(normalizedCategory, normalizedQuery)
    case 'finance':
      return executeBuiltinFinance(normalizedCategory, normalizedQuery)
    case 'sports':
      return executeBuiltinSports(normalizedCategory, normalizedQuery)
    default:
      return {
        category: normalizedCategory,
        source: 'builtin',
        ok: false,
        errorCode: 'UNSUPPORTED_CATEGORY',
        errorMessage: `unsupported realtime category: ${normalizedCategory}`,
        durationMs: 0,
      }
  }
}
