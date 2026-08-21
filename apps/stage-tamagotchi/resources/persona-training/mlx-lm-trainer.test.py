import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


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
