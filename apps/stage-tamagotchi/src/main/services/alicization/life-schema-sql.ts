// Generated from the reviewed schema draft; keep migrations and the design in sync.
export const lifeSchemaSql = String.raw`
-- Applied by the versioned desktop migration after a consistent SQLite backup.
-- Target: existing per-card Alicization sqlite3 database after current schema setup.
-- Apply each stage through the existing DB write queue and migration runner.
-- Application validates bound card scope, JSON shapes, state transitions and references.
-- PRAGMA configuration is connection setup, outside BEGIN IMMEDIATE.
-- Production proposal: journal_mode=WAL, synchronous=FULL, foreign_keys=ON.

-- M1: infrastructure. No second personality or memory payload store.
CREATE TABLE IF NOT EXISTS life_ingress (
  card_id TEXT NOT NULL,
  ingress_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  source_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_ref_json TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  observed_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('accepted','processing','settled','held','failed')),
  lease_owner TEXT,
  lease_until INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  next_attempt_at INTEGER,
  last_error_code TEXT,
  PRIMARY KEY(card_id, ingress_id),
  UNIQUE(card_id, source, source_key)
);
CREATE INDEX IF NOT EXISTS idx_life_ingress_due
  ON life_ingress(card_id, status, next_attempt_at, observed_at, ingress_id);

-- Current input payloads are raw ingress material, never long-term memory.
-- Life views carry references; only explicit recovery reads the source body.
CREATE TABLE IF NOT EXISTS life_surface_sessions (
  card_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, session_id)
);
CREATE TABLE IF NOT EXISTS life_input_payloads (
  card_id TEXT NOT NULL,
  ingress_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  body_json TEXT,
  lifecycle TEXT NOT NULL CHECK(lifecycle IN ('active','unavailable','withdrawn')),
  stored_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, ingress_id),
  FOREIGN KEY(card_id, ingress_id) REFERENCES life_ingress(card_id, ingress_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS life_commits (
  card_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  commit_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  base_revision INTEGER NOT NULL CHECK(base_revision >= 0),
  ingress_ids_json TEXT NOT NULL,
  read_set_json TEXT NOT NULL,
  owner_changes_json TEXT NOT NULL,
  runtime_event_refs_json TEXT NOT NULL,
  reducer_version TEXT NOT NULL,
  committed_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, revision),
  UNIQUE(card_id, commit_id),
  UNIQUE(card_id, operation_key)
);

CREATE TABLE IF NOT EXISTS life_owner_versions (
  card_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision >= 0),
  payload_ref_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  last_commit_id TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, owner)
);
-- Owner '__commit_clock__' is coordination metadata, not an identity subsystem.
-- Actual state stays in existing alicization_meta or domain tables.

CREATE TABLE IF NOT EXISTS life_effect_intents (
  card_id TEXT NOT NULL,
  effect_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('execute','verify','index','reflect','soul-activate')),
  intent_hash TEXT NOT NULL,
  payload_ref_json TEXT NOT NULL,
  producer_commit_id TEXT NOT NULL,
  turn_id TEXT,
  action_id TEXT,
  thread_id TEXT,
  attempt_id TEXT,
  generation INTEGER NOT NULL CHECK(generation >= 0),
  guard_read_set_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('prepared','claimed','dispatched','settled','cancelled','uncertain','failed')),
  lease_owner TEXT,
  lease_until INTEGER,
  next_attempt_at INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  receipt_ref_json TEXT,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, effect_id),
  UNIQUE(card_id, operation_key),
  FOREIGN KEY(card_id, producer_commit_id)
    REFERENCES life_commits(card_id, commit_id)
);
CREATE INDEX IF NOT EXISTS idx_life_effects_dispatch
  ON life_effect_intents(card_id, status, next_attempt_at, created_at, effect_id);
-- This table owns dispatch intent only. TaskThread owns execution lifecycle.
-- Turn OS pendingDelivery remains the only reply-delivery intent owner.

-- M2: persistent obligations, separate from short-lived commitment salience.
CREATE TABLE IF NOT EXISTS life_obligations (
  card_id TEXT NOT NULL,
  obligation_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1 CHECK(generation > 0),
  revision INTEGER NOT NULL CHECK(revision >= 0),
  kind TEXT NOT NULL CHECK(kind IN ('reminder','task','relationship','personal-project')),
  source_ref_json TEXT NOT NULL,
  beneficiary_ref_json TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('proposed','accepted','waiting','in-progress','verifying','fulfilled','blocked','failed','cancelled','superseded')),
  due_at INTEGER,
  timezone TEXT,
  temporal_expression TEXT,
  expiry_policy TEXT NOT NULL CHECK(expiry_policy IN ('none','ask-on-resume','expire-if-obsolete')),
  required_proof_json TEXT NOT NULL,
  thread_id TEXT,
  scheduled_task_id TEXT,
  fulfilled_receipt_ref_json TEXT,
  cancel_requested_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, obligation_id),
  UNIQUE(card_id, dedupe_key),
  FOREIGN KEY(thread_id) REFERENCES task_threads(id),
  FOREIGN KEY(scheduled_task_id) REFERENCES scheduled_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_life_obligations_due
  ON life_obligations(card_id, status, due_at, obligation_id);

-- M3: memory owner extensions; memory_facts keeps the existing triple IDs.
CREATE TABLE IF NOT EXISTS memory_fact_versions (
  card_id TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  fact_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0),
  recorded_from INTEGER NOT NULL,
  recorded_to INTEGER,
  valid_from INTEGER,
  valid_to INTEGER,
  temporal_precision TEXT NOT NULL CHECK(temporal_precision IN ('instant','day','month','unknown')),
  subject_ref_json TEXT NOT NULL,
  predicate TEXT NOT NULL,
  value_json TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK(provenance IN ('observed','reported','inferred','imagined','fictional')),
  lifecycle TEXT NOT NULL CHECK(lifecycle IN ('candidate','active','disputed','superseded','revoked')),
  evidence_refs_json TEXT NOT NULL,
  supersedes_version INTEGER,
  commit_id TEXT NOT NULL,
  PRIMARY KEY(card_id, stream_id, version),
  CHECK(valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CHECK(recorded_to IS NULL OR recorded_to >= recorded_from),
  FOREIGN KEY(card_id, fact_id) REFERENCES memory_facts(card_id, id) ON DELETE CASCADE,
  FOREIGN KEY(card_id, commit_id) REFERENCES life_commits(card_id, commit_id)
);
CREATE INDEX IF NOT EXISTS idx_fact_versions_time
  ON memory_fact_versions(card_id, stream_id, recorded_from, valid_from);
CREATE INDEX IF NOT EXISTS idx_fact_versions_fact
  ON memory_fact_versions(card_id, fact_id, version);
-- A single-valued predicate stream may contain several existing triple IDs.
-- Do not redefine existing triple dedupe keys to merge different objects.

CREATE TABLE IF NOT EXISTS memory_entities (
  card_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  discriminators_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','merged','revoked')),
  merged_into TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, entity_id)
);
CREATE TABLE IF NOT EXISTS memory_entity_aliases (
  card_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  relationship_scope TEXT NOT NULL,
  evidence_ref_json TEXT NOT NULL,
  PRIMARY KEY(card_id, entity_id, alias, relationship_scope),
  FOREIGN KEY(card_id, entity_id) REFERENCES memory_entities(card_id, entity_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entity_alias_lookup
  ON memory_entity_aliases(card_id, alias, relationship_scope);
-- Alias is intentionally not unique across entities: homonyms must remain distinguishable.

CREATE TABLE IF NOT EXISTS life_evidence_dependencies (
  card_id TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  dependent_owner TEXT NOT NULL,
  dependent_id TEXT NOT NULL,
  dependent_version TEXT NOT NULL,
  relation TEXT NOT NULL CHECK(relation IN ('supports','contradicts','derived-from','required-for')),
  created_revision INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation)
);
CREATE INDEX IF NOT EXISTS idx_evidence_dependents
  ON life_evidence_dependencies(card_id, source_kind, source_id);
-- Generic references are validated by domain repositories; they are not arbitrary SQL pointers.

-- M4: causal affect and expression outcomes, not a second dialogue store.
CREATE TABLE IF NOT EXISTS life_appraisals (
  card_id TEXT NOT NULL,
  appraisal_id TEXT NOT NULL,
  cause_key TEXT NOT NULL,
  appraisal_version INTEGER NOT NULL CHECK(appraisal_version > 0),
  causal_refs_json TEXT NOT NULL,
  affected_goal_ids_json TEXT NOT NULL,
  dimensions_json TEXT NOT NULL,
  parameter_version TEXT NOT NULL,
  applied_commit_id TEXT NOT NULL,
  supersedes_appraisal_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('applied','superseded','revoked')),
  occurred_at INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, appraisal_id),
  UNIQUE(card_id, cause_key, appraisal_version),
  FOREIGN KEY(card_id, applied_commit_id) REFERENCES life_commits(card_id, commit_id)
);

CREATE TABLE IF NOT EXISTS life_expression_receipts (
  card_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  utterance_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  playback_epoch TEXT NOT NULL,
  surface_session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK(sequence >= 0),
  state TEXT NOT NULL CHECK(state IN ('rendered','audio-started','audio-progress','audio-ended','audio-interrupted','audio-failed')),
  played_ms INTEGER NOT NULL CHECK(played_ms >= 0),
  aligned_text_end INTEGER,
  alignment_source TEXT CHECK(alignment_source IN ('tts','viseme','segment') OR alignment_source IS NULL),
  error_code TEXT,
  occurred_at INTEGER NOT NULL,
  observed_at INTEGER NOT NULL,
  presentation_verified INTEGER NOT NULL DEFAULT 0 CHECK(presentation_verified IN (0,1)),
  PRIMARY KEY(card_id, receipt_id),
  UNIQUE(card_id, surface_session_id, playback_epoch, segment_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_expression_receipts_delivery
  ON life_expression_receipts(card_id, delivery_id, segment_id, sequence);

-- M5: durable file activation saga for SOUL.md; current SOUL remains authority.
CREATE TABLE IF NOT EXISTS life_soul_activation_intents (
  card_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  base_hash TEXT NOT NULL,
  target_hash TEXT NOT NULL,
  staged_relative_path TEXT NOT NULL,
  backup_relative_path TEXT NOT NULL,
  source_refs_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('prepared','file-replaced','activated','conflicted','rolled-back','failed')),
  target_soul_revision INTEGER NOT NULL CHECK(target_soul_revision >= 0),
  activation_commit_id TEXT,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, operation_id)
);
-- Paths are generated inside the existing card directory and checked by the lifecycle owner.
-- A runtime read of the actual file hash is required before status becomes activated.
CREATE TABLE IF NOT EXISTS life_evidence_cleanup_jobs (
  card_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  source_ref_json TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('correction','forget')),
  reason_hash TEXT NOT NULL,
  started_revision INTEGER NOT NULL DEFAULT 0,
  frontier_json TEXT NOT NULL,
  visited_json TEXT NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending','completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, job_id)
);
CREATE TABLE IF NOT EXISTS life_memory_source_withdrawals (
  card_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('correction','forget')),
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY(card_id, source, source_id)
);
CREATE TABLE IF NOT EXISTS life_evidence_cleanup_visits (
  card_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  reference_hash TEXT NOT NULL,
  PRIMARY KEY(card_id, job_id, reference_hash),
  FOREIGN KEY(card_id, job_id) REFERENCES life_evidence_cleanup_jobs(card_id, job_id) ON DELETE CASCADE
);
`
