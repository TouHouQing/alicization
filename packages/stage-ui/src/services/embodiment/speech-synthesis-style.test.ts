import { generateSpeech } from '@xsai/generate-speech'
import { describe, expect, it } from 'vitest'

import { resolveSpeechRequestStyle } from './speech-synthesis-style'

describe('owned speech synthesis style', () => {
  it('sends two queued requests with their own speeds and abort signals through the actual xsAI serializer', async () => {
    const submitted: Array<{ input: string, speed: number }> = []
    const controller = new AbortController()
    const fetch = async (_url: URL, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal)
      submitted.push(JSON.parse(String(init.body)))
      return new Response(new Uint8Array([1, 2, 3]))
    }
    const quiet = resolveSpeechRequestStyle({ metadata: { speechSynthesis: { relativeToUserSettings: true, rateMultiplier: 0.82, pitchDelta: -2 } }, baseRate: 1.1, basePitch: 1 })
    const happy = resolveSpeechRequestStyle({ metadata: { speechSynthesis: { relativeToUserSettings: true, rateMultiplier: 1.08, pitchDelta: 2 } }, baseRate: 1.1, basePitch: 1 })
    await Promise.all([
      generateSpeech({ fetch, baseURL: 'http://local-qa.invalid/v1/', model: 'qa', voice: 'qa', input: 'quiet', speed: quiet.speed, abortSignal: controller.signal }),
      generateSpeech({ fetch, baseURL: 'http://local-qa.invalid/v1/', model: 'qa', voice: 'qa', input: 'happy', speed: happy.speed, abortSignal: controller.signal }),
    ])
    expect(submitted).toEqual([{ input: 'quiet', model: 'qa', voice: 'qa', speed: 0.902 }, { input: 'happy', model: 'qa', voice: 'qa', speed: 1.1880000000000002 }])
    expect(quiet.pitch).toBe(-1)
    expect(happy.pitch).toBe(3)
  })

  it('preserves absolute fallback settings and bounds malformed metadata', () => {
    expect(resolveSpeechRequestStyle({ metadata: { speechSynthesis: { pitchDelta: 4, rateMultiplier: 1.2 } }, basePitch: 2, baseRate: 1.1 })).toEqual({ pitch: 4, speed: 1.2 })
    expect(resolveSpeechRequestStyle({ metadata: null, basePitch: Number.NaN, baseRate: Number.NaN })).toEqual({ pitch: 0, speed: 1 })
    expect(resolveSpeechRequestStyle({ metadata: { speechSynthesis: { relativeToUserSettings: true, rateMultiplier: 1000 } }, basePitch: 0, baseRate: 1 })).toEqual({ pitch: 0, speed: 4 })
  })
})
