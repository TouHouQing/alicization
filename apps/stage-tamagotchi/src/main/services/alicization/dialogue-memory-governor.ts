import type {
  AlicizationDialogueMemoryCarryPolicy,
  AlicizationDigitalLifeSpineDigest,
} from '@proj-alicization/stage-shared'

import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

import {
  deriveAlicizationDialogueMemoryCarryPolicyFromDigest,
} from '@proj-alicization/stage-shared'

import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'

interface DeriveAlicizationDialogueMemoryCarryPolicyInput {
  now?: number
  mirror?: {
    memorySummary?: string | null
    updatedAt?: number | null
  } | null
  mirrorStaleAfterMs?: number
  spine?: AlicizationDigitalLifeSpineSnapshot | null
  spineDigest?: AlicizationDigitalLifeSpineDigest | null
}

const defaultMirrorStaleAfterMs = 10 * 60 * 1000

export function deriveAlicizationDialogueMemoryCarryPolicy(
  input: DeriveAlicizationDialogueMemoryCarryPolicyInput,
): AlicizationDialogueMemoryCarryPolicy {
  const digest = input.spineDigest ?? projectAlicizationDigitalLifeSpineDigest(input.spine ?? null)
  return deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
    now: input.now,
    mirror: input.mirror,
    mirrorStaleAfterMs: input.mirrorStaleAfterMs ?? defaultMirrorStaleAfterMs,
    digest,
  })
}
