import { afterEach, describe, expect, it, vi } from 'vitest'

import { executeBuiltinWeather } from './runtime-realtime'

describe('runtime realtime weather', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to city-suffix geocode candidates when the raw location has no result', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
        }),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{
            name: '天津',
            admin1: '天津市',
            country: '中国',
            country_code: 'CN',
            latitude: 39.0842,
            longitude: 117.201,
          }],
        }),
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          current: {
            temperature_2m: 21.2,
            relative_humidity_2m: 48,
            apparent_temperature: 20.3,
            weather_code: 0,
            wind_speed_10m: 12.4,
          },
        }),
      } satisfies Partial<Response>)
    vi.stubGlobal('fetch', fetchMock)

    const result = await executeBuiltinWeather('weather', '今天天津天气怎么样')

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('天津')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain(encodeURIComponent('天津'))
    expect(String(fetchMock.mock.calls[1]?.[0] ?? '')).toContain(encodeURIComponent('天津市'))
    expect(String(fetchMock.mock.calls[2]?.[0] ?? '')).toContain('api.open-meteo.com')
  })
})
