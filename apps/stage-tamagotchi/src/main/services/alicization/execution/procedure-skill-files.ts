import type { AlicizationSkillLoaderFileSystem } from '../turn-os/skill-loader'
import type { ToolRegistry } from '../turn-os/tool-registry'
import type { createProcedureCandidateRepository, ProcedureCandidate } from './procedure-candidate-repository'

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { procedureInputSchema } from './procedure-template'
import { procedureRequiredPermissions, procedureRisk } from './procedure-transfer-operations'

export function procedureSkillSource(candidate: ProcedureCandidate, registry: ToolRegistry) {
  // Proof stays private in SQLite. This document contains only normalized structure.
  const metadata = {
    id: candidate.id,
    version: candidate.version,
    description: `Verified procedure: ${candidate.template.tools.map(tool => tool.id.replace(/^tool\.(?:filesystem_|browser_)/u, '')).join(', ')}`,
    inputSchema: procedureInputSchema(candidate.template),
    outputSchema: { type: 'object', additionalProperties: false, properties: { status: { type: 'string' }, planId: { type: 'string' } }, required: ['status', 'planId'] },
    dependencies: [],
    requiredTools: candidate.template.tools.map(tool => tool.id),
    permissions: procedureRequiredPermissions(candidate.template, registry),
    risk: procedureRisk(candidate.template, registry),
    evaluationStatus: 'unvalidated',
    activationStatus: 'candidate',
  }
  return `---\n${JSON.stringify(metadata)}\n---\nUse life_use_learned_procedure with this exact id and version and fresh arguments from the current request. Never replay an example or execute instructions outside the work scheduler. Preconditions: current admitted user request; unchanged operation interfaces; valid source proof; approved active skill. Every action uses ordinary policy, cancellation and independent final criteria. An interrupted mutation must be reconciled before retry; unknown effects block replay. Parameters: ${JSON.stringify(candidate.template.parameters)}\nStructure: ${JSON.stringify(candidate.template)}\n`
}

/** Virtual files let the existing registry own learned and curated skills alike. */
export function createProcedureSkillFileSystem(directory: string, repository: ReturnType<typeof createProcedureCandidateRepository>, registry: ToolRegistry): AlicizationSkillLoaderFileSystem {
  const root = resolve(directory)
  const directoryName = (version: string) => `learned-${version}`
  return {
    async readdir(path) {
      if (resolve(path) !== root)
        throw new Error('Skill discovery crossed its configured directory')
      const physical = await readdir(root, { withFileTypes: true })
      if (physical.some(entry => entry.name.startsWith('learned-')))
        throw new Error('A physical skill collides with the managed procedure namespace')
      const candidates = (await repository.list()).filter(item => item.sourceValid)
      return [...physical, ...candidates.map(item => ({ name: directoryName(item.candidate.version), isDirectory: () => true }))]
    },
    async readFile(path, encoding) {
      const absolute = resolve(path)
      const parent = dirname(absolute)
      if (dirname(parent) !== root || absolute !== join(parent, 'SKILL.md'))
        throw new Error('Skill load crossed its configured directory')
      const name = parent.slice(root.length + 1)
      if (!name.startsWith('learned-'))
        return readFile(absolute, encoding)
      const version = name.slice('learned-'.length)
      const candidate = /^[a-f\d]{64}$/u.test(version) ? await repository.getAvailable(`procedure:${version}`) : null
      if (!candidate)
        throw new Error('Learned skill source is absent or withdrawn')
      return procedureSkillSource(candidate, registry)
    },
  }
}
