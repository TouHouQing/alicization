import { describe, expect, it } from 'vitest'

import {
  buildAlicizationFinanceSurface,
  buildAlicizationNewsSurface,
  buildAlicizationSportsSurface,
  buildAlicizationWeatherSurface,
  composeAlicizationRealtimeReply,
} from './alicization-realtime-surface'

describe('alicization realtime surface facts', () => {
  it('keeps lead fields factual instead of adding a fixed conversational voice', () => {
    expect(buildAlicizationWeatherSurface({
      location: 'Shanghai',
      condition: 'sunny',
      temperatureC: 28,
      apparentTemperatureC: 29,
      humidity: 60,
      windSpeedKmH: 8,
    }).lead).toBe('Shanghai | sunny')
    expect(buildAlicizationNewsSurface({
      query: 'memory agents',
      items: [],
    }).lead).toBe('memory agents')
    expect(buildAlicizationFinanceSurface({
      ticker: 'BTC',
      market: 'crypto',
      priceUsd: 1,
      change24h: 0,
    }).lead).toBe('BTC')
    expect(buildAlicizationSportsSurface({
      leagueLabel: 'NBA',
      items: [],
    }).lead).toBe('NBA')
  })

  it('reports partial realtime failures as explicit error facts', () => {
    const reply = composeAlicizationRealtimeReply({
      evidences: [{
        category: 'weather',
        source: 'builtin',
        surface: buildAlicizationWeatherSurface({
          location: 'Shanghai',
          condition: 'sunny',
          temperatureC: 28,
          apparentTemperatureC: 29,
          humidity: 60,
          windSpeedKmH: 8,
        }),
      }],
      failed: ['news'],
      locale: 'zh',
    })

    expect(reply).toContain('实时数据获取失败：news。')
    expect(reply).not.toContain('另外还有')
    expect(reply).not.toContain('这一类')
  })
})
