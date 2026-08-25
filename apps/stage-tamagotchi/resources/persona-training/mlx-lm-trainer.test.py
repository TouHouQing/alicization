import importlib.util
import json
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("mlx_lm_trainer", ROOT / "mlx-lm-trainer.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def example(source_kind="cleaned-long-term-reflection"):
    return {
        "id": "example-1",
        "sourceId": "reflection-1",
        "sourceKind": source_kind,
        "schemaVersion": "persona-training-example-v1",
        "contentHash": "content-hash-1",
        "provenance": {
            "kind": "working-memory-cleaning",
            "cleaningTransactionId": "cleaning-1",
            "cleanedAt": 100,
        },
        "behaviorLesson": "Be transparent about failures.",
        "positiveExample": "I will explain the real failure.",
        "negativeExample": None,
    }


def manifest(item):
    return {
        "schemaVersion": "persona-training-dataset-v1",
        "consentSnapshot": {"granted": True},
        "exampleCount": 1,
        "examples": [item],
    }


class MlxTrainerGovernanceTest(unittest.TestCase):
    def test_maps_lora_layers_to_the_mlx_lm_num_layers_flag(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "dataset.jsonl"
            manifest_path = root / "manifest.json"
            output_dir = root / "output"
            artifact_manifest_path = output_dir / "artifact-manifest.json"
            source.write_text(json.dumps(example()) + "\n", encoding="utf-8")
            manifest_path.write_text(
                json.dumps({**manifest(example()), "runId": "run-command-contract"}),
                encoding="utf-8",
            )
            commands = []

            def fake_run(command, **_kwargs):
                commands.append(command)
                adapter_dir = Path(command[command.index("--adapter-path") + 1])
                adapter_dir.mkdir(parents=True, exist_ok=True)
                (adapter_dir / "adapters.safetensors").write_text("adapter", encoding="utf-8")
                return SimpleNamespace(returncode=0)

            args = SimpleNamespace(
                backend="mlx-lm",
                manifest=str(manifest_path),
                dataset=str(source),
                output_dir=str(output_dir),
                artifact_manifest=str(artifact_manifest_path),
                base_model="/models/qwen",
                iterations=1,
                learning_rate=1e-5,
                lora_layers=1,
                batch_size=1,
                max_seq_length=128,
                mask_prompt="false",
                seed=42,
            )
            with patch.object(MODULE, "ensure_mlx_lm"), patch.object(
                MODULE.subprocess, "run", side_effect=fake_run
            ):
                self.assertEqual(MODULE.run_training(args), 0)

            self.assertEqual(len(commands), 1)
            self.assertEqual(commands[0][:4], [MODULE.sys.executable, "-m", "mlx_lm", "lora"])
            self.assertIn("--num-layers", commands[0])
            self.assertNotIn("--lora-layers", commands[0])

    def test_publishes_artifact_for_the_mlx_dialogue_runtime(self):
        with tempfile.TemporaryDirectory() as directory:
            artifact_path = Path(directory) / "adapters.safetensors"
            artifact_path.write_text("adapter", encoding="utf-8")
            artifact = MODULE.build_artifact_manifest(
                {"runId": "run-mlx-smoke"},
                SimpleNamespace(base_model="/models/qwen"),
                artifact_path,
            )

            self.assertTrue(artifact["dialogueReady"])
            self.assertEqual(artifact["loaderTarget"], "mlx-runtime")
            self.assertEqual(artifact["conversion"]["status"], "not-required")

    def test_rejects_forbidden_source_kind_before_writing_training_data(self):
        with self.assertRaisesRegex(RuntimeError, "forbidden source kind"):
            MODULE.validate_manifest_examples(manifest(example("raw-transcript")))

    def test_rejects_dataset_rows_that_are_not_in_approved_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "dataset.jsonl"
            destination = root / "train.jsonl"
            source.write_text(
                json.dumps({**example(), "sourceKind": "review-queue"}) + "\n",
                encoding="utf-8",
            )
            approved = MODULE.validate_manifest_examples(manifest(example()))
            with self.assertRaisesRegex(RuntimeError, "does not match the approved manifest"):
                MODULE.write_mlx_dataset(source, destination, approved)

    def test_exports_only_manifest_bound_cleaned_examples(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "dataset.jsonl"
            destination = root / "train.jsonl"
            source.write_text(json.dumps(example()) + "\n", encoding="utf-8")
            approved = MODULE.validate_manifest_examples(manifest(example()))
            count = MODULE.write_mlx_dataset(source, destination, approved)
            self.assertEqual(count, 1)
            self.assertEqual(
                json.loads(destination.read_text(encoding="utf-8"))["text"],
                "Be transparent about failures.\nI will explain the real failure.",
            )


if __name__ == "__main__":
    unittest.main()
