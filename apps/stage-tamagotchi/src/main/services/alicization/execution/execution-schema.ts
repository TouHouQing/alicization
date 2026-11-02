/** Appended to the life migration and executed by its sole transactional writer. */
export const executionSchemaSql = `
CREATE TABLE IF NOT EXISTS life_execution_contracts (
 card_id TEXT NOT NULL, obligation_id TEXT NOT NULL, obligation_generation INTEGER NOT NULL,
 revision INTEGER NOT NULL, contract_hash TEXT NOT NULL, body_json TEXT NOT NULL,
 active INTEGER NOT NULL CHECK(active IN (0,1)), created_at INTEGER NOT NULL,
 PRIMARY KEY(card_id, obligation_id, obligation_generation, revision)
);
CREATE UNIQUE INDEX IF NOT EXISTS life_execution_contract_active ON life_execution_contracts(card_id, obligation_id) WHERE active = 1;
CREATE TABLE IF NOT EXISTS life_work_plans (
 card_id TEXT NOT NULL, plan_id TEXT NOT NULL, revision INTEGER NOT NULL,
 root_thread_id TEXT NOT NULL, root_obligation_id TEXT NOT NULL, obligation_generation INTEGER NOT NULL,
 contract_hash TEXT NOT NULL, body_json TEXT NOT NULL, event_cursor INTEGER NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(card_id, plan_id, revision)
);
CREATE INDEX IF NOT EXISTS life_work_plans_root ON life_work_plans(card_id, root_obligation_id, plan_id, revision);
CREATE TABLE IF NOT EXISTS life_work_step_results (
 card_id TEXT NOT NULL, plan_id TEXT NOT NULL, plan_revision INTEGER NOT NULL,
 step_id TEXT NOT NULL, attempt_id TEXT NOT NULL, input_hash TEXT NOT NULL, effect_id TEXT,
 observation_refs_json TEXT NOT NULL, result_json TEXT NOT NULL, state TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(card_id, plan_id, plan_revision, step_id, attempt_id)
);
CREATE TABLE IF NOT EXISTS life_work_slices (
 card_id TEXT NOT NULL, slice_id TEXT NOT NULL, plan_id TEXT NOT NULL, plan_revision INTEGER NOT NULL,
 root_obligation_id TEXT NOT NULL, obligation_generation INTEGER NOT NULL,
 ingress_id TEXT NOT NULL, state TEXT NOT NULL, cursor INTEGER NOT NULL, budget INTEGER NOT NULL,
 attempt_id TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(card_id, slice_id), UNIQUE(card_id, ingress_id)
);
CREATE INDEX IF NOT EXISTS life_work_step_current ON life_work_step_results(card_id,plan_id,plan_revision,step_id,created_at DESC);
CREATE INDEX IF NOT EXISTS life_work_slice_current ON life_work_slices(card_id,plan_id,updated_at DESC);
`
