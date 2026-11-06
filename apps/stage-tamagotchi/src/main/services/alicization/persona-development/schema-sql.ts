export const personaDevelopmentSchemaSql = String.raw`
CREATE TABLE IF NOT EXISTS life_persona_evidence (
  card_id TEXT NOT NULL, facet_id TEXT NOT NULL, root_id TEXT NOT NULL,
  polarity TEXT NOT NULL CHECK(polarity IN ('support','oppose')),
  source_kind TEXT NOT NULL, source_id TEXT NOT NULL, source_version TEXT NOT NULL,
  source_hash TEXT NOT NULL, strength REAL NOT NULL, occurred_at INTEGER NOT NULL,
  withdrawn INTEGER NOT NULL DEFAULT 0, context TEXT NOT NULL, facet_version INTEGER NOT NULL, evidence_day TEXT NOT NULL,
  PRIMARY KEY(card_id,facet_id,root_id,polarity)
);
CREATE INDEX IF NOT EXISTS idx_life_persona_evidence_source ON life_persona_evidence(card_id,source_kind,source_id);
CREATE INDEX IF NOT EXISTS idx_life_persona_evidence_current ON life_persona_evidence(card_id,facet_id,facet_version,withdrawn,evidence_day DESC,occurred_at DESC,root_id DESC);
CREATE TABLE IF NOT EXISTS life_persona_trials (
  card_id TEXT NOT NULL, facet_id TEXT NOT NULL, facet_version INTEGER NOT NULL,
  turn_id TEXT NOT NULL, context TEXT NOT NULL, request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','positive','negative','unknown')),
  feedback_source TEXT, created_at INTEGER NOT NULL,
  PRIMARY KEY(card_id,facet_id,turn_id)
);
CREATE TABLE IF NOT EXISTS life_persona_extractions (
  card_id TEXT NOT NULL, source_kind TEXT NOT NULL, source_id TEXT NOT NULL,
  source_version TEXT NOT NULL, source_hash TEXT NOT NULL,
  PRIMARY KEY(card_id,source_kind,source_id,source_version)
);
CREATE TABLE IF NOT EXISTS life_persona_withdrawals (
  card_id TEXT NOT NULL, facet_id TEXT NOT NULL, withdrawn_at INTEGER NOT NULL,
  PRIMARY KEY(card_id,facet_id)
);
`
