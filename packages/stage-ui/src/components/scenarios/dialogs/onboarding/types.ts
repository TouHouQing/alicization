import type { Component } from 'vue'

export type OnboardingStepGuard = () => Promise<boolean>
export type OnboardingStepPrevHandler = () => Promise<void> | void

export interface ProviderConfigData {
  apiKey: string
  baseUrl: string
  accountId: string
}

export interface OnboardingConfiguredPayload {
  followUpRoute?: string
}

export type OnboardingStepNextHandler = (configData?: ProviderConfigData) => Promise<void> | void

export interface OnboardingStep {
  id: string
  component: Component
  props?: () => Record<string, unknown>
  beforeNext?: OnboardingStepGuard
  beforePrev?: OnboardingStepGuard
}
