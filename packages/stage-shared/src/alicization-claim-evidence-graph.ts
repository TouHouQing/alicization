export type AlicizationClaimEvidenceSourceKind
  = | 'memory-fact'
    | 'memory-reflection'
    | 'relationship-outcome'
    | 'runtime-result'
    | 'trusted-source'

export type AlicizationClaimValidationState
  = | 'unverified'
    | 'provisional'
    | 'validated'
    | 'superseded'
    | 'expired'
    | 'contradicted'

export type AlicizationVerifiedLearningArtifactStatus
  = | 'verified'
    | 'blocked'
    | 'downgraded'
    | 'rollback-required'

export type AlicizationVerifiedLearningArtifactAction
  = | 'record'
    | 'reflect'
    | 'verify'
    | 'revise'
    | 'internalize'

export type AlicizationVerifiedLearningArtifactDomain
  = | 'procedure'
    | 'relationship'
    | 'self-model'
    | 'world-model'

export type AlicizationVerifiedLearningArtifactStage
  = | 'none'
    | 'working-understanding'
    | 'validated-knowledge'
    | 'internalized-long-horizon-knowledge'

export interface AlicizationClaimEvidenceNode {
  evidenceId: string
  sourceKind: AlicizationClaimEvidenceSourceKind
  sourceId: string
  summary: string
  trust: number
  observedAt: number | null
  expiresAt: number | null
  validationState: AlicizationClaimValidationState
  contradictionCount: number
}

export interface AlicizationClaimEvidenceGraph {
  version: 'claim-evidence-graph-v1'
  producedAt: number
  claimId: string
  claim: string
  domain: AlicizationVerifiedLearningArtifactDomain
  supportingEvidence: AlicizationClaimEvidenceNode[]
  contradictingEvidence: AlicizationClaimEvidenceNode[]
  supersededBy: string[]
  currentBelief: string | null
  validationState: AlicizationClaimValidationState
  sourceTrust: number
  lastRevalidatedAt: number | null
  revalidationPolicy: {
    shouldRevalidate: boolean
    nextRevalidationAt: number | null
    expiredSourceIds: string[]
    reasonTags: string[]
  }
  internalizationDecision: {
    mayInternalize: boolean
    mayValidateOnly: boolean
    blockedReasons: string[]
  }
}

export interface AlicizationVerifiedLearningArtifact {
  version: 'verified-learning-artifact-v1'
  artifactId: string
  taskId: string
  action: AlicizationVerifiedLearningArtifactAction
  domain: AlicizationVerifiedLearningArtifactDomain
  verifier: {
    kind: 'procedure-verifier' | 'relationship-verifier' | 'self-model-verifier' | 'world-model-verifier'
    mayVerify: boolean
    mayInternalize: boolean
    mayValidateOnly: boolean
    rollbackRequired: boolean
    blockedReasons: string[]
  }
  status: AlicizationVerifiedLearningArtifactStatus
  producedAt: number
  claimGraph: AlicizationClaimEvidenceGraph
  verificationBasis: string[]
  supportingFactIds: string[]
  contradictionFactIds: string[]
  internalizationStage: AlicizationVerifiedLearningArtifactStage
  reason: string
}
