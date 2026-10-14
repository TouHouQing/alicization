import type { LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { verifyLifeGoal } from './life-goal-verifier'

export async function readPersonalProjectCues(options: { read: () => Promise<LifeStateView>, now: () => number }) {
  const view = await options.read()
  const cues = []
  for (const goal of view.obligations.filter(goal => goal.kind === 'personal-project' && goal.status === 'fulfilled' && !goal.invalidatedBy && goal.proof.kind === 'file' && !goal.personalDevelopment?.shares.length).slice(0, 3)) {
    if (!goal.verification?.independent || goal.verification.verdict !== 'satisfied')
      continue
    const current = await verifyLifeGoal({ obligation: { ...goal, status: 'verifying' }, readSetting: async () => undefined, now: options.now })
    if (current.verdict !== 'satisfied' || !goal.proof.path)
      continue
    const bytes = await readFile(goal.proof.path)
    if (bytes.length > 256_000 || createHash('sha256').update(bytes).digest('hex') !== goal.proof.contentHash)
      continue
    const body = bytes.toString('utf8')
    // File contents remain untrusted context data, never executable instructions.
    cues.push({ obligationId: goal.id, generation: goal.generation, summary: goal.summary, activity: goal.personalActivity, verificationId: goal.verification.id, currentFileHash: goal.proof.contentHash, artifactPreview: body.slice(0, 2400), fictional: ['creative-writing-v1', 'visual-study-v1'].includes(goal.personalActivity ?? ''), invitation: 'May share this verified personal practice when context and rhythm permit. Fictional characters or scenes are not life memories. Do not infer that the user saw it or liked it before presentation and feedback.' })
  }
  return cues
}
